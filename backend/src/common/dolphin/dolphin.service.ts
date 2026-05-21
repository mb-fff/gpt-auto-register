import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class DolphinService {
  private readonly logger = new Logger(DolphinService.name);
  private readonly apiBase: string;

  constructor(private config: ConfigService) {
    this.apiBase = this.config.get<string>('DOLPHIN_API_BASE') || 'http://host.docker.internal:3001';
  }

  async createProfile(name: string, proxy?: string) {
    this.logger.warn('⚠️ 创建 Dolphin Anty Profile - 仅供本地学习使用');
    const res = await axios.post(`${this.apiBase}/v1.0/browser_profiles`, {
      name,
      os: 'windows',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      proxy: proxy ? { mode: 'http', ...this.parseProxy(proxy) } : undefined,
    });
    return res.data;
  }

  async startProfile(profileId: string) {
    return axios.get(`${this.apiBase}/v1.0/browser_profiles/${profileId}/start?automation=true`);
  }

  private parseProxy(proxy: string) {
    // 支持 http://user:pass@ip:port 格式
    return {};
  }
}
