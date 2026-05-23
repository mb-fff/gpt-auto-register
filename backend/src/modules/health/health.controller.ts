import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealthOverview() {
    return this.healthService.getHealthOverview();
  }

  @Get('config')
  getConfigHealth() {
    return this.healthService.getConfigHealth();
  }

  @Get('services')
  getServicesHealth() {
    return this.healthService.getServicesHealth();
  }
}
