import { ConfigService } from '@nestjs/config';
type EslResponse = {
    headers: Record<string, string>;
    body: string;
};
export declare class EslService {
    private readonly host;
    private readonly port;
    private readonly password;
    private readonly timeoutMs;
    constructor(config: ConfigService);
    api(command: string): Promise<EslResponse>;
    private readFrame;
}
export {};
