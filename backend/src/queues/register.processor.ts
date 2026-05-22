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
    this.logger.log(`🚀 开始处理注册任务 #${job.data.count}`);

    try {
      const account = await this.accountService.createAccount(
        `test${Date.now() + job.data.count}@example.com`,
        job.data.proxy
      );

      await this.oauthService.startOAuth(account.id, account.email);

      this.logger.log(`✅ 任务 #${job.data.count} 执行成功`);
      return { success: true, accountId: account.id };
    } catch (error: any) {
      this.logger.error(`❌ 任务失败: ${error.message}`);
      throw error;
    }
  }
}
