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
    this.logger.log(`🚀 开始执行注册任务 #${job.data.count}`);

    try {
      // 创建账号
      const account = await this.accountService.createAccount(
        `user${Date.now() + job.data.count}@example.com`, // 实际应使用临时邮箱
        job.data.proxy
      );

      // 执行 OAuth 授权获取 Refresh Token
      const result = await this.oauthService.startOAuth(account.id);

      this.logger.log(`✅ 任务 #${job.data.count} 完成，RT 已获取`);
      return { success: true, accountId: account.id, refreshToken: result.refreshToken };
    } catch (error) {
      this.logger.error(`❌ 任务失败: ${error.message}`);
      throw error; // BullMQ 会自动重试
    }
  }
}
