import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UpsertExtensionDto } from './dto/upsert-extension.dto';
import { ExtensionsService } from './extensions.service';

@UseGuards(JwtAuthGuard)
@Controller('pbx/extensions')
export class ExtensionsController {
  constructor(private readonly svc: ExtensionsService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Post()
  upsert(@Body() dto: UpsertExtensionDto) {
    return this.svc.upsert(dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Query('etag') etag?: string) {
    return this.svc.delete(id, etag);
  }
}


