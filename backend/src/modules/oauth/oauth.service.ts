// backend/src/modules/oauth/oauth.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import axios from 'axios';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DolphinService } from '../../common/dolphin/dolphin.service';
import { EmailService } from '../../common/email/email.service';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private prisma: PrismaService,
    private dolphin: DolphinService,
    private emailService: EmailService,
  ) { }

  generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge };
  }

  /** 当前主入口：保留为安全占位模式，避免队列直接触发真实第三方授权流程 */
  async startOAuth(accountId: string) {
    this.logger.warn('⚠️ OAuth 自动化入口已切换为安全占位模式');

    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error('账号不存在');

    await this.prisma.account.update({
      where: { id: accountId },
      data: { status: 'pending' },
    });

    return {
      success: false,
      accountId,
      message: 'OAuth 自动化入口未执行真实第三方授权流程，请使用手动导入或沙箱流程。',
    };
  }

  /** 真实完整自动化链路 */
  async startFullAutoRegister(accountId: string) {
    this.logger.warn('🚨 执行真实 OpenAI OAuth + RT 获取完整流程');

    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error('账号不存在');

    const tempEmail = this.emailService.generateTempEmail('openai');
    this.logger.log(`📧 临时邮箱: ${tempEmail}`);

    const { browser } = await this.dolphin.startProfileWithCDP(account.profileId);
    let authCode: string | null = null;

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 960 });

      const { codeVerifier, codeChallenge } = this.generatePKCE();

      const authorizeUrl = `https://auth0.openai.com/authorize?` +
        `client_id=app_EMoamEEZ73f0CkXaXp7hrann` +
        `&redirect_uri=https://chat.openai.com` +
        `&response_type=code` +
        `&scope=openid%20email%20profile%20offline_access` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256`;

      page.on('response', (response) => {
        const url = response.url();
        if (url.includes('code=') && !authCode) {
          try {
            authCode = new URL(url).searchParams.get('code');
            this.logger.log(`✅ 拦截到 authorization_code`);
          } catch { }
        }
      });

      await page.goto(authorizeUrl, { waitUntil: 'networkidle2' });

      // 自动填写邮箱
      await page.waitForSelector('input[type="email"]', { timeout: 25000 });
      await page.type('input[type="email"]', tempEmail, { delay: 80 });
      await page.keyboard.press('Enter');

      // 等待验证码
      const verificationCode = await this.emailService.waitForCode(tempEmail, 180000);

      if (verificationCode) {
        this.logger.log(`✅ 验证码: ${verificationCode}`);
        // 尝试自动填写验证码
        try {
          await page.waitForSelector('input[maxlength="6"], input[placeholder*="code"]', { timeout: 8000 });
          await page.type('input[maxlength="6"]', verificationCode);
          await page.keyboard.press('Enter');
        } catch { }
      }

      // 等待最终确认
      await new Promise(r => setTimeout(r, 75000));

      if (!authCode) throw new Error('未能获取 authorization_code');

      // 真实交换 RT
      const tokenRes = await axios.post('https://auth0.openai.com/oauth/token', {
        grant_type: 'authorization_code',
        client_id: 'app_EMoamEEZ73f0CkXaXp7hrann',
        code: authCode,
        code_verifier: codeVerifier,
        redirect_uri: 'https://chat.openai.com',
      });

      const { refresh_token, access_token } = tokenRes.data;

      if (!refresh_token) throw new Error('未获取到 refresh_token');

      await this.prisma.account.update({
        where: { id: accountId },
        data: {
          email: tempEmail,
          refreshToken: refresh_token,
          accessToken: access_token,
          status: 'success',
        },
      });

      this.logger.log('🎉 成功获取真实 Refresh Token');
      return { success: true, refreshToken: refresh_token, email: tempEmail };

    } catch (error: any) {
      this.logger.error('流程失败:', error.message);
      await this.prisma.account.update({ where: { id: accountId }, data: { status: 'failed' } });
      throw error;
    }
  }
}
