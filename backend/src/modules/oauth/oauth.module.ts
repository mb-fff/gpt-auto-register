import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { OAuthService } from './oauth.service';

@Module({
  imports: [AccountModule],
  providers: [OAuthService],
  exports: [OAuthService],
})
export class OAuthModule {}
