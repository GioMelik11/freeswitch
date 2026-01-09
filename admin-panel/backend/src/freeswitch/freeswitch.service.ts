import { BadRequestException, Injectable } from '@nestjs/common';
import { FilesService } from '../files/files.service';

const MODULES_CONF_PATH = 'autoload_configs/modules.conf.xml';

export type ModuleEntry = {
  module: string;
  enabled: boolean;
};

@Injectable()
export class FreeswitchService {
  constructor(private readonly files: FilesService) {}

  listModules(): { path: string; etag: string; modules: ModuleEntry[] } {
    const { content, etag, path } = this.files.readFile(MODULES_CONF_PATH);

    const modules = new Map<string, ModuleEntry>();
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const enabledMatch = line.match(
        /<\s*load\s+module\s*=\s*"([^"]+)"\s*\/\s*>/i,
      );
      if (enabledMatch) {
        const module = enabledMatch[1];
        modules.set(module, { module, enabled: true });
        continue;
      }

      const disabledMatch = line.match(
        /<!--\s*<\s*load\s+module\s*=\s*"([^"]+)"\s*\/\s*>\s*-->/i,
      );
      if (disabledMatch) {
        const module = disabledMatch[1];
        if (!modules.has(module))
          modules.set(module, { module, enabled: false });
      }
    }

    return {
      path,
      etag,
      modules: [...modules.values()].sort((a, b) =>
        a.module.localeCompare(b.module),
      ),
    };
  }

  setModule(params: { module: string; enabled: boolean; etag?: string }) {
    const { module, enabled, etag } = params;
    if (!/^mod_[a-z0-9_]+$/i.test(module))
      throw new BadRequestException('Invalid module name');

    const read = this.files.readFile(MODULES_CONF_PATH);
    const current = read.content;

    const enableRe = new RegExp(
      String.raw`(^[ \t]*)<!--\s*(<\s*load\s+module\s*=\s*"${module}"\s*\/\s*>\s*)-->`,
      'gim',
    );
    const disableRe = new RegExp(
      String.raw`(^[ \t]*)(<\s*load\s+module\s*=\s*"${module}"\s*\/\s*>)`,
      'gim',
    );

    let updated = current;
    if (enabled) {
      // uncomment if present
      updated = updated.replace(enableRe, '$1$2');
      // if neither enabled nor disabled existed, append under <modules>
      if (
        !updated.match(
          new RegExp(
            String.raw`<\s*load\s+module\s*=\s*"${module}"\s*\/\s*>`,
            'i',
          ),
        )
      ) {
        updated = this.appendModule(updated, module);
      }
    } else {
      // comment out enabled line(s)
      updated = updated.replace(disableRe, '$1<!-- $2 -->');
      // if module only exists as commented, leave as-is
    }

    return this.files.writeFile({
      path: MODULES_CONF_PATH,
      content: updated,
      etag: etag ?? read.etag,
    });
  }

  private appendModule(content: string, module: string) {
    const lines = content.split(/\r?\n/);
    const out: string[] = [];
    let inserted = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      out.push(line);
      if (!inserted && line.match(/<\s*modules\s*>/i)) {
        out.push(`    <load module="${module}"/>`);
        inserted = true;
      }
    }

    return inserted
      ? out.join('\n')
      : content + `\n<load module="${module}"/>\n`;
  }
}
