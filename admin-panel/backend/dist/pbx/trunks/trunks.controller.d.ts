import { UpsertTrunkDto } from './dto/upsert-trunk.dto';
import { TrunksService } from './trunks.service';
export declare class TrunksController {
    private readonly svc;
    constructor(svc: TrunksService);
    list(): import("./trunks.types").Trunk[];
    get(name: string): import("./trunks.types").Trunk;
    upsert(dto: UpsertTrunkDto): {
        ok: boolean;
        etag: string;
    };
    makeDefault(name: string): {
        ok: true;
        defaultTrunkName: string;
    };
    delete(name: string, etag?: string): {
        ok: boolean;
    };
}
