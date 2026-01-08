import { FilesService } from '../../files/files.service';
import { Trunk } from './trunks.types';
import { PbxMetaService } from '../meta/pbx-meta.service';
import { DialplanService } from '../dialplan/dialplan.service';
export declare class TrunksService {
    private readonly files;
    private readonly meta;
    private readonly dialplan;
    constructor(files: FilesService, meta: PbxMetaService, dialplan: DialplanService);
    list(): Trunk[];
    get(name: string): Trunk;
    upsert(input: {
        name: string;
        register: boolean;
        username?: string;
        password?: string;
        realm?: string;
        proxy?: string;
        fromUser?: string;
        fromDomain?: string;
        extension?: string;
        transport?: string;
        inboundDestination?: any;
        outgoingDefault?: any;
        prefixRules?: any[];
        etag?: string;
    }): {
        ok: boolean;
        etag: string;
    };
    delete(name: string, etag?: string): {
        ok: boolean;
    };
    private getByPath;
    private tryGetByPath;
    private assertName;
    private render;
}
