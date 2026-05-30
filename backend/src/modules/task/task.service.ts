// 📁 backend/src/modules/task/task.service.ts

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { normalizeRetryAttempts } from './retry-attempts';
// 👇 引入刚才导出的进程追踪 Map
import { activePythonProcesses } from '../../queues/register.processor';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('register-queue') private registerQueue: Queue,
  ) { }

  async createRegisterTasks(count: number, proxy?: string, retryAttempts?: number, smsCountry?: string) {
    this.logger.warn(`⚠️ 创建 ${count} 个注册任务 (接码国家: ${smsCountry || '默认'})`);
    const attempts = normalizeRetryAttempts(retryAttempts);

    const jobs = [];
    for (let i = 0; i < count; i++) {
      const job = await this.registerQueue.add(
        'register',
        {
          count: i + 1,
          proxy,
          retryAttempts: attempts,
          smsCountry: smsCountry || '6'
        },
        { attempts, backoff: { type: 'exponential', delay: 5000 } }
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
    const jobs = await this.registerQueue.getJobs(['active', 'waiting', 'delayed', 'completed', 'failed'], 0, safeLimit - 1, false);
    return Promise.all(jobs.map(job => this.serializeJob(job)));
  }

  private async serializeJob(job: Job) {
    const state = await job.getState();
    const logs = await this.registerQueue.getJobLogs(job.id || '', 0, 10, true);
    return {
      id: job.id, name: job.name, state, progress: this.normalizeProgress(job.progress),
      data: { count: job.data?.count, proxy: job.data?.proxy, retryAttempts: job.data?.retryAttempts, smsCountry: job.data?.smsCountry },
      attemptsMade: job.attemptsMade, attemptsTotal: job.opts.attempts || 1, failedReason: job.failedReason,
      returnvalue: job.returnvalue, timestamp: job.timestamp, processedOn: job.processedOn, finishedOn: job.finishedOn, logs: logs.logs,
    };
  }

  private normalizeProgress(progress: Job['progress']) {
    if (typeof progress === 'number') return { percent: progress };
    return progress || { percent: 0 };
  }

  async retryJob(jobId: string) {
    const job = await this.getExistingJob(jobId);
    const state = await job.getState();
    if (state !== 'failed' && state !== 'completed') throw new BadRequestException(`当前任务状态为 ${state}，仅支持重试 failed/completed 任务`);
    await job.retry(state as 'failed' | 'completed');
    await job.log(`任务已手动重试，来源状态: ${state}`);
    return { message: '任务已重新加入队列', job: await this.serializeJob(job) };
  }

  // 🚀 核心更新：拦截 active 状态并执行 kill 强杀
  async removeJob(jobId: string) {
    const job = await this.getExistingJob(jobId);
    const state = await job.getState();

    // 如果任务正在执行，直接 Kill 掉底层的 Python 进程
    if (state === 'active') {
      const child = activePythonProcesses.get(jobId);
      if (child) {
        child.kill(); // 触发退出，BullMQ 会自动将其置为 Failed
        activePythonProcesses.delete(jobId);
        return { message: '已强制终止执行中的任务，它已被标记为失败', jobId, previousState: state };
      }
    }

    try {
      await job.remove({ removeChildren: true });
    } catch (error: any) {
      throw new BadRequestException(error.message || '删除任务失败');
    }
    return { message: '任务记录已删除', jobId, previousState: state };
  }

  // 🚀 新增接口：一键强杀所有正在执行的任务
  async stopActiveJobs() {
    let count = 0;
    for (const [jobId, child] of activePythonProcesses.entries()) {
      child.kill();
      count++;
    }
    activePythonProcesses.clear();
    return { message: `已强杀 ${count} 个正在执行的底层进程` };
  }

  async pauseQueue() {
    await this.registerQueue.pause();
    return { message: '队列已暂停', paused: await this.registerQueue.isPaused() };
  }

  async resumeQueue() {
    await this.registerQueue.resume();
    return { message: '队列已恢复', paused: await this.registerQueue.isPaused() };
  }

  async cleanJobs(type: 'completed' | 'failed' | 'all' = 'completed', grace = 0, limit = 100) {
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 1000);
    const safeGrace = Math.max(Number(grace) || 0, 0);
    const types = type === 'all' ? ['completed', 'failed'] as const : [type];
    const removed: Record<string, string[]> = {};
    for (const jobType of types) removed[jobType] = await this.registerQueue.clean(safeGrace, safeLimit, jobType);
    return { message: '清理完成', removed, total: Object.values(removed).reduce((sum, ids) => sum + ids.length, 0) };
  }

  private async getExistingJob(jobId: string) {
    const job = await this.registerQueue.getJob(jobId);
    if (!job) throw new NotFoundException(`任务不存在: ${jobId}`);
    return job;
  }
}