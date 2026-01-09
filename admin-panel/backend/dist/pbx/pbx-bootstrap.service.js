"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PbxBootstrapService = void 0;
const common_1 = require("@nestjs/common");
const dialplan_service_1 = require("./dialplan/dialplan.service");
const extensions_service_1 = require("./extensions/extensions.service");
const pbx_meta_service_1 = require("./meta/pbx-meta.service");
const esl_service_1 = require("../freeswitch/esl/esl.service");
let PbxBootstrapService = class PbxBootstrapService {
    dialplan;
    extensions;
    meta;
    esl;
    constructor(dialplan, extensions, meta, esl) {
        this.dialplan = dialplan;
        this.extensions = extensions;
        this.meta = meta;
        this.esl = esl;
    }
    async onModuleInit() {
        try {
            const { meta } = this.meta.get();
            this.dialplan.ensurePublicIncludesDir();
            this.dialplan.ensureDefaultIncludesDirEarly();
            this.dialplan.writeTrunkInbound(meta);
            this.dialplan.writeOutboundDefaults(meta);
            this.dialplan.writeOutboundPrefixRoutes(meta);
            this.dialplan.writeOutboundDefaultTrunkRoutes(meta);
            this.dialplan.writeQueues(meta);
            const list = this.extensions.list();
            const services = new Map();
            for (const s of meta.aiServices ?? []) {
                if (s?.enabled === false)
                    continue;
                if (!s?.id || !s?.socketUrl)
                    continue;
                services.set(String(s.id), String(s.socketUrl));
            }
            const defaultUrl = (meta.defaultAiServiceId
                ? (services.get(String(meta.defaultAiServiceId)) ?? '')
                : '') || (services.size ? [...services.values()][0] : '');
            this.dialplan.writeExtensionsSpecial(list, { services, defaultUrl });
            await this.reloadFsBestEffort();
        }
        catch {
        }
    }
    async reloadFsBestEffort() {
        const cmds = [
            'reloadxml',
            'sofia profile internal rescan reloadxml',
            'sofia profile external rescan reloadxml',
        ];
        for (const c of cmds) {
            try {
                await this.esl.api(c);
            }
            catch {
            }
        }
    }
};
exports.PbxBootstrapService = PbxBootstrapService;
exports.PbxBootstrapService = PbxBootstrapService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [dialplan_service_1.DialplanService,
        extensions_service_1.ExtensionsService,
        pbx_meta_service_1.PbxMetaService,
        esl_service_1.EslService])
], PbxBootstrapService);
//# sourceMappingURL=pbx-bootstrap.service.js.map