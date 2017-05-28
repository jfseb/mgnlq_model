/**
 * Functionality managing the match models
 *
 * @file
 */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//import * as intf from 'constants';
const debugf = require("debugf");
var debuglog = debugf('model');
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
const mongooseMock = require("mongoose_record_replay");
/**
 * the model path, may be controlled via environment variable
 */
var envModelPath = process.env["ABOT_MODELPATH"] || "node_modules/mgnlq_testmodel/testmodel";
function cmpTools(a, b) {
    return a.name.localeCompare(b.name);
}
exports.cmpTools = cmpTools;
;
;
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
                debuglog(() => 'attempting to load ' + modelname);
                var [extendedSchema, model, modelDoc] = value;
                res.modelESchemas[modelname] = extendedSchema;
                res.modelDocs[modelname] = modelDoc;
                res.mongoMaps[modelname] = MongoMap.makeMongoMap(modelDoc, extendedSchema);
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
    return model.aggregate({ $match: { "_synonyms.0": { $exists: true } } }, { $project: { _synonyms: 1 } }, { $unwind: "$_synonyms" }, { $project: { "category": "$_synonyms.category", "fact": "$_synonyms.fact", "synonyms": "$_synonyms.synonyms" } }).exec();
}
exports.getFactSynonyms = getFactSynonyms;
;
// db.cosmos.aggregate({$match : { "_synonyms.0": { $exists: true}}}, { $project : { _synonyms : 1}}, { $unwind : "$_synonyms"});
function remapSynonyms(docs) {
    return docs.reduce((prev, doc) => {
        doc._synonyms.forEach(syn => prev.push({
            category: syn.category,
            fact: syn.fact,
            synonyms: syn.synonyms
        }));
        return prev;
    }, []);
}
exports.remapSynonyms = remapSynonyms;
// get synonyms
// db.cosmos.find( { "_synonyms.0": { $exists: true }}).length()
function getDistinctValues(mongoHandle, modelname, category) {
    debuglog(() => `here models ${modelname} ` + mongoHandle.mongoose.modelNames().join(';'));
    var model = mongoHandle.mongoose.model(Schemaload.makeMongooseModelName(modelname));
    var mongoMap = mongoHandle.mongoMaps[modelname];
    if (!model) {
        debuglog(' no model for ' + modelname);
        return Promise.reject(`model ${modelname} not found in db`);
    }
    if (!mongoMap) {
        debuglog(' no mongoMap for ' + modelname);
        return Promise.reject(`model ${modelname} has no modelmap`);
    }
    if (!mongoMap[category]) {
        debuglog(' no mongoMap category for ' + modelname);
        return Promise.reject(`model ${modelname} has no category ${category}`);
    }
    debuglog(' here path for distinct value ' + mongoMap[category].fullpath);
    return model.distinct(mongoMap[category].fullpath).then(res => {
        debuglog(() => ` here res for ${modelname}  ${category} values ` + JSON.stringify(res, undefined, 2));
        return res;
    });
}
exports.getDistinctValues = getDistinctValues;
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
function loadModelP(mongooseHndl, connectionString) {
    var mongooseX = mongooseHndl || mongoose;
    var connStr = connectionString || 'mongodb://localhost/testdb';
    return MongoUtils.openMongoose(mongooseX, connStr).then(() => getMongoHandle(mongooseX)).then((modelHandle) => loadModels(modelHandle)).then((modelHandle) => modelHandle.model);
}
;
function loadModelHandleP(mongooseHndl, connectionString) {
    var mongooseX = mongooseHndl || mongoose;
    if (process.env.MONGO_REPLAY) {
        mongooseX = mongooseMock.mongooseMock;
    }
    var connStr = connectionString || 'mongodb://localhost/testdb';
    return MongoUtils.openMongoose(mongooseX, connStr).then(() => getMongoHandle(mongooseX)).then((modelHandle) => loadModels(modelHandle));
}
exports.loadModelHandleP = loadModelHandleP;
;
function loadModel(modelHandle, sModelName, oModel) {
    debuglog(" loading " + sModelName + " ....");
    //var oMdl = readFileAsJSON('./' + modelPath + '/' + sModelName + ".model.json") as IModel;
    var oMdl = makeMdlMongo(modelHandle, sModelName, oModel);
    return loadModelDataMongo(modelHandle, oMdl, sModelName, oModel);
}
exports.loadModel = loadModel;
/*/
function loadModel(modelPath: string, sModelName: string, oModel: IMatch.IModels) {
    debuglog(" loading " + sModelName + " ....");
    var oMdl = readFileAsJSON('./' + modelPath + '/' + sModelName + ".model.json") as IModel;
    mergeModelJson(sModelName, oMdl, oModel);
    loadModelData(modelPath, oMdl, sModelName, oModel);
}*/
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
        bitindex: getDomainBitIndex(modelDoc.domain, oModel),
        domain: modelDoc.domain,
        modelname: sModelName,
        description: modelDoc.domain_description
    };
    var categoryDescribedMap = {};
    oMdl.bitindex = getDomainBitIndex(modelDoc.domain, oModel);
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
    if (oModel.domains.indexOf(oMdl.domain) >= 0) {
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
        }
    });
    // add operators
    // add fillers
    oModel.domains.push(oMdl.domain);
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
                throw new Error("unknown operator " + operator);
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
                Object.keys(operators.synonyms[operator]).forEach(function (synonym) {
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
            return true;
        });
        return true;
    });
}
exports.readOperators = readOperators;
;
function loadModels(modelHandle, modelPath) {
    var oModel;
    oModel = {
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
    modelHandle = modelHandle || {
        mongoose: undefined,
        modelDocs: {},
        mongoMaps: {},
        modelESchemas: {}
    };
    modelPath = modelPath || envModelPath;
    try {
        var a = CircularSer.load('./' + modelPath + '/_cachefalse.js');
        a = undefined;
        //console.log("found a cache ?  " + !!a);
        //a = undefined;
        if (a) {
            //console.log('return preps' + modelPath);
            debuglog(" return prepared model ");
            if (process.env.ABOT_EMAIL_USER) {
                console.log("loaded models from cache in " + (Date.now() - t) + " ");
            }
            var res = Object.assign(modelHandle, { model: a });
            return Promise.resolve(res);
        }
    }
    catch (e) {
        //console.log('error' + e);
        // no cache file,
    }
    //var mdls = readFileAsJSON('./' + modelPath + '/models.json');
    var mdls = Object.keys(modelHandle.modelDocs).sort();
    // create bitindex in order !
    debuglog('loading models ' + mdls.join("\n"));
    return Promise.all(mdls.map((sModelName) => loadModel(modelHandle, sModelName, oModel))).then(() => {
        // add the categories to the model:
        /*
        oModel.category.forEach(function (category) {
            insertRuleIfNotPresent(oModel.mRules, {
                category: "category",
                matchedString: category,
                type: IMatch.EnumRuleType.WORD,
                word: category,
                lowercaseword: category.toLowerCase(),
                bitindex : oMdl.
                _ranking: 0.95
            }, oModel.seenRules);
        });
        */
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
        fs.writeFileSync("post_sort", JSON.stringify(oModel.mRules, undefined, 2));
        forceGC();
        oModel.rules = splitRules(oModel.mRules);
        fs.writeFileSync("test1x.json", JSON.stringify(oModel.rules, undefined, 2));
        forceGC();
        delete oModel.seenRules;
        debuglog('saving');
        forceGC();
        CircularSer.save('./' + modelPath + '/_cachefalse.js', oModel);
        forceGC();
        if (process.env.ABOT_EMAIL_USER) {
            console.log("loaded models by calculation in " + (Date.now() - t) + " ");
        }
        var res = Object.assign(modelHandle, { model: oModel });
        return res;
    }).catch((err) => {
        console.log(err + ' ' + err.stack);
        process.exit(-1);
    });
}
exports.loadModels = loadModels;
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
function getCategoriesForDomain(theModel, domain) {
    if (theModel.domains.indexOf(domain) < 0) {
        throw new Error("Domain \"" + domain + "\" not part of model");
    }
    var res = getResultAsArray(theModel, MetaF.Domain(domain), MetaF.Relation(Meta.RELATION_hasCategory));
    return Meta.getStringArray(res);
}
exports.getCategoriesForDomain = getCategoriesForDomain;
function getTableColumns(theModel, domain) {
    if (theModel.domains.indexOf(domain) < 0) {
        throw new Error("Domain \"" + domain + "\" not part of model");
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kZWwvbW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7R0FJRzs7O0FBRUgsb0NBQW9DO0FBQ3BDLGlDQUFpQztBQUVqQyxJQUFJLFFBQVEsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7QUFFL0IsaURBQWlEO0FBRWpELDJDQUE0QztBQUM1QyxrREFBa0Q7QUFDbEQsMENBQTBDO0FBQzFDLHlCQUF5QjtBQUN6QiwrQkFBK0I7QUFDL0Isb0NBQW9DO0FBQ3BDLDBDQUEwQztBQUMxQyw0Q0FBNEM7QUFDNUMsbUNBQW1DO0FBQ25DLDRCQUE0QjtBQUU1Qiw2Q0FBNkM7QUFFN0MscUNBQXFDO0FBRXJDLHNEQUFzRDtBQUN0RCx1Q0FBdUM7QUFFdkMsdURBQXVEO0FBRXZEOztHQUVHO0FBQ0gsSUFBSSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLHdDQUF3QyxDQUFDO0FBRzdGLGtCQUF5QixDQUFlLEVBQUUsQ0FBZTtJQUNyRCxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3hDLENBQUM7QUFGRCw0QkFFQztBQVVBLENBQUM7QUFLRCxDQUFDO0FBRUY7OztHQUdHO0FBQ0gsd0JBQStCLFFBQTJCO0lBQ3RELElBQUksR0FBRyxHQUFHO1FBQ04sUUFBUSxFQUFFLFFBQVE7UUFDbEIsU0FBUyxFQUFFLEVBQUU7UUFDYixhQUFhLEVBQUUsRUFBRTtRQUNqQixTQUFTLEVBQUUsRUFBRTtLQUNBLENBQUM7SUFDbEIsSUFBSSxPQUFPLEdBQUcsVUFBVSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzFELE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVU7UUFD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