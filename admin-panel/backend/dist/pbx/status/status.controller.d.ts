import { EslService } from '../../freeswitch/esl/esl.service';
export declare class StatusController {
    private readonly esl;
    constructor(esl: EslService);
    gateways(): Promise<Record<string, {
        status: string;
        raw: string;
    }>>;
    gateway(name: string): Promise<{
        name: string;
        raw: string;
    }>;
    extensions(): Promise<Record<string, {
        contact?: string;
        expires?: string;
        raw: string;
    }>>;
}
