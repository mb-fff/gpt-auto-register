import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ProxyService {
  constructor(private prisma: PrismaService) {}

  async addProxy(data: any) {
    return (this.prisma as any).proxy.create({ data });
  }

  async getActiveProxies() {
    return (this.prisma as any).proxy.findMany({ where: { isActive: true } });
  }
}
