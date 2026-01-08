import { UpsertIvrDto } from './dto/upsert-ivr.dto';
import { IvrService } from './ivr.service';
export declare class IvrController {
    private readonly svc;
    constructor(svc: IvrService);
    list(): {
        etag: string;
        menus: import("./ivr.types").IvrMenu[];
    };
    upsert(dto: UpsertIvrDto): {
        ok: boolean;
        etag: string;
    };
    delete(name: string, etag?: string): {
        ok: boolean;
        etag: string;
    };
}
