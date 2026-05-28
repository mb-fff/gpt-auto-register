import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private prisma: PrismaService,
  ) {}

  async createAccount(email: string, proxy?: string) {
    this.logger.log(`正在创建账号: ${email}`);
    const localProfileId = `local-${Date.now()}`;

    return this.prisma.account.create({
      data: {
        email,
        profileId: localProfileId,
        proxy,
        status: 'pending',
      },
    });
  }

  async findAll(params?: { page?: number; pageSize?: number; search?: string }) {
    const page = Math.max(Number(params?.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(params?.pageSize) || 10, 1), 100);
    const search = params?.search?.trim();
    const where: Prisma.AccountWhereInput = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { profileId: { contains: search, mode: 'insensitive' } },
            { status: { contains: search, mode: 'insensitive' } },
            { proxy: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.account.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.account.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
    };
  }

  async findAllLegacy() {
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

  async deleteMany(ids: string[]) {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (!uniqueIds.length) {
      return { count: 0 };
    }

    return this.prisma.account.deleteMany({
      where: { id: { in: uniqueIds } },
    });
  }
}
