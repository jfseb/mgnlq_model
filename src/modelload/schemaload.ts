/**
 * Functionality managing the match models
 *
 * @file
 */

//import * as intf from 'constants';
import * as debug from 'debugf';

var debuglog = debug('schemaload');

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
import * as mongoose from 'mongoose';

(mongoose as any).Promise = global.Promise;

/**
 * WATCH out, this instruments mongoose!
 */
require('mongoose-schema-jsonschema')(mongoose);
/**
 * the model path, may be controlled via environment variable
 */
var envModelPath = process.env["ABOT_MODELPATH"] || "node_modules/abot_testmodel/testmodel";

export function cmpTools(a: IMatch.ITool, b: IMatch.ITool) {
  return a.name.localeCompare(b.name);
}


type IModel = IMatch.IModel;

const ExtendedSchema_props = {
    "modelname": {
      "type": String,
      "trim": true,
      "required" : true
    },
    "domain": {
      "type": String,
      "trim": true,
      "required" : true
    },
    "mongoosemodelname": {
      "type": String,
      "trim": true,
      "required" : true
    },
    "collectionname": {
      "type": String,
      "trim": true,
      "required" : true
    },
    "props" : {},
    "index" : {}
};
const ExtendedSchema_index = {
    "modelname" : "text"
};



// load the models

export function loadModelNames(modelPath : string) : string[] {
  modelPath = modelPath || envModelPath;
  var mdls = FUtils.readFileAsJSON('./' + modelPath + '/models.json');
  mdls.forEach(name => {
    if(name !== makeMongoCollectionName(name)) {
        throw new Error('bad modelname, must terminate with s and be lowercase');
    }
  })
  return mdls;
}

export interface IRawSchema {
    props: any[],
    index : any
}

export interface IModelDocCategoryRec {
    category : string,
    category_description : string,
    QBEColumnProps : {
        "defaultWidth": number,
        "QBE": boolean,
        "LUNRIndex": boolean
      },
      "category_synonyms": string[],
    wordindex : boolean,
    exactmatch: boolean
};

export interface IModelDoc {
    domain : string,
    modelname? : string,
    collectionname? : string,
    domain_description : string
    _categories : IModelDocCategoryRec[],
    columns: string[],
    domain_synonyms : string[]

}

export interface IExtendedSchema extends IRawSchema{
    domain : string,
    modelname : string,
    mongoosemodelname : string,
    collectionname : string
};

export function mapType(val : string) : any {
    if(val === "String") {
        return String;
    }
    if(val === "Boolean") {
        return Boolean;
    }
    if(val === "Number") {
        return Number;
    }
    throw new Error(" illegal type " + val + " expected String, Boolean, Number, ...");
}

export function replaceIfTypeDeleteM(obj : any, val : any, key : string) {
    if(key.substr(0,3) === "_m_") {
        delete obj[key];
        return;
    };
    if(key === "type" && typeof val === "string") {
        var r = mapType(val);
        obj[key] = r;
    }
}

function traverseExecuting(obj, fn ) {
    _.forIn(obj, function (val, key) {
    //    console.log(val + " -> " + key + " ");
        fn(obj,val,key);
        if (_.isArray(val)) {
            val.forEach(function(el) {
                if (_.isObject(el)) {
                    traverseExecuting(el,fn);
                }
            });
        }
        if (_.isObject(val)) {
            traverseExecuting(obj[key],fn);
        }
    });
}

function traverseReplacingType(obj) {
    return traverseExecuting(obj,replaceIfTypeDeleteM);
    /*
    _.forIn(obj, function (val, key) {
    //    console.log(val + " -> " + key + " ");
        replaceIfTypeDeleteM(obj,val,key);
        if (_.isArray(val)) {
            val.forEach(function(el) {
                if (_.isObject(el)) {
                    traverseReplacingType(el);
                }
            });
        }
        if (_.isObject(val)) {
            traverseReplacingType(obj[key]);
        }
    });
    */
}

export function typeProps(a : any) : any {
   var aCloned = _.cloneDeep(a);
   //console.log(JSON.stringify(aCloned, undefined, 2));
   traverseReplacingType(aCloned);
   return aCloned;
}

export function makeMongooseSchema( extSchema : IExtendedSchema , mongo? : any) : mongoose.Schema {
    var typedProps = typeProps(extSchema.props);
    var mongo = mongo || mongoose;
     var schema = mongo.Schema(extSchema.props); //{ props : extSchema.props, index : extSchema.index  });
     schema.index(extSchema.index);
     return schema;
}

export function loadExtendedMongooseSchema(modelPath: string, modelName : string): IExtendedSchema {
  var schemaSer = FUtils.readFileAsJSON('./' + modelPath + '/' + modelName + '.model.mongooseschema.json');
  schemaSer.modelName = modelName;
  return schemaSer;
}

export function loadModelDoc(modelPath: string, modelName : string): IModelDoc {
  var docSer = FUtils.readFileAsJSON('./' + modelPath + '/' + modelName + '.model.doc.json');
  docSer.modelname = modelName;
  return docSer;
}

var aPromise = global.Promise;

export interface IModelRec  {
    collectionName : string,
    model : mongoose.Model<any>,
    schema : mongoose.Schema
};


export function augmentMongooseSchema( modelDoc : IModelDoc, schemaRaw : IRawSchema) : IExtendedSchema {
    debuglog( ()=>'augmenting for ' + modelDoc.modelname);
    var res = { domain : modelDoc.domain,
        modelname : modelDoc.modelname,
        mongoosemodelname : makeMongooseModelName(modelDoc.modelname),
        collectionname : makeMongoCollectionName(modelDoc.modelname)
     } as IExtendedSchema;
    return (Object as any).assign(res, schemaRaw);
}

/**
 * return a modelname without a traling s
 * @param collectionName
 */
export function makeMongooseModelName(collectionName : string) : string {
    if(collectionName !== collectionName.toLowerCase()) {
        throw new Error('expect lowercase, was ' + collectionName);
    }
    if (collectionName.charAt(collectionName.length-1) === 's') {
        return collectionName.substring(0,collectionName.length-1);
    }
    throw new Error('expected name with trailing s');
}

/**
 * returns a mongoose collection name
 * @param modelName
 */
export function makeMongoCollectionName(modelName : string) : string {
    if(modelName !== modelName.toLowerCase()) {
        throw new Error('expect lowercase, was ' + modelName);
    }
    if (modelName.charAt(modelName.length-1) !== 's') {
        return modelName + 's';
    }
    return modelName;
}

export function getExtendedSchema(mongoose : any) : mongoose.Schema {
  var extendSchema = mongoose.Schema(ExtendedSchema_props);
    //console.log("now extended schema");
    extendSchema.index(ExtendedSchema_index);
    return extendSchema;
    //console.log('creating model 2');
}

export function getExtendedSchemaModel(mongoose : mongoose.Mongoose) : mongoose.Model<any> {
    var mgModelName = makeMongooseModelName(MongoNLQ.COLL_EXTENDEDSCHEMAS)
    if(mongoose.modelNames().indexOf(mgModelName) >= 0) {
        return mongoose.model(mgModelName);
    }
    var extendSchema = getExtendedSchema(mongoose);
    var modelES = mongoose.model(makeMongooseModelName(MongoNLQ.COLL_EXTENDEDSCHEMAS), extendSchema);
    return modelES;
}


export function getModelDocModel(mongoose : mongoose.Mongoose) : mongoose.Model<any> {
    var metaDoc = FUtils.readFileAsJSON('./resources/meta/metamodels.model.doc.json');
    metaDoc.modelname = MongoNLQ.MODELNAME_METAMODELS;
    var schemaSer2 = loadExtendedMongooseSchema('resources/meta',MongoNLQ.MODELNAME_METAMODELS);
    var schemaSer = augmentMongooseSchema(metaDoc, schemaSer2);
    var schema = makeMongooseSchema(schemaSer, mongoose);
    var mongooseModelName = makeMongooseModelName(MongoNLQ.COLL_METAMODELS);
    if (mongoose.modelNames().indexOf(mongooseModelName) >= 0) {
        return mongoose.model(mongooseModelName);
    }
    var modelDoc = mongoose.model(makeMongooseModelName(MongoNLQ.COLL_METAMODELS), schema );
    var oFind = modelDoc.find;
     return modelDoc;
}

export function upsertMetaModel(mongoose : any) {
    var metaDoc = FUtils.readFileAsJSON('./resources/meta/metamodels.model.doc.json');
    debuglog( ()=> "here metaDoc to insert as loaded" + JSON.stringify(metaDoc));
    metaDoc.modelname = MongoNLQ.MODELNAME_METAMODELS;
    var schemaSer2 = loadExtendedMongooseSchema('resources/meta',MongoNLQ.MODELNAME_METAMODELS);
    var schemaSer = augmentMongooseSchema(metaDoc, schemaSer2);

    debuglog( ()=>'here schemaser' + JSON.stringify(schemaSer,undefined,2));
    (mongoose as any).Promise = global.Promise;
    var schema = makeMongooseSchema(schemaSer, mongoose);
    //console.log("make schema 1");
    //var extendSchema = mongoose.Schema(ExtendedSchema_props);
    ///console.log("now extended schema");
    //extendSchema.index(ExtendedSchema_index);
    //console.log("now document ..." + JSON.stringify(extendSchema,undefined,2));
    var modelDoc = mongoose.model(makeMongooseModelName(MongoNLQ.COLL_METAMODELS), schema );
    //console.log('creating model 2');
    var modelES = getExtendedSchemaModel(mongoose); //mongoose.model(makeMongooseModelName(MongoNLQ.COLL_EXTENDEDSCHEMAS), extendSchema);

    debuglog( ()=> "here metaDoc to insert" + JSON.stringify(metaDoc));
    debuglog( ()=>"here schemaser to insert" + JSON.stringify(schemaSer));
    return Promise.all([
        validateDocVsMongooseModel(modelDoc, metaDoc).then( ()=>
            modelDoc.findOneAndUpdate( { modelname :  MongoNLQ.MODELNAME_METAMODELS}, metaDoc, {
                upsert : true
            })
        ),
        validateDocVsMongooseModel(modelES,schemaSer).then( ()=>
            modelES.findOneAndUpdate( { modelname :  MongoNLQ.MODELNAME_METAMODELS}, schemaSer, {
                upsert : true
            })
        )]); //.then( () => process.exit(-1));
}


export function createDBWithModels(mongoose : mongoose.Mongoose , modelPath : string) : Promise<any> {
    return upsertMetaModel(mongoose).then(
        upsertModels.bind(undefined, mongoose, modelPath)
    );
}


//export function getModelNames(model : mongoose.model, )

export function removeOthers(mongoose : any, model: mongoose.Model<any>, retainedNames : string[] ) : Promise<any> {
    //console.log('here collectionname' + Object.keys(model));
    //console.log('here collectionname' + model.collectionname);
    return (model.aggregate({$project : { modelname : 1 }}) as any).then( (r) =>
        r.map(o => (o as any).modelname as string)
    ).then( (modelnames : any) => {
        debuglog(" present models " + modelnames.length + ' ' + modelnames);
        var delta = _.difference(modelnames, retainedNames);
        debuglog(' spurious models' + delta.length + ' ' + delta);
        if(delta.length === 0) {
            return Promise.resolve(true);
        }
        return Promise.all(delta.map( modelname => (model.remove as any)({ modelname : modelname})));
    });
}
var SchemaOperators = { operators : {}, synonyms : {}};

var SchemaFillers = { fillers : [{
    type : String
}]
};

export function getOrCreateModelFillers(mongoose: mongoose.Mongoose) : mongoose.Model<any> {
    if(mongoose.modelNames().indexOf('filler') >= 0) {
        return mongoose.model('filler');
    } else {
        return mongoose.model('filler', new mongoose.Schema(SchemaFillers));
    }
}

export function getOrCreateModelOperators(mongoose: mongoose.Mongoose) : mongoose.Model<any> {
    if(mongoose.modelNames().indexOf('operator') >= 0) {
        return mongoose.model('operator');
    } else {
        return mongoose.model('operator', new mongoose.Schema(SchemaOperators));
    }
}

export function getFillersFromDB( mongoose : mongoose.Mongoose) : Promise<any> {
    var fillerModel = getOrCreateModelFillers(mongoose);
    return fillerModel.find({}).lean().exec().then( (vals : any[]) => {
        if(vals.length !== 1) {
            throw new Error('expected exactly one operators entry ');
        };
        return vals[0];
    });
}


export function getOperatorsFromDB( mongoose : mongoose.Mongoose) : Promise<any> {
    var operatorModel = getOrCreateModelOperators(mongoose);
    return operatorModel.find({}).lean().exec().then( (vals : any[]) => {
        if(vals.length !== 1) {
            throw new Error('expected exactly one operators entry ');
        };
        return vals[0];
    });
}

export function getExtendSchemaDocFromDB(mongoose : mongoose.Mongoose, modelName : string) : Promise<IExtendedSchema> {
    var mongooseModelName = makeMongooseModelName(modelName);
    var model_ES = mongoose.model(MongooseNLQ.MONGOOSE_MODELNAME_EXTENDEDSCHEMAS);
    var res = model_ES.find({ modelname : modelName}).lean().exec().then((doc) =>
    {   debuglog( ()=> ` loaded Es doc ${modelName} returned ${(doc as any).length} docus from db : `
        + (doc as any)[0].modelname + `` + (doc as any)[0].collectionname );
        debuglog(() => 'here the result' + JSON.stringify(doc));
        if((doc as any).length === 0) {
            throw Error('Model ' + modelName + ' is not present in ' + MongooseNLQ.MONGOOSE_MODELNAME_EXTENDEDSCHEMAS);
        }
        return doc[0];
    });
    //console.log('res' + typeof res);
    return res;
 //   return Promise.reject('model ' + modelName + ' cannot be found on db');
}


export function getModelDocFromDB(mongoose : mongoose.Mongoose, modelName : string) : Promise<IModelDoc> {
    var mongooseModelName = makeMongooseModelName(modelName);
    var model_ES = mongoose.model(MongooseNLQ.MONGOOSE_MODELNAME_EXTENDEDSCHEMAS);
    return makeModelFromDB(mongoose, MongoNLQ.MODELNAME_METAMODELS).then(
        (model) => model.find({ modelname : modelName}).lean().exec()
    ).then((doc) =>
        {
            debuglog( ()=> ' loaded Model doc ${modelName} returned ${(doc as any).length} docus from db : '
            + (doc as any)[0].modelname + ` ` + (doc as any)[0].collectionname );
            debuglog('here the result' + JSON.stringify(doc));
            if((doc as any).length === 0) {
                throw Error('Model ' + modelName + ' is not present in ' + MongooseNLQ.MONGOOSE_MODELNAME_EXTENDEDSCHEMAS);
            }
            return doc[0];
        }
    );
 //   return Promise.reject('model ' + modelName + ' cannot be found on db');
}

export function makeModelFromDB(mongoose : mongoose.Mongoose, modelName : string) : Promise<mongoose.Model<any>> {
    var mongooseModelName = makeMongooseModelName(modelName);
    if(mongoose.modelNames().indexOf(mongooseModelName) >= 0) {
        return Promise.resolve(mongoose.model(mongooseModelName));
    }
    debuglog( ()=>'here present modelnames: ' + mongoose.modelNames().join('\n'));
    var model_ES = mongoose.model(MongooseNLQ.MONGOOSE_MODELNAME_EXTENDEDSCHEMAS);
    debuglog( ()=>'here modelname:' + modelName);
    var res = model_ES.find({ modelname : modelName}).lean().exec().then((doc) =>
    {  debuglog( ()=>` loaded Model doc ${modelName} returned ${(doc as any).length} docus from db : `
            + (doc as any)[0].modelname + ` ` + (doc as any)[0].collectionname );
        debuglog( ()=>'here the result' + JSON.stringify(doc));
        if((doc as any).length === 0) {
            throw Error('Model ' + modelName + ' is not present in ' + MongooseNLQ.MONGOOSE_MODELNAME_EXTENDEDSCHEMAS);
        }
        debuglog(()=> 'creating schema for ' + modelName + ' from ');
        //  + JSON.stringify(doc[0]));

        var schema = makeMongooseSchema(doc[0] as IExtendedSchema,mongoose);
        if(mongoose.modelNames().indexOf(mongooseModelName) >= 0) {
            return Promise.resolve(mongoose.model(mongooseModelName));
        }
        var model = mongoose.model(mongooseModelName, schema);
        debuglog( ()=> 'returning model: ' + modelName + ` `+ typeof model);
        return Promise.resolve(model);
    });
    //console.log('res' + typeof res);
    return res;
 //   return Promise.reject('model ' + modelName + ' cannot be found on db');
}

export function uploadFillers(mongoose: mongoose.Mongoose, modelPath: string) : Promise<any> {
    var modelFiller = getOrCreateModelFillers(mongoose);
    return modelFiller.remove({}).then(() => {
    var fillers = FUtils.readFileAsJSON('./' + modelPath + '/filler.json');
        return new modelFiller({ fillers: fillers}).save();
    });
}
export function uploadOperators(mongoose: mongoose.Mongoose, modelPath: string) : Promise<any> {
    var modelFiller = getOrCreateModelOperators(mongoose);
    return modelFiller.remove({}).then(() => {
    var operators = FUtils.readFileAsJSON('./' + modelPath + '/operators.json');
    return new modelFiller(operators).save();
    });
}



export function upsertModels(mongoose : mongoose.Mongoose, modelpath: string)  : Promise<any> {
    var modelNames = loadModelNames(modelpath);
    var model_ES = mongoose.model(MongooseNLQ.MONGOOSE_MODELNAME_EXTENDEDSCHEMAS);
    var model_Doc = mongoose.model(MongooseNLQ.MONGOOSE_MODELNAME_METAMODELS);
    debuglog('here modelnames ' + modelNames);
    return removeOthers(mongoose, model_ES, [MongoNLQ.MODELNAME_METAMODELS] ).then( ()=>
        Promise.all(modelNames.map( (modelName) => {
            debuglog('upserting  ' + modelName);
            var modelDoc = loadModelDoc(modelpath, modelName);
            var schemaSer = loadExtendedMongooseSchema(modelpath, modelName);
            var schemaFull = augmentMongooseSchema(modelDoc, schemaSer);
            debuglog(`upserting eschema ${modelName}  with modelDoc` + JSON.stringify(schemaFull));
            var p1 = model_ES.findOneAndUpdate( { modelname : modelName }, schemaFull, {
                upsert : true
            });
            debuglog(`upserting model ${modelName}  with modelDoc` + JSON.stringify(modelDoc));
            var p2 = model_Doc.findOneAndUpdate( { modelname : modelName }, modelDoc, {
                upsert : true
            });
            return Promise.all([p1,p2]);
        })
        )
    ).then( () => {
        var modelNamesExtended = modelNames.slice();
        modelNamesExtended.push(MongoNLQ.MODELNAME_METAMODELS);
        debuglog('removing spurious models');
        return Promise.all([
            removeOthers(mongoose, model_ES, modelNamesExtended ),
            removeOthers(mongoose, model_Doc, modelNamesExtended )
        ]);
    }).then( () => {
         return Promise.all([
            uploadFillers(mongoose,modelpath),
            uploadOperators(mongoose, modelpath)
         ])
    })
}

export function hasMetaCollection(mongoose : any) : Promise<boolean> {
    return new Promise(function(reject, resolve) {
        mongoose.connection.db.listCollections().toArray((err ,names ) =>
        {
            if(err) {
                reject(err);
                return;
            }
            if(names.indexOf(MongoNLQ.COLL_METAMODELS) >= 0) {
                resolve(true);
            }
            reject("domain not loaded");
        });
    });
}

export const MongoNLQ = {
    MODELNAME_METAMODELS : "metamodels",
    COLL_METAMODELS : "metamodels",
    COLL_EXTENDEDSCHEMAS : "mongonlq_eschemas"
};


export const MongooseNLQ = {
    MONGOOSE_MODELNAME_EXTENDEDSCHEMAS : makeMongooseModelName(MongoNLQ.COLL_EXTENDEDSCHEMAS),
    MONGOOSE_MODELNAME_METAMODELS : makeMongooseModelName(MongoNLQ.COLL_METAMODELS)
};

export function getModelRecByModelName(mongoose : any, modelPath: string, modelName : string) : Promise<IModelRec>  {
    // do we have the meta collection in the db?
    return Promise.all([
        mongoose.connection.db[MongoNLQ.COLL_METAMODELS].find({ modelName : modelName}),
        mongoose.connection.db[MongoNLQ.COLL_EXTENDEDSCHEMAS].find({ modelName : modelName})
    ]).then(res => {
        var modelDoc = res[0];
        var extendedSchema = res[1];
        var schema = makeMongooseSchema(extendedSchema);
        var model = mongoose.model(modelDoc.collectionName, schema);
        return {
            collectionName : modelDoc.collectionName,
            modelDoc : modelDoc,
            schema : makeMongooseSchema(extendedSchema),
            model : model
        } as IModelRec;
    });
}

/*
    hasMetaCollection(mongoose).then( () => {
        mongoose.connection.db.mgnlq_domains.find( {
            modelName : modelName
        }).then( doc => {
            if (doc.schema)
        });
    });
    mongoose.connection.db.listCollections().toArray((err ,names ) =>
    {
        if(names.indexOf("mgnlq_domains") >= 0) {

        }
    });
}
*/


export function validateDocMongoose(mongoose : mongoose.Mongoose, collectionname, schema : mongoose.Schema, doc : any ) {
    var DocModel;
    //console.log('schema ' + JSON.stringify(schema));
    if(mongoose.modelNames().indexOf(collectionname) >= 0) {
        DocModel = mongoose.model(collectionname);
    } else {
        DocModel = mongoose.model(collectionname, schema);

    }
    return validateDocVsMongooseModel(DocModel, doc);
}

export function validateDocVsMongooseModel(model, doc : any) {
    return new Promise<any>((resolve,reject) => {
        var theDoc = new model(doc);
        theDoc.validate((err) =>  {
            if (err) {
                //console.log(err);
                reject(err);
            }
        else {
            resolve(theDoc);
        }
        });
    });
}

export function validateDoc(collectionname: string, schema : mongoose.Schema, doc : any) {
  var jsonSchemaR = (schema as any).jsonSchema();
  var jsonSchema = _.cloneDeep(jsonSchemaR);
  traverseExecuting(jsonSchema, function(obj,val,key) {
    if(key === 'properties' && obj.type === 'object') {
        //console.log('augmenting schema');
        obj.additionalProperties = false;
    }
});

  //console.log(JSON.stringify(jsonSchema,undefined,2));
  var Validator = require('jsonschema').Validator;
  var v = new Validator();
  //console.log(JSON.stringify(jsonSchema,undefined,2));
  var valresult = v.validate(doc,jsonSchema);
  if(valresult.errors.length) {
      throw new Error("Schema validation failed : " + JSON.stringify(valresult.errors,undefined,2));
  }
  return true;
}