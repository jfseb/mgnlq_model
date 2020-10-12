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
                /*  if ( modelname == "iupacs") {
                   debuglog(' modeldocs is ');
                   debuglog(' here ' + JSON.stringify(modelDoc));
                   debuglog(' here ' + JSON.stringify(extendedSchema));
                   console.log(' modelDocs is ' + JSON.stringify(modelDoc));
                   console.log('*** esschema is ' + JSON.stringify(extendedSchema));
                }*/
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3ZELElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDVixPQUFPLEdBQUcsVUFBVSxDQUFDO1NBQ3hCO2FBQU07WUFDSCxPQUFPLEdBQUcsQ0FBQyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUM7U0FDakQ7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUNILElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDdEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxHQUFHLHlCQUF5QixDQUFDLENBQUE7S0FDdEc7SUFDRCxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsTUFBTTtRQUM1QixFQUFFLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLE9BQU87WUFDdkMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQztRQUN4QixDQUFDLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNuQixPQUFPO1FBQ0gsT0FBTyxFQUFFLE9BQU87UUFDaEIsV0FBVyxFQUFFLEdBQUc7S0FDbkIsQ0FBQztBQUNOLENBQUM7QUExQkQsZ0dBMEJDO0FBR0QsU0FBZ0Isd0NBQXdDLENBQUMsS0FBcUIsRUFBRSxRQUFnQixFQUFFLFNBQWtCO0lBQ2hILE9BQU8sMENBQTBDLENBQUMsS0FBSyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDcEYsQ0FBQztBQUZELDRGQUVDIiwiZmlsZSI6Im1vZGVsL21vZGVsLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEZ1bmN0aW9uYWxpdHkgbWFuYWdpbmcgdGhlIG1hdGNoIG1vZGVsc1xyXG4gKlxyXG4gKiBAZmlsZVxyXG4gKi9cclxuXHJcbi8vaW1wb3J0ICogYXMgaW50ZiBmcm9tICdjb25zdGFudHMnO1xyXG5pbXBvcnQgKiBhcyBkZWJ1Z2YgZnJvbSAnZGVidWdmJztcclxuXHJcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnZignbW9kZWwnKTtcclxuXHJcbi8vIHRoZSBoYXJkY29kZWQgZG9tYWluIG1ldGFtb2RlbCFcclxuY29uc3QgRE9NQUlOX01FVEFNT0RFTCA9ICdtZXRhbW9kZWwnO1xyXG5cclxuXHJcbi8vY29uc3QgbG9hZGxvZyA9IGxvZ2dlci5sb2dnZXIoJ21vZGVsbG9hZCcsICcnKTtcclxuXHJcbmltcG9ydCAqICBhcyBJTWF0Y2ggZnJvbSAnLi4vbWF0Y2gvaWZtYXRjaCc7XHJcbmltcG9ydCAqIGFzIElucHV0RmlsdGVyUnVsZXMgZnJvbSAnLi4vbWF0Y2gvcnVsZSc7XHJcbi8vaW1wb3J0ICogYXMgVG9vbHMgZnJvbSAnLi4vbWF0Y2gvdG9vbHMnO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCAqIGFzIE1ldGEgZnJvbSAnLi9tZXRhJztcclxuaW1wb3J0ICogYXMgVXRpbHMgZnJvbSAnYWJvdF91dGlscyc7XHJcbmltcG9ydCAqIGFzIENpcmN1bGFyU2VyIGZyb20gJ2Fib3RfdXRpbHMnO1xyXG5pbXBvcnQgKiBhcyBEaXN0YW5jZSBmcm9tICdhYm90X3N0cmluZ2Rpc3QnO1xyXG5pbXBvcnQgKiBhcyBwcm9jZXNzIGZyb20gJ3Byb2Nlc3MnO1xyXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XHJcblxyXG5pbXBvcnQgKiBhcyBNb25nb1V0aWxzIGZyb20gJy4uL3V0aWxzL21vbmdvJztcclxuXHJcbmltcG9ydCAqIGFzIG1vbmdvb3NlIGZyb20gJ21vbmdvb3NlJztcclxuaW1wb3J0ICogYXMgSVNjaGVtYSBmcm9tICcuLi9tb2RlbGxvYWQvc2NoZW1hbG9hZCc7XHJcbmltcG9ydCAqIGFzIFNjaGVtYWxvYWQgZnJvbSAnLi4vbW9kZWxsb2FkL3NjaGVtYWxvYWQnO1xyXG5pbXBvcnQgKiBhcyBNb25nb01hcCBmcm9tICcuL21vbmdvbWFwJztcclxuXHJcbi8qKlxyXG4gKiB0aGUgbW9kZWwgcGF0aCwgbWF5IGJlIGNvbnRyb2xsZWQgdmlhIGVudmlyb25tZW50IHZhcmlhYmxlXHJcbiAqL1xyXG52YXIgZW52TW9kZWxQYXRoID0gcHJvY2Vzcy5lbnZbXCJBQk9UX01PREVMUEFUSFwiXSB8fCBcIm5vZGVfbW9kdWxlcy9tZ25scV90ZXN0bW9kZWwvdGVzdG1vZGVsXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNtcFRvb2xzKGE6IElNYXRjaC5JVG9vbCwgYjogSU1hdGNoLklUb29sKSB7XHJcbiAgICByZXR1cm4gYS5uYW1lLmxvY2FsZUNvbXBhcmUoYi5uYW1lKTtcclxufVxyXG5cclxudHlwZSBJTW9kZWwgPSBJTWF0Y2guSU1vZGVsO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHByb3BhZ2F0ZVR5cGVUb01vZGVsRG9jKCBtb2RlbERvYyA6IElGTW9kZWwuSU1vZGVsRG9jLCBlc2NoZW1hIDogSUZNb2RlbC5JRXh0ZW5kZWRTY2hlbWEgKSB7XHJcbiAgICAvLyBwcm9wcyB7IFwiZWxlbWVudF9zeW1ib2xcIjp7XCJ0eXBlXCI6XCJTdHJpbmdcIixcInRyaW1cIjp0cnVlLFwiX21fY2F0ZWdvcnlcIjpcImVsZW1lbnQgc3ltYm9sXCIsXCJ7XHJcbiAgICBtb2RlbERvYy5fY2F0ZWdvcmllcy5mb3JFYWNoKCBjYXQgPT4ge1xyXG4gICAgICAgIHZhciBwcm9wZXJ0eU5hbWUgPSBNb25nb01hcC5tYWtlQ2Fub25pY1Byb3BlcnR5TmFtZShjYXQuY2F0ZWdvcnkpOyBcclxuICAgICAgICB2YXIgcHJvcCA9IE1vbmdvTWFwLmZpbmRFc2NoZW1hUHJvcEZvckNhdGVnb3J5KGVzY2hlbWEucHJvcHMsIGNhdC5jYXRlZ29yeSk7XHJcbiAgICAgICAgaWYgKCAhcHJvcCkge1xyXG4gICAgICAgICAgICBpZiggbW9kZWxEb2MubW9kZWxuYW1lICE9PSBcIm1ldGFtWFhYb2RlbHNcIikge1xyXG4gICAgICAgICAgICAgICAgdmFyIGVyciA9IFxyXG4gICAgICAgICAgICAgICBcIlVuYWJsZSB0byBmaW5kIHByb3BlcnR5IFwiICsgcHJvcGVydHlOYW1lICsgXCIgZm9yIGNhdGVnb3J5IFwiICsgY2F0LmNhdGVnb3J5ICsgXCIgaW4gbW9kZWwgXCIgXHJcbiAgICAgICAgICAgICAgICArIG1vZGVsRG9jLm1vZGVsbmFtZVxyXG4gICAgICAgICAgICAgICAgKyBcIjsgdmFsaWQgcHJvcHMgYXJlOlxcXCJcIiArIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGVzY2hlbWEucHJvcHMpLmpvaW4oXCIsXFxuXCIpICsgXCJcXFwiXCIgXHJcbiAgICAgICAgICAgICAgICAgKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KGVzY2hlbWEucHJvcHMpO1xyXG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XHJcbiAgICAgICAgICAgICAgICAgZGVidWdsb2coZXJyKTtcclxuICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGRlYnVnbG9nKCcgYXVnbWVudGluZyB0eXBlIGZvciBcXFwiJyArIGNhdC5jYXRlZ29yeSArIFwiKFwiICsgcHJvcGVydHlOYW1lICsgXCIpXFxcIiB3aXRoIFwiICsgSlNPTi5zdHJpbmdpZnkocHJvcC50eXBlKSk7XHJcbiAgICAgICAgICAgIGNhdC50eXBlID0gcHJvcC50eXBlOyAvLyB0aGlzIG1heSBiZSBbXCJTdHJpbmdcIl0gZm9yIGFuIGFycmF5IHR5cGUhXHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiByZXR1cm5zIHdoZW4gYWxsIG1vZGVscyBhcmUgbG9hZGVkIGFuZCBhbGwgbW9kZWxkb2NzIGFyZSBtYWRlXHJcbiAqIEBwYXJhbSBtb25nb29zZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldE1vbmdvSGFuZGxlKG1vbmdvb3NlOiBtb25nb29zZS5Nb25nb29zZSk6IFByb21pc2U8SU1hdGNoLklNb2RlbEhhbmRsZVJhdz4ge1xyXG4gICAgdmFyIHJlcyA9IHtcclxuICAgICAgICBtb25nb29zZTogbW9uZ29vc2UsXHJcbiAgICAgICAgbW9kZWxEb2NzOiB7fSxcclxuICAgICAgICBtb2RlbEVTY2hlbWFzOiB7fSxcclxuICAgICAgICBtb25nb01hcHM6IHt9XHJcbiAgICB9IGFzIElNYXRjaC5JTW9kZWxIYW5kbGVSYXc7XHJcbiAgICB2YXIgbW9kZWxFUyA9IFNjaGVtYWxvYWQuZ2V0RXh0ZW5kZWRTY2hlbWFNb2RlbChtb25nb29zZSk7XHJcbiAgICByZXR1cm4gbW9kZWxFUy5kaXN0aW5jdCgnbW9kZWxuYW1lJykudGhlbigobW9kZWxuYW1lcykgPT4ge1xyXG4gICAgICAgIGRlYnVnbG9nKCgpID0+ICdoZXJlIGRpc3RpbmN0IG1vZGVsbmFtZXMgJyArIEpTT04uc3RyaW5naWZ5KG1vZGVsbmFtZXMpKTtcclxuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwobW9kZWxuYW1lcy5tYXAoZnVuY3Rpb24gKG1vZGVsbmFtZSkge1xyXG4gICAgICAgICAgICBkZWJ1Z2xvZygoKSA9PiAnY3JlYXRpbmcgdHJpcGVsIGZvciAnICsgbW9kZWxuYW1lKTtcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFtTY2hlbWFsb2FkLmdldEV4dGVuZFNjaGVtYURvY0Zyb21EQihtb25nb29zZSwgbW9kZWxuYW1lKSxcclxuICAgICAgICAgICAgU2NoZW1hbG9hZC5tYWtlTW9kZWxGcm9tREIobW9uZ29vc2UsIG1vZGVsbmFtZSksXHJcbiAgICAgICAgICAgIFNjaGVtYWxvYWQuZ2V0TW9kZWxEb2NGcm9tREIobW9uZ29vc2UsIG1vZGVsbmFtZSldKS50aGVuKFxyXG4gICAgICAgICAgICAgICAgKHZhbHVlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coKCkgPT4gJ2F0dGVtcHRpbmcgdG8gbG9hZCAnICsgbW9kZWxuYW1lICsgJyB0byBjcmVhdGUgbW9uZ29tYXAnKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgW2V4dGVuZGVkU2NoZW1hLCBtb2RlbCwgbW9kZWxEb2NdID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLm1vZGVsRVNjaGVtYXNbbW9kZWxuYW1lXSA9IGV4dGVuZGVkU2NoZW1hO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5tb2RlbERvY3NbbW9kZWxuYW1lXSA9IG1vZGVsRG9jO1xyXG4gICAgICAgICAgICAgICAgICAgIHByb3BhZ2F0ZVR5cGVUb01vZGVsRG9jKG1vZGVsRG9jLGV4dGVuZGVkU2NoZW1hKTtcclxuICAgICAgICAgICAgICAgICAgICAvKiAgaWYgKCBtb2RlbG5hbWUgPT0gXCJpdXBhY3NcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKCcgbW9kZWxkb2NzIGlzICcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKCcgaGVyZSAnICsgSlNPTi5zdHJpbmdpZnkobW9kZWxEb2MpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnIGhlcmUgJyArIEpTT04uc3RyaW5naWZ5KGV4dGVuZGVkU2NoZW1hKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJyBtb2RlbERvY3MgaXMgJyArIEpTT04uc3RyaW5naWZ5KG1vZGVsRG9jKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJyoqKiBlc3NjaGVtYSBpcyAnICsgSlNPTi5zdHJpbmdpZnkoZXh0ZW5kZWRTY2hlbWEpKTtcclxuICAgICAgICAgICAgICAgICAgICB9Ki9cclxuICAgICAgICAgICAgICAgICAgICByZXMubW9uZ29NYXBzW21vZGVsbmFtZV0gPSBNb25nb01hcC5tYWtlTW9uZ29NYXAobW9kZWxEb2MsIGV4dGVuZGVkU2NoZW1hKVxyXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKCgpPT4gJ2NyZWF0ZWQgbW9uZ29tYXAgZm9yICcgKyBtb2RlbG5hbWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgKVxyXG4gICAgICAgIH0pKTtcclxuICAgIH0pLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgIHJldHVybiByZXM7XHJcbiAgICB9KVxyXG4gICAgLy92YXIgbW9kZWxEb2MgPSBTY2hlbWFsb2FkLmdldEV4dGVuZGVkRG9jTW9kZWwobW9uZ29vc2UpO1xyXG4gICAgLy9yZXMubW9kZWxEb2NzW0lTY2hlbWEuTW9uZ29OTFEuTU9ERUxOQU1FX01FVEFNT0RFTFNdID0gbW9kZWxEb2M7XHJcbiAgICAvL3JldHVybiBQcm9taXNlLnJlc29sdmUocmVzKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEZhY3RTeW5vbnltcyhtb25nb0hhbmRsZTogSU1hdGNoLklNb2RlbEhhbmRsZVJhdywgbW9kZWxuYW1lOiBzdHJpbmcpOiBQcm9taXNlPElTeW5vbnltW10+IHtcclxuICAgIHZhciBtb2RlbCA9IG1vbmdvSGFuZGxlLm1vbmdvb3NlLm1vZGVsKFNjaGVtYWxvYWQubWFrZU1vbmdvb3NlTW9kZWxOYW1lKG1vZGVsbmFtZSkpO1xyXG4gICAgLy8gICAgIHJldHVybiBtb2RlbC5maW5kKCB7IFwiX3N5bm9ueW1zLjBcIiA6IHsgJGV4aXN0czogZmFsc2V9fSkubGVhbigpLmV4ZWMoKTtcclxuLyogbW9uZ29vc2UgcHJpb3JcclxuICAgIHJldHVybiBtb2RlbC5hZ2dyZWdhdGUoeyAkbWF0Y2g6IHsgXCJfc3lub255bXMuMFwiOiB7ICRleGlzdHM6IHRydWUgfSB9IH0sXHJcbiAgICAgICAgeyAkcHJvamVjdDogeyBfc3lub255bXM6IDEgfSB9LFxyXG4gICAgICAgIHsgJHVud2luZDogXCIkX3N5bm9ueW1zXCIgfSxcclxuICAgICAgICB7ICRwcm9qZWN0OiB7IFwiY2F0ZWdvcnlcIjogXCIkX3N5bm9ueW1zLmNhdGVnb3J5XCIsIFwiZmFjdFwiOiBcIiRfc3lub255bXMuZmFjdFwiLCBcInN5bm9ueW1zXCI6IFwiJF9zeW5vbnltcy5zeW5vbnltc1wiIH0gfSkuZXhlYygpO1xyXG4qL1xyXG4gICAgcmV0dXJuIG1vZGVsLmFnZ3JlZ2F0ZShbeyAkbWF0Y2g6IHsgXCJfc3lub255bXMuMFwiOiB7ICRleGlzdHM6IHRydWUgfSB9IH0sXHJcbiAgICAgICAgeyAkcHJvamVjdDogeyBfc3lub255bXM6IDEgfSB9LFxyXG4gICAgICAgIHsgJHVud2luZDogXCIkX3N5bm9ueW1zXCIgfSxcclxuICAgICAgICB7ICRwcm9qZWN0OiB7IFwiY2F0ZWdvcnlcIjogXCIkX3N5bm9ueW1zLmNhdGVnb3J5XCIsIFwiZmFjdFwiOiBcIiRfc3lub255bXMuZmFjdFwiLCBcInN5bm9ueW1zXCI6IFwiJF9zeW5vbnltcy5zeW5vbnltc1wiIH0gfV0pLmV4ZWMoKTtcclxuXHJcblxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElTeW5vbnltIHtcclxuICAgIGNhdGVnb3J5OiBzdHJpbmcsXHJcbiAgICBmYWN0OiBzdHJpbmcsXHJcbiAgICBzeW5vbnltczogc3RyaW5nW11cclxufTtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVN5bm9ueW1CZWFyaW5nRG9jIHtcclxuICAgIF9zeW5vbnltczogW3tcclxuICAgICAgICBjYXRlZ29yeTogc3RyaW5nLFxyXG4gICAgICAgIGZhY3Q6IHN0cmluZyxcclxuICAgICAgICBzeW5vbnltczogc3RyaW5nW11cclxuICAgIH1dXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRNb25nb0NvbGxlY3Rpb25OYW1lRm9yRG9tYWluKHRoZU1vZGVsOiBJTWF0Y2guSU1vZGVscywgZG9tYWluIDogc3RyaW5nKSA6IHN0cmluZyB7XHJcbiAgICB2YXIgciA9IGdldE1vbmdvb3NlTW9kZWxOYW1lRm9yRG9tYWluKHRoZU1vZGVsLCBkb21haW4pO1xyXG4gICAgcmV0dXJuIFNjaGVtYWxvYWQubWFrZU1vbmdvQ29sbGVjdGlvbk5hbWUocilcclxufVxyXG5cclxuLy9TY2hlbWFsb2FkLm1ha2VNb25nb29zZU1vZGVsTmFtZShtb2RlbG5hbWUpXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0TW9uZ29vc2VNb2RlbE5hbWVGb3JEb21haW4odGhlTW9kZWwgOiBJTWF0Y2guSU1vZGVscywgZG9tYWluIDogc3RyaW5nKSA6IHN0cmluZyB7XHJcbiAgICB2YXIgciA9IGdldE1vZGVsTmFtZUZvckRvbWFpbih0aGVNb2RlbC5tb25nb0hhbmRsZSwgZG9tYWluKTtcclxuICAgIHZhciByMiA9IFNjaGVtYWxvYWQubWFrZU1vbmdvb3NlTW9kZWxOYW1lKHIpO1xyXG4gICAgcmV0dXJuIHIyO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldE1vZGVsRm9yTW9kZWxOYW1lKHRoZU1vZGVsIDogSU1hdGNoLklNb2RlbHMsIG1vZGVsbmFtZTogc3RyaW5nKSA6IGFueSB7XHJcbiAgICByZXR1cm4gdGhlTW9kZWwubW9uZ29IYW5kbGUubW9uZ29vc2UubW9kZWwoU2NoZW1hbG9hZC5tYWtlTW9uZ29vc2VNb2RlbE5hbWUobW9kZWxuYW1lKSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRNb2RlbEZvckRvbWFpbih0aGVNb2RlbCA6IElNYXRjaC5JTW9kZWxzLCBkb21haW4gOiBzdHJpbmcpIDogYW55IHtcclxuICAgIHZhciBtb2RlbG5hbWUgPSBnZXRNb2RlbE5hbWVGb3JEb21haW4odGhlTW9kZWwubW9uZ29IYW5kbGUsIGRvbWFpbik7XHJcbiAgICByZXR1cm4gZ2V0TW9kZWxGb3JNb2RlbE5hbWUodGhlTW9kZWwsIG1vZGVsbmFtZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRNb2RlbE5hbWVGb3JEb21haW4oaGFuZGxlIDogSU1hdGNoLklNb2RlbEhhbmRsZVJhdywgZG9tYWluIDogc3RyaW5nKSA6IHN0cmluZyB7XHJcbiAgICB2YXIgcmVzID0gdW5kZWZpbmVkO1xyXG4gICAgT2JqZWN0LmtleXMoaGFuZGxlLm1vZGVsRG9jcykuZXZlcnkoIGtleSA9PiB7XHJcbiAgICAgICAgdmFyIGRvYyA9IGhhbmRsZS5tb2RlbERvY3Nba2V5XTtcclxuICAgICAgICBpZihkb21haW4gPT09IGRvYy5kb21haW4pIHtcclxuICAgICAgICAgICAgcmVzID0gZG9jLm1vZGVsbmFtZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuICFyZXM7XHJcbiAgICB9KTtcclxuICAgIGlmKCFyZXMpIHtcclxuICAgICAgICB0aHJvdyBFcnJvcignYXR0ZW1wdCB0byByZXRyaWV2ZSBtb2RlbE5hbWUgZm9yIHVua25vd24gZG9tYWluICcgKyBkb21haW4pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGFzc3VyZURpckV4aXN0cyhkaXIgOiBzdHJpbmcpIHtcclxuICAgIGlmICghZnMuZXhpc3RzU3luYyhkaXIpKXtcclxuICAgICAgICBmcy5ta2RpclN5bmMoZGlyKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclJlbWFwQ2F0ZWdvcmllcyggbW9uZ29NYXAgOiBJTWF0Y2guQ2F0TW9uZ29NYXAsIGNhdGVnb3JpZXMgOiBzdHJpbmdbXSwgcmVjb3JkcyA6IGFueVtdICkgOiBhbnlbXSB7XHJcbiAgICAvL1xyXG4gICAgLy9jb25zb2xlLmxvZygnaGVyZSBtYXAnICsgSlNPTi5zdHJpbmdpZnkobW9uZ29NYXAsdW5kZWZpbmVkLDIpKTtcclxuICAgIHJldHVybiByZWNvcmRzLm1hcCgocmVjLGluZGV4KSA9PiB7XHJcbiAgICAgICAgdmFyIHJlcyA9IHt9O1xyXG4gICAgICAgIGNhdGVnb3JpZXMuZm9yRWFjaChjYXRlZ29yeSA9PiB7XHJcbiAgICAgICAgICAgIHZhciBjYXRlZ29yeVBhdGggPSBtb25nb01hcFtjYXRlZ29yeV0ucGF0aHM7XHJcbiAgICAgICAgICAgIGlmKCFjYXRlZ29yeVBhdGgpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgdW5rbm93biBjYXRlZ29yeSAke2NhdGVnb3J5fSBub3QgcHJlc2VudCBpbiAke0pTT04uc3RyaW5naWZ5KG1vbmdvTWFwLHVuZGVmaW5lZCwyKX1gKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXNbY2F0ZWdvcnldID0gTW9uZ29NYXAuZ2V0TWVtYmVyQnlQYXRoKHJlYywgY2F0ZWdvcnlQYXRoKTtcclxuICAgICAgICAgICAgZGVidWdsb2coICgpPT4nZ290IG1lbWJlciBmb3IgJyAgKyBjYXRlZ29yeSArICcgZnJvbSByZWMgbm8gJyArIGluZGV4ICsgJyAnICsgSlNPTi5zdHJpbmdpZnkocmVjLHVuZGVmaW5lZCwyKSApO1xyXG4gICAgICAgICAgICBkZWJ1Z2xvZygoKT0+IEpTT04uc3RyaW5naWZ5KGNhdGVnb3J5UGF0aCkpO1xyXG4gICAgICAgICAgICBkZWJ1Z2xvZygoKT0+ICdyZXMgOiAnICsgcmVzW2NhdGVnb3J5XSApO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiByZXM7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrTW9kZWxNb25nb01hcChtb2RlbDogbW9uZ29vc2UuTW9kZWw8YW55PiwgbW9kZWxuYW1lIDogc3RyaW5nLCBtb25nb01hcDogSU1hdGNoLkNhdE1vbmdvTWFwLCBjYXRlZ29yeT8gOiBzdHJpbmcpIHtcclxuICAgIGlmICghbW9kZWwpIHtcclxuICAgICAgICBkZWJ1Z2xvZygnIG5vIG1vZGVsIGZvciAnICsgbW9kZWxuYW1lKTtcclxuIC8vICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChgbW9kZWwgJHttb2RlbG5hbWV9IG5vdCBmb3VuZCBpbiBkYmApO1xyXG4gICAgICAgIHRocm93IEVycm9yKGBtb2RlbCAke21vZGVsbmFtZX0gbm90IGZvdW5kIGluIGRiYCk7XHJcbiAgICB9XHJcbiAgICBpZiAoIW1vbmdvTWFwKSB7XHJcbiAgICAgICAgZGVidWdsb2coJyBubyBtb25nb01hcCBmb3IgJyArIG1vZGVsbmFtZSk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBtb2RlbCAke21vZGVsbmFtZX0gaGFzIG5vIG1vZGVsbWFwYCk7XHJcbi8vICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoYG1vZGVsICR7bW9kZWxuYW1lfSBoYXMgbm8gbW9kZWxtYXBgKTtcclxuICAgIH1cclxuICAgIGlmIChjYXRlZ29yeSAmJiAhbW9uZ29NYXBbY2F0ZWdvcnldKSB7XHJcbiAgICAgICAgZGVidWdsb2coJyBubyBtb25nb01hcCBjYXRlZ29yeSBmb3IgJyArIG1vZGVsbmFtZSk7XHJcbiAgLy8gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoYG1vZGVsICR7bW9kZWxuYW1lfSBoYXMgbm8gY2F0ZWdvcnkgJHtjYXRlZ29yeX1gKTtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgbW9kZWwgJHttb2RlbG5hbWV9IGhhcyBubyBjYXRlZ29yeSAke2NhdGVnb3J5fWApO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4cGFuZGVkUmVjb3Jkc0Z1bGwodGhlTW9kZWwgOiBJTWF0Y2guSU1vZGVscywgZG9tYWluIDogc3RyaW5nKSA6IFByb21pc2U8eyBba2V5IDogc3RyaW5nXSA6IGFueX0+IHtcclxuICAgIHZhciBtb25nb0hhbmRsZSA9IHRoZU1vZGVsLm1vbmdvSGFuZGxlO1xyXG4gICAgdmFyIG1vZGVsbmFtZSA9IGdldE1vZGVsTmFtZUZvckRvbWFpbih0aGVNb2RlbC5tb25nb0hhbmRsZSwgZG9tYWluKTtcclxuICAgIGRlYnVnbG9nKCgpPT5gIG1vZGVsbmFtZSBmb3IgJHtkb21haW59IGlzICR7bW9kZWxuYW1lfWApO1xyXG4gICAgdmFyIG1vZGVsID0gbW9uZ29IYW5kbGUubW9uZ29vc2UubW9kZWwoU2NoZW1hbG9hZC5tYWtlTW9uZ29vc2VNb2RlbE5hbWUobW9kZWxuYW1lKSk7XHJcbiAgICB2YXIgbW9uZ29NYXAgPSBtb25nb0hhbmRsZS5tb25nb01hcHNbbW9kZWxuYW1lXTtcclxuICAgIGRlYnVnbG9nKCgpPT4gJ2hlcmUgdGhlIG1vbmdvbWFwJyArIEpTT04uc3RyaW5naWZ5KG1vbmdvTWFwLHVuZGVmaW5lZCwyKSk7XHJcbiAgICB2YXIgcCA9IGNoZWNrTW9kZWxNb25nb01hcChtb2RlbCxtb2RlbG5hbWUsIG1vbmdvTWFwKTtcclxuICAgIGRlYnVnbG9nKCgpPT5gIGhlcmUgdGhlIG1vZGVsbWFwIGZvciAke2RvbWFpbn0gaXMgJHtKU09OLnN0cmluZ2lmeShtb25nb01hcCx1bmRlZmluZWQsMil9YCk7XHJcbiAgICAvLyAxKSBwcm9kdWNlIHRoZSBmbGF0dGVuZWQgcmVjb3Jkc1xyXG4gICAgdmFyIHJlcyA9IE1vbmdvTWFwLnVud2luZHNGb3JOb250ZXJtaW5hbEFycmF5cyhtb25nb01hcCk7XHJcbiAgICBkZWJ1Z2xvZygoKT0+J2hlcmUgdGhlIHVud2luZCBzdGF0ZW1lbnQgJyArIEpTT04uc3RyaW5naWZ5KHJlcyx1bmRlZmluZWQsMikpO1xyXG4gICAgLy8gd2UgaGF2ZSB0byB1bndpbmQgYWxsIGNvbW1vbiBub24tdGVybWluYWwgY29sbGVjdGlvbnMuXHJcbiAgICBkZWJ1Z2xvZygoKT0+J2hlcmUgdGhlIG1vZGVsICcgKyBtb2RlbC5tb2RlbE5hbWUpO1xyXG4gICAgdmFyIGNhdGVnb3JpZXMgPSBnZXRDYXRlZ29yaWVzRm9yRG9tYWluKHRoZU1vZGVsLCBkb21haW4pO1xyXG4gICAgZGVidWdsb2coKCk9PmBoZXJlIGNhdGVnb3JpZXMgZm9yICR7ZG9tYWlufSAke2NhdGVnb3JpZXMuam9pbignOycpfWApO1xyXG4gICAgaWYocmVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIHJldHVybiBtb2RlbC5maW5kKHt9KS5sZWFuKCkuZXhlYygpLnRoZW4oKCB1bndvdW5kIDogYW55W10pID0+IHtcclxuICAgICAgICAgICAgZGVidWdsb2coKCk9PidoZXJlIHJlcycgKyBKU09OLnN0cmluZ2lmeSh1bndvdW5kKSk7XHJcbiAgICAgICAgICAgIHJldHVybiBmaWx0ZXJSZW1hcENhdGVnb3JpZXMobW9uZ29NYXAsIGNhdGVnb3JpZXMsIHVud291bmQpXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbW9kZWwuYWdncmVnYXRlKHJlcykudGhlbiggdW53b3VuZCA9PiB7XHJcbiAgICAgICAgLy8gZmlsdGVyIGZvciBhZ2dyZWdhdGVcclxuICAgICAgICBkZWJ1Z2xvZygoKT0+J2hlcmUgcmVzJyArIEpTT04uc3RyaW5naWZ5KHVud291bmQpKTtcclxuICAgICAgICByZXR1cm4gZmlsdGVyUmVtYXBDYXRlZ29yaWVzKG1vbmdvTWFwLCBjYXRlZ29yaWVzLCB1bndvdW5kKVxyXG4gICAgfSk7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXhwYW5kZWRSZWNvcmRzRm9yQ2F0ZWdvcnkodGhlTW9kZWwgOiBJTWF0Y2guSU1vZGVscyxkb21haW4gOiBzdHJpbmcsY2F0ZWdvcnkgOiBzdHJpbmcpIDogUHJvbWlzZTx7IFtrZXkgOiBzdHJpbmddIDogYW55fT4ge1xyXG4gICAgdmFyIG1vbmdvSGFuZGxlID0gdGhlTW9kZWwubW9uZ29IYW5kbGU7XHJcbiAgICB2YXIgbW9kZWxuYW1lID0gZ2V0TW9kZWxOYW1lRm9yRG9tYWluKHRoZU1vZGVsLm1vbmdvSGFuZGxlLCBkb21haW4pO1xyXG4gICAgZGVidWdsb2coKCk9PmAgbW9kZWxuYW1lIGZvciAke2RvbWFpbn0gaXMgJHttb2RlbG5hbWV9YCk7XHJcbiAgICAvL2RlYnVnbG9nKCgpID0+IGBoZXJlIG1vZGVscyAke21vZGVsbmFtZX0gYCArIG1vbmdvSGFuZGxlLm1vbmdvb3NlLm1vZGVsTmFtZXMoKS5qb2luKCc7JykpO1xyXG4gICAgdmFyIG1vZGVsID0gbW9uZ29IYW5kbGUubW9uZ29vc2UubW9kZWwoU2NoZW1hbG9hZC5tYWtlTW9uZ29vc2VNb2RlbE5hbWUobW9kZWxuYW1lKSk7XHJcbiAgICB2YXIgbW9uZ29NYXAgPSBtb25nb0hhbmRsZS5tb25nb01hcHNbbW9kZWxuYW1lXTtcclxuICAgIGRlYnVnbG9nKCgpPT4gJ2hlcmUgdGhlIG1vbmdvbWFwJyArIEpTT04uc3RyaW5naWZ5KG1vbmdvTWFwLHVuZGVmaW5lZCwyKSk7XHJcbiAgICBjaGVja01vZGVsTW9uZ29NYXAobW9kZWwsbW9kZWxuYW1lLCBtb25nb01hcCxjYXRlZ29yeSk7XHJcbiAgICBkZWJ1Z2xvZygoKT0+YCBoZXJlIHRoZSBtb2RlbG1hcCBmb3IgJHtkb21haW59IGlzICR7SlNPTi5zdHJpbmdpZnkobW9uZ29NYXAsdW5kZWZpbmVkLDIpfWApO1xyXG4gICAgLy8gMSkgcHJvZHVjZSB0aGUgZmxhdHRlbmVkIHJlY29yZHNcclxuICAgIHZhciByZXMgPSBNb25nb01hcC51bndpbmRzRm9yTm9udGVybWluYWxBcnJheXMobW9uZ29NYXApO1xyXG4gICAgZGVidWdsb2coKCk9PidoZXJlIHRoZSB1bndpbmQgc3RhdGVtZW50ICcgKyBKU09OLnN0cmluZ2lmeShyZXMsdW5kZWZpbmVkLDIpKTtcclxuICAgIC8vIHdlIGhhdmUgdG8gdW53aW5kIGFsbCBjb21tb24gbm9uLXRlcm1pbmFsIGNvbGxlY3Rpb25zLlxyXG4gICAgZGVidWdsb2coKCk9PidoZXJlIHRoZSBtb2RlbCAnICsgbW9kZWwubW9kZWxOYW1lKTtcclxuICAgIGlmKHJlcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICByZXR1cm4gbW9kZWwuZmluZCh7fSkubGVhbigpLmV4ZWMoKS50aGVuKCggdW53b3VuZCA6IGFueVtdKSA9PiB7XHJcbiAgICAgICAgICAgIGRlYnVnbG9nKCgpPT4naGVyZSByZXMnICsgSlNPTi5zdHJpbmdpZnkodW53b3VuZCkpO1xyXG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyUmVtYXBDYXRlZ29yaWVzKG1vbmdvTWFwLCBbY2F0ZWdvcnldLCB1bndvdW5kKVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG1vZGVsLmFnZ3JlZ2F0ZShyZXMpLnRoZW4oIHVud291bmQgPT4ge1xyXG4gICAgICAgIC8vIGZpbHRlciBmb3IgYWdncmVnYXRlXHJcbiAgICAgICAgZGVidWdsb2coKCk9PidoZXJlIHJlcycgKyBKU09OLnN0cmluZ2lmeSh1bndvdW5kKSk7XHJcbiAgICAgICAgcmV0dXJuIGZpbHRlclJlbWFwQ2F0ZWdvcmllcyhtb25nb01hcCwgW2NhdGVnb3J5XSwgdW53b3VuZClcclxuICAgIH0pO1xyXG59XHJcbi8vIGdldCBzeW5vbnltc1xyXG4vLyBkYi5jb3Ntb3MuZmluZCggeyBcIl9zeW5vbnltcy4wXCI6IHsgJGV4aXN0czogdHJ1ZSB9fSkubGVuZ3RoKClcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXREaXN0aW5jdFZhbHVlcyhtb25nb0hhbmRsZTogSU1hdGNoLklNb2RlbEhhbmRsZVJhdywgbW9kZWxuYW1lOiBzdHJpbmcsIGNhdGVnb3J5OiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZ1tdPiB7XHJcbiAgICBkZWJ1Z2xvZygoKSA9PiBgaGVyZSBtb2RlbHMgJHttb2RlbG5hbWV9IGAgKyBtb25nb0hhbmRsZS5tb25nb29zZS5tb2RlbE5hbWVzKCkuam9pbignOycpKTtcclxuICAgIHZhciBtb2RlbCA9IG1vbmdvSGFuZGxlLm1vbmdvb3NlLm1vZGVsKFNjaGVtYWxvYWQubWFrZU1vbmdvb3NlTW9kZWxOYW1lKG1vZGVsbmFtZSkpO1xyXG4gICAgdmFyIG1vbmdvTWFwID0gbW9uZ29IYW5kbGUubW9uZ29NYXBzW21vZGVsbmFtZV07XHJcbiAgICBjaGVja01vZGVsTW9uZ29NYXAobW9kZWwsbW9kZWxuYW1lLCBtb25nb01hcCxjYXRlZ29yeSk7XHJcbiAgICBkZWJ1Z2xvZygnIGhlcmUgcGF0aCBmb3IgZGlzdGluY3QgdmFsdWUgJyArIG1vbmdvTWFwW2NhdGVnb3J5XS5mdWxscGF0aCApO1xyXG4gICAgcmV0dXJuIG1vZGVsLmRpc3RpbmN0KG1vbmdvTWFwW2NhdGVnb3J5XS5mdWxscGF0aCkudGhlbihyZXMgPT4ge1xyXG4gICAgICAgIGRlYnVnbG9nKCgpID0+IGAgaGVyZSByZXMgZm9yICR7bW9kZWxuYW1lfSAgJHtjYXRlZ29yeX0gdmFsdWVzIGAgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xyXG4gICAgICAgIHJldHVybiByZXM7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldENhdGVnb3J5UmVjKG1vbmdvSGFuZGxlOiBJTWF0Y2guSU1vZGVsSGFuZGxlUmF3LCBtb2RlbG5hbWU6IHN0cmluZywgY2F0ZWdvcnk6IHN0cmluZyk6IElNYXRjaC5JTW9kZWxDYXRlZ29yeVJlY1xyXG57XHJcbiAgICB2YXIgY2F0ZWdvcmllcyA9IG1vbmdvSGFuZGxlLm1vZGVsRG9jc1ttb2RlbG5hbWVdLl9jYXRlZ29yaWVzO1xyXG4gICAgdmFyIGZpbHRlcmVkID0gY2F0ZWdvcmllcy5maWx0ZXIoIHggPT4geC5jYXRlZ29yeSA9PSBjYXRlZ29yeSApO1xyXG4gICAgLy8gd2Ugd2FudCB0byBhbWVudCB0aGUgdHlwZSFcclxuICAgIGlmICggZmlsdGVyZWQubGVuZ3RoICE9IDEgKVxyXG4gICAge1xyXG5cclxuICAgICAgICBkZWJ1Z2YoICcgZGlkIG5vdCBmaW5kICcgKyBtb2RlbG5hbWUgKyAnICBjYXRlZ29yeSAgJyArIGNhdGVnb3J5ICsgJyBpbiAgJyArIEpTT04uc3RyaW5naWZ5KGNhdGVnb3JpZXMpICk7XHJcbiAgICAgICAgdGhyb3cgRXJyb3IoJ2NhdGVnb3J5IG5vdCBmb3VuZCAnICsgY2F0ZWdvcnkgKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KGNhdGVnb3JpZXMpICk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZmlsdGVyZWRbMF07XHJcbn1cclxuXHJcblxyXG5cclxuY29uc3QgQVJSX01PREVMX1BST1BFUlRJRVMgPSBbXCJkb21haW5cIiwgXCJiaXRpbmRleFwiLCBcImRlZmF1bHRrZXljb2x1bW5cIiwgXCJkZWZhdWx0dXJpXCIsIFwiY2F0ZWdvcnlEZXNjcmliZWRcIiwgXCJjb2x1bW5zXCIsIFwiZGVzY3JpcHRpb25cIiwgXCJ0b29sXCIsIFwidG9vbGhpZGRlblwiLCBcInN5bm9ueW1zXCIsIFwiY2F0ZWdvcnlcIiwgXCJ3b3JkaW5kZXhcIiwgXCJleGFjdG1hdGNoXCIsIFwiaGlkZGVuXCJdO1xyXG5cclxuZnVuY3Rpb24gYWRkU3lub255bXMoc3lub255bXM6IHN0cmluZ1tdLCBjYXRlZ29yeTogc3RyaW5nLCBzeW5vbnltRm9yOiBzdHJpbmcsIGJpdGluZGV4OiBudW1iZXIsIGJpdFNlbnRlbmNlQW5kLFxyXG4gICAgd29yZFR5cGU6IHN0cmluZyxcclxuICAgIG1SdWxlczogQXJyYXk8SU1hdGNoLm1SdWxlPiwgc2VlbjogeyBba2V5OiBzdHJpbmddOiBJTWF0Y2gubVJ1bGVbXSB9KSB7XHJcbiAgICBzeW5vbnltcy5mb3JFYWNoKGZ1bmN0aW9uIChzeW4pIHtcclxuICAgICAgICB2YXIgb1J1bGUgPSB7XHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogc3lub255bUZvcixcclxuICAgICAgICAgICAgdHlwZTogSU1hdGNoLkVudW1SdWxlVHlwZS5XT1JELFxyXG4gICAgICAgICAgICB3b3JkOiBzeW4sXHJcbiAgICAgICAgICAgIGJpdGluZGV4OiBiaXRpbmRleCxcclxuICAgICAgICAgICAgYml0U2VudGVuY2VBbmQ6IGJpdFNlbnRlbmNlQW5kLFxyXG4gICAgICAgICAgICB3b3JkVHlwZTogd29yZFR5cGUsXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiAwLjk1XHJcbiAgICAgICAgfTtcclxuICAgICAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiaW5zZXJ0aW5nIHN5bm9ueW1cIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlKSkgOiAnLScpO1xyXG4gICAgICAgIGluc2VydFJ1bGVJZk5vdFByZXNlbnQobVJ1bGVzLCBvUnVsZSwgc2Vlbik7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0UnVsZUtleShydWxlKSB7XHJcbiAgICB2YXIgcjEgPSBydWxlLm1hdGNoZWRTdHJpbmcgKyBcIi18LVwiICsgcnVsZS5jYXRlZ29yeSArIFwiIC18LSBcIiArIHJ1bGUudHlwZSArIFwiIC18LSBcIiArIHJ1bGUud29yZCArIFwiIFwiICsgcnVsZS5iaXRpbmRleCArIFwiIFwiICsgcnVsZS53b3JkVHlwZTtcclxuICAgIGlmIChydWxlLnJhbmdlKSB7XHJcbiAgICAgICAgdmFyIHIyID0gZ2V0UnVsZUtleShydWxlLnJhbmdlLnJ1bGUpO1xyXG4gICAgICAgIHIxICs9IFwiIC18LSBcIiArIHJ1bGUucmFuZ2UubG93ICsgXCIvXCIgKyBydWxlLnJhbmdlLmhpZ2ggKyBcIiAtfC0gXCIgKyByMjtcclxuICAgIH1cclxuICAgIHJldHVybiByMTtcclxufVxyXG5cclxuXHJcbmltcG9ydCAqIGFzIEJyZWFrZG93biBmcm9tICcuLi9tYXRjaC9icmVha2Rvd24nO1xyXG5cclxuLyogZ2l2ZW4gYSBydWxlIHdoaWNoIHJlcHJlc2VudHMgYSB3b3JkIHNlcXVlbmNlIHdoaWNoIGlzIHNwbGl0IGR1cmluZyB0b2tlbml6YXRpb24gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGFkZEJlc3RTcGxpdChtUnVsZXM6IEFycmF5PElNYXRjaC5tUnVsZT4sIHJ1bGU6IElNYXRjaC5tUnVsZSwgc2VlblJ1bGVzOiB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5tUnVsZVtdIH0pIHtcclxuICAgIC8vaWYoIWdsb2JhbF9BZGRTcGxpdHMpIHtcclxuICAgIC8vICAgIHJldHVybjtcclxuICAgIC8vfVxyXG5cclxuICAgIGlmIChydWxlLnR5cGUgIT09IElNYXRjaC5FbnVtUnVsZVR5cGUuV09SRCkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhciBiZXN0ID0gQnJlYWtkb3duLm1ha2VNYXRjaFBhdHRlcm4ocnVsZS5sb3dlcmNhc2V3b3JkKTtcclxuICAgIGlmICghYmVzdCkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhciBuZXdSdWxlID0ge1xyXG4gICAgICAgIGNhdGVnb3J5OiBydWxlLmNhdGVnb3J5LFxyXG4gICAgICAgIG1hdGNoZWRTdHJpbmc6IHJ1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICBiaXRpbmRleDogcnVsZS5iaXRpbmRleCxcclxuICAgICAgICBiaXRTZW50ZW5jZUFuZDogcnVsZS5iaXRpbmRleCxcclxuICAgICAgICB3b3JkVHlwZTogcnVsZS53b3JkVHlwZSxcclxuICAgICAgICB3b3JkOiBiZXN0Lmxvbmdlc3RUb2tlbixcclxuICAgICAgICB0eXBlOiAwLFxyXG4gICAgICAgIGxvd2VyY2FzZXdvcmQ6IGJlc3QubG9uZ2VzdFRva2VuLFxyXG4gICAgICAgIF9yYW5raW5nOiAwLjk1LFxyXG4gICAgICAgIC8vICAgIGV4YWN0T25seSA6IHJ1bGUuZXhhY3RPbmx5LFxyXG4gICAgICAgIHJhbmdlOiBiZXN0LnNwYW5cclxuICAgIH0gYXMgSU1hdGNoLm1SdWxlO1xyXG4gICAgaWYgKHJ1bGUuZXhhY3RPbmx5KSB7XHJcbiAgICAgICAgbmV3UnVsZS5leGFjdE9ubHkgPSBydWxlLmV4YWN0T25seVxyXG4gICAgfTtcclxuICAgIG5ld1J1bGUucmFuZ2UucnVsZSA9IHJ1bGU7XHJcbiAgICBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG1SdWxlcywgbmV3UnVsZSwgc2VlblJ1bGVzKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGluc2VydFJ1bGVJZk5vdFByZXNlbnQobVJ1bGVzOiBBcnJheTxJTWF0Y2gubVJ1bGU+LCBydWxlOiBJTWF0Y2gubVJ1bGUsXHJcbiAgICBzZWVuUnVsZXM6IHsgW2tleTogc3RyaW5nXTogSU1hdGNoLm1SdWxlW10gfSkge1xyXG5cclxuICAgIGlmIChydWxlLnR5cGUgIT09IElNYXRjaC5FbnVtUnVsZVR5cGUuV09SRCkge1xyXG4gICAgICAgIGRlYnVnbG9nKCdub3QgYSAgd29yZCByZXR1cm4gZmFzdCAnKyBydWxlLm1hdGNoZWRTdHJpbmcpO1xyXG4gICAgICAgIG1SdWxlcy5wdXNoKHJ1bGUpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGlmICgocnVsZS53b3JkID09PSB1bmRlZmluZWQpIHx8IChydWxlLm1hdGNoZWRTdHJpbmcgPT09IHVuZGVmaW5lZCkpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2lsbGVnYWwgcnVsZScgKyBKU09OLnN0cmluZ2lmeShydWxlLCB1bmRlZmluZWQsIDIpKTtcclxuICAgIH1cclxuICAgIHZhciByID0gZ2V0UnVsZUtleShydWxlKTtcclxuICAgIC8qIGlmKCAocnVsZS53b3JkID09PSBcInNlcnZpY2VcIiB8fCBydWxlLndvcmQ9PT0gXCJzZXJ2aWNlc1wiKSAmJiByLmluZGV4T2YoJ09EYXRhJykgPj0gMCkge1xyXG4gICAgICAgICBjb25zb2xlLmxvZyhcInJ1bGVrZXkgaXNcIiArIHIpO1xyXG4gICAgICAgICBjb25zb2xlLmxvZyhcInByZXNlbmNlIGlzIFwiICsgSlNPTi5zdHJpbmdpZnkoc2VlblJ1bGVzW3JdKSk7XHJcbiAgICAgfSovXHJcbiAgICBydWxlLmxvd2VyY2FzZXdvcmQgPSBydWxlLndvcmQudG9Mb3dlckNhc2UoKTtcclxuICAgIGlmIChzZWVuUnVsZXNbcl0pIHtcclxuICAgICAgICBkZWJ1Z2xvZygoKSA9PiAoXCJBdHRlbXB0aW5nIHRvIGluc2VydCBkdXBsaWNhdGVcIiArIEpTT04uc3RyaW5naWZ5KHJ1bGUsIHVuZGVmaW5lZCwgMikgKyBcIiA6IFwiICsgcikpO1xyXG4gICAgICAgIHZhciBkdXBsaWNhdGVzID0gc2VlblJ1bGVzW3JdLmZpbHRlcihmdW5jdGlvbiAob0VudHJ5KSB7XHJcbiAgICAgICAgICAgIHJldHVybiAwID09PSBJbnB1dEZpbHRlclJ1bGVzLmNvbXBhcmVNUnVsZUZ1bGwob0VudHJ5LCBydWxlKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBpZiAoZHVwbGljYXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBzZWVuUnVsZXNbcl0gPSAoc2VlblJ1bGVzW3JdIHx8IFtdKTtcclxuICAgIHNlZW5SdWxlc1tyXS5wdXNoKHJ1bGUpO1xyXG4gICAgaWYgKHJ1bGUud29yZCA9PT0gXCJcIikge1xyXG4gICAgICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoJ1NraXBwaW5nIHJ1bGUgd2l0aCBlbXRweSB3b3JkICcgKyBKU09OLnN0cmluZ2lmeShydWxlLCB1bmRlZmluZWQsIDIpKSA6ICctJyk7XHJcbiAgICAgICAgLy9nKCdTa2lwcGluZyBydWxlIHdpdGggZW10cHkgd29yZCAnICsgSlNPTi5zdHJpbmdpZnkocnVsZSwgdW5kZWZpbmVkLCAyKSk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgbVJ1bGVzLnB1c2gocnVsZSk7XHJcbiAgICBhZGRCZXN0U3BsaXQobVJ1bGVzLCBydWxlLCBzZWVuUnVsZXMpO1xyXG4gICAgcmV0dXJuO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVhZEZpbGVBc0pTT04oZmlsZW5hbWU6IHN0cmluZyk6IGFueSB7XHJcbiAgICB2YXIgZGF0YSA9IGZzLnJlYWRGaWxlU3luYyhmaWxlbmFtZSwgJ3V0Zi04Jyk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKGRhdGEpO1xyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ29udGVudCBvZiBmaWxlIFwiICsgZmlsZW5hbWUgKyBcIiBpcyBubyBqc29uXCIgKyBlKTtcclxuICAgICAgICBwcm9jZXNzLnN0ZG91dC5vbignZHJhaW4nLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcHJvY2Vzcy5leGl0KC0xKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICAvL3Byb2Nlc3MuZXhpdCgtMSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG59XHJcblxyXG4vKlxyXG5mdW5jdGlvbiBsb2FkTW9kZWxEYXRhMShtb2RlbFBhdGg6IHN0cmluZywgb01kbDogSU1vZGVsLCBzTW9kZWxOYW1lOiBzdHJpbmcsIG9Nb2RlbDogSU1hdGNoLklNb2RlbHMpIHtcclxuICAgIC8vIHJlYWQgdGhlIGRhdGEgLT5cclxuICAgIC8vIGRhdGEgaXMgcHJvY2Vzc2VkIGludG8gbVJ1bGVzIGRpcmVjdGx5LFxyXG5cclxuICAgIHZhciBiaXRpbmRleCA9IG9NZGwuYml0aW5kZXg7XHJcbiAgICBjb25zdCBzRmlsZU5hbWUgPSAoJy4vJyArIG1vZGVsUGF0aCArICcvJyArIHNNb2RlbE5hbWUgKyBcIi5kYXRhLmpzb25cIik7XHJcbiAgICB2YXIgb01kbERhdGE9IHJlYWRGaWxlQXNKU09OKHNGaWxlTmFtZSk7XHJcbiAgICBvTWRsRGF0YS5mb3JFYWNoKGZ1bmN0aW9uIChvRW50cnkpIHtcclxuICAgICAgICBpZiAoIW9FbnRyeS5kb21haW4pIHtcclxuICAgICAgICAgICAgb0VudHJ5Ll9kb21haW4gPSBvTWRsLmRvbWFpbjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFvRW50cnkudG9vbCAmJiBvTWRsLnRvb2wubmFtZSkge1xyXG4gICAgICAgICAgICBvRW50cnkudG9vbCA9IG9NZGwudG9vbC5uYW1lO1xyXG4gICAgICAgIH1cclxuICAgICAgICBvTW9kZWwucmVjb3Jkcy5wdXNoKG9FbnRyeSk7XHJcbiAgICAgICAgb01kbC5jYXRlZ29yeS5mb3JFYWNoKGZ1bmN0aW9uIChjYXQpIHtcclxuICAgICAgICAgICAgaWYgKG9FbnRyeVtjYXRdID09PSAndW5kZWZpbmVkJykge1xyXG4gICAgICAgICAgICAgICAgb0VudHJ5W2NhdF0gPSBcIm4vYVwiO1xyXG4gICAgICAgICAgICAgICAgdmFyIGJ1ZyA9XHJcbiAgICAgICAgICAgICAgICAgICAgXCJJTkNPTlNJU1RFTlQqPiBNb2RlbERhdGEgXCIgKyBzRmlsZU5hbWUgKyBcIiBkb2VzIG5vdCBjb250YWluIGNhdGVnb3J5IFwiICsgY2F0ICsgXCIgd2l0aCB2YWx1ZSAndW5kZWZpbmVkJywgdW5kZWZpbmVkIGlzIGlsbGVnYWwgdmFsdWUsIHVzZSBuL2EgXCIgKyBKU09OLnN0cmluZ2lmeShvRW50cnkpICsgXCJcIjtcclxuICAgICAgICAgICAgICAgIGRlYnVnbG9nKGJ1Zyk7XHJcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKGJ1Zyk7XHJcbiAgICAgICAgICAgICAgICAvL3Byb2Nlc3MuZXhpdCgtMSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBvTWRsLndvcmRpbmRleC5mb3JFYWNoKGZ1bmN0aW9uIChjYXRlZ29yeSkge1xyXG4gICAgICAgICAgICBpZiAob0VudHJ5W2NhdGVnb3J5XSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIklOQ09OU0lTVEVOVCo+IE1vZGVsRGF0YSBcIiArIHNGaWxlTmFtZSArIFwiIGRvZXMgbm90IGNvbnRhaW4gY2F0ZWdvcnkgXCIgKyBjYXRlZ29yeSArIFwiIG9mIHdvcmRpbmRleFwiICsgSlNPTi5zdHJpbmdpZnkob0VudHJ5KSArIFwiXCIpXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKG9FbnRyeVtjYXRlZ29yeV0gIT09IFwiKlwiKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgc1N0cmluZyA9IG9FbnRyeVtjYXRlZ29yeV07XHJcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcInB1c2hpbmcgcnVsZSB3aXRoIFwiICsgY2F0ZWdvcnkgKyBcIiAtPiBcIiArIHNTdHJpbmcpO1xyXG4gICAgICAgICAgICAgICAgdmFyIG9SdWxlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcclxuICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBzU3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IElNYXRjaC5FbnVtUnVsZVR5cGUuV09SRCxcclxuICAgICAgICAgICAgICAgICAgICB3b3JkOiBzU3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgICAgIGJpdGluZGV4OiBiaXRpbmRleCxcclxuICAgICAgICAgICAgICAgICAgICBiaXRTZW50ZW5jZUFuZCA6IGJpdGluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgIHdvcmRUeXBlIDogSU1hdGNoLldPUkRUWVBFLkZBQ1QsXHJcbiAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IDAuOTVcclxuICAgICAgICAgICAgICAgIH0gYXMgSU1hdGNoLm1SdWxlO1xyXG4gICAgICAgICAgICAgICAgaWYgKG9NZGwuZXhhY3RtYXRjaCAmJiBvTWRsLmV4YWN0bWF0Y2guaW5kZXhPZihjYXRlZ29yeSkgPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG9SdWxlLmV4YWN0T25seSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG9Nb2RlbC5tUnVsZXMsIG9SdWxlLCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgICAgICAgICAgICAgIGlmIChvTWRsRGF0YS5zeW5vbnltcyAmJiBvTWRsRGF0YS5zeW5vbnltc1tjYXRlZ29yeV0pIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJob3cgY2FuIHRoaXMgaGFwcGVuP1wiKTtcclxuICAgICAgICAgICAgICAgICAgICAvL2FkZFN5bm9ueW1zKG9NZGxEYXRhLnN5bm9ueW1zW2NhdGVnb3J5XSwgY2F0ZWdvcnksIHNTdHJpbmcsIGJpdGluZGV4LCBiaXRpbmRleCwgXCJYXCIsIG9Nb2RlbC5tUnVsZXMsIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gYSBzeW5vbnltIGZvciBhIEZBQ1RcclxuICAgICAgICAgICAgICAgIGlmIChvRW50cnkuc3lub255bXMgJiYgb0VudHJ5LnN5bm9ueW1zW2NhdGVnb3J5XSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGFkZFN5bm9ueW1zKG9FbnRyeS5zeW5vbnltc1tjYXRlZ29yeV0sIGNhdGVnb3J5LCBzU3RyaW5nLCBiaXRpbmRleCwgYml0aW5kZXgsIElNYXRjaC5XT1JEVFlQRS5GQUNULCBvTW9kZWwubVJ1bGVzLCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbiovXHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGhhc1J1bGVXaXRoRmFjdChtUnVsZXMgOiBJTWF0Y2gubVJ1bGVbXSwgZmFjdDogc3RyaW5nLCBjYXRlZ29yeTogc3RyaW5nLCBiaXRpbmRleDogbnVtYmVyKSB7XHJcbiAgICAvLyBUT0RPIEJBRCBRVUFEUkFUSUNcclxuICAgIHJldHVybiBtUnVsZXMuZmluZCggcnVsZSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIHJ1bGUud29yZCA9PT0gZmFjdCAmJiBydWxlLmNhdGVnb3J5ID09PSBjYXRlZ29yeSAmJiBydWxlLmJpdGluZGV4ID09PSBiaXRpbmRleFxyXG4gICAgfSkgIT09IHVuZGVmaW5lZDtcclxufVxyXG5cclxuZnVuY3Rpb24gbG9hZE1vZGVsRGF0YU1vbmdvKG1vZGVsSGFuZGxlOiBJTWF0Y2guSU1vZGVsSGFuZGxlUmF3LCBvTWRsOiBJTW9kZWwsIHNNb2RlbE5hbWU6IHN0cmluZywgb01vZGVsOiBJTWF0Y2guSU1vZGVscyk6IFByb21pc2U8YW55PiB7XHJcbiAgICAvLyByZWFkIHRoZSBkYXRhIC0+XHJcbiAgICAvLyBkYXRhIGlzIHByb2Nlc3NlZCBpbnRvIG1SdWxlcyBkaXJlY3RseVxyXG5cclxuICAgIHZhciBiaXRpbmRleCA9IG9NZGwuYml0aW5kZXg7XHJcbiAgICAvL2NvbnN0IHNGaWxlTmFtZSA9ICgnLi8nICsgbW9kZWxQYXRoICsgJy8nICsgc01vZGVsTmFtZSArIFwiLmRhdGEuanNvblwiKTtcclxuICAgIHJldHVybiBQcm9taXNlLmFsbChtb2RlbEhhbmRsZS5tb2RlbERvY3Nbc01vZGVsTmFtZV0uX2NhdGVnb3JpZXMubWFwKFxyXG4gICAgICAgIGNhdGVnb3J5UmVjID0+IHtcclxuICAgICAgICAgICAgdmFyIGNhdGVnb3J5ID0gY2F0ZWdvcnlSZWMuY2F0ZWdvcnk7XHJcbiAgICAgICAgICAgIHZhciB3b3JkaW5kZXggPSBjYXRlZ29yeVJlYy53b3JkaW5kZXg7XHJcbiAgICAgICAgICAgIGlmICghd29yZGluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZyggKCk9PiAnICAnICsgc01vZGVsTmFtZSArICcgJyArICBjYXRlZ29yeSArICcgaXMgbm90IHdvcmQgaW5kZXhlZCEnICk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZGVidWdsb2coKCkgPT4gJ2FkZGluZyB2YWx1ZXMgZm9yICcgKyBzTW9kZWxOYW1lICsgJyAnICsgIGNhdGVnb3J5KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBnZXREaXN0aW5jdFZhbHVlcyhtb2RlbEhhbmRsZSwgc01vZGVsTmFtZSwgY2F0ZWdvcnkpLnRoZW4oXHJcbiAgICAgICAgICAgICAgICAgICAgKHZhbHVlcykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhgZm91bmQgJHt2YWx1ZXMubGVuZ3RofSB2YWx1ZXMgZm9yICR7c01vZGVsTmFtZX0gJHtjYXRlZ29yeX0gYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlcy5tYXAodmFsdWUgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNTdHJpbmcgPSBcIlwiICsgdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZygoKSA9PiBcInB1c2hpbmcgcnVsZSB3aXRoIFwiICsgY2F0ZWdvcnkgKyBcIiAtPiBcIiArIHNTdHJpbmcgKyAnICcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG9SdWxlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBzU3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IElNYXRjaC5FbnVtUnVsZVR5cGUuV09SRCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JkOiBzU3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJpdGluZGV4OiBiaXRpbmRleCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiaXRTZW50ZW5jZUFuZDogYml0aW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhhY3RPbmx5OiBjYXRlZ29yeVJlYy5leGFjdG1hdGNoIHx8IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmRUeXBlOiBJTWF0Y2guV09SRFRZUEUuRkFDVCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogMC45NVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBhcyBJTWF0Y2gubVJ1bGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG9Nb2RlbC5tUnVsZXMsIG9SdWxlLCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgIGlmIChvTWRsRGF0YS5zeW5vbnltcyAmJiBvTWRsRGF0YS5zeW5vbnltc1tjYXRlZ29yeV0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJob3cgY2FuIHRoaXMgaGFwcGVuP1wiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vYWRkU3lub255bXMob01kbERhdGEuc3lub255bXNbY2F0ZWdvcnldLCBjYXRlZ29yeSwgc1N0cmluZywgYml0aW5kZXgsIGJpdGluZGV4LCBcIlhcIiwgb01vZGVsLm1SdWxlcywgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhIHN5bm9ueW0gZm9yIGEgRkFDVFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgaWYgKG9FbnRyeS5zeW5vbnltcyAmJiBvRW50cnkuc3lub255bXNbY2F0ZWdvcnldKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgIGFkZFN5bm9ueW1zKG9FbnRyeS5zeW5vbnltc1tjYXRlZ29yeV0sIGNhdGVnb3J5LCBzU3RyaW5nLCBiaXRpbmRleCwgYml0aW5kZXgsIElNYXRjaC5XT1JEVFlQRS5GQUNULCBvTW9kZWwubVJ1bGVzLCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgKVxyXG4gICAgKS50aGVuKFxyXG4gICAgICAgICgpID0+ICBnZXRGYWN0U3lub255bXMobW9kZWxIYW5kbGUsIHNNb2RlbE5hbWUpXHJcbiAgICApLnRoZW4oKHN5bm9ueW1WYWx1ZXMgOiBhbnkpID0+IHtcclxuICAgICAgICBzeW5vbnltVmFsdWVzLmZvckVhY2goKHN5bm9ueW1SZWMpID0+IHtcclxuICAgICAgICBpZiAoIWhhc1J1bGVXaXRoRmFjdChvTW9kZWwubVJ1bGVzLCBzeW5vbnltUmVjLmZhY3QsIHN5bm9ueW1SZWMuY2F0ZWdvcnksIGJpdGluZGV4KSkge1xyXG4gICAgICAgICAgICBkZWJ1Z2xvZygoKSA9PkpTT04uc3RyaW5naWZ5KG9Nb2RlbC5tUnVsZXMsdW5kZWZpbmVkLDIpKTtcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoYE9ycGhhbmVkIHN5bm9ueW0gd2l0aG91dCBiYXNlIGluIGRhdGE/XFxuYFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgKGNoZWNrIHR5cG9zIGFuZCB0aGF0IGNhdGVnb3J5IGlzIHdvcmRpbmRleGVkISkgZmFjdDogJyR7c3lub255bVJlYy5mYWN0fSc7ICBjYXRlZ29yeTogXCIke3N5bm9ueW1SZWMuY2F0ZWdvcnl9XCIgICBgICArIEpTT04uc3RyaW5naWZ5KHN5bm9ueW1SZWMpKVxyXG4gICAgICAgIH1cclxuICAgICAgICBhZGRTeW5vbnltcyhzeW5vbnltUmVjLnN5bm9ueW1zLCBzeW5vbnltUmVjLmNhdGVnb3J5LCBzeW5vbnltUmVjLmZhY3QsIGJpdGluZGV4LCBiaXRpbmRleCwgSU1hdGNoLldPUkRUWVBFLkZBQ1QsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb01vZGVsLm1SdWxlcywgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbi8qXHJcbmZ1bmN0aW9uIGxvYWRNb2RlbFAobW9uZ29vc2VIbmRsIDogbW9uZ29vc2UuTW9uZ29vc2UsIG1vZGVsUGF0aDogc3RyaW5nLCBjb25uZWN0aW9uU3RyaW5nIDogc3RyaW5nKSA6IFByb21pc2U8SU1hdGNoLklNb2RlbHM+IHtcclxuICAgIHZhciBtb25nb29zZVggPSBtb25nb29zZUhuZGwgfHwgbW9uZ29vc2U7XHJcbiAgICB2YXIgY29ublN0ciA9IGNvbm5lY3Rpb25TdHJpbmcgfHwgJ21vbmdvZGI6Ly9sb2NhbGhvc3QvdGVzdGRiJztcclxuICAgIHJldHVybiBNb25nb1V0aWxzLm9wZW5Nb25nb29zZShtb25nb29zZVgsIGNvbm5TdHIpLnRoZW4oXHJcbiAgICAgICAgKCkgPT4gZ2V0TW9uZ29IYW5kbGUobW9uZ29vc2VYKVxyXG4gICAgKS50aGVuKCAobW9kZWxIYW5kbGUgOiBJTWF0Y2guSU1vZGVsSGFuZGxlUmF3KSA9PiBfbG9hZE1vZGVsc0Z1bGwobW9kZWxIYW5kbGUsIG1vZGVsUGF0aClcclxuICAgICk7XHJcbn07XHJcbiovXHJcblxyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbG9hZE1vZGVsKG1vZGVsSGFuZGxlOiBJTWF0Y2guSU1vZGVsSGFuZGxlUmF3LCBzTW9kZWxOYW1lOiBzdHJpbmcsIG9Nb2RlbDogSU1hdGNoLklNb2RlbHMpOiBQcm9taXNlPGFueT4ge1xyXG4gICAgZGVidWdsb2coXCIgbG9hZGluZyBcIiArIHNNb2RlbE5hbWUgKyBcIiAuLi4uXCIpO1xyXG4gICAgLy92YXIgb01kbCA9IHJlYWRGaWxlQXNKU09OKCcuLycgKyBtb2RlbFBhdGggKyAnLycgKyBzTW9kZWxOYW1lICsgXCIubW9kZWwuanNvblwiKSBhcyBJTW9kZWw7XHJcbiAgICB2YXIgb01kbCA9IG1ha2VNZGxNb25nbyhtb2RlbEhhbmRsZSwgc01vZGVsTmFtZSwgb01vZGVsKTtcclxuICAgIHJldHVybiBsb2FkTW9kZWxEYXRhTW9uZ28obW9kZWxIYW5kbGUsIG9NZGwsIHNNb2RlbE5hbWUsIG9Nb2RlbCk7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWxsRG9tYWluc0JpdEluZGV4KG9Nb2RlbDogSU1hdGNoLklNb2RlbHMpOiBudW1iZXIge1xyXG4gICAgdmFyIGxlbiA9IG9Nb2RlbC5kb21haW5zLmxlbmd0aDtcclxuICAgIHZhciByZXMgPSAwO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xyXG4gICAgICAgIHJlcyA9IHJlcyA8PCAxO1xyXG4gICAgICAgIHJlcyA9IHJlcyB8IDB4MDAwMTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXREb21haW5CaXRJbmRleChkb21haW46IHN0cmluZywgb01vZGVsOiBJTWF0Y2guSU1vZGVscyk6IG51bWJlciB7XHJcbiAgICB2YXIgaW5kZXggPSBvTW9kZWwuZG9tYWlucy5pbmRleE9mKGRvbWFpbik7XHJcbiAgICBpZiAoaW5kZXggPCAwKSB7XHJcbiAgICAgICAgaW5kZXggPSBvTW9kZWwuZG9tYWlucy5sZW5ndGg7XHJcbiAgICB9XHJcbiAgICBpZiAoaW5kZXggPj0gMzIpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ0b28gbWFueSBkb21haW4gZm9yIHNpbmdsZSAzMiBiaXQgaW5kZXhcIik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gMHgwMDAxIDw8IGluZGV4O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RG9tYWluQml0SW5kZXhTYWZlKGRvbWFpbjogc3RyaW5nLCBvTW9kZWw6IElNYXRjaC5JTW9kZWxzKTogbnVtYmVyIHtcclxuICAgIHZhciBpbmRleCA9IG9Nb2RlbC5kb21haW5zLmluZGV4T2YoZG9tYWluKTtcclxuICAgIGlmIChpbmRleCA8IDApIHtcclxuICAgICAgICB0aHJvdyBFcnJvcignZXhwZWN0ZWQgZG9tYWluIHRvIGJlIHJlZ2lzdGVyZWQ/Pz8gJyk7XHJcbiAgICB9XHJcbiAgICBpZiAoaW5kZXggPj0gMzIpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ0b28gbWFueSBkb21haW4gZm9yIHNpbmdsZSAzMiBiaXQgaW5kZXhcIik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gMHgwMDAxIDw8IGluZGV4O1xyXG59XHJcblxyXG5cclxuXHJcbi8qKlxyXG4gKiBHaXZlbiBhIGJpdGZpZWxkLCByZXR1cm4gYW4gdW5zb3J0ZWQgc2V0IG9mIGRvbWFpbnMgbWF0Y2hpbmcgcHJlc2VudCBiaXRzXHJcbiAqIEBwYXJhbSBvTW9kZWxcclxuICogQHBhcmFtIGJpdGZpZWxkXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RG9tYWluc0ZvckJpdEZpZWxkKG9Nb2RlbDogSU1hdGNoLklNb2RlbHMsIGJpdGZpZWxkOiBudW1iZXIpOiBzdHJpbmdbXSB7XHJcbiAgICByZXR1cm4gb01vZGVsLmRvbWFpbnMuZmlsdGVyKGRvbWFpbiA9PlxyXG4gICAgICAgIChnZXREb21haW5CaXRJbmRleChkb21haW4sIG9Nb2RlbCkgJiBiaXRmaWVsZClcclxuICAgICk7XHJcbn1cclxuXHJcbi8qXHJcbmZ1bmN0aW9uIG1lcmdlTW9kZWxKc29uKHNNb2RlbE5hbWU6IHN0cmluZywgb01kbDogSU1vZGVsLCBvTW9kZWw6IElNYXRjaC5JTW9kZWxzKSB7XHJcbiAgICB2YXIgY2F0ZWdvcnlEZXNjcmliZWRNYXAgPSB7fSBhcyB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5JQ2F0ZWdvcnlEZXNjIH07XHJcbiAgICBvTWRsLmJpdGluZGV4ID0gZ2V0RG9tYWluQml0SW5kZXgob01kbC5kb21haW4sIG9Nb2RlbCk7XHJcbiAgICBvTWRsLmNhdGVnb3J5RGVzY3JpYmVkID0gW107XHJcbiAgICAvLyByZWN0aWZ5IGNhdGVnb3J5XHJcbiAgICBvTWRsLmNhdGVnb3J5ID0gb01kbC5jYXRlZ29yeS5tYXAoZnVuY3Rpb24gKGNhdDogYW55KSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBjYXQgPT09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGNhdDtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHR5cGVvZiBjYXQubmFtZSAhPT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIk1pc3NpbmcgbmFtZSBpbiBvYmplY3QgdHlwZWQgY2F0ZWdvcnkgaW4gXCIgKyBKU09OLnN0cmluZ2lmeShjYXQpICsgXCIgaW4gbW9kZWwgXCIgKyBzTW9kZWxOYW1lKTtcclxuICAgICAgICAgICAgcHJvY2Vzcy5leGl0KC0xKTtcclxuICAgICAgICAgICAgLy90aHJvdyBuZXcgRXJyb3IoJ0RvbWFpbiAnICsgb01kbC5kb21haW4gKyAnIGFscmVhZHkgbG9hZGVkIHdoaWxlIGxvYWRpbmcgJyArIHNNb2RlbE5hbWUgKyAnPycpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRlZ29yeURlc2NyaWJlZE1hcFtjYXQubmFtZV0gPSBjYXQ7XHJcbiAgICAgICAgb01kbC5jYXRlZ29yeURlc2NyaWJlZC5wdXNoKGNhdCk7XHJcbiAgICAgICAgcmV0dXJuIGNhdC5uYW1lO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gYWRkIHRoZSBjYXRlZ29yaWVzIHRvIHRoZSBtb2RlbDpcclxuICAgIG9NZGwuY2F0ZWdvcnkuZm9yRWFjaChmdW5jdGlvbiAoY2F0ZWdvcnkpIHtcclxuICAgICAgICBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG9Nb2RlbC5tUnVsZXMsIHtcclxuICAgICAgICAgICAgY2F0ZWdvcnk6IFwiY2F0ZWdvcnlcIixcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogY2F0ZWdvcnksXHJcbiAgICAgICAgICAgIHR5cGU6IElNYXRjaC5FbnVtUnVsZVR5cGUuV09SRCxcclxuICAgICAgICAgICAgd29yZDogY2F0ZWdvcnksXHJcbiAgICAgICAgICAgIGxvd2VyY2FzZXdvcmQ6IGNhdGVnb3J5LnRvTG93ZXJDYXNlKCksXHJcbiAgICAgICAgICAgIGJpdGluZGV4OiBvTWRsLmJpdGluZGV4LFxyXG4gICAgICAgICAgICB3b3JkVHlwZSA6IElNYXRjaC5XT1JEVFlQRS5DQVRFR09SWSxcclxuICAgICAgICAgICAgYml0U2VudGVuY2VBbmQgOiBvTWRsLmJpdGluZGV4LFxyXG4gICAgICAgICAgICBfcmFua2luZzogMC45NVxyXG4gICAgICAgIH0sIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKG9Nb2RlbC5kb21haW5zLmluZGV4T2Yob01kbC5kb21haW4pID49IDApIHtcclxuICAgICAgICBkZWJ1Z2xvZyhcIioqKioqKioqKioqaGVyZSBtZGxcIiArIEpTT04uc3RyaW5naWZ5KG9NZGwsIHVuZGVmaW5lZCwgMikpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRG9tYWluICcgKyBvTWRsLmRvbWFpbiArICcgYWxyZWFkeSBsb2FkZWQgd2hpbGUgbG9hZGluZyAnICsgc01vZGVsTmFtZSArICc/Jyk7XHJcbiAgICB9XHJcbiAgICAvLyBjaGVjayBwcm9wZXJ0aWVzIG9mIG1vZGVsXHJcbiAgICBPYmplY3Qua2V5cyhvTWRsKS5zb3J0KCkuZm9yRWFjaChmdW5jdGlvbiAoc1Byb3BlcnR5KSB7XHJcbiAgICAgICAgaWYgKEFSUl9NT0RFTF9QUk9QRVJUSUVTLmluZGV4T2Yoc1Byb3BlcnR5KSA8IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNb2RlbCBwcm9wZXJ0eSBcIicgKyBzUHJvcGVydHkgKyAnXCIgbm90IGEga25vd24gbW9kZWwgcHJvcGVydHkgaW4gbW9kZWwgb2YgZG9tYWluICcgKyBvTWRsLmRvbWFpbiArICcgJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICAvLyBjb25zaWRlciBzdHJlYW1saW5pbmcgdGhlIGNhdGVnb3JpZXNcclxuICAgIG9Nb2RlbC5yYXdNb2RlbHNbb01kbC5kb21haW5dID0gb01kbDtcclxuXHJcbiAgICBvTW9kZWwuZnVsbC5kb21haW5bb01kbC5kb21haW5dID0ge1xyXG4gICAgICAgIGRlc2NyaXB0aW9uOiBvTWRsLmRlc2NyaXB0aW9uLFxyXG4gICAgICAgIGNhdGVnb3JpZXM6IGNhdGVnb3J5RGVzY3JpYmVkTWFwLFxyXG4gICAgICAgIGJpdGluZGV4OiBvTWRsLmJpdGluZGV4XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIGNoZWNrIHRoYXRcclxuXHJcblxyXG4gICAgLy8gY2hlY2sgdGhhdCBtZW1iZXJzIG9mIHdvcmRpbmRleCBhcmUgaW4gY2F0ZWdvcmllcyxcclxuICAgIG9NZGwud29yZGluZGV4ID0gb01kbC53b3JkaW5kZXggfHwgW107XHJcbiAgICBvTWRsLndvcmRpbmRleC5mb3JFYWNoKGZ1bmN0aW9uIChzV29yZEluZGV4KSB7XHJcbiAgICAgICAgaWYgKG9NZGwuY2F0ZWdvcnkuaW5kZXhPZihzV29yZEluZGV4KSA8IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNb2RlbCB3b3JkaW5kZXggXCInICsgc1dvcmRJbmRleCArICdcIiBub3QgYSBjYXRlZ29yeSBvZiBkb21haW4gJyArIG9NZGwuZG9tYWluICsgJyAnKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICAgIG9NZGwuZXhhY3RtYXRjaCA9IG9NZGwuZXhhY3RtYXRjaCB8fCBbXTtcclxuICAgIG9NZGwuZXhhY3RtYXRjaC5mb3JFYWNoKGZ1bmN0aW9uIChzRXhhY3RNYXRjaCkge1xyXG4gICAgICAgIGlmIChvTWRsLmNhdGVnb3J5LmluZGV4T2Yoc0V4YWN0TWF0Y2gpIDwgMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01vZGVsIGV4YWN0bWF0Y2ggXCInICsgc0V4YWN0TWF0Y2ggKyAnXCIgbm90IGEgY2F0ZWdvcnkgb2YgZG9tYWluICcgKyBvTWRsLmRvbWFpbiArICcgJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICBvTWRsLmNvbHVtbnMgPSBvTWRsLmNvbHVtbnMgfHwgW107XHJcbiAgICBvTWRsLmNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoc0V4YWN0TWF0Y2gpIHtcclxuICAgICAgICBpZiAob01kbC5jYXRlZ29yeS5pbmRleE9mKHNFeGFjdE1hdGNoKSA8IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNb2RlbCBjb2x1bW4gXCInICsgc0V4YWN0TWF0Y2ggKyAnXCIgbm90IGEgY2F0ZWdvcnkgb2YgZG9tYWluICcgKyBvTWRsLmRvbWFpbiArICcgJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG5cclxuICAgIC8vIGFkZCByZWxhdGlvbiBkb21haW4gLT4gY2F0ZWdvcnlcclxuICAgIHZhciBkb21haW5TdHIgPSBNZXRhRi5Eb21haW4ob01kbC5kb21haW4pLnRvRnVsbFN0cmluZygpO1xyXG4gICAgdmFyIHJlbGF0aW9uU3RyID0gTWV0YUYuUmVsYXRpb24oTWV0YS5SRUxBVElPTl9oYXNDYXRlZ29yeSkudG9GdWxsU3RyaW5nKCk7XHJcbiAgICB2YXIgcmV2ZXJzZVJlbGF0aW9uU3RyID0gTWV0YUYuUmVsYXRpb24oTWV0YS5SRUxBVElPTl9pc0NhdGVnb3J5T2YpLnRvRnVsbFN0cmluZygpO1xyXG4gICAgb01kbC5jYXRlZ29yeS5mb3JFYWNoKGZ1bmN0aW9uIChzQ2F0ZWdvcnkpIHtcclxuXHJcbiAgICAgICAgdmFyIENhdGVnb3J5U3RyaW5nID0gTWV0YUYuQ2F0ZWdvcnkoc0NhdGVnb3J5KS50b0Z1bGxTdHJpbmcoKTtcclxuICAgICAgICBvTW9kZWwubWV0YS50M1tkb21haW5TdHJdID0gb01vZGVsLm1ldGEudDNbZG9tYWluU3RyXSB8fCB7fTtcclxuICAgICAgICBvTW9kZWwubWV0YS50M1tkb21haW5TdHJdW3JlbGF0aW9uU3RyXSA9IG9Nb2RlbC5tZXRhLnQzW2RvbWFpblN0cl1bcmVsYXRpb25TdHJdIHx8IHt9O1xyXG4gICAgICAgIG9Nb2RlbC5tZXRhLnQzW2RvbWFpblN0cl1bcmVsYXRpb25TdHJdW0NhdGVnb3J5U3RyaW5nXSA9IHt9O1xyXG5cclxuICAgICAgICBvTW9kZWwubWV0YS50M1tDYXRlZ29yeVN0cmluZ10gPSBvTW9kZWwubWV0YS50M1tDYXRlZ29yeVN0cmluZ10gfHwge307XHJcbiAgICAgICAgb01vZGVsLm1ldGEudDNbQ2F0ZWdvcnlTdHJpbmddW3JldmVyc2VSZWxhdGlvblN0cl0gPSBvTW9kZWwubWV0YS50M1tDYXRlZ29yeVN0cmluZ11bcmV2ZXJzZVJlbGF0aW9uU3RyXSB8fCB7fTtcclxuICAgICAgICBvTW9kZWwubWV0YS50M1tDYXRlZ29yeVN0cmluZ11bcmV2ZXJzZVJlbGF0aW9uU3RyXVtkb21haW5TdHJdID0ge307XHJcblxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gYWRkIGEgcHJlY2ljZSBkb21haW4gbWF0Y2hydWxlXHJcbiAgICBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG9Nb2RlbC5tUnVsZXMsIHtcclxuICAgICAgICBjYXRlZ29yeTogXCJkb21haW5cIixcclxuICAgICAgICBtYXRjaGVkU3RyaW5nOiBvTWRsLmRvbWFpbixcclxuICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQsXHJcbiAgICAgICAgd29yZDogb01kbC5kb21haW4sXHJcbiAgICAgICAgYml0aW5kZXg6IG9NZGwuYml0aW5kZXgsXHJcbiAgICAgICAgYml0U2VudGVuY2VBbmQgOiBvTWRsLmJpdGluZGV4LFxyXG4gICAgICAgIHdvcmRUeXBlIDogXCJEXCIsXHJcbiAgICAgICAgX3Jhbmtpbmc6IDAuOTVcclxuICAgIH0sIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG5cclxuICAgIC8vIGNoZWNrIHRoZSB0b29sXHJcbiAgICBpZiAob01kbC50b29sICYmIG9NZGwudG9vbC5yZXF1aXJlcykge1xyXG4gICAgICAgIHZhciByZXF1aXJlcyA9IE9iamVjdC5rZXlzKG9NZGwudG9vbC5yZXF1aXJlcyB8fCB7fSk7XHJcbiAgICAgICAgdmFyIGRpZmYgPSBfLmRpZmZlcmVuY2UocmVxdWlyZXMsIG9NZGwuY2F0ZWdvcnkpO1xyXG4gICAgICAgIGlmIChkaWZmLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYCAke29NZGwuZG9tYWlufSA6IFVua293biBjYXRlZ29yeSBpbiByZXF1aXJlcyBvZiB0b29sOiBcImAgKyBkaWZmLmpvaW4oJ1wiJykgKyAnXCInKTtcclxuICAgICAgICAgICAgcHJvY2Vzcy5leGl0KC0xKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIG9wdGlvbmFsID0gT2JqZWN0LmtleXMob01kbC50b29sLm9wdGlvbmFsKTtcclxuICAgICAgICBkaWZmID0gXy5kaWZmZXJlbmNlKG9wdGlvbmFsLCBvTWRsLmNhdGVnb3J5KTtcclxuICAgICAgICBpZiAoZGlmZi5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgJHtvTWRsLmRvbWFpbn0gOiBVbmtvd24gY2F0ZWdvcnkgb3B0aW9uYWwgb2YgdG9vbDogXCJgICsgZGlmZi5qb2luKCdcIicpICsgJ1wiJyk7XHJcbiAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgtMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIE9iamVjdC5rZXlzKG9NZGwudG9vbC5zZXRzIHx8IHt9KS5mb3JFYWNoKGZ1bmN0aW9uIChzZXRJRCkge1xyXG4gICAgICAgICAgICB2YXIgZGlmZiA9IF8uZGlmZmVyZW5jZShvTWRsLnRvb2wuc2V0c1tzZXRJRF0uc2V0LCBvTWRsLmNhdGVnb3J5KTtcclxuICAgICAgICAgICAgaWYgKGRpZmYubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAke29NZGwuZG9tYWlufSA6IFVua293biBjYXRlZ29yeSBpbiBzZXRJZCAke3NldElEfSBvZiB0b29sOiBcImAgKyBkaWZmLmpvaW4oJ1wiJykgKyAnXCInKTtcclxuICAgICAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgtMSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gZXh0cmFjdCB0b29scyBhbiBhZGQgdG8gdG9vbHM6XHJcbiAgICAgICAgb01vZGVsLnRvb2xzLmZpbHRlcihmdW5jdGlvbiAob0VudHJ5KSB7XHJcbiAgICAgICAgICAgIGlmIChvRW50cnkubmFtZSA9PT0gKG9NZGwudG9vbCAmJiBvTWRsLnRvb2wubmFtZSkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVG9vbCBcIiArIG9NZGwudG9vbC5uYW1lICsgXCIgYWxyZWFkeSBwcmVzZW50IHdoZW4gbG9hZGluZyBcIiArIHNNb2RlbE5hbWUpO1xyXG4gICAgICAgICAgICAgICAgLy90aHJvdyBuZXcgRXJyb3IoJ0RvbWFpbiBhbHJlYWR5IGxvYWRlZD8nKTtcclxuICAgICAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgtMSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgb01kbC50b29saGlkZGVuID0gdHJ1ZTtcclxuICAgICAgICBvTWRsLnRvb2wucmVxdWlyZXMgPSB7IFwiaW1wb3NzaWJsZVwiOiB7fSB9O1xyXG4gICAgfVxyXG4gICAgLy8gYWRkIHRoZSB0b29sIG5hbWUgYXMgcnVsZSB1bmxlc3MgaGlkZGVuXHJcbiAgICBpZiAoIW9NZGwudG9vbGhpZGRlbiAmJiBvTWRsLnRvb2wgJiYgb01kbC50b29sLm5hbWUpIHtcclxuICAgICAgICBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG9Nb2RlbC5tUnVsZXMsIHtcclxuICAgICAgICAgICAgY2F0ZWdvcnk6IFwidG9vbFwiLFxyXG4gICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvTWRsLnRvb2wubmFtZSxcclxuICAgICAgICAgICAgdHlwZTogSU1hdGNoLkVudW1SdWxlVHlwZS5XT1JELFxyXG4gICAgICAgICAgICB3b3JkOiBvTWRsLnRvb2wubmFtZSxcclxuICAgICAgICAgICAgYml0aW5kZXg6IG9NZGwuYml0aW5kZXgsXHJcbiAgICAgICAgICAgIGJpdFNlbnRlbmNlQW5kIDogb01kbC5iaXRpbmRleCxcclxuICAgICAgICAgICAgd29yZFR5cGUgOiBJTWF0Y2guV09SRFRZUEUuVE9PTCxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IDAuOTVcclxuICAgICAgICB9LCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgIH07XHJcbiAgICBpZiAob01kbC5zeW5vbnltcyAmJiBvTWRsLnN5bm9ueW1zW1widG9vbFwiXSkge1xyXG4gICAgICAgIGFkZFN5bm9ueW1zKG9NZGwuc3lub255bXNbXCJ0b29sXCJdLCBcInRvb2xcIiwgb01kbC50b29sLm5hbWUsIG9NZGwuYml0aW5kZXgsXHJcbiAgICAgICAgb01kbC5iaXRpbmRleCwgSU1hdGNoLldPUkRUWVBFLlRPT0wsIG9Nb2RlbC5tUnVsZXMsIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG4gICAgfTtcclxuICAgIGlmIChvTWRsLnN5bm9ueW1zKSB7XHJcbiAgICAgICAgT2JqZWN0LmtleXMob01kbC5zeW5vbnltcykuZm9yRWFjaChmdW5jdGlvbiAoc3N5bmtleSkge1xyXG4gICAgICAgICAgICBpZiAob01kbC5jYXRlZ29yeS5pbmRleE9mKHNzeW5rZXkpID49IDAgJiYgc3N5bmtleSAhPT0gXCJ0b29sXCIpIHtcclxuICAgICAgICAgICAgICAgIGlmIChvTW9kZWwuZnVsbC5kb21haW5bb01kbC5kb21haW5dLmNhdGVnb3JpZXNbc3N5bmtleV0pIHtcclxuICAgICAgICAgICAgICAgICAgICBvTW9kZWwuZnVsbC5kb21haW5bb01kbC5kb21haW5dLmNhdGVnb3JpZXNbc3N5bmtleV0uY2F0ZWdvcnlfc3lub255bXMgPSBvTWRsLnN5bm9ueW1zW3NzeW5rZXldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYWRkU3lub255bXMob01kbC5zeW5vbnltc1tzc3lua2V5XSwgXCJjYXRlZ29yeVwiLCBzc3lua2V5LCBvTWRsLmJpdGluZGV4LCBvTWRsLmJpdGluZGV4LFxyXG4gICAgICAgICAgICAgICAgSU1hdGNoLldPUkRUWVBFLkNBVEVHT1JZLCBvTW9kZWwubVJ1bGVzLCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgb01vZGVsLmRvbWFpbnMucHVzaChvTWRsLmRvbWFpbik7XHJcbiAgICBpZiAob01kbC50b29sLm5hbWUpIHtcclxuICAgICAgICBvTW9kZWwudG9vbHMucHVzaChvTWRsLnRvb2wpO1xyXG4gICAgfVxyXG4gICAgb01vZGVsLmNhdGVnb3J5ID0gb01vZGVsLmNhdGVnb3J5LmNvbmNhdChvTWRsLmNhdGVnb3J5KTtcclxuICAgIG9Nb2RlbC5jYXRlZ29yeS5zb3J0KCk7XHJcbiAgICBvTW9kZWwuY2F0ZWdvcnkgPSBvTW9kZWwuY2F0ZWdvcnkuZmlsdGVyKGZ1bmN0aW9uIChzdHJpbmcsIGluZGV4KSB7XHJcbiAgICAgICAgcmV0dXJuIG9Nb2RlbC5jYXRlZ29yeVtpbmRleF0gIT09IG9Nb2RlbC5jYXRlZ29yeVtpbmRleCArIDFdO1xyXG4gICAgfSk7XHJcblxyXG59IC8vIGxvYWRtb2RlbFxyXG4qL1xyXG5cclxuZnVuY3Rpb24gbWFrZU1kbE1vbmdvKG1vZGVsSGFuZGxlOiBJTWF0Y2guSU1vZGVsSGFuZGxlUmF3LCBzTW9kZWxOYW1lOiBzdHJpbmcsIG9Nb2RlbDogSU1hdGNoLklNb2RlbHMpOiBJTW9kZWwge1xyXG4gICAgdmFyIG1vZGVsRG9jID0gbW9kZWxIYW5kbGUubW9kZWxEb2NzW3NNb2RlbE5hbWVdO1xyXG4gICAgdmFyIG9NZGwgPSB7XHJcbiAgICAgICAgYml0aW5kZXg6IGdldERvbWFpbkJpdEluZGV4U2FmZShtb2RlbERvYy5kb21haW4sIG9Nb2RlbCksXHJcbiAgICAgICAgZG9tYWluOiBtb2RlbERvYy5kb21haW4sXHJcbiAgICAgICAgbW9kZWxuYW1lOiBzTW9kZWxOYW1lLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiBtb2RlbERvYy5kb21haW5fZGVzY3JpcHRpb25cclxuICAgIH0gYXMgSU1vZGVsO1xyXG4gICAgdmFyIGNhdGVnb3J5RGVzY3JpYmVkTWFwID0ge30gYXMgeyBba2V5OiBzdHJpbmddOiBJTWF0Y2guSUNhdGVnb3J5RGVzYyB9O1xyXG5cclxuICAgIG9NZGwuYml0aW5kZXggPSBnZXREb21haW5CaXRJbmRleFNhZmUobW9kZWxEb2MuZG9tYWluLCBvTW9kZWwpO1xyXG4gICAgb01kbC5jYXRlZ29yeSA9IG1vZGVsRG9jLl9jYXRlZ29yaWVzLm1hcChjYXQgPT4gY2F0LmNhdGVnb3J5KTtcclxuICAgIG9NZGwuY2F0ZWdvcnlEZXNjcmliZWQgPSBbXTtcclxuICAgIG1vZGVsRG9jLl9jYXRlZ29yaWVzLmZvckVhY2goY2F0ID0+IHtcclxuICAgICAgICBvTWRsLmNhdGVnb3J5RGVzY3JpYmVkLnB1c2goe1xyXG4gICAgICAgICAgICBuYW1lOiBjYXQuY2F0ZWdvcnksXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBjYXQuY2F0ZWdvcnlfZGVzY3JpcHRpb25cclxuICAgICAgICB9KVxyXG4gICAgICAgIGNhdGVnb3J5RGVzY3JpYmVkTWFwW2NhdC5jYXRlZ29yeV0gPSBjYXQ7XHJcbiAgICB9KTtcclxuXHJcbiAgICBvTWRsLmNhdGVnb3J5ID0gbW9kZWxEb2MuX2NhdGVnb3JpZXMubWFwKGNhdCA9PiBjYXQuY2F0ZWdvcnkpO1xyXG5cclxuICAgIC8qIC8vIHJlY3RpZnkgY2F0ZWdvcnlcclxuICAgICBvTWRsLmNhdGVnb3J5ID0gb01kbC5jYXRlZ29yeS5tYXAoZnVuY3Rpb24gKGNhdDogYW55KSB7XHJcbiAgICAgICAgIGlmICh0eXBlb2YgY2F0ID09PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICAgICByZXR1cm4gY2F0O1xyXG4gICAgICAgICB9XHJcbiAgICAgICAgIGlmICh0eXBlb2YgY2F0Lm5hbWUgIT09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTWlzc2luZyBuYW1lIGluIG9iamVjdCB0eXBlZCBjYXRlZ29yeSBpbiBcIiArIEpTT04uc3RyaW5naWZ5KGNhdCkgKyBcIiBpbiBtb2RlbCBcIiArIHNNb2RlbE5hbWUpO1xyXG4gICAgICAgICAgICAgcHJvY2Vzcy5leGl0KC0xKTtcclxuICAgICAgICAgICAgIC8vdGhyb3cgbmV3IEVycm9yKCdEb21haW4gJyArIG9NZGwuZG9tYWluICsgJyBhbHJlYWR5IGxvYWRlZCB3aGlsZSBsb2FkaW5nICcgKyBzTW9kZWxOYW1lICsgJz8nKTtcclxuICAgICAgICAgfVxyXG4gICAgICAgICBjYXRlZ29yeURlc2NyaWJlZE1hcFtjYXQubmFtZV0gPSBjYXQ7XHJcbiAgICAgICAgIG9NZGwuY2F0ZWdvcnlEZXNjcmliZWQucHVzaChjYXQpO1xyXG4gICAgICAgICByZXR1cm4gY2F0Lm5hbWU7XHJcbiAgICAgfSk7XHJcbiAgICAgKi9cclxuXHJcbiAgICAvLyBhZGQgdGhlIGNhdGVnb3JpZXMgdG8gdGhlIHJ1bGVzXHJcbiAgICBvTWRsLmNhdGVnb3J5LmZvckVhY2goZnVuY3Rpb24gKGNhdGVnb3J5KSB7XHJcbiAgICAgICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCB7XHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBcImNhdGVnb3J5XCIsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IGNhdGVnb3J5LFxyXG4gICAgICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQsXHJcbiAgICAgICAgICAgIHdvcmQ6IGNhdGVnb3J5LFxyXG4gICAgICAgICAgICBsb3dlcmNhc2V3b3JkOiBjYXRlZ29yeS50b0xvd2VyQ2FzZSgpLFxyXG4gICAgICAgICAgICBiaXRpbmRleDogb01kbC5iaXRpbmRleCxcclxuICAgICAgICAgICAgd29yZFR5cGU6IElNYXRjaC5XT1JEVFlQRS5DQVRFR09SWSxcclxuICAgICAgICAgICAgYml0U2VudGVuY2VBbmQ6IG9NZGwuYml0aW5kZXgsXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiAwLjk1XHJcbiAgICAgICAgfSwgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBhZGQgc3lub25hbnltIGZvciB0aGUgY2F0ZWdvcmllcyB0byB0aGVcclxuXHJcbiAgICBtb2RlbERvYy5fY2F0ZWdvcmllcy5mb3JFYWNoKGNhdCA9PiB7XHJcbiAgICAgICAgYWRkU3lub255bXNcclxuXHJcbiAgICB9KTtcclxuXHJcbiAgICBpZiAob01vZGVsLmRvbWFpbnMuaW5kZXhPZihvTWRsLmRvbWFpbikgPCAwKSB7XHJcbiAgICAgICAgZGVidWdsb2coXCIqKioqKioqKioqKmhlcmUgbWRsXCIgKyBKU09OLnN0cmluZ2lmeShvTWRsLCB1bmRlZmluZWQsIDIpKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RvbWFpbiAnICsgb01kbC5kb21haW4gKyAnIGFscmVhZHkgbG9hZGVkIHdoaWxlIGxvYWRpbmcgJyArIHNNb2RlbE5hbWUgKyAnPycpO1xyXG4gICAgfVxyXG4gICAgLypcclxuICAgIC8vIGNoZWNrIHByb3BlcnRpZXMgb2YgbW9kZWxcclxuICAgIE9iamVjdC5rZXlzKG9NZGwpLnNvcnQoKS5mb3JFYWNoKGZ1bmN0aW9uIChzUHJvcGVydHkpIHtcclxuICAgICAgICBpZiAoQVJSX01PREVMX1BST1BFUlRJRVMuaW5kZXhPZihzUHJvcGVydHkpIDwgMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01vZGVsIHByb3BlcnR5IFwiJyArIHNQcm9wZXJ0eSArICdcIiBub3QgYSBrbm93biBtb2RlbCBwcm9wZXJ0eSBpbiBtb2RlbCBvZiBkb21haW4gJyArIG9NZGwuZG9tYWluICsgJyAnKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICAgICovXHJcblxyXG4gICAgLy8gY29uc2lkZXIgc3RyZWFtbGluaW5nIHRoZSBjYXRlZ29yaWVzXHJcbiAgICBvTW9kZWwucmF3TW9kZWxzW29NZGwuZG9tYWluXSA9IG9NZGw7XHJcblxyXG4gICAgb01vZGVsLmZ1bGwuZG9tYWluW29NZGwuZG9tYWluXSA9IHtcclxuICAgICAgICBkZXNjcmlwdGlvbjogb01kbC5kZXNjcmlwdGlvbixcclxuICAgICAgICBjYXRlZ29yaWVzOiBjYXRlZ29yeURlc2NyaWJlZE1hcCxcclxuICAgICAgICBiaXRpbmRleDogb01kbC5iaXRpbmRleFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBjaGVjayB0aGF0XHJcblxyXG5cclxuICAgIC8vIGNoZWNrIHRoYXQgbWVtYmVycyBvZiB3b3JkaW5kZXggYXJlIGluIGNhdGVnb3JpZXMsXHJcbiAgICAvKiBvTWRsLndvcmRpbmRleCA9IG9Nb2RlbERvYy5vTWRsLndvcmRpbmRleCB8fCBbXTtcclxuICAgICBvTWRsLndvcmRpbmRleC5mb3JFYWNoKGZ1bmN0aW9uIChzV29yZEluZGV4KSB7XHJcbiAgICAgICAgIGlmIChvTWRsLmNhdGVnb3J5LmluZGV4T2Yoc1dvcmRJbmRleCkgPCAwKSB7XHJcbiAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01vZGVsIHdvcmRpbmRleCBcIicgKyBzV29yZEluZGV4ICsgJ1wiIG5vdCBhIGNhdGVnb3J5IG9mIGRvbWFpbiAnICsgb01kbC5kb21haW4gKyAnICcpO1xyXG4gICAgICAgICB9XHJcbiAgICAgfSk7XHJcbiAgICAgKi9cclxuICAgIC8qXHJcbiAgICBvTWRsLmV4YWN0bWF0Y2ggPSBvTWRsLmV4YWN0bWF0Y2ggfHwgW107XHJcbiAgICBvTWRsLmV4YWN0bWF0Y2guZm9yRWFjaChmdW5jdGlvbiAoc0V4YWN0TWF0Y2gpIHtcclxuICAgICAgICBpZiAob01kbC5jYXRlZ29yeS5pbmRleE9mKHNFeGFjdE1hdGNoKSA8IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNb2RlbCBleGFjdG1hdGNoIFwiJyArIHNFeGFjdE1hdGNoICsgJ1wiIG5vdCBhIGNhdGVnb3J5IG9mIGRvbWFpbiAnICsgb01kbC5kb21haW4gKyAnICcpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgKi9cclxuICAgIG9NZGwuY29sdW1ucyA9IG1vZGVsRG9jLmNvbHVtbnM7IC8vIG9NZGwuY29sdW1ucyB8fCBbXTtcclxuICAgIG9NZGwuY29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uIChzRXhhY3RNYXRjaCkge1xyXG4gICAgICAgIGlmIChvTWRsLmNhdGVnb3J5LmluZGV4T2Yoc0V4YWN0TWF0Y2gpIDwgMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01vZGVsIGNvbHVtbiBcIicgKyBzRXhhY3RNYXRjaCArICdcIiBub3QgYSBjYXRlZ29yeSBvZiBkb21haW4gJyArIG9NZGwuZG9tYWluICsgJyAnKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcblxyXG4gICAgLy8gYWRkIHJlbGF0aW9uIGRvbWFpbiAtPiBjYXRlZ29yeVxyXG4gICAgdmFyIGRvbWFpblN0ciA9IE1ldGFGLkRvbWFpbihvTWRsLmRvbWFpbikudG9GdWxsU3RyaW5nKCk7XHJcbiAgICB2YXIgcmVsYXRpb25TdHIgPSBNZXRhRi5SZWxhdGlvbihNZXRhLlJFTEFUSU9OX2hhc0NhdGVnb3J5KS50b0Z1bGxTdHJpbmcoKTtcclxuICAgIHZhciByZXZlcnNlUmVsYXRpb25TdHIgPSBNZXRhRi5SZWxhdGlvbihNZXRhLlJFTEFUSU9OX2lzQ2F0ZWdvcnlPZikudG9GdWxsU3RyaW5nKCk7XHJcbiAgICBvTWRsLmNhdGVnb3J5LmZvckVhY2goZnVuY3Rpb24gKHNDYXRlZ29yeSkge1xyXG5cclxuICAgICAgICB2YXIgQ2F0ZWdvcnlTdHJpbmcgPSBNZXRhRi5DYXRlZ29yeShzQ2F0ZWdvcnkpLnRvRnVsbFN0cmluZygpO1xyXG4gICAgICAgIG9Nb2RlbC5tZXRhLnQzW2RvbWFpblN0cl0gPSBvTW9kZWwubWV0YS50M1tkb21haW5TdHJdIHx8IHt9O1xyXG4gICAgICAgIG9Nb2RlbC5tZXRhLnQzW2RvbWFpblN0cl1bcmVsYXRpb25TdHJdID0gb01vZGVsLm1ldGEudDNbZG9tYWluU3RyXVtyZWxhdGlvblN0cl0gfHwge307XHJcbiAgICAgICAgb01vZGVsLm1ldGEudDNbZG9tYWluU3RyXVtyZWxhdGlvblN0cl1bQ2F0ZWdvcnlTdHJpbmddID0ge307XHJcblxyXG4gICAgICAgIG9Nb2RlbC5tZXRhLnQzW0NhdGVnb3J5U3RyaW5nXSA9IG9Nb2RlbC5tZXRhLnQzW0NhdGVnb3J5U3RyaW5nXSB8fCB7fTtcclxuICAgICAgICBvTW9kZWwubWV0YS50M1tDYXRlZ29yeVN0cmluZ11bcmV2ZXJzZVJlbGF0aW9uU3RyXSA9IG9Nb2RlbC5tZXRhLnQzW0NhdGVnb3J5U3RyaW5nXVtyZXZlcnNlUmVsYXRpb25TdHJdIHx8IHt9O1xyXG4gICAgICAgIG9Nb2RlbC5tZXRhLnQzW0NhdGVnb3J5U3RyaW5nXVtyZXZlcnNlUmVsYXRpb25TdHJdW2RvbWFpblN0cl0gPSB7fTtcclxuXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBhZGQgYSBwcmVjaWNlIGRvbWFpbiBtYXRjaHJ1bGVcclxuICAgIGluc2VydFJ1bGVJZk5vdFByZXNlbnQob01vZGVsLm1SdWxlcywge1xyXG4gICAgICAgIGNhdGVnb3J5OiBcImRvbWFpblwiLFxyXG4gICAgICAgIG1hdGNoZWRTdHJpbmc6IG9NZGwuZG9tYWluLFxyXG4gICAgICAgIHR5cGU6IElNYXRjaC5FbnVtUnVsZVR5cGUuV09SRCxcclxuICAgICAgICB3b3JkOiBvTWRsLmRvbWFpbixcclxuICAgICAgICBiaXRpbmRleDogb01kbC5iaXRpbmRleCxcclxuICAgICAgICBiaXRTZW50ZW5jZUFuZDogb01kbC5iaXRpbmRleCxcclxuICAgICAgICB3b3JkVHlwZTogSU1hdGNoLldPUkRUWVBFLkRPTUFJTixcclxuICAgICAgICBfcmFua2luZzogMC45NVxyXG4gICAgfSwgb01vZGVsLnNlZW5SdWxlcyk7XHJcblxyXG4gICAgLy8gYWRkIGRvbWFpbiBzeW5vbnltc1xyXG4gICAgaWYgKG1vZGVsRG9jLmRvbWFpbl9zeW5vbnltcyAmJiBtb2RlbERvYy5kb21haW5fc3lub255bXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGFkZFN5bm9ueW1zKG1vZGVsRG9jLmRvbWFpbl9zeW5vbnltcywgXCJkb21haW5cIiwgbW9kZWxEb2MuZG9tYWluLCBvTWRsLmJpdGluZGV4LFxyXG4gICAgICAgICAgICBvTWRsLmJpdGluZGV4LCBJTWF0Y2guV09SRFRZUEUuRE9NQUlOLCBvTW9kZWwubVJ1bGVzLCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgICAgICBhZGRTeW5vbnltcyhtb2RlbERvYy5kb21haW5fc3lub255bXMsIFwiZG9tYWluXCIsIG1vZGVsRG9jLmRvbWFpbiwgZ2V0RG9tYWluQml0SW5kZXhTYWZlKERPTUFJTl9NRVRBTU9ERUwsIG9Nb2RlbCksXHJcbiAgICAgICAgICAgICAgICAgIGdldERvbWFpbkJpdEluZGV4U2FmZShET01BSU5fTUVUQU1PREVMLCBvTW9kZWwpLFxyXG4gICAgICAgICAgICAgICAgSU1hdGNoLldPUkRUWVBFLkZBQ1QsIG9Nb2RlbC5tUnVsZXMsIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG4gICAgICAgIC8vIFRPRE86IHN5bm9ueW0gaGF2ZSB0byBiZSBhZGRlZCBhcyAqRkFDVCogZm9yIHRoZSBtZXRhbW9kZWwhXHJcblxyXG4gICAgfTtcclxuXHJcblxyXG4gICAgLypcclxuICAgICAgICAvLyBjaGVjayB0aGUgdG9vbFxyXG4gICAgICAgIGlmIChvTWRsLnRvb2wgJiYgb01kbC50b29sLnJlcXVpcmVzKSB7XHJcbiAgICAgICAgICAgIHZhciByZXF1aXJlcyA9IE9iamVjdC5rZXlzKG9NZGwudG9vbC5yZXF1aXJlcyB8fCB7fSk7XHJcbiAgICAgICAgICAgIHZhciBkaWZmID0gXy5kaWZmZXJlbmNlKHJlcXVpcmVzLCBvTWRsLmNhdGVnb3J5KTtcclxuICAgICAgICAgICAgaWYgKGRpZmYubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAke29NZGwuZG9tYWlufSA6IFVua293biBjYXRlZ29yeSBpbiByZXF1aXJlcyBvZiB0b29sOiBcImAgKyBkaWZmLmpvaW4oJ1wiJykgKyAnXCInKTtcclxuICAgICAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgtMSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIG9wdGlvbmFsID0gT2JqZWN0LmtleXMob01kbC50b29sLm9wdGlvbmFsKTtcclxuICAgICAgICAgICAgZGlmZiA9IF8uZGlmZmVyZW5jZShvcHRpb25hbCwgb01kbC5jYXRlZ29yeSk7XHJcbiAgICAgICAgICAgIGlmIChkaWZmLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgJHtvTWRsLmRvbWFpbn0gOiBVbmtvd24gY2F0ZWdvcnkgb3B0aW9uYWwgb2YgdG9vbDogXCJgICsgZGlmZi5qb2luKCdcIicpICsgJ1wiJyk7XHJcbiAgICAgICAgICAgICAgICBwcm9jZXNzLmV4aXQoLTEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKG9NZGwudG9vbC5zZXRzIHx8IHt9KS5mb3JFYWNoKGZ1bmN0aW9uIChzZXRJRCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGRpZmYgPSBfLmRpZmZlcmVuY2Uob01kbC50b29sLnNldHNbc2V0SURdLnNldCwgb01kbC5jYXRlZ29yeSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGlmZi5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAke29NZGwuZG9tYWlufSA6IFVua293biBjYXRlZ29yeSBpbiBzZXRJZCAke3NldElEfSBvZiB0b29sOiBcImAgKyBkaWZmLmpvaW4oJ1wiJykgKyAnXCInKTtcclxuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzLmV4aXQoLTEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIC8vIGV4dHJhY3QgdG9vbHMgYW4gYWRkIHRvIHRvb2xzOlxyXG4gICAgICAgICAgICBvTW9kZWwudG9vbHMuZmlsdGVyKGZ1bmN0aW9uIChvRW50cnkpIHtcclxuICAgICAgICAgICAgICAgIGlmIChvRW50cnkubmFtZSA9PT0gKG9NZGwudG9vbCAmJiBvTWRsLnRvb2wubmFtZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlRvb2wgXCIgKyBvTWRsLnRvb2wubmFtZSArIFwiIGFscmVhZHkgcHJlc2VudCB3aGVuIGxvYWRpbmcgXCIgKyBzTW9kZWxOYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICAvL3Rocm93IG5ldyBFcnJvcignRG9tYWluIGFscmVhZHkgbG9hZGVkPycpO1xyXG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgtMSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG9NZGwudG9vbGhpZGRlbiA9IHRydWU7XHJcbiAgICAgICAgICAgIG9NZGwudG9vbC5yZXF1aXJlcyA9IHsgXCJpbXBvc3NpYmxlXCI6IHt9IH07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIGFkZCB0aGUgdG9vbCBuYW1lIGFzIHJ1bGUgdW5sZXNzIGhpZGRlblxyXG4gICAgICAgIGlmICghb01kbC50b29saGlkZGVuICYmIG9NZGwudG9vbCAmJiBvTWRsLnRvb2wubmFtZSkge1xyXG4gICAgICAgICAgICBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG9Nb2RlbC5tUnVsZXMsIHtcclxuICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBcInRvb2xcIixcclxuICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9NZGwudG9vbC5uYW1lLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogSU1hdGNoLkVudW1SdWxlVHlwZS5XT1JELFxyXG4gICAgICAgICAgICAgICAgd29yZDogb01kbC50b29sLm5hbWUsXHJcbiAgICAgICAgICAgICAgICBiaXRpbmRleDogb01kbC5iaXRpbmRleCxcclxuICAgICAgICAgICAgICAgIGJpdFNlbnRlbmNlQW5kIDogb01kbC5iaXRpbmRleCxcclxuICAgICAgICAgICAgICAgIHdvcmRUeXBlIDogSU1hdGNoLldPUkRUWVBFLlRPT0wsXHJcbiAgICAgICAgICAgICAgICBfcmFua2luZzogMC45NVxyXG4gICAgICAgICAgICB9LCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIGlmIChvTWRsLnN5bm9ueW1zICYmIG9NZGwuc3lub255bXNbXCJ0b29sXCJdKSB7XHJcbiAgICAgICAgICAgIGFkZFN5bm9ueW1zKG9NZGwuc3lub255bXNbXCJ0b29sXCJdLCBcInRvb2xcIiwgb01kbC50b29sLm5hbWUsIG9NZGwuYml0aW5kZXgsXHJcbiAgICAgICAgICAgIG9NZGwuYml0aW5kZXgsIElNYXRjaC5XT1JEVFlQRS5UT09MLCBvTW9kZWwubVJ1bGVzLCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgICovXHJcblxyXG4gICAgLy8gYWRkIHN5bnNvbnltIGZvciB0aGUgZG9tYWluc1xyXG5cclxuXHJcbiAgICAvLyBhZGQgc3lub255bXMgZm9yIHRoZSBjYXRlZ29yaWVzXHJcblxyXG4gICAgbW9kZWxEb2MuX2NhdGVnb3JpZXMuZm9yRWFjaChjYXQgPT4ge1xyXG4gICAgICAgIGlmIChjYXQuY2F0ZWdvcnlfc3lub255bXMgJiYgY2F0LmNhdGVnb3J5X3N5bm9ueW1zLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgaWYgKG9Nb2RlbC5mdWxsLmRvbWFpbltvTWRsLmRvbWFpbl0uY2F0ZWdvcmllc1tjYXQuY2F0ZWdvcnldKSB7XHJcbiAgICAgICAgICAgICAgICBvTW9kZWwuZnVsbC5kb21haW5bb01kbC5kb21haW5dLmNhdGVnb3JpZXNbY2F0LmNhdGVnb3J5XS5jYXRlZ29yeV9zeW5vbnltcyA9IGNhdC5jYXRlZ29yeV9zeW5vbnltcztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBhZGRTeW5vbnltcyhjYXQuY2F0ZWdvcnlfc3lub255bXMsIFwiY2F0ZWdvcnlcIiwgY2F0LmNhdGVnb3J5LCBvTWRsLmJpdGluZGV4LCBvTWRsLmJpdGluZGV4LFxyXG4gICAgICAgICAgICAgICAgSU1hdGNoLldPUkRUWVBFLkNBVEVHT1JZLCBvTW9kZWwubVJ1bGVzLCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgICAgICAgICAgLy8gYWRkIHN5bm9ueW1zIGludG8gdGhlIG1ldGFtb2RlbCBkb21haW5cclxuICAgICAgICAgICAgYWRkU3lub255bXMoY2F0LmNhdGVnb3J5X3N5bm9ueW1zLCBcImNhdGVnb3J5XCIsIGNhdC5jYXRlZ29yeSwgZ2V0RG9tYWluQml0SW5kZXhTYWZlKERPTUFJTl9NRVRBTU9ERUwsIG9Nb2RlbCksXHJcbiAgICAgICAgICAgICAgICAgIGdldERvbWFpbkJpdEluZGV4U2FmZShET01BSU5fTUVUQU1PREVMLCBvTW9kZWwpLFxyXG4gICAgICAgICAgICAgICAgSU1hdGNoLldPUkRUWVBFLkZBQ1QsIG9Nb2RlbC5tUnVsZXMsIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgICk7XHJcblxyXG4gICAgLy8gYWRkIG9wZXJhdG9yc1xyXG5cclxuICAgIC8vIGFkZCBmaWxsZXJzXHJcbiAgICBpZihvTW9kZWwuZG9tYWlucy5pbmRleE9mKG9NZGwuZG9tYWluKSA8IDApIHtcclxuICAgICAgICB0aHJvdyBFcnJvcignbWlzc2luZyBkb21haW4gcmVnaXN0cmF0aW9uIGZvciAnICsgb01kbC5kb21haW4pO1xyXG4gICAgfVxyXG4gICAgLy9vTW9kZWwuZG9tYWlucy5wdXNoKG9NZGwuZG9tYWluKTtcclxuICAgIG9Nb2RlbC5jYXRlZ29yeSA9IG9Nb2RlbC5jYXRlZ29yeS5jb25jYXQob01kbC5jYXRlZ29yeSk7XHJcbiAgICBvTW9kZWwuY2F0ZWdvcnkuc29ydCgpO1xyXG4gICAgb01vZGVsLmNhdGVnb3J5ID0gb01vZGVsLmNhdGVnb3J5LmZpbHRlcihmdW5jdGlvbiAoc3RyaW5nLCBpbmRleCkge1xyXG4gICAgICAgIHJldHVybiBvTW9kZWwuY2F0ZWdvcnlbaW5kZXhdICE9PSBvTW9kZWwuY2F0ZWdvcnlbaW5kZXggKyAxXTtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIG9NZGw7XHJcbn0gLy8gbG9hZG1vZGVsXHJcblxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzcGxpdFJ1bGVzKHJ1bGVzOiBJTWF0Y2gubVJ1bGVbXSk6IElNYXRjaC5TcGxpdFJ1bGVzIHtcclxuICAgIHZhciByZXMgPSB7fTtcclxuICAgIHZhciBub25Xb3JkUnVsZXMgPSBbXTtcclxuICAgIHJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKHJ1bGUpIHtcclxuICAgICAgICBpZiAocnVsZS50eXBlID09PSBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQpIHtcclxuICAgICAgICAgICAgaWYgKCFydWxlLmxvd2VyY2FzZXdvcmQpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlJ1bGUgaGFzIG5vIG1lbWJlciBsb3dlcmNhc2V3b3JkXCIgKyBKU09OLnN0cmluZ2lmeShydWxlKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmVzW3J1bGUubG93ZXJjYXNld29yZF0gPSByZXNbcnVsZS5sb3dlcmNhc2V3b3JkXSB8fCB7IGJpdGluZGV4OiAwLCBydWxlczogW10gfTtcclxuICAgICAgICAgICAgcmVzW3J1bGUubG93ZXJjYXNld29yZF0uYml0aW5kZXggPSByZXNbcnVsZS5sb3dlcmNhc2V3b3JkXS5iaXRpbmRleCB8IHJ1bGUuYml0aW5kZXg7XHJcbiAgICAgICAgICAgIHJlc1tydWxlLmxvd2VyY2FzZXdvcmRdLnJ1bGVzLnB1c2gocnVsZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbm9uV29yZFJ1bGVzLnB1c2gocnVsZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHdvcmRNYXA6IHJlcyxcclxuICAgICAgICBub25Xb3JkUnVsZXM6IG5vbldvcmRSdWxlcyxcclxuICAgICAgICBhbGxSdWxlczogcnVsZXMsXHJcbiAgICAgICAgd29yZENhY2hlOiB7fVxyXG4gICAgfTtcclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzb3J0RmxhdFJlY29yZHMoYSxiKSB7XHJcbiAgICB2YXIga2V5cyA9IF8udW5pb24oT2JqZWN0LmtleXMoYSksT2JqZWN0LmtleXMoYikpLnNvcnQoKTtcclxuICAgIHZhciByID0gMDtcclxuICAgIGtleXMuZXZlcnkoIChrZXkpID0+IHtcclxuICAgICAgICBpZih0eXBlb2YgYVtrZXldID09PSBcInN0cmluZ1wiICYmIHR5cGVvZiBiW2tleV0gIT09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgciA9IC0xO1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHR5cGVvZiBhW2tleV0gIT09IFwic3RyaW5nXCIgJiYgdHlwZW9mIGJba2V5XSA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICByID0gKzE7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYodHlwZW9mIGFba2V5XSAhPT0gXCJzdHJpbmdcIiAmJiB0eXBlb2YgYltrZXldICE9PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICAgIHIgPSAwO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgciA9IGFba2V5XS5sb2NhbGVDb21wYXJlKGJba2V5XSk7XHJcbiAgICAgICAgcmV0dXJuIHIgPT09IDA7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiByO1xyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGNtcExlbmd0aFNvcnQoYTogc3RyaW5nLCBiOiBzdHJpbmcpIHtcclxuICAgIHZhciBkID0gYS5sZW5ndGggLSBiLmxlbmd0aDtcclxuICAgIGlmIChkKSB7XHJcbiAgICAgICAgcmV0dXJuIGQ7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYS5sb2NhbGVDb21wYXJlKGIpO1xyXG59XHJcblxyXG5cclxuaW1wb3J0ICogYXMgQWxnb2wgZnJvbSAnLi4vbWF0Y2gvYWxnb2wnO1xyXG5pbXBvcnQgeyBJRk1vZGVsIH0gZnJvbSAnLi4nO1xyXG4vLyBvZmZzZXRbMF0gOiBsZW4tMlxyXG4vLyAgICAgICAgICAgICBsZW4gLTFcclxuLy8gICAgICAgICAgICAgbGVuXHJcbi8vICAgICAgICAgICAgIGxlbiArMVxyXG4vLyAgICAgICAgICAgICBsZW4gKzJcclxuLy8gICAgICAgICAgICAgbGVuICszXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZmluZE5leHRMZW4odGFyZ2V0TGVuOiBudW1iZXIsIGFycjogc3RyaW5nW10sIG9mZnNldHM6IG51bWJlcltdKSB7XHJcbiAgICBvZmZzZXRzLnNoaWZ0KCk7XHJcbiAgICBmb3IgKHZhciBpID0gb2Zmc2V0c1s0XTsgKGkgPCBhcnIubGVuZ3RoKSAmJiAoYXJyW2ldLmxlbmd0aCA8PSB0YXJnZXRMZW4pOyArK2kpIHtcclxuICAgICAgICAvKiBlbXB0eSovXHJcbiAgICB9XHJcbiAgICBvZmZzZXRzLnB1c2goaSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhZGRSYW5nZVJ1bGVzVW5sZXNzUHJlc2VudChydWxlczogSU1hdGNoLm1SdWxlW10sIGxjd29yZDogc3RyaW5nLCByYW5nZVJ1bGVzOiBJTWF0Y2gubVJ1bGVbXSwgcHJlc2VudFJ1bGVzRm9yS2V5OiBJTWF0Y2gubVJ1bGVbXSwgc2VlblJ1bGVzKSB7XHJcbiAgICByYW5nZVJ1bGVzLmZvckVhY2gocmFuZ2VSdWxlID0+IHtcclxuICAgICAgICB2YXIgbmV3UnVsZSA9IChPYmplY3QgYXMgYW55KS5hc3NpZ24oe30sIHJhbmdlUnVsZSk7XHJcbiAgICAgICAgbmV3UnVsZS5sb3dlcmNhc2V3b3JkID0gbGN3b3JkO1xyXG4gICAgICAgIG5ld1J1bGUud29yZCA9IGxjd29yZDtcclxuICAgICAgICAvL2lmKChsY3dvcmQgPT09ICdzZXJ2aWNlcycgfHwgbGN3b3JkID09PSAnc2VydmljZScpICYmIG5ld1J1bGUucmFuZ2UucnVsZS5sb3dlcmNhc2V3b3JkLmluZGV4T2YoJ29kYXRhJyk+PTApIHtcclxuICAgICAgICAvLyAgICBjb25zb2xlLmxvZyhcImFkZGluZyBcIisgSlNPTi5zdHJpbmdpZnkobmV3UnVsZSkgKyBcIlxcblwiKTtcclxuICAgICAgICAvL31cclxuICAgICAgICAvL3RvZG86IGNoZWNrIHdoZXRoZXIgYW4gZXF1aXZhbGVudCBydWxlIGlzIGFscmVhZHkgcHJlc2VudD9cclxuICAgICAgICB2YXIgY250ID0gcnVsZXMubGVuZ3RoO1xyXG4gICAgICAgIGluc2VydFJ1bGVJZk5vdFByZXNlbnQocnVsZXMsIG5ld1J1bGUsIHNlZW5SdWxlcyk7XHJcbiAgICB9KVxyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFkZENsb3NlRXhhY3RSYW5nZVJ1bGVzKHJ1bGVzOiBJTWF0Y2gubVJ1bGVbXSwgc2VlblJ1bGVzKSB7XHJcbiAgICB2YXIga2V5c01hcCA9IHt9IGFzIHsgW2tleTogc3RyaW5nXTogSU1hdGNoLm1SdWxlW10gfTtcclxuICAgIHZhciByYW5nZUtleXNNYXAgPSB7fSBhcyB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5tUnVsZVtdIH07XHJcbiAgICBydWxlcy5mb3JFYWNoKHJ1bGUgPT4ge1xyXG4gICAgICAgIGlmIChydWxlLnR5cGUgPT09IElNYXRjaC5FbnVtUnVsZVR5cGUuV09SRCkge1xyXG4gICAgICAgICAgICAvL2tleXNNYXBbcnVsZS5sb3dlcmNhc2V3b3JkXSA9IDE7XHJcbiAgICAgICAgICAgIGtleXNNYXBbcnVsZS5sb3dlcmNhc2V3b3JkXSA9IGtleXNNYXBbcnVsZS5sb3dlcmNhc2V3b3JkXSB8fCBbXTtcclxuICAgICAgICAgICAga2V5c01hcFtydWxlLmxvd2VyY2FzZXdvcmRdLnB1c2gocnVsZSk7XHJcbiAgICAgICAgICAgIGlmICghcnVsZS5leGFjdE9ubHkgJiYgcnVsZS5yYW5nZSkge1xyXG4gICAgICAgICAgICAgICAgcmFuZ2VLZXlzTWFwW3J1bGUubG93ZXJjYXNld29yZF0gPSByYW5nZUtleXNNYXBbcnVsZS5sb3dlcmNhc2V3b3JkXSB8fCBbXTtcclxuICAgICAgICAgICAgICAgIHJhbmdlS2V5c01hcFtydWxlLmxvd2VyY2FzZXdvcmRdLnB1c2gocnVsZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoa2V5c01hcCk7XHJcbiAgICBrZXlzLnNvcnQoY21wTGVuZ3RoU29ydCk7XHJcbiAgICB2YXIgbGVuID0gMDtcclxuICAgIGtleXMuZm9yRWFjaCgoa2V5LCBpbmRleCkgPT4ge1xyXG4gICAgICAgIGlmIChrZXkubGVuZ3RoICE9IGxlbikge1xyXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwic2hpZnQgdG8gbGVuXCIgKyBrZXkubGVuZ3RoICsgJyBhdCAnICsgaW5kZXggKyAnICcgKyBrZXkgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGVuID0ga2V5Lmxlbmd0aDtcclxuICAgIH0pO1xyXG4gICAgLy8gICBrZXlzID0ga2V5cy5zbGljZSgwLDIwMDApO1xyXG4gICAgdmFyIHJhbmdlS2V5cyA9IE9iamVjdC5rZXlzKHJhbmdlS2V5c01hcCk7XHJcbiAgICByYW5nZUtleXMuc29ydChjbXBMZW5ndGhTb3J0KTtcclxuICAgIC8vY29uc29sZS5sb2coYCAke2tleXMubGVuZ3RofSBrZXlzIGFuZCAke3JhbmdlS2V5cy5sZW5ndGh9IHJhbmdla2V5cyBgKTtcclxuICAgIHZhciBsb3cgPSAwO1xyXG4gICAgdmFyIGhpZ2ggPSAwO1xyXG4gICAgdmFyIGxhc3RsZW4gPSAwO1xyXG4gICAgdmFyIG9mZnNldHMgPSBbMCwgMCwgMCwgMCwgMCwgMF07XHJcbiAgICB2YXIgbGVuID0gcmFuZ2VLZXlzLmxlbmd0aDtcclxuICAgIGZpbmROZXh0TGVuKDAsIGtleXMsIG9mZnNldHMpO1xyXG4gICAgZmluZE5leHRMZW4oMSwga2V5cywgb2Zmc2V0cyk7XHJcbiAgICBmaW5kTmV4dExlbigyLCBrZXlzLCBvZmZzZXRzKTtcclxuXHJcbiAgICByYW5nZUtleXMuZm9yRWFjaChmdW5jdGlvbiAocmFuZ2VLZXkpIHtcclxuICAgICAgICBpZiAocmFuZ2VLZXkubGVuZ3RoICE9PSBsYXN0bGVuKSB7XHJcbiAgICAgICAgICAgIGZvciAoaSA9IGxhc3RsZW4gKyAxOyBpIDw9IHJhbmdlS2V5Lmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICBmaW5kTmV4dExlbihpICsgMiwga2V5cywgb2Zmc2V0cyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gICBjb25zb2xlLmxvZyhgIHNoaWZ0ZWQgdG8gJHtyYW5nZUtleS5sZW5ndGh9IHdpdGggb2Zmc2V0cyBiZWVpbmcgJHtvZmZzZXRzLmpvaW4oJyAnKX1gKTtcclxuICAgICAgICAgICAgLy8gICBjb25zb2xlLmxvZyhgIGhlcmUgMCAke29mZnNldHNbMF19IDogJHtrZXlzW01hdGgubWluKGtleXMubGVuZ3RoLTEsIG9mZnNldHNbMF0pXS5sZW5ndGh9ICAke2tleXNbTWF0aC5taW4oa2V5cy5sZW5ndGgtMSwgb2Zmc2V0c1swXSldfSBgKTtcclxuICAgICAgICAgICAgLy8gIGNvbnNvbGUubG9nKGAgaGVyZSA1LTEgICR7a2V5c1tvZmZzZXRzWzVdLTFdLmxlbmd0aH0gICR7a2V5c1tvZmZzZXRzWzVdLTFdfSBgKTtcclxuICAgICAgICAgICAgLy8gICBjb25zb2xlLmxvZyhgIGhlcmUgNSAke29mZnNldHNbNV19IDogJHtrZXlzW01hdGgubWluKGtleXMubGVuZ3RoLTEsIG9mZnNldHNbNV0pXS5sZW5ndGh9ICAke2tleXNbTWF0aC5taW4oa2V5cy5sZW5ndGgtMSwgb2Zmc2V0c1s1XSldfSBgKTtcclxuICAgICAgICAgICAgbGFzdGxlbiA9IHJhbmdlS2V5Lmxlbmd0aDtcclxuICAgICAgICB9XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IG9mZnNldHNbMF07IGkgPCBvZmZzZXRzWzVdOyArK2kpIHtcclxuICAgICAgICAgICAgdmFyIGQgPSBEaXN0YW5jZS5jYWxjRGlzdGFuY2VBZGp1c3RlZChyYW5nZUtleSwga2V5c1tpXSk7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGAke3JhbmdlS2V5Lmxlbmd0aC1rZXlzW2ldLmxlbmd0aH0gJHtkfSAke3JhbmdlS2V5fSBhbmQgJHtrZXlzW2ldfSAgYCk7XHJcbiAgICAgICAgICAgIGlmICgoZCAhPT0gMS4wKSAmJiAoZCA+PSBBbGdvbC5DdXRvZmZfcmFuZ2VDbG9zZU1hdGNoKSkge1xyXG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhgd291bGQgYWRkICR7cmFuZ2VLZXl9IGZvciAke2tleXNbaV19ICR7ZH1gKTtcclxuICAgICAgICAgICAgICAgIHZhciBjbnQgPSBydWxlcy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAvLyB3ZSBvbmx5IGhhdmUgdG8gYWRkIGlmIHRoZXJlIGlzIG5vdCB5ZXQgYSBtYXRjaCBydWxlIGhlcmUgd2hpY2ggcG9pbnRzIHRvIHRoZSBzYW1lXHJcbiAgICAgICAgICAgICAgICBhZGRSYW5nZVJ1bGVzVW5sZXNzUHJlc2VudChydWxlcywga2V5c1tpXSwgcmFuZ2VLZXlzTWFwW3JhbmdlS2V5XSwga2V5c01hcFtrZXlzW2ldXSwgc2VlblJ1bGVzKTtcclxuICAgICAgICAgICAgICAgIGlmIChydWxlcy5sZW5ndGggPiBjbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKGAgYWRkZWQgJHsocnVsZXMubGVuZ3RoIC0gY250KX0gcmVjb3JkcyBhdCR7cmFuZ2VLZXl9IGZvciAke2tleXNbaV19ICR7ZH1gKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICAgIC8qXHJcbiAgICBbXHJcbiAgICAgICAgWydhRUZHJywnYUVGR0gnXSxcclxuICAgICAgICBbJ2FFRkdIJywnYUVGR0hJJ10sXHJcbiAgICAgICAgWydPZGF0YScsJ09EYXRhcyddLFxyXG4gICBbJ09kYXRhJywnT2RhdGFzJ10sXHJcbiAgIFsnT2RhdGEnLCdPZGF0YiddLFxyXG4gICBbJ09kYXRhJywnVURhdGEnXSxcclxuICAgWydzZXJ2aWNlJywnc2VydmljZXMnXSxcclxuICAgWyd0aGlzIGlzZnVubnkgYW5kIG1vcmUnLCd0aGlzIGlzZnVubnkgYW5kIG1vcmVzJ10sXHJcbiAgICBdLmZvckVhY2gocmVjID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgZGlzdGFuY2UgJHtyZWNbMF19ICR7cmVjWzFdfSA6ICR7RGlzdGFuY2UuY2FsY0Rpc3RhbmNlKHJlY1swXSxyZWNbMV0pfSAgYWRmICR7RGlzdGFuY2UuY2FsY0Rpc3RhbmNlQWRqdXN0ZWQocmVjWzBdLHJlY1sxXSl9IGApO1xyXG5cclxuICAgIH0pO1xyXG4gICAgY29uc29sZS5sb2coXCJkaXN0YW5jZSBPZGF0YSBVZGF0YVwiKyBEaXN0YW5jZS5jYWxjRGlzdGFuY2UoJ09EYXRhJywnVURhdGEnKSk7XHJcbiAgICBjb25zb2xlLmxvZyhcImRpc3RhbmNlIE9kYXRhIE9kYXRiXCIrIERpc3RhbmNlLmNhbGNEaXN0YW5jZSgnT0RhdGEnLCdPRGF0YicpKTtcclxuICAgIGNvbnNvbGUubG9nKFwiZGlzdGFuY2UgT2RhdGFzIE9kYXRhXCIrIERpc3RhbmNlLmNhbGNEaXN0YW5jZSgnT0RhdGEnLCdPRGF0YWEnKSk7XHJcbiAgICBjb25zb2xlLmxvZyhcImRpc3RhbmNlIE9kYXRhcyBhYmNkZVwiKyBEaXN0YW5jZS5jYWxjRGlzdGFuY2UoJ2FiY2RlJywnYWJjZGVmJykpO1xyXG4gICAgY29uc29sZS5sb2coXCJkaXN0YW5jZSBzZXJ2aWNlcyBcIisgRGlzdGFuY2UuY2FsY0Rpc3RhbmNlKCdzZXJ2aWNlcycsJ3NlcnZpY2UnKSk7XHJcbiAgICAqL1xyXG59XHJcbnZhciBuID0gMDtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVhZEZpbGxlcnMobW9uZ29vc2UgOiBtb25nb29zZS5Nb25nb29zZSwgb01vZGVsIDogSU1hdGNoLklNb2RlbHMpICA6IFByb21pc2U8YW55PiB7XHJcbiAgICB2YXIgZmlsbGVyQml0SW5kZXggPSBnZXREb21haW5CaXRJbmRleCgnbWV0YScsIG9Nb2RlbCk7XHJcbiAgICB2YXIgYml0SW5kZXhBbGxEb21haW5zID0gZ2V0QWxsRG9tYWluc0JpdEluZGV4KG9Nb2RlbCk7XHJcbiAgICByZXR1cm4gU2NoZW1hbG9hZC5nZXRGaWxsZXJzRnJvbURCKG1vbmdvb3NlKS50aGVuKFxyXG4gICAgICAgIChmaWxsZXJzT2JqKSA9PiBmaWxsZXJzT2JqLmZpbGxlcnNcclxuICAgICkudGhlbigoZmlsbGVyczogc3RyaW5nW10pID0+IHtcclxuICAgICAgICAvLyAgZmlsbGVyc3JlYWRGaWxlQXNKU09OKCcuLycgKyBtb2RlbFBhdGggKyAnL2ZpbGxlci5qc29uJyk7XHJcbiAgICAgICAgLypcclxuICAgICAgICB2YXIgcmUgPSBcIl4oKFwiICsgZmlsbGVycy5qb2luKFwiKXwoXCIpICsgXCIpKSRcIjtcclxuICAgICAgICBvTW9kZWwubVJ1bGVzLnB1c2goe1xyXG4gICAgICAgICAgICBjYXRlZ29yeTogXCJmaWxsZXJcIixcclxuICAgICAgICAgICAgdHlwZTogSU1hdGNoLkVudW1SdWxlVHlwZS5SRUdFWFAsXHJcbiAgICAgICAgICAgIHJlZ2V4cDogbmV3IFJlZ0V4cChyZSwgXCJpXCIpLFxyXG4gICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBcImZpbGxlclwiLFxyXG4gICAgICAgICAgICBiaXRpbmRleDogZmlsbGVyQml0SW5kZXgsXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiAwLjlcclxuICAgICAgICB9KTtcclxuICAgICAgICAqL1xyXG4gICAgICAgIGlmICghXy5pc0FycmF5KGZpbGxlcnMpKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignZXhwZWN0IGZpbGxlcnMgdG8gYmUgYW4gYXJyYXkgb2Ygc3RyaW5ncycpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmaWxsZXJzLmZvckVhY2goZmlsbGVyID0+IHtcclxuICAgICAgICAgICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCB7XHJcbiAgICAgICAgICAgICAgICBjYXRlZ29yeTogXCJmaWxsZXJcIixcclxuICAgICAgICAgICAgICAgIHR5cGU6IElNYXRjaC5FbnVtUnVsZVR5cGUuV09SRCxcclxuICAgICAgICAgICAgICAgIHdvcmQ6IGZpbGxlcixcclxuICAgICAgICAgICAgICAgIGxvd2VyY2FzZXdvcmQ6IGZpbGxlci50b0xvd2VyQ2FzZSgpLFxyXG4gICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogZmlsbGVyLCAvL1wiZmlsbGVyXCIsXHJcbiAgICAgICAgICAgICAgICBleGFjdE9ubHk6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBiaXRpbmRleDogZmlsbGVyQml0SW5kZXgsXHJcbiAgICAgICAgICAgICAgICBiaXRTZW50ZW5jZUFuZDogYml0SW5kZXhBbGxEb21haW5zLFxyXG4gICAgICAgICAgICAgICAgd29yZFR5cGU6IElNYXRjaC5XT1JEVFlQRS5GSUxMRVIsXHJcbiAgICAgICAgICAgICAgICBfcmFua2luZzogMC45XHJcbiAgICAgICAgICAgIH0sIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRPcGVyYXRvcnMobW9uZ29vc2U6IG1vbmdvb3NlLk1vbmdvb3NlLCBvTW9kZWw6IElNYXRjaC5JTW9kZWxzKSA6IFByb21pc2U8YW55PiB7XHJcbiAgICAgICAgZGVidWdsb2coJ3JlYWRpbmcgb3BlcmF0b3JzJyk7XHJcbiAgICAgICAgLy9hZGQgb3BlcmF0b3JzXHJcbiAgICByZXR1cm4gU2NoZW1hbG9hZC5nZXRPcGVyYXRvcnNGcm9tREIobW9uZ29vc2UpLnRoZW4oXHJcbiAgICAgICAgKG9wZXJhdG9yczogYW55KSA9PiB7XHJcbiAgICAgICAgdmFyIG9wZXJhdG9yQml0SW5kZXggPSBnZXREb21haW5CaXRJbmRleCgnb3BlcmF0b3JzJywgb01vZGVsKTtcclxuICAgICAgICB2YXIgYml0SW5kZXhBbGxEb21haW5zID0gZ2V0QWxsRG9tYWluc0JpdEluZGV4KG9Nb2RlbCk7XHJcbiAgICAgICAgT2JqZWN0LmtleXMob3BlcmF0b3JzLm9wZXJhdG9ycykuZm9yRWFjaChmdW5jdGlvbiAob3BlcmF0b3IpIHtcclxuICAgICAgICAgICAgaWYgKElNYXRjaC5hT3BlcmF0b3JOYW1lcy5pbmRleE9mKG9wZXJhdG9yKSA8IDApIHtcclxuICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwidW5rbm93biBvcGVyYXRvciBcIiArIG9wZXJhdG9yKTtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInVua25vd24gb3BlcmF0b3IgXCIgKyBvcGVyYXRvciArICcgKGFkZCB0byBpZm1hdGNoLnRzICBhT3BlcmF0b3JOYW1lcyknKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvTW9kZWwub3BlcmF0b3JzW29wZXJhdG9yXSA9IG9wZXJhdG9ycy5vcGVyYXRvcnNbb3BlcmF0b3JdO1xyXG4gICAgICAgICAgICBvTW9kZWwub3BlcmF0b3JzW29wZXJhdG9yXS5vcGVyYXRvciA9IDxJTWF0Y2guT3BlcmF0b3JOYW1lPm9wZXJhdG9yO1xyXG4gICAgICAgICAgICBPYmplY3QuZnJlZXplKG9Nb2RlbC5vcGVyYXRvcnNbb3BlcmF0b3JdKTtcclxuICAgICAgICAgICAgdmFyIHdvcmQgPSBvcGVyYXRvcjtcclxuICAgICAgICAgICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCB7XHJcbiAgICAgICAgICAgICAgICBjYXRlZ29yeTogXCJvcGVyYXRvclwiLFxyXG4gICAgICAgICAgICAgICAgd29yZDogd29yZC50b0xvd2VyQ2FzZSgpLFxyXG4gICAgICAgICAgICAgICAgbG93ZXJjYXNld29yZDogd29yZC50b0xvd2VyQ2FzZSgpLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogSU1hdGNoLkVudW1SdWxlVHlwZS5XT1JELFxyXG4gICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogd29yZCxcclxuICAgICAgICAgICAgICAgIGJpdGluZGV4OiBvcGVyYXRvckJpdEluZGV4LFxyXG4gICAgICAgICAgICAgICAgYml0U2VudGVuY2VBbmQ6IGJpdEluZGV4QWxsRG9tYWlucyxcclxuICAgICAgICAgICAgICAgIHdvcmRUeXBlOiBJTWF0Y2guV09SRFRZUEUuT1BFUkFUT1IsXHJcbiAgICAgICAgICAgICAgICBfcmFua2luZzogMC45XHJcbiAgICAgICAgICAgIH0sIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG4gICAgICAgICAgICAvLyBhZGQgYWxsIHN5bm9ueW1zXHJcbiAgICAgICAgICAgIGlmIChvcGVyYXRvcnMuc3lub255bXNbb3BlcmF0b3JdKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgYXJyID0gb3BlcmF0b3JzLnN5bm9ueW1zW29wZXJhdG9yXTtcclxuICAgICAgICAgICAgICAgIGlmICggYXJyIClcclxuICAgICAgICAgICAgICAgIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYoIEFycmF5LmlzQXJyYXkoYXJyKSlcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyci5mb3JFYWNoKGZ1bmN0aW9uIChzeW5vbnltKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG9Nb2RlbC5tUnVsZXMsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogXCJvcGVyYXRvclwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmQ6IHN5bm9ueW0udG9Mb3dlckNhc2UoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb3dlcmNhc2V3b3JkOiBzeW5vbnltLnRvTG93ZXJDYXNlKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogSU1hdGNoLkVudW1SdWxlVHlwZS5XT1JELFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9wZXJhdG9yLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJpdGluZGV4OiBvcGVyYXRvckJpdEluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJpdFNlbnRlbmNlQW5kOiBiaXRJbmRleEFsbERvbWFpbnMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29yZFR5cGU6IElNYXRjaC5XT1JEVFlQRS5PUEVSQVRPUixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogMC45XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkV4cGV0ZWQgb3BlcmF0b3Igc3lub255bSB0byBiZSBhcnJheSBcIiArIG9wZXJhdG9yICsgXCIgaXMgXCIgKyBKU09OLnN0cmluZ2lmeShhcnIpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWxlYXNlTW9kZWwobW9kZWwgOiBJTWF0Y2guSU1vZGVscykge1xyXG4gICAgaWYobW9kZWwubW9uZ29IYW5kbGUgJiYgbW9kZWwubW9uZ29IYW5kbGUubW9uZ29vc2UpIHtcclxuICAgICAgICBNb25nb1V0aWxzLmRpc2Nvbm5lY3QobW9kZWwubW9uZ29IYW5kbGUubW9uZ29vc2UpO1xyXG4gICAgfVxyXG59XHJcbi8qXHJcbmV4cG9ydCBmdW5jdGlvbiBsb2FkTW9kZWxIYW5kbGVQKG1vbmdvb3NlSG5kbCA6IG1vbmdvb3NlLk1vbmdvb3NlLCBtb2RlbFBhdGg6IHN0cmluZywgY29ubmVjdGlvblN0cmluZz8gOiBzdHJpbmcpIDogUHJvbWlzZTxJTWF0Y2guSU1vZGVscz4ge1xyXG4gICAgdmFyIG1vbmdvb3NlWCA9IG1vbmdvb3NlSG5kbCB8fCBtb25nb29zZTtcclxuIC8vICAgaWYocHJvY2Vzcy5lbnYuTU9OR09fUkVQTEFZKSB7XHJcbiAvLyAgICAgICAgbW9uZ29vc2VYID0gbW9uZ29vc2VNb2NrLm1vbmdvb3NlTW9jayBhcyBhbnk7XHJcbiAvLyAgICB9XHJcbiAgICB2YXIgY29ublN0ciA9IGNvbm5lY3Rpb25TdHJpbmcgfHwgJ21vbmdvZGI6Ly9sb2NhbGhvc3QvdGVzdGRiJztcclxuICAgIHJldHVybiBNb25nb1V0aWxzLm9wZW5Nb25nb29zZShtb25nb29zZVgsIGNvbm5TdHIpLnRoZW4oXHJcbiAgICAgICAgKCkgPT4gZ2V0TW9uZ29IYW5kbGUobW9uZ29vc2VYKVxyXG4gICAgKS50aGVuKCAobW9kZWxIYW5kbGUgOiBJTWF0Y2guSU1vZGVsSGFuZGxlUmF3KSA9PiBsb2FkTW9kZWxzRnVsbChtb2RlbEhhbmRsZSwgbW9kZWxQYXRoKSk7XHJcbn07XHJcbiovXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbG9hZE1vZGVsc09wZW5pbmdDb25uZWN0aW9uKG1vbmdvb3NlSG5kbDogbW9uZ29vc2UuTW9uZ29vc2UsIGNvbm5lY3Rpb25TdHJpbmc/IDogc3RyaW5nLCAgbW9kZWxQYXRoPyA6IHN0cmluZykgOiBQcm9taXNlPElNYXRjaC5JTW9kZWxzPiB7XHJcbiAgdmFyIG1vbmdvb3NlWCA9IG1vbmdvb3NlSG5kbCB8fCBtb25nb29zZTtcclxuIC8vICAgaWYocHJvY2Vzcy5lbnYuTU9OR09fUkVQTEFZKSB7XHJcbiAvLyAgICAgICAgbW9uZ29vc2VYID0gbW9uZ29vc2VNb2NrLm1vbmdvb3NlTW9jayBhcyBhbnk7XHJcbiAvLyAgICB9XHJcbiAgICBjb25zb2xlLmxvZyhcIiBleHBsaWNpdCBjb25uZWN0aW9uIHN0cmluZyBcIiArIGNvbm5lY3Rpb25TdHJpbmcpO1xyXG4gICAgdmFyIGNvbm5TdHIgPSBjb25uZWN0aW9uU3RyaW5nIHx8ICdtb25nb2RiOi8vbG9jYWxob3N0L3Rlc3RkYic7XHJcbiAgICByZXR1cm4gTW9uZ29VdGlscy5vcGVuTW9uZ29vc2UobW9uZ29vc2VYLCBjb25uU3RyKS50aGVuKFxyXG4gICAgICAgICgpPT5cclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJldHVybiBsb2FkTW9kZWxzKG1vbmdvb3NlWCwgbW9kZWxQYXRoKTtcclxuICAgICAgICB9XHJcbiAgICApO1xyXG59XHJcblxyXG4vKipcclxuICogZXhwZWN0cyBhbiBvcGVuIGNvbm5lY3Rpb24hXHJcbiAqIEBwYXJhbSBtb25nb29zZVxyXG4gKiBAcGFyYW0gbW9kZWxQYXRoXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbG9hZE1vZGVscyhtb25nb29zZTogbW9uZ29vc2UuTW9uZ29vc2UsIG1vZGVsUGF0aCA6IHN0cmluZykgOiBQcm9taXNlPElNYXRjaC5JTW9kZWxzPiB7XHJcbiAgICBpZihtb25nb29zZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdleHBlY3QgYSBtb25nb29zZSBoYW5kbGUgdG8gYmUgcGFzc2VkJyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZ2V0TW9uZ29IYW5kbGUobW9uZ29vc2UpLnRoZW4oIChtb2RlbEhhbmRsZSkgPT57XHJcbiAgICAgICAgZGVidWdsb2coYGdvdCBhIG1vbmdvIGhhbmRsZSBmb3IgJHttb2RlbFBhdGh9YCk7XHJcbiAgICAgICAgcmV0dXJuIF9sb2FkTW9kZWxzRnVsbChtb2RlbEhhbmRsZSwgbW9kZWxQYXRoKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2xvYWRNb2RlbHNGdWxsKG1vZGVsSGFuZGxlOiBJTWF0Y2guSU1vZGVsSGFuZGxlUmF3LCBtb2RlbFBhdGg/OiBzdHJpbmcpOiBQcm9taXNlPElNYXRjaC5JTW9kZWxzPiB7XHJcbiAgICB2YXIgb01vZGVsOiBJTWF0Y2guSU1vZGVscztcclxuICAgIG1vZGVsUGF0aCA9IG1vZGVsUGF0aCB8fCBlbnZNb2RlbFBhdGg7XHJcbiAgICBtb2RlbEhhbmRsZSA9IG1vZGVsSGFuZGxlIHx8IHtcclxuICAgICAgICBtb25nb29zZTogdW5kZWZpbmVkLFxyXG4gICAgICAgIG1vZGVsRG9jczoge30sXHJcbiAgICAgICAgbW9uZ29NYXBzOiB7fSxcclxuICAgICAgICBtb2RlbEVTY2hlbWFzOiB7fVxyXG4gICAgfTtcclxuICAgIG9Nb2RlbCA9IHtcclxuICAgICAgICBtb25nb0hhbmRsZSA6IG1vZGVsSGFuZGxlLFxyXG4gICAgICAgIGZ1bGw6IHsgZG9tYWluOiB7fSB9LFxyXG4gICAgICAgIHJhd01vZGVsczoge30sXHJcbiAgICAgICAgZG9tYWluczogW10sXHJcbiAgICAgICAgcnVsZXM6IHVuZGVmaW5lZCxcclxuICAgICAgICBjYXRlZ29yeTogW10sXHJcbiAgICAgICAgb3BlcmF0b3JzOiB7fSxcclxuICAgICAgICBtUnVsZXM6IFtdLFxyXG4gICAgICAgIHNlZW5SdWxlczoge30sXHJcbiAgICAgICAgbWV0YTogeyB0Mzoge30gfVxyXG4gICAgfVxyXG4gICAgdmFyIHQgPSBEYXRlLm5vdygpO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgICAgZGVidWdsb2coKCk9PiAnaGVyZSBtb2RlbCBwYXRoJyArIG1vZGVsUGF0aCk7XHJcbiAgICAgICAgdmFyIGEgPSBDaXJjdWxhclNlci5sb2FkKG1vZGVsUGF0aCArICcvX2NhY2hlLmpzJyk7XHJcbiAgICAgICAgLy8gVE9ET1xyXG4gICAgICAgIC8vY29uc29sZS5sb2coXCJmb3VuZCBhIGNhY2hlID8gIFwiICsgISFhKTtcclxuICAgICAgICAvL2EgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgaWYgKGEgJiYgIXByb2Nlc3MuZW52Lk1HTkxRX01PREVMX05PX0ZJTEVDQUNIRSkge1xyXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdyZXR1cm4gcHJlcHMnICsgbW9kZWxQYXRoKTtcclxuICAgICAgICAgICAgZGVidWdsb2coXCJcXG4gcmV0dXJuIHByZXBhcmVkIG1vZGVsICEhXCIpO1xyXG4gICAgICAgICAgICBpZiAocHJvY2Vzcy5lbnYuQUJPVF9FTUFJTF9VU0VSKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImxvYWRlZCBtb2RlbHMgZnJvbSBjYWNoZSBpbiBcIiArIChEYXRlLm5vdygpIC0gdCkgKyBcIiBcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIHJlcyA9IGEgYXMgSU1hdGNoLklNb2RlbHM7XHJcbiAgICAgICAgICAgIHJlcy5tb25nb0hhbmRsZS5tb25nb29zZSAgPSBtb2RlbEhhbmRsZS5tb25nb29zZTtcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXMpO1xyXG4gICAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAvL2NvbnNvbGUubG9nKCdlcnJvcicgKyBlKTtcclxuICAgICAgICAvLyBubyBjYWNoZSBmaWxlLFxyXG4gICAgfVxyXG4gICAgdmFyIG1kbHMgPSBPYmplY3Qua2V5cyhtb2RlbEhhbmRsZS5tb2RlbERvY3MpLnNvcnQoKTtcclxuICAgIHZhciBzZWVuRG9tYWlucyA9e307XHJcbiAgICBtZGxzLmZvckVhY2goKG1vZGVsTmFtZSxpbmRleCkgPT4ge1xyXG4gICAgICAgIHZhciBkb21haW4gPSBtb2RlbEhhbmRsZS5tb2RlbERvY3NbbW9kZWxOYW1lXS5kb21haW47XHJcbiAgICAgICAgaWYoc2VlbkRvbWFpbnNbZG9tYWluXSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RvbWFpbiAnICsgZG9tYWluICsgJyBhbHJlYWR5IGxvYWRlZCB3aGlsZSBsb2FkaW5nICcgKyBtb2RlbE5hbWUgKyAnPycpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzZWVuRG9tYWluc1tkb21haW5dID0gaW5kZXg7XHJcbiAgICB9KVxyXG4gICAgb01vZGVsLmRvbWFpbnMgPSBtZGxzLm1hcChtb2RlbE5hbWUgPT4gbW9kZWxIYW5kbGUubW9kZWxEb2NzW21vZGVsTmFtZV0uZG9tYWluKTtcclxuICAgIC8vIGNyZWF0ZSBiaXRpbmRleCBpbiBvcmRlciAhXHJcbiAgICBkZWJ1Z2xvZygnZ290IGRvbWFpbnMgJyArIG1kbHMuam9pbihcIlxcblwiKSk7XHJcbiAgICBkZWJ1Z2xvZygnbG9hZGluZyBtb2RlbHMgJyArIG1kbHMuam9pbihcIlxcblwiKSk7XHJcblxyXG4gICAgcmV0dXJuIFByb21pc2UuYWxsKG1kbHMubWFwKChzTW9kZWxOYW1lKSA9PlxyXG4gICAgICAgIGxvYWRNb2RlbChtb2RlbEhhbmRsZSwgc01vZGVsTmFtZSwgb01vZGVsKSlcclxuICAgICkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgdmFyIG1ldGFCaXRJbmRleCA9IGdldERvbWFpbkJpdEluZGV4KCdtZXRhJywgb01vZGVsKTtcclxuICAgICAgICB2YXIgYml0SW5kZXhBbGxEb21haW5zID0gZ2V0QWxsRG9tYWluc0JpdEluZGV4KG9Nb2RlbCk7XHJcblxyXG4gICAgICAgIC8vIGFkZCB0aGUgZG9tYWluIG1ldGEgcnVsZVxyXG4gICAgICAgIGluc2VydFJ1bGVJZk5vdFByZXNlbnQob01vZGVsLm1SdWxlcywge1xyXG4gICAgICAgICAgICBjYXRlZ29yeTogXCJtZXRhXCIsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IFwiZG9tYWluXCIsXHJcbiAgICAgICAgICAgIHR5cGU6IElNYXRjaC5FbnVtUnVsZVR5cGUuV09SRCxcclxuICAgICAgICAgICAgd29yZDogXCJkb21haW5cIixcclxuICAgICAgICAgICAgYml0aW5kZXg6IG1ldGFCaXRJbmRleCxcclxuICAgICAgICAgICAgd29yZFR5cGU6IElNYXRjaC5XT1JEVFlQRS5NRVRBLFxyXG4gICAgICAgICAgICBiaXRTZW50ZW5jZUFuZDogYml0SW5kZXhBbGxEb21haW5zLFxyXG4gICAgICAgICAgICBfcmFua2luZzogMC45NVxyXG4gICAgICAgIH0sIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG4gICAgICAgIC8vIGluc2VydCB0aGUgTnVtYmVycyBydWxlc1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCcgYWRkIG51bWJlcnMgcnVsZScpO1xyXG4gICAgICAgIGluc2VydFJ1bGVJZk5vdFByZXNlbnQob01vZGVsLm1SdWxlcywge1xyXG4gICAgICAgICAgICBjYXRlZ29yeTogXCJudW1iZXJcIixcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogXCJvbmVcIixcclxuICAgICAgICAgICAgdHlwZTogSU1hdGNoLkVudW1SdWxlVHlwZS5SRUdFWFAsXHJcbiAgICAgICAgICAgIHJlZ2V4cCA6IC9eKChcXGQrKXwob25lKXwodHdvKXwodGhyZWUpKSQvLFxyXG4gICAgICAgICAgICBtYXRjaEluZGV4IDogMCxcclxuICAgICAgICAgICAgd29yZDogXCI8bnVtYmVyPlwiLFxyXG4gICAgICAgICAgICBiaXRpbmRleDogbWV0YUJpdEluZGV4LFxyXG4gICAgICAgICAgICB3b3JkVHlwZTogSU1hdGNoLldPUkRUWVBFLk5VTUVSSUNBUkcsIC8vIG51bWJlclxyXG4gICAgICAgICAgICBiaXRTZW50ZW5jZUFuZDogYml0SW5kZXhBbGxEb21haW5zLFxyXG4gICAgICAgICAgICBfcmFua2luZzogMC45NVxyXG4gICAgICAgIH0sIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG5cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgICkudGhlbiggKCk9PlxyXG4gICAgICAgIHJlYWRGaWxsZXJzKG1vZGVsSGFuZGxlLm1vbmdvb3NlLCBvTW9kZWwpXHJcbiAgICApLnRoZW4oICgpID0+XHJcbiAgICAgICAgcmVhZE9wZXJhdG9ycyhtb2RlbEhhbmRsZS5tb25nb29zZSwgb01vZGVsKVxyXG4gICAgKS50aGVuKCAoKSA9PiB7XHJcbiAgICAgICAgLypcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBjYXRlZ29yeTogXCJmaWxsZXJcIixcclxuICAgICAgICAgICAgICB0eXBlOiAxLFxyXG4gICAgICAgICAgICAgIHJlZ2V4cDogL14oKHN0YXJ0KXwoc2hvdyl8KGZyb20pfChpbikpJC9pLFxyXG4gICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IFwiZmlsbGVyXCIsXHJcbiAgICAgICAgICAgICAgX3Jhbmtpbmc6IDAuOVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICovXHJcbiAgICAgICAgZGVidWdsb2coJ3NhdmluZyBkYXRhIHRvICcgKyBtb2RlbFBhdGgpO1xyXG4gICAgICAgIG9Nb2RlbC5tUnVsZXMgPSBvTW9kZWwubVJ1bGVzLnNvcnQoSW5wdXRGaWx0ZXJSdWxlcy5jbXBNUnVsZSk7XHJcbiAgICAgICAgYWRkQ2xvc2VFeGFjdFJhbmdlUnVsZXMob01vZGVsLm1SdWxlcywgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgb01vZGVsLm1SdWxlcyA9IG9Nb2RlbC5tUnVsZXMuc29ydChJbnB1dEZpbHRlclJ1bGVzLmNtcE1SdWxlKTtcclxuICAgICAgICBvTW9kZWwubVJ1bGVzLnNvcnQoSW5wdXRGaWx0ZXJSdWxlcy5jbXBNUnVsZSk7XHJcbiAgICAgICAgLy9mcy53cml0ZUZpbGVTeW5jKFwicG9zdF9zb3J0XCIsIEpTT04uc3RyaW5naWZ5KG9Nb2RlbC5tUnVsZXMsdW5kZWZpbmVkLDIpKTtcclxuXHJcbiAgICAgICAgZm9yY2VHQygpO1xyXG4gICAgICAgIG9Nb2RlbC5ydWxlcyA9IHNwbGl0UnVsZXMob01vZGVsLm1SdWxlcyk7XHJcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhcInRlc3QxeC5qc29uXCIsIEpTT04uc3RyaW5naWZ5KG9Nb2RlbC5ydWxlcyx1bmRlZmluZWQsMikpO1xyXG4gICAgICAgIGZvcmNlR0MoKTtcclxuICAgICAgICBkZWxldGUgb01vZGVsLnNlZW5SdWxlcztcclxuICAgICAgICBkZWJ1Z2xvZygnc2F2aW5nJyk7XHJcbiAgICAgICAgZm9yY2VHQygpO1xyXG4gICAgICAgIHZhciBvTW9kZWxTZXIgPSBPYmplY3QuYXNzaWduKHt9LCBvTW9kZWwpO1xyXG4gICAgICAgIG9Nb2RlbFNlci5tb25nb0hhbmRsZSA9IE9iamVjdC5hc3NpZ24oe30sIG9Nb2RlbC5tb25nb0hhbmRsZSk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ2NyZWF0ZWQgZGlyMSAnICsgbW9kZWxQYXRoKTsgXHJcbiAgICAgICAgZGVsZXRlIG9Nb2RlbFNlci5tb25nb0hhbmRsZS5tb25nb29zZTtcclxuICAgICAgICB0cnkge1xyXG5cclxuICAgICAgICAgICAgYXNzdXJlRGlyRXhpc3RzKG1vZGVsUGF0aCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjcmVhdGVkIGRpciAnICsgbW9kZWxQYXRoKTtcclxuICAgICAgICAgICAgQ2lyY3VsYXJTZXIuc2F2ZShtb2RlbFBhdGggKyAnL19jYWNoZS5qcycsIG9Nb2RlbFNlcik7XHJcbiAgICAgICAgICAgIGZvcmNlR0MoKTtcclxuICAgICAgICAgICAgaWYgKHByb2Nlc3MuZW52LkFCT1RfRU1BSUxfVVNFUikge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJsb2FkZWQgbW9kZWxzIGJ5IGNhbGN1bGF0aW9uIGluIFwiICsgKERhdGUubm93KCkgLSB0KSArIFwiIFwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgcmVzID0gb01vZGVsO1xyXG4gICAgICAgICAgICAvLyAoT2JqZWN0IGFzIGFueSkuYXNzaWduKG1vZGVsSGFuZGxlLCB7IG1vZGVsOiBvTW9kZWwgfSkgYXMgSU1hdGNoLklNb2RlbEhhbmRsZTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlcztcclxuICAgICAgICB9IGNhdGNoKCBlcnIpIHtcclxuICAgICAgICAgICAgZGVidWdsb2coXCJcIiArIGVycik7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdlcnIgJyArIGVycik7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyciArICcgJyArIGVyci5zdGFjayk7XHJcbiAgICAgICAgICAgIHByb2Nlc3Muc3Rkb3V0Lm9uKCdkcmFpbicsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5leGl0KC0xKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignICcgKyBlcnIgICsgJyAnICsgZXJyLnN0YWNrKTtcclxuICAgICAgICB9XHJcbiAgICBcclxuICAgIH1cclxuICAgICkuY2F0Y2goIChlcnIpID0+IHtcclxuICAgICAgICBkZWJ1Z2xvZyhcIlwiICsgZXJyKTtcclxuICAgICAgICBjb25zb2xlLmxvZygnZXJyICcgKyBlcnIpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGVyciArICcgJyArIGVyci5zdGFjayk7XHJcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQub24oJ2RyYWluJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgtMSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCcgJyArIGVyciAgKyAnICcgKyBlcnIuc3RhY2spO1xyXG4gICAgfSkgYXMgUHJvbWlzZTxJTWF0Y2guSU1vZGVscz47XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzb3J0Q2F0ZWdvcmllc0J5SW1wb3J0YW5jZShtYXA6IHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklDYXRlZ29yeURlc2MgfSwgY2F0czogc3RyaW5nW10pOiBzdHJpbmdbXSB7XHJcbiAgICB2YXIgcmVzID0gY2F0cy5zbGljZSgwKTtcclxuICAgIHJlcy5zb3J0KHJhbmtDYXRlZ29yeUJ5SW1wb3J0YW5jZS5iaW5kKHVuZGVmaW5lZCwgbWFwKSk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmFua0NhdGVnb3J5QnlJbXBvcnRhbmNlKG1hcDogeyBba2V5OiBzdHJpbmddOiBJTWF0Y2guSUNhdGVnb3J5RGVzYyB9LCBjYXRhOiBzdHJpbmcsIGNhdGI6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgICB2YXIgY2F0QURlc2MgPSBtYXBbY2F0YV07XHJcbiAgICB2YXIgY2F0QkRlc2MgPSBtYXBbY2F0Yl07XHJcbiAgICBpZiAoY2F0YSA9PT0gY2F0Yikge1xyXG4gICAgICAgIHJldHVybiAwO1xyXG4gICAgfVxyXG4gICAgLy8gaWYgYSBpcyBiZWZvcmUgYiwgcmV0dXJuIC0xXHJcbiAgICBpZiAoY2F0QURlc2MgJiYgIWNhdEJEZXNjKSB7XHJcbiAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgfVxyXG4gICAgaWYgKCFjYXRBRGVzYyAmJiBjYXRCRGVzYykge1xyXG4gICAgICAgIHJldHVybiArMTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcHJpb0EgPSAoY2F0QURlc2MgJiYgY2F0QURlc2MuaW1wb3J0YW5jZSkgfHwgOTk7XHJcbiAgICB2YXIgcHJpb0IgPSAoY2F0QkRlc2MgJiYgY2F0QkRlc2MuaW1wb3J0YW5jZSkgfHwgOTk7XHJcbiAgICAvLyBsb3dlciBwcmlvIGdvZXMgdG8gZnJvbnRcclxuICAgIHZhciByID0gcHJpb0EgLSBwcmlvQjtcclxuICAgIGlmIChyKSB7XHJcbiAgICAgICAgcmV0dXJuIHI7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gY2F0YS5sb2NhbGVDb21wYXJlKGNhdGIpO1xyXG59XHJcblxyXG5jb25zdCBNZXRhRiA9IE1ldGEuZ2V0TWV0YUZhY3RvcnkoKTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRPcGVyYXRvcihtZGw6IElNYXRjaC5JTW9kZWxzLCBvcGVyYXRvcjogc3RyaW5nKTogSU1hdGNoLklPcGVyYXRvciB7XHJcbiAgICByZXR1cm4gbWRsLm9wZXJhdG9yc1tvcGVyYXRvcl07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRSZXN1bHRBc0FycmF5KG1kbDogSU1hdGNoLklNb2RlbHMsIGE6IE1ldGEuSU1ldGEsIHJlbDogTWV0YS5JTWV0YSk6IE1ldGEuSU1ldGFbXSB7XHJcbiAgICBpZiAocmVsLnRvVHlwZSgpICE9PSAncmVsYXRpb24nKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZXhwZWN0IHJlbGF0aW9uIGFzIDJuZCBhcmdcIik7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHJlcyA9IG1kbC5tZXRhLnQzW2EudG9GdWxsU3RyaW5nKCldICYmXHJcbiAgICAgICAgbWRsLm1ldGEudDNbYS50b0Z1bGxTdHJpbmcoKV1bcmVsLnRvRnVsbFN0cmluZygpXTtcclxuICAgIGlmICghcmVzKSB7XHJcbiAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHJlcykuc29ydCgpLm1hcChNZXRhRi5wYXJzZUlNZXRhKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrRG9tYWluUHJlc2VudCh0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMsIGRvbWFpbjogc3RyaW5nKSB7XHJcbiAgICBpZiAodGhlTW9kZWwuZG9tYWlucy5pbmRleE9mKGRvbWFpbikgPCAwKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRG9tYWluIFxcXCJcIiArIGRvbWFpbiArIFwiXFxcIiBub3QgcGFydCBvZiBtb2RlbFwiKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFNob3dVUklDYXRlZ29yaWVzRm9yRG9tYWluKHRoZU1vZGVsIDogSU1hdGNoLklNb2RlbHMsIGRvbWFpbiA6IHN0cmluZykgOiBzdHJpbmdbXSB7XHJcbiAgICBjaGVja0RvbWFpblByZXNlbnQodGhlTW9kZWwsIGRvbWFpbik7XHJcbiAgICB2YXIgbW9kZWxOYW1lID0gZ2V0TW9kZWxOYW1lRm9yRG9tYWluKHRoZU1vZGVsLm1vbmdvSGFuZGxlLGRvbWFpbik7XHJcbiAgICB2YXIgYWxsY2F0cyA9IGdldFJlc3VsdEFzQXJyYXkodGhlTW9kZWwsIE1ldGFGLkRvbWFpbihkb21haW4pLCBNZXRhRi5SZWxhdGlvbihNZXRhLlJFTEFUSU9OX2hhc0NhdGVnb3J5KSk7XHJcbiAgICB2YXIgZG9jID0gdGhlTW9kZWwubW9uZ29IYW5kbGUubW9kZWxEb2NzW21vZGVsTmFtZV07XHJcbiAgICB2YXIgcmVzID0gZG9jLl9jYXRlZ29yaWVzLmZpbHRlciggY2F0ID0+IGNhdC5zaG93VVJJICkubWFwKGNhdCA9PiBjYXQuY2F0ZWdvcnkpO1xyXG4gICAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFNob3dVUklSYW5rQ2F0ZWdvcmllc0ZvckRvbWFpbih0aGVNb2RlbCA6IElNYXRjaC5JTW9kZWxzLCBkb21haW4gOiBzdHJpbmcpIDogc3RyaW5nW10ge1xyXG4gICAgY2hlY2tEb21haW5QcmVzZW50KHRoZU1vZGVsLCBkb21haW4pO1xyXG4gICAgdmFyIG1vZGVsTmFtZSA9IGdldE1vZGVsTmFtZUZvckRvbWFpbih0aGVNb2RlbC5tb25nb0hhbmRsZSxkb21haW4pO1xyXG4gICAgdmFyIGFsbGNhdHMgPSBnZXRSZXN1bHRBc0FycmF5KHRoZU1vZGVsLCBNZXRhRi5Eb21haW4oZG9tYWluKSwgTWV0YUYuUmVsYXRpb24oTWV0YS5SRUxBVElPTl9oYXNDYXRlZ29yeSkpO1xyXG4gICAgdmFyIGRvYyA9IHRoZU1vZGVsLm1vbmdvSGFuZGxlLm1vZGVsRG9jc1ttb2RlbE5hbWVdO1xyXG4gICAgdmFyIHJlcyA9IGRvYy5fY2F0ZWdvcmllcy5maWx0ZXIoIGNhdCA9PiBjYXQuc2hvd1VSSVJhbmsgKS5tYXAoY2F0ID0+IGNhdC5jYXRlZ29yeSk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2F0ZWdvcmllc0ZvckRvbWFpbih0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMsIGRvbWFpbjogc3RyaW5nKTogc3RyaW5nW10ge1xyXG4gICAgY2hlY2tEb21haW5QcmVzZW50KHRoZU1vZGVsLCBkb21haW4pO1xyXG4gICAgdmFyIHJlcyA9IGdldFJlc3VsdEFzQXJyYXkodGhlTW9kZWwsIE1ldGFGLkRvbWFpbihkb21haW4pLCBNZXRhRi5SZWxhdGlvbihNZXRhLlJFTEFUSU9OX2hhc0NhdGVnb3J5KSk7XHJcbiAgICByZXR1cm4gTWV0YS5nZXRTdHJpbmdBcnJheShyZXMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGFibGVDb2x1bW5zKHRoZU1vZGVsOiBJTWF0Y2guSU1vZGVscywgZG9tYWluOiBzdHJpbmcpOiBzdHJpbmdbXSB7XHJcbiAgICBjaGVja0RvbWFpblByZXNlbnQodGhlTW9kZWwsIGRvbWFpbik7XHJcbiAgICByZXR1cm4gdGhlTW9kZWwucmF3TW9kZWxzW2RvbWFpbl0uY29sdW1ucy5zbGljZSgwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZm9yY2VHQygpIHtcclxuICAgIGlmIChnbG9iYWwgJiYgZ2xvYmFsLmdjKSB7XHJcbiAgICAgICAgZ2xvYmFsLmdjKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXR1cm4gYWxsIGNhdGVnb3JpZXMgb2YgYSBkb21haW4gd2hpY2ggY2FuIGFwcGVhciBvbiBhIHdvcmQsXHJcbiAqIHRoZXNlIGFyZSB0eXBpY2FsbHkgdGhlIHdvcmRpbmRleCBkb21haW5zICsgZW50cmllcyBnZW5lcmF0ZWQgYnkgZ2VuZXJpYyBydWxlc1xyXG4gKlxyXG4gKiBUaGUgY3VycmVudCBpbXBsZW1lbnRhdGlvbiBpcyBhIHNpbXBsaWZpY2F0aW9uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0UG90ZW50aWFsV29yZENhdGVnb3JpZXNGb3JEb21haW4odGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzLCBkb21haW46IHN0cmluZyk6IHN0cmluZ1tdIHtcclxuICAgIC8vIHRoaXMgaXMgYSBzaW1wbGlmaWVkIHZlcnNpb25cclxuICAgIHJldHVybiBnZXRDYXRlZ29yaWVzRm9yRG9tYWluKHRoZU1vZGVsLCBkb21haW4pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RG9tYWluc0ZvckNhdGVnb3J5KHRoZU1vZGVsOiBJTWF0Y2guSU1vZGVscywgY2F0ZWdvcnk6IHN0cmluZyk6IHN0cmluZ1tdIHtcclxuICAgIGlmICh0aGVNb2RlbC5jYXRlZ29yeS5pbmRleE9mKGNhdGVnb3J5KSA8IDApIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYXRlZ29yeSBcXFwiXCIgKyBjYXRlZ29yeSArIFwiXFxcIiBub3QgcGFydCBvZiBtb2RlbFwiKTtcclxuICAgIH1cclxuICAgIHZhciByZXMgPSBnZXRSZXN1bHRBc0FycmF5KHRoZU1vZGVsLCBNZXRhRi5DYXRlZ29yeShjYXRlZ29yeSksIE1ldGFGLlJlbGF0aW9uKE1ldGEuUkVMQVRJT05faXNDYXRlZ29yeU9mKSk7XHJcbiAgICByZXR1cm4gTWV0YS5nZXRTdHJpbmdBcnJheShyZXMpO1xyXG59XHJcblxyXG4vKlxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWxsUmVjb3JkQ2F0ZWdvcmllc0ZvclRhcmdldENhdGVnb3J5KG1vZGVsOiBJTWF0Y2guSU1vZGVscywgY2F0ZWdvcnk6IHN0cmluZywgd29yZHNvbmx5OiBib29sZWFuKTogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0ge1xyXG4gICAgdmFyIHJlcyA9IHt9O1xyXG4gICAgLy9cclxuICAgIHZhciBmbiA9IHdvcmRzb25seSA/IGdldFBvdGVudGlhbFdvcmRDYXRlZ29yaWVzRm9yRG9tYWluIDogZ2V0Q2F0ZWdvcmllc0ZvckRvbWFpbjtcclxuICAgIHZhciBkb21haW5zID0gZ2V0RG9tYWluc0ZvckNhdGVnb3J5KG1vZGVsLCBjYXRlZ29yeSk7XHJcbiAgICBkb21haW5zLmZvckVhY2goZnVuY3Rpb24gKGRvbWFpbikge1xyXG4gICAgICAgIGZuKG1vZGVsLCBkb21haW4pLmZvckVhY2goZnVuY3Rpb24gKHdvcmRjYXQpIHtcclxuICAgICAgICAgICAgcmVzW3dvcmRjYXRdID0gdHJ1ZTtcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG4gICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xyXG4gICAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEFsbFJlY29yZENhdGVnb3JpZXNGb3JUYXJnZXRDYXRlZ29yaWVzKG1vZGVsOiBJTWF0Y2guSU1vZGVscywgY2F0ZWdvcmllczogc3RyaW5nW10sIHdvcmRzb25seTogYm9vbGVhbik6IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9IHtcclxuICAgIHZhciByZXMgPSB7fTtcclxuICAgIC8vXHJcbiAgICB2YXIgZm4gPSB3b3Jkc29ubHkgPyBnZXRQb3RlbnRpYWxXb3JkQ2F0ZWdvcmllc0ZvckRvbWFpbiA6IGdldENhdGVnb3JpZXNGb3JEb21haW47XHJcbiAgICB2YXIgZG9tYWlucyA9IHVuZGVmaW5lZDtcclxuICAgIGNhdGVnb3JpZXMuZm9yRWFjaChmdW5jdGlvbiAoY2F0ZWdvcnkpIHtcclxuICAgICAgICB2YXIgY2F0ZG9tYWlucyA9IGdldERvbWFpbnNGb3JDYXRlZ29yeShtb2RlbCwgY2F0ZWdvcnkpXHJcbiAgICAgICAgaWYgKCFkb21haW5zKSB7XHJcbiAgICAgICAgICAgIGRvbWFpbnMgPSBjYXRkb21haW5zO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGRvbWFpbnMgPSBfLmludGVyc2VjdGlvbihkb21haW5zLCBjYXRkb21haW5zKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICAgIGlmIChkb21haW5zLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY2F0ZWdvcmllcyAnICsgVXRpbHMubGlzdFRvUXVvdGVkQ29tbWFBbmQoY2F0ZWdvcmllcykgKyAnIGhhdmUgbm8gY29tbW9uIGRvbWFpbi4nKVxyXG4gICAgfVxyXG4gICAgZG9tYWlucy5mb3JFYWNoKGZ1bmN0aW9uIChkb21haW4pIHtcclxuICAgICAgICBmbihtb2RlbCwgZG9tYWluKS5mb3JFYWNoKGZ1bmN0aW9uICh3b3JkY2F0KSB7XHJcbiAgICAgICAgICAgIHJlc1t3b3JkY2F0XSA9IHRydWU7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxuICAgIE9iamVjdC5mcmVlemUocmVzKTtcclxuICAgIHJldHVybiByZXM7XHJcbn1cclxuKi9cclxuXHJcbi8qKlxyXG4gKiBnaXZlbmEgIHNldCAgb2YgY2F0ZWdvcmllcywgcmV0dXJuIGEgc3RydWN0dXJlXHJcbiAqXHJcbiAqXHJcbiAqIHsgZG9tYWlucyA6IFtcIkRPTUFJTjFcIiwgXCJET01BSU4yXCJdLFxyXG4gKiAgIGNhdGVnb3J5U2V0IDogeyAgIGNhdDEgOiB0cnVlLCBjYXQyIDogdHJ1ZSwgLi4ufVxyXG4gKiB9XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RG9tYWluQ2F0ZWdvcnlGaWx0ZXJGb3JUYXJnZXRDYXRlZ29yaWVzKG1vZGVsOiBJTWF0Y2guSU1vZGVscywgY2F0ZWdvcmllczogc3RyaW5nW10sIHdvcmRzb25seTogYm9vbGVhbik6IElNYXRjaC5JRG9tYWluQ2F0ZWdvcnlGaWx0ZXIge1xyXG4gICAgdmFyIHJlcyA9IHt9O1xyXG4gICAgLy9cclxuICAgIHZhciBmbiA9IHdvcmRzb25seSA/IGdldFBvdGVudGlhbFdvcmRDYXRlZ29yaWVzRm9yRG9tYWluIDogZ2V0Q2F0ZWdvcmllc0ZvckRvbWFpbjtcclxuICAgIHZhciBkb21haW5zID0gdW5kZWZpbmVkIGFzIHN0cmluZ1tdO1xyXG4gICAgY2F0ZWdvcmllcy5mb3JFYWNoKGZ1bmN0aW9uIChjYXRlZ29yeSkge1xyXG4gICAgICAgIHZhciBjYXRkb21haW5zID0gZ2V0RG9tYWluc0ZvckNhdGVnb3J5KG1vZGVsLCBjYXRlZ29yeSlcclxuICAgICAgICBpZiAoIWRvbWFpbnMpIHtcclxuICAgICAgICAgICAgZG9tYWlucyA9IGNhdGRvbWFpbnM7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZG9tYWlucyA9IF8uaW50ZXJzZWN0aW9uKGRvbWFpbnMsIGNhdGRvbWFpbnMpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgaWYgKGRvbWFpbnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYXRlZ29yaWVzICcgKyBVdGlscy5saXN0VG9RdW90ZWRDb21tYUFuZChjYXRlZ29yaWVzKSArICcgaGF2ZSBubyBjb21tb24gZG9tYWluLicpXHJcbiAgICB9XHJcbiAgICBkb21haW5zLmZvckVhY2goZnVuY3Rpb24gKGRvbWFpbikge1xyXG4gICAgICAgIGZuKG1vZGVsLCBkb21haW4pLmZvckVhY2goZnVuY3Rpb24gKHdvcmRjYXQpIHtcclxuICAgICAgICAgICAgcmVzW3dvcmRjYXRdID0gdHJ1ZTtcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG4gICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBkb21haW5zOiBkb21haW5zLFxyXG4gICAgICAgIGNhdGVnb3J5U2V0OiByZXNcclxuICAgIH07XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RG9tYWluQ2F0ZWdvcnlGaWx0ZXJGb3JUYXJnZXRDYXRlZ29yeShtb2RlbDogSU1hdGNoLklNb2RlbHMsIGNhdGVnb3J5OiBzdHJpbmcsIHdvcmRzb25seTogYm9vbGVhbik6IElNYXRjaC5JRG9tYWluQ2F0ZWdvcnlGaWx0ZXIge1xyXG4gICAgcmV0dXJuIGdldERvbWFpbkNhdGVnb3J5RmlsdGVyRm9yVGFyZ2V0Q2F0ZWdvcmllcyhtb2RlbCwgW2NhdGVnb3J5XSwgd29yZHNvbmx5KTtcclxufVxyXG5cclxuXHJcbiJdfQ==
