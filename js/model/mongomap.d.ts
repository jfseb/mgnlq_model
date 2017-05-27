/**
 * Functionality to map the "flat" categories model to a nested document
 *
 * @file
 */
export interface CatMongoMap {
    [key: string]: {
        paths: string[];
        fullpath: string;
    };
}
import * as ISchema from '../modelload/schemaload';
export declare function collectCategories(eSchemaProps: any): {};
export declare function makeMongoMap(oDoc: ISchema.IModelDoc, eSchema: ISchema.IExtendedSchema): CatMongoMap;
