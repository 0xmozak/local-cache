/// <reference types="node" />
import * as fs from 'fs';
import { CacheFilename, CompressionMethod, TarFilename } from './constants';
export declare function lazyInit<Type>(fn: () => Promise<Type>): () => Promise<Type>;
export declare const getCompressionMethod: () => Promise<CompressionMethod>;
export declare const getCacheFileName: () => Promise<CacheFilename>;
export declare function getArchiveFileSizeInBytes(filePath: string): number;
export declare function resolvePaths(patterns: string[]): Promise<string[]>;
export declare function unlinkFile(filePath: fs.PathLike): Promise<void>;
export declare const getGnuTarPathOnWindows: () => Promise<string>;
export declare function assertDefined<T>(name: string, value?: T): T;
export declare const isGhes: () => Promise<boolean>;
interface PosixPathBrand {
    _type: "Posix";
}
export type PosixPath = string & PosixPathBrand;
export declare function posixFile(filename: CacheFilename | typeof TarFilename): PosixPath;
export declare function posixPath(windowsPath: string): PosixPath;
export declare function posixJoin(...paths: PosixPath[]): PosixPath;
export declare function randomName(): string;
export {};
