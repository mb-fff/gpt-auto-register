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

  async createRegisterTask(count: number, country?: string, proxy?: string) {
    this.logger.warn('⚠️ 创建批量注册任务 - 仅本地学习使用');

    const tasks = [];
    for (let i = 0; i < count; i++) {
      const job = await this.registerQueue.add('register', {
        count: i + 1,
        country,
        proxy,
      });
      tasks.push(job);
    }
    return { jobs: tasks.length };
  }
}
