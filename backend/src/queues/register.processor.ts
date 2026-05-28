import { Processor, WorkerHost } from '@nestjs/bullmq'; // 改回 bullmq
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { AccountService } from '../modules/account/account.service';

const execAsync = promisify(exec);

@Processor('register-queue')
export class RegisterProcessor extends WorkerHost {
  private readonly logger = new Logger(RegisterProcessor.name);

  constructor(private accountService: AccountService) {
    super();
  }

  async process(job: Job) { // bullmq 中叫 process，不是 handleRegistration
    // 注意：你原来的代码里参数可能是 job.data.proxy，请确保和前端传参一致
    const proxyUrl = job.data.proxy;

    const scriptPath = path.join(__dirname, '../../scripts/register_worker.py');

    try {
      this.logger.log(`🚀 开始调用 Python Worker，代理: ${proxyUrl}`);
      const { stdout, stderr } = await execAsync(`python3 ${scriptPath} --proxy "${proxyUrl}"`);

      // 寻找最后一行 JSON（防止 Python 有其他打印干扰）
      const outputLines = stdout.trim().split('\n');
      const lastLine = outputLines[outputLines.length - 1];
      const result = JSON.parse(lastLine);

      if (result.status === 'success') {
        const { email, password, access_token, refresh_token } = result.data;

        // 【注意】这里需要确保你的 AccountService 里面有对应的方法支持保存 accessToken 和 refreshToken
        await this.accountService.createAccount({
          email,
          password,
          accessToken: access_token,
          refreshToken: refresh_token,
          proxy: proxyUrl
        });

        this.logger.log(`✅ Python Worker 注册成功: ${email}`);
        return { success: true, email };
      } else {
        throw new Error(result.message || 'Python worker failed without specific error');
      }

    } catch (error: any) {
      this.logger.error(`❌ Python 注册任务失败: ${error.message}`);
      throw error;
    }
  }
}