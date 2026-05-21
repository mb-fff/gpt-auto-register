import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { DolphinModule } from './common/dolphin/dolphin.module';
import { AccountModule } from './modules/account/account.module';
import { TaskModule } from './modules/task/task.module';
import { OAuthModule } from './modules/oauth/oauth.module';
import { ProxyModule } from './modules/proxy/proxy.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    DolphinModule,
    AccountModule,
    TaskModule,
    OAuthModule,
    ProxyModule,
  ],
})
export class AppModule {}
