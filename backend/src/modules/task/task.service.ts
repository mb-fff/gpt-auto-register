import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('register-queue') private registerQueue: Queue,
  ) {}

  async createRegisterTasks(count: number, proxy?: string) {
    this.logger.warn(`⚠️ 创建 ${count} 个注册任务 - 仅供本地学习使用`);

    const jobs = [];
    for (let i = 0; i < count; i++) {
      const job = await this.registerQueue.add(
        'register',
        { count: i + 1, proxy },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
      );
      jobs.push(job.id);
    }

    return {
      message: `成功加入 ${count} 个任务`,
      jobIds: jobs,
    };
  }

  async getQueueStatus() {
    return {
      waiting: await this.registerQueue.getWaitingCount(),
      active: await this.registerQueue.getActiveCount(),
      completed: await this.registerQueue.getCompletedCount(),
    };
  }
}
