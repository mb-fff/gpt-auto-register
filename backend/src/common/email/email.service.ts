import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import * as crypto from 'crypto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly mailboxes = ['INBOX', '[Gmail]/Spam', '[Gmail]/垃圾邮件', '[Gmail]/All Mail', '[Gmail]/所有邮件'];

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

    try {
      await client.connect();

      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const code = await this.findCodeInMailboxes(client, email);
        if (code) return code;
        await this.delay(5000);
      }

      this.logger.warn('⏰ 等待验证码超时');
      return null;
    } finally {
      await client.logout().catch(() => undefined);
    }
  }

  private async findCodeInMailboxes(client: ImapFlow, email: string): Promise<string | null> {
    for (const mailbox of this.mailboxes) {
      try {
        const lock = await client.getMailboxLock(mailbox);
        try {
          const code = await this.findCodeInCurrentMailbox(client, email);
          if (code) return code;
        } finally {
          lock.release();
        }
      } catch (error: any) {
        this.logger.debug(`跳过不可用邮箱目录 ${mailbox}: ${error.message}`);
      }
    }

    return null;
  }

  private async findCodeInCurrentMailbox(client: ImapFlow, email: string): Promise<string | null> {
    const messages = await client.fetch({ seen: false }, { source: true, flags: true });

    for await (const msg of messages) {
      const parsed = await simpleParser(msg.source);
      const recipients = Array.isArray(parsed.to)
        ? parsed.to.map(item => item.text).join(',')
        : parsed.to?.text || '';

      const content = [parsed.text || '', parsed.subject || '', recipients].join('\n');
      if (!content.includes(email.split('@')[0])) continue;

      const code = this.extractCode(content);
      if (code) {
        this.logger.log(`✅ 成功提取验证码: ${code}`);
        return code;
      }
    }

    return null;
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

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
