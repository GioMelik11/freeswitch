import { UpsertExtensionDto } from './dto/upsert-extension.dto';
import { ExtensionsService } from './extensions.service';
export declare class ExtensionsController {
    private readonly svc;
    constructor(svc: ExtensionsService);
    list(): import("./extensions.types").Extension[];
    get(id: string): import("./extensions.types").Extension;
    upsert(dto: UpsertExtensionDto): {
        ok: boolean;
        etag: string;
    };
    delete(id: string, etag?: string): {
        ok: boolean;
    };
}
