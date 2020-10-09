/**
 * Functionality managing the match models
 *
 * @file
 */
import * as IMatch from '../match/ifmatch';
import * as Meta from './meta';
import * as mongoose from 'mongoose';
export declare function cmpTools(a: IMatch.ITool, b: IMatch.ITool): number;
/**
 * returns when all models are loaded and all modeldocs are made
 * @param mongoose
 */
export declare function getMongoHandle(mongoose: mongoose.Mongoose): Promise<IMatch.IModelHandleRaw>;
export declare function getFactSynonyms(mongoHandle: IMatch.IModelHandleRaw, modelname: string): Promise<ISynonym[]>;
export interface ISynonym {
    category: string;
    fact: string;
    synonyms: string[];
}
export interface ISynonymBearingDoc {
    _synonyms: [
        {
            category: string;
            fact: string;
            synonyms: string[];
        }
    ];
}
export declare function getMongoCollectionNameForDomain(theModel: IMatch.IModels, domain: string): string;
export declare function getMongooseModelNameForDomain(theModel: IMatch.IModels, domain: string): string;
export declare function getModelForModelName(theModel: IMatch.IModels, modelname: string): any;
export declare function getModelForDomain(theModel: IMatch.IModels, domain: string): any;
export declare function getModelNameForDomain(handle: IMatch.IModelHandleRaw, domain: string): string;
export declare function filterRemapCategories(mongoMap: IMatch.CatMongoMap, categories: string[], records: any[]): any[];
export declare function checkModelMongoMap(model: mongoose.Model<any>, modelname: string, mongoMap: IMatch.CatMongoMap, category?: string): any;
export declare function getExpandedRecordsFull(theModel: IMatch.IModels, domain: string): Promise<{
    [key: string]: any;
}>;
export declare function getExpandedRecordsForCategory(theModel: IMatch.IModels, domain: string, category: string): Promise<{
    [key: string]: any;
}>;
export declare function getDistinctValues(mongoHandle: IMatch.IModelHandleRaw, modelname: string, category: string): Promise<string[]>;
export declare function getCategoryRec(mongoHandle: IMatch.IModelHandleRaw, modelname: string, category: string): IMatch.IModelCategoryRec;
export declare function addBestSplit(mRules: Array<IMatch.mRule>, rule: IMatch.mRule, seenRules: {
    [key: string]: IMatch.mRule[];
}): void;
export declare function readFileAsJSON(filename: string): any;
export declare function hasRuleWithFact(mRules: IMatch.mRule[], fact: string, category: string, bitindex: number): boolean;
export declare function loadModel(modelHandle: IMatch.IModelHandleRaw, sModelName: string, oModel: IMatch.IModels): Promise<any>;
export declare function getAllDomainsBitIndex(oModel: IMatch.IModels): number;
export declare function getDomainBitIndex(domain: string, oModel: IMatch.IModels): number;
export declare function getDomainBitIndexSafe(domain: string, oModel: IMatch.IModels): number;
/**
 * Given a bitfield, return an unsorted set of domains matching present bits
 * @param oModel
 * @param bitfield
 */
export declare function getDomainsForBitField(oModel: IMatch.IModels, bitfield: number): string[];
export declare function splitRules(rules: IMatch.mRule[]): IMatch.SplitRules;
export declare function sortFlatRecords(a: any, b: any): number;
export declare function findNextLen(targetLen: number, arr: string[], offsets: number[]): void;
export declare function addRangeRulesUnlessPresent(rules: IMatch.mRule[], lcword: string, rangeRules: IMatch.mRule[], presentRulesForKey: IMatch.mRule[], seenRules: any): void;
export declare function addCloseExactRangeRules(rules: IMatch.mRule[], seenRules: any): void;
export declare function readFillers(mongoose: mongoose.Mongoose, oModel: IMatch.IModels): Promise<any>;
export declare function readOperators(mongoose: mongoose.Mongoose, oModel: IMatch.IModels): Promise<any>;
export declare function releaseModel(model: IMatch.IModels): void;
export declare function loadModelsOpeningConnection(mongooseHndl: mongoose.Mongoose, connectionString?: string, modelPath?: string): Promise<IMatch.IModels>;
/**
 * expects an open connection!
 * @param mongoose
 * @param modelPath
 */
export declare function loadModels(mongoose: mongoose.Mongoose, modelPath: string): Promise<IMatch.IModels>;
export declare function _loadModelsFull(modelHandle: IMatch.IModelHandleRaw, modelPath?: string): Promise<IMatch.IModels>;
export declare function sortCategoriesByImportance(map: {
    [key: string]: IMatch.ICategoryDesc;
}, cats: string[]): string[];
export declare function rankCategoryByImportance(map: {
    [key: string]: IMatch.ICategoryDesc;
}, cata: string, catb: string): number;
export declare function getOperator(mdl: IMatch.IModels, operator: string): IMatch.IOperator;
export declare function getResultAsArray(mdl: IMatch.IModels, a: Meta.IMeta, rel: Meta.IMeta): Meta.IMeta[];
export declare function checkDomainPresent(theModel: IMatch.IModels, domain: string): void;
export declare function getShowURICategoriesForDomain(theModel: IMatch.IModels, domain: string): string[];
export declare function getShowURIRankCategoriesForDomain(theModel: IMatch.IModels, domain: string): string[];
export declare function getCategoriesForDomain(theModel: IMatch.IModels, domain: string): string[];
export declare function getTableColumns(theModel: IMatch.IModels, domain: string): string[];
/**
 * Return all categories of a domain which can appear on a word,
 * these are typically the wordindex domains + entries generated by generic rules
 *
 * The current implementation is a simplification
 */
export declare function getPotentialWordCategoriesForDomain(theModel: IMatch.IModels, domain: string): string[];
export declare function getDomainsForCategory(theModel: IMatch.IModels, category: string): string[];
/**
 * givena  set  of categories, return a structure
 *
 *
 * { domains : ["DOMAIN1", "DOMAIN2"],
 *   categorySet : {   cat1 : true, cat2 : true, ...}
 * }
 */
export declare function getDomainCategoryFilterForTargetCategories(model: IMatch.IModels, categories: string[], wordsonly: boolean): IMatch.IDomainCategoryFilter;
export declare function getDomainCategoryFilterForTargetCategory(model: IMatch.IModels, category: string, wordsonly: boolean): IMatch.IDomainCategoryFilter;
