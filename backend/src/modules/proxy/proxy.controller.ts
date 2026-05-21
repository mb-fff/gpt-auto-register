import { Controller, Post, Get, Body } from '@nestjs/common';
import { ProxyService } from './proxy.service';

@Controller('proxies')
export class ProxyController {
  constructor(private proxyService: ProxyService) {}

  @Post()
  add(@Body() body: any) {
    return this.proxyService.addProxy(body);
  }

  @Get()
  findAll() {
    return this.proxyService.getActiveProxies();
  }
}
