/**
 * Utiltities for mongo
 */
export declare function openMongoose(mongoose: any, mongoConnectionString: string): Promise<unknown>;
export declare function clearModels(mongoose: any): void;
export declare function disconnect(mongoose: any): void;
export declare function disconnectReset(mongoose: any): void;
export declare function getCollectionNames(mongoose: any): Promise<String[]>;
