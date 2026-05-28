import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { OAuthService } from './oauth.service';
import { OAuthController } from './oauth.controller';

@Module({
  imports: [PrismaModule],
  providers: [OAuthService],
  controllers: [OAuthController],
  exports: [OAuthService],
})
export class OAuthModule {}
