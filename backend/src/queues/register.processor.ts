// backend/src/queues/register.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { spawn } from 'child_process';
import * as path from 'path';
import { AccountService } from '../modules/account/account.service';
import { EmailService } from '../../common/email/email.service';

@Processor('register-queue')
export class RegisterProcessor extends WorkerHost {
  private readonly logger = new Logger(RegisterProcessor.name);

  constructor(
    private accountService: AccountService,
    private emailService: EmailService // 注入你的邮件服务
  ) {
    super();
  }

  async process(job: Job) {
    const proxyUrl = job.data.proxy;
    const scriptPath = path.join(__dirname, '../../scripts/register_worker.py');

    // 1. 使用你封装好的 TS 逻辑，瞬间生成临时邮箱
    const tempEmail = this.emailService.generateTempEmail();
    this.logger.log(`🚀 开始调用 Python Worker，代理: ${proxyUrl}, 邮箱: ${tempEmail}`);

    return new Promise((resolve, reject) => {
      // 启动子进程，把 email 传过去
      const child = spawn('python3', [scriptPath, '--proxy', proxyUrl, '--email', tempEmail]);

      let finalResult: any = null;
      let errorOutput = '';

      // 监听 Python 的标准输出
      child.stdout.on('data', async (data) => {
        const lines = data.toString().split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          // 🤝 核心握手：Python 说验证码发出了
          if (line.includes('WAITING_FOR_OTP')) {
            this.logger.log(`📥 收到 Python 握手信号，开始 IMAP 收件: ${tempEmail}`);

            // 触发你写的 EmailService 去收信
            const code = await this.emailService.waitForCode(tempEmail);

            if (code) {
              this.logger.log(`✅ IMAP 拿到验证码 ${code}，通过 stdin 喂给 Python`);
              // 喂给 Python，别忘了加 \n 回车符
              child.stdin.write(code + '\n');
            } else {
              this.logger.error('⏰ 接码超时，终止被卡住的 Python 进程');
              child.kill();
              reject(new Error('IMAP 接收验证码超时'));
            }
          }
          // 解析 Python 最后吐出的 JSON 数据
          else if (line.startsWith('{')) {
            try {
              finalResult = JSON.parse(line);
            } catch (e) { }
          }
        }
      });

      // 监听 Python 的运行日志 (stderr) 打印到 NestJS 控制台
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
        process.stderr.write(`[🐍 Worker] ${data.toString()}`);
      });

      // 进程结束时的处理
      child.on('close', async (code) => {
        if (code !== 0 || finalResult?.status === 'error') {
          return reject(new Error(finalResult?.message || errorOutput || 'Python process crashed'));
        }

        if (finalResult?.status === 'success') {
          const { email, password, access_token, refresh_token } = finalResult.data;

          try {
            // 保存入库
            await this.accountService.createAccount({
              email,
              password,
              accessToken: access_token,
              refreshToken: refresh_token,
              proxy: proxyUrl
            });
            this.logger.log(`🎉 任务彻底完成，账号已入库: ${email}`);
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