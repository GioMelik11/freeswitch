import { OnModuleInit } from '@nestjs/common';
import { DialplanService } from './dialplan/dialplan.service';
import { ExtensionsService } from './extensions/extensions.service';
import { PbxMetaService } from './meta/pbx-meta.service';
import { EslService } from '../freeswitch/esl/esl.service';
export declare class PbxBootstrapService implements OnModuleInit {
    private readonly dialplan;
    private readonly extensions;
    private readonly meta;
    private readonly esl;
    constructor(dialplan: DialplanService, extensions: ExtensionsService, meta: PbxMetaService, esl: EslService);
    onModuleInit(): Promise<void>;
    private reloadFsBestEffort;
}
