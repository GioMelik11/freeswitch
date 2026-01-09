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
exports.IvrService = void 0;
const common_1 = require("@nestjs/common");
const files_service_1 = require("../../files/files.service");
const xml_1 = require("../xml");
const IVR_CONF_PATH = 'autoload_configs/ivr.conf.xml';
let IvrService = class IvrService {
    files;
    constructor(files) {
        this.files = files;
    }
    normalizeSoundPath(v) {
        const s = String(v ?? '');
        const prefix = '/usr/share/freeswitch/sounds/';
        return s.startsWith(prefix) ? s.slice(prefix.length) : s;
    }
    list() {
        const read = this.files.readFile(IVR_CONF_PATH);
        const obj = xml_1.xmlParser.parse(read.content);
        const cfg = obj?.configuration;
        if (!cfg)
            throw new common_1.BadRequestException('Invalid ivr.conf.xml');
        const menus = (0, xml_1.asArray)(cfg?.menus?.menu).map((m) => this.mapMenu(m));
        return { etag: read.etag, menus };
    }
    upsert(input) {
        const read = this.files.readFile(IVR_CONF_PATH);
        const obj = xml_1.xmlParser.parse(read.content);
        const cfg = obj?.configuration;
        if (!cfg)
            throw new common_1.BadRequestException('Invalid ivr.conf.xml');
        const menus = (0, xml_1.asArray)(cfg?.menus?.menu);
        const renderedMenu = this.buildMenuNode(input);
        let found = false;
        const nextMenus = menus.map((m) => {
            if (String(m?.['@_name'] ?? '') !== input.name)
                return m;
            found = true;
            return renderedMenu;
        });
        if (!found)
            nextMenus.push(renderedMenu);
        const xml = this.renderIvrConf(nextMenus);
        return this.files.writeFile({
            path: IVR_CONF_PATH,
            content: xml,
            etag: input.etag ?? read.etag,
        });
    }
    delete(name, etag) {
        const read = this.files.readFile(IVR_CONF_PATH);
        const obj = xml_1.xmlParser.parse(read.content);
        const cfg = obj?.configuration;
        if (!cfg)
            throw new common_1.BadRequestException('Invalid ivr.conf.xml');
        const menus = (0, xml_1.asArray)(cfg?.menus?.menu).filter((m) => String(m?.['@_name'] ?? '') !== name);
        const xml = this.renderIvrConf(menus);
        return this.files.writeFile({
            path: IVR_CONF_PATH,
            content: xml,
            etag: etag ?? read.etag,
        });
    }
    mapMenu(m) {
        const attrs = m ?? {};
        const entries = (0, xml_1.asArray)(m?.entry).map((e) => {
            const digits = String(e?.['@_digits'] ?? '');
            const action = String(e?.['@_action'] ?? 'menu-exec-app');
            const param = String(e?.['@_param'] ?? '');
            if (action === 'menu-exec-app' && param.startsWith('transfer ')) {
                return {
                    digits,
                    type: 'transfer',
                    target: param.replace(/^transfer\s+/, ''),
                };
            }
            if (action === 'menu-exec-app' && param.startsWith('callcenter ')) {
                return {
                    digits,
                    type: 'queue',
                    target: param.replace(/^callcenter\s+/, ''),
                };
            }
            if (action === 'menu-sub') {
                return { digits, type: 'ivr', target: param };
            }
            return {
                digits,
                type: 'app',
                target: `${action} ${param}`.trim(),
            };
        });
        return {
            name: String(attrs['@_name'] ?? ''),
            greetLong: this.normalizeSoundPath(attrs['@_greet-long']),
            greetShort: this.normalizeSoundPath(attrs['@_greet-short']),
            invalidSound: this.normalizeSoundPath(attrs['@_invalid-sound']),
            exitSound: this.normalizeSoundPath(attrs['@_exit-sound']),
            timeout: attrs['@_timeout'],
            interDigitTimeout: attrs['@_inter-digit-timeout'],
            maxFailures: attrs['@_max-failures'],
            maxTimeouts: attrs['@_max-timeouts'],
            digitLen: attrs['@_digit-len'],
            entries,
        };
    }
    buildMenuNode(input) {
        const attr = {
            '@_name': input.name,
        };
        const set = (k, v) => {
            if (v == null || v === '')
                return;
            attr[`@_${k}`] = v;
        };
        set('greet-long', this.normalizeSoundPath(input.greetLong));
        set('greet-short', this.normalizeSoundPath(input.greetShort));
        set('invalid-sound', this.normalizeSoundPath(input.invalidSound));
        set('exit-sound', this.normalizeSoundPath(input.exitSound));
        set('timeout', input.timeout ?? '15000');
        set('inter-digit-timeout', input.interDigitTimeout ?? '3000');
        set('max-failures', input.maxFailures ?? '3');
        set('max-timeouts', input.maxTimeouts ?? '3');
        set('digit-len', input.digitLen ?? '1');
        const entry = (input.entries ?? []).map((e) => {
            const digits = String(e.digits ?? '');
            const type = e.type;
            if (!/^\d+$/.test(digits)) {
                throw new common_1.BadRequestException(`Invalid DTMF digits "${digits}". Digits must be numeric.`);
            }
            const digitLen = String(input.digitLen ?? attr['@_digit-len'] ?? '1').trim();
            if (/^\d+$/.test(digitLen) && digits.length !== Number(digitLen)) {
                throw new common_1.BadRequestException(`DTMF "${digits}" must be length ${digitLen}.`);
            }
            if (type === 'transfer') {
                const target = String(e.target ?? '').trim();
                if (!/^\d+\s+XML\s+\w+$/.test(target)) {
                    throw new common_1.BadRequestException(`Invalid transfer target "${target}". Expected format like "1001 XML default".`);
                }
                return {
                    '@_action': 'menu-exec-app',
                    '@_digits': digits,
                    '@_param': `transfer ${target}`,
                };
            }
            if (type === 'queue') {
                const target = String(e.target ?? '').trim();
                if (!/^[^\s@]+@[^\s@]+$/.test(target)) {
                    throw new common_1.BadRequestException(`Invalid queue target "${target}". Expected format like "queue1@default".`);
                }
                return {
                    '@_action': 'menu-exec-app',
                    '@_digits': digits,
                    '@_param': `callcenter ${target}`,
                };
            }
            if (type === 'ivr') {
                const target = String(e.target ?? '').trim();
                if (!/^[a-zA-Z0-9_-]+$/.test(target)) {
                    throw new common_1.BadRequestException(`Invalid IVR submenu target "${target}".`);
                }
                return {
                    '@_action': 'menu-sub',
                    '@_digits': digits,
                    '@_param': target,
                };
            }
            const raw = String(e.target ?? '');
            const [action, ...rest] = raw.split(' ');
            return {
                '@_action': action || 'menu-exec-app',
                '@_digits': digits,
                '@_param': rest.join(' '),
            };
        });
        return { ...attr, entry };
    }
    renderIvrConf(menus) {
        const menuXml = menus.map((m) => this.renderMenu(m)).join('\n');
        return (`<configuration name="ivr.conf" description="IVR menus">\n` +
            `  <menus>\n` +
            `${menuXml}\n` +
            `  </menus>\n` +
            `</configuration>\n`);
    }
    renderMenu(m) {
        const attrs = Object.entries(m)
            .filter(([k]) => k.startsWith('@_'))
            .map(([k, v]) => `${k.substring(2)}="${esc(String(v))}"`)
            .join(' ');
        const entries = (0, xml_1.asArray)(m.entry).map((e) => {
            const a = esc(String(e['@_action'] ?? 'menu-exec-app'));
            const d = esc(String(e['@_digits'] ?? ''));
            const p = esc(String(e['@_param'] ?? ''));
            return `    <entry action="${a}" digits="${d}" param="${p}"/>`;
        });
        return `    <menu ${attrs}>\n${entries.join('\n')}\n    </menu>`;
    }
};
exports.IvrService = IvrService;
exports.IvrService = IvrService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [files_service_1.FilesService])
], IvrService);
function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
//# sourceMappingURL=ivr.service.js.map