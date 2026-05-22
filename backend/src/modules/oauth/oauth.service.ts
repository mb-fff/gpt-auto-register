import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DolphinService } from '../../common/dolphin/dolphin.service';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private prisma: PrismaService,
    private dolphin: DolphinService,
  ) {}

  generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    return { codeVerifier, codeChallenge };
  }

  async startOAuth(accountId: string) {
    this.logger.warn('🚨【重要警告】正在执行 OpenAI OAuth 自动化流程，仅供个人本地学习研究！');

    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error('账号不存在');

    const { codeVerifier, codeChallenge } = this.generatePKCE();

    // OpenAI Auth0 授权链接（实际 client_id 请以最新为准）
    const authorizeUrl = `https://auth0.openai.com/authorize?` +
      `client_id=...` + // 需要替换为真实 client_id
      `&redirect_uri=https://chat.openai.com` +
      `&response_type=code` +
      `&scope=openid%20email%20profile%20offline_access` +
      `&code_challenge=${codeChallenge}` +
      `&code_challenge_method=S256`;

    // 启动浏览器 Profile
    await this.dolphin.startProfile(account.profileId);

    // TODO: 此处后续可集成 CDP 实现自动登录、填写邮箱、接码等
    this.logger.log(`已打开浏览器: ${authorizeUrl}`);

    // 当前为 Mock，实际项目中需拦截回调获取 code
    const mockRefreshToken = `sk-rt-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;

    await this.prisma.account.update({
      where: { id: accountId },
      data: {
        refreshToken: mockRefreshToken,
        status: 'success',
        updatedAt: new Date(),
      },
    });

    return { refreshToken: mockRefreshToken, codeVerifier };
  }
}
