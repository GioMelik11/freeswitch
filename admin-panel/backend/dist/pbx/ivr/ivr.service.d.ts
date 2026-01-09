import { FilesService } from '../../files/files.service';
import { IvrMenu } from './ivr.types';
import { EslService } from '../../freeswitch/esl/esl.service';
export declare class IvrService {
    private readonly files;
    private readonly esl;
    constructor(files: FilesService, esl: EslService);
    private normalizeSoundPath;
    list(): {
        etag: string;
        menus: IvrMenu[];
    };
    upsert(input: any): {
        ok: boolean;
        etag: string;
    };
    delete(name: string, etag?: string): {
        ok: boolean;
        etag: string;
    };
    private reloadFsBestEffort;
    private mapMenu;
    private buildMenuNode;
    private renderIvrConf;
    private renderMenu;
}
