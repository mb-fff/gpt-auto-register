import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { spawn } from 'child_process';
import * as path from 'path';
import { AccountService } from '../modules/account/account.service';
import { EmailService } from '../common/email/email.service';

@Processor('register-queue', {
  concurrency: 5,
})
export class RegisterProcessor extends WorkerHost {
  private readonly logger = new Logger(RegisterProcessor.name);

  constructor(
    private accountService: AccountService,
    private emailService: EmailService
  ) {
    super();
  }

  async process(job: Job) {
    const proxyUrl = job.data.proxy || '';
    const scriptPath = path.join(__dirname, '../../scripts/register_worker.py');

    const grizzlyKey = process.env.GRIZZLY_API_KEY || '';

    // 🌍 核心修复：从队列读取前端传来的国家代码，默认兜底 6
    const smsCountry = job.data.smsCountry ? String(job.data.smsCountry) : '6';

    const tempEmail = this.emailService.generateTempEmail();
    this.logger.log(`🚀 开始调用 Python Worker，代理: ${proxyUrl}, 邮箱: ${tempEmail}, 接码国家: ${smsCountry}`);

    return new Promise((resolve, reject) => {
      const child = spawn('python3', [
        scriptPath,
        '--proxy', proxyUrl,
        '--email', tempEmail,
        '--grizzly_key', grizzlyKey,
        '--country', smsCountry // 👈 动态传入所选国家
      ]);

      let finalResult: any = null;
      let errorOutput = '';

      child.stdout.on('data', async (data) => {
        const lines = data.toString().split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          if (line.includes('WAITING_FOR_OTP')) {
            this.logger.log(`📥 收到 Python 握手信号，开始 IMAP 收件: ${tempEmail}`);
            const code = await this.emailService.waitForCode(tempEmail);

            if (code) {
              this.logger.log(`✅ IMAP 拿到验证码 ${code}，通过 stdin 喂给 Python`);
              child.stdin.write(code + '\n');
            } else {
              this.logger.error('⏰ 接码超时，终止被卡住的 Python 进程');
              child.kill();
              reject(new Error('IMAP 接收验证码超时'));
            }
          } else if (line.startsWith('{')) {
            try {
              finalResult = JSON.parse(line);
            } catch (e) { }
          }
        }
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
        process.stderr.write(`[🐍 Worker] ${data.toString()}`);
      });

      child.on('close', async (code) => {
        if (code !== 0 || finalResult?.status === 'error') {
          return reject(new Error(finalResult?.message || errorOutput || 'Python process crashed'));
        }

        if (finalResult?.status === 'success') {
          const { email, password, access_token, refresh_token } = finalResult.data;

          try {
            await this.accountService.createAccount({
              email,
              password,
              accessToken: access_token,
              refreshToken: refresh_token,
              proxy: proxyUrl
            });
            this.logger.log(`🎉 任务彻底完成，Codex rt 已入库: ${email}`);
            resolve({ success: true, email });
          } catch (dbError) {
            reject(dbError);
          }
        } else {
          reject(new Error('未收到合法的 Python JSON 返回'));
        }
      });
    });
  }
}