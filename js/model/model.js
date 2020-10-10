"use strict";
/**
 * Functionality managing the match models
 *
 * @file
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDomainCategoryFilterForTargetCategory = exports.getDomainCategoryFilterForTargetCategories = exports.getDomainsForCategory = exports.getPotentialWordCategoriesForDomain = exports.getTableColumns = exports.getCategoriesForDomain = exports.getShowURIRankCategoriesForDomain = exports.getShowURICategoriesForDomain = exports.checkDomainPresent = exports.getResultAsArray = exports.getOperator = exports.rankCategoryByImportance = exports.sortCategoriesByImportance = exports._loadModelsFull = exports.loadModels = exports.loadModelsOpeningConnection = exports.releaseModel = exports.readOperators = exports.readFillers = exports.addCloseExactRangeRules = exports.addRangeRulesUnlessPresent = exports.findNextLen = exports.sortFlatRecords = exports.splitRules = exports.getDomainsForBitField = exports.getDomainBitIndexSafe = exports.getDomainBitIndex = exports.getAllDomainsBitIndex = exports.loadModel = exports.hasRuleWithFact = exports.readFileAsJSON = exports.addBestSplit = exports.getCategoryRec = exports.getDistinctValues = exports.getExpandedRecordsForCategory = exports.getExpandedRecordsFull = exports.checkModelMongoMap = exports.filterRemapCategories = exports.getModelNameForDomain = exports.getModelForDomain = exports.getModelForModelName = exports.getMongooseModelNameForDomain = exports.getMongoCollectionNameForDomain = exports.getFactSynonyms = exports.getMongoHandle = exports.cmpTools = void 0;
//import * as intf from 'constants';
const debugf = require("debugf");
var debuglog = debugf('model');
// the hardcoded domain metamodel!
const DOMAIN_METAMODEL = 'metamodel';
//const loadlog = logger.logger('modelload', '');
const IMatch = require("../match/ifmatch");
const InputFilterRules = require("../match/rule");
//import * as Tools from '../match/tools';
const fs = require("fs");
const Meta = require("./meta");
const Utils = require("abot_utils");
const CircularSer = require("abot_utils");
const Distance = require("abot_stringdist");
const process = require("process");
const _ = require("lodash");
const MongoUtils = require("../utils/mongo");
const mongoose = require("mongoose");
const Schemaload = require("../modelload/schemaload");
const MongoMap = require("./mongomap");
/**
 * the model path, may be controlled via environment variable
 */
var envModelPath = process.env["ABOT_MODELPATH"] || "node_modules/mgnlq_testmodel/testmodel";
function cmpTools(a, b) {
    return a.name.localeCompare(b.name);
}
exports.cmpTools = cmpTools;
/**
 * returns when all models are loaded and all modeldocs are made
 * @param mongoose
 */
function getMongoHandle(mongoose) {
    var res = {
        mongoose: mongoose,
        modelDocs: {},
        modelESchemas: {},
        mongoMaps: {}
    };
    var modelES = Schemaload.getExtendedSchemaModel(mongoose);
    return modelES.distinct('modelname').then((modelnames) => {
        debuglog(() => 'here distinct modelnames ' + JSON.stringify(modelnames));
        return Promise.all(modelnames.map(function (modelname) {
            debuglog(() => 'creating tripel for ' + modelname);
            return Promise.all([Schemaload.getExtendSchemaDocFromDB(mongoose, modelname),
                Schemaload.makeModelFromDB(mongoose, modelname),
                Schemaload.getModelDocFromDB(mongoose, modelname)]).then((value) => {
                debuglog(() => 'attempting to load ' + modelname + ' to create mongomap');
                var [extendedSchema, model, modelDoc] = value;
                res.modelESchemas[modelname] = extendedSchema;
                res.modelDocs[modelname] = modelDoc;
                res.mongoMaps[modelname] = MongoMap.makeMongoMap(modelDoc, extendedSchema);
                debuglog(() => 'created mongomap for ' + modelname);
            });
        }));
    }).then(() => {
        return res;
    });
    //var modelDoc = Schemaload.getExtendedDocModel(mongoose);
    //res.modelDocs[ISchema.MongoNLQ.MODELNAME_METAMODELS] = modelDoc;
    //return Promise.resolve(res);
}
exports.getMongoHandle = getMongoHandle;
function getFactSynonyms(mongoHandle, modelname) {
    var model = mongoHandle.mongoose.model(Schemaload.makeMongooseModelName(modelname));
    //     return model.find( { "_synonyms.0" : { $exists: false}}).lean().exec();
    /* mongoose prior
        return model.aggregate({ $match: { "_synonyms.0": { $exists: true } } },
            { $project: { _synonyms: 1 } },
            { $unwind: "$_synonyms" },
            { $project: { "category": "$_synonyms.category", "fact": "$_synonyms.fact", "synonyms": "$_synonyms.synonyms" } }).exec();
    */
    return model.aggregate([{ $match: { "_synonyms.0": { $exists: true } } },
        { $project: { _synonyms: 1 } },
        { $unwind: "$_synonyms" },
        { $project: { "category": "$_synonyms.category", "fact": "$_synonyms.fact", "synonyms": "$_synonyms.synonyms" } }]).exec();
}
exports.getFactSynonyms = getFactSynonyms;
;
function getMongoCollectionNameForDomain(theModel, domain) {
    var r = getMongooseModelNameForDomain(theModel, domain);
    return Schemaload.makeMongoCollectionName(r);
}
exports.getMongoCollectionNameForDomain = getMongoCollectionNameForDomain;
//Schemaload.makeMongooseModelName(modelname)
function getMongooseModelNameForDomain(theModel, domain) {
    var r = getModelNameForDomain(theModel.mongoHandle, domain);
    var r2 = Schemaload.makeMongooseModelName(r);
    return r2;
}
exports.getMongooseModelNameForDomain = getMongooseModelNameForDomain;
function getModelForModelName(theModel, modelname) {
    return theModel.mongoHandle.mongoose.model(Schemaload.makeMongooseModelName(modelname));
}
exports.getModelForModelName = getModelForModelName;
function getModelForDomain(theModel, domain) {
    var modelname = getModelNameForDomain(theModel.mongoHandle, domain);
    return getModelForModelName(theModel, modelname);
}
exports.getModelForDomain = getModelForDomain;
function getModelNameForDomain(handle, domain) {
    var res = undefined;
    Object.keys(handle.modelDocs).every(key => {
        var doc = handle.modelDocs[key];
        if (domain === doc.domain) {
            res = doc.modelname;
        }
        return !res;
    });
    if (!res) {
        throw Error('attempt to retrieve modelName for unknown domain ' + domain);
    }
    return res;
}
exports.getModelNameForDomain = getModelNameForDomain;
function filterRemapCategories(mongoMap, categories, records) {
    //
    //console.log('here map' + JSON.stringify(mongoMap,undefined,2));
    return records.map((rec, index) => {
        var res = {};
        categories.forEach(category => {
            var categoryPath = mongoMap[category].paths;
            if (!categoryPath) {
                throw new Error(`unknown category ${category} not present in ${JSON.stringify(mongoMap, undefined, 2)}`);
            }
            res[category] = MongoMap.getMemberByPath(rec, categoryPath);
            debuglog(() => 'got member for ' + category + ' from rec no ' + index + ' ' + JSON.stringify(rec, undefined, 2));
            debuglog(() => JSON.stringify(categoryPath));
            debuglog(() => 'res : ' + res[category]);
        });
        return res;
    });
}
exports.filterRemapCategories = filterRemapCategories;
function checkModelMongoMap(model, modelname, mongoMap, category) {
    if (!model) {
        debuglog(' no model for ' + modelname);
        //       return Promise.reject(`model ${modelname} not found in db`);
        throw Error(`model ${modelname} not found in db`);
    }
    if (!mongoMap) {
        debuglog(' no mongoMap for ' + modelname);
        throw new Error(`model ${modelname} has no modelmap`);
        //        return Promise.reject(`model ${modelname} has no modelmap`);
    }
    if (category && !mongoMap[category]) {
        debuglog(' no mongoMap category for ' + modelname);
        //      return Promise.reject(`model ${modelname} has no category ${category}`);
        throw new Error(`model ${modelname} has no category ${category}`);
    }
    return undefined;
}
exports.checkModelMongoMap = checkModelMongoMap;
function getExpandedRecordsFull(theModel, domain) {
    var mongoHandle = theModel.mongoHandle;
    var modelname = getModelNameForDomain(theModel.mongoHandle, domain);
    debuglog(() => ` modelname for ${domain} is ${modelname}`);
    var model = mongoHandle.mongoose.model(Schemaload.makeMongooseModelName(modelname));
    var mongoMap = mongoHandle.mongoMaps[modelname];
    debuglog(() => 'here the mongomap' + JSON.stringify(mongoMap, undefined, 2));
    var p = checkModelMongoMap(model, modelname, mongoMap);
    debuglog(() => ` here the modelmap for ${domain} is ${JSON.stringify(mongoMap, undefined, 2)}`);
    // 1) produce the flattened records
    var res = MongoMap.unwindsForNonterminalArrays(mongoMap);
    debuglog(() => 'here the unwind statement ' + JSON.stringify(res, undefined, 2));
    // we have to unwind all common non-terminal collections.
    debuglog(() => 'here the model ' + model.modelName);
    var categories = getCategoriesForDomain(theModel, domain);
    debuglog(() => `here categories for ${domain} ${categories.join(';')}`);
    if (res.length === 0) {
        return model.find({}).lean().exec().then((unwound) => {
            debuglog(() => 'here res' + JSON.stringify(unwound));
            return filterRemapCategories(mongoMap, categories, unwound);
        });
    }
    return model.aggregate(res).then(unwound => {
        // filter for aggregate
        debuglog(() => 'here res' + JSON.stringify(unwound));
        return filterRemapCategories(mongoMap, categories, unwound);
    });
}
exports.getExpandedRecordsFull = getExpandedRecordsFull;
function getExpandedRecordsForCategory(theModel, domain, category) {
    var mongoHandle = theModel.mongoHandle;
    var modelname = getModelNameForDomain(theModel.mongoHandle, domain);
    debuglog(() => ` modelname for ${domain} is ${modelname}`);
    //debuglog(() => `here models ${modelname} ` + mongoHandle.mongoose.modelNames().join(';'));
    var model = mongoHandle.mongoose.model(Schemaload.makeMongooseModelName(modelname));
    var mongoMap = mongoHandle.mongoMaps[modelname];
    debuglog(() => 'here the mongomap' + JSON.stringify(mongoMap, undefined, 2));
    checkModelMongoMap(model, modelname, mongoMap, category);
    debuglog(() => ` here the modelmap for ${domain} is ${JSON.stringify(mongoMap, undefined, 2)}`);
    // 1) produce the flattened records
    var res = MongoMap.unwindsForNonterminalArrays(mongoMap);
    debuglog(() => 'here the unwind statement ' + JSON.stringify(res, undefined, 2));
    // we have to unwind all common non-terminal collections.
    debuglog(() => 'here the model ' + model.modelName);
    if (res.length === 0) {
        return model.find({}).lean().exec().then((unwound) => {
            debuglog(() => 'here res' + JSON.stringify(unwound));
            return filterRemapCategories(mongoMap, [category], unwound);
        });
    }
    return model.aggregate(res).then(unwound => {
        // filter for aggregate
        debuglog(() => 'here res' + JSON.stringify(unwound));
        return filterRemapCategories(mongoMap, [category], unwound);
    });
}
exports.getExpandedRecordsForCategory = getExpandedRecordsForCategory;
// get synonyms
// db.cosmos.find( { "_synonyms.0": { $exists: true }}).length()
function getDistinctValues(mongoHandle, modelname, category) {
    debuglog(() => `here models ${modelname} ` + mongoHandle.mongoose.modelNames().join(';'));
    var model = mongoHandle.mongoose.model(Schemaload.makeMongooseModelName(modelname));
    var mongoMap = mongoHandle.mongoMaps[modelname];
    checkModelMongoMap(model, modelname, mongoMap, category);
    debuglog(' here path for distinct value ' + mongoMap[category].fullpath);
    return model.distinct(mongoMap[category].fullpath).then(res => {
        debuglog(() => ` here res for ${modelname}  ${category} values ` + JSON.stringify(res, undefined, 2));
        return res;
    });
}
exports.getDistinctValues = getDistinctValues;
function getCategoryRec(mongoHandle, modelname, category) {
    var categories = mongoHandle.modelDocs[modelname]._categories;
    var filtered = categories.filter(x => x.category == category);
    if (filtered.length != 1) {
        debugf(' did not find ' + modelname + '  category  ' + category + ' in  ' + JSON.stringify(categories));
        throw Error('category not found ' + category + " " + JSON.stringify(categories));
    }
    return filtered[0];
}
exports.getCategoryRec = getCategoryRec;
const ARR_MODEL_PROPERTIES = ["domain", "bitindex", "defaultkeycolumn", "defaulturi", "categoryDescribed", "columns", "description", "tool", "toolhidden", "synonyms", "category", "wordindex", "exactmatch", "hidden"];
function addSynonyms(synonyms, category, synonymFor, bitindex, bitSentenceAnd, wordType, mRules, seen) {
    synonyms.forEach(function (syn) {
        var oRule = {
            category: category,
            matchedString: synonymFor,
            type: IMatch.EnumRuleType.WORD,
            word: syn,
            bitindex: bitindex,
            bitSentenceAnd: bitSentenceAnd,
            wordType: wordType,
            _ranking: 0.95
        };
        debuglog(debuglog.enabled ? ("inserting synonym" + JSON.stringify(oRule)) : '-');
        insertRuleIfNotPresent(mRules, oRule, seen);
    });
}
function getRuleKey(rule) {
    var r1 = rule.matchedString + "-|-" + rule.category + " -|- " + rule.type + " -|- " + rule.word + " " + rule.bitindex + " " + rule.wordType;
    if (rule.range) {
        var r2 = getRuleKey(rule.range.rule);
        r1 += " -|- " + rule.range.low + "/" + rule.range.high + " -|- " + r2;
    }
    return r1;
}
const Breakdown = require("../match/breakdown");
/* given a rule which represents a word sequence which is split during tokenization */
function addBestSplit(mRules, rule, seenRules) {
    //if(!global_AddSplits) {
    //    return;
    //}
    if (rule.type !== IMatch.EnumRuleType.WORD) {
        return;
    }
    var best = Breakdown.makeMatchPattern(rule.lowercaseword);
    if (!best) {
        return;
    }
    var newRule = {
        category: rule.category,
        matchedString: rule.matchedString,
        bitindex: rule.bitindex,
        bitSentenceAnd: rule.bitindex,
        wordType: rule.wordType,
        word: best.longestToken,
        type: 0,
        lowercaseword: best.longestToken,
        _ranking: 0.95,
        //    exactOnly : rule.exactOnly,
        range: best.span
    };
    if (rule.exactOnly) {
        newRule.exactOnly = rule.exactOnly;
    }
    ;
    newRule.range.rule = rule;
    insertRuleIfNotPresent(mRules, newRule, seenRules);
}
exports.addBestSplit = addBestSplit;
function insertRuleIfNotPresent(mRules, rule, seenRules) {
    if (rule.type !== IMatch.EnumRuleType.WORD) {
        debuglog('not a  word return fast ' + rule.matchedString);
        mRules.push(rule);
        return;
    }
    if ((rule.word === undefined) || (rule.matchedString === undefined)) {
        throw new Error('illegal rule' + JSON.stringify(rule, undefined, 2));
    }
    var r = getRuleKey(rule);
    /* if( (rule.word === "service" || rule.word=== "services") && r.indexOf('OData') >= 0) {
         console.log("rulekey is" + r);
         console.log("presence is " + JSON.stringify(seenRules[r]));
     }*/
    rule.lowercaseword = rule.word.toLowerCase();
    if (seenRules[r]) {
        debuglog(() => ("Attempting to insert duplicate" + JSON.stringify(rule, undefined, 2) + " : " + r));
        var duplicates = seenRules[r].filter(function (oEntry) {
            return 0 === InputFilterRules.compareMRuleFull(oEntry, rule);
        });
        if (duplicates.length > 0) {
            return;
        }
    }
    seenRules[r] = (seenRules[r] || []);
    seenRules[r].push(rule);
    if (rule.word === "") {
        debuglog(debuglog.enabled ? ('Skipping rule with emtpy word ' + JSON.stringify(rule, undefined, 2)) : '-');
        //g('Skipping rule with emtpy word ' + JSON.stringify(rule, undefined, 2));
        return;
    }
    mRules.push(rule);
    addBestSplit(mRules, rule, seenRules);
    return;
}
function readFileAsJSON(filename) {
    var data = fs.readFileSync(filename, 'utf-8');
    try {
        return JSON.parse(data);
    }
    catch (e) {
        console.log("Content of file " + filename + " is no json" + e);
        process.exit(-1);
    }
    return undefined;
}
exports.readFileAsJSON = readFileAsJSON;
/*
function loadModelData1(modelPath: string, oMdl: IModel, sModelName: string, oModel: IMatch.IModels) {
    // read the data ->
    // data is processed into mRules directly,

    var bitindex = oMdl.bitindex;
    const sFileName = ('./' + modelPath + '/' + sModelName + ".data.json");
    var oMdlData= readFileAsJSON(sFileName);
    oMdlData.forEach(function (oEntry) {
        if (!oEntry.domain) {
            oEntry._domain = oMdl.domain;
        }
        if (!oEntry.tool && oMdl.tool.name) {
            oEntry.tool = oMdl.tool.name;
        }
        oModel.records.push(oEntry);
        oMdl.category.forEach(function (cat) {
            if (oEntry[cat] === 'undefined') {
                oEntry[cat] = "n/a";
                var bug =
                    "INCONSISTENT*> ModelData " + sFileName + " does not contain category " + cat + " with value 'undefined', undefined is illegal value, use n/a " + JSON.stringify(oEntry) + "";
                debuglog(bug);
                //console.log(bug);
                //process.exit(-1);
            }
        })

        oMdl.wordindex.forEach(function (category) {
            if (oEntry[category] === undefined) {
                debuglog("INCONSISTENT*> ModelData " + sFileName + " does not contain category " + category + " of wordindex" + JSON.stringify(oEntry) + "")
                return;
            }
            if (oEntry[category] !== "*") {
                var sString = oEntry[category];
                debuglog("pushing rule with " + category + " -> " + sString);
                var oRule = {
                    category: category,
                    matchedString: sString,
                    type: IMatch.EnumRuleType.WORD,
                    word: sString,
                    bitindex: bitindex,
                    bitSentenceAnd : bitindex,
                    wordType : IMatch.WORDTYPE.FACT,
                    _ranking: 0.95
                } as IMatch.mRule;
                if (oMdl.exactmatch && oMdl.exactmatch.indexOf(category) >= 0) {
                    oRule.exactOnly = true;
                }
                insertRuleIfNotPresent(oModel.mRules, oRule, oModel.seenRules);
                if (oMdlData.synonyms && oMdlData.synonyms[category]) {
                    throw new Error("how can this happen?");
                    //addSynonyms(oMdlData.synonyms[category], category, sString, bitindex, bitindex, "X", oModel.mRules, oModel.seenRules);
                }
                // a synonym for a FACT
                if (oEntry.synonyms && oEntry.synonyms[category]) {
                    addSynonyms(oEntry.synonyms[category], category, sString, bitindex, bitindex, IMatch.WORDTYPE.FACT, oModel.mRules, oModel.seenRules);
                }
            }
        });
    });
}

*/
function hasRuleWithFact(mRules, fact, category, bitindex) {
    // TODO BAD QUADRATIC
    return mRules.find(rule => {
        return rule.word === fact && rule.category === category && rule.bitindex === bitindex;
    }) !== undefined;
}
exports.hasRuleWithFact = hasRuleWithFact;
function loadModelDataMongo(modelHandle, oMdl, sModelName, oModel) {
    // read the data ->
    // data is processed into mRules directly
    var bitindex = oMdl.bitindex;
    //const sFileName = ('./' + modelPath + '/' + sModelName + ".data.json");
    return Promise.all(modelHandle.modelDocs[sModelName]._categories.map(categoryRec => {
        var category = categoryRec.category;
        var wordindex = categoryRec.wordindex;
        if (!wordindex) {
            debuglog(() => '  ' + sModelName + ' ' + category + ' is not word indexed!');
            return Promise.resolve(true);
        }
        else {
            debuglog(() => 'adding values for ' + sModelName + ' ' + category);
            return getDistinctValues(modelHandle, sModelName, category).then((values) => {
                debuglog(`found ${values.length} values for ${sModelName} ${category} `);
                values.map(value => {
                    var sString = "" + value;
                    debuglog(() => "pushing rule with " + category + " -> " + sString + ' ');
                    var oRule = {
                        category: category,
                        matchedString: sString,
                        type: IMatch.EnumRuleType.WORD,
                        word: sString,
                        bitindex: bitindex,
                        bitSentenceAnd: bitindex,
                        exactOnly: categoryRec.exactmatch || false,
                        wordType: IMatch.WORDTYPE.FACT,
                        _ranking: 0.95
                    };
                    insertRuleIfNotPresent(oModel.mRules, oRule, oModel.seenRules);
                    //    if (oMdlData.synonyms && oMdlData.synonyms[category]) {
                    //        throw new Error("how can this happen?");
                    //addSynonyms(oMdlData.synonyms[category], category, sString, bitindex, bitindex, "X", oModel.mRules, oModel.seenRules);
                    //    }
                    // a synonym for a FACT
                    //    if (oEntry.synonyms && oEntry.synonyms[category]) {
                    //         addSynonyms(oEntry.synonyms[category], category, sString, bitindex, bitindex, IMatch.WORDTYPE.FACT, oModel.mRules, oModel.seenRules);
                    //     }
                });
                return true;
            });
        }
    })).then(() => getFactSynonyms(modelHandle, sModelName)).then((synonymValues) => {
        synonymValues.forEach((synonymRec) => {
            if (!hasRuleWithFact(oModel.mRules, synonymRec.fact, synonymRec.category, bitindex)) {
                debuglog(() => JSON.stringify(oModel.mRules, undefined, 2));
                throw Error(`Orphaned synonym without base in data?\n`
                    +
                        `(check typos and that category is wordindexed!) fact: '${synonymRec.fact}';  category: "${synonymRec.category}"   ` + JSON.stringify(synonymRec));
            }
            addSynonyms(synonymRec.synonyms, synonymRec.category, synonymRec.fact, bitindex, bitindex, IMatch.WORDTYPE.FACT, oModel.mRules, oModel.seenRules);
            return true;
        });
        return true;
    });
}
;
/*
function loadModelP(mongooseHndl : mongoose.Mongoose, modelPath: string, connectionString : string) : Promise<IMatch.IModels> {
    var mongooseX = mongooseHndl || mongoose;
    var connStr = connectionString || 'mongodb://localhost/testdb';
    return MongoUtils.openMongoose(mongooseX, connStr).then(
        () => getMongoHandle(mongooseX)
    ).then( (modelHandle : IMatch.IModelHandleRaw) => _loadModelsFull(modelHandle, modelPath)
    );
};
*/
function loadModel(modelHandle, sModelName, oModel) {
    debuglog(" loading " + sModelName + " ....");
    //var oMdl = readFileAsJSON('./' + modelPath + '/' + sModelName + ".model.json") as IModel;
    var oMdl = makeMdlMongo(modelHandle, sModelName, oModel);
    return loadModelDataMongo(modelHandle, oMdl, sModelName, oModel);
}
exports.loadModel = loadModel;
function getAllDomainsBitIndex(oModel) {
    var len = oModel.domains.length;
    var res = 0;
    for (var i = 0; i < len; ++i) {
        res = res << 1;
        res = res | 0x0001;
    }
    return res;
}
exports.getAllDomainsBitIndex = getAllDomainsBitIndex;
function getDomainBitIndex(domain, oModel) {
    var index = oModel.domains.indexOf(domain);
    if (index < 0) {
        index = oModel.domains.length;
    }
    if (index >= 32) {
        throw new Error("too many domain for single 32 bit index");
    }
    return 0x0001 << index;
}
exports.getDomainBitIndex = getDomainBitIndex;
function getDomainBitIndexSafe(domain, oModel) {
    var index = oModel.domains.indexOf(domain);
    if (index < 0) {
        throw Error('expected domain to be registered??? ');
    }
    if (index >= 32) {
        throw new Error("too many domain for single 32 bit index");
    }
    return 0x0001 << index;
}
exports.getDomainBitIndexSafe = getDomainBitIndexSafe;
/**
 * Given a bitfield, return an unsorted set of domains matching present bits
 * @param oModel
 * @param bitfield
 */
function getDomainsForBitField(oModel, bitfield) {
    return oModel.domains.filter(domain => (getDomainBitIndex(domain, oModel) & bitfield));
}
exports.getDomainsForBitField = getDomainsForBitField;
/*
function mergeModelJson(sModelName: string, oMdl: IModel, oModel: IMatch.IModels) {
    var categoryDescribedMap = {} as { [key: string]: IMatch.ICategoryDesc };
    oMdl.bitindex = getDomainBitIndex(oMdl.domain, oModel);
    oMdl.categoryDescribed = [];
    // rectify category
    oMdl.category = oMdl.category.map(function (cat: any) {
        if (typeof cat === "string") {
            return cat;
        }
        if (typeof cat.name !== "string") {
            console.log("Missing name in object typed category in " + JSON.stringify(cat) + " in model " + sModelName);
            process.exit(-1);
            //throw new Error('Domain ' + oMdl.domain + ' already loaded while loading ' + sModelName + '?');
        }
        categoryDescribedMap[cat.name] = cat;
        oMdl.categoryDescribed.push(cat);
        return cat.name;
    });

    // add the categories to the model:
    oMdl.category.forEach(function (category) {
        insertRuleIfNotPresent(oModel.mRules, {
            category: "category",
            matchedString: category,
            type: IMatch.EnumRuleType.WORD,
            word: category,
            lowercaseword: category.toLowerCase(),
            bitindex: oMdl.bitindex,
            wordType : IMatch.WORDTYPE.CATEGORY,
            bitSentenceAnd : oMdl.bitindex,
            _ranking: 0.95
        }, oModel.seenRules);
    });

    if (oModel.domains.indexOf(oMdl.domain) >= 0) {
        debuglog("***********here mdl" + JSON.stringify(oMdl, undefined, 2));
        throw new Error('Domain ' + oMdl.domain + ' already loaded while loading ' + sModelName + '?');
    }
    // check properties of model
    Object.keys(oMdl).sort().forEach(function (sProperty) {
        if (ARR_MODEL_PROPERTIES.indexOf(sProperty) < 0) {
            throw new Error('Model property "' + sProperty + '" not a known model property in model of domain ' + oMdl.domain + ' ');
        }
    });
    // consider streamlining the categories
    oModel.rawModels[oMdl.domain] = oMdl;

    oModel.full.domain[oMdl.domain] = {
        description: oMdl.description,
        categories: categoryDescribedMap,
        bitindex: oMdl.bitindex
    };

    // check that


    // check that members of wordindex are in categories,
    oMdl.wordindex = oMdl.wordindex || [];
    oMdl.wordindex.forEach(function (sWordIndex) {
        if (oMdl.category.indexOf(sWordIndex) < 0) {
            throw new Error('Model wordindex "' + sWordIndex + '" not a category of domain ' + oMdl.domain + ' ');
        }
    });
    oMdl.exactmatch = oMdl.exactmatch || [];
    oMdl.exactmatch.forEach(function (sExactMatch) {
        if (oMdl.category.indexOf(sExactMatch) < 0) {
            throw new Error('Model exactmatch "' + sExactMatch + '" not a category of domain ' + oMdl.domain + ' ');
        }
    });
    oMdl.columns = oMdl.columns || [];
    oMdl.columns.forEach(function (sExactMatch) {
        if (oMdl.category.indexOf(sExactMatch) < 0) {
            throw new Error('Model column "' + sExactMatch + '" not a category of domain ' + oMdl.domain + ' ');
        }
    });


    // add relation domain -> category
    var domainStr = MetaF.Domain(oMdl.domain).toFullString();
    var relationStr = MetaF.Relation(Meta.RELATION_hasCategory).toFullString();
    var reverseRelationStr = MetaF.Relation(Meta.RELATION_isCategoryOf).toFullString();
    oMdl.category.forEach(function (sCategory) {

        var CategoryString = MetaF.Category(sCategory).toFullString();
        oModel.meta.t3[domainStr] = oModel.meta.t3[domainStr] || {};
        oModel.meta.t3[domainStr][relationStr] = oModel.meta.t3[domainStr][relationStr] || {};
        oModel.meta.t3[domainStr][relationStr][CategoryString] = {};

        oModel.meta.t3[CategoryString] = oModel.meta.t3[CategoryString] || {};
        oModel.meta.t3[CategoryString][reverseRelationStr] = oModel.meta.t3[CategoryString][reverseRelationStr] || {};
        oModel.meta.t3[CategoryString][reverseRelationStr][domainStr] = {};

    });

    // add a precice domain matchrule
    insertRuleIfNotPresent(oModel.mRules, {
        category: "domain",
        matchedString: oMdl.domain,
        type: IMatch.EnumRuleType.WORD,
        word: oMdl.domain,
        bitindex: oMdl.bitindex,
        bitSentenceAnd : oMdl.bitindex,
        wordType : "D",
        _ranking: 0.95
    }, oModel.seenRules);

    // check the tool
    if (oMdl.tool && oMdl.tool.requires) {
        var requires = Object.keys(oMdl.tool.requires || {});
        var diff = _.difference(requires, oMdl.category);
        if (diff.length > 0) {
            console.log(` ${oMdl.domain} : Unkown category in requires of tool: "` + diff.join('"') + '"');
            process.exit(-1);
        }
        var optional = Object.keys(oMdl.tool.optional);
        diff = _.difference(optional, oMdl.category);
        if (diff.length > 0) {
            console.log(` ${oMdl.domain} : Unkown category optional of tool: "` + diff.join('"') + '"');
            process.exit(-1);
        }
        Object.keys(oMdl.tool.sets || {}).forEach(function (setID) {
            var diff = _.difference(oMdl.tool.sets[setID].set, oMdl.category);
            if (diff.length > 0) {
                console.log(` ${oMdl.domain} : Unkown category in setId ${setID} of tool: "` + diff.join('"') + '"');
                process.exit(-1);
            }
        });

        // extract tools an add to tools:
        oModel.tools.filter(function (oEntry) {
            if (oEntry.name === (oMdl.tool && oMdl.tool.name)) {
                console.log("Tool " + oMdl.tool.name + " already present when loading " + sModelName);
                //throw new Error('Domain already loaded?');
                process.exit(-1);
            }
        });
    } else {
        oMdl.toolhidden = true;
        oMdl.tool.requires = { "impossible": {} };
    }
    // add the tool name as rule unless hidden
    if (!oMdl.toolhidden && oMdl.tool && oMdl.tool.name) {
        insertRuleIfNotPresent(oModel.mRules, {
            category: "tool",
            matchedString: oMdl.tool.name,
            type: IMatch.EnumRuleType.WORD,
            word: oMdl.tool.name,
            bitindex: oMdl.bitindex,
            bitSentenceAnd : oMdl.bitindex,
            wordType : IMatch.WORDTYPE.TOOL,
            _ranking: 0.95
        }, oModel.seenRules);
    };
    if (oMdl.synonyms && oMdl.synonyms["tool"]) {
        addSynonyms(oMdl.synonyms["tool"], "tool", oMdl.tool.name, oMdl.bitindex,
        oMdl.bitindex, IMatch.WORDTYPE.TOOL, oModel.mRules, oModel.seenRules);
    };
    if (oMdl.synonyms) {
        Object.keys(oMdl.synonyms).forEach(function (ssynkey) {
            if (oMdl.category.indexOf(ssynkey) >= 0 && ssynkey !== "tool") {
                if (oModel.full.domain[oMdl.domain].categories[ssynkey]) {
                    oModel.full.domain[oMdl.domain].categories[ssynkey].category_synonyms = oMdl.synonyms[ssynkey];
                }
                addSynonyms(oMdl.synonyms[ssynkey], "category", ssynkey, oMdl.bitindex, oMdl.bitindex,
                IMatch.WORDTYPE.CATEGORY, oModel.mRules, oModel.seenRules);
            }
        });
    }
    oModel.domains.push(oMdl.domain);
    if (oMdl.tool.name) {
        oModel.tools.push(oMdl.tool);
    }
    oModel.category = oModel.category.concat(oMdl.category);
    oModel.category.sort();
    oModel.category = oModel.category.filter(function (string, index) {
        return oModel.category[index] !== oModel.category[index + 1];
    });

} // loadmodel
*/
function makeMdlMongo(modelHandle, sModelName, oModel) {
    var modelDoc = modelHandle.modelDocs[sModelName];
    var oMdl = {
        bitindex: getDomainBitIndexSafe(modelDoc.domain, oModel),
        domain: modelDoc.domain,
        modelname: sModelName,
        description: modelDoc.domain_description
    };
    var categoryDescribedMap = {};
    oMdl.bitindex = getDomainBitIndexSafe(modelDoc.domain, oModel);
    oMdl.category = modelDoc._categories.map(cat => cat.category);
    oMdl.categoryDescribed = [];
    modelDoc._categories.forEach(cat => {
        oMdl.categoryDescribed.push({
            name: cat.category,
            description: cat.category_description
        });
        categoryDescribedMap[cat.category] = cat;
    });
    oMdl.category = modelDoc._categories.map(cat => cat.category);
    /* // rectify category
     oMdl.category = oMdl.category.map(function (cat: any) {
         if (typeof cat === "string") {
             return cat;
         }
         if (typeof cat.name !== "string") {
             console.log("Missing name in object typed category in " + JSON.stringify(cat) + " in model " + sModelName);
             process.exit(-1);
             //throw new Error('Domain ' + oMdl.domain + ' already loaded while loading ' + sModelName + '?');
         }
         categoryDescribedMap[cat.name] = cat;
         oMdl.categoryDescribed.push(cat);
         return cat.name;
     });
     */
    // add the categories to the rules
    oMdl.category.forEach(function (category) {
        insertRuleIfNotPresent(oModel.mRules, {
            category: "category",
            matchedString: category,
            type: IMatch.EnumRuleType.WORD,
            word: category,
            lowercaseword: category.toLowerCase(),
            bitindex: oMdl.bitindex,
            wordType: IMatch.WORDTYPE.CATEGORY,
            bitSentenceAnd: oMdl.bitindex,
            _ranking: 0.95
        }, oModel.seenRules);
    });
    // add synonanym for the categories to the
    modelDoc._categories.forEach(cat => {
        addSynonyms;
    });
    if (oModel.domains.indexOf(oMdl.domain) < 0) {
        debuglog("***********here mdl" + JSON.stringify(oMdl, undefined, 2));
        throw new Error('Domain ' + oMdl.domain + ' already loaded while loading ' + sModelName + '?');
    }
    /*
    // check properties of model
    Object.keys(oMdl).sort().forEach(function (sProperty) {
        if (ARR_MODEL_PROPERTIES.indexOf(sProperty) < 0) {
            throw new Error('Model property "' + sProperty + '" not a known model property in model of domain ' + oMdl.domain + ' ');
        }
    });
    */
    // consider streamlining the categories
    oModel.rawModels[oMdl.domain] = oMdl;
    oModel.full.domain[oMdl.domain] = {
        description: oMdl.description,
        categories: categoryDescribedMap,
        bitindex: oMdl.bitindex
    };
    // check that
    // check that members of wordindex are in categories,
    /* oMdl.wordindex = oModelDoc.oMdl.wordindex || [];
     oMdl.wordindex.forEach(function (sWordIndex) {
         if (oMdl.category.indexOf(sWordIndex) < 0) {
             throw new Error('Model wordindex "' + sWordIndex + '" not a category of domain ' + oMdl.domain + ' ');
         }
     });
     */
    /*
    oMdl.exactmatch = oMdl.exactmatch || [];
    oMdl.exactmatch.forEach(function (sExactMatch) {
        if (oMdl.category.indexOf(sExactMatch) < 0) {
            throw new Error('Model exactmatch "' + sExactMatch + '" not a category of domain ' + oMdl.domain + ' ');
        }
    });
    */
    oMdl.columns = modelDoc.columns; // oMdl.columns || [];
    oMdl.columns.forEach(function (sExactMatch) {
        if (oMdl.category.indexOf(sExactMatch) < 0) {
            throw new Error('Model column "' + sExactMatch + '" not a category of domain ' + oMdl.domain + ' ');
        }
    });
    // add relation domain -> category
    var domainStr = MetaF.Domain(oMdl.domain).toFullString();
    var relationStr = MetaF.Relation(Meta.RELATION_hasCategory).toFullString();
    var reverseRelationStr = MetaF.Relation(Meta.RELATION_isCategoryOf).toFullString();
    oMdl.category.forEach(function (sCategory) {
        var CategoryString = MetaF.Category(sCategory).toFullString();
        oModel.meta.t3[domainStr] = oModel.meta.t3[domainStr] || {};
        oModel.meta.t3[domainStr][relationStr] = oModel.meta.t3[domainStr][relationStr] || {};
        oModel.meta.t3[domainStr][relationStr][CategoryString] = {};
        oModel.meta.t3[CategoryString] = oModel.meta.t3[CategoryString] || {};
        oModel.meta.t3[CategoryString][reverseRelationStr] = oModel.meta.t3[CategoryString][reverseRelationStr] || {};
        oModel.meta.t3[CategoryString][reverseRelationStr][domainStr] = {};
    });
    // add a precice domain matchrule
    insertRuleIfNotPresent(oModel.mRules, {
        category: "domain",
        matchedString: oMdl.domain,
        type: IMatch.EnumRuleType.WORD,
        word: oMdl.domain,
        bitindex: oMdl.bitindex,
        bitSentenceAnd: oMdl.bitindex,
        wordType: IMatch.WORDTYPE.DOMAIN,
        _ranking: 0.95
    }, oModel.seenRules);
    // add domain synonyms
    if (modelDoc.domain_synonyms && modelDoc.domain_synonyms.length > 0) {
        addSynonyms(modelDoc.domain_synonyms, "domain", modelDoc.domain, oMdl.bitindex, oMdl.bitindex, IMatch.WORDTYPE.DOMAIN, oModel.mRules, oModel.seenRules);
        addSynonyms(modelDoc.domain_synonyms, "domain", modelDoc.domain, getDomainBitIndexSafe(DOMAIN_METAMODEL, oModel), getDomainBitIndexSafe(DOMAIN_METAMODEL, oModel), IMatch.WORDTYPE.FACT, oModel.mRules, oModel.seenRules);
        // TODO: synonym have to be added as *FACT* for the metamodel!
    }
    ;
    /*
        // check the tool
        if (oMdl.tool && oMdl.tool.requires) {
            var requires = Object.keys(oMdl.tool.requires || {});
            var diff = _.difference(requires, oMdl.category);
            if (diff.length > 0) {
                console.log(` ${oMdl.domain} : Unkown category in requires of tool: "` + diff.join('"') + '"');
                process.exit(-1);
            }
            var optional = Object.keys(oMdl.tool.optional);
            diff = _.difference(optional, oMdl.category);
            if (diff.length > 0) {
                console.log(` ${oMdl.domain} : Unkown category optional of tool: "` + diff.join('"') + '"');
                process.exit(-1);
            }
            Object.keys(oMdl.tool.sets || {}).forEach(function (setID) {
                var diff = _.difference(oMdl.tool.sets[setID].set, oMdl.category);
                if (diff.length > 0) {
                    console.log(` ${oMdl.domain} : Unkown category in setId ${setID} of tool: "` + diff.join('"') + '"');
                    process.exit(-1);
                }
            });

            // extract tools an add to tools:
            oModel.tools.filter(function (oEntry) {
                if (oEntry.name === (oMdl.tool && oMdl.tool.name)) {
                    console.log("Tool " + oMdl.tool.name + " already present when loading " + sModelName);
                    //throw new Error('Domain already loaded?');
                    process.exit(-1);
                }
            });
        } else {
            oMdl.toolhidden = true;
            oMdl.tool.requires = { "impossible": {} };
        }
        // add the tool name as rule unless hidden
        if (!oMdl.toolhidden && oMdl.tool && oMdl.tool.name) {
            insertRuleIfNotPresent(oModel.mRules, {
                category: "tool",
                matchedString: oMdl.tool.name,
                type: IMatch.EnumRuleType.WORD,
                word: oMdl.tool.name,
                bitindex: oMdl.bitindex,
                bitSentenceAnd : oMdl.bitindex,
                wordType : IMatch.WORDTYPE.TOOL,
                _ranking: 0.95
            }, oModel.seenRules);
        };
        if (oMdl.synonyms && oMdl.synonyms["tool"]) {
            addSynonyms(oMdl.synonyms["tool"], "tool", oMdl.tool.name, oMdl.bitindex,
            oMdl.bitindex, IMatch.WORDTYPE.TOOL, oModel.mRules, oModel.seenRules);
        };
        */
    // add synsonym for the domains
    // add synonyms for the categories
    modelDoc._categories.forEach(cat => {
        if (cat.category_synonyms && cat.category_synonyms.length > 0) {
            if (oModel.full.domain[oMdl.domain].categories[cat.category]) {
                oModel.full.domain[oMdl.domain].categories[cat.category].category_synonyms = cat.category_synonyms;
            }
            addSynonyms(cat.category_synonyms, "category", cat.category, oMdl.bitindex, oMdl.bitindex, IMatch.WORDTYPE.CATEGORY, oModel.mRules, oModel.seenRules);
            // add synonyms into the metamodel domain
            addSynonyms(cat.category_synonyms, "category", cat.category, getDomainBitIndexSafe(DOMAIN_METAMODEL, oModel), getDomainBitIndexSafe(DOMAIN_METAMODEL, oModel), IMatch.WORDTYPE.FACT, oModel.mRules, oModel.seenRules);
        }
    });
    // add operators
    // add fillers
    if (oModel.domains.indexOf(oMdl.domain) < 0) {
        throw Error('missing domain registration for ' + oMdl.domain);
    }
    //oModel.domains.push(oMdl.domain);
    oModel.category = oModel.category.concat(oMdl.category);
    oModel.category.sort();
    oModel.category = oModel.category.filter(function (string, index) {
        return oModel.category[index] !== oModel.category[index + 1];
    });
    return oMdl;
} // loadmodel
function splitRules(rules) {
    var res = {};
    var nonWordRules = [];
    rules.forEach(function (rule) {
        if (rule.type === IMatch.EnumRuleType.WORD) {
            if (!rule.lowercaseword) {
                throw new Error("Rule has no member lowercaseword" + JSON.stringify(rule));
            }
            res[rule.lowercaseword] = res[rule.lowercaseword] || { bitindex: 0, rules: [] };
            res[rule.lowercaseword].bitindex = res[rule.lowercaseword].bitindex | rule.bitindex;
            res[rule.lowercaseword].rules.push(rule);
        }
        else {
            nonWordRules.push(rule);
        }
    });
    return {
        wordMap: res,
        nonWordRules: nonWordRules,
        allRules: rules,
        wordCache: {}
    };
}
exports.splitRules = splitRules;
function sortFlatRecords(a, b) {
    var keys = _.union(Object.keys(a), Object.keys(b)).sort();
    var r = 0;
    keys.every((key) => {
        if (typeof a[key] === "string" && typeof b[key] !== "string") {
            r = -1;
            return false;
        }
        if (typeof a[key] !== "string" && typeof b[key] === "string") {
            r = +1;
            return false;
        }
        if (typeof a[key] !== "string" && typeof b[key] !== "string") {
            r = 0;
            return true;
        }
        r = a[key].localeCompare(b[key]);
        return r === 0;
    });
    return r;
}
exports.sortFlatRecords = sortFlatRecords;
;
function cmpLengthSort(a, b) {
    var d = a.length - b.length;
    if (d) {
        return d;
    }
    return a.localeCompare(b);
}
const Algol = require("../match/algol");
// offset[0] : len-2
//             len -1
//             len
//             len +1
//             len +2
//             len +3
function findNextLen(targetLen, arr, offsets) {
    offsets.shift();
    for (var i = offsets[4]; (i < arr.length) && (arr[i].length <= targetLen); ++i) {
        /* empty*/
    }
    //console.log("pushing " + i);
    offsets.push(i);
}
exports.findNextLen = findNextLen;
function addRangeRulesUnlessPresent(rules, lcword, rangeRules, presentRulesForKey, seenRules) {
    rangeRules.forEach(rangeRule => {
        var newRule = Object.assign({}, rangeRule);
        newRule.lowercaseword = lcword;
        newRule.word = lcword;
        //if((lcword === 'services' || lcword === 'service') && newRule.range.rule.lowercaseword.indexOf('odata')>=0) {
        //    console.log("adding "+ JSON.stringify(newRule) + "\n");
        //}
        //todo: check whether an equivalent rule is already present?
        var cnt = rules.length;
        insertRuleIfNotPresent(rules, newRule, seenRules);
    });
}
exports.addRangeRulesUnlessPresent = addRangeRulesUnlessPresent;
function addCloseExactRangeRules(rules, seenRules) {
    var keysMap = {};
    var rangeKeysMap = {};
    rules.forEach(rule => {
        if (rule.type === IMatch.EnumRuleType.WORD) {
            //keysMap[rule.lowercaseword] = 1;
            keysMap[rule.lowercaseword] = keysMap[rule.lowercaseword] || [];
            keysMap[rule.lowercaseword].push(rule);
            if (!rule.exactOnly && rule.range) {
                rangeKeysMap[rule.lowercaseword] = rangeKeysMap[rule.lowercaseword] || [];
                rangeKeysMap[rule.lowercaseword].push(rule);
            }
        }
    });
    var keys = Object.keys(keysMap);
    keys.sort(cmpLengthSort);
    var len = 0;
    keys.forEach((key, index) => {
        if (key.length != len) {
            //console.log("shift to len" + key.length + ' at ' + index + ' ' + key );
        }
        len = key.length;
    });
    //   keys = keys.slice(0,2000);
    var rangeKeys = Object.keys(rangeKeysMap);
    rangeKeys.sort(cmpLengthSort);
    //console.log(` ${keys.length} keys and ${rangeKeys.length} rangekeys `);
    var low = 0;
    var high = 0;
    var lastlen = 0;
    var offsets = [0, 0, 0, 0, 0, 0];
    var len = rangeKeys.length;
    findNextLen(0, keys, offsets);
    findNextLen(1, keys, offsets);
    findNextLen(2, keys, offsets);
    rangeKeys.forEach(function (rangeKey) {
        if (rangeKey.length !== lastlen) {
            for (i = lastlen + 1; i <= rangeKey.length; ++i) {
                findNextLen(i + 2, keys, offsets);
            }
            //   console.log(` shifted to ${rangeKey.length} with offsets beeing ${offsets.join(' ')}`);
            //   console.log(` here 0 ${offsets[0]} : ${keys[Math.min(keys.length-1, offsets[0])].length}  ${keys[Math.min(keys.length-1, offsets[0])]} `);
            //  console.log(` here 5-1  ${keys[offsets[5]-1].length}  ${keys[offsets[5]-1]} `);
            //   console.log(` here 5 ${offsets[5]} : ${keys[Math.min(keys.length-1, offsets[5])].length}  ${keys[Math.min(keys.length-1, offsets[5])]} `);
            lastlen = rangeKey.length;
        }
        for (var i = offsets[0]; i < offsets[5]; ++i) {
            var d = Distance.calcDistanceAdjusted(rangeKey, keys[i]);
            // console.log(`${rangeKey.length-keys[i].length} ${d} ${rangeKey} and ${keys[i]}  `);
            if ((d !== 1.0) && (d >= Algol.Cutoff_rangeCloseMatch)) {
                //console.log(`would add ${rangeKey} for ${keys[i]} ${d}`);
                var cnt = rules.length;
                // we only have to add if there is not yet a match rule here which points to the same
                addRangeRulesUnlessPresent(rules, keys[i], rangeKeysMap[rangeKey], keysMap[keys[i]], seenRules);
                if (rules.length > cnt) {
                    //console.log(` added ${(rules.length - cnt)} records at${rangeKey} for ${keys[i]} ${d}`);
                }
            }
        }
    });
    /*
    [
        ['aEFG','aEFGH'],
        ['aEFGH','aEFGHI'],
        ['Odata','ODatas'],
   ['Odata','Odatas'],
   ['Odata','Odatb'],
   ['Odata','UData'],
   ['service','services'],
   ['this isfunny and more','this isfunny and mores'],
    ].forEach(rec => {
        console.log(`distance ${rec[0]} ${rec[1]} : ${Distance.calcDistance(rec[0],rec[1])}  adf ${Distance.calcDistanceAdjusted(rec[0],rec[1])} `);

    });
    console.log("distance Odata Udata"+ Distance.calcDistance('OData','UData'));
    console.log("distance Odata Odatb"+ Distance.calcDistance('OData','ODatb'));
    console.log("distance Odatas Odata"+ Distance.calcDistance('OData','ODataa'));
    console.log("distance Odatas abcde"+ Distance.calcDistance('abcde','abcdef'));
    console.log("distance services "+ Distance.calcDistance('services','service'));
    */
}
exports.addCloseExactRangeRules = addCloseExactRangeRules;
var n = 0;
function readFillers(mongoose, oModel) {
    var fillerBitIndex = getDomainBitIndex('meta', oModel);
    var bitIndexAllDomains = getAllDomainsBitIndex(oModel);
    return Schemaload.getFillersFromDB(mongoose).then((fillersObj) => fillersObj.fillers).then((fillers) => {
        //  fillersreadFileAsJSON('./' + modelPath + '/filler.json');
        /*
        var re = "^((" + fillers.join(")|(") + "))$";
        oModel.mRules.push({
            category: "filler",
            type: IMatch.EnumRuleType.REGEXP,
            regexp: new RegExp(re, "i"),
            matchedString: "filler",
            bitindex: fillerBitIndex,
            _ranking: 0.9
        });
        */
        if (!_.isArray(fillers)) {
            throw new Error('expect fillers to be an array of strings');
        }
        fillers.forEach(filler => {
            insertRuleIfNotPresent(oModel.mRules, {
                category: "filler",
                type: IMatch.EnumRuleType.WORD,
                word: filler,
                lowercaseword: filler.toLowerCase(),
                matchedString: filler,
                exactOnly: true,
                bitindex: fillerBitIndex,
                bitSentenceAnd: bitIndexAllDomains,
                wordType: IMatch.WORDTYPE.FILLER,
                _ranking: 0.9
            }, oModel.seenRules);
        });
        return true;
    });
}
exports.readFillers = readFillers;
;
function readOperators(mongoose, oModel) {
    debuglog('reading operators');
    //add operators
    return Schemaload.getOperatorsFromDB(mongoose).then((operators) => {
        var operatorBitIndex = getDomainBitIndex('operators', oModel);
        var bitIndexAllDomains = getAllDomainsBitIndex(oModel);
        Object.keys(operators.operators).forEach(function (operator) {
            if (IMatch.aOperatorNames.indexOf(operator) < 0) {
                debuglog("unknown operator " + operator);
                throw new Error("unknown operator " + operator + ' (add to ifmatch.ts  aOperatorNames)');
            }
            oModel.operators[operator] = operators.operators[operator];
            oModel.operators[operator].operator = operator;
            Object.freeze(oModel.operators[operator]);
            var word = operator;
            insertRuleIfNotPresent(oModel.mRules, {
                category: "operator",
                word: word.toLowerCase(),
                lowercaseword: word.toLowerCase(),
                type: IMatch.EnumRuleType.WORD,
                matchedString: word,
                bitindex: operatorBitIndex,
                bitSentenceAnd: bitIndexAllDomains,
                wordType: IMatch.WORDTYPE.OPERATOR,
                _ranking: 0.9
            }, oModel.seenRules);
            // add all synonyms
            if (operators.synonyms[operator]) {
                var arr = operators.synonyms[operator];
                if (arr) {
                    if (Array.isArray(arr)) {
                        arr.forEach(function (synonym) {
                            insertRuleIfNotPresent(oModel.mRules, {
                                category: "operator",
                                word: synonym.toLowerCase(),
                                lowercaseword: synonym.toLowerCase(),
                                type: IMatch.EnumRuleType.WORD,
                                matchedString: operator,
                                bitindex: operatorBitIndex,
                                bitSentenceAnd: bitIndexAllDomains,
                                wordType: IMatch.WORDTYPE.OPERATOR,
                                _ranking: 0.9
                            }, oModel.seenRules);
                        });
                    }
                    else {
                        throw Error("Expeted operator synonym to be array " + operator + " is " + JSON.stringify(arr));
                    }
                }
            }
            return true;
        });
        return true;
    });
}
exports.readOperators = readOperators;
;
function releaseModel(model) {
    if (model.mongoHandle && model.mongoHandle.mongoose) {
        MongoUtils.disconnect(model.mongoHandle.mongoose);
    }
}
exports.releaseModel = releaseModel;
/*
export function loadModelHandleP(mongooseHndl : mongoose.Mongoose, modelPath: string, connectionString? : string) : Promise<IMatch.IModels> {
    var mongooseX = mongooseHndl || mongoose;
 //   if(process.env.MONGO_REPLAY) {
 //        mongooseX = mongooseMock.mongooseMock as any;
 //    }
    var connStr = connectionString || 'mongodb://localhost/testdb';
    return MongoUtils.openMongoose(mongooseX, connStr).then(
        () => getMongoHandle(mongooseX)
    ).then( (modelHandle : IMatch.IModelHandleRaw) => loadModelsFull(modelHandle, modelPath));
};
*/
function loadModelsOpeningConnection(mongooseHndl, connectionString, modelPath) {
    var mongooseX = mongooseHndl || mongoose;
    //   if(process.env.MONGO_REPLAY) {
    //        mongooseX = mongooseMock.mongooseMock as any;
    //    }
    console.log(" explicit connection string " + connectionString);
    var connStr = connectionString || 'mongodb://localhost/testdb';
    return MongoUtils.openMongoose(mongooseX, connStr).then(() => {
        return loadModels(mongooseX, modelPath);
    });
}
exports.loadModelsOpeningConnection = loadModelsOpeningConnection;
/**
 * expects an open connection!
 * @param mongoose
 * @param modelPath
 */
function loadModels(mongoose, modelPath) {
    if (mongoose === undefined) {
        throw new Error('expect a mongoose handle to be passed');
    }
    return getMongoHandle(mongoose).then((modelHandle) => {
        debuglog(`got a mongo handle for ${modelPath}`);
        return _loadModelsFull(modelHandle, modelPath);
    });
}
exports.loadModels = loadModels;
function _loadModelsFull(modelHandle, modelPath) {
    var oModel;
    modelPath = modelPath || envModelPath;
    modelHandle = modelHandle || {
        mongoose: undefined,
        modelDocs: {},
        mongoMaps: {},
        modelESchemas: {}
    };
    oModel = {
        mongoHandle: modelHandle,
        full: { domain: {} },
        rawModels: {},
        domains: [],
        rules: undefined,
        category: [],
        operators: {},
        mRules: [],
        seenRules: {},
        meta: { t3: {} }
    };
    var t = Date.now();
    try {
        debuglog(() => 'here model path' + modelPath);
        var a = CircularSer.load(modelPath + '/_cache.js');
        // TODO
        //console.log("found a cache ?  " + !!a);
        //a = undefined;
        if (a && !process.env.MGNLQ_MODEL_NO_FILECACHE) {
            //console.log('return preps' + modelPath);
            debuglog("\n return prepared model !!");
            if (process.env.ABOT_EMAIL_USER) {
                console.log("loaded models from cache in " + (Date.now() - t) + " ");
            }
            var res = a;
            res.mongoHandle.mongoose = modelHandle.mongoose;
            return Promise.resolve(res);
        }
    }
    catch (e) {
        //console.log('error' + e);
        // no cache file,
    }
    //var mdls = readFileAsJSON('./' + modelPath + '/models.json');
    var mdls = Object.keys(modelHandle.modelDocs).sort();
    var seenDomains = {};
    mdls.forEach((modelName, index) => {
        var domain = modelHandle.modelDocs[modelName].domain;
        if (seenDomains[domain]) {
            throw new Error('Domain ' + domain + ' already loaded while loading ' + modelName + '?');
        }
        seenDomains[domain] = index;
    });
    oModel.domains = mdls.map(modelName => modelHandle.modelDocs[modelName].domain);
    // create bitindex in order !
    debuglog('got domains ' + mdls.join("\n"));
    debuglog('loading models ' + mdls.join("\n"));
    return Promise.all(mdls.map((sModelName) => loadModel(modelHandle, sModelName, oModel))).then(() => {
        var metaBitIndex = getDomainBitIndex('meta', oModel);
        var bitIndexAllDomains = getAllDomainsBitIndex(oModel);
        // add the domain meta rule
        insertRuleIfNotPresent(oModel.mRules, {
            category: "meta",
            matchedString: "domain",
            type: IMatch.EnumRuleType.WORD,
            word: "domain",
            bitindex: metaBitIndex,
            wordType: IMatch.WORDTYPE.META,
            bitSentenceAnd: bitIndexAllDomains,
            _ranking: 0.95
        }, oModel.seenRules);
        // insert the Numbers rules
        console.log(' add numbers rule');
        insertRuleIfNotPresent(oModel.mRules, {
            category: "number",
            matchedString: "one",
            type: IMatch.EnumRuleType.REGEXP,
            regexp: /^((\d+)|(one)|(two)|(three))$/,
            matchIndex: 0,
            word: "<number>",
            bitindex: metaBitIndex,
            wordType: IMatch.WORDTYPE.NUMERICARG,
            bitSentenceAnd: bitIndexAllDomains,
            _ranking: 0.95
        }, oModel.seenRules);
        return true;
    }).then(() => readFillers(modelHandle.mongoose, oModel)).then(() => readOperators(modelHandle.mongoose, oModel)).then(() => {
        /*
            })
                {
              category: "filler",
              type: 1,
              regexp: /^((start)|(show)|(from)|(in))$/i,
              matchedString: "filler",
              _ranking: 0.9
            },
        */
        debuglog('saving data to ' + modelPath);
        oModel.mRules = oModel.mRules.sort(InputFilterRules.cmpMRule);
        addCloseExactRangeRules(oModel.mRules, oModel.seenRules);
        oModel.mRules = oModel.mRules.sort(InputFilterRules.cmpMRule);
        oModel.mRules.sort(InputFilterRules.cmpMRule);
        //fs.writeFileSync("post_sort", JSON.stringify(oModel.mRules,undefined,2));
        forceGC();
        oModel.rules = splitRules(oModel.mRules);
        fs.writeFileSync("test1x.json", JSON.stringify(oModel.rules, undefined, 2));
        forceGC();
        delete oModel.seenRules;
        debuglog('saving');
        forceGC();
        var oModelSer = Object.assign({}, oModel);
        oModelSer.mongoHandle = Object.assign({}, oModel.mongoHandle);
        delete oModelSer.mongoHandle.mongoose;
        CircularSer.save(modelPath + '/_cache.js', oModelSer);
        forceGC();
        if (process.env.ABOT_EMAIL_USER) {
            console.log("loaded models by calculation in " + (Date.now() - t) + " ");
        }
        var res = oModel;
        // (Object as any).assign(modelHandle, { model: oModel }) as IMatch.IModelHandle;
        return res;
    }).catch((err) => {
        console.log(err + ' ' + err.stack);
        process.exit(-1);
    });
}
exports._loadModelsFull = _loadModelsFull;
function sortCategoriesByImportance(map, cats) {
    var res = cats.slice(0);
    res.sort(rankCategoryByImportance.bind(undefined, map));
    return res;
}
exports.sortCategoriesByImportance = sortCategoriesByImportance;
function rankCategoryByImportance(map, cata, catb) {
    var catADesc = map[cata];
    var catBDesc = map[catb];
    if (cata === catb) {
        return 0;
    }
    // if a is before b, return -1
    if (catADesc && !catBDesc) {
        return -1;
    }
    if (!catADesc && catBDesc) {
        return +1;
    }
    var prioA = (catADesc && catADesc.importance) || 99;
    var prioB = (catBDesc && catBDesc.importance) || 99;
    // lower prio goes to front
    var r = prioA - prioB;
    if (r) {
        return r;
    }
    return cata.localeCompare(catb);
}
exports.rankCategoryByImportance = rankCategoryByImportance;
const MetaF = Meta.getMetaFactory();
function getOperator(mdl, operator) {
    return mdl.operators[operator];
}
exports.getOperator = getOperator;
function getResultAsArray(mdl, a, rel) {
    if (rel.toType() !== 'relation') {
        throw new Error("expect relation as 2nd arg");
    }
    var res = mdl.meta.t3[a.toFullString()] &&
        mdl.meta.t3[a.toFullString()][rel.toFullString()];
    if (!res) {
        return [];
    }
    return Object.getOwnPropertyNames(res).sort().map(MetaF.parseIMeta);
}
exports.getResultAsArray = getResultAsArray;
function checkDomainPresent(theModel, domain) {
    if (theModel.domains.indexOf(domain) < 0) {
        throw new Error("Domain \"" + domain + "\" not part of model");
    }
}
exports.checkDomainPresent = checkDomainPresent;
function getShowURICategoriesForDomain(theModel, domain) {
    checkDomainPresent(theModel, domain);
    var modelName = getModelNameForDomain(theModel.mongoHandle, domain);
    var allcats = getResultAsArray(theModel, MetaF.Domain(domain), MetaF.Relation(Meta.RELATION_hasCategory));
    var doc = theModel.mongoHandle.modelDocs[modelName];
    var res = doc._categories.filter(cat => cat.showURI).map(cat => cat.category);
    return res;
}
exports.getShowURICategoriesForDomain = getShowURICategoriesForDomain;
function getShowURIRankCategoriesForDomain(theModel, domain) {
    checkDomainPresent(theModel, domain);
    var modelName = getModelNameForDomain(theModel.mongoHandle, domain);
    var allcats = getResultAsArray(theModel, MetaF.Domain(domain), MetaF.Relation(Meta.RELATION_hasCategory));
    var doc = theModel.mongoHandle.modelDocs[modelName];
    var res = doc._categories.filter(cat => cat.showURIRank).map(cat => cat.category);
    return res;
}
exports.getShowURIRankCategoriesForDomain = getShowURIRankCategoriesForDomain;
function getCategoriesForDomain(theModel, domain) {
    checkDomainPresent(theModel, domain);
    var res = getResultAsArray(theModel, MetaF.Domain(domain), MetaF.Relation(Meta.RELATION_hasCategory));
    return Meta.getStringArray(res);
}
exports.getCategoriesForDomain = getCategoriesForDomain;
function getTableColumns(theModel, domain) {
    checkDomainPresent(theModel, domain);
    return theModel.rawModels[domain].columns.slice(0);
}
exports.getTableColumns = getTableColumns;
function forceGC() {
    if (global && global.gc) {
        global.gc();
    }
}
/**
 * Return all categories of a domain which can appear on a word,
 * these are typically the wordindex domains + entries generated by generic rules
 *
 * The current implementation is a simplification
 */
function getPotentialWordCategoriesForDomain(theModel, domain) {
    // this is a simplified version
    return getCategoriesForDomain(theModel, domain);
}
exports.getPotentialWordCategoriesForDomain = getPotentialWordCategoriesForDomain;
function getDomainsForCategory(theModel, category) {
    if (theModel.category.indexOf(category) < 0) {
        throw new Error("Category \"" + category + "\" not part of model");
    }
    var res = getResultAsArray(theModel, MetaF.Category(category), MetaF.Relation(Meta.RELATION_isCategoryOf));
    return Meta.getStringArray(res);
}
exports.getDomainsForCategory = getDomainsForCategory;
/*
export function getAllRecordCategoriesForTargetCategory(model: IMatch.IModels, category: string, wordsonly: boolean): { [key: string]: boolean } {
    var res = {};
    //
    var fn = wordsonly ? getPotentialWordCategoriesForDomain : getCategoriesForDomain;
    var domains = getDomainsForCategory(model, category);
    domains.forEach(function (domain) {
        fn(model, domain).forEach(function (wordcat) {
            res[wordcat] = true;
        });
    });
    Object.freeze(res);
    return res;
}

export function getAllRecordCategoriesForTargetCategories(model: IMatch.IModels, categories: string[], wordsonly: boolean): { [key: string]: boolean } {
    var res = {};
    //
    var fn = wordsonly ? getPotentialWordCategoriesForDomain : getCategoriesForDomain;
    var domains = undefined;
    categories.forEach(function (category) {
        var catdomains = getDomainsForCategory(model, category)
        if (!domains) {
            domains = catdomains;
        } else {
            domains = _.intersection(domains, catdomains);
        }
    });
    if (domains.length === 0) {
        throw new Error('categories ' + Utils.listToQuotedCommaAnd(categories) + ' have no common domain.')
    }
    domains.forEach(function (domain) {
        fn(model, domain).forEach(function (wordcat) {
            res[wordcat] = true;
        });
    });
    Object.freeze(res);
    return res;
}
*/
/**
 * givena  set  of categories, return a structure
 *
 *
 * { domains : ["DOMAIN1", "DOMAIN2"],
 *   categorySet : {   cat1 : true, cat2 : true, ...}
 * }
 */
function getDomainCategoryFilterForTargetCategories(model, categories, wordsonly) {
    var res = {};
    //
    var fn = wordsonly ? getPotentialWordCategoriesForDomain : getCategoriesForDomain;
    var domains = undefined;
    categories.forEach(function (category) {
        var catdomains = getDomainsForCategory(model, category);
        if (!domains) {
            domains = catdomains;
        }
        else {
            domains = _.intersection(domains, catdomains);
        }
    });
    if (domains.length === 0) {
        throw new Error('categories ' + Utils.listToQuotedCommaAnd(categories) + ' have no common domain.');
    }
    domains.forEach(function (domain) {
        fn(model, domain).forEach(function (wordcat) {
            res[wordcat] = true;
        });
    });
    Object.freeze(res);
    return {
        domains: domains,
        categorySet: res
    };
}
exports.getDomainCategoryFilterForTargetCategories = getDomainCategoryFilterForTargetCategories;
function getDomainCategoryFilterForTargetCategory(model, category, wordsonly) {
    return getDomainCategoryFilterForTargetCategories(model, [category], wordsonly);
}
exports.getDomainCategoryFilterForTargetCategory = getDomainCategoryFilterForTargetCategory;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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Q0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsR0FBRyx5QkFBeUIsQ0FBQyxDQUFBO0tBQ3RHO0lBQ0QsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLE1BQU07UUFDNUIsRUFBRSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxPQUFPO1lBQ3ZDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDLENBQUMsQ0FBQztJQUNILE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbkIsT0FBTztRQUNILE9BQU8sRUFBRSxPQUFPO1FBQ2hCLFdBQVcsRUFBRSxHQUFHO0tBQ25CLENBQUM7QUFDTixDQUFDO0FBMUJELGdHQTBCQztBQUdELFNBQWdCLHdDQUF3QyxDQUFDLEtBQXFCLEVBQUUsUUFBZ0IsRUFBRSxTQUFrQjtJQUNoSCxPQUFPLDBDQUEwQyxDQUFDLEtBQUssRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQ3BGLENBQUM7QUFGRCw0RkFFQyIsImZpbGUiOiJtb2RlbC9tb2RlbC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBGdW5jdGlvbmFsaXR5IG1hbmFnaW5nIHRoZSBtYXRjaCBtb2RlbHNcclxuICpcclxuICogQGZpbGVcclxuICovXHJcblxyXG4vL2ltcG9ydCAqIGFzIGludGYgZnJvbSAnY29uc3RhbnRzJztcclxuaW1wb3J0ICogYXMgZGVidWdmIGZyb20gJ2RlYnVnZic7XHJcblxyXG52YXIgZGVidWdsb2cgPSBkZWJ1Z2YoJ21vZGVsJyk7XHJcblxyXG4vLyB0aGUgaGFyZGNvZGVkIGRvbWFpbiBtZXRhbW9kZWwhXHJcbmNvbnN0IERPTUFJTl9NRVRBTU9ERUwgPSAnbWV0YW1vZGVsJztcclxuXHJcblxyXG4vL2NvbnN0IGxvYWRsb2cgPSBsb2dnZXIubG9nZ2VyKCdtb2RlbGxvYWQnLCAnJyk7XHJcblxyXG5pbXBvcnQgKiAgYXMgSU1hdGNoIGZyb20gJy4uL21hdGNoL2lmbWF0Y2gnO1xyXG5pbXBvcnQgKiBhcyBJbnB1dEZpbHRlclJ1bGVzIGZyb20gJy4uL21hdGNoL3J1bGUnO1xyXG4vL2ltcG9ydCAqIGFzIFRvb2xzIGZyb20gJy4uL21hdGNoL3Rvb2xzJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgKiBhcyBNZXRhIGZyb20gJy4vbWV0YSc7XHJcbmltcG9ydCAqIGFzIFV0aWxzIGZyb20gJ2Fib3RfdXRpbHMnO1xyXG5pbXBvcnQgKiBhcyBDaXJjdWxhclNlciBmcm9tICdhYm90X3V0aWxzJztcclxuaW1wb3J0ICogYXMgRGlzdGFuY2UgZnJvbSAnYWJvdF9zdHJpbmdkaXN0JztcclxuaW1wb3J0ICogYXMgcHJvY2VzcyBmcm9tICdwcm9jZXNzJztcclxuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xyXG5cclxuaW1wb3J0ICogYXMgTW9uZ29VdGlscyBmcm9tICcuLi91dGlscy9tb25nbyc7XHJcblxyXG5pbXBvcnQgKiBhcyBtb25nb29zZSBmcm9tICdtb25nb29zZSc7XHJcbmltcG9ydCAqIGFzIElTY2hlbWEgZnJvbSAnLi4vbW9kZWxsb2FkL3NjaGVtYWxvYWQnO1xyXG5pbXBvcnQgKiBhcyBTY2hlbWFsb2FkIGZyb20gJy4uL21vZGVsbG9hZC9zY2hlbWFsb2FkJztcclxuaW1wb3J0ICogYXMgTW9uZ29NYXAgZnJvbSAnLi9tb25nb21hcCc7XHJcblxyXG4vKipcclxuICogdGhlIG1vZGVsIHBhdGgsIG1heSBiZSBjb250cm9sbGVkIHZpYSBlbnZpcm9ubWVudCB2YXJpYWJsZVxyXG4gKi9cclxudmFyIGVudk1vZGVsUGF0aCA9IHByb2Nlc3MuZW52W1wiQUJPVF9NT0RFTFBBVEhcIl0gfHwgXCJub2RlX21vZHVsZXMvbWdubHFfdGVzdG1vZGVsL3Rlc3Rtb2RlbFwiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjbXBUb29scyhhOiBJTWF0Y2guSVRvb2wsIGI6IElNYXRjaC5JVG9vbCkge1xyXG4gICAgcmV0dXJuIGEubmFtZS5sb2NhbGVDb21wYXJlKGIubmFtZSk7XHJcbn1cclxuXHJcbnR5cGUgSU1vZGVsID0gSU1hdGNoLklNb2RlbDtcclxuXHJcbi8qKlxyXG4gKiByZXR1cm5zIHdoZW4gYWxsIG1vZGVscyBhcmUgbG9hZGVkIGFuZCBhbGwgbW9kZWxkb2NzIGFyZSBtYWRlXHJcbiAqIEBwYXJhbSBtb25nb29zZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldE1vbmdvSGFuZGxlKG1vbmdvb3NlOiBtb25nb29zZS5Nb25nb29zZSk6IFByb21pc2U8SU1hdGNoLklNb2RlbEhhbmRsZVJhdz4ge1xyXG4gICAgdmFyIHJlcyA9IHtcclxuICAgICAgICBtb25nb29zZTogbW9uZ29vc2UsXHJcbiAgICAgICAgbW9kZWxEb2NzOiB7fSxcclxuICAgICAgICBtb2RlbEVTY2hlbWFzOiB7fSxcclxuICAgICAgICBtb25nb01hcHM6IHt9XHJcbiAgICB9IGFzIElNYXRjaC5JTW9kZWxIYW5kbGVSYXc7XHJcbiAgICB2YXIgbW9kZWxFUyA9IFNjaGVtYWxvYWQuZ2V0RXh0ZW5kZWRTY2hlbWFNb2RlbChtb25nb29zZSk7XHJcbiAgICByZXR1cm4gbW9kZWxFUy5kaXN0aW5jdCgnbW9kZWxuYW1lJykudGhlbigobW9kZWxuYW1lcykgPT4ge1xyXG4gICAgICAgIGRlYnVnbG9nKCgpID0+ICdoZXJlIGRpc3RpbmN0IG1vZGVsbmFtZXMgJyArIEpTT04uc3RyaW5naWZ5KG1vZGVsbmFtZXMpKTtcclxuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwobW9kZWxuYW1lcy5tYXAoZnVuY3Rpb24gKG1vZGVsbmFtZSkge1xyXG4gICAgICAgICAgICBkZWJ1Z2xvZygoKSA9PiAnY3JlYXRpbmcgdHJpcGVsIGZvciAnICsgbW9kZWxuYW1lKTtcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFtTY2hlbWFsb2FkLmdldEV4dGVuZFNjaGVtYURvY0Zyb21EQihtb25nb29zZSwgbW9kZWxuYW1lKSxcclxuICAgICAgICAgICAgU2NoZW1hbG9hZC5tYWtlTW9kZWxGcm9tREIobW9uZ29vc2UsIG1vZGVsbmFtZSksXHJcbiAgICAgICAgICAgIFNjaGVtYWxvYWQuZ2V0TW9kZWxEb2NGcm9tREIobW9uZ29vc2UsIG1vZGVsbmFtZSldKS50aGVuKFxyXG4gICAgICAgICAgICAgICAgKHZhbHVlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coKCkgPT4gJ2F0dGVtcHRpbmcgdG8gbG9hZCAnICsgbW9kZWxuYW1lICsgJyB0byBjcmVhdGUgbW9uZ29tYXAnKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgW2V4dGVuZGVkU2NoZW1hLCBtb2RlbCwgbW9kZWxEb2NdID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLm1vZGVsRVNjaGVtYXNbbW9kZWxuYW1lXSA9IGV4dGVuZGVkU2NoZW1hO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5tb2RlbERvY3NbbW9kZWxuYW1lXSA9IG1vZGVsRG9jO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5tb25nb01hcHNbbW9kZWxuYW1lXSA9IE1vbmdvTWFwLm1ha2VNb25nb01hcChtb2RlbERvYywgZXh0ZW5kZWRTY2hlbWEpXHJcbiAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coKCk9PiAnY3JlYXRlZCBtb25nb21hcCBmb3IgJyArIG1vZGVsbmFtZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICApXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfSkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIHJlcztcclxuICAgIH0pXHJcbiAgICAvL3ZhciBtb2RlbERvYyA9IFNjaGVtYWxvYWQuZ2V0RXh0ZW5kZWREb2NNb2RlbChtb25nb29zZSk7XHJcbiAgICAvL3Jlcy5tb2RlbERvY3NbSVNjaGVtYS5Nb25nb05MUS5NT0RFTE5BTUVfTUVUQU1PREVMU10gPSBtb2RlbERvYztcclxuICAgIC8vcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmFjdFN5bm9ueW1zKG1vbmdvSGFuZGxlOiBJTWF0Y2guSU1vZGVsSGFuZGxlUmF3LCBtb2RlbG5hbWU6IHN0cmluZyk6IFByb21pc2U8SVN5bm9ueW1bXT4ge1xyXG4gICAgdmFyIG1vZGVsID0gbW9uZ29IYW5kbGUubW9uZ29vc2UubW9kZWwoU2NoZW1hbG9hZC5tYWtlTW9uZ29vc2VNb2RlbE5hbWUobW9kZWxuYW1lKSk7XHJcbiAgICAvLyAgICAgcmV0dXJuIG1vZGVsLmZpbmQoIHsgXCJfc3lub255bXMuMFwiIDogeyAkZXhpc3RzOiBmYWxzZX19KS5sZWFuKCkuZXhlYygpO1xyXG4vKiBtb25nb29zZSBwcmlvclxyXG4gICAgcmV0dXJuIG1vZGVsLmFnZ3JlZ2F0ZSh7ICRtYXRjaDogeyBcIl9zeW5vbnltcy4wXCI6IHsgJGV4aXN0czogdHJ1ZSB9IH0gfSxcclxuICAgICAgICB7ICRwcm9qZWN0OiB7IF9zeW5vbnltczogMSB9IH0sXHJcbiAgICAgICAgeyAkdW53aW5kOiBcIiRfc3lub255bXNcIiB9LFxyXG4gICAgICAgIHsgJHByb2plY3Q6IHsgXCJjYXRlZ29yeVwiOiBcIiRfc3lub255bXMuY2F0ZWdvcnlcIiwgXCJmYWN0XCI6IFwiJF9zeW5vbnltcy5mYWN0XCIsIFwic3lub255bXNcIjogXCIkX3N5bm9ueW1zLnN5bm9ueW1zXCIgfSB9KS5leGVjKCk7XHJcbiovXHJcbiAgICByZXR1cm4gbW9kZWwuYWdncmVnYXRlKFt7ICRtYXRjaDogeyBcIl9zeW5vbnltcy4wXCI6IHsgJGV4aXN0czogdHJ1ZSB9IH0gfSxcclxuICAgICAgICB7ICRwcm9qZWN0OiB7IF9zeW5vbnltczogMSB9IH0sXHJcbiAgICAgICAgeyAkdW53aW5kOiBcIiRfc3lub255bXNcIiB9LFxyXG4gICAgICAgIHsgJHByb2plY3Q6IHsgXCJjYXRlZ29yeVwiOiBcIiRfc3lub255bXMuY2F0ZWdvcnlcIiwgXCJmYWN0XCI6IFwiJF9zeW5vbnltcy5mYWN0XCIsIFwic3lub255bXNcIjogXCIkX3N5bm9ueW1zLnN5bm9ueW1zXCIgfSB9XSkuZXhlYygpO1xyXG5cclxuXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVN5bm9ueW0ge1xyXG4gICAgY2F0ZWdvcnk6IHN0cmluZyxcclxuICAgIGZhY3Q6IHN0cmluZyxcclxuICAgIHN5bm9ueW1zOiBzdHJpbmdbXVxyXG59O1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJU3lub255bUJlYXJpbmdEb2Mge1xyXG4gICAgX3N5bm9ueW1zOiBbe1xyXG4gICAgICAgIGNhdGVnb3J5OiBzdHJpbmcsXHJcbiAgICAgICAgZmFjdDogc3RyaW5nLFxyXG4gICAgICAgIHN5bm9ueW1zOiBzdHJpbmdbXVxyXG4gICAgfV1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldE1vbmdvQ29sbGVjdGlvbk5hbWVGb3JEb21haW4odGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzLCBkb21haW4gOiBzdHJpbmcpIDogc3RyaW5nIHtcclxuICAgIHZhciByID0gZ2V0TW9uZ29vc2VNb2RlbE5hbWVGb3JEb21haW4odGhlTW9kZWwsIGRvbWFpbik7XHJcbiAgICByZXR1cm4gU2NoZW1hbG9hZC5tYWtlTW9uZ29Db2xsZWN0aW9uTmFtZShyKVxyXG59XHJcblxyXG4vL1NjaGVtYWxvYWQubWFrZU1vbmdvb3NlTW9kZWxOYW1lKG1vZGVsbmFtZSlcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRNb25nb29zZU1vZGVsTmFtZUZvckRvbWFpbih0aGVNb2RlbCA6IElNYXRjaC5JTW9kZWxzLCBkb21haW4gOiBzdHJpbmcpIDogc3RyaW5nIHtcclxuICAgIHZhciByID0gZ2V0TW9kZWxOYW1lRm9yRG9tYWluKHRoZU1vZGVsLm1vbmdvSGFuZGxlLCBkb21haW4pO1xyXG4gICAgdmFyIHIyID0gU2NoZW1hbG9hZC5tYWtlTW9uZ29vc2VNb2RlbE5hbWUocik7XHJcbiAgICByZXR1cm4gcjI7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0TW9kZWxGb3JNb2RlbE5hbWUodGhlTW9kZWwgOiBJTWF0Y2guSU1vZGVscywgbW9kZWxuYW1lOiBzdHJpbmcpIDogYW55IHtcclxuICAgIHJldHVybiB0aGVNb2RlbC5tb25nb0hhbmRsZS5tb25nb29zZS5tb2RlbChTY2hlbWFsb2FkLm1ha2VNb25nb29zZU1vZGVsTmFtZShtb2RlbG5hbWUpKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldE1vZGVsRm9yRG9tYWluKHRoZU1vZGVsIDogSU1hdGNoLklNb2RlbHMsIGRvbWFpbiA6IHN0cmluZykgOiBhbnkge1xyXG4gICAgdmFyIG1vZGVsbmFtZSA9IGdldE1vZGVsTmFtZUZvckRvbWFpbih0aGVNb2RlbC5tb25nb0hhbmRsZSwgZG9tYWluKTtcclxuICAgIHJldHVybiBnZXRNb2RlbEZvck1vZGVsTmFtZSh0aGVNb2RlbCwgbW9kZWxuYW1lKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldE1vZGVsTmFtZUZvckRvbWFpbihoYW5kbGUgOiBJTWF0Y2guSU1vZGVsSGFuZGxlUmF3LCBkb21haW4gOiBzdHJpbmcpIDogc3RyaW5nIHtcclxuICAgIHZhciByZXMgPSB1bmRlZmluZWQ7XHJcbiAgICBPYmplY3Qua2V5cyhoYW5kbGUubW9kZWxEb2NzKS5ldmVyeSgga2V5ID0+IHtcclxuICAgICAgICB2YXIgZG9jID0gaGFuZGxlLm1vZGVsRG9jc1trZXldO1xyXG4gICAgICAgIGlmKGRvbWFpbiA9PT0gZG9jLmRvbWFpbikge1xyXG4gICAgICAgICAgICByZXMgPSBkb2MubW9kZWxuYW1lO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gIXJlcztcclxuICAgIH0pO1xyXG4gICAgaWYoIXJlcykge1xyXG4gICAgICAgIHRocm93IEVycm9yKCdhdHRlbXB0IHRvIHJldHJpZXZlIG1vZGVsTmFtZSBmb3IgdW5rbm93biBkb21haW4gJyArIGRvbWFpbik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclJlbWFwQ2F0ZWdvcmllcyggbW9uZ29NYXAgOiBJTWF0Y2guQ2F0TW9uZ29NYXAsIGNhdGVnb3JpZXMgOiBzdHJpbmdbXSwgcmVjb3JkcyA6IGFueVtdICkgOiBhbnlbXSB7XHJcbiAgICAvL1xyXG4gICAgLy9jb25zb2xlLmxvZygnaGVyZSBtYXAnICsgSlNPTi5zdHJpbmdpZnkobW9uZ29NYXAsdW5kZWZpbmVkLDIpKTtcclxuICAgIHJldHVybiByZWNvcmRzLm1hcCgocmVjLGluZGV4KSA9PiB7XHJcbiAgICAgICAgdmFyIHJlcyA9IHt9O1xyXG4gICAgICAgIGNhdGVnb3JpZXMuZm9yRWFjaChjYXRlZ29yeSA9PiB7XHJcbiAgICAgICAgICAgIHZhciBjYXRlZ29yeVBhdGggPSBtb25nb01hcFtjYXRlZ29yeV0ucGF0aHM7XHJcbiAgICAgICAgICAgIGlmKCFjYXRlZ29yeVBhdGgpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgdW5rbm93biBjYXRlZ29yeSAke2NhdGVnb3J5fSBub3QgcHJlc2VudCBpbiAke0pTT04uc3RyaW5naWZ5KG1vbmdvTWFwLHVuZGVmaW5lZCwyKX1gKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXNbY2F0ZWdvcnldID0gTW9uZ29NYXAuZ2V0TWVtYmVyQnlQYXRoKHJlYywgY2F0ZWdvcnlQYXRoKTtcclxuICAgICAgICAgICAgZGVidWdsb2coICgpPT4nZ290IG1lbWJlciBmb3IgJyAgKyBjYXRlZ29yeSArICcgZnJvbSByZWMgbm8gJyArIGluZGV4ICsgJyAnICsgSlNPTi5zdHJpbmdpZnkocmVjLHVuZGVmaW5lZCwyKSApO1xyXG4gICAgICAgICAgICBkZWJ1Z2xvZygoKT0+IEpTT04uc3RyaW5naWZ5KGNhdGVnb3J5UGF0aCkpO1xyXG4gICAgICAgICAgICBkZWJ1Z2xvZygoKT0+ICdyZXMgOiAnICsgcmVzW2NhdGVnb3J5XSApO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiByZXM7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrTW9kZWxNb25nb01hcChtb2RlbDogbW9uZ29vc2UuTW9kZWw8YW55PiwgbW9kZWxuYW1lIDogc3RyaW5nLCBtb25nb01hcDogSU1hdGNoLkNhdE1vbmdvTWFwLCBjYXRlZ29yeT8gOiBzdHJpbmcpIHtcclxuICAgIGlmICghbW9kZWwpIHtcclxuICAgICAgICBkZWJ1Z2xvZygnIG5vIG1vZGVsIGZvciAnICsgbW9kZWxuYW1lKTtcclxuIC8vICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChgbW9kZWwgJHttb2RlbG5hbWV9IG5vdCBmb3VuZCBpbiBkYmApO1xyXG4gICAgICAgIHRocm93IEVycm9yKGBtb2RlbCAke21vZGVsbmFtZX0gbm90IGZvdW5kIGluIGRiYCk7XHJcbiAgICB9XHJcbiAgICBpZiAoIW1vbmdvTWFwKSB7XHJcbiAgICAgICAgZGVidWdsb2coJyBubyBtb25nb01hcCBmb3IgJyArIG1vZGVsbmFtZSk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBtb2RlbCAke21vZGVsbmFtZX0gaGFzIG5vIG1vZGVsbWFwYCk7XHJcbi8vICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoYG1vZGVsICR7bW9kZWxuYW1lfSBoYXMgbm8gbW9kZWxtYXBgKTtcclxuICAgIH1cclxuICAgIGlmIChjYXRlZ29yeSAmJiAhbW9uZ29NYXBbY2F0ZWdvcnldKSB7XHJcbiAgICAgICAgZGVidWdsb2coJyBubyBtb25nb01hcCBjYXRlZ29yeSBmb3IgJyArIG1vZGVsbmFtZSk7XHJcbiAgLy8gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoYG1vZGVsICR7bW9kZWxuYW1lfSBoYXMgbm8gY2F0ZWdvcnkgJHtjYXRlZ29yeX1gKTtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgbW9kZWwgJHttb2RlbG5hbWV9IGhhcyBubyBjYXRlZ29yeSAke2NhdGVnb3J5fWApO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4cGFuZGVkUmVjb3Jkc0Z1bGwodGhlTW9kZWwgOiBJTWF0Y2guSU1vZGVscywgZG9tYWluIDogc3RyaW5nKSA6IFByb21pc2U8eyBba2V5IDogc3RyaW5nXSA6IGFueX0+IHtcclxuICAgIHZhciBtb25nb0hhbmRsZSA9IHRoZU1vZGVsLm1vbmdvSGFuZGxlO1xyXG4gICAgdmFyIG1vZGVsbmFtZSA9IGdldE1vZGVsTmFtZUZvckRvbWFpbih0aGVNb2RlbC5tb25nb0hhbmRsZSwgZG9tYWluKTtcclxuICAgIGRlYnVnbG9nKCgpPT5gIG1vZGVsbmFtZSBmb3IgJHtkb21haW59IGlzICR7bW9kZWxuYW1lfWApO1xyXG4gICAgdmFyIG1vZGVsID0gbW9uZ29IYW5kbGUubW9uZ29vc2UubW9kZWwoU2NoZW1hbG9hZC5tYWtlTW9uZ29vc2VNb2RlbE5hbWUobW9kZWxuYW1lKSk7XHJcbiAgICB2YXIgbW9uZ29NYXAgPSBtb25nb0hhbmRsZS5tb25nb01hcHNbbW9kZWxuYW1lXTtcclxuICAgIGRlYnVnbG9nKCgpPT4gJ2hlcmUgdGhlIG1vbmdvbWFwJyArIEpTT04uc3RyaW5naWZ5KG1vbmdvTWFwLHVuZGVmaW5lZCwyKSk7XHJcbiAgICB2YXIgcCA9IGNoZWNrTW9kZWxNb25nb01hcChtb2RlbCxtb2RlbG5hbWUsIG1vbmdvTWFwKTtcclxuICAgIGRlYnVnbG9nKCgpPT5gIGhlcmUgdGhlIG1vZGVsbWFwIGZvciAke2RvbWFpbn0gaXMgJHtKU09OLnN0cmluZ2lmeShtb25nb01hcCx1bmRlZmluZWQsMil9YCk7XHJcbiAgICAvLyAxKSBwcm9kdWNlIHRoZSBmbGF0dGVuZWQgcmVjb3Jkc1xyXG4gICAgdmFyIHJlcyA9IE1vbmdvTWFwLnVud2luZHNGb3JOb250ZXJtaW5hbEFycmF5cyhtb25nb01hcCk7XHJcbiAgICBkZWJ1Z2xvZygoKT0+J2hlcmUgdGhlIHVud2luZCBzdGF0ZW1lbnQgJyArIEpTT04uc3RyaW5naWZ5KHJlcyx1bmRlZmluZWQsMikpO1xyXG4gICAgLy8gd2UgaGF2ZSB0byB1bndpbmQgYWxsIGNvbW1vbiBub24tdGVybWluYWwgY29sbGVjdGlvbnMuXHJcbiAgICBkZWJ1Z2xvZygoKT0+J2hlcmUgdGhlIG1vZGVsICcgKyBtb2RlbC5tb2RlbE5hbWUpO1xyXG4gICAgdmFyIGNhdGVnb3JpZXMgPSBnZXRDYXRlZ29yaWVzRm9yRG9tYWluKHRoZU1vZGVsLCBkb21haW4pO1xyXG4gICAgZGVidWdsb2coKCk9PmBoZXJlIGNhdGVnb3JpZXMgZm9yICR7ZG9tYWlufSAke2NhdGVnb3JpZXMuam9pbignOycpfWApO1xyXG4gICAgaWYocmVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIHJldHVybiBtb2RlbC5maW5kKHt9KS5sZWFuKCkuZXhlYygpLnRoZW4oKCB1bndvdW5kIDogYW55W10pID0+IHtcclxuICAgICAgICAgICAgZGVidWdsb2coKCk9PidoZXJlIHJlcycgKyBKU09OLnN0cmluZ2lmeSh1bndvdW5kKSk7XHJcbiAgICAgICAgICAgIHJldHVybiBmaWx0ZXJSZW1hcENhdGVnb3JpZXMobW9uZ29NYXAsIGNhdGVnb3JpZXMsIHVud291bmQpXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbW9kZWwuYWdncmVnYXRlKHJlcykudGhlbiggdW53b3VuZCA9PiB7XHJcbiAgICAgICAgLy8gZmlsdGVyIGZvciBhZ2dyZWdhdGVcclxuICAgICAgICBkZWJ1Z2xvZygoKT0+J2hlcmUgcmVzJyArIEpTT04uc3RyaW5naWZ5KHVud291bmQpKTtcclxuICAgICAgICByZXR1cm4gZmlsdGVyUmVtYXBDYXRlZ29yaWVzKG1vbmdvTWFwLCBjYXRlZ29yaWVzLCB1bndvdW5kKVxyXG4gICAgfSk7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXhwYW5kZWRSZWNvcmRzRm9yQ2F0ZWdvcnkodGhlTW9kZWwgOiBJTWF0Y2guSU1vZGVscyxkb21haW4gOiBzdHJpbmcsY2F0ZWdvcnkgOiBzdHJpbmcpIDogUHJvbWlzZTx7IFtrZXkgOiBzdHJpbmddIDogYW55fT4ge1xyXG4gICAgdmFyIG1vbmdvSGFuZGxlID0gdGhlTW9kZWwubW9uZ29IYW5kbGU7XHJcbiAgICB2YXIgbW9kZWxuYW1lID0gZ2V0TW9kZWxOYW1lRm9yRG9tYWluKHRoZU1vZGVsLm1vbmdvSGFuZGxlLCBkb21haW4pO1xyXG4gICAgZGVidWdsb2coKCk9PmAgbW9kZWxuYW1lIGZvciAke2RvbWFpbn0gaXMgJHttb2RlbG5hbWV9YCk7XHJcbiAgICAvL2RlYnVnbG9nKCgpID0+IGBoZXJlIG1vZGVscyAke21vZGVsbmFtZX0gYCArIG1vbmdvSGFuZGxlLm1vbmdvb3NlLm1vZGVsTmFtZXMoKS5qb2luKCc7JykpO1xyXG4gICAgdmFyIG1vZGVsID0gbW9uZ29IYW5kbGUubW9uZ29vc2UubW9kZWwoU2NoZW1hbG9hZC5tYWtlTW9uZ29vc2VNb2RlbE5hbWUobW9kZWxuYW1lKSk7XHJcbiAgICB2YXIgbW9uZ29NYXAgPSBtb25nb0hhbmRsZS5tb25nb01hcHNbbW9kZWxuYW1lXTtcclxuICAgIGRlYnVnbG9nKCgpPT4gJ2hlcmUgdGhlIG1vbmdvbWFwJyArIEpTT04uc3RyaW5naWZ5KG1vbmdvTWFwLHVuZGVmaW5lZCwyKSk7XHJcbiAgICBjaGVja01vZGVsTW9uZ29NYXAobW9kZWwsbW9kZWxuYW1lLCBtb25nb01hcCxjYXRlZ29yeSk7XHJcbiAgICBkZWJ1Z2xvZygoKT0+YCBoZXJlIHRoZSBtb2RlbG1hcCBmb3IgJHtkb21haW59IGlzICR7SlNPTi5zdHJpbmdpZnkobW9uZ29NYXAsdW5kZWZpbmVkLDIpfWApO1xyXG4gICAgLy8gMSkgcHJvZHVjZSB0aGUgZmxhdHRlbmVkIHJlY29yZHNcclxuICAgIHZhciByZXMgPSBNb25nb01hcC51bndpbmRzRm9yTm9udGVybWluYWxBcnJheXMobW9uZ29NYXApO1xyXG4gICAgZGVidWdsb2coKCk9PidoZXJlIHRoZSB1bndpbmQgc3RhdGVtZW50ICcgKyBKU09OLnN0cmluZ2lmeShyZXMsdW5kZWZpbmVkLDIpKTtcclxuICAgIC8vIHdlIGhhdmUgdG8gdW53aW5kIGFsbCBjb21tb24gbm9uLXRlcm1pbmFsIGNvbGxlY3Rpb25zLlxyXG4gICAgZGVidWdsb2coKCk9PidoZXJlIHRoZSBtb2RlbCAnICsgbW9kZWwubW9kZWxOYW1lKTtcclxuICAgIGlmKHJlcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICByZXR1cm4gbW9kZWwuZmluZCh7fSkubGVhbigpLmV4ZWMoKS50aGVuKCggdW53b3VuZCA6IGFueVtdKSA9PiB7XHJcbiAgICAgICAgICAgIGRlYnVnbG9nKCgpPT4naGVyZSByZXMnICsgSlNPTi5zdHJpbmdpZnkodW53b3VuZCkpO1xyXG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyUmVtYXBDYXRlZ29yaWVzKG1vbmdvTWFwLCBbY2F0ZWdvcnldLCB1bndvdW5kKVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG1vZGVsLmFnZ3JlZ2F0ZShyZXMpLnRoZW4oIHVud291bmQgPT4ge1xyXG4gICAgICAgIC8vIGZpbHRlciBmb3IgYWdncmVnYXRlXHJcbiAgICAgICAgZGVidWdsb2coKCk9PidoZXJlIHJlcycgKyBKU09OLnN0cmluZ2lmeSh1bndvdW5kKSk7XHJcbiAgICAgICAgcmV0dXJuIGZpbHRlclJlbWFwQ2F0ZWdvcmllcyhtb25nb01hcCwgW2NhdGVnb3J5XSwgdW53b3VuZClcclxuICAgIH0pO1xyXG59XHJcbi8vIGdldCBzeW5vbnltc1xyXG4vLyBkYi5jb3Ntb3MuZmluZCggeyBcIl9zeW5vbnltcy4wXCI6IHsgJGV4aXN0czogdHJ1ZSB9fSkubGVuZ3RoKClcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXREaXN0aW5jdFZhbHVlcyhtb25nb0hhbmRsZTogSU1hdGNoLklNb2RlbEhhbmRsZVJhdywgbW9kZWxuYW1lOiBzdHJpbmcsIGNhdGVnb3J5OiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZ1tdPiB7XHJcbiAgICBkZWJ1Z2xvZygoKSA9PiBgaGVyZSBtb2RlbHMgJHttb2RlbG5hbWV9IGAgKyBtb25nb0hhbmRsZS5tb25nb29zZS5tb2RlbE5hbWVzKCkuam9pbignOycpKTtcclxuICAgIHZhciBtb2RlbCA9IG1vbmdvSGFuZGxlLm1vbmdvb3NlLm1vZGVsKFNjaGVtYWxvYWQubWFrZU1vbmdvb3NlTW9kZWxOYW1lKG1vZGVsbmFtZSkpO1xyXG4gICAgdmFyIG1vbmdvTWFwID0gbW9uZ29IYW5kbGUubW9uZ29NYXBzW21vZGVsbmFtZV07XHJcbiAgICBjaGVja01vZGVsTW9uZ29NYXAobW9kZWwsbW9kZWxuYW1lLCBtb25nb01hcCxjYXRlZ29yeSk7XHJcbiAgICBkZWJ1Z2xvZygnIGhlcmUgcGF0aCBmb3IgZGlzdGluY3QgdmFsdWUgJyArIG1vbmdvTWFwW2NhdGVnb3J5XS5mdWxscGF0aCApO1xyXG4gICAgcmV0dXJuIG1vZGVsLmRpc3RpbmN0KG1vbmdvTWFwW2NhdGVnb3J5XS5mdWxscGF0aCkudGhlbihyZXMgPT4ge1xyXG4gICAgICAgIGRlYnVnbG9nKCgpID0+IGAgaGVyZSByZXMgZm9yICR7bW9kZWxuYW1lfSAgJHtjYXRlZ29yeX0gdmFsdWVzIGAgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xyXG4gICAgICAgIHJldHVybiByZXM7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldENhdGVnb3J5UmVjKG1vbmdvSGFuZGxlOiBJTWF0Y2guSU1vZGVsSGFuZGxlUmF3LCBtb2RlbG5hbWU6IHN0cmluZywgY2F0ZWdvcnk6IHN0cmluZyk6IElNYXRjaC5JTW9kZWxDYXRlZ29yeVJlY1xyXG57XHJcbiAgICB2YXIgY2F0ZWdvcmllcyA9IG1vbmdvSGFuZGxlLm1vZGVsRG9jc1ttb2RlbG5hbWVdLl9jYXRlZ29yaWVzO1xyXG4gICAgdmFyIGZpbHRlcmVkID0gY2F0ZWdvcmllcy5maWx0ZXIoIHggPT4geC5jYXRlZ29yeSA9PSBjYXRlZ29yeSApO1xyXG4gICAgaWYgKCBmaWx0ZXJlZC5sZW5ndGggIT0gMSApXHJcbiAgICB7XHJcblxyXG4gICAgICAgIGRlYnVnZiggJyBkaWQgbm90IGZpbmQgJyArIG1vZGVsbmFtZSArICcgIGNhdGVnb3J5ICAnICsgY2F0ZWdvcnkgKyAnIGluICAnICsgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcmllcykgKTtcclxuXHJcbiAgICAgICAgdGhyb3cgRXJyb3IoJ2NhdGVnb3J5IG5vdCBmb3VuZCAnICsgY2F0ZWdvcnkgKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KGNhdGVnb3JpZXMpICk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZmlsdGVyZWRbMF07XHJcbn1cclxuXHJcblxyXG5cclxuY29uc3QgQVJSX01PREVMX1BST1BFUlRJRVMgPSBbXCJkb21haW5cIiwgXCJiaXRpbmRleFwiLCBcImRlZmF1bHRrZXljb2x1bW5cIiwgXCJkZWZhdWx0dXJpXCIsIFwiY2F0ZWdvcnlEZXNjcmliZWRcIiwgXCJjb2x1bW5zXCIsIFwiZGVzY3JpcHRpb25cIiwgXCJ0b29sXCIsIFwidG9vbGhpZGRlblwiLCBcInN5bm9ueW1zXCIsIFwiY2F0ZWdvcnlcIiwgXCJ3b3JkaW5kZXhcIiwgXCJleGFjdG1hdGNoXCIsIFwiaGlkZGVuXCJdO1xyXG5cclxuZnVuY3Rpb24gYWRkU3lub255bXMoc3lub255bXM6IHN0cmluZ1tdLCBjYXRlZ29yeTogc3RyaW5nLCBzeW5vbnltRm9yOiBzdHJpbmcsIGJpdGluZGV4OiBudW1iZXIsIGJpdFNlbnRlbmNlQW5kLFxyXG4gICAgd29yZFR5cGU6IHN0cmluZyxcclxuICAgIG1SdWxlczogQXJyYXk8SU1hdGNoLm1SdWxlPiwgc2VlbjogeyBba2V5OiBzdHJpbmddOiBJTWF0Y2gubVJ1bGVbXSB9KSB7XHJcbiAgICBzeW5vbnltcy5mb3JFYWNoKGZ1bmN0aW9uIChzeW4pIHtcclxuICAgICAgICB2YXIgb1J1bGUgPSB7XHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogc3lub255bUZvcixcclxuICAgICAgICAgICAgdHlwZTogSU1hdGNoLkVudW1SdWxlVHlwZS5XT1JELFxyXG4gICAgICAgICAgICB3b3JkOiBzeW4sXHJcbiAgICAgICAgICAgIGJpdGluZGV4OiBiaXRpbmRleCxcclxuICAgICAgICAgICAgYml0U2VudGVuY2VBbmQ6IGJpdFNlbnRlbmNlQW5kLFxyXG4gICAgICAgICAgICB3b3JkVHlwZTogd29yZFR5cGUsXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiAwLjk1XHJcbiAgICAgICAgfTtcclxuICAgICAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiaW5zZXJ0aW5nIHN5bm9ueW1cIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlKSkgOiAnLScpO1xyXG4gICAgICAgIGluc2VydFJ1bGVJZk5vdFByZXNlbnQobVJ1bGVzLCBvUnVsZSwgc2Vlbik7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0UnVsZUtleShydWxlKSB7XHJcbiAgICB2YXIgcjEgPSBydWxlLm1hdGNoZWRTdHJpbmcgKyBcIi18LVwiICsgcnVsZS5jYXRlZ29yeSArIFwiIC18LSBcIiArIHJ1bGUudHlwZSArIFwiIC18LSBcIiArIHJ1bGUud29yZCArIFwiIFwiICsgcnVsZS5iaXRpbmRleCArIFwiIFwiICsgcnVsZS53b3JkVHlwZTtcclxuICAgIGlmIChydWxlLnJhbmdlKSB7XHJcbiAgICAgICAgdmFyIHIyID0gZ2V0UnVsZUtleShydWxlLnJhbmdlLnJ1bGUpO1xyXG4gICAgICAgIHIxICs9IFwiIC18LSBcIiArIHJ1bGUucmFuZ2UubG93ICsgXCIvXCIgKyBydWxlLnJhbmdlLmhpZ2ggKyBcIiAtfC0gXCIgKyByMjtcclxuICAgIH1cclxuICAgIHJldHVybiByMTtcclxufVxyXG5cclxuXHJcbmltcG9ydCAqIGFzIEJyZWFrZG93biBmcm9tICcuLi9tYXRjaC9icmVha2Rvd24nO1xyXG5cclxuLyogZ2l2ZW4gYSBydWxlIHdoaWNoIHJlcHJlc2VudHMgYSB3b3JkIHNlcXVlbmNlIHdoaWNoIGlzIHNwbGl0IGR1cmluZyB0b2tlbml6YXRpb24gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGFkZEJlc3RTcGxpdChtUnVsZXM6IEFycmF5PElNYXRjaC5tUnVsZT4sIHJ1bGU6IElNYXRjaC5tUnVsZSwgc2VlblJ1bGVzOiB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5tUnVsZVtdIH0pIHtcclxuICAgIC8vaWYoIWdsb2JhbF9BZGRTcGxpdHMpIHtcclxuICAgIC8vICAgIHJldHVybjtcclxuICAgIC8vfVxyXG5cclxuICAgIGlmIChydWxlLnR5cGUgIT09IElNYXRjaC5FbnVtUnVsZVR5cGUuV09SRCkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhciBiZXN0ID0gQnJlYWtkb3duLm1ha2VNYXRjaFBhdHRlcm4ocnVsZS5sb3dlcmNhc2V3b3JkKTtcclxuICAgIGlmICghYmVzdCkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhciBuZXdSdWxlID0ge1xyXG4gICAgICAgIGNhdGVnb3J5OiBydWxlLmNhdGVnb3J5LFxyXG4gICAgICAgIG1hdGNoZWRTdHJpbmc6IHJ1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICBiaXRpbmRleDogcnVsZS5iaXRpbmRleCxcclxuICAgICAgICBiaXRTZW50ZW5jZUFuZDogcnVsZS5iaXRpbmRleCxcclxuICAgICAgICB3b3JkVHlwZTogcnVsZS53b3JkVHlwZSxcclxuICAgICAgICB3b3JkOiBiZXN0Lmxvbmdlc3RUb2tlbixcclxuICAgICAgICB0eXBlOiAwLFxyXG4gICAgICAgIGxvd2VyY2FzZXdvcmQ6IGJlc3QubG9uZ2VzdFRva2VuLFxyXG4gICAgICAgIF9yYW5raW5nOiAwLjk1LFxyXG4gICAgICAgIC8vICAgIGV4YWN0T25seSA6IHJ1bGUuZXhhY3RPbmx5LFxyXG4gICAgICAgIHJhbmdlOiBiZXN0LnNwYW5cclxuICAgIH0gYXMgSU1hdGNoLm1SdWxlO1xyXG4gICAgaWYgKHJ1bGUuZXhhY3RPbmx5KSB7XHJcbiAgICAgICAgbmV3UnVsZS5leGFjdE9ubHkgPSBydWxlLmV4YWN0T25seVxyXG4gICAgfTtcclxuICAgIG5ld1J1bGUucmFuZ2UucnVsZSA9IHJ1bGU7XHJcbiAgICBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG1SdWxlcywgbmV3UnVsZSwgc2VlblJ1bGVzKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGluc2VydFJ1bGVJZk5vdFByZXNlbnQobVJ1bGVzOiBBcnJheTxJTWF0Y2gubVJ1bGU+LCBydWxlOiBJTWF0Y2gubVJ1bGUsXHJcbiAgICBzZWVuUnVsZXM6IHsgW2tleTogc3RyaW5nXTogSU1hdGNoLm1SdWxlW10gfSkge1xyXG5cclxuICAgIGlmIChydWxlLnR5cGUgIT09IElNYXRjaC5FbnVtUnVsZVR5cGUuV09SRCkge1xyXG4gICAgICAgIGRlYnVnbG9nKCdub3QgYSAgd29yZCByZXR1cm4gZmFzdCAnKyBydWxlLm1hdGNoZWRTdHJpbmcpO1xyXG4gICAgICAgIG1SdWxlcy5wdXNoKHJ1bGUpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGlmICgocnVsZS53b3JkID09PSB1bmRlZmluZWQpIHx8IChydWxlLm1hdGNoZWRTdHJpbmcgPT09IHVuZGVmaW5lZCkpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2lsbGVnYWwgcnVsZScgKyBKU09OLnN0cmluZ2lmeShydWxlLCB1bmRlZmluZWQsIDIpKTtcclxuICAgIH1cclxuICAgIHZhciByID0gZ2V0UnVsZUtleShydWxlKTtcclxuICAgIC8qIGlmKCAocnVsZS53b3JkID09PSBcInNlcnZpY2VcIiB8fCBydWxlLndvcmQ9PT0gXCJzZXJ2aWNlc1wiKSAmJiByLmluZGV4T2YoJ09EYXRhJykgPj0gMCkge1xyXG4gICAgICAgICBjb25zb2xlLmxvZyhcInJ1bGVrZXkgaXNcIiArIHIpO1xyXG4gICAgICAgICBjb25zb2xlLmxvZyhcInByZXNlbmNlIGlzIFwiICsgSlNPTi5zdHJpbmdpZnkoc2VlblJ1bGVzW3JdKSk7XHJcbiAgICAgfSovXHJcbiAgICBydWxlLmxvd2VyY2FzZXdvcmQgPSBydWxlLndvcmQudG9Mb3dlckNhc2UoKTtcclxuICAgIGlmIChzZWVuUnVsZXNbcl0pIHtcclxuICAgICAgICBkZWJ1Z2xvZygoKSA9PiAoXCJBdHRlbXB0aW5nIHRvIGluc2VydCBkdXBsaWNhdGVcIiArIEpTT04uc3RyaW5naWZ5KHJ1bGUsIHVuZGVmaW5lZCwgMikgKyBcIiA6IFwiICsgcikpO1xyXG4gICAgICAgIHZhciBkdXBsaWNhdGVzID0gc2VlblJ1bGVzW3JdLmZpbHRlcihmdW5jdGlvbiAob0VudHJ5KSB7XHJcbiAgICAgICAgICAgIHJldHVybiAwID09PSBJbnB1dEZpbHRlclJ1bGVzLmNvbXBhcmVNUnVsZUZ1bGwob0VudHJ5LCBydWxlKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBpZiAoZHVwbGljYXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBzZWVuUnVsZXNbcl0gPSAoc2VlblJ1bGVzW3JdIHx8IFtdKTtcclxuICAgIHNlZW5SdWxlc1tyXS5wdXNoKHJ1bGUpO1xyXG4gICAgaWYgKHJ1bGUud29yZCA9PT0gXCJcIikge1xyXG4gICAgICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoJ1NraXBwaW5nIHJ1bGUgd2l0aCBlbXRweSB3b3JkICcgKyBKU09OLnN0cmluZ2lmeShydWxlLCB1bmRlZmluZWQsIDIpKSA6ICctJyk7XHJcbiAgICAgICAgLy9nKCdTa2lwcGluZyBydWxlIHdpdGggZW10cHkgd29yZCAnICsgSlNPTi5zdHJpbmdpZnkocnVsZSwgdW5kZWZpbmVkLCAyKSk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgbVJ1bGVzLnB1c2gocnVsZSk7XHJcbiAgICBhZGRCZXN0U3BsaXQobVJ1bGVzLCBydWxlLCBzZWVuUnVsZXMpO1xyXG4gICAgcmV0dXJuO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVhZEZpbGVBc0pTT04oZmlsZW5hbWU6IHN0cmluZyk6IGFueSB7XHJcbiAgICB2YXIgZGF0YSA9IGZzLnJlYWRGaWxlU3luYyhmaWxlbmFtZSwgJ3V0Zi04Jyk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKGRhdGEpO1xyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ29udGVudCBvZiBmaWxlIFwiICsgZmlsZW5hbWUgKyBcIiBpcyBubyBqc29uXCIgKyBlKTtcclxuICAgICAgICBwcm9jZXNzLmV4aXQoLTEpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxufVxyXG5cclxuLypcclxuZnVuY3Rpb24gbG9hZE1vZGVsRGF0YTEobW9kZWxQYXRoOiBzdHJpbmcsIG9NZGw6IElNb2RlbCwgc01vZGVsTmFtZTogc3RyaW5nLCBvTW9kZWw6IElNYXRjaC5JTW9kZWxzKSB7XHJcbiAgICAvLyByZWFkIHRoZSBkYXRhIC0+XHJcbiAgICAvLyBkYXRhIGlzIHByb2Nlc3NlZCBpbnRvIG1SdWxlcyBkaXJlY3RseSxcclxuXHJcbiAgICB2YXIgYml0aW5kZXggPSBvTWRsLmJpdGluZGV4O1xyXG4gICAgY29uc3Qgc0ZpbGVOYW1lID0gKCcuLycgKyBtb2RlbFBhdGggKyAnLycgKyBzTW9kZWxOYW1lICsgXCIuZGF0YS5qc29uXCIpO1xyXG4gICAgdmFyIG9NZGxEYXRhPSByZWFkRmlsZUFzSlNPTihzRmlsZU5hbWUpO1xyXG4gICAgb01kbERhdGEuZm9yRWFjaChmdW5jdGlvbiAob0VudHJ5KSB7XHJcbiAgICAgICAgaWYgKCFvRW50cnkuZG9tYWluKSB7XHJcbiAgICAgICAgICAgIG9FbnRyeS5fZG9tYWluID0gb01kbC5kb21haW47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghb0VudHJ5LnRvb2wgJiYgb01kbC50b29sLm5hbWUpIHtcclxuICAgICAgICAgICAgb0VudHJ5LnRvb2wgPSBvTWRsLnRvb2wubmFtZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgb01vZGVsLnJlY29yZHMucHVzaChvRW50cnkpO1xyXG4gICAgICAgIG9NZGwuY2F0ZWdvcnkuZm9yRWFjaChmdW5jdGlvbiAoY2F0KSB7XHJcbiAgICAgICAgICAgIGlmIChvRW50cnlbY2F0XSA9PT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgICAgICAgIG9FbnRyeVtjYXRdID0gXCJuL2FcIjtcclxuICAgICAgICAgICAgICAgIHZhciBidWcgPVxyXG4gICAgICAgICAgICAgICAgICAgIFwiSU5DT05TSVNURU5UKj4gTW9kZWxEYXRhIFwiICsgc0ZpbGVOYW1lICsgXCIgZG9lcyBub3QgY29udGFpbiBjYXRlZ29yeSBcIiArIGNhdCArIFwiIHdpdGggdmFsdWUgJ3VuZGVmaW5lZCcsIHVuZGVmaW5lZCBpcyBpbGxlZ2FsIHZhbHVlLCB1c2Ugbi9hIFwiICsgSlNPTi5zdHJpbmdpZnkob0VudHJ5KSArIFwiXCI7XHJcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhidWcpO1xyXG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhidWcpO1xyXG4gICAgICAgICAgICAgICAgLy9wcm9jZXNzLmV4aXQoLTEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgb01kbC53b3JkaW5kZXguZm9yRWFjaChmdW5jdGlvbiAoY2F0ZWdvcnkpIHtcclxuICAgICAgICAgICAgaWYgKG9FbnRyeVtjYXRlZ29yeV0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgZGVidWdsb2coXCJJTkNPTlNJU1RFTlQqPiBNb2RlbERhdGEgXCIgKyBzRmlsZU5hbWUgKyBcIiBkb2VzIG5vdCBjb250YWluIGNhdGVnb3J5IFwiICsgY2F0ZWdvcnkgKyBcIiBvZiB3b3JkaW5kZXhcIiArIEpTT04uc3RyaW5naWZ5KG9FbnRyeSkgKyBcIlwiKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChvRW50cnlbY2F0ZWdvcnldICE9PSBcIipcIikge1xyXG4gICAgICAgICAgICAgICAgdmFyIHNTdHJpbmcgPSBvRW50cnlbY2F0ZWdvcnldO1xyXG4gICAgICAgICAgICAgICAgZGVidWdsb2coXCJwdXNoaW5nIHJ1bGUgd2l0aCBcIiArIGNhdGVnb3J5ICsgXCIgLT4gXCIgKyBzU3RyaW5nKTtcclxuICAgICAgICAgICAgICAgIHZhciBvUnVsZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXHJcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogc1N0cmluZyxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQsXHJcbiAgICAgICAgICAgICAgICAgICAgd29yZDogc1N0cmluZyxcclxuICAgICAgICAgICAgICAgICAgICBiaXRpbmRleDogYml0aW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgYml0U2VudGVuY2VBbmQgOiBiaXRpbmRleCxcclxuICAgICAgICAgICAgICAgICAgICB3b3JkVHlwZSA6IElNYXRjaC5XT1JEVFlQRS5GQUNULFxyXG4gICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiAwLjk1XHJcbiAgICAgICAgICAgICAgICB9IGFzIElNYXRjaC5tUnVsZTtcclxuICAgICAgICAgICAgICAgIGlmIChvTWRsLmV4YWN0bWF0Y2ggJiYgb01kbC5leGFjdG1hdGNoLmluZGV4T2YoY2F0ZWdvcnkpID49IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBvUnVsZS5leGFjdE9ubHkgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCBvUnVsZSwgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgICAgICAgICBpZiAob01kbERhdGEuc3lub255bXMgJiYgb01kbERhdGEuc3lub255bXNbY2F0ZWdvcnldKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaG93IGNhbiB0aGlzIGhhcHBlbj9cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9hZGRTeW5vbnltcyhvTWRsRGF0YS5zeW5vbnltc1tjYXRlZ29yeV0sIGNhdGVnb3J5LCBzU3RyaW5nLCBiaXRpbmRleCwgYml0aW5kZXgsIFwiWFwiLCBvTW9kZWwubVJ1bGVzLCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIGEgc3lub255bSBmb3IgYSBGQUNUXHJcbiAgICAgICAgICAgICAgICBpZiAob0VudHJ5LnN5bm9ueW1zICYmIG9FbnRyeS5zeW5vbnltc1tjYXRlZ29yeV0pIHtcclxuICAgICAgICAgICAgICAgICAgICBhZGRTeW5vbnltcyhvRW50cnkuc3lub255bXNbY2F0ZWdvcnldLCBjYXRlZ29yeSwgc1N0cmluZywgYml0aW5kZXgsIGJpdGluZGV4LCBJTWF0Y2guV09SRFRZUEUuRkFDVCwgb01vZGVsLm1SdWxlcywgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcblxyXG4qL1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBoYXNSdWxlV2l0aEZhY3QobVJ1bGVzIDogSU1hdGNoLm1SdWxlW10sIGZhY3Q6IHN0cmluZywgY2F0ZWdvcnk6IHN0cmluZywgYml0aW5kZXg6IG51bWJlcikge1xyXG4gICAgLy8gVE9ETyBCQUQgUVVBRFJBVElDXHJcbiAgICByZXR1cm4gbVJ1bGVzLmZpbmQoIHJ1bGUgPT4ge1xyXG4gICAgICAgIHJldHVybiBydWxlLndvcmQgPT09IGZhY3QgJiYgcnVsZS5jYXRlZ29yeSA9PT0gY2F0ZWdvcnkgJiYgcnVsZS5iaXRpbmRleCA9PT0gYml0aW5kZXhcclxuICAgIH0pICE9PSB1bmRlZmluZWQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvYWRNb2RlbERhdGFNb25nbyhtb2RlbEhhbmRsZTogSU1hdGNoLklNb2RlbEhhbmRsZVJhdywgb01kbDogSU1vZGVsLCBzTW9kZWxOYW1lOiBzdHJpbmcsIG9Nb2RlbDogSU1hdGNoLklNb2RlbHMpOiBQcm9taXNlPGFueT4ge1xyXG4gICAgLy8gcmVhZCB0aGUgZGF0YSAtPlxyXG4gICAgLy8gZGF0YSBpcyBwcm9jZXNzZWQgaW50byBtUnVsZXMgZGlyZWN0bHlcclxuXHJcbiAgICB2YXIgYml0aW5kZXggPSBvTWRsLmJpdGluZGV4O1xyXG4gICAgLy9jb25zdCBzRmlsZU5hbWUgPSAoJy4vJyArIG1vZGVsUGF0aCArICcvJyArIHNNb2RlbE5hbWUgKyBcIi5kYXRhLmpzb25cIik7XHJcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwobW9kZWxIYW5kbGUubW9kZWxEb2NzW3NNb2RlbE5hbWVdLl9jYXRlZ29yaWVzLm1hcChcclxuICAgICAgICBjYXRlZ29yeVJlYyA9PiB7XHJcbiAgICAgICAgICAgIHZhciBjYXRlZ29yeSA9IGNhdGVnb3J5UmVjLmNhdGVnb3J5O1xyXG4gICAgICAgICAgICB2YXIgd29yZGluZGV4ID0gY2F0ZWdvcnlSZWMud29yZGluZGV4O1xyXG4gICAgICAgICAgICBpZiAoIXdvcmRpbmRleCkge1xyXG4gICAgICAgICAgICAgICAgZGVidWdsb2coICgpPT4gJyAgJyArIHNNb2RlbE5hbWUgKyAnICcgKyAgY2F0ZWdvcnkgKyAnIGlzIG5vdCB3b3JkIGluZGV4ZWQhJyApO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGRlYnVnbG9nKCgpID0+ICdhZGRpbmcgdmFsdWVzIGZvciAnICsgc01vZGVsTmFtZSArICcgJyArICBjYXRlZ29yeSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0RGlzdGluY3RWYWx1ZXMobW9kZWxIYW5kbGUsIHNNb2RlbE5hbWUsIGNhdGVnb3J5KS50aGVuKFxyXG4gICAgICAgICAgICAgICAgICAgICh2YWx1ZXMpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coYGZvdW5kICR7dmFsdWVzLmxlbmd0aH0gdmFsdWVzIGZvciAke3NNb2RlbE5hbWV9ICR7Y2F0ZWdvcnl9IGApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZXMubWFwKHZhbHVlID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzU3RyaW5nID0gXCJcIiArIHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coKCkgPT4gXCJwdXNoaW5nIHJ1bGUgd2l0aCBcIiArIGNhdGVnb3J5ICsgXCIgLT4gXCIgKyBzU3RyaW5nICsgJyAnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvUnVsZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogc1N0cmluZyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29yZDogc1N0cmluZyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiaXRpbmRleDogYml0aW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYml0U2VudGVuY2VBbmQ6IGJpdGluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4YWN0T25seTogY2F0ZWdvcnlSZWMuZXhhY3RtYXRjaCB8fCBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JkVHlwZTogSU1hdGNoLldPUkRUWVBFLkZBQ1QsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IDAuOTVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gYXMgSU1hdGNoLm1SdWxlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCBvUnVsZSwgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICBpZiAob01kbERhdGEuc3lub255bXMgJiYgb01kbERhdGEuc3lub255bXNbY2F0ZWdvcnldKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaG93IGNhbiB0aGlzIGhhcHBlbj9cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2FkZFN5bm9ueW1zKG9NZGxEYXRhLnN5bm9ueW1zW2NhdGVnb3J5XSwgY2F0ZWdvcnksIHNTdHJpbmcsIGJpdGluZGV4LCBiaXRpbmRleCwgXCJYXCIsIG9Nb2RlbC5tUnVsZXMsIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYSBzeW5vbnltIGZvciBhIEZBQ1RcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgIGlmIChvRW50cnkuc3lub255bXMgJiYgb0VudHJ5LnN5bm9ueW1zW2NhdGVnb3J5XSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICBhZGRTeW5vbnltcyhvRW50cnkuc3lub255bXNbY2F0ZWdvcnldLCBjYXRlZ29yeSwgc1N0cmluZywgYml0aW5kZXgsIGJpdGluZGV4LCBJTWF0Y2guV09SRFRZUEUuRkFDVCwgb01vZGVsLm1SdWxlcywgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIClcclxuICAgICkudGhlbihcclxuICAgICAgICAoKSA9PiAgZ2V0RmFjdFN5bm9ueW1zKG1vZGVsSGFuZGxlLCBzTW9kZWxOYW1lKVxyXG4gICAgKS50aGVuKChzeW5vbnltVmFsdWVzIDogYW55KSA9PiB7XHJcbiAgICAgICAgc3lub255bVZhbHVlcy5mb3JFYWNoKChzeW5vbnltUmVjKSA9PiB7XHJcbiAgICAgICAgaWYgKCFoYXNSdWxlV2l0aEZhY3Qob01vZGVsLm1SdWxlcywgc3lub255bVJlYy5mYWN0LCBzeW5vbnltUmVjLmNhdGVnb3J5LCBiaXRpbmRleCkpIHtcclxuICAgICAgICAgICAgZGVidWdsb2coKCkgPT5KU09OLnN0cmluZ2lmeShvTW9kZWwubVJ1bGVzLHVuZGVmaW5lZCwyKSk7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKGBPcnBoYW5lZCBzeW5vbnltIHdpdGhvdXQgYmFzZSBpbiBkYXRhP1xcbmBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYChjaGVjayB0eXBvcyBhbmQgdGhhdCBjYXRlZ29yeSBpcyB3b3JkaW5kZXhlZCEpIGZhY3Q6ICcke3N5bm9ueW1SZWMuZmFjdH0nOyAgY2F0ZWdvcnk6IFwiJHtzeW5vbnltUmVjLmNhdGVnb3J5fVwiICAgYCAgKyBKU09OLnN0cmluZ2lmeShzeW5vbnltUmVjKSlcclxuICAgICAgICB9XHJcbiAgICAgICAgYWRkU3lub255bXMoc3lub255bVJlYy5zeW5vbnltcywgc3lub255bVJlYy5jYXRlZ29yeSwgc3lub255bVJlYy5mYWN0LCBiaXRpbmRleCwgYml0aW5kZXgsIElNYXRjaC5XT1JEVFlQRS5GQUNULFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9Nb2RlbC5tUnVsZXMsIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG4vKlxyXG5mdW5jdGlvbiBsb2FkTW9kZWxQKG1vbmdvb3NlSG5kbCA6IG1vbmdvb3NlLk1vbmdvb3NlLCBtb2RlbFBhdGg6IHN0cmluZywgY29ubmVjdGlvblN0cmluZyA6IHN0cmluZykgOiBQcm9taXNlPElNYXRjaC5JTW9kZWxzPiB7XHJcbiAgICB2YXIgbW9uZ29vc2VYID0gbW9uZ29vc2VIbmRsIHx8IG1vbmdvb3NlO1xyXG4gICAgdmFyIGNvbm5TdHIgPSBjb25uZWN0aW9uU3RyaW5nIHx8ICdtb25nb2RiOi8vbG9jYWxob3N0L3Rlc3RkYic7XHJcbiAgICByZXR1cm4gTW9uZ29VdGlscy5vcGVuTW9uZ29vc2UobW9uZ29vc2VYLCBjb25uU3RyKS50aGVuKFxyXG4gICAgICAgICgpID0+IGdldE1vbmdvSGFuZGxlKG1vbmdvb3NlWClcclxuICAgICkudGhlbiggKG1vZGVsSGFuZGxlIDogSU1hdGNoLklNb2RlbEhhbmRsZVJhdykgPT4gX2xvYWRNb2RlbHNGdWxsKG1vZGVsSGFuZGxlLCBtb2RlbFBhdGgpXHJcbiAgICApO1xyXG59O1xyXG4qL1xyXG5cclxuXHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGxvYWRNb2RlbChtb2RlbEhhbmRsZTogSU1hdGNoLklNb2RlbEhhbmRsZVJhdywgc01vZGVsTmFtZTogc3RyaW5nLCBvTW9kZWw6IElNYXRjaC5JTW9kZWxzKTogUHJvbWlzZTxhbnk+IHtcclxuICAgIGRlYnVnbG9nKFwiIGxvYWRpbmcgXCIgKyBzTW9kZWxOYW1lICsgXCIgLi4uLlwiKTtcclxuICAgIC8vdmFyIG9NZGwgPSByZWFkRmlsZUFzSlNPTignLi8nICsgbW9kZWxQYXRoICsgJy8nICsgc01vZGVsTmFtZSArIFwiLm1vZGVsLmpzb25cIikgYXMgSU1vZGVsO1xyXG4gICAgdmFyIG9NZGwgPSBtYWtlTWRsTW9uZ28obW9kZWxIYW5kbGUsIHNNb2RlbE5hbWUsIG9Nb2RlbCk7XHJcbiAgICByZXR1cm4gbG9hZE1vZGVsRGF0YU1vbmdvKG1vZGVsSGFuZGxlLCBvTWRsLCBzTW9kZWxOYW1lLCBvTW9kZWwpO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEFsbERvbWFpbnNCaXRJbmRleChvTW9kZWw6IElNYXRjaC5JTW9kZWxzKTogbnVtYmVyIHtcclxuICAgIHZhciBsZW4gPSBvTW9kZWwuZG9tYWlucy5sZW5ndGg7XHJcbiAgICB2YXIgcmVzID0gMDtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcclxuICAgICAgICByZXMgPSByZXMgPDwgMTtcclxuICAgICAgICByZXMgPSByZXMgfCAweDAwMDE7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RG9tYWluQml0SW5kZXgoZG9tYWluOiBzdHJpbmcsIG9Nb2RlbDogSU1hdGNoLklNb2RlbHMpOiBudW1iZXIge1xyXG4gICAgdmFyIGluZGV4ID0gb01vZGVsLmRvbWFpbnMuaW5kZXhPZihkb21haW4pO1xyXG4gICAgaWYgKGluZGV4IDwgMCkge1xyXG4gICAgICAgIGluZGV4ID0gb01vZGVsLmRvbWFpbnMubGVuZ3RoO1xyXG4gICAgfVxyXG4gICAgaWYgKGluZGV4ID49IDMyKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidG9vIG1hbnkgZG9tYWluIGZvciBzaW5nbGUgMzIgYml0IGluZGV4XCIpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIDB4MDAwMSA8PCBpbmRleDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldERvbWFpbkJpdEluZGV4U2FmZShkb21haW46IHN0cmluZywgb01vZGVsOiBJTWF0Y2guSU1vZGVscyk6IG51bWJlciB7XHJcbiAgICB2YXIgaW5kZXggPSBvTW9kZWwuZG9tYWlucy5pbmRleE9mKGRvbWFpbik7XHJcbiAgICBpZiAoaW5kZXggPCAwKSB7XHJcbiAgICAgICAgdGhyb3cgRXJyb3IoJ2V4cGVjdGVkIGRvbWFpbiB0byBiZSByZWdpc3RlcmVkPz8/ICcpO1xyXG4gICAgfVxyXG4gICAgaWYgKGluZGV4ID49IDMyKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidG9vIG1hbnkgZG9tYWluIGZvciBzaW5nbGUgMzIgYml0IGluZGV4XCIpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIDB4MDAwMSA8PCBpbmRleDtcclxufVxyXG5cclxuXHJcblxyXG4vKipcclxuICogR2l2ZW4gYSBiaXRmaWVsZCwgcmV0dXJuIGFuIHVuc29ydGVkIHNldCBvZiBkb21haW5zIG1hdGNoaW5nIHByZXNlbnQgYml0c1xyXG4gKiBAcGFyYW0gb01vZGVsXHJcbiAqIEBwYXJhbSBiaXRmaWVsZFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldERvbWFpbnNGb3JCaXRGaWVsZChvTW9kZWw6IElNYXRjaC5JTW9kZWxzLCBiaXRmaWVsZDogbnVtYmVyKTogc3RyaW5nW10ge1xyXG4gICAgcmV0dXJuIG9Nb2RlbC5kb21haW5zLmZpbHRlcihkb21haW4gPT5cclxuICAgICAgICAoZ2V0RG9tYWluQml0SW5kZXgoZG9tYWluLCBvTW9kZWwpICYgYml0ZmllbGQpXHJcbiAgICApO1xyXG59XHJcblxyXG4vKlxyXG5mdW5jdGlvbiBtZXJnZU1vZGVsSnNvbihzTW9kZWxOYW1lOiBzdHJpbmcsIG9NZGw6IElNb2RlbCwgb01vZGVsOiBJTWF0Y2guSU1vZGVscykge1xyXG4gICAgdmFyIGNhdGVnb3J5RGVzY3JpYmVkTWFwID0ge30gYXMgeyBba2V5OiBzdHJpbmddOiBJTWF0Y2guSUNhdGVnb3J5RGVzYyB9O1xyXG4gICAgb01kbC5iaXRpbmRleCA9IGdldERvbWFpbkJpdEluZGV4KG9NZGwuZG9tYWluLCBvTW9kZWwpO1xyXG4gICAgb01kbC5jYXRlZ29yeURlc2NyaWJlZCA9IFtdO1xyXG4gICAgLy8gcmVjdGlmeSBjYXRlZ29yeVxyXG4gICAgb01kbC5jYXRlZ29yeSA9IG9NZGwuY2F0ZWdvcnkubWFwKGZ1bmN0aW9uIChjYXQ6IGFueSkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgY2F0ID09PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjYXQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0eXBlb2YgY2F0Lm5hbWUgIT09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJNaXNzaW5nIG5hbWUgaW4gb2JqZWN0IHR5cGVkIGNhdGVnb3J5IGluIFwiICsgSlNPTi5zdHJpbmdpZnkoY2F0KSArIFwiIGluIG1vZGVsIFwiICsgc01vZGVsTmFtZSk7XHJcbiAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgtMSk7XHJcbiAgICAgICAgICAgIC8vdGhyb3cgbmV3IEVycm9yKCdEb21haW4gJyArIG9NZGwuZG9tYWluICsgJyBhbHJlYWR5IGxvYWRlZCB3aGlsZSBsb2FkaW5nICcgKyBzTW9kZWxOYW1lICsgJz8nKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0ZWdvcnlEZXNjcmliZWRNYXBbY2F0Lm5hbWVdID0gY2F0O1xyXG4gICAgICAgIG9NZGwuY2F0ZWdvcnlEZXNjcmliZWQucHVzaChjYXQpO1xyXG4gICAgICAgIHJldHVybiBjYXQubmFtZTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGFkZCB0aGUgY2F0ZWdvcmllcyB0byB0aGUgbW9kZWw6XHJcbiAgICBvTWRsLmNhdGVnb3J5LmZvckVhY2goZnVuY3Rpb24gKGNhdGVnb3J5KSB7XHJcbiAgICAgICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCB7XHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBcImNhdGVnb3J5XCIsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IGNhdGVnb3J5LFxyXG4gICAgICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQsXHJcbiAgICAgICAgICAgIHdvcmQ6IGNhdGVnb3J5LFxyXG4gICAgICAgICAgICBsb3dlcmNhc2V3b3JkOiBjYXRlZ29yeS50b0xvd2VyQ2FzZSgpLFxyXG4gICAgICAgICAgICBiaXRpbmRleDogb01kbC5iaXRpbmRleCxcclxuICAgICAgICAgICAgd29yZFR5cGUgOiBJTWF0Y2guV09SRFRZUEUuQ0FURUdPUlksXHJcbiAgICAgICAgICAgIGJpdFNlbnRlbmNlQW5kIDogb01kbC5iaXRpbmRleCxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IDAuOTVcclxuICAgICAgICB9LCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGlmIChvTW9kZWwuZG9tYWlucy5pbmRleE9mKG9NZGwuZG9tYWluKSA+PSAwKSB7XHJcbiAgICAgICAgZGVidWdsb2coXCIqKioqKioqKioqKmhlcmUgbWRsXCIgKyBKU09OLnN0cmluZ2lmeShvTWRsLCB1bmRlZmluZWQsIDIpKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RvbWFpbiAnICsgb01kbC5kb21haW4gKyAnIGFscmVhZHkgbG9hZGVkIHdoaWxlIGxvYWRpbmcgJyArIHNNb2RlbE5hbWUgKyAnPycpO1xyXG4gICAgfVxyXG4gICAgLy8gY2hlY2sgcHJvcGVydGllcyBvZiBtb2RlbFxyXG4gICAgT2JqZWN0LmtleXMob01kbCkuc29ydCgpLmZvckVhY2goZnVuY3Rpb24gKHNQcm9wZXJ0eSkge1xyXG4gICAgICAgIGlmIChBUlJfTU9ERUxfUFJPUEVSVElFUy5pbmRleE9mKHNQcm9wZXJ0eSkgPCAwKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTW9kZWwgcHJvcGVydHkgXCInICsgc1Byb3BlcnR5ICsgJ1wiIG5vdCBhIGtub3duIG1vZGVsIHByb3BlcnR5IGluIG1vZGVsIG9mIGRvbWFpbiAnICsgb01kbC5kb21haW4gKyAnICcpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgLy8gY29uc2lkZXIgc3RyZWFtbGluaW5nIHRoZSBjYXRlZ29yaWVzXHJcbiAgICBvTW9kZWwucmF3TW9kZWxzW29NZGwuZG9tYWluXSA9IG9NZGw7XHJcblxyXG4gICAgb01vZGVsLmZ1bGwuZG9tYWluW29NZGwuZG9tYWluXSA9IHtcclxuICAgICAgICBkZXNjcmlwdGlvbjogb01kbC5kZXNjcmlwdGlvbixcclxuICAgICAgICBjYXRlZ29yaWVzOiBjYXRlZ29yeURlc2NyaWJlZE1hcCxcclxuICAgICAgICBiaXRpbmRleDogb01kbC5iaXRpbmRleFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBjaGVjayB0aGF0XHJcblxyXG5cclxuICAgIC8vIGNoZWNrIHRoYXQgbWVtYmVycyBvZiB3b3JkaW5kZXggYXJlIGluIGNhdGVnb3JpZXMsXHJcbiAgICBvTWRsLndvcmRpbmRleCA9IG9NZGwud29yZGluZGV4IHx8IFtdO1xyXG4gICAgb01kbC53b3JkaW5kZXguZm9yRWFjaChmdW5jdGlvbiAoc1dvcmRJbmRleCkge1xyXG4gICAgICAgIGlmIChvTWRsLmNhdGVnb3J5LmluZGV4T2Yoc1dvcmRJbmRleCkgPCAwKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTW9kZWwgd29yZGluZGV4IFwiJyArIHNXb3JkSW5kZXggKyAnXCIgbm90IGEgY2F0ZWdvcnkgb2YgZG9tYWluICcgKyBvTWRsLmRvbWFpbiArICcgJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICBvTWRsLmV4YWN0bWF0Y2ggPSBvTWRsLmV4YWN0bWF0Y2ggfHwgW107XHJcbiAgICBvTWRsLmV4YWN0bWF0Y2guZm9yRWFjaChmdW5jdGlvbiAoc0V4YWN0TWF0Y2gpIHtcclxuICAgICAgICBpZiAob01kbC5jYXRlZ29yeS5pbmRleE9mKHNFeGFjdE1hdGNoKSA8IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNb2RlbCBleGFjdG1hdGNoIFwiJyArIHNFeGFjdE1hdGNoICsgJ1wiIG5vdCBhIGNhdGVnb3J5IG9mIGRvbWFpbiAnICsgb01kbC5kb21haW4gKyAnICcpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgb01kbC5jb2x1bW5zID0gb01kbC5jb2x1bW5zIHx8IFtdO1xyXG4gICAgb01kbC5jb2x1bW5zLmZvckVhY2goZnVuY3Rpb24gKHNFeGFjdE1hdGNoKSB7XHJcbiAgICAgICAgaWYgKG9NZGwuY2F0ZWdvcnkuaW5kZXhPZihzRXhhY3RNYXRjaCkgPCAwKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTW9kZWwgY29sdW1uIFwiJyArIHNFeGFjdE1hdGNoICsgJ1wiIG5vdCBhIGNhdGVnb3J5IG9mIGRvbWFpbiAnICsgb01kbC5kb21haW4gKyAnICcpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuXHJcbiAgICAvLyBhZGQgcmVsYXRpb24gZG9tYWluIC0+IGNhdGVnb3J5XHJcbiAgICB2YXIgZG9tYWluU3RyID0gTWV0YUYuRG9tYWluKG9NZGwuZG9tYWluKS50b0Z1bGxTdHJpbmcoKTtcclxuICAgIHZhciByZWxhdGlvblN0ciA9IE1ldGFGLlJlbGF0aW9uKE1ldGEuUkVMQVRJT05faGFzQ2F0ZWdvcnkpLnRvRnVsbFN0cmluZygpO1xyXG4gICAgdmFyIHJldmVyc2VSZWxhdGlvblN0ciA9IE1ldGFGLlJlbGF0aW9uKE1ldGEuUkVMQVRJT05faXNDYXRlZ29yeU9mKS50b0Z1bGxTdHJpbmcoKTtcclxuICAgIG9NZGwuY2F0ZWdvcnkuZm9yRWFjaChmdW5jdGlvbiAoc0NhdGVnb3J5KSB7XHJcblxyXG4gICAgICAgIHZhciBDYXRlZ29yeVN0cmluZyA9IE1ldGFGLkNhdGVnb3J5KHNDYXRlZ29yeSkudG9GdWxsU3RyaW5nKCk7XHJcbiAgICAgICAgb01vZGVsLm1ldGEudDNbZG9tYWluU3RyXSA9IG9Nb2RlbC5tZXRhLnQzW2RvbWFpblN0cl0gfHwge307XHJcbiAgICAgICAgb01vZGVsLm1ldGEudDNbZG9tYWluU3RyXVtyZWxhdGlvblN0cl0gPSBvTW9kZWwubWV0YS50M1tkb21haW5TdHJdW3JlbGF0aW9uU3RyXSB8fCB7fTtcclxuICAgICAgICBvTW9kZWwubWV0YS50M1tkb21haW5TdHJdW3JlbGF0aW9uU3RyXVtDYXRlZ29yeVN0cmluZ10gPSB7fTtcclxuXHJcbiAgICAgICAgb01vZGVsLm1ldGEudDNbQ2F0ZWdvcnlTdHJpbmddID0gb01vZGVsLm1ldGEudDNbQ2F0ZWdvcnlTdHJpbmddIHx8IHt9O1xyXG4gICAgICAgIG9Nb2RlbC5tZXRhLnQzW0NhdGVnb3J5U3RyaW5nXVtyZXZlcnNlUmVsYXRpb25TdHJdID0gb01vZGVsLm1ldGEudDNbQ2F0ZWdvcnlTdHJpbmddW3JldmVyc2VSZWxhdGlvblN0cl0gfHwge307XHJcbiAgICAgICAgb01vZGVsLm1ldGEudDNbQ2F0ZWdvcnlTdHJpbmddW3JldmVyc2VSZWxhdGlvblN0cl1bZG9tYWluU3RyXSA9IHt9O1xyXG5cclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGFkZCBhIHByZWNpY2UgZG9tYWluIG1hdGNocnVsZVxyXG4gICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCB7XHJcbiAgICAgICAgY2F0ZWdvcnk6IFwiZG9tYWluXCIsXHJcbiAgICAgICAgbWF0Y2hlZFN0cmluZzogb01kbC5kb21haW4sXHJcbiAgICAgICAgdHlwZTogSU1hdGNoLkVudW1SdWxlVHlwZS5XT1JELFxyXG4gICAgICAgIHdvcmQ6IG9NZGwuZG9tYWluLFxyXG4gICAgICAgIGJpdGluZGV4OiBvTWRsLmJpdGluZGV4LFxyXG4gICAgICAgIGJpdFNlbnRlbmNlQW5kIDogb01kbC5iaXRpbmRleCxcclxuICAgICAgICB3b3JkVHlwZSA6IFwiRFwiLFxyXG4gICAgICAgIF9yYW5raW5nOiAwLjk1XHJcbiAgICB9LCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuXHJcbiAgICAvLyBjaGVjayB0aGUgdG9vbFxyXG4gICAgaWYgKG9NZGwudG9vbCAmJiBvTWRsLnRvb2wucmVxdWlyZXMpIHtcclxuICAgICAgICB2YXIgcmVxdWlyZXMgPSBPYmplY3Qua2V5cyhvTWRsLnRvb2wucmVxdWlyZXMgfHwge30pO1xyXG4gICAgICAgIHZhciBkaWZmID0gXy5kaWZmZXJlbmNlKHJlcXVpcmVzLCBvTWRsLmNhdGVnb3J5KTtcclxuICAgICAgICBpZiAoZGlmZi5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgJHtvTWRsLmRvbWFpbn0gOiBVbmtvd24gY2F0ZWdvcnkgaW4gcmVxdWlyZXMgb2YgdG9vbDogXCJgICsgZGlmZi5qb2luKCdcIicpICsgJ1wiJyk7XHJcbiAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgtMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBvcHRpb25hbCA9IE9iamVjdC5rZXlzKG9NZGwudG9vbC5vcHRpb25hbCk7XHJcbiAgICAgICAgZGlmZiA9IF8uZGlmZmVyZW5jZShvcHRpb25hbCwgb01kbC5jYXRlZ29yeSk7XHJcbiAgICAgICAgaWYgKGRpZmYubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgICR7b01kbC5kb21haW59IDogVW5rb3duIGNhdGVnb3J5IG9wdGlvbmFsIG9mIHRvb2w6IFwiYCArIGRpZmYuam9pbignXCInKSArICdcIicpO1xyXG4gICAgICAgICAgICBwcm9jZXNzLmV4aXQoLTEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBPYmplY3Qua2V5cyhvTWRsLnRvb2wuc2V0cyB8fCB7fSkuZm9yRWFjaChmdW5jdGlvbiAoc2V0SUQpIHtcclxuICAgICAgICAgICAgdmFyIGRpZmYgPSBfLmRpZmZlcmVuY2Uob01kbC50b29sLnNldHNbc2V0SURdLnNldCwgb01kbC5jYXRlZ29yeSk7XHJcbiAgICAgICAgICAgIGlmIChkaWZmLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgJHtvTWRsLmRvbWFpbn0gOiBVbmtvd24gY2F0ZWdvcnkgaW4gc2V0SWQgJHtzZXRJRH0gb2YgdG9vbDogXCJgICsgZGlmZi5qb2luKCdcIicpICsgJ1wiJyk7XHJcbiAgICAgICAgICAgICAgICBwcm9jZXNzLmV4aXQoLTEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIGV4dHJhY3QgdG9vbHMgYW4gYWRkIHRvIHRvb2xzOlxyXG4gICAgICAgIG9Nb2RlbC50b29scy5maWx0ZXIoZnVuY3Rpb24gKG9FbnRyeSkge1xyXG4gICAgICAgICAgICBpZiAob0VudHJ5Lm5hbWUgPT09IChvTWRsLnRvb2wgJiYgb01kbC50b29sLm5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlRvb2wgXCIgKyBvTWRsLnRvb2wubmFtZSArIFwiIGFscmVhZHkgcHJlc2VudCB3aGVuIGxvYWRpbmcgXCIgKyBzTW9kZWxOYW1lKTtcclxuICAgICAgICAgICAgICAgIC8vdGhyb3cgbmV3IEVycm9yKCdEb21haW4gYWxyZWFkeSBsb2FkZWQ/Jyk7XHJcbiAgICAgICAgICAgICAgICBwcm9jZXNzLmV4aXQoLTEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIG9NZGwudG9vbGhpZGRlbiA9IHRydWU7XHJcbiAgICAgICAgb01kbC50b29sLnJlcXVpcmVzID0geyBcImltcG9zc2libGVcIjoge30gfTtcclxuICAgIH1cclxuICAgIC8vIGFkZCB0aGUgdG9vbCBuYW1lIGFzIHJ1bGUgdW5sZXNzIGhpZGRlblxyXG4gICAgaWYgKCFvTWRsLnRvb2xoaWRkZW4gJiYgb01kbC50b29sICYmIG9NZGwudG9vbC5uYW1lKSB7XHJcbiAgICAgICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCB7XHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBcInRvb2xcIixcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb01kbC50b29sLm5hbWUsXHJcbiAgICAgICAgICAgIHR5cGU6IElNYXRjaC5FbnVtUnVsZVR5cGUuV09SRCxcclxuICAgICAgICAgICAgd29yZDogb01kbC50b29sLm5hbWUsXHJcbiAgICAgICAgICAgIGJpdGluZGV4OiBvTWRsLmJpdGluZGV4LFxyXG4gICAgICAgICAgICBiaXRTZW50ZW5jZUFuZCA6IG9NZGwuYml0aW5kZXgsXHJcbiAgICAgICAgICAgIHdvcmRUeXBlIDogSU1hdGNoLldPUkRUWVBFLlRPT0wsXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiAwLjk1XHJcbiAgICAgICAgfSwgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICB9O1xyXG4gICAgaWYgKG9NZGwuc3lub255bXMgJiYgb01kbC5zeW5vbnltc1tcInRvb2xcIl0pIHtcclxuICAgICAgICBhZGRTeW5vbnltcyhvTWRsLnN5bm9ueW1zW1widG9vbFwiXSwgXCJ0b29sXCIsIG9NZGwudG9vbC5uYW1lLCBvTWRsLmJpdGluZGV4LFxyXG4gICAgICAgIG9NZGwuYml0aW5kZXgsIElNYXRjaC5XT1JEVFlQRS5UT09MLCBvTW9kZWwubVJ1bGVzLCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgIH07XHJcbiAgICBpZiAob01kbC5zeW5vbnltcykge1xyXG4gICAgICAgIE9iamVjdC5rZXlzKG9NZGwuc3lub255bXMpLmZvckVhY2goZnVuY3Rpb24gKHNzeW5rZXkpIHtcclxuICAgICAgICAgICAgaWYgKG9NZGwuY2F0ZWdvcnkuaW5kZXhPZihzc3lua2V5KSA+PSAwICYmIHNzeW5rZXkgIT09IFwidG9vbFwiKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAob01vZGVsLmZ1bGwuZG9tYWluW29NZGwuZG9tYWluXS5jYXRlZ29yaWVzW3NzeW5rZXldKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb01vZGVsLmZ1bGwuZG9tYWluW29NZGwuZG9tYWluXS5jYXRlZ29yaWVzW3NzeW5rZXldLmNhdGVnb3J5X3N5bm9ueW1zID0gb01kbC5zeW5vbnltc1tzc3lua2V5XTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGFkZFN5bm9ueW1zKG9NZGwuc3lub255bXNbc3N5bmtleV0sIFwiY2F0ZWdvcnlcIiwgc3N5bmtleSwgb01kbC5iaXRpbmRleCwgb01kbC5iaXRpbmRleCxcclxuICAgICAgICAgICAgICAgIElNYXRjaC5XT1JEVFlQRS5DQVRFR09SWSwgb01vZGVsLm1SdWxlcywgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIG9Nb2RlbC5kb21haW5zLnB1c2gob01kbC5kb21haW4pO1xyXG4gICAgaWYgKG9NZGwudG9vbC5uYW1lKSB7XHJcbiAgICAgICAgb01vZGVsLnRvb2xzLnB1c2gob01kbC50b29sKTtcclxuICAgIH1cclxuICAgIG9Nb2RlbC5jYXRlZ29yeSA9IG9Nb2RlbC5jYXRlZ29yeS5jb25jYXQob01kbC5jYXRlZ29yeSk7XHJcbiAgICBvTW9kZWwuY2F0ZWdvcnkuc29ydCgpO1xyXG4gICAgb01vZGVsLmNhdGVnb3J5ID0gb01vZGVsLmNhdGVnb3J5LmZpbHRlcihmdW5jdGlvbiAoc3RyaW5nLCBpbmRleCkge1xyXG4gICAgICAgIHJldHVybiBvTW9kZWwuY2F0ZWdvcnlbaW5kZXhdICE9PSBvTW9kZWwuY2F0ZWdvcnlbaW5kZXggKyAxXTtcclxuICAgIH0pO1xyXG5cclxufSAvLyBsb2FkbW9kZWxcclxuKi9cclxuXHJcbmZ1bmN0aW9uIG1ha2VNZGxNb25nbyhtb2RlbEhhbmRsZTogSU1hdGNoLklNb2RlbEhhbmRsZVJhdywgc01vZGVsTmFtZTogc3RyaW5nLCBvTW9kZWw6IElNYXRjaC5JTW9kZWxzKTogSU1vZGVsIHtcclxuICAgIHZhciBtb2RlbERvYyA9IG1vZGVsSGFuZGxlLm1vZGVsRG9jc1tzTW9kZWxOYW1lXTtcclxuICAgIHZhciBvTWRsID0ge1xyXG4gICAgICAgIGJpdGluZGV4OiBnZXREb21haW5CaXRJbmRleFNhZmUobW9kZWxEb2MuZG9tYWluLCBvTW9kZWwpLFxyXG4gICAgICAgIGRvbWFpbjogbW9kZWxEb2MuZG9tYWluLFxyXG4gICAgICAgIG1vZGVsbmFtZTogc01vZGVsTmFtZSxcclxuICAgICAgICBkZXNjcmlwdGlvbjogbW9kZWxEb2MuZG9tYWluX2Rlc2NyaXB0aW9uXHJcbiAgICB9IGFzIElNb2RlbDtcclxuICAgIHZhciBjYXRlZ29yeURlc2NyaWJlZE1hcCA9IHt9IGFzIHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklDYXRlZ29yeURlc2MgfTtcclxuXHJcbiAgICBvTWRsLmJpdGluZGV4ID0gZ2V0RG9tYWluQml0SW5kZXhTYWZlKG1vZGVsRG9jLmRvbWFpbiwgb01vZGVsKTtcclxuICAgIG9NZGwuY2F0ZWdvcnkgPSBtb2RlbERvYy5fY2F0ZWdvcmllcy5tYXAoY2F0ID0+IGNhdC5jYXRlZ29yeSk7XHJcbiAgICBvTWRsLmNhdGVnb3J5RGVzY3JpYmVkID0gW107XHJcbiAgICBtb2RlbERvYy5fY2F0ZWdvcmllcy5mb3JFYWNoKGNhdCA9PiB7XHJcbiAgICAgICAgb01kbC5jYXRlZ29yeURlc2NyaWJlZC5wdXNoKHtcclxuICAgICAgICAgICAgbmFtZTogY2F0LmNhdGVnb3J5LFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogY2F0LmNhdGVnb3J5X2Rlc2NyaXB0aW9uXHJcbiAgICAgICAgfSlcclxuICAgICAgICBjYXRlZ29yeURlc2NyaWJlZE1hcFtjYXQuY2F0ZWdvcnldID0gY2F0O1xyXG4gICAgfSk7XHJcblxyXG4gICAgb01kbC5jYXRlZ29yeSA9IG1vZGVsRG9jLl9jYXRlZ29yaWVzLm1hcChjYXQgPT4gY2F0LmNhdGVnb3J5KTtcclxuXHJcbiAgICAvKiAvLyByZWN0aWZ5IGNhdGVnb3J5XHJcbiAgICAgb01kbC5jYXRlZ29yeSA9IG9NZGwuY2F0ZWdvcnkubWFwKGZ1bmN0aW9uIChjYXQ6IGFueSkge1xyXG4gICAgICAgICBpZiAodHlwZW9mIGNhdCA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICAgcmV0dXJuIGNhdDtcclxuICAgICAgICAgfVxyXG4gICAgICAgICBpZiAodHlwZW9mIGNhdC5uYW1lICE9PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIk1pc3NpbmcgbmFtZSBpbiBvYmplY3QgdHlwZWQgY2F0ZWdvcnkgaW4gXCIgKyBKU09OLnN0cmluZ2lmeShjYXQpICsgXCIgaW4gbW9kZWwgXCIgKyBzTW9kZWxOYW1lKTtcclxuICAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgtMSk7XHJcbiAgICAgICAgICAgICAvL3Rocm93IG5ldyBFcnJvcignRG9tYWluICcgKyBvTWRsLmRvbWFpbiArICcgYWxyZWFkeSBsb2FkZWQgd2hpbGUgbG9hZGluZyAnICsgc01vZGVsTmFtZSArICc/Jyk7XHJcbiAgICAgICAgIH1cclxuICAgICAgICAgY2F0ZWdvcnlEZXNjcmliZWRNYXBbY2F0Lm5hbWVdID0gY2F0O1xyXG4gICAgICAgICBvTWRsLmNhdGVnb3J5RGVzY3JpYmVkLnB1c2goY2F0KTtcclxuICAgICAgICAgcmV0dXJuIGNhdC5uYW1lO1xyXG4gICAgIH0pO1xyXG4gICAgICovXHJcblxyXG4gICAgLy8gYWRkIHRoZSBjYXRlZ29yaWVzIHRvIHRoZSBydWxlc1xyXG4gICAgb01kbC5jYXRlZ29yeS5mb3JFYWNoKGZ1bmN0aW9uIChjYXRlZ29yeSkge1xyXG4gICAgICAgIGluc2VydFJ1bGVJZk5vdFByZXNlbnQob01vZGVsLm1SdWxlcywge1xyXG4gICAgICAgICAgICBjYXRlZ29yeTogXCJjYXRlZ29yeVwiLFxyXG4gICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBjYXRlZ29yeSxcclxuICAgICAgICAgICAgdHlwZTogSU1hdGNoLkVudW1SdWxlVHlwZS5XT1JELFxyXG4gICAgICAgICAgICB3b3JkOiBjYXRlZ29yeSxcclxuICAgICAgICAgICAgbG93ZXJjYXNld29yZDogY2F0ZWdvcnkudG9Mb3dlckNhc2UoKSxcclxuICAgICAgICAgICAgYml0aW5kZXg6IG9NZGwuYml0aW5kZXgsXHJcbiAgICAgICAgICAgIHdvcmRUeXBlOiBJTWF0Y2guV09SRFRZUEUuQ0FURUdPUlksXHJcbiAgICAgICAgICAgIGJpdFNlbnRlbmNlQW5kOiBvTWRsLmJpdGluZGV4LFxyXG4gICAgICAgICAgICBfcmFua2luZzogMC45NVxyXG4gICAgICAgIH0sIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gYWRkIHN5bm9uYW55bSBmb3IgdGhlIGNhdGVnb3JpZXMgdG8gdGhlXHJcblxyXG4gICAgbW9kZWxEb2MuX2NhdGVnb3JpZXMuZm9yRWFjaChjYXQgPT4ge1xyXG4gICAgICAgIGFkZFN5bm9ueW1zXHJcblxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKG9Nb2RlbC5kb21haW5zLmluZGV4T2Yob01kbC5kb21haW4pIDwgMCkge1xyXG4gICAgICAgIGRlYnVnbG9nKFwiKioqKioqKioqKipoZXJlIG1kbFwiICsgSlNPTi5zdHJpbmdpZnkob01kbCwgdW5kZWZpbmVkLCAyKSk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdEb21haW4gJyArIG9NZGwuZG9tYWluICsgJyBhbHJlYWR5IGxvYWRlZCB3aGlsZSBsb2FkaW5nICcgKyBzTW9kZWxOYW1lICsgJz8nKTtcclxuICAgIH1cclxuICAgIC8qXHJcbiAgICAvLyBjaGVjayBwcm9wZXJ0aWVzIG9mIG1vZGVsXHJcbiAgICBPYmplY3Qua2V5cyhvTWRsKS5zb3J0KCkuZm9yRWFjaChmdW5jdGlvbiAoc1Byb3BlcnR5KSB7XHJcbiAgICAgICAgaWYgKEFSUl9NT0RFTF9QUk9QRVJUSUVTLmluZGV4T2Yoc1Byb3BlcnR5KSA8IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNb2RlbCBwcm9wZXJ0eSBcIicgKyBzUHJvcGVydHkgKyAnXCIgbm90IGEga25vd24gbW9kZWwgcHJvcGVydHkgaW4gbW9kZWwgb2YgZG9tYWluICcgKyBvTWRsLmRvbWFpbiArICcgJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICAqL1xyXG5cclxuICAgIC8vIGNvbnNpZGVyIHN0cmVhbWxpbmluZyB0aGUgY2F0ZWdvcmllc1xyXG4gICAgb01vZGVsLnJhd01vZGVsc1tvTWRsLmRvbWFpbl0gPSBvTWRsO1xyXG5cclxuICAgIG9Nb2RlbC5mdWxsLmRvbWFpbltvTWRsLmRvbWFpbl0gPSB7XHJcbiAgICAgICAgZGVzY3JpcHRpb246IG9NZGwuZGVzY3JpcHRpb24sXHJcbiAgICAgICAgY2F0ZWdvcmllczogY2F0ZWdvcnlEZXNjcmliZWRNYXAsXHJcbiAgICAgICAgYml0aW5kZXg6IG9NZGwuYml0aW5kZXhcclxuICAgIH07XHJcblxyXG4gICAgLy8gY2hlY2sgdGhhdFxyXG5cclxuXHJcbiAgICAvLyBjaGVjayB0aGF0IG1lbWJlcnMgb2Ygd29yZGluZGV4IGFyZSBpbiBjYXRlZ29yaWVzLFxyXG4gICAgLyogb01kbC53b3JkaW5kZXggPSBvTW9kZWxEb2Mub01kbC53b3JkaW5kZXggfHwgW107XHJcbiAgICAgb01kbC53b3JkaW5kZXguZm9yRWFjaChmdW5jdGlvbiAoc1dvcmRJbmRleCkge1xyXG4gICAgICAgICBpZiAob01kbC5jYXRlZ29yeS5pbmRleE9mKHNXb3JkSW5kZXgpIDwgMCkge1xyXG4gICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNb2RlbCB3b3JkaW5kZXggXCInICsgc1dvcmRJbmRleCArICdcIiBub3QgYSBjYXRlZ29yeSBvZiBkb21haW4gJyArIG9NZGwuZG9tYWluICsgJyAnKTtcclxuICAgICAgICAgfVxyXG4gICAgIH0pO1xyXG4gICAgICovXHJcbiAgICAvKlxyXG4gICAgb01kbC5leGFjdG1hdGNoID0gb01kbC5leGFjdG1hdGNoIHx8IFtdO1xyXG4gICAgb01kbC5leGFjdG1hdGNoLmZvckVhY2goZnVuY3Rpb24gKHNFeGFjdE1hdGNoKSB7XHJcbiAgICAgICAgaWYgKG9NZGwuY2F0ZWdvcnkuaW5kZXhPZihzRXhhY3RNYXRjaCkgPCAwKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTW9kZWwgZXhhY3RtYXRjaCBcIicgKyBzRXhhY3RNYXRjaCArICdcIiBub3QgYSBjYXRlZ29yeSBvZiBkb21haW4gJyArIG9NZGwuZG9tYWluICsgJyAnKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICAgICovXHJcbiAgICBvTWRsLmNvbHVtbnMgPSBtb2RlbERvYy5jb2x1bW5zOyAvLyBvTWRsLmNvbHVtbnMgfHwgW107XHJcbiAgICBvTWRsLmNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoc0V4YWN0TWF0Y2gpIHtcclxuICAgICAgICBpZiAob01kbC5jYXRlZ29yeS5pbmRleE9mKHNFeGFjdE1hdGNoKSA8IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNb2RlbCBjb2x1bW4gXCInICsgc0V4YWN0TWF0Y2ggKyAnXCIgbm90IGEgY2F0ZWdvcnkgb2YgZG9tYWluICcgKyBvTWRsLmRvbWFpbiArICcgJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG5cclxuICAgIC8vIGFkZCByZWxhdGlvbiBkb21haW4gLT4gY2F0ZWdvcnlcclxuICAgIHZhciBkb21haW5TdHIgPSBNZXRhRi5Eb21haW4ob01kbC5kb21haW4pLnRvRnVsbFN0cmluZygpO1xyXG4gICAgdmFyIHJlbGF0aW9uU3RyID0gTWV0YUYuUmVsYXRpb24oTWV0YS5SRUxBVElPTl9oYXNDYXRlZ29yeSkudG9GdWxsU3RyaW5nKCk7XHJcbiAgICB2YXIgcmV2ZXJzZVJlbGF0aW9uU3RyID0gTWV0YUYuUmVsYXRpb24oTWV0YS5SRUxBVElPTl9pc0NhdGVnb3J5T2YpLnRvRnVsbFN0cmluZygpO1xyXG4gICAgb01kbC5jYXRlZ29yeS5mb3JFYWNoKGZ1bmN0aW9uIChzQ2F0ZWdvcnkpIHtcclxuXHJcbiAgICAgICAgdmFyIENhdGVnb3J5U3RyaW5nID0gTWV0YUYuQ2F0ZWdvcnkoc0NhdGVnb3J5KS50b0Z1bGxTdHJpbmcoKTtcclxuICAgICAgICBvTW9kZWwubWV0YS50M1tkb21haW5TdHJdID0gb01vZGVsLm1ldGEudDNbZG9tYWluU3RyXSB8fCB7fTtcclxuICAgICAgICBvTW9kZWwubWV0YS50M1tkb21haW5TdHJdW3JlbGF0aW9uU3RyXSA9IG9Nb2RlbC5tZXRhLnQzW2RvbWFpblN0cl1bcmVsYXRpb25TdHJdIHx8IHt9O1xyXG4gICAgICAgIG9Nb2RlbC5tZXRhLnQzW2RvbWFpblN0cl1bcmVsYXRpb25TdHJdW0NhdGVnb3J5U3RyaW5nXSA9IHt9O1xyXG5cclxuICAgICAgICBvTW9kZWwubWV0YS50M1tDYXRlZ29yeVN0cmluZ10gPSBvTW9kZWwubWV0YS50M1tDYXRlZ29yeVN0cmluZ10gfHwge307XHJcbiAgICAgICAgb01vZGVsLm1ldGEudDNbQ2F0ZWdvcnlTdHJpbmddW3JldmVyc2VSZWxhdGlvblN0cl0gPSBvTW9kZWwubWV0YS50M1tDYXRlZ29yeVN0cmluZ11bcmV2ZXJzZVJlbGF0aW9uU3RyXSB8fCB7fTtcclxuICAgICAgICBvTW9kZWwubWV0YS50M1tDYXRlZ29yeVN0cmluZ11bcmV2ZXJzZVJlbGF0aW9uU3RyXVtkb21haW5TdHJdID0ge307XHJcblxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gYWRkIGEgcHJlY2ljZSBkb21haW4gbWF0Y2hydWxlXHJcbiAgICBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG9Nb2RlbC5tUnVsZXMsIHtcclxuICAgICAgICBjYXRlZ29yeTogXCJkb21haW5cIixcclxuICAgICAgICBtYXRjaGVkU3RyaW5nOiBvTWRsLmRvbWFpbixcclxuICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQsXHJcbiAgICAgICAgd29yZDogb01kbC5kb21haW4sXHJcbiAgICAgICAgYml0aW5kZXg6IG9NZGwuYml0aW5kZXgsXHJcbiAgICAgICAgYml0U2VudGVuY2VBbmQ6IG9NZGwuYml0aW5kZXgsXHJcbiAgICAgICAgd29yZFR5cGU6IElNYXRjaC5XT1JEVFlQRS5ET01BSU4sXHJcbiAgICAgICAgX3Jhbmtpbmc6IDAuOTVcclxuICAgIH0sIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG5cclxuICAgIC8vIGFkZCBkb21haW4gc3lub255bXNcclxuICAgIGlmIChtb2RlbERvYy5kb21haW5fc3lub255bXMgJiYgbW9kZWxEb2MuZG9tYWluX3N5bm9ueW1zLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBhZGRTeW5vbnltcyhtb2RlbERvYy5kb21haW5fc3lub255bXMsIFwiZG9tYWluXCIsIG1vZGVsRG9jLmRvbWFpbiwgb01kbC5iaXRpbmRleCxcclxuICAgICAgICAgICAgb01kbC5iaXRpbmRleCwgSU1hdGNoLldPUkRUWVBFLkRPTUFJTiwgb01vZGVsLm1SdWxlcywgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgYWRkU3lub255bXMobW9kZWxEb2MuZG9tYWluX3N5bm9ueW1zLCBcImRvbWFpblwiLCBtb2RlbERvYy5kb21haW4sIGdldERvbWFpbkJpdEluZGV4U2FmZShET01BSU5fTUVUQU1PREVMLCBvTW9kZWwpLFxyXG4gICAgICAgICAgICAgICAgICBnZXREb21haW5CaXRJbmRleFNhZmUoRE9NQUlOX01FVEFNT0RFTCwgb01vZGVsKSxcclxuICAgICAgICAgICAgICAgIElNYXRjaC5XT1JEVFlQRS5GQUNULCBvTW9kZWwubVJ1bGVzLCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgICAgICAvLyBUT0RPOiBzeW5vbnltIGhhdmUgdG8gYmUgYWRkZWQgYXMgKkZBQ1QqIGZvciB0aGUgbWV0YW1vZGVsIVxyXG5cclxuICAgIH07XHJcblxyXG5cclxuICAgIC8qXHJcbiAgICAgICAgLy8gY2hlY2sgdGhlIHRvb2xcclxuICAgICAgICBpZiAob01kbC50b29sICYmIG9NZGwudG9vbC5yZXF1aXJlcykge1xyXG4gICAgICAgICAgICB2YXIgcmVxdWlyZXMgPSBPYmplY3Qua2V5cyhvTWRsLnRvb2wucmVxdWlyZXMgfHwge30pO1xyXG4gICAgICAgICAgICB2YXIgZGlmZiA9IF8uZGlmZmVyZW5jZShyZXF1aXJlcywgb01kbC5jYXRlZ29yeSk7XHJcbiAgICAgICAgICAgIGlmIChkaWZmLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgJHtvTWRsLmRvbWFpbn0gOiBVbmtvd24gY2F0ZWdvcnkgaW4gcmVxdWlyZXMgb2YgdG9vbDogXCJgICsgZGlmZi5qb2luKCdcIicpICsgJ1wiJyk7XHJcbiAgICAgICAgICAgICAgICBwcm9jZXNzLmV4aXQoLTEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciBvcHRpb25hbCA9IE9iamVjdC5rZXlzKG9NZGwudG9vbC5vcHRpb25hbCk7XHJcbiAgICAgICAgICAgIGRpZmYgPSBfLmRpZmZlcmVuY2Uob3B0aW9uYWwsIG9NZGwuY2F0ZWdvcnkpO1xyXG4gICAgICAgICAgICBpZiAoZGlmZi5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICR7b01kbC5kb21haW59IDogVW5rb3duIGNhdGVnb3J5IG9wdGlvbmFsIG9mIHRvb2w6IFwiYCArIGRpZmYuam9pbignXCInKSArICdcIicpO1xyXG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5leGl0KC0xKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhvTWRsLnRvb2wuc2V0cyB8fCB7fSkuZm9yRWFjaChmdW5jdGlvbiAoc2V0SUQpIHtcclxuICAgICAgICAgICAgICAgIHZhciBkaWZmID0gXy5kaWZmZXJlbmNlKG9NZGwudG9vbC5zZXRzW3NldElEXS5zZXQsIG9NZGwuY2F0ZWdvcnkpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGRpZmYubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgJHtvTWRsLmRvbWFpbn0gOiBVbmtvd24gY2F0ZWdvcnkgaW4gc2V0SWQgJHtzZXRJRH0gb2YgdG9vbDogXCJgICsgZGlmZi5qb2luKCdcIicpICsgJ1wiJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5leGl0KC0xKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBleHRyYWN0IHRvb2xzIGFuIGFkZCB0byB0b29sczpcclxuICAgICAgICAgICAgb01vZGVsLnRvb2xzLmZpbHRlcihmdW5jdGlvbiAob0VudHJ5KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAob0VudHJ5Lm5hbWUgPT09IChvTWRsLnRvb2wgJiYgb01kbC50b29sLm5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJUb29sIFwiICsgb01kbC50b29sLm5hbWUgKyBcIiBhbHJlYWR5IHByZXNlbnQgd2hlbiBsb2FkaW5nIFwiICsgc01vZGVsTmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy90aHJvdyBuZXcgRXJyb3IoJ0RvbWFpbiBhbHJlYWR5IGxvYWRlZD8nKTtcclxuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzLmV4aXQoLTEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBvTWRsLnRvb2xoaWRkZW4gPSB0cnVlO1xyXG4gICAgICAgICAgICBvTWRsLnRvb2wucmVxdWlyZXMgPSB7IFwiaW1wb3NzaWJsZVwiOiB7fSB9O1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBhZGQgdGhlIHRvb2wgbmFtZSBhcyBydWxlIHVubGVzcyBoaWRkZW5cclxuICAgICAgICBpZiAoIW9NZGwudG9vbGhpZGRlbiAmJiBvTWRsLnRvb2wgJiYgb01kbC50b29sLm5hbWUpIHtcclxuICAgICAgICAgICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCB7XHJcbiAgICAgICAgICAgICAgICBjYXRlZ29yeTogXCJ0b29sXCIsXHJcbiAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvTWRsLnRvb2wubmFtZSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IElNYXRjaC5FbnVtUnVsZVR5cGUuV09SRCxcclxuICAgICAgICAgICAgICAgIHdvcmQ6IG9NZGwudG9vbC5uYW1lLFxyXG4gICAgICAgICAgICAgICAgYml0aW5kZXg6IG9NZGwuYml0aW5kZXgsXHJcbiAgICAgICAgICAgICAgICBiaXRTZW50ZW5jZUFuZCA6IG9NZGwuYml0aW5kZXgsXHJcbiAgICAgICAgICAgICAgICB3b3JkVHlwZSA6IElNYXRjaC5XT1JEVFlQRS5UT09MLFxyXG4gICAgICAgICAgICAgICAgX3Jhbmtpbmc6IDAuOTVcclxuICAgICAgICAgICAgfSwgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBpZiAob01kbC5zeW5vbnltcyAmJiBvTWRsLnN5bm9ueW1zW1widG9vbFwiXSkge1xyXG4gICAgICAgICAgICBhZGRTeW5vbnltcyhvTWRsLnN5bm9ueW1zW1widG9vbFwiXSwgXCJ0b29sXCIsIG9NZGwudG9vbC5uYW1lLCBvTWRsLmJpdGluZGV4LFxyXG4gICAgICAgICAgICBvTWRsLmJpdGluZGV4LCBJTWF0Y2guV09SRFRZUEUuVE9PTCwgb01vZGVsLm1SdWxlcywgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAqL1xyXG5cclxuICAgIC8vIGFkZCBzeW5zb255bSBmb3IgdGhlIGRvbWFpbnNcclxuXHJcblxyXG4gICAgLy8gYWRkIHN5bm9ueW1zIGZvciB0aGUgY2F0ZWdvcmllc1xyXG5cclxuICAgIG1vZGVsRG9jLl9jYXRlZ29yaWVzLmZvckVhY2goY2F0ID0+IHtcclxuICAgICAgICBpZiAoY2F0LmNhdGVnb3J5X3N5bm9ueW1zICYmIGNhdC5jYXRlZ29yeV9zeW5vbnltcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGlmIChvTW9kZWwuZnVsbC5kb21haW5bb01kbC5kb21haW5dLmNhdGVnb3JpZXNbY2F0LmNhdGVnb3J5XSkge1xyXG4gICAgICAgICAgICAgICAgb01vZGVsLmZ1bGwuZG9tYWluW29NZGwuZG9tYWluXS5jYXRlZ29yaWVzW2NhdC5jYXRlZ29yeV0uY2F0ZWdvcnlfc3lub255bXMgPSBjYXQuY2F0ZWdvcnlfc3lub255bXM7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYWRkU3lub255bXMoY2F0LmNhdGVnb3J5X3N5bm9ueW1zLCBcImNhdGVnb3J5XCIsIGNhdC5jYXRlZ29yeSwgb01kbC5iaXRpbmRleCwgb01kbC5iaXRpbmRleCxcclxuICAgICAgICAgICAgICAgIElNYXRjaC5XT1JEVFlQRS5DQVRFR09SWSwgb01vZGVsLm1SdWxlcywgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgICAgIC8vIGFkZCBzeW5vbnltcyBpbnRvIHRoZSBtZXRhbW9kZWwgZG9tYWluXHJcbiAgICAgICAgICAgIGFkZFN5bm9ueW1zKGNhdC5jYXRlZ29yeV9zeW5vbnltcywgXCJjYXRlZ29yeVwiLCBjYXQuY2F0ZWdvcnksIGdldERvbWFpbkJpdEluZGV4U2FmZShET01BSU5fTUVUQU1PREVMLCBvTW9kZWwpLFxyXG4gICAgICAgICAgICAgICAgICBnZXREb21haW5CaXRJbmRleFNhZmUoRE9NQUlOX01FVEFNT0RFTCwgb01vZGVsKSxcclxuICAgICAgICAgICAgICAgIElNYXRjaC5XT1JEVFlQRS5GQUNULCBvTW9kZWwubVJ1bGVzLCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIC8vIGFkZCBvcGVyYXRvcnNcclxuXHJcbiAgICAvLyBhZGQgZmlsbGVyc1xyXG4gICAgaWYob01vZGVsLmRvbWFpbnMuaW5kZXhPZihvTWRsLmRvbWFpbikgPCAwKSB7XHJcbiAgICAgICAgdGhyb3cgRXJyb3IoJ21pc3NpbmcgZG9tYWluIHJlZ2lzdHJhdGlvbiBmb3IgJyArIG9NZGwuZG9tYWluKTtcclxuICAgIH1cclxuICAgIC8vb01vZGVsLmRvbWFpbnMucHVzaChvTWRsLmRvbWFpbik7XHJcbiAgICBvTW9kZWwuY2F0ZWdvcnkgPSBvTW9kZWwuY2F0ZWdvcnkuY29uY2F0KG9NZGwuY2F0ZWdvcnkpO1xyXG4gICAgb01vZGVsLmNhdGVnb3J5LnNvcnQoKTtcclxuICAgIG9Nb2RlbC5jYXRlZ29yeSA9IG9Nb2RlbC5jYXRlZ29yeS5maWx0ZXIoZnVuY3Rpb24gKHN0cmluZywgaW5kZXgpIHtcclxuICAgICAgICByZXR1cm4gb01vZGVsLmNhdGVnb3J5W2luZGV4XSAhPT0gb01vZGVsLmNhdGVnb3J5W2luZGV4ICsgMV07XHJcbiAgICB9KTtcclxuICAgIHJldHVybiBvTWRsO1xyXG59IC8vIGxvYWRtb2RlbFxyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3BsaXRSdWxlcyhydWxlczogSU1hdGNoLm1SdWxlW10pOiBJTWF0Y2guU3BsaXRSdWxlcyB7XHJcbiAgICB2YXIgcmVzID0ge307XHJcbiAgICB2YXIgbm9uV29yZFJ1bGVzID0gW107XHJcbiAgICBydWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChydWxlKSB7XHJcbiAgICAgICAgaWYgKHJ1bGUudHlwZSA9PT0gSU1hdGNoLkVudW1SdWxlVHlwZS5XT1JEKSB7XHJcbiAgICAgICAgICAgIGlmICghcnVsZS5sb3dlcmNhc2V3b3JkKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJSdWxlIGhhcyBubyBtZW1iZXIgbG93ZXJjYXNld29yZFwiICsgSlNPTi5zdHJpbmdpZnkocnVsZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJlc1tydWxlLmxvd2VyY2FzZXdvcmRdID0gcmVzW3J1bGUubG93ZXJjYXNld29yZF0gfHwgeyBiaXRpbmRleDogMCwgcnVsZXM6IFtdIH07XHJcbiAgICAgICAgICAgIHJlc1tydWxlLmxvd2VyY2FzZXdvcmRdLmJpdGluZGV4ID0gcmVzW3J1bGUubG93ZXJjYXNld29yZF0uYml0aW5kZXggfCBydWxlLmJpdGluZGV4O1xyXG4gICAgICAgICAgICByZXNbcnVsZS5sb3dlcmNhc2V3b3JkXS5ydWxlcy5wdXNoKHJ1bGUpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG5vbldvcmRSdWxlcy5wdXNoKHJ1bGUpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICB3b3JkTWFwOiByZXMsXHJcbiAgICAgICAgbm9uV29yZFJ1bGVzOiBub25Xb3JkUnVsZXMsXHJcbiAgICAgICAgYWxsUnVsZXM6IHJ1bGVzLFxyXG4gICAgICAgIHdvcmRDYWNoZToge31cclxuICAgIH07XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc29ydEZsYXRSZWNvcmRzKGEsYikge1xyXG4gICAgdmFyIGtleXMgPSBfLnVuaW9uKE9iamVjdC5rZXlzKGEpLE9iamVjdC5rZXlzKGIpKS5zb3J0KCk7XHJcbiAgICB2YXIgciA9IDA7XHJcbiAgICBrZXlzLmV2ZXJ5KCAoa2V5KSA9PiB7XHJcbiAgICAgICAgaWYodHlwZW9mIGFba2V5XSA9PT0gXCJzdHJpbmdcIiAmJiB0eXBlb2YgYltrZXldICE9PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICAgIHIgPSAtMTtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZih0eXBlb2YgYVtrZXldICE9PSBcInN0cmluZ1wiICYmIHR5cGVvZiBiW2tleV0gPT09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgciA9ICsxO1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHR5cGVvZiBhW2tleV0gIT09IFwic3RyaW5nXCIgJiYgdHlwZW9mIGJba2V5XSAhPT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICByID0gMDtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHIgPSBhW2tleV0ubG9jYWxlQ29tcGFyZShiW2tleV0pO1xyXG4gICAgICAgIHJldHVybiByID09PSAwO1xyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gcjtcclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBjbXBMZW5ndGhTb3J0KGE6IHN0cmluZywgYjogc3RyaW5nKSB7XHJcbiAgICB2YXIgZCA9IGEubGVuZ3RoIC0gYi5sZW5ndGg7XHJcbiAgICBpZiAoZCkge1xyXG4gICAgICAgIHJldHVybiBkO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGEubG9jYWxlQ29tcGFyZShiKTtcclxufVxyXG5cclxuXHJcbmltcG9ydCAqIGFzIEFsZ29sIGZyb20gJy4uL21hdGNoL2FsZ29sJztcclxuLy8gb2Zmc2V0WzBdIDogbGVuLTJcclxuLy8gICAgICAgICAgICAgbGVuIC0xXHJcbi8vICAgICAgICAgICAgIGxlblxyXG4vLyAgICAgICAgICAgICBsZW4gKzFcclxuLy8gICAgICAgICAgICAgbGVuICsyXHJcbi8vICAgICAgICAgICAgIGxlbiArM1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbmROZXh0TGVuKHRhcmdldExlbjogbnVtYmVyLCBhcnI6IHN0cmluZ1tdLCBvZmZzZXRzOiBudW1iZXJbXSkge1xyXG4gICAgb2Zmc2V0cy5zaGlmdCgpO1xyXG4gICAgZm9yICh2YXIgaSA9IG9mZnNldHNbNF07IChpIDwgYXJyLmxlbmd0aCkgJiYgKGFycltpXS5sZW5ndGggPD0gdGFyZ2V0TGVuKTsgKytpKSB7XHJcbiAgICAgICAgLyogZW1wdHkqL1xyXG4gICAgfVxyXG4gICAgLy9jb25zb2xlLmxvZyhcInB1c2hpbmcgXCIgKyBpKTtcclxuICAgIG9mZnNldHMucHVzaChpKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFkZFJhbmdlUnVsZXNVbmxlc3NQcmVzZW50KHJ1bGVzOiBJTWF0Y2gubVJ1bGVbXSwgbGN3b3JkOiBzdHJpbmcsIHJhbmdlUnVsZXM6IElNYXRjaC5tUnVsZVtdLCBwcmVzZW50UnVsZXNGb3JLZXk6IElNYXRjaC5tUnVsZVtdLCBzZWVuUnVsZXMpIHtcclxuICAgIHJhbmdlUnVsZXMuZm9yRWFjaChyYW5nZVJ1bGUgPT4ge1xyXG4gICAgICAgIHZhciBuZXdSdWxlID0gKE9iamVjdCBhcyBhbnkpLmFzc2lnbih7fSwgcmFuZ2VSdWxlKTtcclxuICAgICAgICBuZXdSdWxlLmxvd2VyY2FzZXdvcmQgPSBsY3dvcmQ7XHJcbiAgICAgICAgbmV3UnVsZS53b3JkID0gbGN3b3JkO1xyXG4gICAgICAgIC8vaWYoKGxjd29yZCA9PT0gJ3NlcnZpY2VzJyB8fCBsY3dvcmQgPT09ICdzZXJ2aWNlJykgJiYgbmV3UnVsZS5yYW5nZS5ydWxlLmxvd2VyY2FzZXdvcmQuaW5kZXhPZignb2RhdGEnKT49MCkge1xyXG4gICAgICAgIC8vICAgIGNvbnNvbGUubG9nKFwiYWRkaW5nIFwiKyBKU09OLnN0cmluZ2lmeShuZXdSdWxlKSArIFwiXFxuXCIpO1xyXG4gICAgICAgIC8vfVxyXG4gICAgICAgIC8vdG9kbzogY2hlY2sgd2hldGhlciBhbiBlcXVpdmFsZW50IHJ1bGUgaXMgYWxyZWFkeSBwcmVzZW50P1xyXG4gICAgICAgIHZhciBjbnQgPSBydWxlcy5sZW5ndGg7XHJcbiAgICAgICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChydWxlcywgbmV3UnVsZSwgc2VlblJ1bGVzKTtcclxuICAgIH0pXHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYWRkQ2xvc2VFeGFjdFJhbmdlUnVsZXMocnVsZXM6IElNYXRjaC5tUnVsZVtdLCBzZWVuUnVsZXMpIHtcclxuICAgIHZhciBrZXlzTWFwID0ge30gYXMgeyBba2V5OiBzdHJpbmddOiBJTWF0Y2gubVJ1bGVbXSB9O1xyXG4gICAgdmFyIHJhbmdlS2V5c01hcCA9IHt9IGFzIHsgW2tleTogc3RyaW5nXTogSU1hdGNoLm1SdWxlW10gfTtcclxuICAgIHJ1bGVzLmZvckVhY2gocnVsZSA9PiB7XHJcbiAgICAgICAgaWYgKHJ1bGUudHlwZSA9PT0gSU1hdGNoLkVudW1SdWxlVHlwZS5XT1JEKSB7XHJcbiAgICAgICAgICAgIC8va2V5c01hcFtydWxlLmxvd2VyY2FzZXdvcmRdID0gMTtcclxuICAgICAgICAgICAga2V5c01hcFtydWxlLmxvd2VyY2FzZXdvcmRdID0ga2V5c01hcFtydWxlLmxvd2VyY2FzZXdvcmRdIHx8IFtdO1xyXG4gICAgICAgICAgICBrZXlzTWFwW3J1bGUubG93ZXJjYXNld29yZF0ucHVzaChydWxlKTtcclxuICAgICAgICAgICAgaWYgKCFydWxlLmV4YWN0T25seSAmJiBydWxlLnJhbmdlKSB7XHJcbiAgICAgICAgICAgICAgICByYW5nZUtleXNNYXBbcnVsZS5sb3dlcmNhc2V3b3JkXSA9IHJhbmdlS2V5c01hcFtydWxlLmxvd2VyY2FzZXdvcmRdIHx8IFtdO1xyXG4gICAgICAgICAgICAgICAgcmFuZ2VLZXlzTWFwW3J1bGUubG93ZXJjYXNld29yZF0ucHVzaChydWxlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhrZXlzTWFwKTtcclxuICAgIGtleXMuc29ydChjbXBMZW5ndGhTb3J0KTtcclxuICAgIHZhciBsZW4gPSAwO1xyXG4gICAga2V5cy5mb3JFYWNoKChrZXksIGluZGV4KSA9PiB7XHJcbiAgICAgICAgaWYgKGtleS5sZW5ndGggIT0gbGVuKSB7XHJcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJzaGlmdCB0byBsZW5cIiArIGtleS5sZW5ndGggKyAnIGF0ICcgKyBpbmRleCArICcgJyArIGtleSApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZW4gPSBrZXkubGVuZ3RoO1xyXG4gICAgfSk7XHJcbiAgICAvLyAgIGtleXMgPSBrZXlzLnNsaWNlKDAsMjAwMCk7XHJcbiAgICB2YXIgcmFuZ2VLZXlzID0gT2JqZWN0LmtleXMocmFuZ2VLZXlzTWFwKTtcclxuICAgIHJhbmdlS2V5cy5zb3J0KGNtcExlbmd0aFNvcnQpO1xyXG4gICAgLy9jb25zb2xlLmxvZyhgICR7a2V5cy5sZW5ndGh9IGtleXMgYW5kICR7cmFuZ2VLZXlzLmxlbmd0aH0gcmFuZ2VrZXlzIGApO1xyXG4gICAgdmFyIGxvdyA9IDA7XHJcbiAgICB2YXIgaGlnaCA9IDA7XHJcbiAgICB2YXIgbGFzdGxlbiA9IDA7XHJcbiAgICB2YXIgb2Zmc2V0cyA9IFswLCAwLCAwLCAwLCAwLCAwXTtcclxuICAgIHZhciBsZW4gPSByYW5nZUtleXMubGVuZ3RoO1xyXG4gICAgZmluZE5leHRMZW4oMCwga2V5cywgb2Zmc2V0cyk7XHJcbiAgICBmaW5kTmV4dExlbigxLCBrZXlzLCBvZmZzZXRzKTtcclxuICAgIGZpbmROZXh0TGVuKDIsIGtleXMsIG9mZnNldHMpO1xyXG5cclxuICAgIHJhbmdlS2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChyYW5nZUtleSkge1xyXG4gICAgICAgIGlmIChyYW5nZUtleS5sZW5ndGggIT09IGxhc3RsZW4pIHtcclxuICAgICAgICAgICAgZm9yIChpID0gbGFzdGxlbiArIDE7IGkgPD0gcmFuZ2VLZXkubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIGZpbmROZXh0TGVuKGkgKyAyLCBrZXlzLCBvZmZzZXRzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyAgIGNvbnNvbGUubG9nKGAgc2hpZnRlZCB0byAke3JhbmdlS2V5Lmxlbmd0aH0gd2l0aCBvZmZzZXRzIGJlZWluZyAke29mZnNldHMuam9pbignICcpfWApO1xyXG4gICAgICAgICAgICAvLyAgIGNvbnNvbGUubG9nKGAgaGVyZSAwICR7b2Zmc2V0c1swXX0gOiAke2tleXNbTWF0aC5taW4oa2V5cy5sZW5ndGgtMSwgb2Zmc2V0c1swXSldLmxlbmd0aH0gICR7a2V5c1tNYXRoLm1pbihrZXlzLmxlbmd0aC0xLCBvZmZzZXRzWzBdKV19IGApO1xyXG4gICAgICAgICAgICAvLyAgY29uc29sZS5sb2coYCBoZXJlIDUtMSAgJHtrZXlzW29mZnNldHNbNV0tMV0ubGVuZ3RofSAgJHtrZXlzW29mZnNldHNbNV0tMV19IGApO1xyXG4gICAgICAgICAgICAvLyAgIGNvbnNvbGUubG9nKGAgaGVyZSA1ICR7b2Zmc2V0c1s1XX0gOiAke2tleXNbTWF0aC5taW4oa2V5cy5sZW5ndGgtMSwgb2Zmc2V0c1s1XSldLmxlbmd0aH0gICR7a2V5c1tNYXRoLm1pbihrZXlzLmxlbmd0aC0xLCBvZmZzZXRzWzVdKV19IGApO1xyXG4gICAgICAgICAgICBsYXN0bGVuID0gcmFuZ2VLZXkubGVuZ3RoO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmb3IgKHZhciBpID0gb2Zmc2V0c1swXTsgaSA8IG9mZnNldHNbNV07ICsraSkge1xyXG4gICAgICAgICAgICB2YXIgZCA9IERpc3RhbmNlLmNhbGNEaXN0YW5jZUFkanVzdGVkKHJhbmdlS2V5LCBrZXlzW2ldKTtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coYCR7cmFuZ2VLZXkubGVuZ3RoLWtleXNbaV0ubGVuZ3RofSAke2R9ICR7cmFuZ2VLZXl9IGFuZCAke2tleXNbaV19ICBgKTtcclxuICAgICAgICAgICAgaWYgKChkICE9PSAxLjApICYmIChkID49IEFsZ29sLkN1dG9mZl9yYW5nZUNsb3NlTWF0Y2gpKSB7XHJcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKGB3b3VsZCBhZGQgJHtyYW5nZUtleX0gZm9yICR7a2V5c1tpXX0gJHtkfWApO1xyXG4gICAgICAgICAgICAgICAgdmFyIGNudCA9IHJ1bGVzLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgIC8vIHdlIG9ubHkgaGF2ZSB0byBhZGQgaWYgdGhlcmUgaXMgbm90IHlldCBhIG1hdGNoIHJ1bGUgaGVyZSB3aGljaCBwb2ludHMgdG8gdGhlIHNhbWVcclxuICAgICAgICAgICAgICAgIGFkZFJhbmdlUnVsZXNVbmxlc3NQcmVzZW50KHJ1bGVzLCBrZXlzW2ldLCByYW5nZUtleXNNYXBbcmFuZ2VLZXldLCBrZXlzTWFwW2tleXNbaV1dLCBzZWVuUnVsZXMpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHJ1bGVzLmxlbmd0aCA+IGNudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coYCBhZGRlZCAkeyhydWxlcy5sZW5ndGggLSBjbnQpfSByZWNvcmRzIGF0JHtyYW5nZUtleX0gZm9yICR7a2V5c1tpXX0gJHtkfWApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgLypcclxuICAgIFtcclxuICAgICAgICBbJ2FFRkcnLCdhRUZHSCddLFxyXG4gICAgICAgIFsnYUVGR0gnLCdhRUZHSEknXSxcclxuICAgICAgICBbJ09kYXRhJywnT0RhdGFzJ10sXHJcbiAgIFsnT2RhdGEnLCdPZGF0YXMnXSxcclxuICAgWydPZGF0YScsJ09kYXRiJ10sXHJcbiAgIFsnT2RhdGEnLCdVRGF0YSddLFxyXG4gICBbJ3NlcnZpY2UnLCdzZXJ2aWNlcyddLFxyXG4gICBbJ3RoaXMgaXNmdW5ueSBhbmQgbW9yZScsJ3RoaXMgaXNmdW5ueSBhbmQgbW9yZXMnXSxcclxuICAgIF0uZm9yRWFjaChyZWMgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBkaXN0YW5jZSAke3JlY1swXX0gJHtyZWNbMV19IDogJHtEaXN0YW5jZS5jYWxjRGlzdGFuY2UocmVjWzBdLHJlY1sxXSl9ICBhZGYgJHtEaXN0YW5jZS5jYWxjRGlzdGFuY2VBZGp1c3RlZChyZWNbMF0scmVjWzFdKX0gYCk7XHJcblxyXG4gICAgfSk7XHJcbiAgICBjb25zb2xlLmxvZyhcImRpc3RhbmNlIE9kYXRhIFVkYXRhXCIrIERpc3RhbmNlLmNhbGNEaXN0YW5jZSgnT0RhdGEnLCdVRGF0YScpKTtcclxuICAgIGNvbnNvbGUubG9nKFwiZGlzdGFuY2UgT2RhdGEgT2RhdGJcIisgRGlzdGFuY2UuY2FsY0Rpc3RhbmNlKCdPRGF0YScsJ09EYXRiJykpO1xyXG4gICAgY29uc29sZS5sb2coXCJkaXN0YW5jZSBPZGF0YXMgT2RhdGFcIisgRGlzdGFuY2UuY2FsY0Rpc3RhbmNlKCdPRGF0YScsJ09EYXRhYScpKTtcclxuICAgIGNvbnNvbGUubG9nKFwiZGlzdGFuY2UgT2RhdGFzIGFiY2RlXCIrIERpc3RhbmNlLmNhbGNEaXN0YW5jZSgnYWJjZGUnLCdhYmNkZWYnKSk7XHJcbiAgICBjb25zb2xlLmxvZyhcImRpc3RhbmNlIHNlcnZpY2VzIFwiKyBEaXN0YW5jZS5jYWxjRGlzdGFuY2UoJ3NlcnZpY2VzJywnc2VydmljZScpKTtcclxuICAgICovXHJcbn1cclxudmFyIG4gPSAwO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWFkRmlsbGVycyhtb25nb29zZSA6IG1vbmdvb3NlLk1vbmdvb3NlLCBvTW9kZWwgOiBJTWF0Y2guSU1vZGVscykgIDogUHJvbWlzZTxhbnk+IHtcclxuICAgIHZhciBmaWxsZXJCaXRJbmRleCA9IGdldERvbWFpbkJpdEluZGV4KCdtZXRhJywgb01vZGVsKTtcclxuICAgIHZhciBiaXRJbmRleEFsbERvbWFpbnMgPSBnZXRBbGxEb21haW5zQml0SW5kZXgob01vZGVsKTtcclxuICAgIHJldHVybiBTY2hlbWFsb2FkLmdldEZpbGxlcnNGcm9tREIobW9uZ29vc2UpLnRoZW4oXHJcbiAgICAgICAgKGZpbGxlcnNPYmopID0+IGZpbGxlcnNPYmouZmlsbGVyc1xyXG4gICAgKS50aGVuKChmaWxsZXJzOiBzdHJpbmdbXSkgPT4ge1xyXG4gICAgICAgIC8vICBmaWxsZXJzcmVhZEZpbGVBc0pTT04oJy4vJyArIG1vZGVsUGF0aCArICcvZmlsbGVyLmpzb24nKTtcclxuICAgICAgICAvKlxyXG4gICAgICAgIHZhciByZSA9IFwiXigoXCIgKyBmaWxsZXJzLmpvaW4oXCIpfChcIikgKyBcIikpJFwiO1xyXG4gICAgICAgIG9Nb2RlbC5tUnVsZXMucHVzaCh7XHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBcImZpbGxlclwiLFxyXG4gICAgICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLlJFR0VYUCxcclxuICAgICAgICAgICAgcmVnZXhwOiBuZXcgUmVnRXhwKHJlLCBcImlcIiksXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IFwiZmlsbGVyXCIsXHJcbiAgICAgICAgICAgIGJpdGluZGV4OiBmaWxsZXJCaXRJbmRleCxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IDAuOVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgICovXHJcbiAgICAgICAgaWYgKCFfLmlzQXJyYXkoZmlsbGVycykpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdleHBlY3QgZmlsbGVycyB0byBiZSBhbiBhcnJheSBvZiBzdHJpbmdzJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZpbGxlcnMuZm9yRWFjaChmaWxsZXIgPT4ge1xyXG4gICAgICAgICAgICBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG9Nb2RlbC5tUnVsZXMsIHtcclxuICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBcImZpbGxlclwiLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogSU1hdGNoLkVudW1SdWxlVHlwZS5XT1JELFxyXG4gICAgICAgICAgICAgICAgd29yZDogZmlsbGVyLFxyXG4gICAgICAgICAgICAgICAgbG93ZXJjYXNld29yZDogZmlsbGVyLnRvTG93ZXJDYXNlKCksXHJcbiAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBmaWxsZXIsIC8vXCJmaWxsZXJcIixcclxuICAgICAgICAgICAgICAgIGV4YWN0T25seTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGJpdGluZGV4OiBmaWxsZXJCaXRJbmRleCxcclxuICAgICAgICAgICAgICAgIGJpdFNlbnRlbmNlQW5kOiBiaXRJbmRleEFsbERvbWFpbnMsXHJcbiAgICAgICAgICAgICAgICB3b3JkVHlwZTogSU1hdGNoLldPUkRUWVBFLkZJTExFUixcclxuICAgICAgICAgICAgICAgIF9yYW5raW5nOiAwLjlcclxuICAgICAgICAgICAgfSwgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9KTtcclxufTtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVhZE9wZXJhdG9ycyhtb25nb29zZTogbW9uZ29vc2UuTW9uZ29vc2UsIG9Nb2RlbDogSU1hdGNoLklNb2RlbHMpIDogUHJvbWlzZTxhbnk+IHtcclxuICAgICAgICBkZWJ1Z2xvZygncmVhZGluZyBvcGVyYXRvcnMnKTtcclxuICAgICAgICAvL2FkZCBvcGVyYXRvcnNcclxuICAgIHJldHVybiBTY2hlbWFsb2FkLmdldE9wZXJhdG9yc0Zyb21EQihtb25nb29zZSkudGhlbihcclxuICAgICAgICAob3BlcmF0b3JzOiBhbnkpID0+IHtcclxuICAgICAgICB2YXIgb3BlcmF0b3JCaXRJbmRleCA9IGdldERvbWFpbkJpdEluZGV4KCdvcGVyYXRvcnMnLCBvTW9kZWwpO1xyXG4gICAgICAgIHZhciBiaXRJbmRleEFsbERvbWFpbnMgPSBnZXRBbGxEb21haW5zQml0SW5kZXgob01vZGVsKTtcclxuICAgICAgICBPYmplY3Qua2V5cyhvcGVyYXRvcnMub3BlcmF0b3JzKS5mb3JFYWNoKGZ1bmN0aW9uIChvcGVyYXRvcikge1xyXG4gICAgICAgICAgICBpZiAoSU1hdGNoLmFPcGVyYXRvck5hbWVzLmluZGV4T2Yob3BlcmF0b3IpIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgZGVidWdsb2coXCJ1bmtub3duIG9wZXJhdG9yIFwiICsgb3BlcmF0b3IpO1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biBvcGVyYXRvciBcIiArIG9wZXJhdG9yICsgJyAoYWRkIHRvIGlmbWF0Y2gudHMgIGFPcGVyYXRvck5hbWVzKScpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG9Nb2RlbC5vcGVyYXRvcnNbb3BlcmF0b3JdID0gb3BlcmF0b3JzLm9wZXJhdG9yc1tvcGVyYXRvcl07XHJcbiAgICAgICAgICAgIG9Nb2RlbC5vcGVyYXRvcnNbb3BlcmF0b3JdLm9wZXJhdG9yID0gPElNYXRjaC5PcGVyYXRvck5hbWU+b3BlcmF0b3I7XHJcbiAgICAgICAgICAgIE9iamVjdC5mcmVlemUob01vZGVsLm9wZXJhdG9yc1tvcGVyYXRvcl0pO1xyXG4gICAgICAgICAgICB2YXIgd29yZCA9IG9wZXJhdG9yO1xyXG4gICAgICAgICAgICBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG9Nb2RlbC5tUnVsZXMsIHtcclxuICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBcIm9wZXJhdG9yXCIsXHJcbiAgICAgICAgICAgICAgICB3b3JkOiB3b3JkLnRvTG93ZXJDYXNlKCksXHJcbiAgICAgICAgICAgICAgICBsb3dlcmNhc2V3b3JkOiB3b3JkLnRvTG93ZXJDYXNlKCksXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQsXHJcbiAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiB3b3JkLFxyXG4gICAgICAgICAgICAgICAgYml0aW5kZXg6IG9wZXJhdG9yQml0SW5kZXgsXHJcbiAgICAgICAgICAgICAgICBiaXRTZW50ZW5jZUFuZDogYml0SW5kZXhBbGxEb21haW5zLFxyXG4gICAgICAgICAgICAgICAgd29yZFR5cGU6IElNYXRjaC5XT1JEVFlQRS5PUEVSQVRPUixcclxuICAgICAgICAgICAgICAgIF9yYW5raW5nOiAwLjlcclxuICAgICAgICAgICAgfSwgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgICAgIC8vIGFkZCBhbGwgc3lub255bXNcclxuICAgICAgICAgICAgaWYgKG9wZXJhdG9ycy5zeW5vbnltc1tvcGVyYXRvcl0pIHtcclxuICAgICAgICAgICAgICAgIHZhciBhcnIgPSBvcGVyYXRvcnMuc3lub255bXNbb3BlcmF0b3JdO1xyXG4gICAgICAgICAgICAgICAgaWYgKCBhcnIgKVxyXG4gICAgICAgICAgICAgICAge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiggQXJyYXkuaXNBcnJheShhcnIpKVxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXJyLmZvckVhY2goZnVuY3Rpb24gKHN5bm9ueW0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluc2VydFJ1bGVJZk5vdFByZXNlbnQob01vZGVsLm1SdWxlcywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBcIm9wZXJhdG9yXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29yZDogc3lub255bS50b0xvd2VyQ2FzZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvd2VyY2FzZXdvcmQ6IHN5bm9ueW0udG9Mb3dlckNhc2UoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb3BlcmF0b3IsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYml0aW5kZXg6IG9wZXJhdG9yQml0SW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYml0U2VudGVuY2VBbmQ6IGJpdEluZGV4QWxsRG9tYWlucyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JkVHlwZTogSU1hdGNoLldPUkRUWVBFLk9QRVJBVE9SLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiAwLjlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRXhwZXRlZCBvcGVyYXRvciBzeW5vbnltIHRvIGJlIGFycmF5IFwiICsgb3BlcmF0b3IgKyBcIiBpcyBcIiArIEpTT04uc3RyaW5naWZ5KGFycikpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0pO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlbGVhc2VNb2RlbChtb2RlbCA6IElNYXRjaC5JTW9kZWxzKSB7XHJcbiAgICBpZihtb2RlbC5tb25nb0hhbmRsZSAmJiBtb2RlbC5tb25nb0hhbmRsZS5tb25nb29zZSkge1xyXG4gICAgICAgIE1vbmdvVXRpbHMuZGlzY29ubmVjdChtb2RlbC5tb25nb0hhbmRsZS5tb25nb29zZSk7XHJcbiAgICB9XHJcbn1cclxuLypcclxuZXhwb3J0IGZ1bmN0aW9uIGxvYWRNb2RlbEhhbmRsZVAobW9uZ29vc2VIbmRsIDogbW9uZ29vc2UuTW9uZ29vc2UsIG1vZGVsUGF0aDogc3RyaW5nLCBjb25uZWN0aW9uU3RyaW5nPyA6IHN0cmluZykgOiBQcm9taXNlPElNYXRjaC5JTW9kZWxzPiB7XHJcbiAgICB2YXIgbW9uZ29vc2VYID0gbW9uZ29vc2VIbmRsIHx8IG1vbmdvb3NlO1xyXG4gLy8gICBpZihwcm9jZXNzLmVudi5NT05HT19SRVBMQVkpIHtcclxuIC8vICAgICAgICBtb25nb29zZVggPSBtb25nb29zZU1vY2subW9uZ29vc2VNb2NrIGFzIGFueTtcclxuIC8vICAgIH1cclxuICAgIHZhciBjb25uU3RyID0gY29ubmVjdGlvblN0cmluZyB8fCAnbW9uZ29kYjovL2xvY2FsaG9zdC90ZXN0ZGInO1xyXG4gICAgcmV0dXJuIE1vbmdvVXRpbHMub3Blbk1vbmdvb3NlKG1vbmdvb3NlWCwgY29ublN0cikudGhlbihcclxuICAgICAgICAoKSA9PiBnZXRNb25nb0hhbmRsZShtb25nb29zZVgpXHJcbiAgICApLnRoZW4oIChtb2RlbEhhbmRsZSA6IElNYXRjaC5JTW9kZWxIYW5kbGVSYXcpID0+IGxvYWRNb2RlbHNGdWxsKG1vZGVsSGFuZGxlLCBtb2RlbFBhdGgpKTtcclxufTtcclxuKi9cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBsb2FkTW9kZWxzT3BlbmluZ0Nvbm5lY3Rpb24obW9uZ29vc2VIbmRsOiBtb25nb29zZS5Nb25nb29zZSwgY29ubmVjdGlvblN0cmluZz8gOiBzdHJpbmcsICBtb2RlbFBhdGg/IDogc3RyaW5nKSA6IFByb21pc2U8SU1hdGNoLklNb2RlbHM+IHtcclxuICB2YXIgbW9uZ29vc2VYID0gbW9uZ29vc2VIbmRsIHx8IG1vbmdvb3NlO1xyXG4gLy8gICBpZihwcm9jZXNzLmVudi5NT05HT19SRVBMQVkpIHtcclxuIC8vICAgICAgICBtb25nb29zZVggPSBtb25nb29zZU1vY2subW9uZ29vc2VNb2NrIGFzIGFueTtcclxuIC8vICAgIH1cclxuICAgIGNvbnNvbGUubG9nKFwiIGV4cGxpY2l0IGNvbm5lY3Rpb24gc3RyaW5nIFwiICsgY29ubmVjdGlvblN0cmluZyk7XHJcbiAgICB2YXIgY29ublN0ciA9IGNvbm5lY3Rpb25TdHJpbmcgfHwgJ21vbmdvZGI6Ly9sb2NhbGhvc3QvdGVzdGRiJztcclxuICAgIHJldHVybiBNb25nb1V0aWxzLm9wZW5Nb25nb29zZShtb25nb29zZVgsIGNvbm5TdHIpLnRoZW4oXHJcbiAgICAgICAgKCk9PlxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmV0dXJuIGxvYWRNb2RlbHMobW9uZ29vc2VYLCBtb2RlbFBhdGgpO1xyXG4gICAgICAgIH1cclxuICAgICk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBleHBlY3RzIGFuIG9wZW4gY29ubmVjdGlvbiFcclxuICogQHBhcmFtIG1vbmdvb3NlXHJcbiAqIEBwYXJhbSBtb2RlbFBhdGhcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBsb2FkTW9kZWxzKG1vbmdvb3NlOiBtb25nb29zZS5Nb25nb29zZSwgbW9kZWxQYXRoIDogc3RyaW5nKSA6IFByb21pc2U8SU1hdGNoLklNb2RlbHM+IHtcclxuICAgIGlmKG1vbmdvb3NlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2V4cGVjdCBhIG1vbmdvb3NlIGhhbmRsZSB0byBiZSBwYXNzZWQnKTtcclxuICAgIH1cclxuICAgIHJldHVybiBnZXRNb25nb0hhbmRsZShtb25nb29zZSkudGhlbiggKG1vZGVsSGFuZGxlKSA9PntcclxuICAgICAgICBkZWJ1Z2xvZyhgZ290IGEgbW9uZ28gaGFuZGxlIGZvciAke21vZGVsUGF0aH1gKTtcclxuICAgICAgICByZXR1cm4gX2xvYWRNb2RlbHNGdWxsKG1vZGVsSGFuZGxlLCBtb2RlbFBhdGgpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfbG9hZE1vZGVsc0Z1bGwobW9kZWxIYW5kbGU6IElNYXRjaC5JTW9kZWxIYW5kbGVSYXcsIG1vZGVsUGF0aD86IHN0cmluZyk6IFByb21pc2U8SU1hdGNoLklNb2RlbHM+IHtcclxuICAgIHZhciBvTW9kZWw6IElNYXRjaC5JTW9kZWxzO1xyXG4gICAgbW9kZWxQYXRoID0gbW9kZWxQYXRoIHx8IGVudk1vZGVsUGF0aDtcclxuICAgIG1vZGVsSGFuZGxlID0gbW9kZWxIYW5kbGUgfHwge1xyXG4gICAgICAgIG1vbmdvb3NlOiB1bmRlZmluZWQsXHJcbiAgICAgICAgbW9kZWxEb2NzOiB7fSxcclxuICAgICAgICBtb25nb01hcHM6IHt9LFxyXG4gICAgICAgIG1vZGVsRVNjaGVtYXM6IHt9XHJcbiAgICB9O1xyXG4gICAgb01vZGVsID0ge1xyXG4gICAgICAgIG1vbmdvSGFuZGxlIDogbW9kZWxIYW5kbGUsXHJcbiAgICAgICAgZnVsbDogeyBkb21haW46IHt9IH0sXHJcbiAgICAgICAgcmF3TW9kZWxzOiB7fSxcclxuICAgICAgICBkb21haW5zOiBbXSxcclxuICAgICAgICBydWxlczogdW5kZWZpbmVkLFxyXG4gICAgICAgIGNhdGVnb3J5OiBbXSxcclxuICAgICAgICBvcGVyYXRvcnM6IHt9LFxyXG4gICAgICAgIG1SdWxlczogW10sXHJcbiAgICAgICAgc2VlblJ1bGVzOiB7fSxcclxuICAgICAgICBtZXRhOiB7IHQzOiB7fSB9XHJcbiAgICB9XHJcbiAgICB2YXIgdCA9IERhdGUubm93KCk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgICBkZWJ1Z2xvZygoKT0+ICdoZXJlIG1vZGVsIHBhdGgnICsgbW9kZWxQYXRoKTtcclxuICAgICAgICB2YXIgYSA9IENpcmN1bGFyU2VyLmxvYWQobW9kZWxQYXRoICsgJy9fY2FjaGUuanMnKTtcclxuICAgICAgICAvLyBUT0RPXHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImZvdW5kIGEgY2FjaGUgPyAgXCIgKyAhIWEpO1xyXG4gICAgICAgIC8vYSA9IHVuZGVmaW5lZDtcclxuICAgICAgICBpZiAoYSAmJiAhcHJvY2Vzcy5lbnYuTUdOTFFfTU9ERUxfTk9fRklMRUNBQ0hFKSB7XHJcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3JldHVybiBwcmVwcycgKyBtb2RlbFBhdGgpO1xyXG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIlxcbiByZXR1cm4gcHJlcGFyZWQgbW9kZWwgISFcIik7XHJcbiAgICAgICAgICAgIGlmIChwcm9jZXNzLmVudi5BQk9UX0VNQUlMX1VTRVIpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibG9hZGVkIG1vZGVscyBmcm9tIGNhY2hlIGluIFwiICsgKERhdGUubm93KCkgLSB0KSArIFwiIFwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgcmVzID0gYSBhcyBJTWF0Y2guSU1vZGVscztcclxuICAgICAgICAgICAgcmVzLm1vbmdvSGFuZGxlLm1vbmdvb3NlICA9IG1vZGVsSGFuZGxlLm1vbmdvb3NlO1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlcyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIC8vY29uc29sZS5sb2coJ2Vycm9yJyArIGUpO1xyXG4gICAgICAgIC8vIG5vIGNhY2hlIGZpbGUsXHJcbiAgICB9XHJcbiAgICAvL3ZhciBtZGxzID0gcmVhZEZpbGVBc0pTT04oJy4vJyArIG1vZGVsUGF0aCArICcvbW9kZWxzLmpzb24nKTtcclxuXHJcbiAgICB2YXIgbWRscyA9IE9iamVjdC5rZXlzKG1vZGVsSGFuZGxlLm1vZGVsRG9jcykuc29ydCgpO1xyXG4gICAgdmFyIHNlZW5Eb21haW5zID17fTtcclxuICAgIG1kbHMuZm9yRWFjaCgobW9kZWxOYW1lLGluZGV4KSA9PiB7XHJcbiAgICAgICAgdmFyIGRvbWFpbiA9IG1vZGVsSGFuZGxlLm1vZGVsRG9jc1ttb2RlbE5hbWVdLmRvbWFpbjtcclxuICAgICAgICBpZihzZWVuRG9tYWluc1tkb21haW5dKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRG9tYWluICcgKyBkb21haW4gKyAnIGFscmVhZHkgbG9hZGVkIHdoaWxlIGxvYWRpbmcgJyArIG1vZGVsTmFtZSArICc/Jyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNlZW5Eb21haW5zW2RvbWFpbl0gPSBpbmRleDtcclxuICAgIH0pXHJcbiAgICBvTW9kZWwuZG9tYWlucyA9IG1kbHMubWFwKG1vZGVsTmFtZSA9PiBtb2RlbEhhbmRsZS5tb2RlbERvY3NbbW9kZWxOYW1lXS5kb21haW4pO1xyXG4gICAgLy8gY3JlYXRlIGJpdGluZGV4IGluIG9yZGVyICFcclxuICAgIGRlYnVnbG9nKCdnb3QgZG9tYWlucyAnICsgbWRscy5qb2luKFwiXFxuXCIpKTtcclxuICAgIGRlYnVnbG9nKCdsb2FkaW5nIG1vZGVscyAnICsgbWRscy5qb2luKFwiXFxuXCIpKTtcclxuXHJcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwobWRscy5tYXAoKHNNb2RlbE5hbWUpID0+XHJcbiAgICAgICAgbG9hZE1vZGVsKG1vZGVsSGFuZGxlLCBzTW9kZWxOYW1lLCBvTW9kZWwpKVxyXG4gICAgKS50aGVuKCgpID0+IHtcclxuICAgICAgICB2YXIgbWV0YUJpdEluZGV4ID0gZ2V0RG9tYWluQml0SW5kZXgoJ21ldGEnLCBvTW9kZWwpO1xyXG4gICAgICAgIHZhciBiaXRJbmRleEFsbERvbWFpbnMgPSBnZXRBbGxEb21haW5zQml0SW5kZXgob01vZGVsKTtcclxuXHJcbiAgICAgICAgLy8gYWRkIHRoZSBkb21haW4gbWV0YSBydWxlXHJcbiAgICAgICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCB7XHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBcIm1ldGFcIixcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogXCJkb21haW5cIixcclxuICAgICAgICAgICAgdHlwZTogSU1hdGNoLkVudW1SdWxlVHlwZS5XT1JELFxyXG4gICAgICAgICAgICB3b3JkOiBcImRvbWFpblwiLFxyXG4gICAgICAgICAgICBiaXRpbmRleDogbWV0YUJpdEluZGV4LFxyXG4gICAgICAgICAgICB3b3JkVHlwZTogSU1hdGNoLldPUkRUWVBFLk1FVEEsXHJcbiAgICAgICAgICAgIGJpdFNlbnRlbmNlQW5kOiBiaXRJbmRleEFsbERvbWFpbnMsXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiAwLjk1XHJcbiAgICAgICAgfSwgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgLy8gaW5zZXJ0IHRoZSBOdW1iZXJzIHJ1bGVzXHJcbiAgICAgICAgY29uc29sZS5sb2coJyBhZGQgbnVtYmVycyBydWxlJyk7XHJcbiAgICAgICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCB7XHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBcIm51bWJlclwiLFxyXG4gICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBcIm9uZVwiLFxyXG4gICAgICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLlJFR0VYUCxcclxuICAgICAgICAgICAgcmVnZXhwIDogL14oKFxcZCspfChvbmUpfCh0d28pfCh0aHJlZSkpJC8sXHJcbiAgICAgICAgICAgIG1hdGNoSW5kZXggOiAwLFxyXG4gICAgICAgICAgICB3b3JkOiBcIjxudW1iZXI+XCIsXHJcbiAgICAgICAgICAgIGJpdGluZGV4OiBtZXRhQml0SW5kZXgsXHJcbiAgICAgICAgICAgIHdvcmRUeXBlOiBJTWF0Y2guV09SRFRZUEUuTlVNRVJJQ0FSRywgLy8gbnVtYmVyXHJcbiAgICAgICAgICAgIGJpdFNlbnRlbmNlQW5kOiBiaXRJbmRleEFsbERvbWFpbnMsXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiAwLjk1XHJcbiAgICAgICAgfSwgb01vZGVsLnNlZW5SdWxlcyk7XHJcblxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgKS50aGVuKCAoKT0+XHJcbiAgICAgICAgcmVhZEZpbGxlcnMobW9kZWxIYW5kbGUubW9uZ29vc2UsIG9Nb2RlbClcclxuICAgICkudGhlbiggKCkgPT5cclxuICAgICAgICByZWFkT3BlcmF0b3JzKG1vZGVsSGFuZGxlLm1vbmdvb3NlLCBvTW9kZWwpXHJcbiAgICApLnRoZW4oICgpID0+IHtcclxuICAgICAgICAvKlxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIGNhdGVnb3J5OiBcImZpbGxlclwiLFxyXG4gICAgICAgICAgICAgIHR5cGU6IDEsXHJcbiAgICAgICAgICAgICAgcmVnZXhwOiAvXigoc3RhcnQpfChzaG93KXwoZnJvbSl8KGluKSkkL2ksXHJcbiAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogXCJmaWxsZXJcIixcclxuICAgICAgICAgICAgICBfcmFua2luZzogMC45XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgKi9cclxuICAgICAgICBkZWJ1Z2xvZygnc2F2aW5nIGRhdGEgdG8gJyArIG1vZGVsUGF0aCk7XHJcbiAgICAgICAgb01vZGVsLm1SdWxlcyA9IG9Nb2RlbC5tUnVsZXMuc29ydChJbnB1dEZpbHRlclJ1bGVzLmNtcE1SdWxlKTtcclxuICAgICAgICBhZGRDbG9zZUV4YWN0UmFuZ2VSdWxlcyhvTW9kZWwubVJ1bGVzLCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgICAgICBvTW9kZWwubVJ1bGVzID0gb01vZGVsLm1SdWxlcy5zb3J0KElucHV0RmlsdGVyUnVsZXMuY21wTVJ1bGUpO1xyXG4gICAgICAgIG9Nb2RlbC5tUnVsZXMuc29ydChJbnB1dEZpbHRlclJ1bGVzLmNtcE1SdWxlKTtcclxuICAgICAgICAvL2ZzLndyaXRlRmlsZVN5bmMoXCJwb3N0X3NvcnRcIiwgSlNPTi5zdHJpbmdpZnkob01vZGVsLm1SdWxlcyx1bmRlZmluZWQsMikpO1xyXG5cclxuICAgICAgICBmb3JjZUdDKCk7XHJcbiAgICAgICAgb01vZGVsLnJ1bGVzID0gc3BsaXRSdWxlcyhvTW9kZWwubVJ1bGVzKTtcclxuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKFwidGVzdDF4Lmpzb25cIiwgSlNPTi5zdHJpbmdpZnkob01vZGVsLnJ1bGVzLHVuZGVmaW5lZCwyKSk7XHJcbiAgICAgICAgZm9yY2VHQygpO1xyXG4gICAgICAgIGRlbGV0ZSBvTW9kZWwuc2VlblJ1bGVzO1xyXG4gICAgICAgIGRlYnVnbG9nKCdzYXZpbmcnKTtcclxuICAgICAgICBmb3JjZUdDKCk7XHJcbiAgICAgICAgdmFyIG9Nb2RlbFNlciA9IE9iamVjdC5hc3NpZ24oe30sIG9Nb2RlbCk7XHJcbiAgICAgICAgb01vZGVsU2VyLm1vbmdvSGFuZGxlID0gT2JqZWN0LmFzc2lnbih7fSwgb01vZGVsLm1vbmdvSGFuZGxlKTtcclxuICAgICAgICBkZWxldGUgb01vZGVsU2VyLm1vbmdvSGFuZGxlLm1vbmdvb3NlO1xyXG4gICAgICAgIENpcmN1bGFyU2VyLnNhdmUobW9kZWxQYXRoICsgJy9fY2FjaGUuanMnLCBvTW9kZWxTZXIpO1xyXG4gICAgICAgIGZvcmNlR0MoKTtcclxuICAgICAgICBpZiAocHJvY2Vzcy5lbnYuQUJPVF9FTUFJTF9VU0VSKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibG9hZGVkIG1vZGVscyBieSBjYWxjdWxhdGlvbiBpbiBcIiArIChEYXRlLm5vdygpIC0gdCkgKyBcIiBcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciByZXMgPSBvTW9kZWw7XHJcbiAgICAgICAgLy8gKE9iamVjdCBhcyBhbnkpLmFzc2lnbihtb2RlbEhhbmRsZSwgeyBtb2RlbDogb01vZGVsIH0pIGFzIElNYXRjaC5JTW9kZWxIYW5kbGU7XHJcbiAgICAgICAgcmV0dXJuIHJlcztcclxuICAgIH1cclxuICAgICkuY2F0Y2goIChlcnIpID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhlcnIgKyAnICcgKyBlcnIuc3RhY2spO1xyXG4gICAgICAgIHByb2Nlc3MuZXhpdCgtMSk7XHJcbiAgICB9KSBhcyBQcm9taXNlPElNYXRjaC5JTW9kZWxzPjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNvcnRDYXRlZ29yaWVzQnlJbXBvcnRhbmNlKG1hcDogeyBba2V5OiBzdHJpbmddOiBJTWF0Y2guSUNhdGVnb3J5RGVzYyB9LCBjYXRzOiBzdHJpbmdbXSk6IHN0cmluZ1tdIHtcclxuICAgIHZhciByZXMgPSBjYXRzLnNsaWNlKDApO1xyXG4gICAgcmVzLnNvcnQocmFua0NhdGVnb3J5QnlJbXBvcnRhbmNlLmJpbmQodW5kZWZpbmVkLCBtYXApKTtcclxuICAgIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByYW5rQ2F0ZWdvcnlCeUltcG9ydGFuY2UobWFwOiB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5JQ2F0ZWdvcnlEZXNjIH0sIGNhdGE6IHN0cmluZywgY2F0Yjogc3RyaW5nKTogbnVtYmVyIHtcclxuICAgIHZhciBjYXRBRGVzYyA9IG1hcFtjYXRhXTtcclxuICAgIHZhciBjYXRCRGVzYyA9IG1hcFtjYXRiXTtcclxuICAgIGlmIChjYXRhID09PSBjYXRiKSB7XHJcbiAgICAgICAgcmV0dXJuIDA7XHJcbiAgICB9XHJcbiAgICAvLyBpZiBhIGlzIGJlZm9yZSBiLCByZXR1cm4gLTFcclxuICAgIGlmIChjYXRBRGVzYyAmJiAhY2F0QkRlc2MpIHtcclxuICAgICAgICByZXR1cm4gLTE7XHJcbiAgICB9XHJcbiAgICBpZiAoIWNhdEFEZXNjICYmIGNhdEJEZXNjKSB7XHJcbiAgICAgICAgcmV0dXJuICsxO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBwcmlvQSA9IChjYXRBRGVzYyAmJiBjYXRBRGVzYy5pbXBvcnRhbmNlKSB8fCA5OTtcclxuICAgIHZhciBwcmlvQiA9IChjYXRCRGVzYyAmJiBjYXRCRGVzYy5pbXBvcnRhbmNlKSB8fCA5OTtcclxuICAgIC8vIGxvd2VyIHByaW8gZ29lcyB0byBmcm9udFxyXG4gICAgdmFyIHIgPSBwcmlvQSAtIHByaW9CO1xyXG4gICAgaWYgKHIpIHtcclxuICAgICAgICByZXR1cm4gcjtcclxuICAgIH1cclxuICAgIHJldHVybiBjYXRhLmxvY2FsZUNvbXBhcmUoY2F0Yik7XHJcbn1cclxuXHJcbmNvbnN0IE1ldGFGID0gTWV0YS5nZXRNZXRhRmFjdG9yeSgpO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldE9wZXJhdG9yKG1kbDogSU1hdGNoLklNb2RlbHMsIG9wZXJhdG9yOiBzdHJpbmcpOiBJTWF0Y2guSU9wZXJhdG9yIHtcclxuICAgIHJldHVybiBtZGwub3BlcmF0b3JzW29wZXJhdG9yXTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFJlc3VsdEFzQXJyYXkobWRsOiBJTWF0Y2guSU1vZGVscywgYTogTWV0YS5JTWV0YSwgcmVsOiBNZXRhLklNZXRhKTogTWV0YS5JTWV0YVtdIHtcclxuICAgIGlmIChyZWwudG9UeXBlKCkgIT09ICdyZWxhdGlvbicpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJleHBlY3QgcmVsYXRpb24gYXMgMm5kIGFyZ1wiKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcmVzID0gbWRsLm1ldGEudDNbYS50b0Z1bGxTdHJpbmcoKV0gJiZcclxuICAgICAgICBtZGwubWV0YS50M1thLnRvRnVsbFN0cmluZygpXVtyZWwudG9GdWxsU3RyaW5nKCldO1xyXG4gICAgaWYgKCFyZXMpIHtcclxuICAgICAgICByZXR1cm4gW107XHJcbiAgICB9XHJcbiAgICByZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMocmVzKS5zb3J0KCkubWFwKE1ldGFGLnBhcnNlSU1ldGEpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tEb21haW5QcmVzZW50KHRoZU1vZGVsOiBJTWF0Y2guSU1vZGVscywgZG9tYWluOiBzdHJpbmcpIHtcclxuICAgIGlmICh0aGVNb2RlbC5kb21haW5zLmluZGV4T2YoZG9tYWluKSA8IDApIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEb21haW4gXFxcIlwiICsgZG9tYWluICsgXCJcXFwiIG5vdCBwYXJ0IG9mIG1vZGVsXCIpO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2hvd1VSSUNhdGVnb3JpZXNGb3JEb21haW4odGhlTW9kZWwgOiBJTWF0Y2guSU1vZGVscywgZG9tYWluIDogc3RyaW5nKSA6IHN0cmluZ1tdIHtcclxuICAgIGNoZWNrRG9tYWluUHJlc2VudCh0aGVNb2RlbCwgZG9tYWluKTtcclxuICAgIHZhciBtb2RlbE5hbWUgPSBnZXRNb2RlbE5hbWVGb3JEb21haW4odGhlTW9kZWwubW9uZ29IYW5kbGUsZG9tYWluKTtcclxuICAgIHZhciBhbGxjYXRzID0gZ2V0UmVzdWx0QXNBcnJheSh0aGVNb2RlbCwgTWV0YUYuRG9tYWluKGRvbWFpbiksIE1ldGFGLlJlbGF0aW9uKE1ldGEuUkVMQVRJT05faGFzQ2F0ZWdvcnkpKTtcclxuICAgIHZhciBkb2MgPSB0aGVNb2RlbC5tb25nb0hhbmRsZS5tb2RlbERvY3NbbW9kZWxOYW1lXTtcclxuICAgIHZhciByZXMgPSBkb2MuX2NhdGVnb3JpZXMuZmlsdGVyKCBjYXQgPT4gY2F0LnNob3dVUkkgKS5tYXAoY2F0ID0+IGNhdC5jYXRlZ29yeSk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2hvd1VSSVJhbmtDYXRlZ29yaWVzRm9yRG9tYWluKHRoZU1vZGVsIDogSU1hdGNoLklNb2RlbHMsIGRvbWFpbiA6IHN0cmluZykgOiBzdHJpbmdbXSB7XHJcbiAgICBjaGVja0RvbWFpblByZXNlbnQodGhlTW9kZWwsIGRvbWFpbik7XHJcbiAgICB2YXIgbW9kZWxOYW1lID0gZ2V0TW9kZWxOYW1lRm9yRG9tYWluKHRoZU1vZGVsLm1vbmdvSGFuZGxlLGRvbWFpbik7XHJcbiAgICB2YXIgYWxsY2F0cyA9IGdldFJlc3VsdEFzQXJyYXkodGhlTW9kZWwsIE1ldGFGLkRvbWFpbihkb21haW4pLCBNZXRhRi5SZWxhdGlvbihNZXRhLlJFTEFUSU9OX2hhc0NhdGVnb3J5KSk7XHJcbiAgICB2YXIgZG9jID0gdGhlTW9kZWwubW9uZ29IYW5kbGUubW9kZWxEb2NzW21vZGVsTmFtZV07XHJcbiAgICB2YXIgcmVzID0gZG9jLl9jYXRlZ29yaWVzLmZpbHRlciggY2F0ID0+IGNhdC5zaG93VVJJUmFuayApLm1hcChjYXQgPT4gY2F0LmNhdGVnb3J5KTtcclxuICAgIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRDYXRlZ29yaWVzRm9yRG9tYWluKHRoZU1vZGVsOiBJTWF0Y2guSU1vZGVscywgZG9tYWluOiBzdHJpbmcpOiBzdHJpbmdbXSB7XHJcbiAgICBjaGVja0RvbWFpblByZXNlbnQodGhlTW9kZWwsIGRvbWFpbik7XHJcbiAgICB2YXIgcmVzID0gZ2V0UmVzdWx0QXNBcnJheSh0aGVNb2RlbCwgTWV0YUYuRG9tYWluKGRvbWFpbiksIE1ldGFGLlJlbGF0aW9uKE1ldGEuUkVMQVRJT05faGFzQ2F0ZWdvcnkpKTtcclxuICAgIHJldHVybiBNZXRhLmdldFN0cmluZ0FycmF5KHJlcyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRUYWJsZUNvbHVtbnModGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzLCBkb21haW46IHN0cmluZyk6IHN0cmluZ1tdIHtcclxuICAgIGNoZWNrRG9tYWluUHJlc2VudCh0aGVNb2RlbCwgZG9tYWluKTtcclxuICAgIHJldHVybiB0aGVNb2RlbC5yYXdNb2RlbHNbZG9tYWluXS5jb2x1bW5zLnNsaWNlKDApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmb3JjZUdDKCkge1xyXG4gICAgaWYgKGdsb2JhbCAmJiBnbG9iYWwuZ2MpIHtcclxuICAgICAgICBnbG9iYWwuZ2MoKTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFJldHVybiBhbGwgY2F0ZWdvcmllcyBvZiBhIGRvbWFpbiB3aGljaCBjYW4gYXBwZWFyIG9uIGEgd29yZCxcclxuICogdGhlc2UgYXJlIHR5cGljYWxseSB0aGUgd29yZGluZGV4IGRvbWFpbnMgKyBlbnRyaWVzIGdlbmVyYXRlZCBieSBnZW5lcmljIHJ1bGVzXHJcbiAqXHJcbiAqIFRoZSBjdXJyZW50IGltcGxlbWVudGF0aW9uIGlzIGEgc2ltcGxpZmljYXRpb25cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRQb3RlbnRpYWxXb3JkQ2F0ZWdvcmllc0ZvckRvbWFpbih0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMsIGRvbWFpbjogc3RyaW5nKTogc3RyaW5nW10ge1xyXG4gICAgLy8gdGhpcyBpcyBhIHNpbXBsaWZpZWQgdmVyc2lvblxyXG4gICAgcmV0dXJuIGdldENhdGVnb3JpZXNGb3JEb21haW4odGhlTW9kZWwsIGRvbWFpbik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXREb21haW5zRm9yQ2F0ZWdvcnkodGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzLCBjYXRlZ29yeTogc3RyaW5nKTogc3RyaW5nW10ge1xyXG4gICAgaWYgKHRoZU1vZGVsLmNhdGVnb3J5LmluZGV4T2YoY2F0ZWdvcnkpIDwgMCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhdGVnb3J5IFxcXCJcIiArIGNhdGVnb3J5ICsgXCJcXFwiIG5vdCBwYXJ0IG9mIG1vZGVsXCIpO1xyXG4gICAgfVxyXG4gICAgdmFyIHJlcyA9IGdldFJlc3VsdEFzQXJyYXkodGhlTW9kZWwsIE1ldGFGLkNhdGVnb3J5KGNhdGVnb3J5KSwgTWV0YUYuUmVsYXRpb24oTWV0YS5SRUxBVElPTl9pc0NhdGVnb3J5T2YpKTtcclxuICAgIHJldHVybiBNZXRhLmdldFN0cmluZ0FycmF5KHJlcyk7XHJcbn1cclxuXHJcbi8qXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRBbGxSZWNvcmRDYXRlZ29yaWVzRm9yVGFyZ2V0Q2F0ZWdvcnkobW9kZWw6IElNYXRjaC5JTW9kZWxzLCBjYXRlZ29yeTogc3RyaW5nLCB3b3Jkc29ubHk6IGJvb2xlYW4pOiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfSB7XHJcbiAgICB2YXIgcmVzID0ge307XHJcbiAgICAvL1xyXG4gICAgdmFyIGZuID0gd29yZHNvbmx5ID8gZ2V0UG90ZW50aWFsV29yZENhdGVnb3JpZXNGb3JEb21haW4gOiBnZXRDYXRlZ29yaWVzRm9yRG9tYWluO1xyXG4gICAgdmFyIGRvbWFpbnMgPSBnZXREb21haW5zRm9yQ2F0ZWdvcnkobW9kZWwsIGNhdGVnb3J5KTtcclxuICAgIGRvbWFpbnMuZm9yRWFjaChmdW5jdGlvbiAoZG9tYWluKSB7XHJcbiAgICAgICAgZm4obW9kZWwsIGRvbWFpbikuZm9yRWFjaChmdW5jdGlvbiAod29yZGNhdCkge1xyXG4gICAgICAgICAgICByZXNbd29yZGNhdF0gPSB0cnVlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWxsUmVjb3JkQ2F0ZWdvcmllc0ZvclRhcmdldENhdGVnb3JpZXMobW9kZWw6IElNYXRjaC5JTW9kZWxzLCBjYXRlZ29yaWVzOiBzdHJpbmdbXSwgd29yZHNvbmx5OiBib29sZWFuKTogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0ge1xyXG4gICAgdmFyIHJlcyA9IHt9O1xyXG4gICAgLy9cclxuICAgIHZhciBmbiA9IHdvcmRzb25seSA/IGdldFBvdGVudGlhbFdvcmRDYXRlZ29yaWVzRm9yRG9tYWluIDogZ2V0Q2F0ZWdvcmllc0ZvckRvbWFpbjtcclxuICAgIHZhciBkb21haW5zID0gdW5kZWZpbmVkO1xyXG4gICAgY2F0ZWdvcmllcy5mb3JFYWNoKGZ1bmN0aW9uIChjYXRlZ29yeSkge1xyXG4gICAgICAgIHZhciBjYXRkb21haW5zID0gZ2V0RG9tYWluc0ZvckNhdGVnb3J5KG1vZGVsLCBjYXRlZ29yeSlcclxuICAgICAgICBpZiAoIWRvbWFpbnMpIHtcclxuICAgICAgICAgICAgZG9tYWlucyA9IGNhdGRvbWFpbnM7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZG9tYWlucyA9IF8uaW50ZXJzZWN0aW9uKGRvbWFpbnMsIGNhdGRvbWFpbnMpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgaWYgKGRvbWFpbnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYXRlZ29yaWVzICcgKyBVdGlscy5saXN0VG9RdW90ZWRDb21tYUFuZChjYXRlZ29yaWVzKSArICcgaGF2ZSBubyBjb21tb24gZG9tYWluLicpXHJcbiAgICB9XHJcbiAgICBkb21haW5zLmZvckVhY2goZnVuY3Rpb24gKGRvbWFpbikge1xyXG4gICAgICAgIGZuKG1vZGVsLCBkb21haW4pLmZvckVhY2goZnVuY3Rpb24gKHdvcmRjYXQpIHtcclxuICAgICAgICAgICAgcmVzW3dvcmRjYXRdID0gdHJ1ZTtcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG4gICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xyXG4gICAgcmV0dXJuIHJlcztcclxufVxyXG4qL1xyXG5cclxuLyoqXHJcbiAqIGdpdmVuYSAgc2V0ICBvZiBjYXRlZ29yaWVzLCByZXR1cm4gYSBzdHJ1Y3R1cmVcclxuICpcclxuICpcclxuICogeyBkb21haW5zIDogW1wiRE9NQUlOMVwiLCBcIkRPTUFJTjJcIl0sXHJcbiAqICAgY2F0ZWdvcnlTZXQgOiB7ICAgY2F0MSA6IHRydWUsIGNhdDIgOiB0cnVlLCAuLi59XHJcbiAqIH1cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXREb21haW5DYXRlZ29yeUZpbHRlckZvclRhcmdldENhdGVnb3JpZXMobW9kZWw6IElNYXRjaC5JTW9kZWxzLCBjYXRlZ29yaWVzOiBzdHJpbmdbXSwgd29yZHNvbmx5OiBib29sZWFuKTogSU1hdGNoLklEb21haW5DYXRlZ29yeUZpbHRlciB7XHJcbiAgICB2YXIgcmVzID0ge307XHJcbiAgICAvL1xyXG4gICAgdmFyIGZuID0gd29yZHNvbmx5ID8gZ2V0UG90ZW50aWFsV29yZENhdGVnb3JpZXNGb3JEb21haW4gOiBnZXRDYXRlZ29yaWVzRm9yRG9tYWluO1xyXG4gICAgdmFyIGRvbWFpbnMgPSB1bmRlZmluZWQgYXMgc3RyaW5nW107XHJcbiAgICBjYXRlZ29yaWVzLmZvckVhY2goZnVuY3Rpb24gKGNhdGVnb3J5KSB7XHJcbiAgICAgICAgdmFyIGNhdGRvbWFpbnMgPSBnZXREb21haW5zRm9yQ2F0ZWdvcnkobW9kZWwsIGNhdGVnb3J5KVxyXG4gICAgICAgIGlmICghZG9tYWlucykge1xyXG4gICAgICAgICAgICBkb21haW5zID0gY2F0ZG9tYWlucztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBkb21haW5zID0gXy5pbnRlcnNlY3Rpb24oZG9tYWlucywgY2F0ZG9tYWlucyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICBpZiAoZG9tYWlucy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NhdGVnb3JpZXMgJyArIFV0aWxzLmxpc3RUb1F1b3RlZENvbW1hQW5kKGNhdGVnb3JpZXMpICsgJyBoYXZlIG5vIGNvbW1vbiBkb21haW4uJylcclxuICAgIH1cclxuICAgIGRvbWFpbnMuZm9yRWFjaChmdW5jdGlvbiAoZG9tYWluKSB7XHJcbiAgICAgICAgZm4obW9kZWwsIGRvbWFpbikuZm9yRWFjaChmdW5jdGlvbiAod29yZGNhdCkge1xyXG4gICAgICAgICAgICByZXNbd29yZGNhdF0gPSB0cnVlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGRvbWFpbnM6IGRvbWFpbnMsXHJcbiAgICAgICAgY2F0ZWdvcnlTZXQ6IHJlc1xyXG4gICAgfTtcclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXREb21haW5DYXRlZ29yeUZpbHRlckZvclRhcmdldENhdGVnb3J5KG1vZGVsOiBJTWF0Y2guSU1vZGVscywgY2F0ZWdvcnk6IHN0cmluZywgd29yZHNvbmx5OiBib29sZWFuKTogSU1hdGNoLklEb21haW5DYXRlZ29yeUZpbHRlciB7XHJcbiAgICByZXR1cm4gZ2V0RG9tYWluQ2F0ZWdvcnlGaWx0ZXJGb3JUYXJnZXRDYXRlZ29yaWVzKG1vZGVsLCBbY2F0ZWdvcnldLCB3b3Jkc29ubHkpO1xyXG59XHJcblxyXG5cclxuIl19
