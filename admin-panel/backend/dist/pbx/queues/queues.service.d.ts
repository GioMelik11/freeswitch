import { FilesService } from '../../files/files.service';
import { CallcenterAgent, CallcenterQueue, CallcenterTier } from './queues.types';
import { PbxMetaService } from '../meta/pbx-meta.service';
import { DialplanService } from '../dialplan/dialplan.service';
export declare class QueuesService {
    private readonly files;
    private readonly meta;
    private readonly dialplan;
    constructor(files: FilesService, meta: PbxMetaService, dialplan: DialplanService);
    getConfig(): {
        etag: string;
        queues: CallcenterQueue[];
        agents: CallcenterAgent[];
        tiers: CallcenterTier[];
    };
    upsertQueue(input: {
        name: string;
        domain?: string;
        strategy?: string;
        mohSound?: string;
        maxWaitTime?: string;
        discardAbandonedAfter?: string;
        extensionNumber?: string;
        timeoutDestination?: any;
        agentExtensions?: string[];
        etag?: string;
    }): {
        ok: boolean;
        etag: string;
    };
    deleteQueue(name: string, domain?: string, etag?: string): {
        ok: boolean;
        etag: string;
    };
    private buildQueueNode;
    private renderCallcenter;
    private renderSettings;
    private renderQueue;
    private renderAgent;
    private renderTier;
}
