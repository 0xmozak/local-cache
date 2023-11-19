import * as utils from './cacheUtils';
export declare const getCacheFileName: () => Promise<utils.PosixPath>;
export declare function listTar(archivePath: utils.PosixPath): Promise<void>;
export declare function extractTar(archivePath: utils.PosixPath): Promise<void>;
export declare function createTar(archiveFolder: utils.PosixPath, sourceDirectories: string[]): Promise<void>;
