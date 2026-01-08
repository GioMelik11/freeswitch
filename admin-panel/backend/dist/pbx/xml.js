"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.xmlParser = void 0;
exports.asArray = asArray;
const fast_xml_parser_1 = require("fast-xml-parser");
exports.xmlParser = new fast_xml_parser_1.XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
});
function asArray(v) {
    if (v == null)
        return [];
    return Array.isArray(v) ? v : [v];
}
//# sourceMappingURL=xml.js.map