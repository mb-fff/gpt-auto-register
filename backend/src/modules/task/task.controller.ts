import { Controller, Post, Body } from '@nestjs/common';
import { TaskService } from './task.service';

@Controller('tasks')
export class TaskController {
  constructor(private taskService: TaskService) {}

  @Post('register')
  createRegister(@Body() body: { count: number; country?: string; proxy?: string }) {
    return this.taskService.createRegisterTask(body.count, body.country, body.proxy);
  }
}
