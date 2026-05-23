import { Module } from '@nestjs/common';
import { BrowserProfileService } from './browser-profile.service';
import { DolphinService } from './dolphin.service';

@Module({
  providers: [BrowserProfileService, DolphinService],
  exports: [BrowserProfileService, DolphinService],
})
export class DolphinModule {}
