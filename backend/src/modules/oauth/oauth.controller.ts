import { Body, Controller, Post } from '@nestjs/common';
import { OAuthService } from './oauth.service';

@Controller('oauth')
export class OAuthController {
  constructor(private oauthService: OAuthService) {}

  @Post('start')
  start(@Body() body: { accountId: string }) {
    return this.oauthService.startOAuth(body.accountId);
  }
}
