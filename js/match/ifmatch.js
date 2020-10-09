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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWZtYXRjaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYXRjaC9pZm1hdGNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUdBLElBQWtCLGdCQUlqQjtBQUpELFdBQWtCLGdCQUFnQjtJQUNoQyw2REFBVyxDQUFBO0lBQ1gsdURBQUksQ0FBQTtJQUNKLHlEQUFLLENBQUE7QUFDUCxDQUFDLEVBSmlCLGdCQUFnQixHQUFoQix3QkFBZ0IsS0FBaEIsd0JBQWdCLFFBSWpDO0FBR1ksUUFBQSxZQUFZLEdBQUcsVUFBVSxDQUFDO0FBQzFCLFFBQUEsVUFBVSxHQUFHLFFBQVEsQ0FBQztBQUN0QixRQUFBLFFBQVEsR0FBRyxNQUFNLENBQUM7QUFHbEIsUUFBQSxpQkFBaUIsR0FBRyxlQUFlLENBQUM7QUFDcEMsUUFBQSxlQUFlLEdBQUcsYUFBYSxDQUFDO0FBSzVDLENBQUM7QUFRRCxDQUFDO0FBYVcsUUFBQSxjQUFjLEdBQUcsQ0FBQyxlQUFlLEVBQUUsYUFBYTtJQUNuQyxZQUFZLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxPQUFPO0lBQzNDLFdBQVcsRUFBQyxXQUFXLEVBQUUsU0FBUztJQUNuQyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUk7SUFDL0IsVUFBVSxFQUFFLHFCQUFxQjtJQUNqQyxVQUFVLEVBQUUsY0FBYztJQUMxQixZQUFZLEVBQUUsYUFBYTtJQUMzQixhQUFhLEVBQUUsWUFBWTtDQUM1QixDQUFDO0FBV2IsUUFBQSwwQkFBMEIsR0FBRyxDQUFDLGVBQWUsRUFBRSxhQUFhO0lBQ2pELFlBQVksRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLE9BQU87SUFDNUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJO0NBQ2hDLENBQUM7QUFtRHZCLENBQUM7QUFPVyxRQUFBLFFBQVEsR0FBRztJQUN0QixNQUFNLEVBQUcsR0FBRztJQUNaLElBQUksRUFBRyxHQUFHO0lBQ1YsSUFBSSxFQUFFLEdBQUc7SUFDVCxJQUFJLEVBQUcsR0FBRztJQUNWLFFBQVEsRUFBRyxHQUFHO0lBQ2QsTUFBTSxFQUFHLEdBQUc7SUFDWixRQUFRLEVBQUcsR0FBRztJQUNkLFVBQVUsRUFBRyxHQUFHO0lBQ2hCLEdBQUcsRUFBRyxHQUFHLENBQUMsRUFBRTtDQUNiLENBQUM7QUFFRixJQUF1QixZQUd0QjtBQUhELFdBQXVCLFlBQVk7SUFDakMsK0NBQUksQ0FBQTtJQUNKLG1EQUFNLENBQUE7QUFDUixDQUFDLEVBSHNCLFlBQVksR0FBWixvQkFBWSxLQUFaLG9CQUFZLFFBR2xDO0FBS0ksQ0FBQztBQTJFTCxDQUFDO0FBSWUsQ0FBQztBQW1DakIsQ0FBQztBQW9DRCxDQUFDO0FBYUQsQ0FBQztBQTRCRixJQUFrQixjQUdqQjtBQUhELFdBQWtCLGNBQWM7SUFDOUIsMkRBQVEsQ0FBQTtJQUNSLG1FQUFZLENBQUE7QUFDZCxDQUFDLEVBSGlCLGNBQWMsR0FBZCxzQkFBYyxLQUFkLHNCQUFjLFFBRy9CO0FBd0JELElBQWtCLGlCQUdqQjtBQUhELFdBQWtCLGlCQUFpQjtJQUNqQyxzQ0FBaUIsQ0FBQTtJQUNqQixzQ0FBaUIsQ0FBQTtBQUNuQixDQUFDLEVBSGlCLGlCQUFpQixHQUFqQix5QkFBaUIsS0FBakIseUJBQWlCLFFBR2xDO0FBQUEsQ0FBQztBQWdDRCxDQUFDO0FBUUQsQ0FBQztBQW1CRCxDQUFDO0FBbUJELENBQUMifQ==