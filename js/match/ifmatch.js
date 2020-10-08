"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMongooseBaseType = exports.EnumActionType = exports.EnumRuleType = exports.WORDTYPE = exports.aAnySuccessorOperatorNames = exports.aOperatorNames = exports.ERR_EMPTY_INPUT = exports.ERR_NO_KNOWN_WORD = exports.CAT_TOOL = exports.CAT_FILLER = exports.CAT_CATEGORY = exports.EnumResponseCode = void 0;
var EnumResponseCode;
(function (EnumResponseCode) {
    EnumResponseCode[EnumResponseCode["NOMATCH"] = 0] = "NOMATCH";
    EnumResponseCode[EnumResponseCode["EXEC"] = 1] = "EXEC";
    EnumResponseCode[EnumResponseCode["QUERY"] = 2] = "QUERY";
})(EnumResponseCode = exports.EnumResponseCode || (exports.EnumResponseCode = {}));
exports.CAT_CATEGORY = "category";
exports.CAT_FILLER = "filler";
exports.CAT_TOOL = "tool";
exports.ERR_NO_KNOWN_WORD = "NO_KNOWN_WORD";
exports.ERR_EMPTY_INPUT = "EMPTY_INPUT";
;
;
exports.aOperatorNames = ["starting with", "ending with",
    "containing", "excluding", "having", "being",
    "more than", "less than", "exactly",
    "<", "<=", "!=", "=", ">", ">=",
    "order by", "order descending by",
    "existing", "not existing",
    "left_paren", "right_paren",
    "logical_and", "logical_or"
];
exports.aAnySuccessorOperatorNames = ["starting with", "ending with",
    "containing", "excluding", "having", "being",
    "<", "<=", "!=", "=", ">", ">="
];
;
exports.WORDTYPE = {
    FILLER: "I",
    FACT: "F",
    TOOL: "T",
    META: "M",
    CATEGORY: "C",
    DOMAIN: "D",
    OPERATOR: "O",
    NUMERICARG: 'N',
    ANY: "A" //
};
var EnumRuleType;
(function (EnumRuleType) {
    EnumRuleType[EnumRuleType["WORD"] = 0] = "WORD";
    EnumRuleType[EnumRuleType["REGEXP"] = 1] = "REGEXP";
})(EnumRuleType = exports.EnumRuleType || (exports.EnumRuleType = {}));
;
;
;
;
;
;
var EnumActionType;
(function (EnumActionType) {
    EnumActionType[EnumActionType["STARTURL"] = 0] = "STARTURL";
    EnumActionType[EnumActionType["STARTCMDLINE"] = 1] = "STARTCMDLINE";
})(EnumActionType = exports.EnumActionType || (exports.EnumActionType = {}));
var IMongooseBaseType;
(function (IMongooseBaseType) {
    IMongooseBaseType["Number"] = "Number";
    IMongooseBaseType["String"] = "String";
})(IMongooseBaseType = exports.IMongooseBaseType || (exports.IMongooseBaseType = {}));
;
;
;
;
;

//# sourceMappingURL=ifmatch.js.map

//# sourceMappingURL=ifmatch.js.map
