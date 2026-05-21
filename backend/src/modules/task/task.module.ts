import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { RegisterProcessor } from '../../queues/register.processor';
import { OAuthModule } from '../oauth/oauth.module';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'register-queue' }),
    OAuthModule,
    AccountModule,
  ],
  providers: [TaskService, RegisterProcessor],
  controllers: [TaskController],
})
export class TaskModule {}
