export interface IMeta {
    toName(): string;
    toType(): string;
    toFullString(): string;
}
export declare class AMeta implements IMeta {
    name: string;
    type: string;
    constructor(type: string, name: string);
    toName(): string;
    toFullString(): string;
    toType(): string;
}
export interface Meta {
    parseIMeta: (string) => IMeta;
    Domain: (string) => IMeta;
    Category: (string) => IMeta;
    Relation: (string) => IMeta;
}
export declare function getStringArray(arr: IMeta[]): string[];
export declare const RELATION_hasCategory = "hasCategory";
export declare const RELATION_isCategoryOf = "isCategoryOf";
export declare function getMetaFactory(): Meta;
