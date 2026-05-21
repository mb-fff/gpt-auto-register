import { Module } from '@nestjs/common';
import { DolphinService } from './dolphin.service';

@Module({
  providers: [DolphinService],
  exports: [DolphinService],
})
export class DolphinModule {}
