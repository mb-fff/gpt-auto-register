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

  async startOAuth(accountId: string) {
    this.logger.warn('🚨 开始真实 OpenAI OAuth 流程（含 Token 交换）');

    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error('账号不存在');

    const tempEmail = this.emailService.generateTempEmail('openai');
    this.logger.log(`📧 使用临时邮箱: ${tempEmail}`);

    const { browser } = await this.dolphin.startProfileWithCDP(account.profileId);
    let authCode: string | null = null;

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1400, height: 960 });

      const { codeVerifier, codeChallenge } = this.generatePKCE();

      const authorizeUrl = `https://auth0.openai.com/authorize?` +
        `client_id=pdl6t2t4f9a2p2v8p9q8v2q9r8t7u6y` +   // 如失效请更新
        `&redirect_uri=https://chat.openai.com` +
        `&response_type=code` +
        `&scope=openid%20email%20profile%20offline_access` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256`;

      // 拦截 authorization code
      page.on('response', (response) => {
        const url = response.url();
        if (url.includes('code=') && !authCode) {
          try {
            const urlObj = new URL(url);
            authCode = urlObj.searchParams.get('code');
            if (authCode) this.logger.log(`✅ 成功拦截 authorization_code`);
          } catch (e) { }
        }
      });

      await page.goto(authorizeUrl, { waitUntil: 'networkidle2' });

      // 自动填写邮箱
      await page.waitForSelector('input[type="email"]', { timeout: 20000 });
      await page.type('input[type="email"]', tempEmail, { delay: 100 });
      await page.keyboard.press('Enter');

      this.logger.log('📧 邮箱已填写');

      // 等待验证码并自动处理（可继续增强）
      const verificationCode = await this.emailService.waitForCode(tempEmail, 180000);

      if (verificationCode) {
        this.logger.log(`✅ 收到验证码: ${verificationCode}`);
        // 可在此处继续自动化输入验证码
      }

      // 等待用户手动完成剩余流程（手机验证等）
      this.logger.log('⏳ 请在浏览器中完成剩余验证...（等待 90 秒）');
      await new Promise(r => setTimeout(r, 90000));

      if (!authCode) {
        throw new Error('未能拦截到 authorization code');
      }

      // ==================== 真实交换 Refresh Token ====================
      this.logger.log('🔄 正在交换 Refresh Token...');

      const tokenResponse = await axios.post('https://auth0.openai.com/oauth/token', {
        grant_type: 'authorization_code',
        client_id: 'pdl6t2t4f9a2p2v8p9q8v2q9r8t7u6y',
        code: authCode,
        code_verifier: codeVerifier,
        redirect_uri: 'https://chat.openai.com',
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      });

      const { refresh_token, access_token, expires_in } = tokenResponse.data;

      if (!refresh_token) {
        throw new Error('未返回 refresh_token');
      }

      // 保存到数据库
      await this.prisma.account.update({
        where: { id: accountId },
        data: {
          email: tempEmail,
          refreshToken: refresh_token,
          accessToken: access_token,
          status: 'success',
          rtExpiresAt: new Date(Date.now() + (expires_in || 2592000) * 1000),
        },
      });

      this.logger.log('🎉 成功获取真实 Refresh Token！');

      return {
        success: true,
        email: tempEmail,
        refreshToken: refresh_token,
        accessToken: access_token,
      };

    } catch (error: any) {
      this.logger.error('OAuth 流程失败:', error.message);
      await this.prisma.account.update({
        where: { id: accountId },
        data: { status: 'failed' },
      });
      throw error;
    } finally {
      // 保留浏览器窗口用于调试
    }
  }
}