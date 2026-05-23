import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import puppeteer, { Browser } from 'puppeteer-core';

interface BrowserProfileResult {
  id?: string;
  profileId?: string;
  containerCode?: string;
  raw?: unknown;
}

@Injectable()
export class BrowserProfileService {
  private readonly logger = new Logger(BrowserProfileService.name);
  private readonly provider: string;
  private readonly dolphinApiBase: string;
  private readonly hubstudioApiBase: string;
  private readonly hubstudioClient: AxiosInstance;
  private readonly bitbrowserApiBase: string;
  private readonly bitbrowserClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.provider = (this.configService.get<string>('BROWSER_PROVIDER') || 'dolphin').toLowerCase();
    this.dolphinApiBase = this.configService.get<string>('DOLPHIN_API_BASE') || 'http://host.docker.internal:3001';
    this.hubstudioApiBase = this.configService.get<string>('HUBSTUDIO_API_BASE') || 'http://host.docker.internal:6873';
    this.bitbrowserApiBase = this.configService.get<string>('BITBROWSER_API_BASE') || 'http://host.docker.internal:54345';
    this.hubstudioClient = axios.create({
      baseURL: this.hubstudioApiBase,
      timeout: 10000,
      headers: this.getHubstudioHeaders(),
    });
    this.bitbrowserClient = axios.create({
      baseURL: this.bitbrowserApiBase,
      timeout: 10000,
    });
  }

  getProvider() {
    return this.provider;
  }

  async createProfile(name: string, proxy?: string): Promise<BrowserProfileResult> {
    if (this.provider === 'bitbrowser') {
      return this.createBitbrowserProfile(name, proxy);
    }

    if (this.provider === 'hubstudio') {
      return this.createHubstudioProfile(name, proxy);
    }

    return this.createDolphinProfile(name, proxy);
  }

  async startProfileWithCDP(profileId: string) {
    if (this.provider === 'bitbrowser') {
      return this.startBitbrowserProfile(profileId);
    }

    if (this.provider === 'hubstudio') {
      return this.startHubstudioProfile(profileId);
    }

    return this.startDolphinProfile(profileId);
  }

  async startProfile(profileId: string) {
    return this.startProfileWithCDP(profileId);
  }

  async stopProfile(profileId: string) {
    if (this.provider === 'bitbrowser') {
      return this.bitbrowserClient.post('/browser/close', {
        id: profileId,
      });
    }

    if (this.provider === 'hubstudio') {
      return this.hubstudioClient.post('/api/v1/browser/stop', {
        containerCode: profileId,
      });
    }

    return axios.get(`${this.dolphinApiBase}/v1.0/browser_profiles/${profileId}/stop`);
  }

  async checkProviderHealth() {
    if (this.provider === 'bitbrowser') {
      return this.checkBitbrowserHealth();
    }

    if (this.provider === 'hubstudio') {
      return this.checkHubstudioHealth();
    }

    return this.checkDolphinHealth();
  }

  private async createDolphinProfile(name: string, proxy?: string): Promise<BrowserProfileResult> {
    this.logger.warn('⚠️ 创建 Dolphin Profile - 仅供本地学习');
    const payload: any = {
      name,
      os: 'windows',
      fingerprint: { autoGenerate: true },
    };

    if (proxy) {
      payload.proxy = { mode: 'http', ...this.parseProxy(proxy) };
    }

    const res = await axios.post(`${this.dolphinApiBase}/v1.0/browser_profiles`, payload);
    return res.data;
  }

  private async startDolphinProfile(profileId: string) {
    this.logger.log(`启动 Dolphin Profile ${profileId} 并启用 CDP...`);

    const response = await axios.get(
      `${this.dolphinApiBase}/v1.0/browser_profiles/${profileId}/start?automation=1`
    );

    const { automation } = response.data;

    if (!automation?.port || !automation?.wsEndpoint) {
      throw new Error('Dolphin 未返回有效的 CDP 信息');
    }

    const wsEndpoint = this.buildWsEndpoint(automation.port, automation.wsEndpoint);

    return {
      port: automation.port,
      wsEndpoint,
      browser: await this.connectPuppeteer(wsEndpoint),
    };
  }

  private async createHubstudioProfile(name: string, proxy?: string): Promise<BrowserProfileResult> {
    this.logger.warn('⚠️ 创建 Hubstudio 环境 - 仅供本地学习');
    const groupCode = this.configService.get<string>('HUBSTUDIO_GROUP_CODE');
    if (!groupCode) {
      throw new Error('缺少环境变量: HUBSTUDIO_GROUP_CODE');
    }

    const response = await this.hubstudioClient.post('/api/v1/env/create', {
      groupCode,
      name,
      proxy: proxy ? this.parseProxy(proxy) : undefined,
    });
    const data = response.data?.data || response.data;
    const containerCode = data?.containerCode || data?.code || data?.id;

    if (!containerCode) {
      throw new Error('Hubstudio 未返回 containerCode');
    }

    return {
      id: containerCode,
      profileId: containerCode,
      containerCode,
      raw: response.data,
    };
  }

  private async startHubstudioProfile(profileId: string) {
    this.logger.log(`启动 Hubstudio 环境 ${profileId} 并启用自动化连接...`);
    const response = await this.hubstudioClient.post('/api/v1/browser/start', {
      containerCode: profileId,
    });
    const data = response.data?.data || response.data;
    const debuggingPort = data?.debuggingPort || data?.debugPort || data?.port;
    const wsEndpoint = data?.wsEndpoint || data?.webSocketDebuggerUrl || data?.browserWSEndpoint;

    if (wsEndpoint) {
      return {
        port: debuggingPort,
        wsEndpoint,
        browser: await this.connectPuppeteer(wsEndpoint),
      };
    }

    if (!debuggingPort) {
      throw new Error('Hubstudio 未返回 debuggingPort/wsEndpoint');
    }

    const browser = await this.connectPuppeteerByPort(debuggingPort);
    return {
      port: debuggingPort,
      wsEndpoint: `http://${this.getCdpHost()}:${debuggingPort}`,
      browser,
    };
  }

  private async createBitbrowserProfile(name: string, proxy?: string): Promise<BrowserProfileResult> {
    this.logger.warn('⚠️ 创建 BitBrowser 环境 - 仅供本地学习');
    const payload: any = {
      id: '',
      name,
      browserFingerPrint: {
        coreVersion: '124',
        ostype: 'Windows',
      },
    };

    if (proxy) {
      const parsedProxy = this.parseProxy(proxy);
      payload.proxyMethod = 2;
      payload.proxyType = 'http';
      payload.host = parsedProxy.host;
      payload.port = parsedProxy.port;
      payload.proxyUserName = parsedProxy.login || parsedProxy.username;
      payload.proxyPassword = parsedProxy.password;
    }

    const response = await this.bitbrowserClient.post('/browser/update', payload);
    const data = response.data?.data || response.data;
    const id = data?.id || data;

    if (!id || response.data?.success === false) {
      throw new Error(response.data?.msg || 'BitBrowser 未返回环境 id');
    }

    return {
      id,
      profileId: id,
      raw: response.data,
    };
  }

  private async startBitbrowserProfile(profileId: string) {
    this.logger.log(`启动 BitBrowser 环境 ${profileId} 并启用自动化连接...`);
    const response = await this.bitbrowserClient.post('/browser/open', {
      id: profileId,
    });

    if (response.data?.success === false) {
      throw new Error(response.data?.msg || 'BitBrowser 启动环境失败');
    }

    const data = response.data?.data || response.data;
    const wsEndpoint = data?.ws || data?.wsEndpoint || data?.webSocketDebuggerUrl;
    const httpAddress = data?.http || data?.httpAddress;
    const debuggingPort = data?.debuggingPort || data?.port || this.extractPort(httpAddress || wsEndpoint);

    if (wsEndpoint) {
      const normalizedWsEndpoint = this.normalizeDebugAddress(wsEndpoint);
      return {
        port: debuggingPort,
        wsEndpoint: normalizedWsEndpoint,
        browser: await this.connectPuppeteer(normalizedWsEndpoint),
      };
    }

    if (!debuggingPort) {
      throw new Error('BitBrowser 未返回 ws/http 调试地址');
    }

    const browser = await this.connectPuppeteerByPort(debuggingPort);
    return {
      port: debuggingPort,
      wsEndpoint: `http://${this.getCdpHost()}:${debuggingPort}`,
      browser,
    };
  }

  private async checkDolphinHealth() {
    const startedAt = Date.now();
    const response = await axios.get(this.dolphinApiBase, {
      timeout: 3500,
      validateStatus: () => true,
    });

    return {
      provider: 'dolphin',
      apiBase: this.dolphinApiBase,
      httpStatus: response.status,
      latencyMs: Date.now() - startedAt,
    };
  }

  private async checkHubstudioHealth() {
    const startedAt = Date.now();
    const response = await this.hubstudioClient.get('/api/v1/browser/status', {
      validateStatus: () => true,
    });

    return {
      provider: 'hubstudio',
      apiBase: this.hubstudioApiBase,
      httpStatus: response.status,
      latencyMs: Date.now() - startedAt,
    };
  }

  private async checkBitbrowserHealth() {
    const startedAt = Date.now();
    const response = await this.bitbrowserClient.post('/browser/list', {
      page: 0,
      pageSize: 1,
    }, {
      validateStatus: () => true,
    });

    return {
      provider: 'bitbrowser',
      apiBase: this.bitbrowserApiBase,
      httpStatus: response.status,
      latencyMs: Date.now() - startedAt,
    };
  }

  private getHubstudioHeaders() {
    const appId = this.configService.get<string>('HUBSTUDIO_APP_ID');
    const appSecret = this.configService.get<string>('HUBSTUDIO_APP_SECRET');
    return {
      ...(appId ? { appId, app_id: appId } : {}),
      ...(appSecret ? { appSecret, app_secret: appSecret } : {}),
    };
  }

  private buildWsEndpoint(port: string | number, wsEndpoint: string) {
    if (wsEndpoint.startsWith('ws://') || wsEndpoint.startsWith('wss://')) {
      return wsEndpoint.replace('127.0.0.1', this.getCdpHost()).replace('localhost', this.getCdpHost());
    }

    return `ws://${this.getCdpHost()}:${port}${wsEndpoint}`;
  }

  private normalizeDebugAddress(address: string) {
    return address.replace('127.0.0.1', this.getCdpHost()).replace('localhost', this.getCdpHost());
  }

  private extractPort(address?: string) {
    if (!address) return undefined;
    const match = address.match(/:(\d+)(?:\/|$)/);
    return match?.[1] ? Number(match[1]) : undefined;
  }

  private async connectPuppeteer(wsEndpoint: string): Promise<Browser> {
    return puppeteer.connect({
      browserWSEndpoint: wsEndpoint,
      defaultViewport: null,
    });
  }

  private async connectPuppeteerByPort(port: string | number): Promise<Browser> {
    const response = await axios.get(`http://${this.getCdpHost()}:${port}/json/version`, {
      timeout: 5000,
    });
    const wsEndpoint = response.data?.webSocketDebuggerUrl;
    if (!wsEndpoint) {
      throw new Error('未能从 CDP /json/version 获取 webSocketDebuggerUrl');
    }

    return this.connectPuppeteer(wsEndpoint);
  }

  private getCdpHost() {
    return this.configService.get<string>('BROWSER_CDP_HOST') || 'host.docker.internal';
  }

  private parseProxy(proxyStr: string) {
    try {
      const url = new URL(proxyStr);
      return {
        host: url.hostname,
        port: parseInt(url.port, 10),
        login: url.username || undefined,
        password: url.password || undefined,
        username: url.username || undefined,
      };
    } catch {
      return { host: proxyStr };
    }
  }
}
