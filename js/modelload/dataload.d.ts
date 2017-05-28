import * as IMatch from '../match/ifmatch';
import * as mongoose from 'mongoose';
export declare function cmpTools(a: IMatch.ITool, b: IMatch.ITool): number;
export declare function getModel(mongoose: any, modelName: string, modelPath: string): Promise<mongoose.Model<any>>;
export declare function loadModelData(mongoose: any, modelPath: string, modelName: string): Promise<void>;
