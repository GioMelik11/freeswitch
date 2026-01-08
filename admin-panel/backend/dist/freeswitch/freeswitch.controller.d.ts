import { SetModuleDto } from './dto/set-module.dto';
import { FreeswitchService } from './freeswitch.service';
export declare class FreeswitchController {
    private readonly fs;
    constructor(fs: FreeswitchService);
    listModules(): {
        path: string;
        etag: string;
        modules: import("./freeswitch.service").ModuleEntry[];
    };
    setModule(dto: SetModuleDto): {
        ok: boolean;
        etag: string;
    };
}
