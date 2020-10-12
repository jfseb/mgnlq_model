"use strict";
/**
 * Functionality managing the match models
 *
 * @file
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDomainCategoryFilterForTargetCategory = exports.getDomainCategoryFilterForTargetCategories = exports.getDomainsForCategory = exports.getPotentialWordCategoriesForDomain = exports.getTableColumns = exports.getCategoriesForDomain = exports.getShowURIRankCategoriesForDomain = exports.getShowURICategoriesForDomain = exports.checkDomainPresent = exports.getResultAsArray = exports.getOperator = exports.rankCategoryByImportance = exports.sortCategoriesByImportance = exports._loadModelsFull = exports.loadModels = exports.loadModelsOpeningConnection = exports.releaseModel = exports.readOperators = exports.readFillers = exports.addCloseExactRangeRules = exports.addRangeRulesUnlessPresent = exports.findNextLen = exports.sortFlatRecords = exports.splitRules = exports.getDomainsForBitField = exports.getDomainBitIndexSafe = exports.getDomainBitIndex = exports.getAllDomainsBitIndex = exports.loadModel = exports.hasRuleWithFact = exports.readFileAsJSON = exports.addBestSplit = exports.getCategoryRec = exports.getDistinctValues = exports.getExpandedRecordsForCategory = exports.getExpandedRecordsFull = exports.checkModelMongoMap = exports.filterRemapCategories = exports.getModelNameForDomain = exports.getModelForDomain = exports.getModelForModelName = exports.getMongooseModelNameForDomain = exports.getMongoCollectionNameForDomain = exports.getFactSynonyms = exports.getMongoHandle = exports.propagateTypeToModelDoc = exports.cmpTools = void 0;
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
function propagateTypeToModelDoc(modelDoc, eschema) {
    // props { "element_symbol":{"type":"String","trim":true,"_m_category":"element symbol","{
    modelDoc._categories.forEach(cat => {
        var propertyName = MongoMap.makeCanonicPropertyName(cat.category);
        var prop = MongoMap.findEschemaPropForCategory(eschema.props, cat.category);
        if (!prop) {
            if (modelDoc.modelname !== "metamXXXodels") {
                var err = "Unable to find property " + propertyName + " for category " + cat.category + " in model "
                    + modelDoc.modelname
                    + "; valid props are:\"" + Object.getOwnPropertyNames(eschema.props).join(",\n") + "\""
                    + " " + JSON.stringify(eschema.props);
                console.log(err);
                debuglog(err);
                throw new Error(err);
            }
        }
        else {
            debuglog(' augmenting type for \"' + cat.category + "(" + propertyName + ")\" with " + JSON.stringify(prop.type));
            cat.type = prop.type; // this may be ["String"] for an array type!
        }
    });
}
exports.propagateTypeToModelDoc = propagateTypeToModelDoc;
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
                propagateTypeToModelDoc(modelDoc, extendedSchema);
                if (modelname == "iupacs") {
                    debuglog(' modeldocs is ');
                    debuglog(' here ' + JSON.stringify(modelDoc));
                    debuglog(' here ' + JSON.stringify(extendedSchema));
                    console.log(' modelDocs is ' + JSON.stringify(modelDoc));
                    console.log('*** esschema is ' + JSON.stringify(extendedSchema));
                }
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
function assureDirExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}
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
    // we want to ament the type!
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
        process.stdout.on('drain', function () {
            process.exit(-1);
        });
        //process.exit(-1);
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
        console.log('created dir1 ' + modelPath);
        delete oModelSer.mongoHandle.mongoose;
        try {
            assureDirExists(modelPath);
            console.log('created dir ' + modelPath);
            CircularSer.save(modelPath + '/_cache.js', oModelSer);
            forceGC();
            if (process.env.ABOT_EMAIL_USER) {
                console.log("loaded models by calculation in " + (Date.now() - t) + " ");
            }
            var res = oModel;
            // (Object as any).assign(modelHandle, { model: oModel }) as IMatch.IModelHandle;
            return res;
        }
        catch (err) {
            debuglog("" + err);
            console.log('err ' + err);
            console.log(err + ' ' + err.stack);
            process.stdout.on('drain', function () {
                process.exit(-1);
            });
            throw new Error(' ' + err + ' ' + err.stack);
        }
    }).catch((err) => {
        debuglog("" + err);
        console.log('err ' + err);
        console.log(err + ' ' + err.stack);
        process.stdout.on('drain', function () {
            process.exit(-1);
        });
        throw new Error(' ' + err + ' ' + err.stack);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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TyxFQUFFLE9BQU87UUFDaEIsV0FBVyxFQUFFLEdBQUc7S0FDbkIsQ0FBQztBQUNOLENBQUM7QUExQkQsZ0dBMEJDO0FBR0QsU0FBZ0Isd0NBQXdDLENBQUMsS0FBcUIsRUFBRSxRQUFnQixFQUFFLFNBQWtCO0lBQ2hILE9BQU8sMENBQTBDLENBQUMsS0FBSyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDcEYsQ0FBQztBQUZELDRGQUVDIiwiZmlsZSI6Im1vZGVsL21vZGVsLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEZ1bmN0aW9uYWxpdHkgbWFuYWdpbmcgdGhlIG1hdGNoIG1vZGVsc1xyXG4gKlxyXG4gKiBAZmlsZVxyXG4gKi9cclxuXHJcbi8vaW1wb3J0ICogYXMgaW50ZiBmcm9tICdjb25zdGFudHMnO1xyXG5pbXBvcnQgKiBhcyBkZWJ1Z2YgZnJvbSAnZGVidWdmJztcclxuXHJcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnZignbW9kZWwnKTtcclxuXHJcbi8vIHRoZSBoYXJkY29kZWQgZG9tYWluIG1ldGFtb2RlbCFcclxuY29uc3QgRE9NQUlOX01FVEFNT0RFTCA9ICdtZXRhbW9kZWwnO1xyXG5cclxuXHJcbi8vY29uc3QgbG9hZGxvZyA9IGxvZ2dlci5sb2dnZXIoJ21vZGVsbG9hZCcsICcnKTtcclxuXHJcbmltcG9ydCAqICBhcyBJTWF0Y2ggZnJvbSAnLi4vbWF0Y2gvaWZtYXRjaCc7XHJcbmltcG9ydCAqIGFzIElucHV0RmlsdGVyUnVsZXMgZnJvbSAnLi4vbWF0Y2gvcnVsZSc7XHJcbi8vaW1wb3J0ICogYXMgVG9vbHMgZnJvbSAnLi4vbWF0Y2gvdG9vbHMnO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCAqIGFzIE1ldGEgZnJvbSAnLi9tZXRhJztcclxuaW1wb3J0ICogYXMgVXRpbHMgZnJvbSAnYWJvdF91dGlscyc7XHJcbmltcG9ydCAqIGFzIENpcmN1bGFyU2VyIGZyb20gJ2Fib3RfdXRpbHMnO1xyXG5pbXBvcnQgKiBhcyBEaXN0YW5jZSBmcm9tICdhYm90X3N0cmluZ2Rpc3QnO1xyXG5pbXBvcnQgKiBhcyBwcm9jZXNzIGZyb20gJ3Byb2Nlc3MnO1xyXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XHJcblxyXG5pbXBvcnQgKiBhcyBNb25nb1V0aWxzIGZyb20gJy4uL3V0aWxzL21vbmdvJztcclxuXHJcbmltcG9ydCAqIGFzIG1vbmdvb3NlIGZyb20gJ21vbmdvb3NlJztcclxuaW1wb3J0ICogYXMgSVNjaGVtYSBmcm9tICcuLi9tb2RlbGxvYWQvc2NoZW1hbG9hZCc7XHJcbmltcG9ydCAqIGFzIFNjaGVtYWxvYWQgZnJvbSAnLi4vbW9kZWxsb2FkL3NjaGVtYWxvYWQnO1xyXG5pbXBvcnQgKiBhcyBNb25nb01hcCBmcm9tICcuL21vbmdvbWFwJztcclxuXHJcbi8qKlxyXG4gKiB0aGUgbW9kZWwgcGF0aCwgbWF5IGJlIGNvbnRyb2xsZWQgdmlhIGVudmlyb25tZW50IHZhcmlhYmxlXHJcbiAqL1xyXG52YXIgZW52TW9kZWxQYXRoID0gcHJvY2Vzcy5lbnZbXCJBQk9UX01PREVMUEFUSFwiXSB8fCBcIm5vZGVfbW9kdWxlcy9tZ25scV90ZXN0bW9kZWwvdGVzdG1vZGVsXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNtcFRvb2xzKGE6IElNYXRjaC5JVG9vbCwgYjogSU1hdGNoLklUb29sKSB7XHJcbiAgICByZXR1cm4gYS5uYW1lLmxvY2FsZUNvbXBhcmUoYi5uYW1lKTtcclxufVxyXG5cclxudHlwZSBJTW9kZWwgPSBJTWF0Y2guSU1vZGVsO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHByb3BhZ2F0ZVR5cGVUb01vZGVsRG9jKCBtb2RlbERvYyA6IElGTW9kZWwuSU1vZGVsRG9jLCBlc2NoZW1hIDogSUZNb2RlbC5JRXh0ZW5kZWRTY2hlbWEgKSB7XHJcbiAgICAvLyBwcm9wcyB7IFwiZWxlbWVudF9zeW1ib2xcIjp7XCJ0eXBlXCI6XCJTdHJpbmdcIixcInRyaW1cIjp0cnVlLFwiX21fY2F0ZWdvcnlcIjpcImVsZW1lbnQgc3ltYm9sXCIsXCJ7XHJcbiAgICBtb2RlbERvYy5fY2F0ZWdvcmllcy5mb3JFYWNoKCBjYXQgPT4ge1xyXG4gICAgICAgIHZhciBwcm9wZXJ0eU5hbWUgPSBNb25nb01hcC5tYWtlQ2Fub25pY1Byb3BlcnR5TmFtZShjYXQuY2F0ZWdvcnkpOyBcclxuICAgICAgICB2YXIgcHJvcCA9IE1vbmdvTWFwLmZpbmRFc2NoZW1hUHJvcEZvckNhdGVnb3J5KGVzY2hlbWEucHJvcHMsIGNhdC5jYXRlZ29yeSk7XHJcbiAgICAgICAgaWYgKCAhcHJvcCkge1xyXG4gICAgICAgICAgICBpZiggbW9kZWxEb2MubW9kZWxuYW1lICE9PSBcIm1ldGFtWFhYb2RlbHNcIikge1xyXG4gICAgICAgICAgICAgICAgdmFyIGVyciA9IFxyXG4gICAgICAgICAgICAgICBcIlVuYWJsZSB0byBmaW5kIHByb3BlcnR5IFwiICsgcHJvcGVydHlOYW1lICsgXCIgZm9yIGNhdGVnb3J5IFwiICsgY2F0LmNhdGVnb3J5ICsgXCIgaW4gbW9kZWwgXCIgXHJcbiAgICAgICAgICAgICAgICArIG1vZGVsRG9jLm1vZGVsbmFtZVxyXG4gICAgICAgICAgICAgICAgKyBcIjsgdmFsaWQgcHJvcHMgYXJlOlxcXCJcIiArIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGVzY2hlbWEucHJvcHMpLmpvaW4oXCIsXFxuXCIpICsgXCJcXFwiXCIgXHJcbiAgICAgICAgICAgICAgICAgKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KGVzY2hlbWEucHJvcHMpO1xyXG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XHJcbiAgICAgICAgICAgICAgICAgZGVidWdsb2coZXJyKTtcclxuICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGRlYnVnbG9nKCcgYXVnbWVudGluZyB0eXBlIGZvciBcXFwiJyArIGNhdC5jYXRlZ29yeSArIFwiKFwiICsgcHJvcGVydHlOYW1lICsgXCIpXFxcIiB3aXRoIFwiICsgSlNPTi5zdHJpbmdpZnkocHJvcC50eXBlKSk7XHJcbiAgICAgICAgICAgIGNhdC50eXBlID0gcHJvcC50eXBlOyAvLyB0aGlzIG1heSBiZSBbXCJTdHJpbmdcIl0gZm9yIGFuIGFycmF5IHR5cGUhXHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiByZXR1cm5zIHdoZW4gYWxsIG1vZGVscyBhcmUgbG9hZGVkIGFuZCBhbGwgbW9kZWxkb2NzIGFyZSBtYWRlXHJcbiAqIEBwYXJhbSBtb25nb29zZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldE1vbmdvSGFuZGxlKG1vbmdvb3NlOiBtb25nb29zZS5Nb25nb29zZSk6IFByb21pc2U8SU1hdGNoLklNb2RlbEhhbmRsZVJhdz4ge1xyXG4gICAgdmFyIHJlcyA9IHtcclxuICAgICAgICBtb25nb29zZTogbW9uZ29vc2UsXHJcbiAgICAgICAgbW9kZWxEb2NzOiB7fSxcclxuICAgICAgICBtb2RlbEVTY2hlbWFzOiB7fSxcclxuICAgICAgICBtb25nb01hcHM6IHt9XHJcbiAgICB9IGFzIElNYXRjaC5JTW9kZWxIYW5kbGVSYXc7XHJcbiAgICB2YXIgbW9kZWxFUyA9IFNjaGVtYWxvYWQuZ2V0RXh0ZW5kZWRTY2hlbWFNb2RlbChtb25nb29zZSk7XHJcbiAgICByZXR1cm4gbW9kZWxFUy5kaXN0aW5jdCgnbW9kZWxuYW1lJykudGhlbigobW9kZWxuYW1lcykgPT4ge1xyXG4gICAgICAgIGRlYnVnbG9nKCgpID0+ICdoZXJlIGRpc3RpbmN0IG1vZGVsbmFtZXMgJyArIEpTT04uc3RyaW5naWZ5KG1vZGVsbmFtZXMpKTtcclxuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwobW9kZWxuYW1lcy5tYXAoZnVuY3Rpb24gKG1vZGVsbmFtZSkge1xyXG4gICAgICAgICAgICBkZWJ1Z2xvZygoKSA9PiAnY3JlYXRpbmcgdHJpcGVsIGZvciAnICsgbW9kZWxuYW1lKTtcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFtTY2hlbWFsb2FkLmdldEV4dGVuZFNjaGVtYURvY0Zyb21EQihtb25nb29zZSwgbW9kZWxuYW1lKSxcclxuICAgICAgICAgICAgU2NoZW1hbG9hZC5tYWtlTW9kZWxGcm9tREIobW9uZ29vc2UsIG1vZGVsbmFtZSksXHJcbiAgICAgICAgICAgIFNjaGVtYWxvYWQuZ2V0TW9kZWxEb2NGcm9tREIobW9uZ29vc2UsIG1vZGVsbmFtZSldKS50aGVuKFxyXG4gICAgICAgICAgICAgICAgKHZhbHVlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coKCkgPT4gJ2F0dGVtcHRpbmcgdG8gbG9hZCAnICsgbW9kZWxuYW1lICsgJyB0byBjcmVhdGUgbW9uZ29tYXAnKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgW2V4dGVuZGVkU2NoZW1hLCBtb2RlbCwgbW9kZWxEb2NdID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLm1vZGVsRVNjaGVtYXNbbW9kZWxuYW1lXSA9IGV4dGVuZGVkU2NoZW1hO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5tb2RlbERvY3NbbW9kZWxuYW1lXSA9IG1vZGVsRG9jO1xyXG4gICAgICAgICAgICAgICAgICAgIHByb3BhZ2F0ZVR5cGVUb01vZGVsRG9jKG1vZGVsRG9jLGV4dGVuZGVkU2NoZW1hKTtcclxuICAgICAgICAgICAgICAgICAgICAgaWYgKCBtb2RlbG5hbWUgPT0gXCJpdXBhY3NcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKCcgbW9kZWxkb2NzIGlzICcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKCcgaGVyZSAnICsgSlNPTi5zdHJpbmdpZnkobW9kZWxEb2MpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnIGhlcmUgJyArIEpTT04uc3RyaW5naWZ5KGV4dGVuZGVkU2NoZW1hKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJyBtb2RlbERvY3MgaXMgJyArIEpTT04uc3RyaW5naWZ5KG1vZGVsRG9jKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJyoqKiBlc3NjaGVtYSBpcyAnICsgSlNPTi5zdHJpbmdpZnkoZXh0ZW5kZWRTY2hlbWEpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLm1vbmdvTWFwc1ttb2RlbG5hbWVdID0gTW9uZ29NYXAubWFrZU1vbmdvTWFwKG1vZGVsRG9jLCBleHRlbmRlZFNjaGVtYSlcclxuICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZygoKT0+ICdjcmVhdGVkIG1vbmdvbWFwIGZvciAnICsgbW9kZWxuYW1lKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIClcclxuICAgICAgICB9KSk7XHJcbiAgICB9KS50aGVuKCgpID0+IHtcclxuICAgICAgICByZXR1cm4gcmVzO1xyXG4gICAgfSlcclxuICAgIC8vdmFyIG1vZGVsRG9jID0gU2NoZW1hbG9hZC5nZXRFeHRlbmRlZERvY01vZGVsKG1vbmdvb3NlKTtcclxuICAgIC8vcmVzLm1vZGVsRG9jc1tJU2NoZW1hLk1vbmdvTkxRLk1PREVMTkFNRV9NRVRBTU9ERUxTXSA9IG1vZGVsRG9jO1xyXG4gICAgLy9yZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlcyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRGYWN0U3lub255bXMobW9uZ29IYW5kbGU6IElNYXRjaC5JTW9kZWxIYW5kbGVSYXcsIG1vZGVsbmFtZTogc3RyaW5nKTogUHJvbWlzZTxJU3lub255bVtdPiB7XHJcbiAgICB2YXIgbW9kZWwgPSBtb25nb0hhbmRsZS5tb25nb29zZS5tb2RlbChTY2hlbWFsb2FkLm1ha2VNb25nb29zZU1vZGVsTmFtZShtb2RlbG5hbWUpKTtcclxuICAgIC8vICAgICByZXR1cm4gbW9kZWwuZmluZCggeyBcIl9zeW5vbnltcy4wXCIgOiB7ICRleGlzdHM6IGZhbHNlfX0pLmxlYW4oKS5leGVjKCk7XHJcbi8qIG1vbmdvb3NlIHByaW9yXHJcbiAgICByZXR1cm4gbW9kZWwuYWdncmVnYXRlKHsgJG1hdGNoOiB7IFwiX3N5bm9ueW1zLjBcIjogeyAkZXhpc3RzOiB0cnVlIH0gfSB9LFxyXG4gICAgICAgIHsgJHByb2plY3Q6IHsgX3N5bm9ueW1zOiAxIH0gfSxcclxuICAgICAgICB7ICR1bndpbmQ6IFwiJF9zeW5vbnltc1wiIH0sXHJcbiAgICAgICAgeyAkcHJvamVjdDogeyBcImNhdGVnb3J5XCI6IFwiJF9zeW5vbnltcy5jYXRlZ29yeVwiLCBcImZhY3RcIjogXCIkX3N5bm9ueW1zLmZhY3RcIiwgXCJzeW5vbnltc1wiOiBcIiRfc3lub255bXMuc3lub255bXNcIiB9IH0pLmV4ZWMoKTtcclxuKi9cclxuICAgIHJldHVybiBtb2RlbC5hZ2dyZWdhdGUoW3sgJG1hdGNoOiB7IFwiX3N5bm9ueW1zLjBcIjogeyAkZXhpc3RzOiB0cnVlIH0gfSB9LFxyXG4gICAgICAgIHsgJHByb2plY3Q6IHsgX3N5bm9ueW1zOiAxIH0gfSxcclxuICAgICAgICB7ICR1bndpbmQ6IFwiJF9zeW5vbnltc1wiIH0sXHJcbiAgICAgICAgeyAkcHJvamVjdDogeyBcImNhdGVnb3J5XCI6IFwiJF9zeW5vbnltcy5jYXRlZ29yeVwiLCBcImZhY3RcIjogXCIkX3N5bm9ueW1zLmZhY3RcIiwgXCJzeW5vbnltc1wiOiBcIiRfc3lub255bXMuc3lub255bXNcIiB9IH1dKS5leGVjKCk7XHJcblxyXG5cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJU3lub255bSB7XHJcbiAgICBjYXRlZ29yeTogc3RyaW5nLFxyXG4gICAgZmFjdDogc3RyaW5nLFxyXG4gICAgc3lub255bXM6IHN0cmluZ1tdXHJcbn07XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElTeW5vbnltQmVhcmluZ0RvYyB7XHJcbiAgICBfc3lub255bXM6IFt7XHJcbiAgICAgICAgY2F0ZWdvcnk6IHN0cmluZyxcclxuICAgICAgICBmYWN0OiBzdHJpbmcsXHJcbiAgICAgICAgc3lub255bXM6IHN0cmluZ1tdXHJcbiAgICB9XVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0TW9uZ29Db2xsZWN0aW9uTmFtZUZvckRvbWFpbih0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMsIGRvbWFpbiA6IHN0cmluZykgOiBzdHJpbmcge1xyXG4gICAgdmFyIHIgPSBnZXRNb25nb29zZU1vZGVsTmFtZUZvckRvbWFpbih0aGVNb2RlbCwgZG9tYWluKTtcclxuICAgIHJldHVybiBTY2hlbWFsb2FkLm1ha2VNb25nb0NvbGxlY3Rpb25OYW1lKHIpXHJcbn1cclxuXHJcbi8vU2NoZW1hbG9hZC5tYWtlTW9uZ29vc2VNb2RlbE5hbWUobW9kZWxuYW1lKVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldE1vbmdvb3NlTW9kZWxOYW1lRm9yRG9tYWluKHRoZU1vZGVsIDogSU1hdGNoLklNb2RlbHMsIGRvbWFpbiA6IHN0cmluZykgOiBzdHJpbmcge1xyXG4gICAgdmFyIHIgPSBnZXRNb2RlbE5hbWVGb3JEb21haW4odGhlTW9kZWwubW9uZ29IYW5kbGUsIGRvbWFpbik7XHJcbiAgICB2YXIgcjIgPSBTY2hlbWFsb2FkLm1ha2VNb25nb29zZU1vZGVsTmFtZShyKTtcclxuICAgIHJldHVybiByMjtcclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRNb2RlbEZvck1vZGVsTmFtZSh0aGVNb2RlbCA6IElNYXRjaC5JTW9kZWxzLCBtb2RlbG5hbWU6IHN0cmluZykgOiBhbnkge1xyXG4gICAgcmV0dXJuIHRoZU1vZGVsLm1vbmdvSGFuZGxlLm1vbmdvb3NlLm1vZGVsKFNjaGVtYWxvYWQubWFrZU1vbmdvb3NlTW9kZWxOYW1lKG1vZGVsbmFtZSkpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0TW9kZWxGb3JEb21haW4odGhlTW9kZWwgOiBJTWF0Y2guSU1vZGVscywgZG9tYWluIDogc3RyaW5nKSA6IGFueSB7XHJcbiAgICB2YXIgbW9kZWxuYW1lID0gZ2V0TW9kZWxOYW1lRm9yRG9tYWluKHRoZU1vZGVsLm1vbmdvSGFuZGxlLCBkb21haW4pO1xyXG4gICAgcmV0dXJuIGdldE1vZGVsRm9yTW9kZWxOYW1lKHRoZU1vZGVsLCBtb2RlbG5hbWUpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0TW9kZWxOYW1lRm9yRG9tYWluKGhhbmRsZSA6IElNYXRjaC5JTW9kZWxIYW5kbGVSYXcsIGRvbWFpbiA6IHN0cmluZykgOiBzdHJpbmcge1xyXG4gICAgdmFyIHJlcyA9IHVuZGVmaW5lZDtcclxuICAgIE9iamVjdC5rZXlzKGhhbmRsZS5tb2RlbERvY3MpLmV2ZXJ5KCBrZXkgPT4ge1xyXG4gICAgICAgIHZhciBkb2MgPSBoYW5kbGUubW9kZWxEb2NzW2tleV07XHJcbiAgICAgICAgaWYoZG9tYWluID09PSBkb2MuZG9tYWluKSB7XHJcbiAgICAgICAgICAgIHJlcyA9IGRvYy5tb2RlbG5hbWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiAhcmVzO1xyXG4gICAgfSk7XHJcbiAgICBpZighcmVzKSB7XHJcbiAgICAgICAgdGhyb3cgRXJyb3IoJ2F0dGVtcHQgdG8gcmV0cmlldmUgbW9kZWxOYW1lIGZvciB1bmtub3duIGRvbWFpbiAnICsgZG9tYWluKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXM7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBhc3N1cmVEaXJFeGlzdHMoZGlyIDogc3RyaW5nKSB7XHJcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZGlyKSl7XHJcbiAgICAgICAgZnMubWtkaXJTeW5jKGRpcik7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJSZW1hcENhdGVnb3JpZXMoIG1vbmdvTWFwIDogSU1hdGNoLkNhdE1vbmdvTWFwLCBjYXRlZ29yaWVzIDogc3RyaW5nW10sIHJlY29yZHMgOiBhbnlbXSApIDogYW55W10ge1xyXG4gICAgLy9cclxuICAgIC8vY29uc29sZS5sb2coJ2hlcmUgbWFwJyArIEpTT04uc3RyaW5naWZ5KG1vbmdvTWFwLHVuZGVmaW5lZCwyKSk7XHJcbiAgICByZXR1cm4gcmVjb3Jkcy5tYXAoKHJlYyxpbmRleCkgPT4ge1xyXG4gICAgICAgIHZhciByZXMgPSB7fTtcclxuICAgICAgICBjYXRlZ29yaWVzLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xyXG4gICAgICAgICAgICB2YXIgY2F0ZWdvcnlQYXRoID0gbW9uZ29NYXBbY2F0ZWdvcnldLnBhdGhzO1xyXG4gICAgICAgICAgICBpZighY2F0ZWdvcnlQYXRoKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHVua25vd24gY2F0ZWdvcnkgJHtjYXRlZ29yeX0gbm90IHByZXNlbnQgaW4gJHtKU09OLnN0cmluZ2lmeShtb25nb01hcCx1bmRlZmluZWQsMil9YCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmVzW2NhdGVnb3J5XSA9IE1vbmdvTWFwLmdldE1lbWJlckJ5UGF0aChyZWMsIGNhdGVnb3J5UGF0aCk7XHJcbiAgICAgICAgICAgIGRlYnVnbG9nKCAoKT0+J2dvdCBtZW1iZXIgZm9yICcgICsgY2F0ZWdvcnkgKyAnIGZyb20gcmVjIG5vICcgKyBpbmRleCArICcgJyArIEpTT04uc3RyaW5naWZ5KHJlYyx1bmRlZmluZWQsMikgKTtcclxuICAgICAgICAgICAgZGVidWdsb2coKCk9PiBKU09OLnN0cmluZ2lmeShjYXRlZ29yeVBhdGgpKTtcclxuICAgICAgICAgICAgZGVidWdsb2coKCk9PiAncmVzIDogJyArIHJlc1tjYXRlZ29yeV0gKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gcmVzO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjaGVja01vZGVsTW9uZ29NYXAobW9kZWw6IG1vbmdvb3NlLk1vZGVsPGFueT4sIG1vZGVsbmFtZSA6IHN0cmluZywgbW9uZ29NYXA6IElNYXRjaC5DYXRNb25nb01hcCwgY2F0ZWdvcnk/IDogc3RyaW5nKSB7XHJcbiAgICBpZiAoIW1vZGVsKSB7XHJcbiAgICAgICAgZGVidWdsb2coJyBubyBtb2RlbCBmb3IgJyArIG1vZGVsbmFtZSk7XHJcbiAvLyAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoYG1vZGVsICR7bW9kZWxuYW1lfSBub3QgZm91bmQgaW4gZGJgKTtcclxuICAgICAgICB0aHJvdyBFcnJvcihgbW9kZWwgJHttb2RlbG5hbWV9IG5vdCBmb3VuZCBpbiBkYmApO1xyXG4gICAgfVxyXG4gICAgaWYgKCFtb25nb01hcCkge1xyXG4gICAgICAgIGRlYnVnbG9nKCcgbm8gbW9uZ29NYXAgZm9yICcgKyBtb2RlbG5hbWUpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgbW9kZWwgJHttb2RlbG5hbWV9IGhhcyBubyBtb2RlbG1hcGApO1xyXG4vLyAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGBtb2RlbCAke21vZGVsbmFtZX0gaGFzIG5vIG1vZGVsbWFwYCk7XHJcbiAgICB9XHJcbiAgICBpZiAoY2F0ZWdvcnkgJiYgIW1vbmdvTWFwW2NhdGVnb3J5XSkge1xyXG4gICAgICAgIGRlYnVnbG9nKCcgbm8gbW9uZ29NYXAgY2F0ZWdvcnkgZm9yICcgKyBtb2RlbG5hbWUpO1xyXG4gIC8vICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGBtb2RlbCAke21vZGVsbmFtZX0gaGFzIG5vIGNhdGVnb3J5ICR7Y2F0ZWdvcnl9YCk7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYG1vZGVsICR7bW9kZWxuYW1lfSBoYXMgbm8gY2F0ZWdvcnkgJHtjYXRlZ29yeX1gKTtcclxuICAgIH1cclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRFeHBhbmRlZFJlY29yZHNGdWxsKHRoZU1vZGVsIDogSU1hdGNoLklNb2RlbHMsIGRvbWFpbiA6IHN0cmluZykgOiBQcm9taXNlPHsgW2tleSA6IHN0cmluZ10gOiBhbnl9PiB7XHJcbiAgICB2YXIgbW9uZ29IYW5kbGUgPSB0aGVNb2RlbC5tb25nb0hhbmRsZTtcclxuICAgIHZhciBtb2RlbG5hbWUgPSBnZXRNb2RlbE5hbWVGb3JEb21haW4odGhlTW9kZWwubW9uZ29IYW5kbGUsIGRvbWFpbik7XHJcbiAgICBkZWJ1Z2xvZygoKT0+YCBtb2RlbG5hbWUgZm9yICR7ZG9tYWlufSBpcyAke21vZGVsbmFtZX1gKTtcclxuICAgIHZhciBtb2RlbCA9IG1vbmdvSGFuZGxlLm1vbmdvb3NlLm1vZGVsKFNjaGVtYWxvYWQubWFrZU1vbmdvb3NlTW9kZWxOYW1lKG1vZGVsbmFtZSkpO1xyXG4gICAgdmFyIG1vbmdvTWFwID0gbW9uZ29IYW5kbGUubW9uZ29NYXBzW21vZGVsbmFtZV07XHJcbiAgICBkZWJ1Z2xvZygoKT0+ICdoZXJlIHRoZSBtb25nb21hcCcgKyBKU09OLnN0cmluZ2lmeShtb25nb01hcCx1bmRlZmluZWQsMikpO1xyXG4gICAgdmFyIHAgPSBjaGVja01vZGVsTW9uZ29NYXAobW9kZWwsbW9kZWxuYW1lLCBtb25nb01hcCk7XHJcbiAgICBkZWJ1Z2xvZygoKT0+YCBoZXJlIHRoZSBtb2RlbG1hcCBmb3IgJHtkb21haW59IGlzICR7SlNPTi5zdHJpbmdpZnkobW9uZ29NYXAsdW5kZWZpbmVkLDIpfWApO1xyXG4gICAgLy8gMSkgcHJvZHVjZSB0aGUgZmxhdHRlbmVkIHJlY29yZHNcclxuICAgIHZhciByZXMgPSBNb25nb01hcC51bndpbmRzRm9yTm9udGVybWluYWxBcnJheXMobW9uZ29NYXApO1xyXG4gICAgZGVidWdsb2coKCk9PidoZXJlIHRoZSB1bndpbmQgc3RhdGVtZW50ICcgKyBKU09OLnN0cmluZ2lmeShyZXMsdW5kZWZpbmVkLDIpKTtcclxuICAgIC8vIHdlIGhhdmUgdG8gdW53aW5kIGFsbCBjb21tb24gbm9uLXRlcm1pbmFsIGNvbGxlY3Rpb25zLlxyXG4gICAgZGVidWdsb2coKCk9PidoZXJlIHRoZSBtb2RlbCAnICsgbW9kZWwubW9kZWxOYW1lKTtcclxuICAgIHZhciBjYXRlZ29yaWVzID0gZ2V0Q2F0ZWdvcmllc0ZvckRvbWFpbih0aGVNb2RlbCwgZG9tYWluKTtcclxuICAgIGRlYnVnbG9nKCgpPT5gaGVyZSBjYXRlZ29yaWVzIGZvciAke2RvbWFpbn0gJHtjYXRlZ29yaWVzLmpvaW4oJzsnKX1gKTtcclxuICAgIGlmKHJlcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICByZXR1cm4gbW9kZWwuZmluZCh7fSkubGVhbigpLmV4ZWMoKS50aGVuKCggdW53b3VuZCA6IGFueVtdKSA9PiB7XHJcbiAgICAgICAgICAgIGRlYnVnbG9nKCgpPT4naGVyZSByZXMnICsgSlNPTi5zdHJpbmdpZnkodW53b3VuZCkpO1xyXG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyUmVtYXBDYXRlZ29yaWVzKG1vbmdvTWFwLCBjYXRlZ29yaWVzLCB1bndvdW5kKVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG1vZGVsLmFnZ3JlZ2F0ZShyZXMpLnRoZW4oIHVud291bmQgPT4ge1xyXG4gICAgICAgIC8vIGZpbHRlciBmb3IgYWdncmVnYXRlXHJcbiAgICAgICAgZGVidWdsb2coKCk9PidoZXJlIHJlcycgKyBKU09OLnN0cmluZ2lmeSh1bndvdW5kKSk7XHJcbiAgICAgICAgcmV0dXJuIGZpbHRlclJlbWFwQ2F0ZWdvcmllcyhtb25nb01hcCwgY2F0ZWdvcmllcywgdW53b3VuZClcclxuICAgIH0pO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4cGFuZGVkUmVjb3Jkc0ZvckNhdGVnb3J5KHRoZU1vZGVsIDogSU1hdGNoLklNb2RlbHMsZG9tYWluIDogc3RyaW5nLGNhdGVnb3J5IDogc3RyaW5nKSA6IFByb21pc2U8eyBba2V5IDogc3RyaW5nXSA6IGFueX0+IHtcclxuICAgIHZhciBtb25nb0hhbmRsZSA9IHRoZU1vZGVsLm1vbmdvSGFuZGxlO1xyXG4gICAgdmFyIG1vZGVsbmFtZSA9IGdldE1vZGVsTmFtZUZvckRvbWFpbih0aGVNb2RlbC5tb25nb0hhbmRsZSwgZG9tYWluKTtcclxuICAgIGRlYnVnbG9nKCgpPT5gIG1vZGVsbmFtZSBmb3IgJHtkb21haW59IGlzICR7bW9kZWxuYW1lfWApO1xyXG4gICAgLy9kZWJ1Z2xvZygoKSA9PiBgaGVyZSBtb2RlbHMgJHttb2RlbG5hbWV9IGAgKyBtb25nb0hhbmRsZS5tb25nb29zZS5tb2RlbE5hbWVzKCkuam9pbignOycpKTtcclxuICAgIHZhciBtb2RlbCA9IG1vbmdvSGFuZGxlLm1vbmdvb3NlLm1vZGVsKFNjaGVtYWxvYWQubWFrZU1vbmdvb3NlTW9kZWxOYW1lKG1vZGVsbmFtZSkpO1xyXG4gICAgdmFyIG1vbmdvTWFwID0gbW9uZ29IYW5kbGUubW9uZ29NYXBzW21vZGVsbmFtZV07XHJcbiAgICBkZWJ1Z2xvZygoKT0+ICdoZXJlIHRoZSBtb25nb21hcCcgKyBKU09OLnN0cmluZ2lmeShtb25nb01hcCx1bmRlZmluZWQsMikpO1xyXG4gICAgY2hlY2tNb2RlbE1vbmdvTWFwKG1vZGVsLG1vZGVsbmFtZSwgbW9uZ29NYXAsY2F0ZWdvcnkpO1xyXG4gICAgZGVidWdsb2coKCk9PmAgaGVyZSB0aGUgbW9kZWxtYXAgZm9yICR7ZG9tYWlufSBpcyAke0pTT04uc3RyaW5naWZ5KG1vbmdvTWFwLHVuZGVmaW5lZCwyKX1gKTtcclxuICAgIC8vIDEpIHByb2R1Y2UgdGhlIGZsYXR0ZW5lZCByZWNvcmRzXHJcbiAgICB2YXIgcmVzID0gTW9uZ29NYXAudW53aW5kc0Zvck5vbnRlcm1pbmFsQXJyYXlzKG1vbmdvTWFwKTtcclxuICAgIGRlYnVnbG9nKCgpPT4naGVyZSB0aGUgdW53aW5kIHN0YXRlbWVudCAnICsgSlNPTi5zdHJpbmdpZnkocmVzLHVuZGVmaW5lZCwyKSk7XHJcbiAgICAvLyB3ZSBoYXZlIHRvIHVud2luZCBhbGwgY29tbW9uIG5vbi10ZXJtaW5hbCBjb2xsZWN0aW9ucy5cclxuICAgIGRlYnVnbG9nKCgpPT4naGVyZSB0aGUgbW9kZWwgJyArIG1vZGVsLm1vZGVsTmFtZSk7XHJcbiAgICBpZihyZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuIG1vZGVsLmZpbmQoe30pLmxlYW4oKS5leGVjKCkudGhlbigoIHVud291bmQgOiBhbnlbXSkgPT4ge1xyXG4gICAgICAgICAgICBkZWJ1Z2xvZygoKT0+J2hlcmUgcmVzJyArIEpTT04uc3RyaW5naWZ5KHVud291bmQpKTtcclxuICAgICAgICAgICAgcmV0dXJuIGZpbHRlclJlbWFwQ2F0ZWdvcmllcyhtb25nb01hcCwgW2NhdGVnb3J5XSwgdW53b3VuZClcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiBtb2RlbC5hZ2dyZWdhdGUocmVzKS50aGVuKCB1bndvdW5kID0+IHtcclxuICAgICAgICAvLyBmaWx0ZXIgZm9yIGFnZ3JlZ2F0ZVxyXG4gICAgICAgIGRlYnVnbG9nKCgpPT4naGVyZSByZXMnICsgSlNPTi5zdHJpbmdpZnkodW53b3VuZCkpO1xyXG4gICAgICAgIHJldHVybiBmaWx0ZXJSZW1hcENhdGVnb3JpZXMobW9uZ29NYXAsIFtjYXRlZ29yeV0sIHVud291bmQpXHJcbiAgICB9KTtcclxufVxyXG4vLyBnZXQgc3lub255bXNcclxuLy8gZGIuY29zbW9zLmZpbmQoIHsgXCJfc3lub255bXMuMFwiOiB7ICRleGlzdHM6IHRydWUgfX0pLmxlbmd0aCgpXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGlzdGluY3RWYWx1ZXMobW9uZ29IYW5kbGU6IElNYXRjaC5JTW9kZWxIYW5kbGVSYXcsIG1vZGVsbmFtZTogc3RyaW5nLCBjYXRlZ29yeTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xyXG4gICAgZGVidWdsb2coKCkgPT4gYGhlcmUgbW9kZWxzICR7bW9kZWxuYW1lfSBgICsgbW9uZ29IYW5kbGUubW9uZ29vc2UubW9kZWxOYW1lcygpLmpvaW4oJzsnKSk7XHJcbiAgICB2YXIgbW9kZWwgPSBtb25nb0hhbmRsZS5tb25nb29zZS5tb2RlbChTY2hlbWFsb2FkLm1ha2VNb25nb29zZU1vZGVsTmFtZShtb2RlbG5hbWUpKTtcclxuICAgIHZhciBtb25nb01hcCA9IG1vbmdvSGFuZGxlLm1vbmdvTWFwc1ttb2RlbG5hbWVdO1xyXG4gICAgY2hlY2tNb2RlbE1vbmdvTWFwKG1vZGVsLG1vZGVsbmFtZSwgbW9uZ29NYXAsY2F0ZWdvcnkpO1xyXG4gICAgZGVidWdsb2coJyBoZXJlIHBhdGggZm9yIGRpc3RpbmN0IHZhbHVlICcgKyBtb25nb01hcFtjYXRlZ29yeV0uZnVsbHBhdGggKTtcclxuICAgIHJldHVybiBtb2RlbC5kaXN0aW5jdChtb25nb01hcFtjYXRlZ29yeV0uZnVsbHBhdGgpLnRoZW4ocmVzID0+IHtcclxuICAgICAgICBkZWJ1Z2xvZygoKSA9PiBgIGhlcmUgcmVzIGZvciAke21vZGVsbmFtZX0gICR7Y2F0ZWdvcnl9IHZhbHVlcyBgICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcclxuICAgICAgICByZXR1cm4gcmVzO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRDYXRlZ29yeVJlYyhtb25nb0hhbmRsZTogSU1hdGNoLklNb2RlbEhhbmRsZVJhdywgbW9kZWxuYW1lOiBzdHJpbmcsIGNhdGVnb3J5OiBzdHJpbmcpOiBJTWF0Y2guSU1vZGVsQ2F0ZWdvcnlSZWNcclxue1xyXG4gICAgdmFyIGNhdGVnb3JpZXMgPSBtb25nb0hhbmRsZS5tb2RlbERvY3NbbW9kZWxuYW1lXS5fY2F0ZWdvcmllcztcclxuICAgIHZhciBmaWx0ZXJlZCA9IGNhdGVnb3JpZXMuZmlsdGVyKCB4ID0+IHguY2F0ZWdvcnkgPT0gY2F0ZWdvcnkgKTtcclxuICAgIC8vIHdlIHdhbnQgdG8gYW1lbnQgdGhlIHR5cGUhXHJcbiAgICBpZiAoIGZpbHRlcmVkLmxlbmd0aCAhPSAxIClcclxuICAgIHtcclxuXHJcbiAgICAgICAgZGVidWdmKCAnIGRpZCBub3QgZmluZCAnICsgbW9kZWxuYW1lICsgJyAgY2F0ZWdvcnkgICcgKyBjYXRlZ29yeSArICcgaW4gICcgKyBKU09OLnN0cmluZ2lmeShjYXRlZ29yaWVzKSApO1xyXG4gICAgICAgIHRocm93IEVycm9yKCdjYXRlZ29yeSBub3QgZm91bmQgJyArIGNhdGVnb3J5ICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShjYXRlZ29yaWVzKSApO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZpbHRlcmVkWzBdO1xyXG59XHJcblxyXG5cclxuXHJcbmNvbnN0IEFSUl9NT0RFTF9QUk9QRVJUSUVTID0gW1wiZG9tYWluXCIsIFwiYml0aW5kZXhcIiwgXCJkZWZhdWx0a2V5Y29sdW1uXCIsIFwiZGVmYXVsdHVyaVwiLCBcImNhdGVnb3J5RGVzY3JpYmVkXCIsIFwiY29sdW1uc1wiLCBcImRlc2NyaXB0aW9uXCIsIFwidG9vbFwiLCBcInRvb2xoaWRkZW5cIiwgXCJzeW5vbnltc1wiLCBcImNhdGVnb3J5XCIsIFwid29yZGluZGV4XCIsIFwiZXhhY3RtYXRjaFwiLCBcImhpZGRlblwiXTtcclxuXHJcbmZ1bmN0aW9uIGFkZFN5bm9ueW1zKHN5bm9ueW1zOiBzdHJpbmdbXSwgY2F0ZWdvcnk6IHN0cmluZywgc3lub255bUZvcjogc3RyaW5nLCBiaXRpbmRleDogbnVtYmVyLCBiaXRTZW50ZW5jZUFuZCxcclxuICAgIHdvcmRUeXBlOiBzdHJpbmcsXHJcbiAgICBtUnVsZXM6IEFycmF5PElNYXRjaC5tUnVsZT4sIHNlZW46IHsgW2tleTogc3RyaW5nXTogSU1hdGNoLm1SdWxlW10gfSkge1xyXG4gICAgc3lub255bXMuZm9yRWFjaChmdW5jdGlvbiAoc3luKSB7XHJcbiAgICAgICAgdmFyIG9SdWxlID0ge1xyXG4gICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IHN5bm9ueW1Gb3IsXHJcbiAgICAgICAgICAgIHR5cGU6IElNYXRjaC5FbnVtUnVsZVR5cGUuV09SRCxcclxuICAgICAgICAgICAgd29yZDogc3luLFxyXG4gICAgICAgICAgICBiaXRpbmRleDogYml0aW5kZXgsXHJcbiAgICAgICAgICAgIGJpdFNlbnRlbmNlQW5kOiBiaXRTZW50ZW5jZUFuZCxcclxuICAgICAgICAgICAgd29yZFR5cGU6IHdvcmRUeXBlLFxyXG4gICAgICAgICAgICBfcmFua2luZzogMC45NVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImluc2VydGluZyBzeW5vbnltXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSkpIDogJy0nKTtcclxuICAgICAgICBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG1SdWxlcywgb1J1bGUsIHNlZW4pO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFJ1bGVLZXkocnVsZSkge1xyXG4gICAgdmFyIHIxID0gcnVsZS5tYXRjaGVkU3RyaW5nICsgXCItfC1cIiArIHJ1bGUuY2F0ZWdvcnkgKyBcIiAtfC0gXCIgKyBydWxlLnR5cGUgKyBcIiAtfC0gXCIgKyBydWxlLndvcmQgKyBcIiBcIiArIHJ1bGUuYml0aW5kZXggKyBcIiBcIiArIHJ1bGUud29yZFR5cGU7XHJcbiAgICBpZiAocnVsZS5yYW5nZSkge1xyXG4gICAgICAgIHZhciByMiA9IGdldFJ1bGVLZXkocnVsZS5yYW5nZS5ydWxlKTtcclxuICAgICAgICByMSArPSBcIiAtfC0gXCIgKyBydWxlLnJhbmdlLmxvdyArIFwiL1wiICsgcnVsZS5yYW5nZS5oaWdoICsgXCIgLXwtIFwiICsgcjI7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcjE7XHJcbn1cclxuXHJcblxyXG5pbXBvcnQgKiBhcyBCcmVha2Rvd24gZnJvbSAnLi4vbWF0Y2gvYnJlYWtkb3duJztcclxuXHJcbi8qIGdpdmVuIGEgcnVsZSB3aGljaCByZXByZXNlbnRzIGEgd29yZCBzZXF1ZW5jZSB3aGljaCBpcyBzcGxpdCBkdXJpbmcgdG9rZW5pemF0aW9uICovXHJcbmV4cG9ydCBmdW5jdGlvbiBhZGRCZXN0U3BsaXQobVJ1bGVzOiBBcnJheTxJTWF0Y2gubVJ1bGU+LCBydWxlOiBJTWF0Y2gubVJ1bGUsIHNlZW5SdWxlczogeyBba2V5OiBzdHJpbmddOiBJTWF0Y2gubVJ1bGVbXSB9KSB7XHJcbiAgICAvL2lmKCFnbG9iYWxfQWRkU3BsaXRzKSB7XHJcbiAgICAvLyAgICByZXR1cm47XHJcbiAgICAvL31cclxuXHJcbiAgICBpZiAocnVsZS50eXBlICE9PSBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB2YXIgYmVzdCA9IEJyZWFrZG93bi5tYWtlTWF0Y2hQYXR0ZXJuKHJ1bGUubG93ZXJjYXNld29yZCk7XHJcbiAgICBpZiAoIWJlc3QpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB2YXIgbmV3UnVsZSA9IHtcclxuICAgICAgICBjYXRlZ29yeTogcnVsZS5jYXRlZ29yeSxcclxuICAgICAgICBtYXRjaGVkU3RyaW5nOiBydWxlLm1hdGNoZWRTdHJpbmcsXHJcbiAgICAgICAgYml0aW5kZXg6IHJ1bGUuYml0aW5kZXgsXHJcbiAgICAgICAgYml0U2VudGVuY2VBbmQ6IHJ1bGUuYml0aW5kZXgsXHJcbiAgICAgICAgd29yZFR5cGU6IHJ1bGUud29yZFR5cGUsXHJcbiAgICAgICAgd29yZDogYmVzdC5sb25nZXN0VG9rZW4sXHJcbiAgICAgICAgdHlwZTogMCxcclxuICAgICAgICBsb3dlcmNhc2V3b3JkOiBiZXN0Lmxvbmdlc3RUb2tlbixcclxuICAgICAgICBfcmFua2luZzogMC45NSxcclxuICAgICAgICAvLyAgICBleGFjdE9ubHkgOiBydWxlLmV4YWN0T25seSxcclxuICAgICAgICByYW5nZTogYmVzdC5zcGFuXHJcbiAgICB9IGFzIElNYXRjaC5tUnVsZTtcclxuICAgIGlmIChydWxlLmV4YWN0T25seSkge1xyXG4gICAgICAgIG5ld1J1bGUuZXhhY3RPbmx5ID0gcnVsZS5leGFjdE9ubHlcclxuICAgIH07XHJcbiAgICBuZXdSdWxlLnJhbmdlLnJ1bGUgPSBydWxlO1xyXG4gICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChtUnVsZXMsIG5ld1J1bGUsIHNlZW5SdWxlcyk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG1SdWxlczogQXJyYXk8SU1hdGNoLm1SdWxlPiwgcnVsZTogSU1hdGNoLm1SdWxlLFxyXG4gICAgc2VlblJ1bGVzOiB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5tUnVsZVtdIH0pIHtcclxuXHJcbiAgICBpZiAocnVsZS50eXBlICE9PSBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQpIHtcclxuICAgICAgICBkZWJ1Z2xvZygnbm90IGEgIHdvcmQgcmV0dXJuIGZhc3QgJysgcnVsZS5tYXRjaGVkU3RyaW5nKTtcclxuICAgICAgICBtUnVsZXMucHVzaChydWxlKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBpZiAoKHJ1bGUud29yZCA9PT0gdW5kZWZpbmVkKSB8fCAocnVsZS5tYXRjaGVkU3RyaW5nID09PSB1bmRlZmluZWQpKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbGxlZ2FsIHJ1bGUnICsgSlNPTi5zdHJpbmdpZnkocnVsZSwgdW5kZWZpbmVkLCAyKSk7XHJcbiAgICB9XHJcbiAgICB2YXIgciA9IGdldFJ1bGVLZXkocnVsZSk7XHJcbiAgICAvKiBpZiggKHJ1bGUud29yZCA9PT0gXCJzZXJ2aWNlXCIgfHwgcnVsZS53b3JkPT09IFwic2VydmljZXNcIikgJiYgci5pbmRleE9mKCdPRGF0YScpID49IDApIHtcclxuICAgICAgICAgY29uc29sZS5sb2coXCJydWxla2V5IGlzXCIgKyByKTtcclxuICAgICAgICAgY29uc29sZS5sb2coXCJwcmVzZW5jZSBpcyBcIiArIEpTT04uc3RyaW5naWZ5KHNlZW5SdWxlc1tyXSkpO1xyXG4gICAgIH0qL1xyXG4gICAgcnVsZS5sb3dlcmNhc2V3b3JkID0gcnVsZS53b3JkLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBpZiAoc2VlblJ1bGVzW3JdKSB7XHJcbiAgICAgICAgZGVidWdsb2coKCkgPT4gKFwiQXR0ZW1wdGluZyB0byBpbnNlcnQgZHVwbGljYXRlXCIgKyBKU09OLnN0cmluZ2lmeShydWxlLCB1bmRlZmluZWQsIDIpICsgXCIgOiBcIiArIHIpKTtcclxuICAgICAgICB2YXIgZHVwbGljYXRlcyA9IHNlZW5SdWxlc1tyXS5maWx0ZXIoZnVuY3Rpb24gKG9FbnRyeSkge1xyXG4gICAgICAgICAgICByZXR1cm4gMCA9PT0gSW5wdXRGaWx0ZXJSdWxlcy5jb21wYXJlTVJ1bGVGdWxsKG9FbnRyeSwgcnVsZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgaWYgKGR1cGxpY2F0ZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgc2VlblJ1bGVzW3JdID0gKHNlZW5SdWxlc1tyXSB8fCBbXSk7XHJcbiAgICBzZWVuUnVsZXNbcl0ucHVzaChydWxlKTtcclxuICAgIGlmIChydWxlLndvcmQgPT09IFwiXCIpIHtcclxuICAgICAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKCdTa2lwcGluZyBydWxlIHdpdGggZW10cHkgd29yZCAnICsgSlNPTi5zdHJpbmdpZnkocnVsZSwgdW5kZWZpbmVkLCAyKSkgOiAnLScpO1xyXG4gICAgICAgIC8vZygnU2tpcHBpbmcgcnVsZSB3aXRoIGVtdHB5IHdvcmQgJyArIEpTT04uc3RyaW5naWZ5KHJ1bGUsIHVuZGVmaW5lZCwgMikpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIG1SdWxlcy5wdXNoKHJ1bGUpO1xyXG4gICAgYWRkQmVzdFNwbGl0KG1SdWxlcywgcnVsZSwgc2VlblJ1bGVzKTtcclxuICAgIHJldHVybjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRGaWxlQXNKU09OKGZpbGVuYW1lOiBzdHJpbmcpOiBhbnkge1xyXG4gICAgdmFyIGRhdGEgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZW5hbWUsICd1dGYtOCcpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShkYXRhKTtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIkNvbnRlbnQgb2YgZmlsZSBcIiArIGZpbGVuYW1lICsgXCIgaXMgbm8ganNvblwiICsgZSk7XHJcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQub24oJ2RyYWluJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgtMSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgLy9wcm9jZXNzLmV4aXQoLTEpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxufVxyXG5cclxuLypcclxuZnVuY3Rpb24gbG9hZE1vZGVsRGF0YTEobW9kZWxQYXRoOiBzdHJpbmcsIG9NZGw6IElNb2RlbCwgc01vZGVsTmFtZTogc3RyaW5nLCBvTW9kZWw6IElNYXRjaC5JTW9kZWxzKSB7XHJcbiAgICAvLyByZWFkIHRoZSBkYXRhIC0+XHJcbiAgICAvLyBkYXRhIGlzIHByb2Nlc3NlZCBpbnRvIG1SdWxlcyBkaXJlY3RseSxcclxuXHJcbiAgICB2YXIgYml0aW5kZXggPSBvTWRsLmJpdGluZGV4O1xyXG4gICAgY29uc3Qgc0ZpbGVOYW1lID0gKCcuLycgKyBtb2RlbFBhdGggKyAnLycgKyBzTW9kZWxOYW1lICsgXCIuZGF0YS5qc29uXCIpO1xyXG4gICAgdmFyIG9NZGxEYXRhPSByZWFkRmlsZUFzSlNPTihzRmlsZU5hbWUpO1xyXG4gICAgb01kbERhdGEuZm9yRWFjaChmdW5jdGlvbiAob0VudHJ5KSB7XHJcbiAgICAgICAgaWYgKCFvRW50cnkuZG9tYWluKSB7XHJcbiAgICAgICAgICAgIG9FbnRyeS5fZG9tYWluID0gb01kbC5kb21haW47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghb0VudHJ5LnRvb2wgJiYgb01kbC50b29sLm5hbWUpIHtcclxuICAgICAgICAgICAgb0VudHJ5LnRvb2wgPSBvTWRsLnRvb2wubmFtZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgb01vZGVsLnJlY29yZHMucHVzaChvRW50cnkpO1xyXG4gICAgICAgIG9NZGwuY2F0ZWdvcnkuZm9yRWFjaChmdW5jdGlvbiAoY2F0KSB7XHJcbiAgICAgICAgICAgIGlmIChvRW50cnlbY2F0XSA9PT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgICAgICAgIG9FbnRyeVtjYXRdID0gXCJuL2FcIjtcclxuICAgICAgICAgICAgICAgIHZhciBidWcgPVxyXG4gICAgICAgICAgICAgICAgICAgIFwiSU5DT05TSVNURU5UKj4gTW9kZWxEYXRhIFwiICsgc0ZpbGVOYW1lICsgXCIgZG9lcyBub3QgY29udGFpbiBjYXRlZ29yeSBcIiArIGNhdCArIFwiIHdpdGggdmFsdWUgJ3VuZGVmaW5lZCcsIHVuZGVmaW5lZCBpcyBpbGxlZ2FsIHZhbHVlLCB1c2Ugbi9hIFwiICsgSlNPTi5zdHJpbmdpZnkob0VudHJ5KSArIFwiXCI7XHJcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhidWcpO1xyXG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhidWcpO1xyXG4gICAgICAgICAgICAgICAgLy9wcm9jZXNzLmV4aXQoLTEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgb01kbC53b3JkaW5kZXguZm9yRWFjaChmdW5jdGlvbiAoY2F0ZWdvcnkpIHtcclxuICAgICAgICAgICAgaWYgKG9FbnRyeVtjYXRlZ29yeV0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgZGVidWdsb2coXCJJTkNPTlNJU1RFTlQqPiBNb2RlbERhdGEgXCIgKyBzRmlsZU5hbWUgKyBcIiBkb2VzIG5vdCBjb250YWluIGNhdGVnb3J5IFwiICsgY2F0ZWdvcnkgKyBcIiBvZiB3b3JkaW5kZXhcIiArIEpTT04uc3RyaW5naWZ5KG9FbnRyeSkgKyBcIlwiKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChvRW50cnlbY2F0ZWdvcnldICE9PSBcIipcIikge1xyXG4gICAgICAgICAgICAgICAgdmFyIHNTdHJpbmcgPSBvRW50cnlbY2F0ZWdvcnldO1xyXG4gICAgICAgICAgICAgICAgZGVidWdsb2coXCJwdXNoaW5nIHJ1bGUgd2l0aCBcIiArIGNhdGVnb3J5ICsgXCIgLT4gXCIgKyBzU3RyaW5nKTtcclxuICAgICAgICAgICAgICAgIHZhciBvUnVsZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXHJcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogc1N0cmluZyxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQsXHJcbiAgICAgICAgICAgICAgICAgICAgd29yZDogc1N0cmluZyxcclxuICAgICAgICAgICAgICAgICAgICBiaXRpbmRleDogYml0aW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgYml0U2VudGVuY2VBbmQgOiBiaXRpbmRleCxcclxuICAgICAgICAgICAgICAgICAgICB3b3JkVHlwZSA6IElNYXRjaC5XT1JEVFlQRS5GQUNULFxyXG4gICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiAwLjk1XHJcbiAgICAgICAgICAgICAgICB9IGFzIElNYXRjaC5tUnVsZTtcclxuICAgICAgICAgICAgICAgIGlmIChvTWRsLmV4YWN0bWF0Y2ggJiYgb01kbC5leGFjdG1hdGNoLmluZGV4T2YoY2F0ZWdvcnkpID49IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBvUnVsZS5leGFjdE9ubHkgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCBvUnVsZSwgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgICAgICAgICBpZiAob01kbERhdGEuc3lub255bXMgJiYgb01kbERhdGEuc3lub255bXNbY2F0ZWdvcnldKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaG93IGNhbiB0aGlzIGhhcHBlbj9cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9hZGRTeW5vbnltcyhvTWRsRGF0YS5zeW5vbnltc1tjYXRlZ29yeV0sIGNhdGVnb3J5LCBzU3RyaW5nLCBiaXRpbmRleCwgYml0aW5kZXgsIFwiWFwiLCBvTW9kZWwubVJ1bGVzLCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIGEgc3lub255bSBmb3IgYSBGQUNUXHJcbiAgICAgICAgICAgICAgICBpZiAob0VudHJ5LnN5bm9ueW1zICYmIG9FbnRyeS5zeW5vbnltc1tjYXRlZ29yeV0pIHtcclxuICAgICAgICAgICAgICAgICAgICBhZGRTeW5vbnltcyhvRW50cnkuc3lub255bXNbY2F0ZWdvcnldLCBjYXRlZ29yeSwgc1N0cmluZywgYml0aW5kZXgsIGJpdGluZGV4LCBJTWF0Y2guV09SRFRZUEUuRkFDVCwgb01vZGVsLm1SdWxlcywgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcblxyXG4qL1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBoYXNSdWxlV2l0aEZhY3QobVJ1bGVzIDogSU1hdGNoLm1SdWxlW10sIGZhY3Q6IHN0cmluZywgY2F0ZWdvcnk6IHN0cmluZywgYml0aW5kZXg6IG51bWJlcikge1xyXG4gICAgLy8gVE9ETyBCQUQgUVVBRFJBVElDXHJcbiAgICByZXR1cm4gbVJ1bGVzLmZpbmQoIHJ1bGUgPT4ge1xyXG4gICAgICAgIHJldHVybiBydWxlLndvcmQgPT09IGZhY3QgJiYgcnVsZS5jYXRlZ29yeSA9PT0gY2F0ZWdvcnkgJiYgcnVsZS5iaXRpbmRleCA9PT0gYml0aW5kZXhcclxuICAgIH0pICE9PSB1bmRlZmluZWQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvYWRNb2RlbERhdGFNb25nbyhtb2RlbEhhbmRsZTogSU1hdGNoLklNb2RlbEhhbmRsZVJhdywgb01kbDogSU1vZGVsLCBzTW9kZWxOYW1lOiBzdHJpbmcsIG9Nb2RlbDogSU1hdGNoLklNb2RlbHMpOiBQcm9taXNlPGFueT4ge1xyXG4gICAgLy8gcmVhZCB0aGUgZGF0YSAtPlxyXG4gICAgLy8gZGF0YSBpcyBwcm9jZXNzZWQgaW50byBtUnVsZXMgZGlyZWN0bHlcclxuXHJcbiAgICB2YXIgYml0aW5kZXggPSBvTWRsLmJpdGluZGV4O1xyXG4gICAgLy9jb25zdCBzRmlsZU5hbWUgPSAoJy4vJyArIG1vZGVsUGF0aCArICcvJyArIHNNb2RlbE5hbWUgKyBcIi5kYXRhLmpzb25cIik7XHJcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwobW9kZWxIYW5kbGUubW9kZWxEb2NzW3NNb2RlbE5hbWVdLl9jYXRlZ29yaWVzLm1hcChcclxuICAgICAgICBjYXRlZ29yeVJlYyA9PiB7XHJcbiAgICAgICAgICAgIHZhciBjYXRlZ29yeSA9IGNhdGVnb3J5UmVjLmNhdGVnb3J5O1xyXG4gICAgICAgICAgICB2YXIgd29yZGluZGV4ID0gY2F0ZWdvcnlSZWMud29yZGluZGV4O1xyXG4gICAgICAgICAgICBpZiAoIXdvcmRpbmRleCkge1xyXG4gICAgICAgICAgICAgICAgZGVidWdsb2coICgpPT4gJyAgJyArIHNNb2RlbE5hbWUgKyAnICcgKyAgY2F0ZWdvcnkgKyAnIGlzIG5vdCB3b3JkIGluZGV4ZWQhJyApO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGRlYnVnbG9nKCgpID0+ICdhZGRpbmcgdmFsdWVzIGZvciAnICsgc01vZGVsTmFtZSArICcgJyArICBjYXRlZ29yeSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0RGlzdGluY3RWYWx1ZXMobW9kZWxIYW5kbGUsIHNNb2RlbE5hbWUsIGNhdGVnb3J5KS50aGVuKFxyXG4gICAgICAgICAgICAgICAgICAgICh2YWx1ZXMpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coYGZvdW5kICR7dmFsdWVzLmxlbmd0aH0gdmFsdWVzIGZvciAke3NNb2RlbE5hbWV9ICR7Y2F0ZWdvcnl9IGApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZXMubWFwKHZhbHVlID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzU3RyaW5nID0gXCJcIiArIHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coKCkgPT4gXCJwdXNoaW5nIHJ1bGUgd2l0aCBcIiArIGNhdGVnb3J5ICsgXCIgLT4gXCIgKyBzU3RyaW5nICsgJyAnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvUnVsZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogc1N0cmluZyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29yZDogc1N0cmluZyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiaXRpbmRleDogYml0aW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYml0U2VudGVuY2VBbmQ6IGJpdGluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4YWN0T25seTogY2F0ZWdvcnlSZWMuZXhhY3RtYXRjaCB8fCBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JkVHlwZTogSU1hdGNoLldPUkRUWVBFLkZBQ1QsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IDAuOTVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gYXMgSU1hdGNoLm1SdWxlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCBvUnVsZSwgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICBpZiAob01kbERhdGEuc3lub255bXMgJiYgb01kbERhdGEuc3lub255bXNbY2F0ZWdvcnldKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaG93IGNhbiB0aGlzIGhhcHBlbj9cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2FkZFN5bm9ueW1zKG9NZGxEYXRhLnN5bm9ueW1zW2NhdGVnb3J5XSwgY2F0ZWdvcnksIHNTdHJpbmcsIGJpdGluZGV4LCBiaXRpbmRleCwgXCJYXCIsIG9Nb2RlbC5tUnVsZXMsIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYSBzeW5vbnltIGZvciBhIEZBQ1RcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgIGlmIChvRW50cnkuc3lub255bXMgJiYgb0VudHJ5LnN5bm9ueW1zW2NhdGVnb3J5XSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICBhZGRTeW5vbnltcyhvRW50cnkuc3lub255bXNbY2F0ZWdvcnldLCBjYXRlZ29yeSwgc1N0cmluZywgYml0aW5kZXgsIGJpdGluZGV4LCBJTWF0Y2guV09SRFRZUEUuRkFDVCwgb01vZGVsLm1SdWxlcywgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIClcclxuICAgICkudGhlbihcclxuICAgICAgICAoKSA9PiAgZ2V0RmFjdFN5bm9ueW1zKG1vZGVsSGFuZGxlLCBzTW9kZWxOYW1lKVxyXG4gICAgKS50aGVuKChzeW5vbnltVmFsdWVzIDogYW55KSA9PiB7XHJcbiAgICAgICAgc3lub255bVZhbHVlcy5mb3JFYWNoKChzeW5vbnltUmVjKSA9PiB7XHJcbiAgICAgICAgaWYgKCFoYXNSdWxlV2l0aEZhY3Qob01vZGVsLm1SdWxlcywgc3lub255bVJlYy5mYWN0LCBzeW5vbnltUmVjLmNhdGVnb3J5LCBiaXRpbmRleCkpIHtcclxuICAgICAgICAgICAgZGVidWdsb2coKCkgPT5KU09OLnN0cmluZ2lmeShvTW9kZWwubVJ1bGVzLHVuZGVmaW5lZCwyKSk7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKGBPcnBoYW5lZCBzeW5vbnltIHdpdGhvdXQgYmFzZSBpbiBkYXRhP1xcbmBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYChjaGVjayB0eXBvcyBhbmQgdGhhdCBjYXRlZ29yeSBpcyB3b3JkaW5kZXhlZCEpIGZhY3Q6ICcke3N5bm9ueW1SZWMuZmFjdH0nOyAgY2F0ZWdvcnk6IFwiJHtzeW5vbnltUmVjLmNhdGVnb3J5fVwiICAgYCAgKyBKU09OLnN0cmluZ2lmeShzeW5vbnltUmVjKSlcclxuICAgICAgICB9XHJcbiAgICAgICAgYWRkU3lub255bXMoc3lub255bVJlYy5zeW5vbnltcywgc3lub255bVJlYy5jYXRlZ29yeSwgc3lub255bVJlYy5mYWN0LCBiaXRpbmRleCwgYml0aW5kZXgsIElNYXRjaC5XT1JEVFlQRS5GQUNULFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9Nb2RlbC5tUnVsZXMsIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG4vKlxyXG5mdW5jdGlvbiBsb2FkTW9kZWxQKG1vbmdvb3NlSG5kbCA6IG1vbmdvb3NlLk1vbmdvb3NlLCBtb2RlbFBhdGg6IHN0cmluZywgY29ubmVjdGlvblN0cmluZyA6IHN0cmluZykgOiBQcm9taXNlPElNYXRjaC5JTW9kZWxzPiB7XHJcbiAgICB2YXIgbW9uZ29vc2VYID0gbW9uZ29vc2VIbmRsIHx8IG1vbmdvb3NlO1xyXG4gICAgdmFyIGNvbm5TdHIgPSBjb25uZWN0aW9uU3RyaW5nIHx8ICdtb25nb2RiOi8vbG9jYWxob3N0L3Rlc3RkYic7XHJcbiAgICByZXR1cm4gTW9uZ29VdGlscy5vcGVuTW9uZ29vc2UobW9uZ29vc2VYLCBjb25uU3RyKS50aGVuKFxyXG4gICAgICAgICgpID0+IGdldE1vbmdvSGFuZGxlKG1vbmdvb3NlWClcclxuICAgICkudGhlbiggKG1vZGVsSGFuZGxlIDogSU1hdGNoLklNb2RlbEhhbmRsZVJhdykgPT4gX2xvYWRNb2RlbHNGdWxsKG1vZGVsSGFuZGxlLCBtb2RlbFBhdGgpXHJcbiAgICApO1xyXG59O1xyXG4qL1xyXG5cclxuXHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGxvYWRNb2RlbChtb2RlbEhhbmRsZTogSU1hdGNoLklNb2RlbEhhbmRsZVJhdywgc01vZGVsTmFtZTogc3RyaW5nLCBvTW9kZWw6IElNYXRjaC5JTW9kZWxzKTogUHJvbWlzZTxhbnk+IHtcclxuICAgIGRlYnVnbG9nKFwiIGxvYWRpbmcgXCIgKyBzTW9kZWxOYW1lICsgXCIgLi4uLlwiKTtcclxuICAgIC8vdmFyIG9NZGwgPSByZWFkRmlsZUFzSlNPTignLi8nICsgbW9kZWxQYXRoICsgJy8nICsgc01vZGVsTmFtZSArIFwiLm1vZGVsLmpzb25cIikgYXMgSU1vZGVsO1xyXG4gICAgdmFyIG9NZGwgPSBtYWtlTWRsTW9uZ28obW9kZWxIYW5kbGUsIHNNb2RlbE5hbWUsIG9Nb2RlbCk7XHJcbiAgICByZXR1cm4gbG9hZE1vZGVsRGF0YU1vbmdvKG1vZGVsSGFuZGxlLCBvTWRsLCBzTW9kZWxOYW1lLCBvTW9kZWwpO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEFsbERvbWFpbnNCaXRJbmRleChvTW9kZWw6IElNYXRjaC5JTW9kZWxzKTogbnVtYmVyIHtcclxuICAgIHZhciBsZW4gPSBvTW9kZWwuZG9tYWlucy5sZW5ndGg7XHJcbiAgICB2YXIgcmVzID0gMDtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcclxuICAgICAgICByZXMgPSByZXMgPDwgMTtcclxuICAgICAgICByZXMgPSByZXMgfCAweDAwMDE7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RG9tYWluQml0SW5kZXgoZG9tYWluOiBzdHJpbmcsIG9Nb2RlbDogSU1hdGNoLklNb2RlbHMpOiBudW1iZXIge1xyXG4gICAgdmFyIGluZGV4ID0gb01vZGVsLmRvbWFpbnMuaW5kZXhPZihkb21haW4pO1xyXG4gICAgaWYgKGluZGV4IDwgMCkge1xyXG4gICAgICAgIGluZGV4ID0gb01vZGVsLmRvbWFpbnMubGVuZ3RoO1xyXG4gICAgfVxyXG4gICAgaWYgKGluZGV4ID49IDMyKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidG9vIG1hbnkgZG9tYWluIGZvciBzaW5nbGUgMzIgYml0IGluZGV4XCIpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIDB4MDAwMSA8PCBpbmRleDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldERvbWFpbkJpdEluZGV4U2FmZShkb21haW46IHN0cmluZywgb01vZGVsOiBJTWF0Y2guSU1vZGVscyk6IG51bWJlciB7XHJcbiAgICB2YXIgaW5kZXggPSBvTW9kZWwuZG9tYWlucy5pbmRleE9mKGRvbWFpbik7XHJcbiAgICBpZiAoaW5kZXggPCAwKSB7XHJcbiAgICAgICAgdGhyb3cgRXJyb3IoJ2V4cGVjdGVkIGRvbWFpbiB0byBiZSByZWdpc3RlcmVkPz8/ICcpO1xyXG4gICAgfVxyXG4gICAgaWYgKGluZGV4ID49IDMyKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidG9vIG1hbnkgZG9tYWluIGZvciBzaW5nbGUgMzIgYml0IGluZGV4XCIpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIDB4MDAwMSA8PCBpbmRleDtcclxufVxyXG5cclxuXHJcblxyXG4vKipcclxuICogR2l2ZW4gYSBiaXRmaWVsZCwgcmV0dXJuIGFuIHVuc29ydGVkIHNldCBvZiBkb21haW5zIG1hdGNoaW5nIHByZXNlbnQgYml0c1xyXG4gKiBAcGFyYW0gb01vZGVsXHJcbiAqIEBwYXJhbSBiaXRmaWVsZFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldERvbWFpbnNGb3JCaXRGaWVsZChvTW9kZWw6IElNYXRjaC5JTW9kZWxzLCBiaXRmaWVsZDogbnVtYmVyKTogc3RyaW5nW10ge1xyXG4gICAgcmV0dXJuIG9Nb2RlbC5kb21haW5zLmZpbHRlcihkb21haW4gPT5cclxuICAgICAgICAoZ2V0RG9tYWluQml0SW5kZXgoZG9tYWluLCBvTW9kZWwpICYgYml0ZmllbGQpXHJcbiAgICApO1xyXG59XHJcblxyXG4vKlxyXG5mdW5jdGlvbiBtZXJnZU1vZGVsSnNvbihzTW9kZWxOYW1lOiBzdHJpbmcsIG9NZGw6IElNb2RlbCwgb01vZGVsOiBJTWF0Y2guSU1vZGVscykge1xyXG4gICAgdmFyIGNhdGVnb3J5RGVzY3JpYmVkTWFwID0ge30gYXMgeyBba2V5OiBzdHJpbmddOiBJTWF0Y2guSUNhdGVnb3J5RGVzYyB9O1xyXG4gICAgb01kbC5iaXRpbmRleCA9IGdldERvbWFpbkJpdEluZGV4KG9NZGwuZG9tYWluLCBvTW9kZWwpO1xyXG4gICAgb01kbC5jYXRlZ29yeURlc2NyaWJlZCA9IFtdO1xyXG4gICAgLy8gcmVjdGlmeSBjYXRlZ29yeVxyXG4gICAgb01kbC5jYXRlZ29yeSA9IG9NZGwuY2F0ZWdvcnkubWFwKGZ1bmN0aW9uIChjYXQ6IGFueSkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgY2F0ID09PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjYXQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0eXBlb2YgY2F0Lm5hbWUgIT09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJNaXNzaW5nIG5hbWUgaW4gb2JqZWN0IHR5cGVkIGNhdGVnb3J5IGluIFwiICsgSlNPTi5zdHJpbmdpZnkoY2F0KSArIFwiIGluIG1vZGVsIFwiICsgc01vZGVsTmFtZSk7XHJcbiAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgtMSk7XHJcbiAgICAgICAgICAgIC8vdGhyb3cgbmV3IEVycm9yKCdEb21haW4gJyArIG9NZGwuZG9tYWluICsgJyBhbHJlYWR5IGxvYWRlZCB3aGlsZSBsb2FkaW5nICcgKyBzTW9kZWxOYW1lICsgJz8nKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0ZWdvcnlEZXNjcmliZWRNYXBbY2F0Lm5hbWVdID0gY2F0O1xyXG4gICAgICAgIG9NZGwuY2F0ZWdvcnlEZXNjcmliZWQucHVzaChjYXQpO1xyXG4gICAgICAgIHJldHVybiBjYXQubmFtZTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGFkZCB0aGUgY2F0ZWdvcmllcyB0byB0aGUgbW9kZWw6XHJcbiAgICBvTWRsLmNhdGVnb3J5LmZvckVhY2goZnVuY3Rpb24gKGNhdGVnb3J5KSB7XHJcbiAgICAgICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCB7XHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBcImNhdGVnb3J5XCIsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IGNhdGVnb3J5LFxyXG4gICAgICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQsXHJcbiAgICAgICAgICAgIHdvcmQ6IGNhdGVnb3J5LFxyXG4gICAgICAgICAgICBsb3dlcmNhc2V3b3JkOiBjYXRlZ29yeS50b0xvd2VyQ2FzZSgpLFxyXG4gICAgICAgICAgICBiaXRpbmRleDogb01kbC5iaXRpbmRleCxcclxuICAgICAgICAgICAgd29yZFR5cGUgOiBJTWF0Y2guV09SRFRZUEUuQ0FURUdPUlksXHJcbiAgICAgICAgICAgIGJpdFNlbnRlbmNlQW5kIDogb01kbC5iaXRpbmRleCxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IDAuOTVcclxuICAgICAgICB9LCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGlmIChvTW9kZWwuZG9tYWlucy5pbmRleE9mKG9NZGwuZG9tYWluKSA+PSAwKSB7XHJcbiAgICAgICAgZGVidWdsb2coXCIqKioqKioqKioqKmhlcmUgbWRsXCIgKyBKU09OLnN0cmluZ2lmeShvTWRsLCB1bmRlZmluZWQsIDIpKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RvbWFpbiAnICsgb01kbC5kb21haW4gKyAnIGFscmVhZHkgbG9hZGVkIHdoaWxlIGxvYWRpbmcgJyArIHNNb2RlbE5hbWUgKyAnPycpO1xyXG4gICAgfVxyXG4gICAgLy8gY2hlY2sgcHJvcGVydGllcyBvZiBtb2RlbFxyXG4gICAgT2JqZWN0LmtleXMob01kbCkuc29ydCgpLmZvckVhY2goZnVuY3Rpb24gKHNQcm9wZXJ0eSkge1xyXG4gICAgICAgIGlmIChBUlJfTU9ERUxfUFJPUEVSVElFUy5pbmRleE9mKHNQcm9wZXJ0eSkgPCAwKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTW9kZWwgcHJvcGVydHkgXCInICsgc1Byb3BlcnR5ICsgJ1wiIG5vdCBhIGtub3duIG1vZGVsIHByb3BlcnR5IGluIG1vZGVsIG9mIGRvbWFpbiAnICsgb01kbC5kb21haW4gKyAnICcpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgLy8gY29uc2lkZXIgc3RyZWFtbGluaW5nIHRoZSBjYXRlZ29yaWVzXHJcbiAgICBvTW9kZWwucmF3TW9kZWxzW29NZGwuZG9tYWluXSA9IG9NZGw7XHJcblxyXG4gICAgb01vZGVsLmZ1bGwuZG9tYWluW29NZGwuZG9tYWluXSA9IHtcclxuICAgICAgICBkZXNjcmlwdGlvbjogb01kbC5kZXNjcmlwdGlvbixcclxuICAgICAgICBjYXRlZ29yaWVzOiBjYXRlZ29yeURlc2NyaWJlZE1hcCxcclxuICAgICAgICBiaXRpbmRleDogb01kbC5iaXRpbmRleFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBjaGVjayB0aGF0XHJcblxyXG5cclxuICAgIC8vIGNoZWNrIHRoYXQgbWVtYmVycyBvZiB3b3JkaW5kZXggYXJlIGluIGNhdGVnb3JpZXMsXHJcbiAgICBvTWRsLndvcmRpbmRleCA9IG9NZGwud29yZGluZGV4IHx8IFtdO1xyXG4gICAgb01kbC53b3JkaW5kZXguZm9yRWFjaChmdW5jdGlvbiAoc1dvcmRJbmRleCkge1xyXG4gICAgICAgIGlmIChvTWRsLmNhdGVnb3J5LmluZGV4T2Yoc1dvcmRJbmRleCkgPCAwKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTW9kZWwgd29yZGluZGV4IFwiJyArIHNXb3JkSW5kZXggKyAnXCIgbm90IGEgY2F0ZWdvcnkgb2YgZG9tYWluICcgKyBvTWRsLmRvbWFpbiArICcgJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICBvTWRsLmV4YWN0bWF0Y2ggPSBvTWRsLmV4YWN0bWF0Y2ggfHwgW107XHJcbiAgICBvTWRsLmV4YWN0bWF0Y2guZm9yRWFjaChmdW5jdGlvbiAoc0V4YWN0TWF0Y2gpIHtcclxuICAgICAgICBpZiAob01kbC5jYXRlZ29yeS5pbmRleE9mKHNFeGFjdE1hdGNoKSA8IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNb2RlbCBleGFjdG1hdGNoIFwiJyArIHNFeGFjdE1hdGNoICsgJ1wiIG5vdCBhIGNhdGVnb3J5IG9mIGRvbWFpbiAnICsgb01kbC5kb21haW4gKyAnICcpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgb01kbC5jb2x1bW5zID0gb01kbC5jb2x1bW5zIHx8IFtdO1xyXG4gICAgb01kbC5jb2x1bW5zLmZvckVhY2goZnVuY3Rpb24gKHNFeGFjdE1hdGNoKSB7XHJcbiAgICAgICAgaWYgKG9NZGwuY2F0ZWdvcnkuaW5kZXhPZihzRXhhY3RNYXRjaCkgPCAwKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTW9kZWwgY29sdW1uIFwiJyArIHNFeGFjdE1hdGNoICsgJ1wiIG5vdCBhIGNhdGVnb3J5IG9mIGRvbWFpbiAnICsgb01kbC5kb21haW4gKyAnICcpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuXHJcbiAgICAvLyBhZGQgcmVsYXRpb24gZG9tYWluIC0+IGNhdGVnb3J5XHJcbiAgICB2YXIgZG9tYWluU3RyID0gTWV0YUYuRG9tYWluKG9NZGwuZG9tYWluKS50b0Z1bGxTdHJpbmcoKTtcclxuICAgIHZhciByZWxhdGlvblN0ciA9IE1ldGFGLlJlbGF0aW9uKE1ldGEuUkVMQVRJT05faGFzQ2F0ZWdvcnkpLnRvRnVsbFN0cmluZygpO1xyXG4gICAgdmFyIHJldmVyc2VSZWxhdGlvblN0ciA9IE1ldGFGLlJlbGF0aW9uKE1ldGEuUkVMQVRJT05faXNDYXRlZ29yeU9mKS50b0Z1bGxTdHJpbmcoKTtcclxuICAgIG9NZGwuY2F0ZWdvcnkuZm9yRWFjaChmdW5jdGlvbiAoc0NhdGVnb3J5KSB7XHJcblxyXG4gICAgICAgIHZhciBDYXRlZ29yeVN0cmluZyA9IE1ldGFGLkNhdGVnb3J5KHNDYXRlZ29yeSkudG9GdWxsU3RyaW5nKCk7XHJcbiAgICAgICAgb01vZGVsLm1ldGEudDNbZG9tYWluU3RyXSA9IG9Nb2RlbC5tZXRhLnQzW2RvbWFpblN0cl0gfHwge307XHJcbiAgICAgICAgb01vZGVsLm1ldGEudDNbZG9tYWluU3RyXVtyZWxhdGlvblN0cl0gPSBvTW9kZWwubWV0YS50M1tkb21haW5TdHJdW3JlbGF0aW9uU3RyXSB8fCB7fTtcclxuICAgICAgICBvTW9kZWwubWV0YS50M1tkb21haW5TdHJdW3JlbGF0aW9uU3RyXVtDYXRlZ29yeVN0cmluZ10gPSB7fTtcclxuXHJcbiAgICAgICAgb01vZGVsLm1ldGEudDNbQ2F0ZWdvcnlTdHJpbmddID0gb01vZGVsLm1ldGEudDNbQ2F0ZWdvcnlTdHJpbmddIHx8IHt9O1xyXG4gICAgICAgIG9Nb2RlbC5tZXRhLnQzW0NhdGVnb3J5U3RyaW5nXVtyZXZlcnNlUmVsYXRpb25TdHJdID0gb01vZGVsLm1ldGEudDNbQ2F0ZWdvcnlTdHJpbmddW3JldmVyc2VSZWxhdGlvblN0cl0gfHwge307XHJcbiAgICAgICAgb01vZGVsLm1ldGEudDNbQ2F0ZWdvcnlTdHJpbmddW3JldmVyc2VSZWxhdGlvblN0cl1bZG9tYWluU3RyXSA9IHt9O1xyXG5cclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGFkZCBhIHByZWNpY2UgZG9tYWluIG1hdGNocnVsZVxyXG4gICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCB7XHJcbiAgICAgICAgY2F0ZWdvcnk6IFwiZG9tYWluXCIsXHJcbiAgICAgICAgbWF0Y2hlZFN0cmluZzogb01kbC5kb21haW4sXHJcbiAgICAgICAgdHlwZTogSU1hdGNoLkVudW1SdWxlVHlwZS5XT1JELFxyXG4gICAgICAgIHdvcmQ6IG9NZGwuZG9tYWluLFxyXG4gICAgICAgIGJpdGluZGV4OiBvTWRsLmJpdGluZGV4LFxyXG4gICAgICAgIGJpdFNlbnRlbmNlQW5kIDogb01kbC5iaXRpbmRleCxcclxuICAgICAgICB3b3JkVHlwZSA6IFwiRFwiLFxyXG4gICAgICAgIF9yYW5raW5nOiAwLjk1XHJcbiAgICB9LCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuXHJcbiAgICAvLyBjaGVjayB0aGUgdG9vbFxyXG4gICAgaWYgKG9NZGwudG9vbCAmJiBvTWRsLnRvb2wucmVxdWlyZXMpIHtcclxuICAgICAgICB2YXIgcmVxdWlyZXMgPSBPYmplY3Qua2V5cyhvTWRsLnRvb2wucmVxdWlyZXMgfHwge30pO1xyXG4gICAgICAgIHZhciBkaWZmID0gXy5kaWZmZXJlbmNlKHJlcXVpcmVzLCBvTWRsLmNhdGVnb3J5KTtcclxuICAgICAgICBpZiAoZGlmZi5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgJHtvTWRsLmRvbWFpbn0gOiBVbmtvd24gY2F0ZWdvcnkgaW4gcmVxdWlyZXMgb2YgdG9vbDogXCJgICsgZGlmZi5qb2luKCdcIicpICsgJ1wiJyk7XHJcbiAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgtMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBvcHRpb25hbCA9IE9iamVjdC5rZXlzKG9NZGwudG9vbC5vcHRpb25hbCk7XHJcbiAgICAgICAgZGlmZiA9IF8uZGlmZmVyZW5jZShvcHRpb25hbCwgb01kbC5jYXRlZ29yeSk7XHJcbiAgICAgICAgaWYgKGRpZmYubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgICR7b01kbC5kb21haW59IDogVW5rb3duIGNhdGVnb3J5IG9wdGlvbmFsIG9mIHRvb2w6IFwiYCArIGRpZmYuam9pbignXCInKSArICdcIicpO1xyXG4gICAgICAgICAgICBwcm9jZXNzLmV4aXQoLTEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBPYmplY3Qua2V5cyhvTWRsLnRvb2wuc2V0cyB8fCB7fSkuZm9yRWFjaChmdW5jdGlvbiAoc2V0SUQpIHtcclxuICAgICAgICAgICAgdmFyIGRpZmYgPSBfLmRpZmZlcmVuY2Uob01kbC50b29sLnNldHNbc2V0SURdLnNldCwgb01kbC5jYXRlZ29yeSk7XHJcbiAgICAgICAgICAgIGlmIChkaWZmLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgJHtvTWRsLmRvbWFpbn0gOiBVbmtvd24gY2F0ZWdvcnkgaW4gc2V0SWQgJHtzZXRJRH0gb2YgdG9vbDogXCJgICsgZGlmZi5qb2luKCdcIicpICsgJ1wiJyk7XHJcbiAgICAgICAgICAgICAgICBwcm9jZXNzLmV4aXQoLTEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIGV4dHJhY3QgdG9vbHMgYW4gYWRkIHRvIHRvb2xzOlxyXG4gICAgICAgIG9Nb2RlbC50b29scy5maWx0ZXIoZnVuY3Rpb24gKG9FbnRyeSkge1xyXG4gICAgICAgICAgICBpZiAob0VudHJ5Lm5hbWUgPT09IChvTWRsLnRvb2wgJiYgb01kbC50b29sLm5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlRvb2wgXCIgKyBvTWRsLnRvb2wubmFtZSArIFwiIGFscmVhZHkgcHJlc2VudCB3aGVuIGxvYWRpbmcgXCIgKyBzTW9kZWxOYW1lKTtcclxuICAgICAgICAgICAgICAgIC8vdGhyb3cgbmV3IEVycm9yKCdEb21haW4gYWxyZWFkeSBsb2FkZWQ/Jyk7XHJcbiAgICAgICAgICAgICAgICBwcm9jZXNzLmV4aXQoLTEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIG9NZGwudG9vbGhpZGRlbiA9IHRydWU7XHJcbiAgICAgICAgb01kbC50b29sLnJlcXVpcmVzID0geyBcImltcG9zc2libGVcIjoge30gfTtcclxuICAgIH1cclxuICAgIC8vIGFkZCB0aGUgdG9vbCBuYW1lIGFzIHJ1bGUgdW5sZXNzIGhpZGRlblxyXG4gICAgaWYgKCFvTWRsLnRvb2xoaWRkZW4gJiYgb01kbC50b29sICYmIG9NZGwudG9vbC5uYW1lKSB7XHJcbiAgICAgICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCB7XHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBcInRvb2xcIixcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb01kbC50b29sLm5hbWUsXHJcbiAgICAgICAgICAgIHR5cGU6IElNYXRjaC5FbnVtUnVsZVR5cGUuV09SRCxcclxuICAgICAgICAgICAgd29yZDogb01kbC50b29sLm5hbWUsXHJcbiAgICAgICAgICAgIGJpdGluZGV4OiBvTWRsLmJpdGluZGV4LFxyXG4gICAgICAgICAgICBiaXRTZW50ZW5jZUFuZCA6IG9NZGwuYml0aW5kZXgsXHJcbiAgICAgICAgICAgIHdvcmRUeXBlIDogSU1hdGNoLldPUkRUWVBFLlRPT0wsXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiAwLjk1XHJcbiAgICAgICAgfSwgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICB9O1xyXG4gICAgaWYgKG9NZGwuc3lub255bXMgJiYgb01kbC5zeW5vbnltc1tcInRvb2xcIl0pIHtcclxuICAgICAgICBhZGRTeW5vbnltcyhvTWRsLnN5bm9ueW1zW1widG9vbFwiXSwgXCJ0b29sXCIsIG9NZGwudG9vbC5uYW1lLCBvTWRsLmJpdGluZGV4LFxyXG4gICAgICAgIG9NZGwuYml0aW5kZXgsIElNYXRjaC5XT1JEVFlQRS5UT09MLCBvTW9kZWwubVJ1bGVzLCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgIH07XHJcbiAgICBpZiAob01kbC5zeW5vbnltcykge1xyXG4gICAgICAgIE9iamVjdC5rZXlzKG9NZGwuc3lub255bXMpLmZvckVhY2goZnVuY3Rpb24gKHNzeW5rZXkpIHtcclxuICAgICAgICAgICAgaWYgKG9NZGwuY2F0ZWdvcnkuaW5kZXhPZihzc3lua2V5KSA+PSAwICYmIHNzeW5rZXkgIT09IFwidG9vbFwiKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAob01vZGVsLmZ1bGwuZG9tYWluW29NZGwuZG9tYWluXS5jYXRlZ29yaWVzW3NzeW5rZXldKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb01vZGVsLmZ1bGwuZG9tYWluW29NZGwuZG9tYWluXS5jYXRlZ29yaWVzW3NzeW5rZXldLmNhdGVnb3J5X3N5bm9ueW1zID0gb01kbC5zeW5vbnltc1tzc3lua2V5XTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGFkZFN5bm9ueW1zKG9NZGwuc3lub255bXNbc3N5bmtleV0sIFwiY2F0ZWdvcnlcIiwgc3N5bmtleSwgb01kbC5iaXRpbmRleCwgb01kbC5iaXRpbmRleCxcclxuICAgICAgICAgICAgICAgIElNYXRjaC5XT1JEVFlQRS5DQVRFR09SWSwgb01vZGVsLm1SdWxlcywgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIG9Nb2RlbC5kb21haW5zLnB1c2gob01kbC5kb21haW4pO1xyXG4gICAgaWYgKG9NZGwudG9vbC5uYW1lKSB7XHJcbiAgICAgICAgb01vZGVsLnRvb2xzLnB1c2gob01kbC50b29sKTtcclxuICAgIH1cclxuICAgIG9Nb2RlbC5jYXRlZ29yeSA9IG9Nb2RlbC5jYXRlZ29yeS5jb25jYXQob01kbC5jYXRlZ29yeSk7XHJcbiAgICBvTW9kZWwuY2F0ZWdvcnkuc29ydCgpO1xyXG4gICAgb01vZGVsLmNhdGVnb3J5ID0gb01vZGVsLmNhdGVnb3J5LmZpbHRlcihmdW5jdGlvbiAoc3RyaW5nLCBpbmRleCkge1xyXG4gICAgICAgIHJldHVybiBvTW9kZWwuY2F0ZWdvcnlbaW5kZXhdICE9PSBvTW9kZWwuY2F0ZWdvcnlbaW5kZXggKyAxXTtcclxuICAgIH0pO1xyXG5cclxufSAvLyBsb2FkbW9kZWxcclxuKi9cclxuXHJcbmZ1bmN0aW9uIG1ha2VNZGxNb25nbyhtb2RlbEhhbmRsZTogSU1hdGNoLklNb2RlbEhhbmRsZVJhdywgc01vZGVsTmFtZTogc3RyaW5nLCBvTW9kZWw6IElNYXRjaC5JTW9kZWxzKTogSU1vZGVsIHtcclxuICAgIHZhciBtb2RlbERvYyA9IG1vZGVsSGFuZGxlLm1vZGVsRG9jc1tzTW9kZWxOYW1lXTtcclxuICAgIHZhciBvTWRsID0ge1xyXG4gICAgICAgIGJpdGluZGV4OiBnZXREb21haW5CaXRJbmRleFNhZmUobW9kZWxEb2MuZG9tYWluLCBvTW9kZWwpLFxyXG4gICAgICAgIGRvbWFpbjogbW9kZWxEb2MuZG9tYWluLFxyXG4gICAgICAgIG1vZGVsbmFtZTogc01vZGVsTmFtZSxcclxuICAgICAgICBkZXNjcmlwdGlvbjogbW9kZWxEb2MuZG9tYWluX2Rlc2NyaXB0aW9uXHJcbiAgICB9IGFzIElNb2RlbDtcclxuICAgIHZhciBjYXRlZ29yeURlc2NyaWJlZE1hcCA9IHt9IGFzIHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklDYXRlZ29yeURlc2MgfTtcclxuXHJcbiAgICBvTWRsLmJpdGluZGV4ID0gZ2V0RG9tYWluQml0SW5kZXhTYWZlKG1vZGVsRG9jLmRvbWFpbiwgb01vZGVsKTtcclxuICAgIG9NZGwuY2F0ZWdvcnkgPSBtb2RlbERvYy5fY2F0ZWdvcmllcy5tYXAoY2F0ID0+IGNhdC5jYXRlZ29yeSk7XHJcbiAgICBvTWRsLmNhdGVnb3J5RGVzY3JpYmVkID0gW107XHJcbiAgICBtb2RlbERvYy5fY2F0ZWdvcmllcy5mb3JFYWNoKGNhdCA9PiB7XHJcbiAgICAgICAgb01kbC5jYXRlZ29yeURlc2NyaWJlZC5wdXNoKHtcclxuICAgICAgICAgICAgbmFtZTogY2F0LmNhdGVnb3J5LFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogY2F0LmNhdGVnb3J5X2Rlc2NyaXB0aW9uXHJcbiAgICAgICAgfSlcclxuICAgICAgICBjYXRlZ29yeURlc2NyaWJlZE1hcFtjYXQuY2F0ZWdvcnldID0gY2F0O1xyXG4gICAgfSk7XHJcblxyXG4gICAgb01kbC5jYXRlZ29yeSA9IG1vZGVsRG9jLl9jYXRlZ29yaWVzLm1hcChjYXQgPT4gY2F0LmNhdGVnb3J5KTtcclxuXHJcbiAgICAvKiAvLyByZWN0aWZ5IGNhdGVnb3J5XHJcbiAgICAgb01kbC5jYXRlZ29yeSA9IG9NZGwuY2F0ZWdvcnkubWFwKGZ1bmN0aW9uIChjYXQ6IGFueSkge1xyXG4gICAgICAgICBpZiAodHlwZW9mIGNhdCA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICAgcmV0dXJuIGNhdDtcclxuICAgICAgICAgfVxyXG4gICAgICAgICBpZiAodHlwZW9mIGNhdC5uYW1lICE9PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIk1pc3NpbmcgbmFtZSBpbiBvYmplY3QgdHlwZWQgY2F0ZWdvcnkgaW4gXCIgKyBKU09OLnN0cmluZ2lmeShjYXQpICsgXCIgaW4gbW9kZWwgXCIgKyBzTW9kZWxOYW1lKTtcclxuICAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgtMSk7XHJcbiAgICAgICAgICAgICAvL3Rocm93IG5ldyBFcnJvcignRG9tYWluICcgKyBvTWRsLmRvbWFpbiArICcgYWxyZWFkeSBsb2FkZWQgd2hpbGUgbG9hZGluZyAnICsgc01vZGVsTmFtZSArICc/Jyk7XHJcbiAgICAgICAgIH1cclxuICAgICAgICAgY2F0ZWdvcnlEZXNjcmliZWRNYXBbY2F0Lm5hbWVdID0gY2F0O1xyXG4gICAgICAgICBvTWRsLmNhdGVnb3J5RGVzY3JpYmVkLnB1c2goY2F0KTtcclxuICAgICAgICAgcmV0dXJuIGNhdC5uYW1lO1xyXG4gICAgIH0pO1xyXG4gICAgICovXHJcblxyXG4gICAgLy8gYWRkIHRoZSBjYXRlZ29yaWVzIHRvIHRoZSBydWxlc1xyXG4gICAgb01kbC5jYXRlZ29yeS5mb3JFYWNoKGZ1bmN0aW9uIChjYXRlZ29yeSkge1xyXG4gICAgICAgIGluc2VydFJ1bGVJZk5vdFByZXNlbnQob01vZGVsLm1SdWxlcywge1xyXG4gICAgICAgICAgICBjYXRlZ29yeTogXCJjYXRlZ29yeVwiLFxyXG4gICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBjYXRlZ29yeSxcclxuICAgICAgICAgICAgdHlwZTogSU1hdGNoLkVudW1SdWxlVHlwZS5XT1JELFxyXG4gICAgICAgICAgICB3b3JkOiBjYXRlZ29yeSxcclxuICAgICAgICAgICAgbG93ZXJjYXNld29yZDogY2F0ZWdvcnkudG9Mb3dlckNhc2UoKSxcclxuICAgICAgICAgICAgYml0aW5kZXg6IG9NZGwuYml0aW5kZXgsXHJcbiAgICAgICAgICAgIHdvcmRUeXBlOiBJTWF0Y2guV09SRFRZUEUuQ0FURUdPUlksXHJcbiAgICAgICAgICAgIGJpdFNlbnRlbmNlQW5kOiBvTWRsLmJpdGluZGV4LFxyXG4gICAgICAgICAgICBfcmFua2luZzogMC45NVxyXG4gICAgICAgIH0sIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gYWRkIHN5bm9uYW55bSBmb3IgdGhlIGNhdGVnb3JpZXMgdG8gdGhlXHJcblxyXG4gICAgbW9kZWxEb2MuX2NhdGVnb3JpZXMuZm9yRWFjaChjYXQgPT4ge1xyXG4gICAgICAgIGFkZFN5bm9ueW1zXHJcblxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKG9Nb2RlbC5kb21haW5zLmluZGV4T2Yob01kbC5kb21haW4pIDwgMCkge1xyXG4gICAgICAgIGRlYnVnbG9nKFwiKioqKioqKioqKipoZXJlIG1kbFwiICsgSlNPTi5zdHJpbmdpZnkob01kbCwgdW5kZWZpbmVkLCAyKSk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdEb21haW4gJyArIG9NZGwuZG9tYWluICsgJyBhbHJlYWR5IGxvYWRlZCB3aGlsZSBsb2FkaW5nICcgKyBzTW9kZWxOYW1lICsgJz8nKTtcclxuICAgIH1cclxuICAgIC8qXHJcbiAgICAvLyBjaGVjayBwcm9wZXJ0aWVzIG9mIG1vZGVsXHJcbiAgICBPYmplY3Qua2V5cyhvTWRsKS5zb3J0KCkuZm9yRWFjaChmdW5jdGlvbiAoc1Byb3BlcnR5KSB7XHJcbiAgICAgICAgaWYgKEFSUl9NT0RFTF9QUk9QRVJUSUVTLmluZGV4T2Yoc1Byb3BlcnR5KSA8IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNb2RlbCBwcm9wZXJ0eSBcIicgKyBzUHJvcGVydHkgKyAnXCIgbm90IGEga25vd24gbW9kZWwgcHJvcGVydHkgaW4gbW9kZWwgb2YgZG9tYWluICcgKyBvTWRsLmRvbWFpbiArICcgJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICAqL1xyXG5cclxuICAgIC8vIGNvbnNpZGVyIHN0cmVhbWxpbmluZyB0aGUgY2F0ZWdvcmllc1xyXG4gICAgb01vZGVsLnJhd01vZGVsc1tvTWRsLmRvbWFpbl0gPSBvTWRsO1xyXG5cclxuICAgIG9Nb2RlbC5mdWxsLmRvbWFpbltvTWRsLmRvbWFpbl0gPSB7XHJcbiAgICAgICAgZGVzY3JpcHRpb246IG9NZGwuZGVzY3JpcHRpb24sXHJcbiAgICAgICAgY2F0ZWdvcmllczogY2F0ZWdvcnlEZXNjcmliZWRNYXAsXHJcbiAgICAgICAgYml0aW5kZXg6IG9NZGwuYml0aW5kZXhcclxuICAgIH07XHJcblxyXG4gICAgLy8gY2hlY2sgdGhhdFxyXG5cclxuXHJcbiAgICAvLyBjaGVjayB0aGF0IG1lbWJlcnMgb2Ygd29yZGluZGV4IGFyZSBpbiBjYXRlZ29yaWVzLFxyXG4gICAgLyogb01kbC53b3JkaW5kZXggPSBvTW9kZWxEb2Mub01kbC53b3JkaW5kZXggfHwgW107XHJcbiAgICAgb01kbC53b3JkaW5kZXguZm9yRWFjaChmdW5jdGlvbiAoc1dvcmRJbmRleCkge1xyXG4gICAgICAgICBpZiAob01kbC5jYXRlZ29yeS5pbmRleE9mKHNXb3JkSW5kZXgpIDwgMCkge1xyXG4gICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNb2RlbCB3b3JkaW5kZXggXCInICsgc1dvcmRJbmRleCArICdcIiBub3QgYSBjYXRlZ29yeSBvZiBkb21haW4gJyArIG9NZGwuZG9tYWluICsgJyAnKTtcclxuICAgICAgICAgfVxyXG4gICAgIH0pO1xyXG4gICAgICovXHJcbiAgICAvKlxyXG4gICAgb01kbC5leGFjdG1hdGNoID0gb01kbC5leGFjdG1hdGNoIHx8IFtdO1xyXG4gICAgb01kbC5leGFjdG1hdGNoLmZvckVhY2goZnVuY3Rpb24gKHNFeGFjdE1hdGNoKSB7XHJcbiAgICAgICAgaWYgKG9NZGwuY2F0ZWdvcnkuaW5kZXhPZihzRXhhY3RNYXRjaCkgPCAwKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTW9kZWwgZXhhY3RtYXRjaCBcIicgKyBzRXhhY3RNYXRjaCArICdcIiBub3QgYSBjYXRlZ29yeSBvZiBkb21haW4gJyArIG9NZGwuZG9tYWluICsgJyAnKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICAgICovXHJcbiAgICBvTWRsLmNvbHVtbnMgPSBtb2RlbERvYy5jb2x1bW5zOyAvLyBvTWRsLmNvbHVtbnMgfHwgW107XHJcbiAgICBvTWRsLmNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoc0V4YWN0TWF0Y2gpIHtcclxuICAgICAgICBpZiAob01kbC5jYXRlZ29yeS5pbmRleE9mKHNFeGFjdE1hdGNoKSA8IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNb2RlbCBjb2x1bW4gXCInICsgc0V4YWN0TWF0Y2ggKyAnXCIgbm90IGEgY2F0ZWdvcnkgb2YgZG9tYWluICcgKyBvTWRsLmRvbWFpbiArICcgJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG5cclxuICAgIC8vIGFkZCByZWxhdGlvbiBkb21haW4gLT4gY2F0ZWdvcnlcclxuICAgIHZhciBkb21haW5TdHIgPSBNZXRhRi5Eb21haW4ob01kbC5kb21haW4pLnRvRnVsbFN0cmluZygpO1xyXG4gICAgdmFyIHJlbGF0aW9uU3RyID0gTWV0YUYuUmVsYXRpb24oTWV0YS5SRUxBVElPTl9oYXNDYXRlZ29yeSkudG9GdWxsU3RyaW5nKCk7XHJcbiAgICB2YXIgcmV2ZXJzZVJlbGF0aW9uU3RyID0gTWV0YUYuUmVsYXRpb24oTWV0YS5SRUxBVElPTl9pc0NhdGVnb3J5T2YpLnRvRnVsbFN0cmluZygpO1xyXG4gICAgb01kbC5jYXRlZ29yeS5mb3JFYWNoKGZ1bmN0aW9uIChzQ2F0ZWdvcnkpIHtcclxuXHJcbiAgICAgICAgdmFyIENhdGVnb3J5U3RyaW5nID0gTWV0YUYuQ2F0ZWdvcnkoc0NhdGVnb3J5KS50b0Z1bGxTdHJpbmcoKTtcclxuICAgICAgICBvTW9kZWwubWV0YS50M1tkb21haW5TdHJdID0gb01vZGVsLm1ldGEudDNbZG9tYWluU3RyXSB8fCB7fTtcclxuICAgICAgICBvTW9kZWwubWV0YS50M1tkb21haW5TdHJdW3JlbGF0aW9uU3RyXSA9IG9Nb2RlbC5tZXRhLnQzW2RvbWFpblN0cl1bcmVsYXRpb25TdHJdIHx8IHt9O1xyXG4gICAgICAgIG9Nb2RlbC5tZXRhLnQzW2RvbWFpblN0cl1bcmVsYXRpb25TdHJdW0NhdGVnb3J5U3RyaW5nXSA9IHt9O1xyXG5cclxuICAgICAgICBvTW9kZWwubWV0YS50M1tDYXRlZ29yeVN0cmluZ10gPSBvTW9kZWwubWV0YS50M1tDYXRlZ29yeVN0cmluZ10gfHwge307XHJcbiAgICAgICAgb01vZGVsLm1ldGEudDNbQ2F0ZWdvcnlTdHJpbmddW3JldmVyc2VSZWxhdGlvblN0cl0gPSBvTW9kZWwubWV0YS50M1tDYXRlZ29yeVN0cmluZ11bcmV2ZXJzZVJlbGF0aW9uU3RyXSB8fCB7fTtcclxuICAgICAgICBvTW9kZWwubWV0YS50M1tDYXRlZ29yeVN0cmluZ11bcmV2ZXJzZVJlbGF0aW9uU3RyXVtkb21haW5TdHJdID0ge307XHJcblxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gYWRkIGEgcHJlY2ljZSBkb21haW4gbWF0Y2hydWxlXHJcbiAgICBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG9Nb2RlbC5tUnVsZXMsIHtcclxuICAgICAgICBjYXRlZ29yeTogXCJkb21haW5cIixcclxuICAgICAgICBtYXRjaGVkU3RyaW5nOiBvTWRsLmRvbWFpbixcclxuICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQsXHJcbiAgICAgICAgd29yZDogb01kbC5kb21haW4sXHJcbiAgICAgICAgYml0aW5kZXg6IG9NZGwuYml0aW5kZXgsXHJcbiAgICAgICAgYml0U2VudGVuY2VBbmQ6IG9NZGwuYml0aW5kZXgsXHJcbiAgICAgICAgd29yZFR5cGU6IElNYXRjaC5XT1JEVFlQRS5ET01BSU4sXHJcbiAgICAgICAgX3Jhbmtpbmc6IDAuOTVcclxuICAgIH0sIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG5cclxuICAgIC8vIGFkZCBkb21haW4gc3lub255bXNcclxuICAgIGlmIChtb2RlbERvYy5kb21haW5fc3lub255bXMgJiYgbW9kZWxEb2MuZG9tYWluX3N5bm9ueW1zLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBhZGRTeW5vbnltcyhtb2RlbERvYy5kb21haW5fc3lub255bXMsIFwiZG9tYWluXCIsIG1vZGVsRG9jLmRvbWFpbiwgb01kbC5iaXRpbmRleCxcclxuICAgICAgICAgICAgb01kbC5iaXRpbmRleCwgSU1hdGNoLldPUkRUWVBFLkRPTUFJTiwgb01vZGVsLm1SdWxlcywgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgYWRkU3lub255bXMobW9kZWxEb2MuZG9tYWluX3N5bm9ueW1zLCBcImRvbWFpblwiLCBtb2RlbERvYy5kb21haW4sIGdldERvbWFpbkJpdEluZGV4U2FmZShET01BSU5fTUVUQU1PREVMLCBvTW9kZWwpLFxyXG4gICAgICAgICAgICAgICAgICBnZXREb21haW5CaXRJbmRleFNhZmUoRE9NQUlOX01FVEFNT0RFTCwgb01vZGVsKSxcclxuICAgICAgICAgICAgICAgIElNYXRjaC5XT1JEVFlQRS5GQUNULCBvTW9kZWwubVJ1bGVzLCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgICAgICAvLyBUT0RPOiBzeW5vbnltIGhhdmUgdG8gYmUgYWRkZWQgYXMgKkZBQ1QqIGZvciB0aGUgbWV0YW1vZGVsIVxyXG5cclxuICAgIH07XHJcblxyXG5cclxuICAgIC8qXHJcbiAgICAgICAgLy8gY2hlY2sgdGhlIHRvb2xcclxuICAgICAgICBpZiAob01kbC50b29sICYmIG9NZGwudG9vbC5yZXF1aXJlcykge1xyXG4gICAgICAgICAgICB2YXIgcmVxdWlyZXMgPSBPYmplY3Qua2V5cyhvTWRsLnRvb2wucmVxdWlyZXMgfHwge30pO1xyXG4gICAgICAgICAgICB2YXIgZGlmZiA9IF8uZGlmZmVyZW5jZShyZXF1aXJlcywgb01kbC5jYXRlZ29yeSk7XHJcbiAgICAgICAgICAgIGlmIChkaWZmLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgJHtvTWRsLmRvbWFpbn0gOiBVbmtvd24gY2F0ZWdvcnkgaW4gcmVxdWlyZXMgb2YgdG9vbDogXCJgICsgZGlmZi5qb2luKCdcIicpICsgJ1wiJyk7XHJcbiAgICAgICAgICAgICAgICBwcm9jZXNzLmV4aXQoLTEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciBvcHRpb25hbCA9IE9iamVjdC5rZXlzKG9NZGwudG9vbC5vcHRpb25hbCk7XHJcbiAgICAgICAgICAgIGRpZmYgPSBfLmRpZmZlcmVuY2Uob3B0aW9uYWwsIG9NZGwuY2F0ZWdvcnkpO1xyXG4gICAgICAgICAgICBpZiAoZGlmZi5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICR7b01kbC5kb21haW59IDogVW5rb3duIGNhdGVnb3J5IG9wdGlvbmFsIG9mIHRvb2w6IFwiYCArIGRpZmYuam9pbignXCInKSArICdcIicpO1xyXG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5leGl0KC0xKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhvTWRsLnRvb2wuc2V0cyB8fCB7fSkuZm9yRWFjaChmdW5jdGlvbiAoc2V0SUQpIHtcclxuICAgICAgICAgICAgICAgIHZhciBkaWZmID0gXy5kaWZmZXJlbmNlKG9NZGwudG9vbC5zZXRzW3NldElEXS5zZXQsIG9NZGwuY2F0ZWdvcnkpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGRpZmYubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgJHtvTWRsLmRvbWFpbn0gOiBVbmtvd24gY2F0ZWdvcnkgaW4gc2V0SWQgJHtzZXRJRH0gb2YgdG9vbDogXCJgICsgZGlmZi5qb2luKCdcIicpICsgJ1wiJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5leGl0KC0xKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBleHRyYWN0IHRvb2xzIGFuIGFkZCB0byB0b29sczpcclxuICAgICAgICAgICAgb01vZGVsLnRvb2xzLmZpbHRlcihmdW5jdGlvbiAob0VudHJ5KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAob0VudHJ5Lm5hbWUgPT09IChvTWRsLnRvb2wgJiYgb01kbC50b29sLm5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJUb29sIFwiICsgb01kbC50b29sLm5hbWUgKyBcIiBhbHJlYWR5IHByZXNlbnQgd2hlbiBsb2FkaW5nIFwiICsgc01vZGVsTmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy90aHJvdyBuZXcgRXJyb3IoJ0RvbWFpbiBhbHJlYWR5IGxvYWRlZD8nKTtcclxuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzLmV4aXQoLTEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBvTWRsLnRvb2xoaWRkZW4gPSB0cnVlO1xyXG4gICAgICAgICAgICBvTWRsLnRvb2wucmVxdWlyZXMgPSB7IFwiaW1wb3NzaWJsZVwiOiB7fSB9O1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBhZGQgdGhlIHRvb2wgbmFtZSBhcyBydWxlIHVubGVzcyBoaWRkZW5cclxuICAgICAgICBpZiAoIW9NZGwudG9vbGhpZGRlbiAmJiBvTWRsLnRvb2wgJiYgb01kbC50b29sLm5hbWUpIHtcclxuICAgICAgICAgICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCB7XHJcbiAgICAgICAgICAgICAgICBjYXRlZ29yeTogXCJ0b29sXCIsXHJcbiAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvTWRsLnRvb2wubmFtZSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IElNYXRjaC5FbnVtUnVsZVR5cGUuV09SRCxcclxuICAgICAgICAgICAgICAgIHdvcmQ6IG9NZGwudG9vbC5uYW1lLFxyXG4gICAgICAgICAgICAgICAgYml0aW5kZXg6IG9NZGwuYml0aW5kZXgsXHJcbiAgICAgICAgICAgICAgICBiaXRTZW50ZW5jZUFuZCA6IG9NZGwuYml0aW5kZXgsXHJcbiAgICAgICAgICAgICAgICB3b3JkVHlwZSA6IElNYXRjaC5XT1JEVFlQRS5UT09MLFxyXG4gICAgICAgICAgICAgICAgX3Jhbmtpbmc6IDAuOTVcclxuICAgICAgICAgICAgfSwgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBpZiAob01kbC5zeW5vbnltcyAmJiBvTWRsLnN5bm9ueW1zW1widG9vbFwiXSkge1xyXG4gICAgICAgICAgICBhZGRTeW5vbnltcyhvTWRsLnN5bm9ueW1zW1widG9vbFwiXSwgXCJ0b29sXCIsIG9NZGwudG9vbC5uYW1lLCBvTWRsLmJpdGluZGV4LFxyXG4gICAgICAgICAgICBvTWRsLmJpdGluZGV4LCBJTWF0Y2guV09SRFRZUEUuVE9PTCwgb01vZGVsLm1SdWxlcywgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAqL1xyXG5cclxuICAgIC8vIGFkZCBzeW5zb255bSBmb3IgdGhlIGRvbWFpbnNcclxuXHJcblxyXG4gICAgLy8gYWRkIHN5bm9ueW1zIGZvciB0aGUgY2F0ZWdvcmllc1xyXG5cclxuICAgIG1vZGVsRG9jLl9jYXRlZ29yaWVzLmZvckVhY2goY2F0ID0+IHtcclxuICAgICAgICBpZiAoY2F0LmNhdGVnb3J5X3N5bm9ueW1zICYmIGNhdC5jYXRlZ29yeV9zeW5vbnltcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGlmIChvTW9kZWwuZnVsbC5kb21haW5bb01kbC5kb21haW5dLmNhdGVnb3JpZXNbY2F0LmNhdGVnb3J5XSkge1xyXG4gICAgICAgICAgICAgICAgb01vZGVsLmZ1bGwuZG9tYWluW29NZGwuZG9tYWluXS5jYXRlZ29yaWVzW2NhdC5jYXRlZ29yeV0uY2F0ZWdvcnlfc3lub255bXMgPSBjYXQuY2F0ZWdvcnlfc3lub255bXM7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYWRkU3lub255bXMoY2F0LmNhdGVnb3J5X3N5bm9ueW1zLCBcImNhdGVnb3J5XCIsIGNhdC5jYXRlZ29yeSwgb01kbC5iaXRpbmRleCwgb01kbC5iaXRpbmRleCxcclxuICAgICAgICAgICAgICAgIElNYXRjaC5XT1JEVFlQRS5DQVRFR09SWSwgb01vZGVsLm1SdWxlcywgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgICAgIC8vIGFkZCBzeW5vbnltcyBpbnRvIHRoZSBtZXRhbW9kZWwgZG9tYWluXHJcbiAgICAgICAgICAgIGFkZFN5bm9ueW1zKGNhdC5jYXRlZ29yeV9zeW5vbnltcywgXCJjYXRlZ29yeVwiLCBjYXQuY2F0ZWdvcnksIGdldERvbWFpbkJpdEluZGV4U2FmZShET01BSU5fTUVUQU1PREVMLCBvTW9kZWwpLFxyXG4gICAgICAgICAgICAgICAgICBnZXREb21haW5CaXRJbmRleFNhZmUoRE9NQUlOX01FVEFNT0RFTCwgb01vZGVsKSxcclxuICAgICAgICAgICAgICAgIElNYXRjaC5XT1JEVFlQRS5GQUNULCBvTW9kZWwubVJ1bGVzLCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIC8vIGFkZCBvcGVyYXRvcnNcclxuXHJcbiAgICAvLyBhZGQgZmlsbGVyc1xyXG4gICAgaWYob01vZGVsLmRvbWFpbnMuaW5kZXhPZihvTWRsLmRvbWFpbikgPCAwKSB7XHJcbiAgICAgICAgdGhyb3cgRXJyb3IoJ21pc3NpbmcgZG9tYWluIHJlZ2lzdHJhdGlvbiBmb3IgJyArIG9NZGwuZG9tYWluKTtcclxuICAgIH1cclxuICAgIC8vb01vZGVsLmRvbWFpbnMucHVzaChvTWRsLmRvbWFpbik7XHJcbiAgICBvTW9kZWwuY2F0ZWdvcnkgPSBvTW9kZWwuY2F0ZWdvcnkuY29uY2F0KG9NZGwuY2F0ZWdvcnkpO1xyXG4gICAgb01vZGVsLmNhdGVnb3J5LnNvcnQoKTtcclxuICAgIG9Nb2RlbC5jYXRlZ29yeSA9IG9Nb2RlbC5jYXRlZ29yeS5maWx0ZXIoZnVuY3Rpb24gKHN0cmluZywgaW5kZXgpIHtcclxuICAgICAgICByZXR1cm4gb01vZGVsLmNhdGVnb3J5W2luZGV4XSAhPT0gb01vZGVsLmNhdGVnb3J5W2luZGV4ICsgMV07XHJcbiAgICB9KTtcclxuICAgIHJldHVybiBvTWRsO1xyXG59IC8vIGxvYWRtb2RlbFxyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3BsaXRSdWxlcyhydWxlczogSU1hdGNoLm1SdWxlW10pOiBJTWF0Y2guU3BsaXRSdWxlcyB7XHJcbiAgICB2YXIgcmVzID0ge307XHJcbiAgICB2YXIgbm9uV29yZFJ1bGVzID0gW107XHJcbiAgICBydWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChydWxlKSB7XHJcbiAgICAgICAgaWYgKHJ1bGUudHlwZSA9PT0gSU1hdGNoLkVudW1SdWxlVHlwZS5XT1JEKSB7XHJcbiAgICAgICAgICAgIGlmICghcnVsZS5sb3dlcmNhc2V3b3JkKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJSdWxlIGhhcyBubyBtZW1iZXIgbG93ZXJjYXNld29yZFwiICsgSlNPTi5zdHJpbmdpZnkocnVsZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJlc1tydWxlLmxvd2VyY2FzZXdvcmRdID0gcmVzW3J1bGUubG93ZXJjYXNld29yZF0gfHwgeyBiaXRpbmRleDogMCwgcnVsZXM6IFtdIH07XHJcbiAgICAgICAgICAgIHJlc1tydWxlLmxvd2VyY2FzZXdvcmRdLmJpdGluZGV4ID0gcmVzW3J1bGUubG93ZXJjYXNld29yZF0uYml0aW5kZXggfCBydWxlLmJpdGluZGV4O1xyXG4gICAgICAgICAgICByZXNbcnVsZS5sb3dlcmNhc2V3b3JkXS5ydWxlcy5wdXNoKHJ1bGUpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG5vbldvcmRSdWxlcy5wdXNoKHJ1bGUpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICB3b3JkTWFwOiByZXMsXHJcbiAgICAgICAgbm9uV29yZFJ1bGVzOiBub25Xb3JkUnVsZXMsXHJcbiAgICAgICAgYWxsUnVsZXM6IHJ1bGVzLFxyXG4gICAgICAgIHdvcmRDYWNoZToge31cclxuICAgIH07XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc29ydEZsYXRSZWNvcmRzKGEsYikge1xyXG4gICAgdmFyIGtleXMgPSBfLnVuaW9uKE9iamVjdC5rZXlzKGEpLE9iamVjdC5rZXlzKGIpKS5zb3J0KCk7XHJcbiAgICB2YXIgciA9IDA7XHJcbiAgICBrZXlzLmV2ZXJ5KCAoa2V5KSA9PiB7XHJcbiAgICAgICAgaWYodHlwZW9mIGFba2V5XSA9PT0gXCJzdHJpbmdcIiAmJiB0eXBlb2YgYltrZXldICE9PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICAgIHIgPSAtMTtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZih0eXBlb2YgYVtrZXldICE9PSBcInN0cmluZ1wiICYmIHR5cGVvZiBiW2tleV0gPT09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgciA9ICsxO1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHR5cGVvZiBhW2tleV0gIT09IFwic3RyaW5nXCIgJiYgdHlwZW9mIGJba2V5XSAhPT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICByID0gMDtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHIgPSBhW2tleV0ubG9jYWxlQ29tcGFyZShiW2tleV0pO1xyXG4gICAgICAgIHJldHVybiByID09PSAwO1xyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gcjtcclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBjbXBMZW5ndGhTb3J0KGE6IHN0cmluZywgYjogc3RyaW5nKSB7XHJcbiAgICB2YXIgZCA9IGEubGVuZ3RoIC0gYi5sZW5ndGg7XHJcbiAgICBpZiAoZCkge1xyXG4gICAgICAgIHJldHVybiBkO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGEubG9jYWxlQ29tcGFyZShiKTtcclxufVxyXG5cclxuXHJcbmltcG9ydCAqIGFzIEFsZ29sIGZyb20gJy4uL21hdGNoL2FsZ29sJztcclxuaW1wb3J0IHsgSUZNb2RlbCB9IGZyb20gJy4uJztcclxuLy8gb2Zmc2V0WzBdIDogbGVuLTJcclxuLy8gICAgICAgICAgICAgbGVuIC0xXHJcbi8vICAgICAgICAgICAgIGxlblxyXG4vLyAgICAgICAgICAgICBsZW4gKzFcclxuLy8gICAgICAgICAgICAgbGVuICsyXHJcbi8vICAgICAgICAgICAgIGxlbiArM1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbmROZXh0TGVuKHRhcmdldExlbjogbnVtYmVyLCBhcnI6IHN0cmluZ1tdLCBvZmZzZXRzOiBudW1iZXJbXSkge1xyXG4gICAgb2Zmc2V0cy5zaGlmdCgpO1xyXG4gICAgZm9yICh2YXIgaSA9IG9mZnNldHNbNF07IChpIDwgYXJyLmxlbmd0aCkgJiYgKGFycltpXS5sZW5ndGggPD0gdGFyZ2V0TGVuKTsgKytpKSB7XHJcbiAgICAgICAgLyogZW1wdHkqL1xyXG4gICAgfVxyXG4gICAgLy9jb25zb2xlLmxvZyhcInB1c2hpbmcgXCIgKyBpKTtcclxuICAgIG9mZnNldHMucHVzaChpKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFkZFJhbmdlUnVsZXNVbmxlc3NQcmVzZW50KHJ1bGVzOiBJTWF0Y2gubVJ1bGVbXSwgbGN3b3JkOiBzdHJpbmcsIHJhbmdlUnVsZXM6IElNYXRjaC5tUnVsZVtdLCBwcmVzZW50UnVsZXNGb3JLZXk6IElNYXRjaC5tUnVsZVtdLCBzZWVuUnVsZXMpIHtcclxuICAgIHJhbmdlUnVsZXMuZm9yRWFjaChyYW5nZVJ1bGUgPT4ge1xyXG4gICAgICAgIHZhciBuZXdSdWxlID0gKE9iamVjdCBhcyBhbnkpLmFzc2lnbih7fSwgcmFuZ2VSdWxlKTtcclxuICAgICAgICBuZXdSdWxlLmxvd2VyY2FzZXdvcmQgPSBsY3dvcmQ7XHJcbiAgICAgICAgbmV3UnVsZS53b3JkID0gbGN3b3JkO1xyXG4gICAgICAgIC8vaWYoKGxjd29yZCA9PT0gJ3NlcnZpY2VzJyB8fCBsY3dvcmQgPT09ICdzZXJ2aWNlJykgJiYgbmV3UnVsZS5yYW5nZS5ydWxlLmxvd2VyY2FzZXdvcmQuaW5kZXhPZignb2RhdGEnKT49MCkge1xyXG4gICAgICAgIC8vICAgIGNvbnNvbGUubG9nKFwiYWRkaW5nIFwiKyBKU09OLnN0cmluZ2lmeShuZXdSdWxlKSArIFwiXFxuXCIpO1xyXG4gICAgICAgIC8vfVxyXG4gICAgICAgIC8vdG9kbzogY2hlY2sgd2hldGhlciBhbiBlcXVpdmFsZW50IHJ1bGUgaXMgYWxyZWFkeSBwcmVzZW50P1xyXG4gICAgICAgIHZhciBjbnQgPSBydWxlcy5sZW5ndGg7XHJcbiAgICAgICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChydWxlcywgbmV3UnVsZSwgc2VlblJ1bGVzKTtcclxuICAgIH0pXHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYWRkQ2xvc2VFeGFjdFJhbmdlUnVsZXMocnVsZXM6IElNYXRjaC5tUnVsZVtdLCBzZWVuUnVsZXMpIHtcclxuICAgIHZhciBrZXlzTWFwID0ge30gYXMgeyBba2V5OiBzdHJpbmddOiBJTWF0Y2gubVJ1bGVbXSB9O1xyXG4gICAgdmFyIHJhbmdlS2V5c01hcCA9IHt9IGFzIHsgW2tleTogc3RyaW5nXTogSU1hdGNoLm1SdWxlW10gfTtcclxuICAgIHJ1bGVzLmZvckVhY2gocnVsZSA9PiB7XHJcbiAgICAgICAgaWYgKHJ1bGUudHlwZSA9PT0gSU1hdGNoLkVudW1SdWxlVHlwZS5XT1JEKSB7XHJcbiAgICAgICAgICAgIC8va2V5c01hcFtydWxlLmxvd2VyY2FzZXdvcmRdID0gMTtcclxuICAgICAgICAgICAga2V5c01hcFtydWxlLmxvd2VyY2FzZXdvcmRdID0ga2V5c01hcFtydWxlLmxvd2VyY2FzZXdvcmRdIHx8IFtdO1xyXG4gICAgICAgICAgICBrZXlzTWFwW3J1bGUubG93ZXJjYXNld29yZF0ucHVzaChydWxlKTtcclxuICAgICAgICAgICAgaWYgKCFydWxlLmV4YWN0T25seSAmJiBydWxlLnJhbmdlKSB7XHJcbiAgICAgICAgICAgICAgICByYW5nZUtleXNNYXBbcnVsZS5sb3dlcmNhc2V3b3JkXSA9IHJhbmdlS2V5c01hcFtydWxlLmxvd2VyY2FzZXdvcmRdIHx8IFtdO1xyXG4gICAgICAgICAgICAgICAgcmFuZ2VLZXlzTWFwW3J1bGUubG93ZXJjYXNld29yZF0ucHVzaChydWxlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhrZXlzTWFwKTtcclxuICAgIGtleXMuc29ydChjbXBMZW5ndGhTb3J0KTtcclxuICAgIHZhciBsZW4gPSAwO1xyXG4gICAga2V5cy5mb3JFYWNoKChrZXksIGluZGV4KSA9PiB7XHJcbiAgICAgICAgaWYgKGtleS5sZW5ndGggIT0gbGVuKSB7XHJcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJzaGlmdCB0byBsZW5cIiArIGtleS5sZW5ndGggKyAnIGF0ICcgKyBpbmRleCArICcgJyArIGtleSApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZW4gPSBrZXkubGVuZ3RoO1xyXG4gICAgfSk7XHJcbiAgICAvLyAgIGtleXMgPSBrZXlzLnNsaWNlKDAsMjAwMCk7XHJcbiAgICB2YXIgcmFuZ2VLZXlzID0gT2JqZWN0LmtleXMocmFuZ2VLZXlzTWFwKTtcclxuICAgIHJhbmdlS2V5cy5zb3J0KGNtcExlbmd0aFNvcnQpO1xyXG4gICAgLy9jb25zb2xlLmxvZyhgICR7a2V5cy5sZW5ndGh9IGtleXMgYW5kICR7cmFuZ2VLZXlzLmxlbmd0aH0gcmFuZ2VrZXlzIGApO1xyXG4gICAgdmFyIGxvdyA9IDA7XHJcbiAgICB2YXIgaGlnaCA9IDA7XHJcbiAgICB2YXIgbGFzdGxlbiA9IDA7XHJcbiAgICB2YXIgb2Zmc2V0cyA9IFswLCAwLCAwLCAwLCAwLCAwXTtcclxuICAgIHZhciBsZW4gPSByYW5nZUtleXMubGVuZ3RoO1xyXG4gICAgZmluZE5leHRMZW4oMCwga2V5cywgb2Zmc2V0cyk7XHJcbiAgICBmaW5kTmV4dExlbigxLCBrZXlzLCBvZmZzZXRzKTtcclxuICAgIGZpbmROZXh0TGVuKDIsIGtleXMsIG9mZnNldHMpO1xyXG5cclxuICAgIHJhbmdlS2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChyYW5nZUtleSkge1xyXG4gICAgICAgIGlmIChyYW5nZUtleS5sZW5ndGggIT09IGxhc3RsZW4pIHtcclxuICAgICAgICAgICAgZm9yIChpID0gbGFzdGxlbiArIDE7IGkgPD0gcmFuZ2VLZXkubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIGZpbmROZXh0TGVuKGkgKyAyLCBrZXlzLCBvZmZzZXRzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyAgIGNvbnNvbGUubG9nKGAgc2hpZnRlZCB0byAke3JhbmdlS2V5Lmxlbmd0aH0gd2l0aCBvZmZzZXRzIGJlZWluZyAke29mZnNldHMuam9pbignICcpfWApO1xyXG4gICAgICAgICAgICAvLyAgIGNvbnNvbGUubG9nKGAgaGVyZSAwICR7b2Zmc2V0c1swXX0gOiAke2tleXNbTWF0aC5taW4oa2V5cy5sZW5ndGgtMSwgb2Zmc2V0c1swXSldLmxlbmd0aH0gICR7a2V5c1tNYXRoLm1pbihrZXlzLmxlbmd0aC0xLCBvZmZzZXRzWzBdKV19IGApO1xyXG4gICAgICAgICAgICAvLyAgY29uc29sZS5sb2coYCBoZXJlIDUtMSAgJHtrZXlzW29mZnNldHNbNV0tMV0ubGVuZ3RofSAgJHtrZXlzW29mZnNldHNbNV0tMV19IGApO1xyXG4gICAgICAgICAgICAvLyAgIGNvbnNvbGUubG9nKGAgaGVyZSA1ICR7b2Zmc2V0c1s1XX0gOiAke2tleXNbTWF0aC5taW4oa2V5cy5sZW5ndGgtMSwgb2Zmc2V0c1s1XSldLmxlbmd0aH0gICR7a2V5c1tNYXRoLm1pbihrZXlzLmxlbmd0aC0xLCBvZmZzZXRzWzVdKV19IGApO1xyXG4gICAgICAgICAgICBsYXN0bGVuID0gcmFuZ2VLZXkubGVuZ3RoO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmb3IgKHZhciBpID0gb2Zmc2V0c1swXTsgaSA8IG9mZnNldHNbNV07ICsraSkge1xyXG4gICAgICAgICAgICB2YXIgZCA9IERpc3RhbmNlLmNhbGNEaXN0YW5jZUFkanVzdGVkKHJhbmdlS2V5LCBrZXlzW2ldKTtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coYCR7cmFuZ2VLZXkubGVuZ3RoLWtleXNbaV0ubGVuZ3RofSAke2R9ICR7cmFuZ2VLZXl9IGFuZCAke2tleXNbaV19ICBgKTtcclxuICAgICAgICAgICAgaWYgKChkICE9PSAxLjApICYmIChkID49IEFsZ29sLkN1dG9mZl9yYW5nZUNsb3NlTWF0Y2gpKSB7XHJcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKGB3b3VsZCBhZGQgJHtyYW5nZUtleX0gZm9yICR7a2V5c1tpXX0gJHtkfWApO1xyXG4gICAgICAgICAgICAgICAgdmFyIGNudCA9IHJ1bGVzLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgIC8vIHdlIG9ubHkgaGF2ZSB0byBhZGQgaWYgdGhlcmUgaXMgbm90IHlldCBhIG1hdGNoIHJ1bGUgaGVyZSB3aGljaCBwb2ludHMgdG8gdGhlIHNhbWVcclxuICAgICAgICAgICAgICAgIGFkZFJhbmdlUnVsZXNVbmxlc3NQcmVzZW50KHJ1bGVzLCBrZXlzW2ldLCByYW5nZUtleXNNYXBbcmFuZ2VLZXldLCBrZXlzTWFwW2tleXNbaV1dLCBzZWVuUnVsZXMpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHJ1bGVzLmxlbmd0aCA+IGNudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coYCBhZGRlZCAkeyhydWxlcy5sZW5ndGggLSBjbnQpfSByZWNvcmRzIGF0JHtyYW5nZUtleX0gZm9yICR7a2V5c1tpXX0gJHtkfWApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgLypcclxuICAgIFtcclxuICAgICAgICBbJ2FFRkcnLCdhRUZHSCddLFxyXG4gICAgICAgIFsnYUVGR0gnLCdhRUZHSEknXSxcclxuICAgICAgICBbJ09kYXRhJywnT0RhdGFzJ10sXHJcbiAgIFsnT2RhdGEnLCdPZGF0YXMnXSxcclxuICAgWydPZGF0YScsJ09kYXRiJ10sXHJcbiAgIFsnT2RhdGEnLCdVRGF0YSddLFxyXG4gICBbJ3NlcnZpY2UnLCdzZXJ2aWNlcyddLFxyXG4gICBbJ3RoaXMgaXNmdW5ueSBhbmQgbW9yZScsJ3RoaXMgaXNmdW5ueSBhbmQgbW9yZXMnXSxcclxuICAgIF0uZm9yRWFjaChyZWMgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBkaXN0YW5jZSAke3JlY1swXX0gJHtyZWNbMV19IDogJHtEaXN0YW5jZS5jYWxjRGlzdGFuY2UocmVjWzBdLHJlY1sxXSl9ICBhZGYgJHtEaXN0YW5jZS5jYWxjRGlzdGFuY2VBZGp1c3RlZChyZWNbMF0scmVjWzFdKX0gYCk7XHJcblxyXG4gICAgfSk7XHJcbiAgICBjb25zb2xlLmxvZyhcImRpc3RhbmNlIE9kYXRhIFVkYXRhXCIrIERpc3RhbmNlLmNhbGNEaXN0YW5jZSgnT0RhdGEnLCdVRGF0YScpKTtcclxuICAgIGNvbnNvbGUubG9nKFwiZGlzdGFuY2UgT2RhdGEgT2RhdGJcIisgRGlzdGFuY2UuY2FsY0Rpc3RhbmNlKCdPRGF0YScsJ09EYXRiJykpO1xyXG4gICAgY29uc29sZS5sb2coXCJkaXN0YW5jZSBPZGF0YXMgT2RhdGFcIisgRGlzdGFuY2UuY2FsY0Rpc3RhbmNlKCdPRGF0YScsJ09EYXRhYScpKTtcclxuICAgIGNvbnNvbGUubG9nKFwiZGlzdGFuY2UgT2RhdGFzIGFiY2RlXCIrIERpc3RhbmNlLmNhbGNEaXN0YW5jZSgnYWJjZGUnLCdhYmNkZWYnKSk7XHJcbiAgICBjb25zb2xlLmxvZyhcImRpc3RhbmNlIHNlcnZpY2VzIFwiKyBEaXN0YW5jZS5jYWxjRGlzdGFuY2UoJ3NlcnZpY2VzJywnc2VydmljZScpKTtcclxuICAgICovXHJcbn1cclxudmFyIG4gPSAwO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWFkRmlsbGVycyhtb25nb29zZSA6IG1vbmdvb3NlLk1vbmdvb3NlLCBvTW9kZWwgOiBJTWF0Y2guSU1vZGVscykgIDogUHJvbWlzZTxhbnk+IHtcclxuICAgIHZhciBmaWxsZXJCaXRJbmRleCA9IGdldERvbWFpbkJpdEluZGV4KCdtZXRhJywgb01vZGVsKTtcclxuICAgIHZhciBiaXRJbmRleEFsbERvbWFpbnMgPSBnZXRBbGxEb21haW5zQml0SW5kZXgob01vZGVsKTtcclxuICAgIHJldHVybiBTY2hlbWFsb2FkLmdldEZpbGxlcnNGcm9tREIobW9uZ29vc2UpLnRoZW4oXHJcbiAgICAgICAgKGZpbGxlcnNPYmopID0+IGZpbGxlcnNPYmouZmlsbGVyc1xyXG4gICAgKS50aGVuKChmaWxsZXJzOiBzdHJpbmdbXSkgPT4ge1xyXG4gICAgICAgIC8vICBmaWxsZXJzcmVhZEZpbGVBc0pTT04oJy4vJyArIG1vZGVsUGF0aCArICcvZmlsbGVyLmpzb24nKTtcclxuICAgICAgICAvKlxyXG4gICAgICAgIHZhciByZSA9IFwiXigoXCIgKyBmaWxsZXJzLmpvaW4oXCIpfChcIikgKyBcIikpJFwiO1xyXG4gICAgICAgIG9Nb2RlbC5tUnVsZXMucHVzaCh7XHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBcImZpbGxlclwiLFxyXG4gICAgICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLlJFR0VYUCxcclxuICAgICAgICAgICAgcmVnZXhwOiBuZXcgUmVnRXhwKHJlLCBcImlcIiksXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IFwiZmlsbGVyXCIsXHJcbiAgICAgICAgICAgIGJpdGluZGV4OiBmaWxsZXJCaXRJbmRleCxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IDAuOVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgICovXHJcbiAgICAgICAgaWYgKCFfLmlzQXJyYXkoZmlsbGVycykpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdleHBlY3QgZmlsbGVycyB0byBiZSBhbiBhcnJheSBvZiBzdHJpbmdzJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZpbGxlcnMuZm9yRWFjaChmaWxsZXIgPT4ge1xyXG4gICAgICAgICAgICBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG9Nb2RlbC5tUnVsZXMsIHtcclxuICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBcImZpbGxlclwiLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogSU1hdGNoLkVudW1SdWxlVHlwZS5XT1JELFxyXG4gICAgICAgICAgICAgICAgd29yZDogZmlsbGVyLFxyXG4gICAgICAgICAgICAgICAgbG93ZXJjYXNld29yZDogZmlsbGVyLnRvTG93ZXJDYXNlKCksXHJcbiAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBmaWxsZXIsIC8vXCJmaWxsZXJcIixcclxuICAgICAgICAgICAgICAgIGV4YWN0T25seTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGJpdGluZGV4OiBmaWxsZXJCaXRJbmRleCxcclxuICAgICAgICAgICAgICAgIGJpdFNlbnRlbmNlQW5kOiBiaXRJbmRleEFsbERvbWFpbnMsXHJcbiAgICAgICAgICAgICAgICB3b3JkVHlwZTogSU1hdGNoLldPUkRUWVBFLkZJTExFUixcclxuICAgICAgICAgICAgICAgIF9yYW5raW5nOiAwLjlcclxuICAgICAgICAgICAgfSwgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9KTtcclxufTtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVhZE9wZXJhdG9ycyhtb25nb29zZTogbW9uZ29vc2UuTW9uZ29vc2UsIG9Nb2RlbDogSU1hdGNoLklNb2RlbHMpIDogUHJvbWlzZTxhbnk+IHtcclxuICAgICAgICBkZWJ1Z2xvZygncmVhZGluZyBvcGVyYXRvcnMnKTtcclxuICAgICAgICAvL2FkZCBvcGVyYXRvcnNcclxuICAgIHJldHVybiBTY2hlbWFsb2FkLmdldE9wZXJhdG9yc0Zyb21EQihtb25nb29zZSkudGhlbihcclxuICAgICAgICAob3BlcmF0b3JzOiBhbnkpID0+IHtcclxuICAgICAgICB2YXIgb3BlcmF0b3JCaXRJbmRleCA9IGdldERvbWFpbkJpdEluZGV4KCdvcGVyYXRvcnMnLCBvTW9kZWwpO1xyXG4gICAgICAgIHZhciBiaXRJbmRleEFsbERvbWFpbnMgPSBnZXRBbGxEb21haW5zQml0SW5kZXgob01vZGVsKTtcclxuICAgICAgICBPYmplY3Qua2V5cyhvcGVyYXRvcnMub3BlcmF0b3JzKS5mb3JFYWNoKGZ1bmN0aW9uIChvcGVyYXRvcikge1xyXG4gICAgICAgICAgICBpZiAoSU1hdGNoLmFPcGVyYXRvck5hbWVzLmluZGV4T2Yob3BlcmF0b3IpIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgZGVidWdsb2coXCJ1bmtub3duIG9wZXJhdG9yIFwiICsgb3BlcmF0b3IpO1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biBvcGVyYXRvciBcIiArIG9wZXJhdG9yICsgJyAoYWRkIHRvIGlmbWF0Y2gudHMgIGFPcGVyYXRvck5hbWVzKScpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG9Nb2RlbC5vcGVyYXRvcnNbb3BlcmF0b3JdID0gb3BlcmF0b3JzLm9wZXJhdG9yc1tvcGVyYXRvcl07XHJcbiAgICAgICAgICAgIG9Nb2RlbC5vcGVyYXRvcnNbb3BlcmF0b3JdLm9wZXJhdG9yID0gPElNYXRjaC5PcGVyYXRvck5hbWU+b3BlcmF0b3I7XHJcbiAgICAgICAgICAgIE9iamVjdC5mcmVlemUob01vZGVsLm9wZXJhdG9yc1tvcGVyYXRvcl0pO1xyXG4gICAgICAgICAgICB2YXIgd29yZCA9IG9wZXJhdG9yO1xyXG4gICAgICAgICAgICBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG9Nb2RlbC5tUnVsZXMsIHtcclxuICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBcIm9wZXJhdG9yXCIsXHJcbiAgICAgICAgICAgICAgICB3b3JkOiB3b3JkLnRvTG93ZXJDYXNlKCksXHJcbiAgICAgICAgICAgICAgICBsb3dlcmNhc2V3b3JkOiB3b3JkLnRvTG93ZXJDYXNlKCksXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQsXHJcbiAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiB3b3JkLFxyXG4gICAgICAgICAgICAgICAgYml0aW5kZXg6IG9wZXJhdG9yQml0SW5kZXgsXHJcbiAgICAgICAgICAgICAgICBiaXRTZW50ZW5jZUFuZDogYml0SW5kZXhBbGxEb21haW5zLFxyXG4gICAgICAgICAgICAgICAgd29yZFR5cGU6IElNYXRjaC5XT1JEVFlQRS5PUEVSQVRPUixcclxuICAgICAgICAgICAgICAgIF9yYW5raW5nOiAwLjlcclxuICAgICAgICAgICAgfSwgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgICAgIC8vIGFkZCBhbGwgc3lub255bXNcclxuICAgICAgICAgICAgaWYgKG9wZXJhdG9ycy5zeW5vbnltc1tvcGVyYXRvcl0pIHtcclxuICAgICAgICAgICAgICAgIHZhciBhcnIgPSBvcGVyYXRvcnMuc3lub255bXNbb3BlcmF0b3JdO1xyXG4gICAgICAgICAgICAgICAgaWYgKCBhcnIgKVxyXG4gICAgICAgICAgICAgICAge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiggQXJyYXkuaXNBcnJheShhcnIpKVxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXJyLmZvckVhY2goZnVuY3Rpb24gKHN5bm9ueW0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluc2VydFJ1bGVJZk5vdFByZXNlbnQob01vZGVsLm1SdWxlcywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBcIm9wZXJhdG9yXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29yZDogc3lub255bS50b0xvd2VyQ2FzZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvd2VyY2FzZXdvcmQ6IHN5bm9ueW0udG9Mb3dlckNhc2UoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb3BlcmF0b3IsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYml0aW5kZXg6IG9wZXJhdG9yQml0SW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYml0U2VudGVuY2VBbmQ6IGJpdEluZGV4QWxsRG9tYWlucyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JkVHlwZTogSU1hdGNoLldPUkRUWVBFLk9QRVJBVE9SLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiAwLjlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRXhwZXRlZCBvcGVyYXRvciBzeW5vbnltIHRvIGJlIGFycmF5IFwiICsgb3BlcmF0b3IgKyBcIiBpcyBcIiArIEpTT04uc3RyaW5naWZ5KGFycikpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0pO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlbGVhc2VNb2RlbChtb2RlbCA6IElNYXRjaC5JTW9kZWxzKSB7XHJcbiAgICBpZihtb2RlbC5tb25nb0hhbmRsZSAmJiBtb2RlbC5tb25nb0hhbmRsZS5tb25nb29zZSkge1xyXG4gICAgICAgIE1vbmdvVXRpbHMuZGlzY29ubmVjdChtb2RlbC5tb25nb0hhbmRsZS5tb25nb29zZSk7XHJcbiAgICB9XHJcbn1cclxuLypcclxuZXhwb3J0IGZ1bmN0aW9uIGxvYWRNb2RlbEhhbmRsZVAobW9uZ29vc2VIbmRsIDogbW9uZ29vc2UuTW9uZ29vc2UsIG1vZGVsUGF0aDogc3RyaW5nLCBjb25uZWN0aW9uU3RyaW5nPyA6IHN0cmluZykgOiBQcm9taXNlPElNYXRjaC5JTW9kZWxzPiB7XHJcbiAgICB2YXIgbW9uZ29vc2VYID0gbW9uZ29vc2VIbmRsIHx8IG1vbmdvb3NlO1xyXG4gLy8gICBpZihwcm9jZXNzLmVudi5NT05HT19SRVBMQVkpIHtcclxuIC8vICAgICAgICBtb25nb29zZVggPSBtb25nb29zZU1vY2subW9uZ29vc2VNb2NrIGFzIGFueTtcclxuIC8vICAgIH1cclxuICAgIHZhciBjb25uU3RyID0gY29ubmVjdGlvblN0cmluZyB8fCAnbW9uZ29kYjovL2xvY2FsaG9zdC90ZXN0ZGInO1xyXG4gICAgcmV0dXJuIE1vbmdvVXRpbHMub3Blbk1vbmdvb3NlKG1vbmdvb3NlWCwgY29ublN0cikudGhlbihcclxuICAgICAgICAoKSA9PiBnZXRNb25nb0hhbmRsZShtb25nb29zZVgpXHJcbiAgICApLnRoZW4oIChtb2RlbEhhbmRsZSA6IElNYXRjaC5JTW9kZWxIYW5kbGVSYXcpID0+IGxvYWRNb2RlbHNGdWxsKG1vZGVsSGFuZGxlLCBtb2RlbFBhdGgpKTtcclxufTtcclxuKi9cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBsb2FkTW9kZWxzT3BlbmluZ0Nvbm5lY3Rpb24obW9uZ29vc2VIbmRsOiBtb25nb29zZS5Nb25nb29zZSwgY29ubmVjdGlvblN0cmluZz8gOiBzdHJpbmcsICBtb2RlbFBhdGg/IDogc3RyaW5nKSA6IFByb21pc2U8SU1hdGNoLklNb2RlbHM+IHtcclxuICB2YXIgbW9uZ29vc2VYID0gbW9uZ29vc2VIbmRsIHx8IG1vbmdvb3NlO1xyXG4gLy8gICBpZihwcm9jZXNzLmVudi5NT05HT19SRVBMQVkpIHtcclxuIC8vICAgICAgICBtb25nb29zZVggPSBtb25nb29zZU1vY2subW9uZ29vc2VNb2NrIGFzIGFueTtcclxuIC8vICAgIH1cclxuICAgIGNvbnNvbGUubG9nKFwiIGV4cGxpY2l0IGNvbm5lY3Rpb24gc3RyaW5nIFwiICsgY29ubmVjdGlvblN0cmluZyk7XHJcbiAgICB2YXIgY29ublN0ciA9IGNvbm5lY3Rpb25TdHJpbmcgfHwgJ21vbmdvZGI6Ly9sb2NhbGhvc3QvdGVzdGRiJztcclxuICAgIHJldHVybiBNb25nb1V0aWxzLm9wZW5Nb25nb29zZShtb25nb29zZVgsIGNvbm5TdHIpLnRoZW4oXHJcbiAgICAgICAgKCk9PlxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmV0dXJuIGxvYWRNb2RlbHMobW9uZ29vc2VYLCBtb2RlbFBhdGgpO1xyXG4gICAgICAgIH1cclxuICAgICk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBleHBlY3RzIGFuIG9wZW4gY29ubmVjdGlvbiFcclxuICogQHBhcmFtIG1vbmdvb3NlXHJcbiAqIEBwYXJhbSBtb2RlbFBhdGhcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBsb2FkTW9kZWxzKG1vbmdvb3NlOiBtb25nb29zZS5Nb25nb29zZSwgbW9kZWxQYXRoIDogc3RyaW5nKSA6IFByb21pc2U8SU1hdGNoLklNb2RlbHM+IHtcclxuICAgIGlmKG1vbmdvb3NlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2V4cGVjdCBhIG1vbmdvb3NlIGhhbmRsZSB0byBiZSBwYXNzZWQnKTtcclxuICAgIH1cclxuICAgIHJldHVybiBnZXRNb25nb0hhbmRsZShtb25nb29zZSkudGhlbiggKG1vZGVsSGFuZGxlKSA9PntcclxuICAgICAgICBkZWJ1Z2xvZyhgZ290IGEgbW9uZ28gaGFuZGxlIGZvciAke21vZGVsUGF0aH1gKTtcclxuICAgICAgICByZXR1cm4gX2xvYWRNb2RlbHNGdWxsKG1vZGVsSGFuZGxlLCBtb2RlbFBhdGgpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfbG9hZE1vZGVsc0Z1bGwobW9kZWxIYW5kbGU6IElNYXRjaC5JTW9kZWxIYW5kbGVSYXcsIG1vZGVsUGF0aD86IHN0cmluZyk6IFByb21pc2U8SU1hdGNoLklNb2RlbHM+IHtcclxuICAgIHZhciBvTW9kZWw6IElNYXRjaC5JTW9kZWxzO1xyXG4gICAgbW9kZWxQYXRoID0gbW9kZWxQYXRoIHx8IGVudk1vZGVsUGF0aDtcclxuICAgIG1vZGVsSGFuZGxlID0gbW9kZWxIYW5kbGUgfHwge1xyXG4gICAgICAgIG1vbmdvb3NlOiB1bmRlZmluZWQsXHJcbiAgICAgICAgbW9kZWxEb2NzOiB7fSxcclxuICAgICAgICBtb25nb01hcHM6IHt9LFxyXG4gICAgICAgIG1vZGVsRVNjaGVtYXM6IHt9XHJcbiAgICB9O1xyXG4gICAgb01vZGVsID0ge1xyXG4gICAgICAgIG1vbmdvSGFuZGxlIDogbW9kZWxIYW5kbGUsXHJcbiAgICAgICAgZnVsbDogeyBkb21haW46IHt9IH0sXHJcbiAgICAgICAgcmF3TW9kZWxzOiB7fSxcclxuICAgICAgICBkb21haW5zOiBbXSxcclxuICAgICAgICBydWxlczogdW5kZWZpbmVkLFxyXG4gICAgICAgIGNhdGVnb3J5OiBbXSxcclxuICAgICAgICBvcGVyYXRvcnM6IHt9LFxyXG4gICAgICAgIG1SdWxlczogW10sXHJcbiAgICAgICAgc2VlblJ1bGVzOiB7fSxcclxuICAgICAgICBtZXRhOiB7IHQzOiB7fSB9XHJcbiAgICB9XHJcbiAgICB2YXIgdCA9IERhdGUubm93KCk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgICBkZWJ1Z2xvZygoKT0+ICdoZXJlIG1vZGVsIHBhdGgnICsgbW9kZWxQYXRoKTtcclxuICAgICAgICB2YXIgYSA9IENpcmN1bGFyU2VyLmxvYWQobW9kZWxQYXRoICsgJy9fY2FjaGUuanMnKTtcclxuICAgICAgICAvLyBUT0RPXHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImZvdW5kIGEgY2FjaGUgPyAgXCIgKyAhIWEpO1xyXG4gICAgICAgIC8vYSA9IHVuZGVmaW5lZDtcclxuICAgICAgICBpZiAoYSAmJiAhcHJvY2Vzcy5lbnYuTUdOTFFfTU9ERUxfTk9fRklMRUNBQ0hFKSB7XHJcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3JldHVybiBwcmVwcycgKyBtb2RlbFBhdGgpO1xyXG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIlxcbiByZXR1cm4gcHJlcGFyZWQgbW9kZWwgISFcIik7XHJcbiAgICAgICAgICAgIGlmIChwcm9jZXNzLmVudi5BQk9UX0VNQUlMX1VTRVIpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibG9hZGVkIG1vZGVscyBmcm9tIGNhY2hlIGluIFwiICsgKERhdGUubm93KCkgLSB0KSArIFwiIFwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgcmVzID0gYSBhcyBJTWF0Y2guSU1vZGVscztcclxuICAgICAgICAgICAgcmVzLm1vbmdvSGFuZGxlLm1vbmdvb3NlICA9IG1vZGVsSGFuZGxlLm1vbmdvb3NlO1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlcyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIC8vY29uc29sZS5sb2coJ2Vycm9yJyArIGUpO1xyXG4gICAgICAgIC8vIG5vIGNhY2hlIGZpbGUsXHJcbiAgICB9XHJcbiAgICB2YXIgbWRscyA9IE9iamVjdC5rZXlzKG1vZGVsSGFuZGxlLm1vZGVsRG9jcykuc29ydCgpO1xyXG4gICAgdmFyIHNlZW5Eb21haW5zID17fTtcclxuICAgIG1kbHMuZm9yRWFjaCgobW9kZWxOYW1lLGluZGV4KSA9PiB7XHJcbiAgICAgICAgdmFyIGRvbWFpbiA9IG1vZGVsSGFuZGxlLm1vZGVsRG9jc1ttb2RlbE5hbWVdLmRvbWFpbjtcclxuICAgICAgICBpZihzZWVuRG9tYWluc1tkb21haW5dKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRG9tYWluICcgKyBkb21haW4gKyAnIGFscmVhZHkgbG9hZGVkIHdoaWxlIGxvYWRpbmcgJyArIG1vZGVsTmFtZSArICc/Jyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNlZW5Eb21haW5zW2RvbWFpbl0gPSBpbmRleDtcclxuICAgIH0pXHJcbiAgICBvTW9kZWwuZG9tYWlucyA9IG1kbHMubWFwKG1vZGVsTmFtZSA9PiBtb2RlbEhhbmRsZS5tb2RlbERvY3NbbW9kZWxOYW1lXS5kb21haW4pO1xyXG4gICAgLy8gY3JlYXRlIGJpdGluZGV4IGluIG9yZGVyICFcclxuICAgIGRlYnVnbG9nKCdnb3QgZG9tYWlucyAnICsgbWRscy5qb2luKFwiXFxuXCIpKTtcclxuICAgIGRlYnVnbG9nKCdsb2FkaW5nIG1vZGVscyAnICsgbWRscy5qb2luKFwiXFxuXCIpKTtcclxuXHJcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwobWRscy5tYXAoKHNNb2RlbE5hbWUpID0+XHJcbiAgICAgICAgbG9hZE1vZGVsKG1vZGVsSGFuZGxlLCBzTW9kZWxOYW1lLCBvTW9kZWwpKVxyXG4gICAgKS50aGVuKCgpID0+IHtcclxuICAgICAgICB2YXIgbWV0YUJpdEluZGV4ID0gZ2V0RG9tYWluQml0SW5kZXgoJ21ldGEnLCBvTW9kZWwpO1xyXG4gICAgICAgIHZhciBiaXRJbmRleEFsbERvbWFpbnMgPSBnZXRBbGxEb21haW5zQml0SW5kZXgob01vZGVsKTtcclxuXHJcbiAgICAgICAgLy8gYWRkIHRoZSBkb21haW4gbWV0YSBydWxlXHJcbiAgICAgICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCB7XHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBcIm1ldGFcIixcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogXCJkb21haW5cIixcclxuICAgICAgICAgICAgdHlwZTogSU1hdGNoLkVudW1SdWxlVHlwZS5XT1JELFxyXG4gICAgICAgICAgICB3b3JkOiBcImRvbWFpblwiLFxyXG4gICAgICAgICAgICBiaXRpbmRleDogbWV0YUJpdEluZGV4LFxyXG4gICAgICAgICAgICB3b3JkVHlwZTogSU1hdGNoLldPUkRUWVBFLk1FVEEsXHJcbiAgICAgICAgICAgIGJpdFNlbnRlbmNlQW5kOiBiaXRJbmRleEFsbERvbWFpbnMsXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiAwLjk1XHJcbiAgICAgICAgfSwgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgLy8gaW5zZXJ0IHRoZSBOdW1iZXJzIHJ1bGVzXHJcbiAgICAgICAgY29uc29sZS5sb2coJyBhZGQgbnVtYmVycyBydWxlJyk7XHJcbiAgICAgICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCB7XHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBcIm51bWJlclwiLFxyXG4gICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBcIm9uZVwiLFxyXG4gICAgICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLlJFR0VYUCxcclxuICAgICAgICAgICAgcmVnZXhwIDogL14oKFxcZCspfChvbmUpfCh0d28pfCh0aHJlZSkpJC8sXHJcbiAgICAgICAgICAgIG1hdGNoSW5kZXggOiAwLFxyXG4gICAgICAgICAgICB3b3JkOiBcIjxudW1iZXI+XCIsXHJcbiAgICAgICAgICAgIGJpdGluZGV4OiBtZXRhQml0SW5kZXgsXHJcbiAgICAgICAgICAgIHdvcmRUeXBlOiBJTWF0Y2guV09SRFRZUEUuTlVNRVJJQ0FSRywgLy8gbnVtYmVyXHJcbiAgICAgICAgICAgIGJpdFNlbnRlbmNlQW5kOiBiaXRJbmRleEFsbERvbWFpbnMsXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiAwLjk1XHJcbiAgICAgICAgfSwgb01vZGVsLnNlZW5SdWxlcyk7XHJcblxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgKS50aGVuKCAoKT0+XHJcbiAgICAgICAgcmVhZEZpbGxlcnMobW9kZWxIYW5kbGUubW9uZ29vc2UsIG9Nb2RlbClcclxuICAgICkudGhlbiggKCkgPT5cclxuICAgICAgICByZWFkT3BlcmF0b3JzKG1vZGVsSGFuZGxlLm1vbmdvb3NlLCBvTW9kZWwpXHJcbiAgICApLnRoZW4oICgpID0+IHtcclxuICAgICAgICAvKlxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIGNhdGVnb3J5OiBcImZpbGxlclwiLFxyXG4gICAgICAgICAgICAgIHR5cGU6IDEsXHJcbiAgICAgICAgICAgICAgcmVnZXhwOiAvXigoc3RhcnQpfChzaG93KXwoZnJvbSl8KGluKSkkL2ksXHJcbiAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogXCJmaWxsZXJcIixcclxuICAgICAgICAgICAgICBfcmFua2luZzogMC45XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgKi9cclxuICAgICAgICBkZWJ1Z2xvZygnc2F2aW5nIGRhdGEgdG8gJyArIG1vZGVsUGF0aCk7XHJcbiAgICAgICAgb01vZGVsLm1SdWxlcyA9IG9Nb2RlbC5tUnVsZXMuc29ydChJbnB1dEZpbHRlclJ1bGVzLmNtcE1SdWxlKTtcclxuICAgICAgICBhZGRDbG9zZUV4YWN0UmFuZ2VSdWxlcyhvTW9kZWwubVJ1bGVzLCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgICAgICBvTW9kZWwubVJ1bGVzID0gb01vZGVsLm1SdWxlcy5zb3J0KElucHV0RmlsdGVyUnVsZXMuY21wTVJ1bGUpO1xyXG4gICAgICAgIG9Nb2RlbC5tUnVsZXMuc29ydChJbnB1dEZpbHRlclJ1bGVzLmNtcE1SdWxlKTtcclxuICAgICAgICAvL2ZzLndyaXRlRmlsZVN5bmMoXCJwb3N0X3NvcnRcIiwgSlNPTi5zdHJpbmdpZnkob01vZGVsLm1SdWxlcyx1bmRlZmluZWQsMikpO1xyXG5cclxuICAgICAgICBmb3JjZUdDKCk7XHJcbiAgICAgICAgb01vZGVsLnJ1bGVzID0gc3BsaXRSdWxlcyhvTW9kZWwubVJ1bGVzKTtcclxuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKFwidGVzdDF4Lmpzb25cIiwgSlNPTi5zdHJpbmdpZnkob01vZGVsLnJ1bGVzLHVuZGVmaW5lZCwyKSk7XHJcbiAgICAgICAgZm9yY2VHQygpO1xyXG4gICAgICAgIGRlbGV0ZSBvTW9kZWwuc2VlblJ1bGVzO1xyXG4gICAgICAgIGRlYnVnbG9nKCdzYXZpbmcnKTtcclxuICAgICAgICBmb3JjZUdDKCk7XHJcbiAgICAgICAgdmFyIG9Nb2RlbFNlciA9IE9iamVjdC5hc3NpZ24oe30sIG9Nb2RlbCk7XHJcbiAgICAgICAgb01vZGVsU2VyLm1vbmdvSGFuZGxlID0gT2JqZWN0LmFzc2lnbih7fSwgb01vZGVsLm1vbmdvSGFuZGxlKTtcclxuICAgICAgICBjb25zb2xlLmxvZygnY3JlYXRlZCBkaXIxICcgKyBtb2RlbFBhdGgpOyBcclxuICAgICAgICBkZWxldGUgb01vZGVsU2VyLm1vbmdvSGFuZGxlLm1vbmdvb3NlO1xyXG4gICAgICAgIHRyeSB7XHJcblxyXG4gICAgICAgICAgICBhc3N1cmVEaXJFeGlzdHMobW9kZWxQYXRoKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ2NyZWF0ZWQgZGlyICcgKyBtb2RlbFBhdGgpO1xyXG4gICAgICAgICAgICBDaXJjdWxhclNlci5zYXZlKG1vZGVsUGF0aCArICcvX2NhY2hlLmpzJywgb01vZGVsU2VyKTtcclxuICAgICAgICAgICAgZm9yY2VHQygpO1xyXG4gICAgICAgICAgICBpZiAocHJvY2Vzcy5lbnYuQUJPVF9FTUFJTF9VU0VSKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImxvYWRlZCBtb2RlbHMgYnkgY2FsY3VsYXRpb24gaW4gXCIgKyAoRGF0ZS5ub3coKSAtIHQpICsgXCIgXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciByZXMgPSBvTW9kZWw7XHJcbiAgICAgICAgICAgIC8vIChPYmplY3QgYXMgYW55KS5hc3NpZ24obW9kZWxIYW5kbGUsIHsgbW9kZWw6IG9Nb2RlbCB9KSBhcyBJTWF0Y2guSU1vZGVsSGFuZGxlO1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzO1xyXG4gICAgICAgIH0gY2F0Y2goIGVycikge1xyXG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIlwiICsgZXJyKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ2VyciAnICsgZXJyKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyICsgJyAnICsgZXJyLnN0YWNrKTtcclxuICAgICAgICAgICAgcHJvY2Vzcy5zdGRvdXQub24oJ2RyYWluJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBwcm9jZXNzLmV4aXQoLTEpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCcgJyArIGVyciAgKyAnICcgKyBlcnIuc3RhY2spO1xyXG4gICAgICAgIH1cclxuICAgIFxyXG4gICAgfVxyXG4gICAgKS5jYXRjaCggKGVycikgPT4ge1xyXG4gICAgICAgIGRlYnVnbG9nKFwiXCIgKyBlcnIpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdlcnIgJyArIGVycik7XHJcbiAgICAgICAgY29uc29sZS5sb2coZXJyICsgJyAnICsgZXJyLnN0YWNrKTtcclxuICAgICAgICBwcm9jZXNzLnN0ZG91dC5vbignZHJhaW4nLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcHJvY2Vzcy5leGl0KC0xKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJyAnICsgZXJyICArICcgJyArIGVyci5zdGFjayk7XHJcbiAgICB9KSBhcyBQcm9taXNlPElNYXRjaC5JTW9kZWxzPjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNvcnRDYXRlZ29yaWVzQnlJbXBvcnRhbmNlKG1hcDogeyBba2V5OiBzdHJpbmddOiBJTWF0Y2guSUNhdGVnb3J5RGVzYyB9LCBjYXRzOiBzdHJpbmdbXSk6IHN0cmluZ1tdIHtcclxuICAgIHZhciByZXMgPSBjYXRzLnNsaWNlKDApO1xyXG4gICAgcmVzLnNvcnQocmFua0NhdGVnb3J5QnlJbXBvcnRhbmNlLmJpbmQodW5kZWZpbmVkLCBtYXApKTtcclxuICAgIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByYW5rQ2F0ZWdvcnlCeUltcG9ydGFuY2UobWFwOiB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5JQ2F0ZWdvcnlEZXNjIH0sIGNhdGE6IHN0cmluZywgY2F0Yjogc3RyaW5nKTogbnVtYmVyIHtcclxuICAgIHZhciBjYXRBRGVzYyA9IG1hcFtjYXRhXTtcclxuICAgIHZhciBjYXRCRGVzYyA9IG1hcFtjYXRiXTtcclxuICAgIGlmIChjYXRhID09PSBjYXRiKSB7XHJcbiAgICAgICAgcmV0dXJuIDA7XHJcbiAgICB9XHJcbiAgICAvLyBpZiBhIGlzIGJlZm9yZSBiLCByZXR1cm4gLTFcclxuICAgIGlmIChjYXRBRGVzYyAmJiAhY2F0QkRlc2MpIHtcclxuICAgICAgICByZXR1cm4gLTE7XHJcbiAgICB9XHJcbiAgICBpZiAoIWNhdEFEZXNjICYmIGNhdEJEZXNjKSB7XHJcbiAgICAgICAgcmV0dXJuICsxO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBwcmlvQSA9IChjYXRBRGVzYyAmJiBjYXRBRGVzYy5pbXBvcnRhbmNlKSB8fCA5OTtcclxuICAgIHZhciBwcmlvQiA9IChjYXRCRGVzYyAmJiBjYXRCRGVzYy5pbXBvcnRhbmNlKSB8fCA5OTtcclxuICAgIC8vIGxvd2VyIHByaW8gZ29lcyB0byBmcm9udFxyXG4gICAgdmFyIHIgPSBwcmlvQSAtIHByaW9CO1xyXG4gICAgaWYgKHIpIHtcclxuICAgICAgICByZXR1cm4gcjtcclxuICAgIH1cclxuICAgIHJldHVybiBjYXRhLmxvY2FsZUNvbXBhcmUoY2F0Yik7XHJcbn1cclxuXHJcbmNvbnN0IE1ldGFGID0gTWV0YS5nZXRNZXRhRmFjdG9yeSgpO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldE9wZXJhdG9yKG1kbDogSU1hdGNoLklNb2RlbHMsIG9wZXJhdG9yOiBzdHJpbmcpOiBJTWF0Y2guSU9wZXJhdG9yIHtcclxuICAgIHJldHVybiBtZGwub3BlcmF0b3JzW29wZXJhdG9yXTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFJlc3VsdEFzQXJyYXkobWRsOiBJTWF0Y2guSU1vZGVscywgYTogTWV0YS5JTWV0YSwgcmVsOiBNZXRhLklNZXRhKTogTWV0YS5JTWV0YVtdIHtcclxuICAgIGlmIChyZWwudG9UeXBlKCkgIT09ICdyZWxhdGlvbicpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJleHBlY3QgcmVsYXRpb24gYXMgMm5kIGFyZ1wiKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcmVzID0gbWRsLm1ldGEudDNbYS50b0Z1bGxTdHJpbmcoKV0gJiZcclxuICAgICAgICBtZGwubWV0YS50M1thLnRvRnVsbFN0cmluZygpXVtyZWwudG9GdWxsU3RyaW5nKCldO1xyXG4gICAgaWYgKCFyZXMpIHtcclxuICAgICAgICByZXR1cm4gW107XHJcbiAgICB9XHJcbiAgICByZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMocmVzKS5zb3J0KCkubWFwKE1ldGFGLnBhcnNlSU1ldGEpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tEb21haW5QcmVzZW50KHRoZU1vZGVsOiBJTWF0Y2guSU1vZGVscywgZG9tYWluOiBzdHJpbmcpIHtcclxuICAgIGlmICh0aGVNb2RlbC5kb21haW5zLmluZGV4T2YoZG9tYWluKSA8IDApIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEb21haW4gXFxcIlwiICsgZG9tYWluICsgXCJcXFwiIG5vdCBwYXJ0IG9mIG1vZGVsXCIpO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2hvd1VSSUNhdGVnb3JpZXNGb3JEb21haW4odGhlTW9kZWwgOiBJTWF0Y2guSU1vZGVscywgZG9tYWluIDogc3RyaW5nKSA6IHN0cmluZ1tdIHtcclxuICAgIGNoZWNrRG9tYWluUHJlc2VudCh0aGVNb2RlbCwgZG9tYWluKTtcclxuICAgIHZhciBtb2RlbE5hbWUgPSBnZXRNb2RlbE5hbWVGb3JEb21haW4odGhlTW9kZWwubW9uZ29IYW5kbGUsZG9tYWluKTtcclxuICAgIHZhciBhbGxjYXRzID0gZ2V0UmVzdWx0QXNBcnJheSh0aGVNb2RlbCwgTWV0YUYuRG9tYWluKGRvbWFpbiksIE1ldGFGLlJlbGF0aW9uKE1ldGEuUkVMQVRJT05faGFzQ2F0ZWdvcnkpKTtcclxuICAgIHZhciBkb2MgPSB0aGVNb2RlbC5tb25nb0hhbmRsZS5tb2RlbERvY3NbbW9kZWxOYW1lXTtcclxuICAgIHZhciByZXMgPSBkb2MuX2NhdGVnb3JpZXMuZmlsdGVyKCBjYXQgPT4gY2F0LnNob3dVUkkgKS5tYXAoY2F0ID0+IGNhdC5jYXRlZ29yeSk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2hvd1VSSVJhbmtDYXRlZ29yaWVzRm9yRG9tYWluKHRoZU1vZGVsIDogSU1hdGNoLklNb2RlbHMsIGRvbWFpbiA6IHN0cmluZykgOiBzdHJpbmdbXSB7XHJcbiAgICBjaGVja0RvbWFpblByZXNlbnQodGhlTW9kZWwsIGRvbWFpbik7XHJcbiAgICB2YXIgbW9kZWxOYW1lID0gZ2V0TW9kZWxOYW1lRm9yRG9tYWluKHRoZU1vZGVsLm1vbmdvSGFuZGxlLGRvbWFpbik7XHJcbiAgICB2YXIgYWxsY2F0cyA9IGdldFJlc3VsdEFzQXJyYXkodGhlTW9kZWwsIE1ldGFGLkRvbWFpbihkb21haW4pLCBNZXRhRi5SZWxhdGlvbihNZXRhLlJFTEFUSU9OX2hhc0NhdGVnb3J5KSk7XHJcbiAgICB2YXIgZG9jID0gdGhlTW9kZWwubW9uZ29IYW5kbGUubW9kZWxEb2NzW21vZGVsTmFtZV07XHJcbiAgICB2YXIgcmVzID0gZG9jLl9jYXRlZ29yaWVzLmZpbHRlciggY2F0ID0+IGNhdC5zaG93VVJJUmFuayApLm1hcChjYXQgPT4gY2F0LmNhdGVnb3J5KTtcclxuICAgIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRDYXRlZ29yaWVzRm9yRG9tYWluKHRoZU1vZGVsOiBJTWF0Y2guSU1vZGVscywgZG9tYWluOiBzdHJpbmcpOiBzdHJpbmdbXSB7XHJcbiAgICBjaGVja0RvbWFpblByZXNlbnQodGhlTW9kZWwsIGRvbWFpbik7XHJcbiAgICB2YXIgcmVzID0gZ2V0UmVzdWx0QXNBcnJheSh0aGVNb2RlbCwgTWV0YUYuRG9tYWluKGRvbWFpbiksIE1ldGFGLlJlbGF0aW9uKE1ldGEuUkVMQVRJT05faGFzQ2F0ZWdvcnkpKTtcclxuICAgIHJldHVybiBNZXRhLmdldFN0cmluZ0FycmF5KHJlcyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRUYWJsZUNvbHVtbnModGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzLCBkb21haW46IHN0cmluZyk6IHN0cmluZ1tdIHtcclxuICAgIGNoZWNrRG9tYWluUHJlc2VudCh0aGVNb2RlbCwgZG9tYWluKTtcclxuICAgIHJldHVybiB0aGVNb2RlbC5yYXdNb2RlbHNbZG9tYWluXS5jb2x1bW5zLnNsaWNlKDApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmb3JjZUdDKCkge1xyXG4gICAgaWYgKGdsb2JhbCAmJiBnbG9iYWwuZ2MpIHtcclxuICAgICAgICBnbG9iYWwuZ2MoKTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFJldHVybiBhbGwgY2F0ZWdvcmllcyBvZiBhIGRvbWFpbiB3aGljaCBjYW4gYXBwZWFyIG9uIGEgd29yZCxcclxuICogdGhlc2UgYXJlIHR5cGljYWxseSB0aGUgd29yZGluZGV4IGRvbWFpbnMgKyBlbnRyaWVzIGdlbmVyYXRlZCBieSBnZW5lcmljIHJ1bGVzXHJcbiAqXHJcbiAqIFRoZSBjdXJyZW50IGltcGxlbWVudGF0aW9uIGlzIGEgc2ltcGxpZmljYXRpb25cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRQb3RlbnRpYWxXb3JkQ2F0ZWdvcmllc0ZvckRvbWFpbih0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMsIGRvbWFpbjogc3RyaW5nKTogc3RyaW5nW10ge1xyXG4gICAgLy8gdGhpcyBpcyBhIHNpbXBsaWZpZWQgdmVyc2lvblxyXG4gICAgcmV0dXJuIGdldENhdGVnb3JpZXNGb3JEb21haW4odGhlTW9kZWwsIGRvbWFpbik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXREb21haW5zRm9yQ2F0ZWdvcnkodGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzLCBjYXRlZ29yeTogc3RyaW5nKTogc3RyaW5nW10ge1xyXG4gICAgaWYgKHRoZU1vZGVsLmNhdGVnb3J5LmluZGV4T2YoY2F0ZWdvcnkpIDwgMCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhdGVnb3J5IFxcXCJcIiArIGNhdGVnb3J5ICsgXCJcXFwiIG5vdCBwYXJ0IG9mIG1vZGVsXCIpO1xyXG4gICAgfVxyXG4gICAgdmFyIHJlcyA9IGdldFJlc3VsdEFzQXJyYXkodGhlTW9kZWwsIE1ldGFGLkNhdGVnb3J5KGNhdGVnb3J5KSwgTWV0YUYuUmVsYXRpb24oTWV0YS5SRUxBVElPTl9pc0NhdGVnb3J5T2YpKTtcclxuICAgIHJldHVybiBNZXRhLmdldFN0cmluZ0FycmF5KHJlcyk7XHJcbn1cclxuXHJcbi8qXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRBbGxSZWNvcmRDYXRlZ29yaWVzRm9yVGFyZ2V0Q2F0ZWdvcnkobW9kZWw6IElNYXRjaC5JTW9kZWxzLCBjYXRlZ29yeTogc3RyaW5nLCB3b3Jkc29ubHk6IGJvb2xlYW4pOiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfSB7XHJcbiAgICB2YXIgcmVzID0ge307XHJcbiAgICAvL1xyXG4gICAgdmFyIGZuID0gd29yZHNvbmx5ID8gZ2V0UG90ZW50aWFsV29yZENhdGVnb3JpZXNGb3JEb21haW4gOiBnZXRDYXRlZ29yaWVzRm9yRG9tYWluO1xyXG4gICAgdmFyIGRvbWFpbnMgPSBnZXREb21haW5zRm9yQ2F0ZWdvcnkobW9kZWwsIGNhdGVnb3J5KTtcclxuICAgIGRvbWFpbnMuZm9yRWFjaChmdW5jdGlvbiAoZG9tYWluKSB7XHJcbiAgICAgICAgZm4obW9kZWwsIGRvbWFpbikuZm9yRWFjaChmdW5jdGlvbiAod29yZGNhdCkge1xyXG4gICAgICAgICAgICByZXNbd29yZGNhdF0gPSB0cnVlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWxsUmVjb3JkQ2F0ZWdvcmllc0ZvclRhcmdldENhdGVnb3JpZXMobW9kZWw6IElNYXRjaC5JTW9kZWxzLCBjYXRlZ29yaWVzOiBzdHJpbmdbXSwgd29yZHNvbmx5OiBib29sZWFuKTogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0ge1xyXG4gICAgdmFyIHJlcyA9IHt9O1xyXG4gICAgLy9cclxuICAgIHZhciBmbiA9IHdvcmRzb25seSA/IGdldFBvdGVudGlhbFdvcmRDYXRlZ29yaWVzRm9yRG9tYWluIDogZ2V0Q2F0ZWdvcmllc0ZvckRvbWFpbjtcclxuICAgIHZhciBkb21haW5zID0gdW5kZWZpbmVkO1xyXG4gICAgY2F0ZWdvcmllcy5mb3JFYWNoKGZ1bmN0aW9uIChjYXRlZ29yeSkge1xyXG4gICAgICAgIHZhciBjYXRkb21haW5zID0gZ2V0RG9tYWluc0ZvckNhdGVnb3J5KG1vZGVsLCBjYXRlZ29yeSlcclxuICAgICAgICBpZiAoIWRvbWFpbnMpIHtcclxuICAgICAgICAgICAgZG9tYWlucyA9IGNhdGRvbWFpbnM7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZG9tYWlucyA9IF8uaW50ZXJzZWN0aW9uKGRvbWFpbnMsIGNhdGRvbWFpbnMpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgaWYgKGRvbWFpbnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYXRlZ29yaWVzICcgKyBVdGlscy5saXN0VG9RdW90ZWRDb21tYUFuZChjYXRlZ29yaWVzKSArICcgaGF2ZSBubyBjb21tb24gZG9tYWluLicpXHJcbiAgICB9XHJcbiAgICBkb21haW5zLmZvckVhY2goZnVuY3Rpb24gKGRvbWFpbikge1xyXG4gICAgICAgIGZuKG1vZGVsLCBkb21haW4pLmZvckVhY2goZnVuY3Rpb24gKHdvcmRjYXQpIHtcclxuICAgICAgICAgICAgcmVzW3dvcmRjYXRdID0gdHJ1ZTtcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG4gICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xyXG4gICAgcmV0dXJuIHJlcztcclxufVxyXG4qL1xyXG5cclxuLyoqXHJcbiAqIGdpdmVuYSAgc2V0ICBvZiBjYXRlZ29yaWVzLCByZXR1cm4gYSBzdHJ1Y3R1cmVcclxuICpcclxuICpcclxuICogeyBkb21haW5zIDogW1wiRE9NQUlOMVwiLCBcIkRPTUFJTjJcIl0sXHJcbiAqICAgY2F0ZWdvcnlTZXQgOiB7ICAgY2F0MSA6IHRydWUsIGNhdDIgOiB0cnVlLCAuLi59XHJcbiAqIH1cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXREb21haW5DYXRlZ29yeUZpbHRlckZvclRhcmdldENhdGVnb3JpZXMobW9kZWw6IElNYXRjaC5JTW9kZWxzLCBjYXRlZ29yaWVzOiBzdHJpbmdbXSwgd29yZHNvbmx5OiBib29sZWFuKTogSU1hdGNoLklEb21haW5DYXRlZ29yeUZpbHRlciB7XHJcbiAgICB2YXIgcmVzID0ge307XHJcbiAgICAvL1xyXG4gICAgdmFyIGZuID0gd29yZHNvbmx5ID8gZ2V0UG90ZW50aWFsV29yZENhdGVnb3JpZXNGb3JEb21haW4gOiBnZXRDYXRlZ29yaWVzRm9yRG9tYWluO1xyXG4gICAgdmFyIGRvbWFpbnMgPSB1bmRlZmluZWQgYXMgc3RyaW5nW107XHJcbiAgICBjYXRlZ29yaWVzLmZvckVhY2goZnVuY3Rpb24gKGNhdGVnb3J5KSB7XHJcbiAgICAgICAgdmFyIGNhdGRvbWFpbnMgPSBnZXREb21haW5zRm9yQ2F0ZWdvcnkobW9kZWwsIGNhdGVnb3J5KVxyXG4gICAgICAgIGlmICghZG9tYWlucykge1xyXG4gICAgICAgICAgICBkb21haW5zID0gY2F0ZG9tYWlucztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBkb21haW5zID0gXy5pbnRlcnNlY3Rpb24oZG9tYWlucywgY2F0ZG9tYWlucyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICBpZiAoZG9tYWlucy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NhdGVnb3JpZXMgJyArIFV0aWxzLmxpc3RUb1F1b3RlZENvbW1hQW5kKGNhdGVnb3JpZXMpICsgJyBoYXZlIG5vIGNvbW1vbiBkb21haW4uJylcclxuICAgIH1cclxuICAgIGRvbWFpbnMuZm9yRWFjaChmdW5jdGlvbiAoZG9tYWluKSB7XHJcbiAgICAgICAgZm4obW9kZWwsIGRvbWFpbikuZm9yRWFjaChmdW5jdGlvbiAod29yZGNhdCkge1xyXG4gICAgICAgICAgICByZXNbd29yZGNhdF0gPSB0cnVlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGRvbWFpbnM6IGRvbWFpbnMsXHJcbiAgICAgICAgY2F0ZWdvcnlTZXQ6IHJlc1xyXG4gICAgfTtcclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXREb21haW5DYXRlZ29yeUZpbHRlckZvclRhcmdldENhdGVnb3J5KG1vZGVsOiBJTWF0Y2guSU1vZGVscywgY2F0ZWdvcnk6IHN0cmluZywgd29yZHNvbmx5OiBib29sZWFuKTogSU1hdGNoLklEb21haW5DYXRlZ29yeUZpbHRlciB7XHJcbiAgICByZXR1cm4gZ2V0RG9tYWluQ2F0ZWdvcnlGaWx0ZXJGb3JUYXJnZXRDYXRlZ29yaWVzKG1vZGVsLCBbY2F0ZWdvcnldLCB3b3Jkc29ubHkpO1xyXG59XHJcblxyXG5cclxuIl19
