import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type SoundItem = {
  category: 'music' | 'ivr' | 'other';
  file: string; // filename only
  relPath: string; // e.g. music/foo.wav
  fsPath: string; // e.g. /usr/share/freeswitch/sounds/music/foo.wav
  playPath: string; // e.g. music/foo.wav (what we store in IVR configs)
};

@Injectable()
export class SoundsService {
  private readonly baseDir: string;
  private readonly fsSoundDir: string;

  constructor(config: ConfigService) {
    const configuredFsSounds =
      config.get<string>('FS_SOUND_DIR') ??
      config.get<string>('FS_SOUNDS_DIR') ??
      undefined;
    const configuredRepoSounds = config.get<string>('SOUNDS_DIR') ?? undefined;

    // Prefer scanning the actual FreeSWITCH sounds dir (inside container) when available.
    const preferFs = configuredFsSounds ?? '/usr/share/freeswitch/sounds';
    const preferRepo =
      configuredRepoSounds ??
      path.resolve(process.cwd(), '../../freeswitch-sounds');

    this.fsSoundDir = configuredFsSounds ?? '/usr/share/freeswitch/sounds';
    this.baseDir = fs.existsSync(preferFs) ? preferFs : preferRepo;
  }

  getIndex() {
    const all = this.listAll();
    return {
      all,
      music: all.filter((x) => x.category === 'music'),
      ivr: all.filter((x) => x.category === 'ivr'),
    };
  }

  list(category: 'music' | 'ivr'): SoundItem[] {
    return this.getIndex()[category];
  }

  private listAll(): SoundItem[] {
    const root = this.baseDir;
    if (!fs.existsSync(root)) return [];

    const out: SoundItem[] = [];
    const walk = (d: string) => {
      for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
        if (ent.name.startsWith('.')) continue;
        const abs = path.join(d, ent.name);
        if (ent.isDirectory()) {
          walk(abs);
          continue;
        }
        if (!ent.isFile()) continue;

        const lower = ent.name.toLowerCase();
        if (!lower.endsWith('.wav') && !lower.endsWith('.mp3')) continue;

        const rel = path.relative(root, abs).replace(/\\/g, '/');
        const top = rel.split('/')[0] ?? '';
        const category: SoundItem['category'] =
          top === 'music' ? 'music' : top === 'ivr' ? 'ivr' : 'other';

        out.push({
          category,
          file: ent.name,
          relPath: rel,
          fsPath: `${this.fsSoundDir.replace(/\/+$/, '')}/${rel}`,
          playPath: rel,
        });
      }
    };

    walk(root);
    return out.sort((a, b) => a.relPath.localeCompare(b.relPath));
  }

  ensureCategoryDir(category: 'music' | 'ivr') {
    const dir = path.join(this.baseDir, category);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  ensureDir(relDir: string) {
    const clean = String(relDir ?? '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');
    if (!clean) throw new BadRequestException('Invalid dir');
    if (clean.includes('..')) throw new BadRequestException('Invalid dir');
    if (!/^[a-zA-Z0-9_./-]+$/.test(clean))
      throw new BadRequestException('Invalid dir');

    const abs = path.resolve(this.baseDir, clean);
    const base = path.resolve(this.baseDir);
    if (!abs.startsWith(base + path.sep) && abs !== base)
      throw new BadRequestException('Invalid dir');

    fs.mkdirSync(abs, { recursive: true });
    return abs;
  }

  sanitizeFilename(name: string) {
    const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!base.toLowerCase().endsWith('.wav'))
      throw new BadRequestException('Only .wav files are allowed');
    return base;
  }

  toRelPath(absPath: string) {
    const base = path.resolve(this.baseDir);
    const abs = path.resolve(absPath);
    if (!abs.startsWith(base + path.sep) && abs !== base) {
      throw new BadRequestException('Path escapes sounds directory');
    }
    return path.relative(base, abs).replace(/\\/g, '/');
  }
}
