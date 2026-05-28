// backend/src/modules/oauth/oauth.service.ts
import { GoneException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private prisma: PrismaService,
  ) { }

  /** 主入口 - 直接走真实流程 */
  async startOAuth(accountId: string) {
    return this.startFullAutoRegister(accountId);
  }

  /** 真实完整自动化链路 */
  async startFullAutoRegister(accountId: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error('账号不存在');

    this.logger.warn('OAuth/RT 自动化流程已移除，当前产品不再提供 token 获取能力');
    throw new GoneException('OAuth/RT 自动化流程已移除');
  }
}
