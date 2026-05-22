import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { AccountService } from './account.service';

@Controller('accounts')
export class AccountController {
  constructor(private accountService: AccountService) {}

  @Post()
  create(@Body() body: { email: string; proxy?: string }) {
    return this.accountService.createAccount(body.email, body.proxy);
  }

  @Get()
  findAll() {
    return this.accountService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.accountService.delete(id);
  }
}
