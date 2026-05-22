import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { RegisterProcessor } from '../../queues/register.processor';
import { AccountModule } from '../account/account.module';
import { OAuthModule } from '../oauth/oauth.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'register-queue' }),
    AccountModule,
    OAuthModule,
  ],
  providers: [TaskService, RegisterProcessor],
  controllers: [TaskController],
})
export class TaskModule {}
