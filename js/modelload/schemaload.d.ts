/// <reference types="mongoose" />
import * as IMatch from '../match/ifmatch';
import * as mongoose from 'mongoose';
export declare function cmpTools(a: IMatch.ITool, b: IMatch.ITool): number;
export declare function loadModelNames(modelPath: string): string[];
export interface IRawSchema {
    props: any[];
    index: any;
}
export interface IModelDocCategoryRec {
    category: string;
    category_description: string;
    QBEColumnProps: {
        "defaultWidth": number;
        "QBE": boolean;
        "LUNRIndex": boolean;
    };
    "category_synonyms": string[];
    wordindex: boolean;
    exactmatch: boolean;
}
export interface IModelDoc {
    domain: string;
    modelname?: string;
    collectionname?: string;
    domain_description: string;
    _categories: IModelDocCategoryRec[];
    columns: string[];
    domain_synonyms: string[];
}
export interface IExtendedSchema extends IRawSchema {
    domain: string;
    modelname: string;
    mongoosemodelname: string;
    collectionname: string;
}
export declare function mapType(val: string): any;
export declare function replaceIfTypeDeleteM(obj: any, val: any, key: string): void;
export declare function typeProps(a: any): any;
export declare function makeMongooseSchema(extSchema: IExtendedSchema, mongo?: any): mongoose.Schema;
export declare function loadExtendedMongooseSchema(modelPath: string, modelName: string): IExtendedSchema;
export declare function loadModelDoc(modelPath: string, modelName: string): IModelDoc;
export interface IModelRec {
    collectionName: string;
    model: mongoose.Model<any>;
    schema: mongoose.Schema;
}
export declare function augmentMongooseSchema(modelDoc: IModelDoc, schemaRaw: IRawSchema): IExtendedSchema;
/**
 * return a modelname without a traling s
 * @param collectionName
 */
export declare function makeMongooseModelName(collectionName: string): string;
/**
 * returns a mongoose collection name
 * @param modelName
 */
export declare function makeMongoCollectionName(modelName: string): string;
export declare function getExtendedSchema(mongoose: any): mongoose.Schema;
export declare function getExtendedSchemaModel(mongoose: mongoose.Mongoose): mongoose.Model<any>;
export declare function getModelDocModel(mongoose: mongoose.Mongoose): mongoose.Model<any>;
export declare function upsertMetaModel(mongoose: any): Promise<[any, any]>;
export declare function createDBWithModels(mongoose: mongoose.Mongoose, modelPath: string): Promise<any>;
export declare function removeOthers(mongoose: any, model: mongoose.Model<any>, retainedNames: string[]): Promise<any>;
export declare function getOrCreateModelFillers(mongoose: mongoose.Mongoose): mongoose.Model<any>;
export declare function getOrCreateModelOperators(mongoose: mongoose.Mongoose): mongoose.Model<any>;
export declare function getFillersFromDB(mongoose: mongoose.Mongoose): Promise<any>;
export declare function getOperatorsFromDB(mongoose: mongoose.Mongoose): Promise<any>;
export declare function getExtendSchemaDocFromDB(mongoose: mongoose.Mongoose, modelName: string): Promise<IExtendedSchema>;
export declare function getModelDocFromDB(mongoose: mongoose.Mongoose, modelName: string): Promise<IModelDoc>;
export declare function makeModelFromDB(mongoose: mongoose.Mongoose, modelName: string): Promise<mongoose.Model<any>>;
export declare function uploadFillers(mongoose: mongoose.Mongoose, modelPath: string): Promise<any>;
export declare function uploadOperators(mongoose: mongoose.Mongoose, modelPath: string): Promise<any>;
/**
 * Uploads the complete model (metadata!) information
 * Assumes metamodel has been loaded (see #upsertMetaModels)
 * @param mongoose {mongoose.Mongoose} the mongoose handle
 * @param modelpath {string}  the model path
 * @return Promise<any> the  promise
 */
export declare function upsertModels(mongoose: mongoose.Mongoose, modelpath: string): Promise<any>;
export declare function hasMetaCollection(mongoose: any): Promise<boolean>;
export declare const MongoNLQ: {
    MODELNAME_METAMODELS: string;
    COLL_METAMODELS: string;
    COLL_EXTENDEDSCHEMAS: string;
};
export declare const MongooseNLQ: {
    MONGOOSE_MODELNAME_EXTENDEDSCHEMAS: string;
    MONGOOSE_MODELNAME_METAMODELS: string;
};
export declare function validateDocMongoose(mongoose: mongoose.Mongoose, collectionname: any, schema: mongoose.Schema, doc: any): Promise<any>;
export declare function validateDocVsMongooseModel(model: any, doc: any): Promise<any>;
export declare function validateDoc(collectionname: string, schema: mongoose.Schema, doc: any): boolean;
