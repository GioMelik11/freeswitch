import { Controller, Get, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SoundsService } from './sounds.service';
import * as fs from 'node:fs';
import * as path from 'node:path';

@UseGuards(JwtAuthGuard)
@Controller('pbx/sounds')
export class SoundsController {
  constructor(private readonly sounds: SoundsService) {}

  @Get('index')
  index() {
    return this.sounds.getIndex();
  }

  @Get('list')
  list(@Query('category') category: 'music' | 'ivr') {
    return this.sounds.list(category);
  }

  @Post('mkdir')
  mkdir(@Query('dir') dir: string) {
    this.sounds.ensureDir(dir);
    return { ok: true };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('category') category: 'music' | 'ivr',
    @Query('dir') dir?: string,
  ) {
    if (!file) return { ok: false, message: 'No file' };
    const filename = this.sounds.sanitizeFilename(file.originalname);

    const targetDir = dir ? this.sounds.ensureDir(dir) : this.sounds.ensureCategoryDir(category);
    const dst = path.join(targetDir, filename);
    fs.writeFileSync(dst, file.buffer);
    // Return updated item from full index (supports arbitrary dirs)
    const all = this.sounds.getIndex().all;
    const rel = this.sounds.toRelPath(dst);
    const item = all.find((x) => x.relPath === rel) ?? all.find((x) => x.file === filename);
    return { ok: true, item };
  }
}


