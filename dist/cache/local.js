import * as path from 'path';
import { exists, lstat, readdir } from '@actions/io/lib/io-util';
import { getCacheFileName } from './tar';
export async function getLocalCacheEntry(keys) {
    const cacheFileName = await getCacheFileName();
    const result = await keys.reduce(async (asyncMemo, key) => {
        const memo = await asyncMemo;
        if (memo)
            return memo;
        const cacheDir = await getLocalArchiveFolder(key, true);
        if (!cacheDir || !await exists(cacheDir))
            return undefined;
        const cacheKey = path.basename(cacheDir);
        const archiveLocation = path.join(cacheDir, cacheFileName);
        if (!await exists(archiveLocation))
            return undefined;
        return {
            cacheKey,
            archiveLocation,
        };
    }, Promise.resolve(undefined));
    return result;
}
// eslint-disable-next-line max-len
export async function getLocalArchiveFolder(key, findKey = false) {
    const { GITHUB_REPOSITORY, RUNNER_TOOL_CACHE } = process.env;
    if (!RUNNER_TOOL_CACHE) {
        throw new TypeError('Expected RUNNER_TOOL_CACHE environment variable to be defined.');
    }
    if (!GITHUB_REPOSITORY) {
        throw new TypeError('Expected GITHUB_REPOSITORY environment variable to be defined.');
    }
    const cachePath = path.join(RUNNER_TOOL_CACHE, GITHUB_REPOSITORY);
    const primaryCacheKey = path.join(cachePath, key);
    if (!findKey || await exists(primaryCacheKey))
        return primaryCacheKey;
    const files = await readdir(cachePath);
    const cacheKey = await files.reduce(async (memo, file) => {
        await memo;
        if (!file.startsWith(key))
            return memo;
        const stats = await lstat(path.join(cachePath, file));
        if (!stats.isDirectory())
            return memo;
        return file;
    }, Promise.resolve(undefined));
    if (!cacheKey)
        return undefined;
    return path.join(cachePath, cacheKey);
}
