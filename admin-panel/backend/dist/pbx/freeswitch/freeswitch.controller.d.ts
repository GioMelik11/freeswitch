import { EslService } from '../../freeswitch/esl/esl.service';
export declare class FreeswitchController {
    private readonly esl;
    constructor(esl: EslService);
    reload(): Promise<{
        ok: boolean;
        results: {
            command: string;
            ok: boolean;
            body: string;
        }[];
    }>;
}
