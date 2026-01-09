import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type TreeNode =
  | { type: 'file'; name: string; path: string }
  | { type: 'dir'; name: string; path: string; children: TreeNode[] };

type ResolvedPath = { normalized: string; resolved: string };

@Injectable()
export class FilesService {
  private readonly baseDir: string;
  private readonly backupsDir: string;

  constructor(config: ConfigService) {
    this.baseDir = path.resolve(
      process.cwd(),
      config.get<string>('FS_CONF_DIR') ?? '../../freeswitch',
    );
    this.backupsDir = path.resolve(
      process.cwd(),
      config.get<string>('BACKUPS_DIR') ?? 'data/backups',
    );
    fs.mkdirSync(this.backupsDir, { recursive: true });
  }

  private isAllowedTextFile(p: string) {
    const ext = path.extname(p).toLowerCase();
    return ['.xml', '.conf', '.lua', '.tpl', '.ttml', '.txt', '.md'].includes(
      ext,
    );
  }

  private resolveSafe(relPath: string): ResolvedPath {
    if (!relPath || typeof relPath !== 'string')
      throw new BadRequestException('Invalid path');
    if (path.isAbsolute(relPath))
      throw new BadRequestException('Absolute paths are not allowed');
    const normalized = relPath.replace(/\\/g, '/');
    const resolved = path.resolve(this.baseDir, normalized);
    if (
      !resolved.startsWith(this.baseDir + path.sep) &&
      resolved !== this.baseDir
    ) {
      throw new BadRequestException('Path escapes base directory');
    }
    return { normalized, resolved };
  }

  listFiles(relDir: string, opts?: { regex?: RegExp; extensions?: string[] }) {
    const { resolved } = this.resolveSafe(relDir);
    if (!fs.existsSync(resolved)) return [];
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) throw new BadRequestException('Not a directory');

    const regex = opts?.regex;
    const exts = opts?.extensions?.map((e: string) => e.toLowerCase());

    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name: string) => !name.startsWith('.'))
      .filter((name: string) => (regex ? regex.test(name) : true))
      .filter((name: string) =>
        exts ? exts.includes(path.extname(name).toLowerCase()) : true,
      )
      .map((name: string) => ({
        name,
        path: path.posix.join(relDir.replace(/\\/g, '/'), name),
      }));
  }

  private sha256(content: string) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  listRootTree(): TreeNode[] {
    const roots = [
      'autoload_configs',
      'dialplan',
      'directory',
      'ivr_menus',
      'sip_profiles',
      'scripts',
      'vars.xml',
      'freeswitch.xml',
    ];

    const nodes: TreeNode[] = [];
    for (const rel of roots) {
      const { resolved } = this.resolveSafe(rel);
      if (!fs.existsSync(resolved)) continue;
      const stat = fs.statSync(resolved);
      if (stat.isDirectory()) nodes.push(this.walkDir(rel));
      else
        nodes.push({
          type: 'file',
          name: path.basename(rel),
          path: rel.replace(/\\/g, '/'),
        });
    }
    return nodes;
  }

  private walkDir(relDir: string): TreeNode {
    const { resolved } = this.resolveSafe(relDir);
    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    const children: TreeNode[] = [];

    for (const ent of entries) {
      const name = ent.name;
      if (name.startsWith('.')) continue;

      const childRel = path.posix.join(relDir.replace(/\\/g, '/'), name);
      const { resolved: childAbs } = this.resolveSafe(childRel);

      if (ent.isDirectory()) {
        children.push(this.walkDir(childRel));
        continue;
      }

      if (!ent.isFile()) continue;
      if (!this.isAllowedTextFile(childAbs)) continue;
      children.push({ type: 'file', name, path: childRel });
    }

    children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return {
      type: 'dir',
      name: path.basename(relDir),
      path: relDir.replace(/\\/g, '/'),
      children,
    };
  }

  readFile(relPath: string) {
    const { resolved } = this.resolveSafe(relPath);
    if (!fs.existsSync(resolved))
      throw new BadRequestException('File not found');
    const stat = fs.statSync(resolved);
    if (!stat.isFile()) throw new BadRequestException('Not a file');
    if (!this.isAllowedTextFile(resolved))
      throw new BadRequestException('File type not allowed');
    const content = fs.readFileSync(resolved, 'utf8');
    return {
      path: relPath.replace(/\\/g, '/'),
      content,
      etag: this.sha256(content),
      mtimeMs: stat.mtimeMs,
    };
  }

  writeFile(params: { path: string; content: string; etag?: string }) {
    const { path: relPath, content, etag } = params;
    const { resolved } = this.resolveSafe(relPath);
    if (!this.isAllowedTextFile(resolved))
      throw new BadRequestException('File type not allowed');

    const exists = fs.existsSync(resolved);
    if (exists) {
      const current = fs.readFileSync(resolved, 'utf8');
      const currentEtag = this.sha256(current);
      if (etag && etag !== currentEtag) {
        throw new ConflictException(
          'File changed since last read (etag mismatch)',
        );
      }
      this.backupFile(relPath, current);
    } else {
      const dir = path.dirname(resolved);
      fs.mkdirSync(dir, { recursive: true });
    }

    const tmp = resolved + '.tmp';
    fs.writeFileSync(tmp, content, 'utf8');
    fs.renameSync(tmp, resolved);

    return { ok: true, etag: this.sha256(content) };
  }

  deleteFile(relPath: string, etag?: string) {
    const { resolved } = this.resolveSafe(relPath);
    if (!fs.existsSync(resolved))
      throw new BadRequestException('File not found');
    const stat = fs.statSync(resolved);
    if (!stat.isFile()) throw new BadRequestException('Not a file');
    if (!this.isAllowedTextFile(resolved))
      throw new BadRequestException('File type not allowed');

    const current = fs.readFileSync(resolved, 'utf8');
    const currentEtag = this.sha256(current);
    if (etag && etag !== currentEtag) {
      throw new ConflictException(
        'File changed since last read (etag mismatch)',
      );
    }

    this.backupFile(relPath, current);
    fs.unlinkSync(resolved);
    return { ok: true };
  }

  private backupFile(relPath: string, content: string) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeRel = relPath.replace(/\\/g, '/');
    const out = path.resolve(this.backupsDir, stamp, safeRel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, content, 'utf8');
  }
}
