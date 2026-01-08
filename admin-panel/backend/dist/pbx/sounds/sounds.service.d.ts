import { ConfigService } from '@nestjs/config';
export type SoundItem = {
    category: 'music' | 'ivr' | 'other';
    file: string;
    relPath: string;
    fsPath: string;
    playPath: string;
};
export declare class SoundsService {
    private readonly baseDir;
    private readonly fsSoundDir;
    constructor(config: ConfigService);
    getIndex(): {
        all: SoundItem[];
        music: SoundItem[];
        ivr: SoundItem[];
    };
    list(category: 'music' | 'ivr'): SoundItem[];
    private listAll;
    ensureCategoryDir(category: 'music' | 'ivr'): string;
    ensureDir(relDir: string): string;
    sanitizeFilename(name: string): string;
    toRelPath(absPath: string): string;
}
