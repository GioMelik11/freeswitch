import { EslService } from '../../freeswitch/esl/esl.service';
import { RunConsoleCommandDto } from './dto/run-console-command.dto';
import { ConsoleService } from './console.service';
export declare class ConsoleController {
    private readonly esl;
    private readonly consoleSvc;
    constructor(esl: EslService, consoleSvc: ConsoleService);
    run(dto: RunConsoleCommandDto): Promise<{
        ok: boolean;
        output: string;
    }>;
    tail(since?: string, limit?: string): {
        now: number;
        items: import("./console.service").ConsoleLine[];
    };
}
