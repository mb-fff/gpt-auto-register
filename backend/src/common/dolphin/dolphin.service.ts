import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import puppeteer from 'puppeteer-core';

@Injectable()
export class DolphinService {
  private readonly logger = new Logger(DolphinService.name);
  private readonly apiBase: string;

  constructor(private configService: ConfigService) {
    this.apiBase = this.configService.get<string>('DOLPHIN_API_BASE') || 'http://host.docker.internal:3001';
  }

  async createProfile(name: string, proxy?: string) {
    this.logger.warn('⚠️ 创建 Dolphin Profile - 仅供本地学习');
    const payload: any = {
      name,
      os: 'windows',
      fingerprint: { autoGenerate: true },
    };

    if (proxy) {
      payload.proxy = { mode: 'http', ...this.parseProxy(proxy) };
    }

    const res = await axios.post(`${this.apiBase}/v1.0/browser_profiles`, payload);
    return res.data;
  }

  /** 启动 Profile 并返回 CDP 连接信息 */
  async startProfileWithCDP(profileId: string) {
    this.logger.log(`启动 Profile ${profileId} 并启用 CDP...`);

    const response = await axios.get(
      `${this.apiBase}/v1.0/browser_profiles/${profileId}/start?automation=1`
    );

    const { automation } = response.data;

    if (!automation?.port || !automation?.wsEndpoint) {
      throw new Error('Dolphin 未返回有效的 CDP 信息');
    }

    const wsEndpoint = `ws://127.0.0.1:${automation.port}${automation.wsEndpoint}`;

    this.logger.log(`✅ CDP 连接地址: ${wsEndpoint}`);

    return {
      port: automation.port,
      wsEndpoint,
      browser: await this.connectPuppeteer(wsEndpoint),
    };
  }

  async startProfile(profileId: string) {
    return this.startProfileWithCDP(profileId);
  }

  private async connectPuppeteer(wsEndpoint: string) {
    return puppeteer.connect({
      browserWSEndpoint: wsEndpoint,
      defaultViewport: null,
    });
  }

  async stopProfile(profileId: string) {
    return axios.get(`${this.apiBase}/v1.0/browser_profiles/${profileId}/stop`);
  }

  private parseProxy(proxyStr: string) {
    try {
      const url = new URL(proxyStr.replace('http://', 'http://dummy:'));
      return {
        host: url.hostname,
        port: parseInt(url.port),
        login: url.username || undefined,
        password: url.password || undefined,
      };
    } catch {
      return { host: proxyStr };
    }
  }
}
