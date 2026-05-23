import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
      paused: await this.registerQueue.isPaused(),
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

  async retryJob(jobId: string) {
    const job = await this.getExistingJob(jobId);
    const state = await job.getState();

    if (state !== 'failed' && state !== 'completed') {
      throw new BadRequestException(`当前任务状态为 ${state}，仅支持重试 failed/completed 任务`);
    }

    await job.retry(state as 'failed' | 'completed');
    await job.log(`任务已手动重试，来源状态: ${state}`);

    return {
      message: '任务已重新加入队列',
      job: await this.serializeJob(job),
    };
  }

  async removeJob(jobId: string) {
    const job = await this.getExistingJob(jobId);
    const state = await job.getState();

    try {
      await job.remove({ removeChildren: true });
    } catch (error: any) {
      throw new BadRequestException(error.message || '删除任务失败');
    }

    return {
      message: '任务已删除',
      jobId,
      previousState: state,
    };
  }

  async pauseQueue() {
    await this.registerQueue.pause();
    return {
      message: '队列已暂停',
      paused: await this.registerQueue.isPaused(),
    };
  }

  async resumeQueue() {
    await this.registerQueue.resume();
    return {
      message: '队列已恢复',
      paused: await this.registerQueue.isPaused(),
    };
  }

  async cleanJobs(type: 'completed' | 'failed' | 'all' = 'completed', grace = 0, limit = 100) {
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 1000);
    const safeGrace = Math.max(Number(grace) || 0, 0);
    const types = type === 'all' ? ['completed', 'failed'] as const : [type];
    const removed: Record<string, string[]> = {};

    for (const jobType of types) {
      removed[jobType] = await this.registerQueue.clean(safeGrace, safeLimit, jobType);
    }

    return {
      message: '清理完成',
      removed,
      total: Object.values(removed).reduce((sum, ids) => sum + ids.length, 0),
    };
  }

  private async getExistingJob(jobId: string) {
    const job = await this.registerQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`任务不存在: ${jobId}`);
    }

    return job;
  }
}
