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

  /** 主入口 - 直接走真实流程 */
  async startOAuth(accountId: string) {
    return this.startFullAutoRegister(accountId);
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

      // ==================== 优化后的 URL ====================
      const authorizeUrl = `https://auth0.openai.com/authorize?` +
        `client_id=pdl6t2t4f9a2p2v8p9q8v2q9r8t7u6y` +   // 经典 client_id
        `&redirect_uri=https%3A%2F%2Fchat.openai.com` +
        `&response_type=code` +
        `&scope=openid%20email%20profile%20offline_access` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256`;

      this.logger.log(`打开授权页面: ${authorizeUrl}`);

      // 拦截 code
      page.on('response', (response) => {
        const url = response.url();
        if (url.includes('code=') && !authCode) {
          try {
            authCode = new URL(url).searchParams.get('code');
            this.logger.log(`✅ 成功拦截 authorization_code`);
          } catch { }
        }
      });

      await page.goto(authorizeUrl, { waitUntil: 'networkidle2' });

      // 自动填写邮箱
      await page.waitForSelector('input[type="email"]', { timeout: 30000 });
      await page.type('input[type="email"]', tempEmail, { delay: 100 });
      await page.keyboard.press('Enter');

      this.logger.log('📧 邮箱已填写');

      // 等待验证码
      const verificationCode = await this.emailService.waitForCode(tempEmail, 180000);

      if (verificationCode) {
        this.logger.log(`✅ 收到验证码: ${verificationCode}`);
        try {
          await page.waitForSelector('input[maxlength="6"], input[placeholder*="验证码"]', { timeout: 10000 });
          await page.type('input[maxlength="6"]', verificationCode, { delay: 80 });
          await page.keyboard.press('Enter');
        } catch (e) {
          this.logger.log('⚠️ 未能自动填写验证码，请手动输入');
        }
      }

      // 等待最终操作
      await new Promise(r => setTimeout(r, 90000));

      if (!authCode) throw new Error('未能拦截到 authorization_code');

      // 真实交换 Refresh Token
      this.logger.log('🔄 正在交换 Refresh Token...');
      const tokenRes = await axios.post('https://auth0.openai.com/oauth/token', {
        grant_type: 'authorization_code',
        client_id: 'app_EMoamEEZ73f0CkXaXp7hrann',
        code: authCode,
        code_verifier: codeVerifier,
        redirect_uri: 'https://chat.openai.com',
      });

      const { refresh_token, access_token } = tokenRes.data;

      if (!refresh_token) throw new Error('未返回 refresh_token');

      await this.prisma.account.update({
        where: { id: accountId },
        data: {
          email: tempEmail,
          refreshToken: refresh_token,
          accessToken: access_token,
          status: 'success',
        },
      });

      this.logger.log('🎉 成功获取真实 Refresh Token！');
      return { success: true, refreshToken: refresh_token, email: tempEmail };

    } catch (error: any) {
      this.logger.error('完整流程失败:', error.message);
      await this.prisma.account.update({ where: { id: accountId }, data: { status: 'failed' } });
      throw error;
    }
  }
}