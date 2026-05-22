import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import * as crypto from 'crypto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {}

  generateTempEmail(prefix = 'gpt'): string {
    const random = crypto.randomBytes(10).toString('hex').slice(0, 12);
    return `${prefix}-${random}@${this.getRequiredConfig('EMAIL_DOMAIN')}`;
  }

  async waitForCode(email: string, timeoutMs = 180000): Promise<string | null> {
    this.logger.log(`📧 开始监听验证码邮件: ${email}`);

    const client = new ImapFlow({
      host: this.getRequiredConfig('IMAP_HOST'),
      port: this.configService.get<number>('IMAP_PORT') || 993,
      secure: this.configService.get<string>('IMAP_SECURE') !== 'false',
      auth: {
        user: this.getRequiredConfig('IMAP_USER'),
        pass: this.getRequiredConfig('IMAP_PASS'),
      },
    });

    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    return new Promise((resolve) => {
      let settled = false;

      const cleanup = async () => {
        if (settled) return;
        settled = true;
        lock.release();
        await client.logout();
      };

      const timer = setTimeout(async () => {
        this.logger.warn('⏰ 等待验证码超时');
        await cleanup();
        resolve(null);
      }, timeoutMs);

      client.on('exists', async () => {
        try {
          const messages = await client.fetch({ seen: false }, { source: true, flags: true });

          for await (const msg of messages) {
            const parsed = await simpleParser(msg.source);
            const recipients = Array.isArray(parsed.to)
              ? parsed.to.map(item => item.text).join(',')
              : parsed.to?.text || '';

            if (recipients.includes(email.split('@')[0])) {
              const code = this.extractCode(parsed.text || parsed.subject || '');
              if (code) {
                this.logger.log(`✅ 成功提取验证码: ${code}`);
                clearTimeout(timer);
                await cleanup();
                resolve(code);
                return;
              }
            }
          }
        } catch (error) {
          this.logger.error('解析邮件失败', error);
        }
      });
    });
  }

  private extractCode(text: string): string | null {
    const match = text.match(/\b(\d{6,8})\b/g);
    return match ? match[0] : null;
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`缺少环境变量: ${key}`);
    }
    return value;
  }
}
