/**
 * Functionality to map the "flat" categories model to a nested document
 *
 * @file
 */
import * as ISchema from '../modelload/schemaload';
import * as IMatch from '../match/ifmatch';
export declare function collectCategories(eSchemaProps: any): IMatch.CatMongoMap;
/**
 * Given a record and a paths expression, return
 * the value (string or array) which represents this path
 * Note that a trailing array is not expanded,
 * @param rec
 * @param paths
 */
export declare function getMemberByPath(rec: any, paths: string[]): any;
/**
 * return a category
 * @param mongoMap
 * @param cat a category
 * @return the constructed path, without any preceding $
 */
export declare function makeCategoryPath(mongoMap: IMatch.CatMongoMap, category: string): string;
/**
 * Given a segment path, return the
 * @param paths
 */
export declare function getFirstSegment(paths: string[]): string;
export declare function makeMongoNameLC(s: string): string;
export declare function isNonObjectPath(mongoMap: IMatch.CatMongoMap, category: string): boolean;
export declare function getShortProjectedName(mongoMap: IMatch.CatMongoMap, category: string): string;
export declare function unwindsForNonterminalArrays(mongoMap: IMatch.CatMongoMap): any[];
export declare function makeMongoMap(oDoc: ISchema.IModelDoc, eSchema: ISchema.IExtendedSchema): IMatch.CatMongoMap;
