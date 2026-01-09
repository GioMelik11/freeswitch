import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export type ConsoleLine = {
    ts: number;
    text: string;
};
export declare class ConsoleService implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private readonly host;
    private readonly port;
    private readonly password;
    private stop;
    private socket;
    private lines;
    private maxLines;
    constructor(config: ConfigService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    tail(sinceTs: number, limit: number): {
        now: number;
        items: ConsoleLine[];
    };
    private push;
    private runLoop;
    private connectAndStream;
    private readFrame;
}
