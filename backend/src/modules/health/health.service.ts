import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ImapFlow } from 'imapflow';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BrowserProfileService } from '../../common/dolphin/browser-profile.service';

export type HealthStatus = 'ok' | 'warn' | 'error';

export interface HealthCheck {
  key: string;
  label: string;
  status: HealthStatus;
  message: string;
  details?: Record<string, any>;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly browserProfileService: BrowserProfileService,
  ) {}

  getConfigHealth() {
    const provider = this.browserProfileService.getProvider();
    const checks: HealthCheck[] = [
      this.requiredEnv('DATABASE_URL', 'PostgreSQL 连接串'),
      this.requiredEnv('REDIS_HOST', 'Redis 主机'),
      this.requiredEnv('REDIS_PORT', 'Redis 端口'),
      this.optionalEnv('BROWSER_PROVIDER', '浏览器 Provider', '未配置时默认 dolphin'),
      ...(provider === 'bitbrowser'
        ? [
          this.requiredEnv('BITBROWSER_API_BASE', 'BitBrowser API 地址', { reveal: true }),
        ]
        : provider === 'hubstudio'
        ? [
          this.requiredEnv('HUBSTUDIO_API_BASE', 'Hubstudio API 地址', { reveal: true }),
          this.requiredEnv('HUBSTUDIO_GROUP_CODE', 'Hubstudio 分组 Code', { reveal: true }),
          this.optionalEnv('HUBSTUDIO_APP_ID', 'Hubstudio App ID', '本地 API 模式可能不需要'),
          this.optionalEnv('HUBSTUDIO_APP_SECRET', 'Hubstudio App Secret', '本地 API 模式可能不需要'),
        ]
        : [
          this.requiredEnv('DOLPHIN_API_BASE', 'Dolphin API 地址', { reveal: true }),
        ]),
      this.optionalEnv('BROWSER_CDP_HOST', '浏览器 CDP Host', '未配置时默认 host.docker.internal'),
      this.requiredEnv('EMAIL_DOMAIN', '临时邮箱域名', { reveal: true }),
      this.requiredEnv('IMAP_HOST', 'IMAP 主机', { reveal: true }),
      this.requiredEnv('IMAP_USER', 'IMAP 账号', { reveal: true }),
      this.requiredEnv('IMAP_PASS', 'IMAP 应用密码'),
      this.optionalEnv('IMAP_PORT', 'IMAP 端口', '未配置时默认 993'),
      this.optionalEnv('IMAP_SECURE', 'IMAP TLS', '未配置时默认启用'),
      this.jwtSecretHealth(),
      this.optionalEnv('CLOUDFLARE_API_TOKEN', 'Cloudflare API Token', '当前代码未直接调用，预留自动化检查'),
      this.optionalEnv('CLOUDFLARE_ZONE_ID', 'Cloudflare Zone ID', '当前代码未直接调用，预留自动化检查'),
    ];

    return this.buildReport(checks);
  }

  async getServicesHealth() {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkBrowserProvider(),
      this.checkImap(),
    ]);

    return this.buildReport(checks);
  }

  async getHealthOverview() {
    const config = this.getConfigHealth();
    const services = await this.getServicesHealth();
    const checks = [...config.checks, ...services.checks];

    return {
      status: this.pickWorstStatus(checks),
      checkedAt: new Date().toISOString(),
      config,
      services,
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startedAt = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        key: 'database',
        label: 'PostgreSQL',
        status: 'ok',
        message: '数据库连接正常',
        details: { latencyMs: Date.now() - startedAt },
      };
    } catch (error: any) {
      return this.errorCheck('database', 'PostgreSQL', '数据库连接失败', error);
    }
  }

  private async checkRedis(): Promise<HealthCheck> {
    const startedAt = Date.now();
    const redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST') || 'localhost',
      port: Number(this.configService.get<string>('REDIS_PORT') || 6379),
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });

    try {
      await redis.connect();
      const pong = await redis.ping();
      return {
        key: 'redis',
        label: 'Redis',
        status: pong === 'PONG' ? 'ok' : 'warn',
        message: pong === 'PONG' ? 'Redis 连接正常' : `Redis 返回异常: ${pong}`,
        details: { latencyMs: Date.now() - startedAt },
      };
    } catch (error: any) {
      return this.errorCheck('redis', 'Redis', 'Redis 连接失败', error);
    } finally {
      redis.disconnect();
    }
  }

  private async checkBrowserProvider(): Promise<HealthCheck> {
    try {
      const result = await this.browserProfileService.checkProviderHealth();
      const label = result.provider === 'bitbrowser'
        ? 'BitBrowser API'
        : result.provider === 'hubstudio'
          ? 'Hubstudio API'
          : 'Dolphin API';

      return {
        key: 'browserProvider',
        label,
        status: result.httpStatus >= 500 ? 'warn' : 'ok',
        message: result.httpStatus >= 500 ? `${label} 有响应但状态异常: ${result.httpStatus}` : `${label} 可达`,
        details: {
          provider: result.provider,
          apiBase: result.apiBase,
          httpStatus: result.httpStatus,
          latencyMs: result.latencyMs,
        },
      };
    } catch (error: any) {
      const provider = this.browserProfileService.getProvider();
      const label = provider === 'bitbrowser'
        ? 'BitBrowser API'
        : provider === 'hubstudio'
          ? 'Hubstudio API'
          : 'Dolphin API';
      return this.errorCheck('browserProvider', label, `${label} 不可达`, error, {
        provider,
      });
    }
  }

  private async checkImap(): Promise<HealthCheck> {
    const startedAt = Date.now();
    const missing = ['IMAP_HOST', 'IMAP_USER', 'IMAP_PASS'].filter(key => !this.configService.get<string>(key));
    if (missing.length) {
      return {
        key: 'imap',
        label: 'IMAP 邮箱',
        status: 'error',
        message: `缺少配置: ${missing.join(', ')}`,
      };
    }

    const client = new ImapFlow({
      host: this.configService.get<string>('IMAP_HOST')!,
      port: Number(this.configService.get<string>('IMAP_PORT') || 993),
      secure: this.configService.get<string>('IMAP_SECURE') !== 'false',
      auth: {
        user: this.configService.get<string>('IMAP_USER')!,
        pass: this.configService.get<string>('IMAP_PASS')!,
      },
      logger: false,
    });

    try {
      await client.connect();
      await client.mailboxOpen('INBOX');
      return {
        key: 'imap',
        label: 'IMAP 邮箱',
        status: 'ok',
        message: 'IMAP 登录和 INBOX 读取正常',
        details: { latencyMs: Date.now() - startedAt },
      };
    } catch (error: any) {
      return this.errorCheck('imap', 'IMAP 邮箱', 'IMAP 登录或读取失败', error);
    } finally {
      await client.logout().catch(() => undefined);
    }
  }

  private requiredEnv(key: string, label: string, options?: { reveal?: boolean }): HealthCheck {
    const value = this.configService.get<string>(key);
    return {
      key,
      label,
      status: value ? 'ok' : 'error',
      message: value ? '已配置' : '缺少必要配置',
      details: value && options?.reveal ? { value } : undefined,
    };
  }

  private optionalEnv(key: string, label: string, emptyMessage: string): HealthCheck {
    const value = this.configService.get<string>(key);
    return {
      key,
      label,
      status: value ? 'ok' : 'warn',
      message: value ? '已配置' : emptyMessage,
    };
  }

  private jwtSecretHealth(): HealthCheck {
    const value = this.configService.get<string>('JWT_SECRET');
    const weak = !value || value === 'super-secret-change-me-please';
    return {
      key: 'JWT_SECRET',
      label: 'JWT Secret',
      status: weak ? 'warn' : 'ok',
      message: weak ? '当前为默认或空值，仅适合本地开发' : '已配置',
    };
  }

  private errorCheck(key: string, label: string, message: string, error: any, details?: Record<string, any>): HealthCheck {
    return {
      key,
      label,
      status: 'error',
      message,
      details: {
        ...details,
        error: error?.message || String(error),
      },
    };
  }

  private buildReport(checks: HealthCheck[]) {
    return {
      status: this.pickWorstStatus(checks),
      checkedAt: new Date().toISOString(),
      checks,
    };
  }

  private pickWorstStatus(checks: HealthCheck[]): HealthStatus {
    if (checks.some(check => check.status === 'error')) return 'error';
    if (checks.some(check => check.status === 'warn')) return 'warn';
    return 'ok';
  }
}
