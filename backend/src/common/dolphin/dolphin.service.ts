import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class DolphinService {
  private readonly logger = new Logger(DolphinService.name);
  private readonly apiBase: string;

  constructor(private configService: ConfigService) {
    this.apiBase = this.configService.get<string>('DOLPHIN_API_BASE') || 'http://host.docker.internal:3001';
  }

  /** 创建新的指纹浏览器 Profile */
  async createProfile(name: string, proxy?: string) {
    this.logger.warn('⚠️【警告】正在创建 Dolphin Anty Profile，仅供本地学习研究使用！');

    try {
      const payload: any = {
        name,
        os: 'windows',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        fingerprint: { autoGenerate: true },
      };

      if (proxy) {
        payload.proxy = { mode: 'http', ...this.parseProxy(proxy) };
      }

      const response = await axios.post(`${this.apiBase}/v1.0/browser_profiles`, payload);
      return response.data;
    } catch (error: any) {
      this.logger.error('创建 Profile 失败', error.response?.data || error.message);
      throw error;
    }
  }

  /** 启动 Profile 并返回自动化信息 */
  async startProfile(profileId: string) {
    return axios.get(`${this.apiBase}/v1.0/browser_profiles/${profileId}/start?automation=true`);
  }

  async stopProfile(profileId: string) {
    return axios.get(`${this.apiBase}/v1.0/browser_profiles/${profileId}/stop`);
  }

  private parseProxy(proxyStr: string) {
    // 支持格式: http://user:pass@ip:port
    if (!proxyStr) return {};
    try {
      const url = new URL(proxyStr);
      return {
        host: url.hostname,
        port: parseInt(url.port),
        login: url.username,
        password: url.password,
      };
    } catch {
      return { host: proxyStr };
    }
  }
}
