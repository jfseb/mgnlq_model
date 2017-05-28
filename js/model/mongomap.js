/**
 * Functionality to map the "flat" categories model to a nested document
 *
 * @file
 */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
;
//import * as intf from 'constants';
const debug = require("debug");
var debuglog = debug('mongomap');
const process = require("process");
const _ = require("lodash");
/**
 * the model path, may be controlled via environment variable
 */
var envModelPath = process.env["ABOT_MODELPATH"] || "node_modules/abot_testmodel/testmodel";
function traverseExecutingContext(obj, context) {
    _.forIn(obj, function (val, key) {
        // console.log(key + " -> " + val + " ");
        context.visit(obj, key, val);
        if (_.isArray(val)) {
            context.enterArray(key, val);
            val.forEach(function (el) {
                if (_.isObject(el)) {
                    traverseExecutingContext(el, context);
                }
            });
            context.leaveArray(key, val);
            // console.log('leaving array key' + key  + " " + JSON.stringify(val));
        }
        else if (_.isObject(val)) {
            //  if( _.isArray(val) && _.isObject(val)) {
            //&&      console.log('ABCXASDFS');
            //  };
            //   console.log('is also object' + JSON.stringify(val));
            context.enterObject(key, val);
            traverseExecutingContext(val, context);
            context.leaveObject(key, val);
        }
    });
}
function collectCategories(eSchemaProps) {
    var oContext = {
        res: {},
        plainPath: [],
        currentPath: [],
        enterObject: function (key, val) {
            this.currentPath.push(key);
            this.plainPath.push(key);
        },
        visit: function (obj, key, val) {
            if (key === '_m_category') {
                this.res[val] = {
                    path: this.currentPath.slice(),
                    fullpath: this.plainPath.join('.')
                };
            }
        },
        leaveObject: function (key, val) {
            this.currentPath.pop();
            this.plainPath.pop();
        },
        enterArray: function (key, val) {
            this.enterObject(key, val);
            this.currentPath.push('[]');
        },
        leaveArray: function (key, val) {
            this.leaveObject(key, val);
            this.currentPath.pop();
        }
    };
    traverseExecutingContext(eSchemaProps, oContext);
    return oContext.res;
}
exports.collectCategories = collectCategories;
function makeMongoMap(oDoc, eSchema) {
    var oMongoMap = {};
    debuglog(() => 'creating mongomap for ' + JSON.stringify(eSchema.modelname, undefined, 2) + ' and ' + oDoc.modelname);
    debuglog(() => 'creating mongomap for doc ' + JSON.stringify(oDoc, undefined, 2));
    debuglog(() => 'colleting from eSchema.props' + JSON.stringify(eSchema.props, undefined, 2));
    var res = collectCategories(eSchema.props);
    oDoc._categories.forEach(cat => {
        // cross check
        if (!res[cat.category]) {
            console.log('here present keys' + Object.keys(res).sort().join("; "));
            console.log(`category ${cat.category} is not in eSchema`); // + JSON.stringify(eSchema,undefined,2)
            console.log(`document has ` + oDoc._categories.map(cat => cat.category).join('; '));
            //process.exit(-1);
            console.log(`category "${cat.category}" is not in eSchema for ${oDoc.modelname} + ${eSchema.modelname} : `
                + "=====Schema:\n" + JSON.stringify(eSchema, undefined, 2).substring(0, 400)
                + "\n========oDoc: \n" + JSON.stringify(oDoc, undefined, 2).substring(0, 400));
            process.exit(-1);
            throw new Error(`category ${cat.category} is not in eSchema for ${oDoc.modelname} + ${eSchema.modelname} : `
                + JSON.stringify(eSchema, undefined, 2).substring(0, 200)
                + "\n=========== " + JSON.stringify(oDoc, undefined, 2).substring(0, 400));
        }
    });
    return res;
}
exports.makeMongoMap = makeMongoMap;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uZ29tYXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kZWwvbW9uZ29tYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7R0FJRzs7O0FBT0YsQ0FBQztBQUVGLG9DQUFvQztBQUNwQywrQkFBK0I7QUFFL0IsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBYWpDLG1DQUFtQztBQUNuQyw0QkFBNEI7QUFDNUI7O0dBRUc7QUFDSCxJQUFJLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLElBQUksdUNBQXVDLENBQUM7QUFJNUYsa0NBQWtDLEdBQUcsRUFBRSxPQUFPO0lBQzFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLFVBQVUsR0FBRyxFQUFFLEdBQUc7UUFDM0IseUNBQXlDO1FBQ3pDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM1QixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQixPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBQyxHQUFHLENBQUMsQ0FBQztZQUM1QixHQUFHLENBQUMsT0FBTyxDQUFDLFVBQVMsRUFBRTtnQkFDbkIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2pCLHdCQUF3QixDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDMUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUMsR0FBRyxDQUFDLENBQUM7WUFDN0IsdUVBQXVFO1FBQzFFLENBQUM7UUFDRCxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDekIsNENBQTRDO1lBQzVDLG1DQUFtQztZQUNuQyxNQUFNO1lBQ1AseURBQXlEO1lBQ3RELE9BQU8sQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzlCLHdCQUF3QixDQUFDLEdBQUcsRUFBQyxPQUFPLENBQUMsQ0FBQztZQUN0QyxPQUFPLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBQyxHQUFHLENBQUMsQ0FBQztRQUNqQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDO0FBRUQsMkJBQWtDLFlBQWtCO0lBQ2hELElBQUksUUFBUSxHQUFHO1FBQ1gsR0FBRyxFQUFHLEVBQUU7UUFDUixTQUFTLEVBQUcsRUFBRTtRQUNkLFdBQVcsRUFBRyxFQUFFO1FBQ2hCLFdBQVcsRUFBRyxVQUFTLEdBQVcsRUFBRSxHQUFRO1lBQ3hDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzNCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzdCLENBQUM7UUFDRCxLQUFLLEVBQUUsVUFBUyxHQUFTLEVBQUUsR0FBVyxFQUFFLEdBQVE7WUFDNUMsRUFBRSxDQUFBLENBQUMsR0FBRyxLQUFLLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZCLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUc7b0JBQ1osSUFBSSxFQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFO29CQUMvQixRQUFRLEVBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO2lCQUN0QyxDQUFBO1lBQ0wsQ0FBQztRQUNMLENBQUM7UUFDRCxXQUFXLEVBQUcsVUFBUyxHQUFXLEVBQUUsR0FBUTtZQUN4QyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDekIsQ0FBQztRQUNELFVBQVUsRUFBRyxVQUFTLEdBQVksRUFBRSxHQUFRO1lBQ3hDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzNCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hDLENBQUM7UUFDRCxVQUFVLEVBQUcsVUFBUyxHQUFZLEVBQUUsR0FBUTtZQUN4QyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUMzQixJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzNCLENBQUM7S0FDSixDQUFBO0lBQ0Qsd0JBQXdCLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBRSxDQUFDO0lBQ2xELE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDO0FBQ3hCLENBQUM7QUFoQ0QsOENBZ0NDO0FBR0Qsc0JBQTZCLElBQXdCLEVBQUUsT0FBaUM7SUFDcEYsSUFBSSxTQUFTLEdBQUcsRUFBaUIsQ0FBQztJQUNsQyxRQUFRLENBQUUsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxHQUFHLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFFLENBQUM7SUFDeEgsUUFBUSxDQUFFLE1BQUssNEJBQTRCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEYsUUFBUSxDQUFFLE1BQUssOEJBQThCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNGLElBQUksR0FBRyxHQUFHLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMzQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHO1FBQ3hCLGNBQWM7UUFDZCxFQUFFLENBQUEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUN0RSxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksR0FBRyxDQUFDLFFBQVEsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLHdDQUF3QztZQUNuRyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsR0FBRSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQy9GLG1CQUFtQjtZQUNSLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxHQUFHLENBQUMsUUFBUSwyQkFBMkIsSUFBSSxDQUFDLFNBQVMsTUFBTSxPQUFPLENBQUMsU0FBUyxLQUFLO2tCQUN2RyxnQkFBZ0IsR0FBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxHQUFHLENBQUM7a0JBQ3RFLG9CQUFvQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDNUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pCLE1BQU0sSUFBSSxLQUFLLENBQUMsWUFBWSxHQUFHLENBQUMsUUFBUSwwQkFBMEIsSUFBSSxDQUFDLFNBQVMsTUFBTSxPQUFPLENBQUMsU0FBUyxLQUFLO2tCQUMxRyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxHQUFHLENBQUM7a0JBQ3BELGdCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDNUUsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxDQUFDLEdBQUcsQ0FBQztBQUNmLENBQUM7QUF2QkQsb0NBdUJDIn0=