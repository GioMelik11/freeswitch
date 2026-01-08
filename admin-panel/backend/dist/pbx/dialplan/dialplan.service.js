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
exports.DialplanService = void 0;
const common_1 = require("@nestjs/common");
const files_service_1 = require("../../files/files.service");
let DialplanService = class DialplanService {
    files;
    constructor(files) {
        this.files = files;
    }
    ensurePublicIncludesDir() {
        const rel = 'dialplan/public.xml';
        const read = this.files.readFile(rel);
        if (read.content.includes('X-PRE-PROCESS cmd="include" data="public/*.xml"'))
            return;
        const marker = '<context name="public">';
        const idx = read.content.indexOf(marker);
        if (idx === -1)
            return;
        const insertAt = idx + marker.length;
        const patched = read.content.slice(0, insertAt) +
            '\n\n    <!-- Admin Panel generated inbound routes (must come before catch-alls) -->\n' +
            '    <X-PRE-PROCESS cmd="include" data="public/*.xml"/>\n' +
            read.content.slice(insertAt);
        this.files.writeFile({ path: rel, content: patched, etag: read.etag });
    }
    ensureDefaultIncludesDirEarly() {
        const rel = 'dialplan/default.xml';
        const read = this.files.readFile(rel);
        if (read.content.includes('Admin Panel includes (time conditions, etc.)') &&
            read.content.includes('X-PRE-PROCESS cmd="include" data="default/*.xml"')) {
            const occurrences = (read.content.match(/X-PRE-PROCESS cmd="include" data="default\/\*\.xml"/g) || [])
                .length;
            if (occurrences >= 1 && read.content.indexOf('X-PRE-PROCESS cmd="include" data="default/*.xml"') < 800)
                return;
        }
        let content = read.content.replace(/\s*<!-- Admin Panel includes[\s\S]*?<X-PRE-PROCESS cmd="include" data="default\/\*\.xml"\/>\s*/m, '\n');
        const marker = '<!-- Global settings -->';
        const idx = content.indexOf(marker);
        if (idx === -1)
            return;
        const insertAt = idx;
        content =
            content.slice(0, insertAt) +
                '    <!-- Admin Panel includes (generated dialplan, time conditions, etc.) -->\n' +
                '    <X-PRE-PROCESS cmd="include" data="default/*.xml"/>\n\n' +
                content.slice(insertAt);
        this.files.writeFile({ path: rel, content, etag: read.etag });
    }
    writeTrunkInbound(meta) {
        const rel = 'dialplan/public/10_adminpanel_trunk_inbound.xml';
        const extXml = [];
        for (const [trunkName, t] of Object.entries(meta.trunks ?? {})) {
            if (!t?.inboundDestination)
                continue;
            const name = esc(trunkName);
            const dest = t.inboundDestination;
            extXml.push(`    <extension name="adminpanel_inbound_${name}">\n` +
                `      <condition field="${'$'}{sofia_gateway_name}" expression="^${name}$">\n` +
                `        <action application="set" data="effective_caller_id_number=${'$'}{caller_id_number}"/>\n` +
                `        <action application="set" data="effective_caller_id_name=${'$'}{caller_id_name}"/>\n` +
                renderDestination(dest) +
                `      </condition>\n` +
                `    </extension>`);
        }
        const body = `<include>\n` +
            `  <context name="public">\n` +
            (extXml.length ? `${extXml.join('\n\n')}\n` : '') +
            `  </context>\n` +
            `</include>\n`;
        this.files.writeFile({ path: rel, content: body });
    }
    writeOutboundDefaults(meta) {
        const rel = 'dialplan/default/05_adminpanel_outbound_defaults.xml';
        const t = meta.trunks?.['sip_trunk_provider']?.outgoingDefault;
        let sound = '';
        let ivr = '';
        if (t?.type === 'sound')
            sound = String(t.sound ?? '');
        if (t?.type === 'ivr')
            ivr = String(t.ivr ?? '');
        const actions = `        <action application="set" data="adminpanel_trunk_outgoing_sound=${esc(sound)}"/>\n` +
            `        <action application="set" data="adminpanel_trunk_outgoing_ivr=${esc(ivr)}"/>\n`;
        const body = `<include>\n` +
            `  <context name="default">\n` +
            `    <extension name="adminpanel_outbound_defaults" continue="true">\n` +
            `      <condition field="destination_number" expression="^9.*$">\n` +
            actions +
            `      </condition>\n` +
            `      <condition field="destination_number" expression="^(\\+?[1-9][0-9]{7,14})$">\n` +
            actions +
            `      </condition>\n` +
            `    </extension>\n` +
            `  </context>\n` +
            `</include>\n`;
        this.files.writeFile({ path: rel, content: body });
    }
    writeQueues(meta) {
        const rel = 'dialplan/default/20_adminpanel_queues.xml';
        const extXml = [];
        for (const [queueFullName, q] of Object.entries(meta.queues ?? {})) {
            if (!q?.extensionNumber || !/^\d+$/.test(q.extensionNumber))
                continue;
            const qname = esc(queueFullName);
            const dn = esc(q.extensionNumber);
            const dest = q.timeoutDestination;
            const postLuaArgs = dest ? `${escLuaArg(dest.type)} ${escLuaArg(dest.target ?? '')}` : '';
            extXml.push(`    <extension name="adminpanel_queue_${qname}">\n` +
                `      <condition field="destination_number" expression="^${dn}$">\n` +
                `        <action application="answer"/>\n` +
                `        <action application="callcenter" data="${qname}"/>\n` +
                `        <action application="lua" data="adminpanel_queue_post.lua ${postLuaArgs}"/>\n` +
                `      </condition>\n` +
                `    </extension>`);
        }
        const body = `<include>\n` +
            `  <context name="default">\n` +
            (extXml.length ? `${extXml.join('\n\n')}\n` : '') +
            `  </context>\n` +
            `</include>\n`;
        this.files.writeFile({ path: rel, content: body });
        this.ensureQueuePostLua();
    }
    ensureQueuePostLua() {
        const rel = 'scripts/adminpanel_queue_post.lua';
        try {
            this.files.readFile(rel);
            return;
        }
        catch {
        }
        const lua = `-- Generated helper for Admin Panel queue timeout routing\n` +
            `-- Args: <destType> <destTarget>\n` +
            `local destType = argv[1] or ''\n` +
            `local destTarget = argv[2] or ''\n` +
            `\n` +
            `if not session or not session:ready() then return end\n` +
            `\n` +
            `-- mod_callcenter typically sets cc_cause on exit. We only route when it indicates a failure/timeout.\n` +
            `local cc = session:getVariable('cc_cause') or ''\n` +
            `cc = string.upper(cc)\n` +
            `\n` +
            `local should_route = false\n` +
            `if cc == 'TIMEOUT' or cc == 'NO_AGENT_TIMEOUT' or cc == 'NO_AGENT' or cc == 'NO_AGENTS' or cc == 'ABANDONED' then\n` +
            `  should_route = true\n` +
            `end\n` +
            `\n` +
            `if not should_route then return end\n` +
            `\n` +
            `destType = string.lower(destType)\n` +
            `if destType == '' or destType == 'none' then return end\n` +
            `\n` +
            `if destType == 'terminate' then\n` +
            `  session:hangup('NORMAL_CLEARING')\n` +
            `  return\n` +
            `end\n` +
            `\n` +
            `if destType == 'extension' then\n` +
            `  session:execute('transfer', destTarget .. ' XML default')\n` +
            `  return\n` +
            `end\n` +
            `\n` +
            `if destType == 'queue' then\n` +
            `  session:execute('callcenter', destTarget)\n` +
            `  return\n` +
            `end\n` +
            `\n` +
            `if destType == 'ivr' then\n` +
            `  session:execute('ivr', destTarget)\n` +
            `  return\n` +
            `end\n` +
            `\n` +
            `if destType == 'timecondition' then\n` +
            `  session:execute('transfer', destTarget .. ' XML default')\n` +
            `  return\n` +
            `end\n` +
            `\n` +
            `-- Unknown destType: no-op\n`;
        this.files.writeFile({ path: rel, content: lua });
    }
    writeExtensionsSpecial(exts, ai) {
        const rel = 'dialplan/default/10_adminpanel_extensions.xml';
        const extXml = [];
        const aiScript = '/usr/local/freeswitch/etc/freeswitch/scripts/start_audio_stream.lua';
        for (const e of exts) {
            const id = String(e.id ?? '').trim();
            if (!/^\d+$/.test(id))
                continue;
            if (e.aiEnabled) {
                const sid = String(e.aiServiceId ?? '').trim();
                const url = sid ? ai?.services?.get(sid) ?? '' : ai?.defaultUrl ?? '';
                const setUrlLine = url ? `        <action application="set" data="audio_stream_url=${esc(url)}"/>\n` : '';
                extXml.push(`    <extension name="adminpanel_ai_${esc(id)}">\n` +
                    `      <condition field="destination_number" expression="^${esc(id)}$">\n` +
                    `        <action application="answer"/>\n` +
                    `        <action application="sleep" data="500"/>\n` +
                    `        <action application="set" data="STREAM_SUPPRESS_LOG=true"/>\n` +
                    setUrlLine +
                    `        <action application="lua" data="${aiScript} $${'{'}{audio_stream_url} mono 16k"/>\n` +
                    `        <action application="sleep" data="3600000"/>\n` +
                    `        <action application="hangup"/>\n` +
                    `      </condition>\n` +
                    `    </extension>`);
                continue;
            }
            const mobile = String(e.forwardMobile ?? '').trim();
            if (mobile) {
                extXml.push(`    <extension name="adminpanel_forward_${esc(id)}">\n` +
                    `      <condition field="destination_number" expression="^${esc(id)}$">\n` +
                    `        <action application="export" data="dialed_extension=${esc(id)}"/>\n` +
                    `        <action application="set" data="ringback=${'$'}{us-ring}"/>\n` +
                    `        <action application="set" data="call_timeout=30"/>\n` +
                    `        <action application="set" data="continue_on_fail=true"/>\n` +
                    `        <action application="set" data="hangup_after_bridge=true"/>\n` +
                    `        <action application="bridge" data="user/${'$'}{dialed_extension}@${'$'}{domain_name}|sofia/gateway/sip_trunk_provider/${esc(mobile)}"/>\n` +
                    `      </condition>\n` +
                    `    </extension>`);
            }
        }
        const body = `<include>\n` +
            `  <context name="default">\n` +
            (extXml.length ? `${extXml.join('\n\n')}\n` : '') +
            `  </context>\n` +
            `</include>\n`;
        this.files.writeFile({ path: rel, content: body });
    }
    writeOutboundPrefixRoutes(meta) {
        const rel = 'dialplan/default/01_adminpanel_outbound_routes.xml';
        const extNodes = [];
        for (const [trunkName, t] of Object.entries(meta.trunks ?? {})) {
            const rules = t?.prefixRules ?? [];
            const enabledRules = rules.filter((r) => r && r.prefix && r.enabled !== false);
            if (enabledRules.length === 0)
                continue;
            const trunkEsc = esc(trunkName);
            const sound = t?.outgoingDefault?.type === 'sound'
                ? String(t?.outgoingDefault?.sound ?? '')
                : '';
            const ivr = t?.outgoingDefault?.type === 'ivr'
                ? String(t?.outgoingDefault?.ivr ?? '')
                : '';
            const conditions = [];
            for (const r of enabledRules) {
                const prefix = String(r.prefix ?? '');
                if (!prefix)
                    continue;
                const prepend = String(r.prepend ?? '');
                const expr = `^${escapeRegex(prefix)}(.*)$`;
                const dialed = `${esc(prepend)}$1`;
                conditions.push(`      <condition field="destination_number" expression="${esc(expr)}">\n` +
                    `        <action application="set" data="adminpanel_trunk_outgoing_sound=${esc(sound)}"/>\n` +
                    `        <action application="set" data="adminpanel_trunk_outgoing_ivr=${esc(ivr)}"/>\n` +
                    `        <action application="set" data="effective_caller_id_number=${'$'}{caller_id_number}"/>\n` +
                    `        <action application="set" data="effective_caller_id_name=${'$'}{caller_id_name}"/>\n` +
                    `        <action application="set" data="ringback=${'$'}{adminpanel_outgoing_sound:-${'$'}{adminpanel_trunk_outgoing_sound:-${'$'}{us-ring}}}"/>\n` +
                    `        <action application="lua" data="adminpanel_outgoing_ivr.lua"/>\n` +
                    `        <action application="set" data="call_timeout=60"/>\n` +
                    `        <action application="set" data="hangup_after_bridge=true"/>\n` +
                    `        <action application="set" data="continue_on_fail=true"/>\n` +
                    `        <action application="bridge" data="sofia/gateway/${trunkEsc}/${dialed}"/>\n` +
                    `      </condition>`);
            }
            if (conditions.length) {
                extNodes.push(`    <extension name="adminpanel_outbound_${trunkEsc}">\n` +
                    `${conditions.join('\n')}\n` +
                    `    </extension>`);
            }
        }
        const body = `<include>\n` +
            `  <context name="default">\n` +
            (extNodes.length ? `${extNodes.join('\n\n')}\n` : '') +
            `  </context>\n` +
            `</include>\n`;
        this.files.writeFile({ path: rel, content: body });
    }
};
exports.DialplanService = DialplanService;
exports.DialplanService = DialplanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [files_service_1.FilesService])
], DialplanService);
function renderDestination(dest) {
    switch (dest.type) {
        case 'terminate':
            return `        <action application="hangup" data="NORMAL_CLEARING"/>\n`;
        case 'extension':
            return `        <action application="transfer" data="${esc(dest.target)} XML default"/>\n`;
        case 'queue':
            return (`        <action application="answer"/>\n` +
                `        <action application="callcenter" data="${esc(dest.target)}"/>\n`);
        case 'ivr':
            return (`        <action application="answer"/>\n` +
                `        <action application="sleep" data="1000"/>\n` +
                `        <action application="ivr" data="${esc(dest.target)}"/>\n`);
        case 'timeCondition':
            return `        <action application="transfer" data="${esc(dest.target)} XML default"/>\n`;
    }
}
function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function escLuaArg(s) {
    return String(s ?? '').replace(/["'\s]/g, '');
}
//# sourceMappingURL=dialplan.service.js.map