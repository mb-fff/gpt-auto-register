// backend/src/modules/oauth/oauth.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import axios from 'axios';
import { Page } from 'puppeteer-core';
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

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1400, height: 960 });
      const codeCapture = this.createAuthorizationCodeCapture(page);

      const { codeVerifier, codeChallenge } = this.generatePKCE();

      const authorizeUrl = `https://auth0.openai.com/authorize?` +
        `client_id=pdl6t2t4f9a2p2v8p9q8v2q9r8t7u6y` +   // 如失效请更新
        `&redirect_uri=https://chat.openai.com` +
        `&response_type=code` +
        `&scope=openid%20email%20profile%20offline_access` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256`;

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
        await this.fillVerificationCode(page, verificationCode);
      }

      this.logger.log('⏳ 等待授权回调 code，如出现手机验证请在浏览器中完成');
      const authCode = await codeCapture.waitForCode(120000);

      if (!authCode) {
        const currentUrl = page.url();
        this.logger.warn(`⚠️ 等待 authorization code 超时，当前页面: ${currentUrl}`);
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

  private createAuthorizationCodeCapture(page: Page) {
    let authCode: string | null = null;

    const capture = (rawUrl?: string) => {
      if (!rawUrl || authCode) return;

      const code = this.extractAuthorizationCode(rawUrl);
      if (!code) return;

      authCode = code;
      this.logger.log('✅ 成功捕获 authorization_code');
    };

    page.on('request', (request) => capture(request.url()));
    page.on('response', (response) => capture(response.url()));
    page.on('framenavigated', (frame) => capture(frame.url()));

    return {
      getCode: () => {
        capture(page.url());
        return authCode;
      },
      waitForCode: async (timeoutMs: number) => {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
          capture(page.url());
          if (authCode) return authCode;
          await this.delay(1000);
        }

        return authCode;
      },
    };
  }

  private extractAuthorizationCode(rawUrl: string) {
    if (!rawUrl.includes('code=')) return null;

    try {
      const url = new URL(rawUrl);
      const code = url.searchParams.get('code');
      if (code) return code;

      if (url.hash) {
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        return hashParams.get('code');
      }
    } catch {
      const queryMatch = rawUrl.match(/[?&]code=([^&#]+)/);
      if (queryMatch?.[1]) return decodeURIComponent(queryMatch[1]);

      const hashMatch = rawUrl.match(/[#&]code=([^&#]+)/);
      if (hashMatch?.[1]) return decodeURIComponent(hashMatch[1]);
    }

    return null;
  }

  private async fillVerificationCode(page: Page, code: string) {
    this.logger.log('🔐 开始自动填写邮箱验证码');

    const filled = await this.tryFillSplitCodeInputs(page, code) || await this.tryFillSingleCodeInput(page, code);
    if (!filled) {
      this.logger.warn('⚠️ 未找到验证码输入框，请手动填写验证码');
      return;
    }

    await this.submitVerificationCode(page);
    this.logger.log('✅ 验证码已提交');
  }

  private async tryFillSplitCodeInputs(page: Page, code: string) {
    const inputSelectors = [
      'input[inputmode="numeric"]',
      'input[autocomplete="one-time-code"]',
      'input[aria-label*="code" i]',
      'input[name*="code" i]',
      'input[id*="code" i]',
    ];

    for (const selector of inputSelectors) {
      const inputs = await page.$$(selector);
      if (inputs.length < code.length) continue;

      for (let index = 0; index < code.length; index++) {
        await this.clearFocusedInput(page, inputs[index]);
        await inputs[index].type(code[index], { delay: 60 });
      }

      return true;
    }

    return false;
  }

  private async tryFillSingleCodeInput(page: Page, code: string) {
    const selectors = [
      'input[autocomplete="one-time-code"]',
      'input[inputmode="numeric"]',
      'input[type="tel"]',
      'input[type="text"][name*="code" i]',
      'input[type="text"][id*="code" i]',
      'input[type="text"]',
    ];

    for (const selector of selectors) {
      const input = await page.$(selector);
      if (!input) continue;

      await this.clearFocusedInput(page, input);
      await input.type(code, { delay: 80 });
      return true;
    }

    return false;
  }

  private async submitVerificationCode(page: Page) {
    const buttonSelectors = [
      'button[type="submit"]',
      'button[data-testid*="continue" i]',
      'button[data-testid*="submit" i]',
      'button',
    ];

    for (const selector of buttonSelectors) {
      const clicked = await page.$$eval(selector, (buttons) => {
        const candidates = buttons.filter((button) => {
          const text = button.textContent?.toLowerCase() || '';
          const disabled = button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true';
          return !disabled && (
            text.includes('continue') ||
            text.includes('next') ||
            text.includes('submit') ||
            text.includes('verify') ||
            text.includes('继续') ||
            text.includes('下一步') ||
            text.includes('验证') ||
            text.includes('提交')
          );
        });

        const button = candidates[0] as HTMLElement | undefined;
        if (!button) return false;
        button.click();
        return true;
      });

      if (clicked) {
        await this.delay(3000);
        return;
      }
    }

    await page.keyboard.press('Enter');
    await this.delay(3000);
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async clearFocusedInput(page: Page, input: Awaited<ReturnType<Page['$']>>) {
    if (!input) return;
    await input.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
  }
}
