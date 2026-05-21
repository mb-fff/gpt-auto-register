import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OAuthService } from '../modules/oauth/oauth.service';
import { AccountService } from '../modules/account/account.service';

@Processor('register-queue')
export class RegisterProcessor extends WorkerHost {
  private readonly logger = new Logger(RegisterProcessor.name);

  constructor(
    private oauthService: OAuthService,
    private accountService: AccountService,
  ) {
    super();
  }

  async process(job: Job) {
    this.logger.log(`开始处理注册任务 #${job.data.count} ⚠️ 仅本地学习使用`);

    try {
      // 创建账号 + Profile
      const account = await this.accountService.createAccountWithProfile(
        `test${Date.now()}@example.com`, // 实际应使用临时邮箱或接码
        job.data.proxy,
      );

      // 执行 OAuth
      const result = await this.oauthService.startOAuth(account.id);

      this.logger.log(`任务成功完成，RT 已获取`);
      return { success: true, refreshToken: result.refreshToken };
    } catch (error) {
      this.logger.error(`任务失败: ${error.message}`);
      throw error;
    }
  }
}
