import { FilesService } from '../../files/files.service';
import { Extension } from './extensions.types';
import { DialplanService } from '../dialplan/dialplan.service';
import { PbxMetaService } from '../meta/pbx-meta.service';
export declare class ExtensionsService {
    private readonly files;
    private readonly dialplan;
    private readonly meta;
    constructor(files: FilesService, dialplan: DialplanService, meta: PbxMetaService);
    list(): Extension[];
    get(id: string): Extension;
    private getByPath;
    upsert(input: {
        id: string;
        password: string;
        userContext: string;
        callerIdName: string;
        callerIdNumber: string;
        callgroup?: string;
        outgoingSound?: string;
        outgoingIvr?: string;
        forwardMobile?: string;
        aiEnabled?: boolean;
        aiServiceId?: string;
        etag?: string;
    }): {
        ok: boolean;
        etag: string;
    };
    delete(id: string, etag?: string): {
        ok: boolean;
    };
    private render;
}
