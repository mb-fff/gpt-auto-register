import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { RegisterProcessor } from '../../queues/register.processor';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EmailModule } from '../../common/email/email.module';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue({ name: 'register-queue' }),
    PrismaModule,
    EmailModule,
    AccountModule,
  ],
  providers: [TaskService, RegisterProcessor],
  controllers: [TaskController],
})
export class TaskModule {}
