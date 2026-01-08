import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FilesService } from './files.service';
import { WriteFileDto } from './dto/write-file.dto';

@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get('tree')
  tree() {
    return this.files.listRootTree();
  }

  @Get('read')
  read(@Query('path') path: string) {
    return this.files.readFile(path);
  }

  @Post('write')
  write(@Body() dto: WriteFileDto) {
    return this.files.writeFile(dto);
  }
}


