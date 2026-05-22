import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import axios from 'axios';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DolphinService } from '../../common/dolphin/dolphin.service';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private prisma: PrismaService,
    private dolphin: DolphinService,
  ) {}

  /** 生成 PKCE 验证 */
  generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    return { codeVerifier, codeChallenge };
  }

  async startOAuth(accountId: string) {
    this.logger.warn('🚨【警告】正在执行 OpenAI OAuth 授权流程 - 仅供本地学习使用');

    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error('账号不存在');

    const { codeVerifier, codeChallenge } = this.generatePKCE();

    // 注意：client_id 需要根据实际情况更新（OpenAI 可能变化）
    const authorizeUrl = `https://auth0.openai.com/authorize?` +
      `client_id=pdl6t2t4f9a2p2v8p9q8v2q9r8t7u6y` + 
      `&redirect_uri=https://chat.openai.com` +
      `&response_type=code` +
      `&scope=openid%20email%20profile%20offline_access` +
      `&code_challenge=${codeChallenge}` +
      `&code_challenge_method=S256`;

    // 启动指纹浏览器
    await this.dolphin.startProfile(account.profileId);

    this.logger.log(`浏览器已启动，请手动或自动化完成登录: ${authorizeUrl}`);

    // TODO: 后续可接入 CDP 实现全自动
    // 当前使用 Mock Refresh Token
    const mockRefreshToken = `rt_${Date.now()}_${crypto.randomBytes(20).toString('hex')}`;

    await this.prisma.account.update({
      where: { id: accountId },
      data: {
        refreshToken: mockRefreshToken,
        status: 'success',
      },
    });

    return { refreshToken: mockRefreshToken };
  }
}
