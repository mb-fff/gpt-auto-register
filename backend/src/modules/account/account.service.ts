import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DolphinService } from '../../common/dolphin/dolphin.service';

@Injectable()
export class AccountService {
  constructor(
    private prisma: PrismaService,
    private dolphinService: DolphinService,
  ) {}

  async findAll() {
    return this.prisma.account.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createAccountWithProfile(email: string, proxy?: string) {
    const profile = await this.dolphinService.createProfile(email, proxy);

    return this.prisma.account.create({
      data: {
        email,
        proxy,
        profileId: profile.id,
        status: 'created',
      },
    });
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
