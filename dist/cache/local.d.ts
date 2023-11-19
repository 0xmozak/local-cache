interface CacheResult {
    cacheKey: string;
    archiveLocation: string;
}
export declare function getLocalCacheEntry(keys: string[]): Promise<CacheResult | undefined>;
export declare function getLocalArchiveFolder(key: string): Promise<string>;
export declare function getLocalArchiveFolder(key: string, findKey?: boolean): Promise<string | undefined>;
export {};
