import { FilesService } from '../files/files.service';
export type ModuleEntry = {
    module: string;
    enabled: boolean;
};
export declare class FreeswitchService {
    private readonly files;
    constructor(files: FilesService);
    listModules(): {
        path: string;
        etag: string;
        modules: ModuleEntry[];
    };
    setModule(params: {
        module: string;
        enabled: boolean;
        etag?: string;
    }): {
        ok: boolean;
        etag: string;
    };
    private appendModule;
}
