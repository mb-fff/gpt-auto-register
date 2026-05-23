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

  /** 完整自动化链路：注册 → OAuth → 验证码 → Refresh Token */
  async startFullAutoRegister(accountId: string) {
    this.logger.warn('🚨【高风险警告】启动完整 OpenAI 自动注册 + RT 获取流程，仅供本地学习研究！');

    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error('账号不存在');

    // 1. 生成临时邮箱
    const tempEmail = this.emailService.generateTempEmail('openai');
    this.logger.log(`📧 生成临时邮箱: ${tempEmail}`);

    // 2. 启动 Dolphin + CDP
    const { browser } = await this.dolphin.startProfileWithCDP(account.profileId);
    let authCode: string | null = null;

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 960 });

      const { codeVerifier, codeChallenge } = this.generatePKCE();

      const authorizeUrl = `https://auth0.openai.com/authorize?` +
        `client_id=app_EMoamEEZ73f0CkXaXp7hrann` +     // ← 使用你提供的
        `&redirect_uri=https://chat.openai.com` +
        `&response_type=code` +
        `&scope=openid%20email%20profile%20offline_access` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256`;

      // 3. 拦截 authorization code
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

      // 4. 自动填写邮箱
      await page.waitForSelector('input[type="email"], [name="email"]', { timeout: 30000 });
      await page.type('input[type="email"], [name="email"]', tempEmail, { delay: 60 });
      await page.keyboard.press('Enter');

      this.logger.log('📧 邮箱填写完成');

      // 5. 等待并自动提取验证码
      const verificationCode = await this.emailService.waitForCode(tempEmail, 180000);

      if (verificationCode) {
        this.logger.log(`✅ 收到验证码: ${verificationCode}`);

        // 尝试自动填写验证码（OpenAI 页面结构可能变化）
        try {
          await page.waitForSelector('input[type="text"][maxlength="6"], input[placeholder*="验证码"]', { timeout: 10000 });
          await page.type('input[type="text"][maxlength="6"]', verificationCode, { delay: 80 });
          await page.keyboard.press('Enter');
          this.logger.log('✅ 验证码已自动填写');
        } catch {
          this.logger.log('⚠️ 未能自动找到验证码输入框，请手动输入');
        }
      } else {
        this.logger.warn('⚠️ 未收到验证码，请手动检查邮箱');
      }

      // 6. 等待用户完成剩余验证（手机验证、确认等）
      this.logger.log('⏳ 等待最终确认（90秒）...');
      await new Promise(r => setTimeout(r, 90000));

      if (!authCode) {
        throw new Error('未能拦截到 authorization code');
      }

      // 7. 真实交换 Refresh Token
      this.logger.log('🔄 正在交换 Refresh Token...');

      const tokenRes = await axios.post('https://auth0.openai.com/oauth/token', {
        grant_type: 'authorization_code',
        client_id: 'app_EMoamEEZ73f0CkXaXp7hrann',     // ← 这里也要保持一致
        code: authCode,
        code_verifier: codeVerifier,
        redirect_uri: 'https://chat.openai.com',
      });

      const { refresh_token, access_token } = tokenRes.data;

      if (!refresh_token) throw new Error('未获取到 refresh_token');

      // 8. 保存结果
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
      return { success: true, email: tempEmail, refreshToken: refresh_token };

    } catch (error: any) {
      this.logger.error('完整流程失败:', error.message);
      await this.prisma.account.update({ where: { id: accountId }, data: { status: 'failed' } });
      throw error;
    } finally {
      // 保留浏览器窗口便于调试
    }
  }
}
