/**
 * Functionality to load data into a mongoose model
 * (c) gerd forstmann 2017
 *
 * @file
 */
import * as IMatch from '../match/ifmatch';
import * as mongoose from 'mongoose';
/**
 * the model path, may be controlled via environment variable
 */
export declare function cmpTools(a: IMatch.ITool, b: IMatch.ITool): number;
/**
 * Create Database (currently does not drop database before!)
 * @param mongoose {mongoose.Mongoose} mongoose instance ( or mock for testing)
 * @param mongoConnectionString {string}  connectionstring, method will connect and disconnect
 * (currenlty disconnnect only on success, subject to change)
 * @param modelPath {string} modepath to read data from
 */
export declare function createDB(mongoose: mongoose.Mongoose, mongoConnectionString: string, modelPath: string): Promise<any>;
export declare function getModel(mongoose: any, modelName: string, modelPath: string): Promise<mongoose.Model<any>>;
export declare function loadModelData(mongoose: any, modelPath: string, modelName: string): Promise<void>;
