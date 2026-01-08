import { FilesService } from '../../files/files.service';
import { TimeCondition } from './time-conditions.types';
export declare class TimeConditionsService {
    private readonly files;
    constructor(files: FilesService);
    list(): {
        etag: string;
        items: TimeCondition[];
    };
    upsert(input: TimeCondition & {
        etag: string;
    }): {
        ok: boolean;
        etag: string;
    };
    delete(name: string, etag: string): {
        ok: boolean;
        etag: string;
    };
    private buildExtension;
    private render;
    private renderExtension;
}
