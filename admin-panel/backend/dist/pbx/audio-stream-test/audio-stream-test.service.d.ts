import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class AudioStreamTestService implements OnModuleInit {
    private readonly config;
    private wss;
    constructor(config: ConfigService);
    onModuleInit(): void;
}
