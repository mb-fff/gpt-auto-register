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

  async startOAuth(accountId: string, email?: string) {
    this.logger.warn('🚨 执行 OpenAI OAuth CDP 自动化流程 - 仅供本地学习！');

    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error('账号不存在');

    const loginEmail = email || account.email;
    const { browser } = await this.dolphin.startProfileWithCDP(account.profileId);

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });

      const { codeVerifier, codeChallenge } = this.generatePKCE();

      const authorizeUrl = `https://auth0.openai.com/authorize?` +
        `client_id=pdl6t2t4f9a2p2v8p9q8v2q9r8t7u6y` + // 请替换为最新 client_id
        `&redirect_uri=https://chat.openai.com` +
        `&response_type=code` +
        `&scope=openid%20email%20profile%20offline_access` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256`;

      await page.goto(authorizeUrl, { waitUntil: 'networkidle2' });

      this.logger.log('✅ 已打开授权页面，开始自动化操作...');

      await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 15000 });
      await page.type('input[type="email"], input[name="email"]', loginEmail, { delay: 100 });
      await page.keyboard.press('Enter');

      this.logger.log('📧 已输入邮箱');

      await new Promise(resolve => setTimeout(resolve, 3000));

      // TODO: 如果需要密码，可以在这里继续添加
      // await page.type('input[type="password"]', 'your_password');
      // await page.click('button[type="submit"]');

      this.logger.log('⏳ 请在浏览器中完成剩余验证操作（验证码、手机验证等）');

      page.on('response', async (response) => {
        if (response.url().includes('callback') || response.url().includes('code=')) {
          this.logger.log(`🔄 检测到回调: ${response.url()}`);
        }
      });

      await new Promise(resolve => setTimeout(resolve, 60000));

      // 当前先 Mock（后续替换为真实交换）
      const mockRefreshToken = `rt_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;

      await this.prisma.account.update({
        where: { id: accountId },
        data: {
          refreshToken: mockRefreshToken,
          status: 'success',
          email: loginEmail,
        },
      });

      return {
        success: true,
        refreshToken: mockRefreshToken,
        message: '浏览器已启动，请手动完成登录验证',
      };
    } catch (error: any) {
      this.logger.error('自动化失败:', error.message);
      throw error;
    } finally {
      // 可选择不立即关闭浏览器，让用户手动操作
      // await browser.close();
    }
  }
}
