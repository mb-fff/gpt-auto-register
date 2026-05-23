// backend/src/queues/register.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AccountService } from '../modules/account/account.service';
import { OAuthService } from '../modules/oauth/oauth.service';

@Processor('register-queue')
export class RegisterProcessor extends WorkerHost {
  private readonly logger = new Logger(RegisterProcessor.name);

  constructor(
    private accountService: AccountService,
    private oauthService: OAuthService,
  ) {
    super();
  }

  async process(job: Job) {
    this.logger.warn(`🚀 开始执行真实注册任务 #${job.data.count}（已关闭安全占位模式）`);

    try {
      // 创建账号记录
      const account = await this.accountService.createAccount(
        `temp-${Date.now()}-${job.data.count}@example.com`, // 后续会被临时邮箱覆盖
        job.data.proxy
      );

      this.logger.log(`账号创建完成 ID: ${account.id}`);

      // === 关键：调用真实完整自动化流程 ===
      const result = await this.oauthService.startFullAutoRegister(account.id);

      this.logger.log(`✅ 任务 #${job.data.count} 执行成功！已获取真实 RT`);

      return {
        success: true,
        accountId: account.id,
        refreshToken: result.refreshToken,
        email: result.email,
      };
    } catch (error: any) {
      this.logger.error(`❌ 任务 #${job.data.count} 失败: ${error.message}`);
      throw error; // 让 BullMQ 进行重试
    }
  }
}