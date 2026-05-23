import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
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
      failed: await this.registerQueue.getFailedCount(),
      delayed: await this.registerQueue.getDelayedCount(),
    };
  }

  async getRecentJobs(limit = 20) {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const jobs = await this.registerQueue.getJobs(
      ['active', 'waiting', 'delayed', 'completed', 'failed'],
      0,
      safeLimit - 1,
      false,
    );

    return Promise.all(jobs.map(job => this.serializeJob(job)));
  }

  private async serializeJob(job: Job) {
    const state = await job.getState();
    const logs = await this.registerQueue.getJobLogs(job.id || '', 0, 10, true);

    return {
      id: job.id,
      name: job.name,
      state,
      progress: this.normalizeProgress(job.progress),
      data: {
        count: job.data?.count,
        proxy: job.data?.proxy,
      },
      attemptsMade: job.attemptsMade,
      attemptsTotal: job.opts.attempts || 1,
      failedReason: job.failedReason,
      returnvalue: job.returnvalue,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      logs: logs.logs,
    };
  }

  private normalizeProgress(progress: Job['progress']) {
    if (typeof progress === 'number') {
      return { percent: progress };
    }

    return progress || { percent: 0 };
  }
}
