import { SoundsService } from './sounds.service';
export declare class SoundsController {
    private readonly sounds;
    constructor(sounds: SoundsService);
    index(): {
        all: import("./sounds.service").SoundItem[];
        music: import("./sounds.service").SoundItem[];
        ivr: import("./sounds.service").SoundItem[];
    };
    list(category: 'music' | 'ivr'): import("./sounds.service").SoundItem[];
    mkdir(dir: string): {
        ok: boolean;
    };
    upload(file: Express.Multer.File, category: 'music' | 'ivr', dir?: string): {
        ok: boolean;
        message: string;
        item?: undefined;
    } | {
        ok: boolean;
        item: import("./sounds.service").SoundItem | undefined;
        message?: undefined;
    };
}
