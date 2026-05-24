import { Controller, Post, Get, Body, Query, Param, Delete } from '@nestjs/common';
import { TaskService } from './task.service';

@Controller('tasks')
export class TaskController {
  constructor(private taskService: TaskService) {}

  @Post('register')
  createRegister(@Body() body: { count: number; proxy?: string; retryAttempts?: number }) {
    return this.taskService.createRegisterTasks(body.count, body.proxy, body.retryAttempts);
  }

  @Get('status')
  getStatus() {
    return this.taskService.getQueueStatus();
  }

  @Get('jobs')
  getJobs(@Query('limit') limit?: string) {
    return this.taskService.getRecentJobs(limit ? Number(limit) : 20);
  }

  @Post('jobs/:id/retry')
  retryJob(@Param('id') id: string) {
    return this.taskService.retryJob(id);
  }

  @Delete('jobs/:id')
  removeJob(@Param('id') id: string) {
    return this.taskService.removeJob(id);
  }

  @Post('pause')
  pauseQueue() {
    return this.taskService.pauseQueue();
  }

  @Post('resume')
  resumeQueue() {
    return this.taskService.resumeQueue();
  }

  @Post('clean')
  cleanJobs(@Body() body: { type?: 'completed' | 'failed' | 'all'; grace?: number; limit?: number }) {
    return this.taskService.cleanJobs(body?.type || 'completed', body?.grace, body?.limit);
  }
}
