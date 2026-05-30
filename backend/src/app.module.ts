import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { EmailModule } from './common/email/email.module';
import { AccountModule } from './modules/account/account.module';
import { TaskModule } from './modules/task/task.module';
import { OAuthModule } from './modules/oauth/oauth.module';
import { HealthModule } from './modules/health/health.module';
import { SmsModule } from './modules/sms/sms.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    EmailModule,
    AccountModule,
    TaskModule,
    OAuthModule,
    HealthModule,
    SmsModule,
  ],
})
export class AppModule { }
