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
      await job.updateProgress({ percent: 10, stage: '创建账号', message: '正在创建本地账号和 Dolphin Profile' });
      await job.log('开始创建账号和 Dolphin Profile');

      const account = await this.accountService.createAccount(
        `test${Date.now() + job.data.count}@example.com`,
        job.data.proxy
      );

      await job.updateProgress({ percent: 45, stage: 'OAuth 授权', message: '账号已创建，准备启动授权流程', accountId: account.id });
      await job.log(`账号已创建: ${account.email}`);

      await this.oauthService.startOAuth(account.id);

      await job.updateProgress({ percent: 100, stage: '完成', message: '授权流程完成，Refresh Token 已写入账号', accountId: account.id });
      await job.log('任务完成，Refresh Token 已写入账号');

      this.logger.log(`✅ 任务 #${job.data.count} 执行成功`);
      return { success: true, accountId: account.id };
    } catch (error: any) {
      await job.updateProgress({ percent: 100, stage: '失败', message: error.message });
      await job.log(`任务失败: ${error.message}`);
      this.logger.error(`❌ 任务失败: ${error.message}`);
      throw error;
    }
  }
}
