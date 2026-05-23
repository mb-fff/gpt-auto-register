import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrowserProfileService } from './browser-profile.service';

@Injectable()
export class DolphinService extends BrowserProfileService {
  constructor(configService: ConfigService) {
    super(configService);
  }
}
