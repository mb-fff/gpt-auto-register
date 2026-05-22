import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DolphinService } from '../../common/dolphin/dolphin.service';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private prisma: PrismaService,
    private dolphin: DolphinService,
  ) {}

  async createAccount(email: string, proxy?: string) {
    this.logger.log(`正在创建账号: ${email}`);

    const profile = await this.dolphin.createProfile(`auto-${Date.now()}`, proxy);

    return this.prisma.account.create({
      data: {
        email,
        profileId: profile.id || profile.profileId,
        proxy,
        status: 'pending',
      },
    });
  }

  async findAll() {
    return this.prisma.account.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.account.findUnique({ where: { id } });
  }

  async delete(id: string) {
    return this.prisma.account.delete({ where: { id } });
  }
}
