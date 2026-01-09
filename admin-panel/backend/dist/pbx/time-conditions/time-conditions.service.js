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
exports.TimeConditionsService = void 0;
const common_1 = require("@nestjs/common");
const files_service_1 = require("../../files/files.service");
const xml_1 = require("../xml");
const TC_PATH = 'dialplan/default/99_time_conditions.xml';
let TimeConditionsService = class TimeConditionsService {
    files;
    constructor(files) {
        this.files = files;
    }
    list() {
        let etag = '';
        let content = '';
        try {
            const read = this.files.readFile(TC_PATH);
            etag = read.etag;
            content = read.content;
        }
        catch {
            const xml = this.render([]);
            this.files.writeFile({ path: TC_PATH, content: xml });
            const read = this.files.readFile(TC_PATH);
            etag = read.etag;
            content = read.content;
        }
        const obj = xml_1.xmlParser.parse(content);
        const include = obj?.include;
        const exts = (0, xml_1.asArray)(include?.context?.extension);
        const items = exts.map((ext) => {
            const name = String(ext?.['@_name'] ?? '');
            const c1 = (0, xml_1.asArray)(ext?.condition)[0];
            const dnExpr = String(c1?.['@_expression'] ?? '');
            const extensionNumber = dnExpr
                .replace(/^\^?/, '')
                .replace(/\$?$/, '')
                .replace(/\$$/, '')
                .replace(/\^|\$/g, '');
            const nested = (0, xml_1.asArray)(c1?.condition);
            const dayCond = nested.find((c) => String(c?.['@_field'] ?? '').includes('strftime(%u)'));
            const hourCond = nested.find((c) => String(c?.['@_field'] ?? '').includes('strftime(%H)'));
            const days = parseNumberAlternation(dayCond?.['@_expression']);
            const hours = parseNumberAlternation(hourCond?.['@_expression']);
            const { startHour, endHour } = inferHourRange(hours);
            const action = (0, xml_1.asArray)(hourCond?.action)[0];
            const anti = (0, xml_1.asArray)(hourCond?.['anti-action'])[0];
            return {
                name,
                extensionNumber,
                days,
                startHour,
                endHour,
                onMatch: parseDestination(action),
                onElse: parseDestination(anti),
            };
        });
        return { etag, items };
    }
    upsert(input) {
        const read = this.files.readFile(TC_PATH);
        const obj = xml_1.xmlParser.parse(read.content);
        const include = obj?.include;
        const ctx = include?.context;
        const exts = (0, xml_1.asArray)(ctx?.extension);
        const nextExts = exts.filter((e) => String(e?.['@_name'] ?? '') !== input.name);
        nextExts.push(this.buildExtension(input));
        const out = this.render(nextExts);
        return this.files.writeFile({
            path: TC_PATH,
            content: out,
            etag: input.etag ?? read.etag,
        });
    }
    delete(name, etag) {
        const read = this.files.readFile(TC_PATH);
        const obj = xml_1.xmlParser.parse(read.content);
        const include = obj?.include;
        const ctx = include?.context;
        const exts = (0, xml_1.asArray)(ctx?.extension).filter((e) => String(e?.['@_name'] ?? '') !== name);
        const out = this.render(exts);
        return this.files.writeFile({
            path: TC_PATH,
            content: out,
            etag: etag ?? read.etag,
        });
    }
    buildExtension(tc) {
        if (!/^\d+$/.test(tc.extensionNumber))
            throw new common_1.BadRequestException('Invalid extensionNumber');
        const daysExpr = buildAlternation(tc.days.map((d) => String(d)));
        const hours = hourList(tc.startHour, tc.endHour).map((h) => String(h).padStart(2, '0'));
        const hoursExpr = buildAlternation(hours);
        const matchAction = buildAction(tc.onMatch);
        const elseAction = buildAction(tc.onElse, true);
        return {
            '@_name': tc.name,
            condition: {
                '@_field': 'destination_number',
                '@_expression': `^${tc.extensionNumber}$`,
                condition: [
                    {
                        '@_field': '${strftime(%u)}',
                        '@_expression': `^${daysExpr}$`,
                    },
                    {
                        '@_field': '${strftime(%H)}',
                        '@_expression': `^${hoursExpr}$`,
                        action: matchAction,
                        'anti-action': elseAction,
                    },
                ],
            },
        };
    }
    render(extNodes) {
        const extensionsXml = extNodes
            .map((e) => this.renderExtension(e))
            .join('\n');
        return (`<include>\n` +
            `  <context name="default">\n` +
            `${extensionsXml}\n` +
            `  </context>\n` +
            `</include>\n`);
    }
    renderExtension(e) {
        const name = esc(e['@_name']);
        const c1 = e.condition;
        const dnExpr = esc(c1['@_expression']);
        const nested = (0, xml_1.asArray)(c1.condition);
        const day = nested.find((c) => String(c['@_field']).includes('strftime(%u)'));
        const hour = nested.find((c) => String(c['@_field']).includes('strftime(%H)'));
        const dayExpr = esc(day['@_expression']);
        const hourExpr = esc(hour['@_expression']);
        const action = (0, xml_1.asArray)(hour.action)[0];
        const anti = (0, xml_1.asArray)(hour['anti-action'])[0];
        return (`    <extension name="${name}">\n` +
            `      <condition field="destination_number" expression="${dnExpr}">\n` +
            `        <condition field="${'$'}{strftime(%u)}" expression="${dayExpr}"/>\n` +
            `        <condition field="${'$'}{strftime(%H)}" expression="${hourExpr}">\n` +
            renderActionXml(action, 'action') +
            renderActionXml(anti, 'anti-action') +
            `        </condition>\n` +
            `      </condition>\n` +
            `    </extension>`);
    }
};
exports.TimeConditionsService = TimeConditionsService;
exports.TimeConditionsService = TimeConditionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [files_service_1.FilesService])
], TimeConditionsService);
function buildAction(dest, anti = false) {
    if (dest.type === 'transfer') {
        const target = String(dest.target ?? '').trim();
        if (!/^\d+\s+XML\s+\w+$/.test(target)) {
            throw new common_1.BadRequestException(`Invalid transfer target "${target}". Expected format like "1001 XML default".`);
        }
        return { '@_application': 'transfer', '@_data': target };
    }
    if (dest.type === 'ivr') {
        const target = String(dest.target ?? '').trim();
        if (!/^[a-zA-Z0-9_-]+$/.test(target)) {
            throw new common_1.BadRequestException(`Invalid IVR target "${target}".`);
        }
        return { '@_application': 'ivr', '@_data': target };
    }
    if (dest.type === 'queue') {
        const target = String(dest.target ?? '').trim();
        if (!/^[^\s@]+@[^\s@]+$/.test(target)) {
            throw new common_1.BadRequestException(`Invalid queue target "${target}". Expected format like "queue1@default".`);
        }
        return { '@_application': 'callcenter', '@_data': target };
    }
    if (anti)
        return { '@_application': 'hangup', '@_data': 'NORMAL_CLEARING' };
    return { '@_application': 'hangup', '@_data': 'NORMAL_CLEARING' };
}
function parseDestination(node) {
    const app = String(node?.['@_application'] ?? 'transfer');
    const data = String(node?.['@_data'] ?? '');
    if (app === 'ivr')
        return { type: 'ivr', target: data };
    if (app === 'callcenter')
        return { type: 'queue', target: data };
    return { type: 'transfer', target: data };
}
function renderActionXml(node, tag) {
    const app = esc(String(node?.['@_application'] ?? 'hangup'));
    const data = esc(String(node?.['@_data'] ?? ''));
    return `          <${tag} application="${app}" data="${data}"/>\n`;
}
function buildAlternation(parts) {
    const uniq = [...new Set(parts.filter(Boolean))];
    return uniq.length === 1 ? uniq[0] : `(${uniq.join('|')})`;
}
function hourList(start, end) {
    const out = [];
    if (start <= end) {
        for (let h = start; h <= end; h++)
            out.push(h);
    }
    else {
        for (let h = start; h <= 23; h++)
            out.push(h);
        for (let h = 0; h <= end; h++)
            out.push(h);
    }
    return out;
}
function parseNumberAlternation(expr) {
    const s = String(expr ?? '')
        .replace(/^\^/, '')
        .replace(/\$$/, '')
        .replace(/[()]/g, '');
    if (!s)
        return [];
    return s
        .split('|')
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n));
}
function inferHourRange(hours) {
    if (!hours.length)
        return { startHour: 9, endHour: 17 };
    const sorted = [...hours].sort((a, b) => a - b);
    return { startHour: sorted[0], endHour: sorted[sorted.length - 1] };
}
function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
//# sourceMappingURL=time-conditions.service.js.map