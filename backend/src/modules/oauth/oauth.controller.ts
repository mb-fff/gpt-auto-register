import { Body, Controller, Post, Param } from '@nestjs/common';
import { OAuthService } from './oauth.service';

@Controller('oauth')
export class OAuthController {
  constructor(private oauthService: OAuthService) {}

  @Post('start/:accountId')
  async start(@Param('accountId') accountId: string, @Body() body?: { email?: string }) {
    return this.oauthService.startOAuth(accountId, body?.email);
  }
}
