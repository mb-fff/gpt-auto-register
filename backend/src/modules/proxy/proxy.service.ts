import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ProxyService {
  constructor(private prisma: PrismaService) {}

  async addProxy(data: any) {
    return this.prisma.proxy.create({ data });
  }

  async getActiveProxies() {
    return this.prisma.proxy.findMany({ where: { isActive: true } });
  }
}
