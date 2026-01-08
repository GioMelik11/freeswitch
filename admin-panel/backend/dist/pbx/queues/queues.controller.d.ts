import { UpsertQueueDto } from './dto/upsert-queue.dto';
import { QueuesService } from './queues.service';
export declare class QueuesController {
    private readonly svc;
    constructor(svc: QueuesService);
    getConfig(): {
        etag: string;
        queues: import("./queues.types").CallcenterQueue[];
        agents: import("./queues.types").CallcenterAgent[];
        tiers: import("./queues.types").CallcenterTier[];
    };
    upsert(dto: UpsertQueueDto): {
        ok: boolean;
        etag: string;
    };
    delete(name: string, domain?: string, etag?: string): {
        ok: boolean;
        etag: string;
    };
}
