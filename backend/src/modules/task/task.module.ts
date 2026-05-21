import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'register-queue' }),
  ],
  providers: [TaskService],
  controllers: [TaskController],
})
export class TaskModule {}
