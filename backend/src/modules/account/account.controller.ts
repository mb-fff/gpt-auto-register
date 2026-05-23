import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common';
import { AccountService } from './account.service';

@Controller('accounts')
export class AccountController {
  constructor(private accountService: AccountService) {}

  @Post()
  create(@Body() body: { email: string; proxy?: string }) {
    return this.accountService.createAccount(body.email, body.proxy);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    if (!page && !pageSize && !search) {
      return this.accountService.findAllLegacy();
    }

    return this.accountService.findAll({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 10,
      search,
    });
  }

  @Delete('batch')
  removeMany(@Body() body: { ids: string[] }) {
    return this.accountService.deleteMany(body.ids || []);
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
