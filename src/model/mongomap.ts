/**
 * Functionality to map the "flat" categories model to a nested document
 *
 * @file
 */


//import * as intf from 'constants';
import * as debug from 'debug';

var debuglog = debug('mongomap');

import * as ISchema from '../modelload/schemaload';
//const loadlog = logger.logger('modelload', '');

import *  as IMatch from '../match/ifmatch';
import * as InputFilterRules from '../match/rule';
//import * as Tools from '../match/tools';
import * as fs from 'fs';
import * as Meta from './meta';
import * as Utils from 'abot_utils';
import * as CircularSer from 'abot_utils';
import * as Distance from 'abot_stringdist';
import * as process from 'process';
import * as _ from 'lodash';

type CatMongoMap = IMatch.CatMongoMap;
/**
 * the model path, may be controlled via environment variable
 */
var envModelPath = process.env["ABOT_MODELPATH"] || "node_modules/abot_testmodel/testmodel";



function traverseExecutingContext(obj, context) {
    _.forIn(obj, function (val, key) {
        // console.log(key + " -> " + val + " ");
        context.visit(obj,key, val);
        if (_.isArray(val)) {
            context.enterArray(key,val);
            val.forEach(function(el) {
                if (_.isObject(el)) {
                    traverseExecutingContext(el, context);
                }
            });
            context.leaveArray(key,val);
           // console.log('leaving array key' + key  + " " + JSON.stringify(val));
        }
        else if (_.isObject(val)) {
          //  if( _.isArray(val) && _.isObject(val)) {
          //&&      console.log('ABCXASDFS');
          //  };
         //   console.log('is also object' + JSON.stringify(val));
            context.enterObject(key, val);
            traverseExecutingContext(val,context);
            context.leaveObject(key,val);
        }
    });
}

export function collectCategories(eSchemaProps : any) {
    var oContext = {
        res : {},
        plainPath : [],
        currentPath : [],
        enterObject : function(key: string, val: any) {
            this.currentPath.push(key);
            this.plainPath.push(key);
        },
        visit: function(obj : any, key: string, val: any) {
            if(key === '_m_category') {
                this.res[val] = {
                    path : this.currentPath.slice(),
                    fullpath : this.plainPath.join('.')
                }
            }
        },
        leaveObject : function(key: string, val: any) {
            this.currentPath.pop();
            this.plainPath.pop();
        },
        enterArray : function(key : string, val: any) {
            this.enterObject(key, val);
            this.currentPath.push('[]');
        },
        leaveArray : function(key : string, val: any) {
            this.leaveObject(key, val);
            this.currentPath.pop();
        }
    }
    traverseExecutingContext(eSchemaProps, oContext );
    return oContext.res;
}


export function makeMongoMap(oDoc : ISchema.IModelDoc, eSchema : ISchema.IExtendedSchema ) : IMatch.CatMongoMap {
    var oMongoMap = {} as CatMongoMap;
    debuglog( () => 'creating mongomap for ' + JSON.stringify(eSchema.modelname, undefined, 2) + ' and ' + oDoc.modelname );
    debuglog( () =>'creating mongomap for doc ' + JSON.stringify(oDoc, undefined, 2));
    debuglog( () =>'colleting from eSchema.props' + JSON.stringify(eSchema.props,undefined,2));
    var res = collectCategories(eSchema.props);
    oDoc._categories.forEach(cat => {
        // cross check
        if(!res[cat.category]) {
            console.log('here present keys' + Object.keys(res).sort().join("; "));
            console.log(`category ${cat.category} is not in eSchema`); // + JSON.stringify(eSchema,undefined,2)
            console.log(`document has `+ oDoc._categories.map(cat => cat.category).join('; '));
//process.exit(-1);
           console.log(`category "${cat.category}" is not in eSchema for ${oDoc.modelname} + ${eSchema.modelname} : `
            + "=====Schema:\n"+ JSON.stringify(eSchema,undefined,2).substring(0,400)
            + "\n========oDoc: \n" + JSON.stringify(oDoc,undefined,2).substring(0,400));
            process.exit(-1);
            throw new Error(`category ${cat.category} is not in eSchema for ${oDoc.modelname} + ${eSchema.modelname} : `
            + JSON.stringify(eSchema,undefined,2).substring(0,200)
            + "\n=========== " + JSON.stringify(oDoc,undefined,2).substring(0,400));
        }
    });
    return res;
}

