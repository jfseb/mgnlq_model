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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9pZm1hdGNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUdBLElBQWtCLGdCQUlqQjtBQUpELFdBQWtCLGdCQUFnQjtJQUNoQyw2REFBVyxDQUFBO0lBQ1gsdURBQUksQ0FBQTtJQUNKLHlEQUFLLENBQUE7QUFDUCxDQUFDLEVBSmlCLGdCQUFnQixHQUFoQix3QkFBZ0IsS0FBaEIsd0JBQWdCLFFBSWpDO0FBR1ksUUFBQSxZQUFZLEdBQUcsVUFBVSxDQUFDO0FBQzFCLFFBQUEsVUFBVSxHQUFHLFFBQVEsQ0FBQztBQUN0QixRQUFBLFFBQVEsR0FBRyxNQUFNLENBQUM7QUFHbEIsUUFBQSxpQkFBaUIsR0FBRyxlQUFlLENBQUM7QUFDcEMsUUFBQSxlQUFlLEdBQUcsYUFBYSxDQUFDO0FBSzVDLENBQUM7QUFRRCxDQUFDO0FBYVcsUUFBQSxjQUFjLEdBQUcsQ0FBQyxlQUFlLEVBQUUsYUFBYTtJQUNuQyxZQUFZLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxPQUFPO0lBQzNDLFdBQVcsRUFBQyxXQUFXLEVBQUUsU0FBUztJQUNuQyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUk7SUFDL0IsVUFBVSxFQUFFLHFCQUFxQjtJQUNqQyxVQUFVLEVBQUUsY0FBYztJQUMxQixZQUFZLEVBQUUsYUFBYTtJQUMzQixhQUFhLEVBQUUsWUFBWTtDQUM1QixDQUFDO0FBV2IsUUFBQSwwQkFBMEIsR0FBRyxDQUFDLGVBQWUsRUFBRSxhQUFhO0lBQ2pELFlBQVksRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLE9BQU87SUFDNUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJO0NBQ2hDLENBQUM7QUFpRHZCLENBQUM7QUFPVyxRQUFBLFFBQVEsR0FBRztJQUN0QixNQUFNLEVBQUcsR0FBRztJQUNaLElBQUksRUFBRyxHQUFHO0lBQ1YsSUFBSSxFQUFFLEdBQUc7SUFDVCxJQUFJLEVBQUcsR0FBRztJQUNWLFFBQVEsRUFBRyxHQUFHO0lBQ2QsTUFBTSxFQUFHLEdBQUc7SUFDWixRQUFRLEVBQUcsR0FBRztJQUNkLFVBQVUsRUFBRyxHQUFHO0lBQ2hCLEdBQUcsRUFBRyxHQUFHLENBQUMsRUFBRTtDQUNiLENBQUM7QUFFRixJQUF1QixZQUd0QjtBQUhELFdBQXVCLFlBQVk7SUFDakMsK0NBQUksQ0FBQTtJQUNKLG1EQUFNLENBQUE7QUFDUixDQUFDLEVBSHNCLFlBQVksR0FBWixvQkFBWSxLQUFaLG9CQUFZLFFBR2xDO0FBS0ksQ0FBQztBQTJFTCxDQUFDO0FBSWUsQ0FBQztBQW1DakIsQ0FBQztBQW9DRCxDQUFDO0FBYUQsQ0FBQztBQTRCRixJQUFrQixjQUdqQjtBQUhELFdBQWtCLGNBQWM7SUFDOUIsMkRBQVEsQ0FBQTtJQUNSLG1FQUFZLENBQUE7QUFDZCxDQUFDLEVBSGlCLGNBQWMsR0FBZCxzQkFBYyxLQUFkLHNCQUFjLFFBRy9CO0FBd0JELElBQWtCLGlCQUdqQjtBQUhELFdBQWtCLGlCQUFpQjtJQUNqQyxzQ0FBaUIsQ0FBQTtJQUNqQixzQ0FBaUIsQ0FBQTtBQUNuQixDQUFDLEVBSGlCLGlCQUFpQixHQUFqQix5QkFBaUIsS0FBakIseUJBQWlCLFFBR2xDO0FBQUEsQ0FBQztBQWdDRCxDQUFDO0FBUUQsQ0FBQztBQW1CRCxDQUFDO0FBbUJELENBQUMiLCJmaWxlIjoibWF0Y2gvaWZtYXRjaC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxyXG5pbXBvcnQgKiBhcyBtb25nb29zZSBmcm9tICdtb25nb29zZSc7XHJcblxyXG5leHBvcnQgY29uc3QgZW51bSBFbnVtUmVzcG9uc2VDb2RlIHtcclxuICBOT01BVENIID0gMCxcclxuICBFWEVDLFxyXG4gIFFVRVJZXHJcbn1cclxuXHJcblxyXG5leHBvcnQgY29uc3QgQ0FUX0NBVEVHT1JZID0gXCJjYXRlZ29yeVwiO1xyXG5leHBvcnQgY29uc3QgQ0FUX0ZJTExFUiA9IFwiZmlsbGVyXCI7XHJcbmV4cG9ydCBjb25zdCBDQVRfVE9PTCA9IFwidG9vbFwiO1xyXG5cclxuXHJcbmV4cG9ydCBjb25zdCBFUlJfTk9fS05PV05fV09SRCA9IFwiTk9fS05PV05fV09SRFwiO1xyXG5leHBvcnQgY29uc3QgRVJSX0VNUFRZX0lOUFVUID0gXCJFTVBUWV9JTlBVVFwiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJRVJFcnJvciB7XHJcbiAgZXJyX2NvZGUgOiBzdHJpbmcsXHJcbiAgdGV4dCA6IHN0cmluZ1xyXG59O1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJRVJFcnJvck5PX0tOT1dOX1dPUkQgZXh0ZW5kcyBJRVJFcnJvcntcclxuICBjb250ZXh0IDoge1xyXG4gICAgdG9rZW4gOiBzdHJpbmcsXHJcbiAgICBpbmRleDogbnVtYmVyLFxyXG4gICAgdG9rZW5zIDogc3RyaW5nW11cclxuICB9XHJcbn07XHJcblxyXG5cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVByb21wdERlc2NyaXB0aW9uIHtcclxuICBkZXNjcmlwdGlvbjogc3RyaW5nLFxyXG4gIHR5cGU6IHN0cmluZyxcclxuICBwYXR0ZXJuOiBSZWdFeHAsXHJcbiAgbWVzc2FnZTogc3RyaW5nLFxyXG4gIGRlZmF1bHQ6IHN0cmluZyxcclxuICByZXF1aXJlZDogYm9vbGVhblxyXG59XHJcblxyXG5leHBvcnQgY29uc3QgYU9wZXJhdG9yTmFtZXMgPSBbXCJzdGFydGluZyB3aXRoXCIsIFwiZW5kaW5nIHdpdGhcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBcImNvbnRhaW5pbmdcIiwgXCJleGNsdWRpbmdcIiwgXCJoYXZpbmdcIiwgXCJiZWluZ1wiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLFwibW9yZSB0aGFuXCIsXCJsZXNzIHRoYW5cIiAsXCJleGFjdGx5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCI8XCIsIFwiPD1cIiwgXCIhPVwiLCBcIj1cIiwgXCI+XCIsIFwiPj1cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBcIm9yZGVyIGJ5XCIsIFwib3JkZXIgZGVzY2VuZGluZyBieVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwiZXhpc3RpbmdcIiwgXCJub3QgZXhpc3RpbmdcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBcImxlZnRfcGFyZW5cIiwgXCJyaWdodF9wYXJlblwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwibG9naWNhbF9hbmRcIiwgXCJsb2dpY2FsX29yXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgXTtcclxuZXhwb3J0IHR5cGUgT3BlcmF0b3JOYW1lID0gXCJzdGFydGluZyB3aXRoXCIgfCBcImVuZGluZyB3aXRoXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgfCBcImNvbnRhaW5pbmdcIiB8IFwiYmVpbmdcIiB8IFwiZXhjbHVkaW5nXCIgfCBcImhhdmluZ1wiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHwgXCJtb3JlIHRoYW5cIiB8IFwibGVzcyB0aGFuXCIgfCBcImV4YWN0bHlcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB8IFwiPFwiIHwgXCI8PVwifCBcIiE9XCJ8IFwiPVwifCBcIj5cInwgXCI+PVwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHxcIm9yZGVyIGJ5XCJ8IFwib3JkZXIgZGVzY2VuZGluZyBieVwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHwgXCJleGlzdGluZ1wifCBcIm5vdCBleGlzdGluZ1wiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHwgXCJsZWZ0X3BhcmVuXCJ8IFwicmlnaHRfcGFyZW5cIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB8IFwibG9naWNhbF9hbmRcIiB8IFwibG9naWNhbF9vclwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDtcclxuXHJcbmV4cG9ydCBjb25zdCBhQW55U3VjY2Vzc29yT3BlcmF0b3JOYW1lcyA9IFtcInN0YXJ0aW5nIHdpdGhcIiwgXCJlbmRpbmcgd2l0aFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBcImNvbnRhaW5pbmdcIiwgXCJleGNsdWRpbmdcIiwgXCJoYXZpbmdcIiwgXCJiZWluZ1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBcIjxcIiwgXCI8PVwiLCBcIiE9XCIsIFwiPVwiLCBcIj5cIiwgXCI+PVwiXHJcbiAgICAgICAgICAgICAgICAgICAgICBdO1xyXG5cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSU9wZXJhdG9yIHtcclxuICBvcGVyYXRvciA6IE9wZXJhdG9yTmFtZSxcclxuICBjb2RlIDogc3RyaW5nLFxyXG4gIGFyaXR5IDogbnVtYmVyLFxyXG4gIGFyZ2NhdGVnb3J5IDogWyBzdHJpbmdbXSBdLFxyXG4gIG9wZXJhdG9ycG9zPyA6IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgdHlwZSBJT3BlcmF0b3JzID0geyBba2V5OnN0cmluZ10gOiBJT3BlcmF0b3IgfTtcclxuXHJcbmV4cG9ydCB0eXBlIElSZWNvcmQgPSB7IFtrZXkgOiBzdHJpbmddIDogc3RyaW5nIH07XHJcblxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJV2hhdElzQW5zd2VyIHtcclxuICBzZW50ZW5jZTogSVNlbnRlbmNlLFxyXG4gIHJlY29yZCA6IElSZWNvcmQsXHJcbiAgY2F0ZWdvcnkgOiBzdHJpbmcsXHJcbiAgcmVzdWx0OiBzdHJpbmcsXHJcbiAgX3JhbmtpbmcgOiBudW1iZXJcclxufVxyXG5cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMgZXh0ZW5kcyBJUHJvY2Vzc2VkIHtcclxuICBzZW50ZW5jZXM/IDogSVNlbnRlbmNlW10sXHJcbiAgYW5zd2VycyA6IElXaGF0SXNBbnN3ZXJbXVxyXG59XHJcblxyXG5cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVByb2Nlc3NlZFdoYXRJc1R1cGVsQW5zd2VycyBleHRlbmRzIElQcm9jZXNzZWQge1xyXG4gIHNlbnRlbmNlcz8gOiBJU2VudGVuY2VbXSxcclxuICB0dXBlbGFuc3dlcnMgOiBBcnJheTxJV2hhdElzVHVwZWxBbnN3ZXI+XHJcbn1cclxuXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElXaGF0SXNUdXBlbEFuc3dlciB7XHJcbiAgc2VudGVuY2U6IElTZW50ZW5jZSxcclxuICByZWNvcmQgOiBJUmVjb3JkLFxyXG4gIGNhdGVnb3JpZXMgOiBzdHJpbmdbXSxcclxuICByZXN1bHQ6IHN0cmluZ1tdLFxyXG4gIF9yYW5raW5nIDogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSU1hdGNoZWRTZXRSZWNvcmQge1xyXG4gIHNldElkIDogc3RyaW5nLFxyXG4gIHJlY29yZCA6IElSZWNvcmRcclxufTtcclxuZXhwb3J0IHR5cGUgSU1hdGNoZWRTZXRSZWNvcmRzID0gSU1hdGNoZWRTZXRSZWNvcmRbXTtcclxuLyoqXHJcbiAqIE1hcCBjYXRlZ29yeSAtPiB2YWx1ZVxyXG4gKi9cclxuZXhwb3J0IHR5cGUgSU1hdGNoU2V0ID0geyBba2V5IDogc3RyaW5nXSA6IHN0cmluZ307XHJcblxyXG5leHBvcnQgY29uc3QgV09SRFRZUEUgPSB7XHJcbiAgRklMTEVSIDogXCJJXCIsIC8vIGluLCBhbmQsXHJcbiAgRkFDVCA6IFwiRlwiLCAgLy8gYSBtb2RlbCBmYWN0XHJcbiAgVE9PTDogXCJUXCIsIC8vIGEgdG9vbCBuYW1lXHJcbiAgTUVUQSA6IFwiTVwiLCAgLy8gd29yZHMgbGlrZSBjYXRlZ29yeSwgZG9tYWluXHJcbiAgQ0FURUdPUlkgOiBcIkNcIiwgLy8gYSBjYXRlZ29yeSwgZS5nLiBCU1BOYW1lXHJcbiAgRE9NQUlOIDogXCJEXCIsIC8vIGEgZG9tYWluLCBlLmcuIEZpb3JpIEJvbVxyXG4gIE9QRVJBVE9SIDogXCJPXCIsIC8vIGNvbnRhaW5pbmcgLHN0YXJ0aW5nIHdpdGhcclxuICBOVU1FUklDQVJHIDogJ04nLCAvLyBhIG51bWJlclxyXG4gIEFOWSA6IFwiQVwiIC8vXHJcbn07XHJcblxyXG5leHBvcnQgLypjb25zdCovICBlbnVtIEVudW1SdWxlVHlwZSB7XHJcbiAgV09SRCxcclxuICBSRUdFWFBcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJVG9vbFNldCB7XHJcbiAgICAgIHNldDogc3RyaW5nW10sXHJcbiAgICAgIHJlc3BvbnNlOiBzdHJpbmdcclxuICAgIH07XHJcblxyXG5leHBvcnQgdHlwZSBJVG9vbFNldHMgPSB7XHJcbiAgICBba2V5OiBzdHJpbmddOiBJVG9vbFNldFxyXG4gICAgfTtcclxuLyoqXHJcbiAqIEBpbnRlcmZhY2UgSVRvb2xcclxuICpcclxuICogdmFyIG9Ub29sID0geyAnbmFtZScgOiAnRkxQRCcsXHJcbiAqICAgJ3JlcXVpcmVzJyA6IHsgJ3N5c3RlbUlkJyA6IHt9LCAnY2xpZW50JyA6e319LFxyXG4gKiAgICdvcHRpb25hbCcgOiB7ICdjYXRhbG9nJyA6IHt9LCAnZ3JvdXAnIDp7fX1cclxuICogfTtcclxuKi9cclxuZXhwb3J0IGludGVyZmFjZSBJVG9vbCB7XHJcbiAgbmFtZTogc3RyaW5nLFxyXG4gIHJlcXVpcmVzOiB7IFtrZXk6IHN0cmluZ106IE9iamVjdCB9LFxyXG4gIG9wdGlvbmFsPzogeyBba2V5OiBzdHJpbmddOiBPYmplY3QgfSxcclxuICBzZXRzPzogSVRvb2xTZXRzXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVRvb2xNYXRjaFJlc3VsdCB7XHJcbiAgcmVxdWlyZWQ6IHsgW2tleTogc3RyaW5nXTogSVdvcmQgfSxcclxuICBtaXNzaW5nOiB7IFtrZXk6IHN0cmluZ106IG51bWJlciB9LFxyXG4gIG9wdGlvbmFsPzogeyBba2V5OiBzdHJpbmddOiBJV29yZCB9LFxyXG4gIHNwdXJpb3VzOiB7IFtrZXk6IHN0cmluZ106IG51bWJlciB9LFxyXG4gIHRvb2xtZW50aW9uZWQ6IElXb3JkW11cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJUHJvbXB0IHtcclxuICB0ZXh0OiBzdHJpbmcsXHJcbiAgY2F0ZWdvcnk6IHN0cmluZ1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElUb29sTWF0Y2gge1xyXG4gIHRvb2xtYXRjaHJlc3VsdDogSVRvb2xNYXRjaFJlc3VsdCxcclxuICBzZW50ZW5jZTogSVNlbnRlbmNlLFxyXG4gIHRvb2w6IElUb29sLFxyXG4gIHJhbms6IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElXb3JkIHtcclxuICBzdHJpbmc6IHN0cmluZyxcclxuICBtYXRjaGVkU3RyaW5nOiBzdHJpbmcsXHJcbiAgY2F0ZWdvcnk6IHN0cmluZyxcclxuICBfcmFua2luZz86IG51bWJlcixcclxuICBsZXZlbm1hdGNoPzogbnVtYmVyLFxyXG4gIHJlaW5mb3JjZT86IG51bWJlcixcclxuICBiaXRpbmRleD8gOiBudW1iZXIsXHJcbiAgcnVsZT8gOiBtUnVsZVxyXG59XHJcblxyXG5leHBvcnQgdHlwZSBJU2VudGVuY2UgPSBBcnJheTxJV29yZD47XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElSdWxlIHtcclxuICB0eXBlOiBFbnVtUnVsZVR5cGUsXHJcbiAga2V5OiBzdHJpbmcsXHJcbiAgd29yZD86IHN0cmluZyxcclxuICByZWdleHA/OiBSZWdFeHAsXHJcbiAgYXJnc01hcD86IHsgW2tleTogbnVtYmVyXTogc3RyaW5nIH0gIC8vIGEgbWFwIG9mIHJlZ2V4cCBtYXRjaCBncm91cCAtPiBjb250ZXh0IGtleVxyXG4gIC8vIGUuZy4gLyhbYS16MC05XXszLDN9KUNMTlQoW1xcZHszLDN9XSkvXHJcbiAgLy8gICAgICB7IDEgOiBcInN5c3RlbUlkXCIsIDIgOiBcImNsaWVudFwiIH1cclxuICBmb2xsb3dzOiBjb250ZXh0XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSW50ZW50UnVsZSB7XHJcbiAgdHlwZTogRW51bVJ1bGVUeXBlLFxyXG4gIHJlZ2V4cDogUmVnRXhwLFxyXG4gIGFyZ3NNYXA6IHsgW2tleTogc3RyaW5nXTogbnVtYmVyIH0gIC8vIGEgbWFwIG9mIHJlZ2V4cCBtYXRjaCBncm91cCAtPiBjb250ZXh0IGtleVxyXG4gIC8vIGUuZy4gLyhbYS16MC05XXszLDN9KUNMTlQoW1xcZHszLDN9XSkvXHJcbiAgLy8gICAgICB7IDEgOiBcInN5c3RlbUlkXCIsIDIgOiBcImNsaWVudFwiIH1cclxuICBmb2xsb3dzPzogY29udGV4dFxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElSYW5nZSB7XHJcbiAgbG93OiBudW1iZXIsIGhpZ2g6IG51bWJlcixcclxufTtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVdvcmRSYW5nZSBleHRlbmRzIElSYW5nZVxyXG57XHJcbiAgcnVsZT8gOiBtUnVsZSB9O1xyXG4vKipcclxuICogQSBydWxlIG1hdGNoaW5nIGEgc2luZ2xlIHN0cmluZ1xyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBtUnVsZSB7XHJcbiAgdHlwZTogRW51bVJ1bGVUeXBlLFxyXG4gIHdvcmQ/OiBzdHJpbmcsXHJcbiAgbG93ZXJjYXNld29yZD8gOiBzdHJpbmcsXHJcbiAgcmVnZXhwPzogUmVnRXhwLFxyXG4gIG1hdGNoZWRTdHJpbmc/OiBzdHJpbmcsXHJcbiAgbWF0Y2hJbmRleD86IG51bWJlcixcclxuICBjYXRlZ29yeTogc3RyaW5nLFxyXG4gIHJhbmdlPyA6ICBJV29yZFJhbmdlLFxyXG4gIC8qIGNhdGVnb3JpemF0aW9uICovXHJcbiAgd29yZFR5cGU6IHN0cmluZywgLy8gb25lIG9mIFdPUkRUWVBFXHJcbiAgYml0aW5kZXggOiBudW1iZXIsIC8vIGJpdGluZGV4IGluZGljYXRpbmcgZG9tYWluXHJcbiAgYml0U2VudGVuY2VBbmQgOiBudW1iZXIsIC8vIGEgYml0aW5kZXggZmxhZ2xpc3Qgd2hpY2ggaGFzIHRvIGJlIG5vbnplcm8gb24gYW5kXHJcblxyXG4gIC8qKlxyXG4gICAqIG9ubHkgdXNlIGFuIGV4YWN0IG1hdGNoXHJcbiAgICovXHJcbiAgZXhhY3RPbmx5PyA6IGJvb2xlYW4sXHJcbiAgX3Jhbmtpbmc/OiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJV29yZFJ1bGVzIHtcclxuICBydWxlcyA6IEFycmF5PG1SdWxlPixcclxuICBiaXRpbmRleDogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgU3BsaXRSdWxlcyB7XHJcbiAgYWxsUnVsZXM6IEFycmF5PG1SdWxlPixcclxuICBub25Xb3JkUnVsZXMgOiBBcnJheTxtUnVsZT4sXHJcbiAgd29yZE1hcDogeyBba2V5IDogc3RyaW5nXSA6IElXb3JkUnVsZXMgfSxcclxuICB3b3JkQ2FjaGUgOiAgeyBba2V5OiBzdHJpbmddOiBBcnJheTxJQ2F0ZWdvcml6ZWRTdHJpbmc+IH1cclxufTtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSUNhdGVnb3JpemVkU3RyaW5nIHtcclxuICBzdHJpbmc6IHN0cmluZyxcclxuICBtYXRjaGVkU3RyaW5nOiBzdHJpbmcsXHJcbiAgY2F0ZWdvcnk6IHN0cmluZyxcclxuICBicmVha2Rvd24/OiBBcnJheTxhbnk+XHJcbiAgc2NvcmU/OiBudW1iZXIsXHJcbiAgX3Jhbmtpbmc/OiBudW1iZXIsXHJcbiAgbGV2ZW5tYXRjaD86IG51bWJlciAgLy8gYSBkaXN0YW5jZSByYW5raW5nXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSUNhdGVnb3JpemVkU3RyaW5nUmFuZ2VkIGV4dGVuZHMgSUNhdGVnb3JpemVkU3RyaW5ne1xyXG4gIHN0cmluZzogc3RyaW5nLFxyXG4gIG1hdGNoZWRTdHJpbmc6IHN0cmluZyxcclxuICBjYXRlZ29yeTogc3RyaW5nLFxyXG4gIGJyZWFrZG93bj86IEFycmF5PGFueT5cclxuICAvKipcclxuICAgKiBMZW5ndGggb2YgdGhlIGVudHJ5IChmb3Igc2tpcHBpbmcgZm9sbG93aW5nIHdvcmRzKVxyXG4gICAqL1xyXG4gIHNjb3JlPzogbnVtYmVyLFxyXG4gIHNwYW4/IDogbnVtYmVyLFxyXG4gIHJ1bGUgOiBtUnVsZSxcclxuICBfcmFua2luZz86IG51bWJlcixcclxuICBsZXZlbm1hdGNoPzogbnVtYmVyICAvLyBhIGRpc3RhbmNlIHJhbmtpbmdcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJUHJvY2Vzc2VkIHtcclxuICB0b2tlbnMgOiBzdHJpbmdbXSxcclxuICBlcnJvcnM/IDogSUVSRXJyb3JbXVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElQcm9jZXNzZWRTZW50ZW5jZXMgZXh0ZW5kcyBJUHJvY2Vzc2VkIHtcclxuICB0b2tlbnMgOiBzdHJpbmdbXSxcclxuICBlcnJvcnM/IDogYW55LFxyXG4gIHNlbnRlbmNlcyA6IElTZW50ZW5jZVtdXHJcbn07XHJcblxyXG5leHBvcnQgdHlwZSBJQ2F0ZWdvcnlGaWx0ZXIgPSB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfTtcclxuXHJcblxyXG5leHBvcnQgdHlwZSBJRG9tYWluQ2F0ZWdvcnlGaWx0ZXIgPSB7XHJcbiAgZG9tYWlucyA6IHN0cmluZ1tdLFxyXG4gIGNhdGVnb3J5U2V0IDogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH1cclxufVxyXG5cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVByb2Nlc3NlZEV4dHJhY3RlZENhdGVnb3JpZXMgZXh0ZW5kcyBJUHJvY2Vzc2VkIHtcclxuICBjYXRlZ29yaWVzIDogc3RyaW5nW10sXHJcbn07XHJcblxyXG5cclxuXHJcbmV4cG9ydCB0eXBlIGNvbnRleHQgPSB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9O1xyXG5cclxuLyoqXHJcbiAqIERlZmluZXMgdGhlIGludGVyZmFjZSBmb3IgYW4gYW5hbHlzaXNcclxuICogcmVwb25zZVxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBJUmVzcG9uc2Uge1xyXG4gIHJhdGluZzogbnVtYmVyLFxyXG4gIHR5cGU6IEVudW1SZXNwb25zZUNvZGUsXHJcbiAgcXVlcnk6IHN0cmluZyxcclxuICBjb250ZXh0OiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9LFxyXG4gIHRleHQ6IHN0cmluZyxcclxuICBhY3Rpb246IElBY3Rpb24sXHJcbiAgcHJvbXB0czoge1xyXG4gICAgW2tleTogc3RyaW5nXToge1xyXG4gICAgICB0ZXh0OiBzdHJpbmcsXHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiBGb2xsb3dzIHRoZSBmZWF0dXJlcyBvZiBOUE0gcHJvbXB0c1xyXG4gICAgICAgKi9cclxuICAgICAgZGVzY3JpcHRpb246IElQcm9tcHREZXNjcmlwdGlvblxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBlbnVtIEVudW1BY3Rpb25UeXBlIHtcclxuICBTVEFSVFVSTCxcclxuICBTVEFSVENNRExJTkVcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJQWN0aW9uIHtcclxuICBkYXRhOiBhbnksXHJcbiAgdHlwZTogRW51bUFjdGlvblR5cGUsXHJcbiAgcGF0dGVybjogc3RyaW5nLFxyXG4gIGNvbmNyZXRlOiBzdHJpbmdcclxufVxyXG5cclxuXHJcblxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJUmF3U2NoZW1hIHtcclxuICAgIHByb3BzOiBhbnlbXSxcclxuICAgIGluZGV4IDogYW55XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUUJFQ29sdW1uUHJvcCB7XHJcbiAgICAgIGRlZmF1bHRXaWR0aD86IG51bWJlcixcclxuICAgICAgUUJFOiBib29sZWFuLFxyXG4gICAgICBMVU5SSW5kZXg/OiBib29sZWFuLFxyXG4gICAgICBRQkVJbmNsdWRlPyA6IGJvb2xlYW5cclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGVudW0gSU1vbmdvb3NlQmFzZVR5cGUge1xyXG4gIE51bWJlciA9IFwiTnVtYmVyXCIsXHJcbiAgU3RyaW5nID0gXCJTdHJpbmdcIlxyXG59O1xyXG5cclxuZXhwb3J0IHR5cGUgSU1vbmdvb3NlVHlwZURlY2wgPSBJTW9uZ29vc2VCYXNlVHlwZSB8IElNb25nb29zZUJhc2VUeXBlW107XHJcblxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJTW9kZWxDYXRlZ29yeVJlYyB7XHJcbiAgICBjYXRlZ29yeSA6IHN0cmluZyxcclxuICAgIGNhdGVnb3J5X2Rlc2NyaXB0aW9uIDogc3RyaW5nLFxyXG4gICAgUUJFQ29sdW1uUHJvcHMgOiBRQkVDb2x1bW5Qcm9wLFxyXG4gICAgY2F0ZWdvcnlfc3lub255bXM6IHN0cmluZ1tdLFxyXG4gICAgd29yZGluZGV4IDogYm9vbGVhbixcclxuICAgIGV4YWN0bWF0Y2g6IGJvb2xlYW4sXHJcbiAgICBzaG93VVJJIDogYm9vbGVhbixcclxuICAgIHNob3dVUklSYW5rIDogYm9vbGVhbixcclxuICAgIHR5cGUgOiBJTW9uZ29vc2VUeXBlRGVjbFxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElNb2RlbERvYyB7XHJcbiAgICBkb21haW4gOiBzdHJpbmcsXHJcbiAgICBtb2RlbG5hbWU/IDogc3RyaW5nLFxyXG4gICAgY29sbGVjdGlvbm5hbWU/IDogc3RyaW5nLFxyXG4gICAgZG9tYWluX2Rlc2NyaXB0aW9uIDogc3RyaW5nXHJcbiAgICBfY2F0ZWdvcmllcyA6IElNb2RlbENhdGVnb3J5UmVjW10sXHJcbiAgICBjb2x1bW5zOiBzdHJpbmdbXSxcclxuICAgIGRvbWFpbl9zeW5vbnltcyA6IHN0cmluZ1tdXHJcblxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENhdE1vbmdvTWFwICB7IFtrZXk6IHN0cmluZ10gOiB7XHJcbiAgICAgICAgcGF0aHMgOiBzdHJpbmdbXSwgLy8gaW5kaXZpZHVhbCBzZWdtZW50cywgY2FuIGJlICBbXCJBXCIsXCJbXVwiLFwiQlwiXSAsIFtcIkFcIiwgXCJCXCJdICBvciBbXCJBXCIsIFwiW11cIl1cclxuICAgICAgICBmdWxscGF0aCA6IHN0cmluZywgLy8gdGhlIG1vbmdvb3NlIHBhdGggYXMgd3JpdHRlbiwgZS5nLiBBLkJcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElFeHRlbmRlZFNjaGVtYSBleHRlbmRzIElSYXdTY2hlbWF7XHJcbiAgICBkb21haW4gOiBzdHJpbmcsXHJcbiAgICBtb2RlbG5hbWUgOiBzdHJpbmcsXHJcbiAgICBtb25nb29zZW1vZGVsbmFtZSA6IHN0cmluZyxcclxuICAgIGNvbGxlY3Rpb25uYW1lIDogc3RyaW5nXHJcbn07XHJcblxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJQ2F0ZWdvcnlEZXNjIHtcclxuICBjYXRlZ29yeTogc3RyaW5nLFxyXG4gIGltcG9ydGFuY2U/IDogbnVtYmVyLFxyXG4gIGNhdGVnb3J5X2Rlc2NyaXB0aW9uIDogc3RyaW5nLFxyXG4gIGlza2V5PyA6IGJvb2xlYW4sXHJcbiAgd29yZGluZGV4IDogYm9vbGVhbixcclxuICBleGFjdG1hdGNoOiBib29sZWFuLFxyXG4gIGNhdGVnb3J5X3N5bm9ueW1zPyA6IHN0cmluZ1tdO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJTW9kZWxIYW5kbGVSYXcge1xyXG4gICAgbW9uZ29vc2U6IG1vbmdvb3NlLk1vbmdvb3NlLFxyXG4gICAgbW9kZWxEb2NzOiB7IFtrZXk6IHN0cmluZ106IElNb2RlbERvYyB9LFxyXG4gICAgbW9kZWxFU2NoZW1hczogeyBba2V5OiBzdHJpbmddOiBJRXh0ZW5kZWRTY2hlbWEgfSxcclxuICAgIG1vbmdvTWFwczogeyBba2V5OiBzdHJpbmddOiBDYXRNb25nb01hcCB9LFxyXG59O1xyXG5cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSU1vZGVsIHtcclxuICAgIGRvbWFpbjogc3RyaW5nLFxyXG4gICAgbW9kZWxuYW1lPyA6IHN0cmluZyxcclxuICAgIGJpdGluZGV4IDogbnVtYmVyLFxyXG4gICAgZGVzY3JpcHRpb24/IDogc3RyaW5nLFxyXG4gLy8gICB0b29sOiBJVG9vbCxcclxuIC8vICAgdG9vbGhpZGRlbj86IGJvb2xlYW4sXHJcbiAgICBzeW5vbnltcz86IHsgW2tleTogc3RyaW5nXTogc3RyaW5nW10gfSxcclxuICAgIGNhdGVnb3J5RGVzY3JpYmVkIDogIHsgbmFtZSA6IHN0cmluZyxcclxuICAgICAgICBkZXNjcmlwdGlvbj8gOiBzdHJpbmcsXHJcbiAgICAgICAga2V5PyA6IHN0cmluZyB9W10sXHJcbiAgICBjYXRlZ29yeTogc3RyaW5nW10sXHJcbiAgICBjb2x1bW5zPyA6IHN0cmluZ1tdXHJcbiAgIC8vIHdvcmRpbmRleDogc3RyaW5nW10sXHJcbiAgIC8vICBleGFjdG1hdGNoPyA6IHN0cmluZ1tdLFxyXG4gICAgaGlkZGVuOiBzdHJpbmdbXVxyXG59O1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJTW9kZWxzIHtcclxuICAgIG1vbmdvSGFuZGxlIDogSU1vZGVsSGFuZGxlUmF3XHJcbiAgICBmdWxsIDoge1xyXG4gICAgICBkb21haW4gOiB7IFtrZXkgOiBzdHJpbmddIDoge1xyXG4gICAgICAgICAgZGVzY3JpcHRpb246IHN0cmluZyxcclxuICAgICAgICAgIGJpdGluZGV4IDogbnVtYmVyLFxyXG4gICAgICAgICAgY2F0ZWdvcmllcyA6IHsgW2tleSA6IHN0cmluZ10gOiBJQ2F0ZWdvcnlEZXNjIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICByYXdNb2RlbHMgOiB7IFtrZXkgOiBzdHJpbmddIDogSU1vZGVsfTtcclxuICAgIGRvbWFpbnM6IHN0cmluZ1tdLFxyXG4gICAgY2F0ZWdvcnk6IHN0cmluZ1tdLFxyXG4gICAgb3BlcmF0b3JzIDogeyBba2V5OiBzdHJpbmddIDogSU9wZXJhdG9yIH0sXHJcbiAgICBtUnVsZXM6IG1SdWxlW10sXHJcbiAgICBydWxlcyA6IFNwbGl0UnVsZXMsXHJcbiAgICByZWNvcmRzPzogYW55W11cclxuICAgIHNlZW5SdWxlcz86IHsgW2tleTogc3RyaW5nXTogbVJ1bGVbXSB9LFxyXG4gICAgbWV0YSA6IHtcclxuICAgICAgICAvLyBlbnRpdHkgLT4gcmVsYXRpb24gLT4gdGFyZ2V0XHJcbiAgICAgICAgdDMgOiB7IFtrZXk6IHN0cmluZ10gOiB7IFtrZXkgOiBzdHJpbmddIDogYW55IH19XHJcbiAgICB9XHJcbn1cclxuIl19
