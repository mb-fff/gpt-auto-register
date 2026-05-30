import { Module } from '@nestjs/common';
import { SmsController } from './sms.controller';

@Module({
  controllers: [SmsController],
})
export class SmsModule {}
