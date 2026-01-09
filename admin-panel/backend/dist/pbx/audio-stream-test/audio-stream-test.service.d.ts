import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class AudioStreamTestService implements OnModuleInit {
    private readonly config;
    private wss;
    private loggedIn;
    constructor(config: ConfigService);
    onModuleInit(): void;
    private extractWavPcm16Mono;
    private resamplePcm16;
}
