import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { AccountService } from '../modules/account/account.service';

const execAsync = promisify(exec);

@Processor('register-queue')
export class RegisterProcessor {
  constructor(private accountService: AccountService) { }

  @Process('register-task')
  async handleRegistration(job: Job) {
    const { proxyUrl } = job.data;

    // 定位 Python 脚本路径
    const scriptPath = path.join(__dirname, '../../scripts/register_worker.py');

    try {
      // 执行 Python 脚本，传入代理
      // 注意：根据你的环境，命令可能是 python3
      const { stdout, stderr } = await execAsync(`python3 ${scriptPath} --proxy "${proxyUrl}"`);

      // 解析 Python 吐出的 JSON
      const result = JSON.parse(stdout.trim());

      if (result.status === 'success') {
        const { email, password, access_token, refresh_token } = result.data;

        // 保存到数据库
        await this.accountService.create({
          email,
          password,
          accessToken: access_token,
          refreshToken: refresh_token,
          status: 'ACTIVE'
        });

        return { success: true, email };
      } else {
        throw new Error(result.message || 'Python worker failed without specific error');
      }

    } catch (error) {
      console.error(`[Register Task Failed] Proxy: ${proxyUrl}, Error:`, error.message);
      // 触发重试逻辑或标记失败
      throw error;
    }
  }
}