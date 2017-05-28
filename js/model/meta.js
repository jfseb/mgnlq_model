/**
 * Functionality managing the match models
 *
 * @file
 */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//import * as intf from 'constants';
const debug = require("debug");
var debuglog = debug('meta');
/**
 * the model path, may be controlled via environment variable
 */
var modelPath = process.env["ABOT_MODELPATH"] || "testmodel";
const separator = " -:- ";
const validTypes = ["relation", "category", "domain"];
class AMeta {
    constructor(type, name) {
        if (validTypes.indexOf(type) < 0) {
            throw new Error("Illegal Type " + type);
        }
        this.name = name;
        this.type = type;
    }
    toName() {
        return this.name;
    }
    toFullString() {
        return this.type + separator + this.name;
    }
    toType() {
        return this.type;
    }
}
exports.AMeta = AMeta;
function getStringArray(arr) {
    return arr.map(function (oMeta) {
        return oMeta.toName();
    });
}
exports.getStringArray = getStringArray;
exports.RELATION_hasCategory = "hasCategory";
exports.RELATION_isCategoryOf = "isCategoryOf";
function parseAMeta(a) {
    var r = a.split(separator);
    if (!r || r.length !== 2) {
        throw new Error("cannot parse " + a + " as Meta");
    }
    switch (r[0]) {
        case "category":
            return getMetaFactory().Category(r[1]);
        case "relation":
            return getMetaFactory().Relation(r[1]);
        case "domain":
            return getMetaFactory().Domain(r[1]);
        default:
            throw new Error("unknown meta type" + r[0]);
    }
}
function getMetaFactory() {
    return {
        Domain: function (a) {
            return new AMeta("domain", a);
        },
        Category: function (a) {
            return new AMeta("category", a);
        },
        Relation: function (a) {
            return new AMeta("relation", a);
        },
        parseIMeta: parseAMeta
    };
}
exports.getMetaFactory = getMetaFactory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tb2RlbC9tZXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7O0dBSUc7OztBQUVILG9DQUFvQztBQUVwQywrQkFBK0I7QUFFL0IsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBTTdCOztHQUVHO0FBQ0gsSUFBSSxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFdBQVcsQ0FBQztBQVM3RCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUM7QUFDMUIsTUFBTSxVQUFVLEdBQUcsQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBRXREO0lBR0ksWUFBWSxJQUFhLEVBQUUsSUFBYTtRQUNwQyxFQUFFLENBQUEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDNUMsQ0FBQztRQUNELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ3JCLENBQUM7SUFDRCxNQUFNO1FBQ0YsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDckIsQ0FBQztJQUNELFlBQVk7UUFDUixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztJQUM3QyxDQUFDO0lBQ0QsTUFBTTtRQUNGLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ3JCLENBQUM7Q0FDSjtBQW5CRCxzQkFtQkM7QUFXRCx3QkFBK0IsR0FBYTtJQUN4QyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFTLEtBQWE7UUFDakMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUMxQixDQUFDLENBQUMsQ0FBQztBQUNQLENBQUM7QUFKRCx3Q0FJQztBQUVZLFFBQUEsb0JBQW9CLEdBQUcsYUFBYSxDQUFDO0FBQ3JDLFFBQUEscUJBQXFCLEdBQUcsY0FBYyxDQUFDO0FBRXBELG9CQUFvQixDQUFVO0lBQ2xCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDM0IsRUFBRSxDQUFBLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxHQUFHLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBQ0QsTUFBTSxDQUFBLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNWLEtBQUssVUFBVTtZQUNYLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0MsS0FBSyxVQUFVO1lBQ1gsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQyxLQUFLLFFBQVE7WUFDVCxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pDO1lBQ0ksTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwRCxDQUFDO0FBQ2IsQ0FBQztBQUVEO0lBQ0UsTUFBTSxDQUFDO1FBQ0QsTUFBTSxFQUFHLFVBQVMsQ0FBVTtZQUN4QixNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLENBQUM7UUFDRCxRQUFRLEVBQUcsVUFBUyxDQUFVO1lBQzFCLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkMsQ0FBQztRQUNELFFBQVEsRUFBRyxVQUFTLENBQVU7WUFDMUIsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBQyxDQUFDLENBQUMsQ0FBQztRQUNuQyxDQUFDO1FBQ0QsVUFBVSxFQUFHLFVBQVU7S0FDM0IsQ0FBQztBQUNMLENBQUM7QUFiRCx3Q0FhQyJ9