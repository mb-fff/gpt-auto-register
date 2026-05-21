import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DolphinService } from '../../common/dolphin/dolphin.service';

@Injectable()
export class AccountService {
  constructor(
    private prisma: PrismaService,
    private dolphin: DolphinService,
  ) {}

  async createAccount(email: string, proxy?: string) {
    const profile = await this.dolphin.createProfile(`profile-${Date.now()}`, proxy);

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
    return this.prisma.account.findMany();
  }

  async saveRefreshToken(accountId: string, refreshToken: string) {
    return this.prisma.account.update({
      where: { id: accountId },
      data: {
        refreshToken,
        status: 'oauth_complete',
      },
    });
  }
}
