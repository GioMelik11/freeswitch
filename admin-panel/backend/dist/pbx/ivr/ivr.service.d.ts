import { FilesService } from '../../files/files.service';
import { IvrMenu } from './ivr.types';
export declare class IvrService {
    private readonly files;
    constructor(files: FilesService);
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
    private mapMenu;
    private buildMenuNode;
    private renderIvrConf;
    private renderMenu;
}
