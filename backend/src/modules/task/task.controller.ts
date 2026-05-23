import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { TaskService } from './task.service';

@Controller('tasks')
export class TaskController {
  constructor(private taskService: TaskService) {}

  @Post('register')
  createRegister(@Body() body: { count: number; proxy?: string }) {
    return this.taskService.createRegisterTasks(body.count, body.proxy);
  }

  @Get('status')
  getStatus() {
    return this.taskService.getQueueStatus();
  }

  @Get('jobs')
  getJobs(@Query('limit') limit?: string) {
    return this.taskService.getRecentJobs(limit ? Number(limit) : 20);
  }
}
