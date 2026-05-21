import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { DolphinProfile } from '../../types';

@Injectable()
export class DolphinService {
  private readonly logger = new Logger(DolphinService.name);
  private readonly apiBase = process.env.DOLPHIN_API_BASE || 'http://localhost:3001';

  async createProfile(email: string, proxy?: string): Promise<DolphinProfile> {
    this.logger.warn('Dolphin profile creation is running in local stub mode');

    return {
      id: `local-${Date.now()}`,
      name: email,
      status: proxy ? 'proxy-configured' : 'created',
    };
  }

  async healthCheck() {
    try {
      const response = await axios.get(this.apiBase, { timeout: 1000 });
      return { ok: true, status: response.status };
    } catch (error) {
      return { ok: false };
    }
  }
}
