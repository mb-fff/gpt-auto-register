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
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge };
  }

  async startOAuth(accountId: string) {
    this.logger.warn('🚨 执行 OpenAI OAuth CDP 自动化 - 仅供本地学习研究！');

    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error('账号不存在');

    // 1. 启动浏览器并获取 CDP 连接
    const { browser, wsEndpoint } = await this.dolphin.startProfileWithCDP(account.profileId);

    try {
      const page = await browser.newPage();

      const { codeVerifier, codeChallenge } = this.generatePKCE();

      const authorizeUrl = `https://auth0.openai.com/authorize?` +
        `client_id=pdl6t2t4f9a2p2v8p9q8v2q9r8t7u6y` + // 请替换为最新 client_id
        `&redirect_uri=https://chat.openai.com` +
        `&response_type=code` +
        `&scope=openid email profile offline_access` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256`;

      await page.goto(authorizeUrl, { waitUntil: 'networkidle2' });

      this.logger.log('✅ 已打开 OpenAI 授权页面');

      // TODO: 这里可以继续添加自动化逻辑：
      // await page.type('input[type="email"]', account.email);
      // await page.click('button[type="submit"]');
      // ... 处理登录、验证码等

      // 当前先 Mock（后续可继续完善）
      const mockRefreshToken = `rt_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;

      await this.prisma.account.update({
        where: { id: accountId },
        data: { refreshToken: mockRefreshToken, status: 'success' },
      });

      return { refreshToken: mockRefreshToken, wsEndpoint };
    } finally {
      // 可选择不立即关闭浏览器，让用户手动操作
      // await browser.close();
    }
  }
}
