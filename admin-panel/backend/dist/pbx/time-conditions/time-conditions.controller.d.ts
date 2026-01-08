import { UpsertTimeConditionDto } from './dto/upsert-time-condition.dto';
import { TimeConditionsService } from './time-conditions.service';
export declare class TimeConditionsController {
    private readonly svc;
    constructor(svc: TimeConditionsService);
    list(): {
        etag: string;
        items: import("./time-conditions.types").TimeCondition[];
    };
    upsert(dto: UpsertTimeConditionDto): {
        ok: boolean;
        etag: string;
    };
    delete(name: string, etag: string): {
        ok: boolean;
        etag: string;
    };
}
