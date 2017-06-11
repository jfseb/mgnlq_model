/**
 * Functionality to load data into a mongoose model
 * (c) gerd forstmann 2017
 *
 * @file
 */

//import * as intf from 'constants';
import * as debug from 'debugf';

var debuglog = debug('model');

//const loadlog = logger.logger('modelload', '');

import *  as IMatch from '../match/ifmatch';
//import * as InputFilterRules from '../match/rule';
//import * as Tools from '../match/tools';
import * as fs from 'fs';
import * as Meta from '../model/meta';
import * as FUtils from '../model/model';
import * as Utils from 'abot_utils';
//import * as CircularSer from 'abot_utils';
//import * as Distance from 'abot_stringdist';
import * as process from 'process';
import * as _ from 'lodash';
//import {Mongoose as Mongoose} from 'mongoose';
import * as mongoose from 'mongoose';
(mongoose as any).Promise = global.Promise;
/**
 * WATCH out, this instruments mongoose!
 */
require('mongoose-schema-jsonschema')(mongoose);
/**
 * the model path, may be controlled via environment variable
 */
//var envModelPath = process.env["ABOT_MODELPATH"] || "node_modules/abot_testmodel/testmodel";

export function cmpTools(a: IMatch.ITool, b: IMatch.ITool) {
  return a.name.localeCompare(b.name);
}

type IModel = IMatch.IModel;

// load the models

import * as Model from '../model/model';

import * as SchemaLoad from  './schemaload';

import * as MongoUtils from '../utils/mongo';

/**
 * Create Database (currently does not drop database before!)
 * @param mongoose {mongoose.Mongoose} mongoose instance ( or mock for testing)
 * @param mongoConnectionString {string}  connectionstring, method will connect and disconnect
 * (currenlty disconnnect only on success, subject to change)
 * @param modelPath {string} modepath to read data from
 */
export function createDB(mongoose : mongoose.Mongoose, mongoConnectionString : string, modelPath: string) : Promise<any> {
    if(modelPath[modelPath.length-1] === "\\" || modelPath[modelPath.length-1] === "/")  {
        throw new Error(`modelpath should be w.o. trailing "/" or "\\", was ${modelPath} `);
    }
 /**
 * WATCH out, this instruments mongoose!
 */
    require('mongoose-schema-jsonschema')(mongoose);

    return MongoUtils.openMongoose(mongoose, mongoConnectionString).then( () =>
        SchemaLoad.createDBWithModels(mongoose, modelPath)
    ).then( ()=> {
        var models = SchemaLoad.loadModelNames(modelPath);


        return Promise.all(models.map(modelName => loadModelData(mongoose,modelPath, modelName)));
    }).then( () => {
        MongoUtils.disconnectReset(mongoose);
    });
}





export function getModel(mongoose: any, modelName: string, modelPath: string) : Promise<mongoose.Model<any>> {
   if(mongoose.models[modelName]) {
       return Promise.resolve(mongoose.models[modelName]);
   }
   var Eschema = mongoose.models['mongonlq_eschema'];
   if(!Eschema) {
       throw new Error('this database does not have an eschema model initialized');
   }
   return SchemaLoad.makeModelFromDB(mongoose, modelName);
}

export function loadModelData(mongoose : any,  modelPath: string, modelName : string ) {
    var data = FUtils.readFileAsJSON( modelPath + '/' + modelName + '.data.json');
    var cnt = 0;
    // load the schema, either from database or from file system
    return getModel(mongoose, modelName, modelPath).then(oModel =>{
        console.log('** got a model' + oModel.modelName);
        return Promise.all(data.map( (oRecord,index) => {
            try {
                return SchemaLoad.validateDoc(oModel.modelName, oModel.schema, oRecord);
            } catch(err) {
                console.log('error validation object ' + modelName + ' record #' + index);
                throw err;
            }
        })).then( () => { return oModel;}
        )
    }).then( oModel2 => {
        return Promise.all(data.map( (oRecord,index) => SchemaLoad.validateDocMongoose(mongoose, oModel2.modelName, oModel2.schema, oRecord))).then( () => { return oModel2;})
    }).then( (oModel) => {
        return oModel.remove({}).then(() => oModel)
        .then( oModel => {
            return Promise.all(data.map(doc => {
              var oDoc = new oModel(doc);
                return oDoc.save().then( a => { ++cnt; }).catch(err => console.log("error inserting " + err + "  inserting : " + JSON.stringify(doc) + "" ));
            }));
         }).then(() => oModel );
    }).then(oModel => {
        console.log(`inserted ${cnt} documents for domain ${modelName}`);
    }).catch(err => {
        console.log(`error inserting documents for domain ${modelName}\n` + err + err.stack);
    });
}

(<any>mongoose).Promise = global.Promise;


function deleteAll(model : mongoose.Model<any>) {
  return model.collection.drop();
}