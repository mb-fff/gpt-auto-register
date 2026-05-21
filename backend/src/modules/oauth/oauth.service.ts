import { Injectable, Logger } from '@nestjs/common';
import { AccountService } from '../account/account.service';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(private accountService: AccountService) {}

  async startOAuth(accountId: string) {
    this.logger.warn('OAuth is running in local stub mode');

    const refreshToken = `local-refresh-token-${accountId}-${Date.now()}`;
    await this.accountService.saveRefreshToken(accountId, refreshToken);

    return { refreshToken };
  }
}
