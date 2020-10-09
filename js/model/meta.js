"use strict";
/**
 * Functionality managing the match models
 *
 * @file
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMetaFactory = exports.RELATION_isCategoryOf = exports.RELATION_hasCategory = exports.getStringArray = exports.AMeta = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tb2RlbC9tZXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7OztHQUlHOzs7QUFFSCxvQ0FBb0M7QUFFcEMsK0JBQStCO0FBRS9CLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztBQU03Qjs7R0FFRztBQUNILElBQUksU0FBUyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxXQUFXLENBQUM7QUFTN0QsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDO0FBQzFCLE1BQU0sVUFBVSxHQUFHLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUV0RCxNQUFhLEtBQUs7SUFHZCxZQUFZLElBQWEsRUFBRSxJQUFhO1FBQ3BDLElBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDN0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLENBQUM7U0FDM0M7UUFDRCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNyQixDQUFDO0lBQ0QsTUFBTTtRQUNGLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztJQUNyQixDQUFDO0lBQ0QsWUFBWTtRQUNSLE9BQU8sSUFBSSxDQUFDLElBQUksR0FBRyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztJQUM3QyxDQUFDO0lBQ0QsTUFBTTtRQUNGLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztJQUNyQixDQUFDO0NBQ0o7QUFuQkQsc0JBbUJDO0FBV0QsU0FBZ0IsY0FBYyxDQUFDLEdBQWE7SUFDeEMsT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLFVBQVMsS0FBYTtRQUNqQyxPQUFPLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUMxQixDQUFDLENBQUMsQ0FBQztBQUNQLENBQUM7QUFKRCx3Q0FJQztBQUVZLFFBQUEsb0JBQW9CLEdBQUcsYUFBYSxDQUFDO0FBQ3JDLFFBQUEscUJBQXFCLEdBQUcsY0FBYyxDQUFDO0FBRXBELFNBQVMsVUFBVSxDQUFDLENBQVU7SUFDbEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUMzQixJQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQ3JCLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxHQUFHLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQztLQUNyRDtJQUNELFFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ1QsS0FBSyxVQUFVO1lBQ1gsT0FBTyxjQUFjLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0MsS0FBSyxVQUFVO1lBQ1gsT0FBTyxjQUFjLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0MsS0FBSyxRQUFRO1lBQ1QsT0FBTyxjQUFjLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekM7WUFDSSxNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ25EO0FBQ2IsQ0FBQztBQUVELFNBQWdCLGNBQWM7SUFDNUIsT0FBTztRQUNELE1BQU0sRUFBRyxVQUFTLENBQVU7WUFDeEIsT0FBTyxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEMsQ0FBQztRQUNELFFBQVEsRUFBRyxVQUFTLENBQVU7WUFDMUIsT0FBTyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkMsQ0FBQztRQUNELFFBQVEsRUFBRyxVQUFTLENBQVU7WUFDMUIsT0FBTyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkMsQ0FBQztRQUNELFVBQVUsRUFBRyxVQUFVO0tBQzNCLENBQUM7QUFDTCxDQUFDO0FBYkQsd0NBYUMifQ==