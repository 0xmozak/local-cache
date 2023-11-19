import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as glob from '@actions/glob';
import * as io from '@actions/io';
import * as semver from 'semver';
import * as crypto from 'crypto';
import { CacheFilename, CompressionMethod, GnuTarPathOnWindows } from './constants';
export function lazyInit(fn) {
    let prom = undefined;
    return () => prom = (prom || fn());
}
// Use zstandard if possible to maximize cache performance
export const getCompressionMethod = lazyInit(async () => {
    const versionOutput = await getVersion('zstd', ['--quiet']);
    const version = semver.clean(versionOutput);
    core.debug(`zstd version: ${version}`);
    if (versionOutput === '') {
        return CompressionMethod.Gzip;
    }
    return CompressionMethod.ZstdWithoutLong;
});
export const getCacheFileName = lazyInit(async () => {
    return await getCompressionMethod() === CompressionMethod.Gzip
        ? CacheFilename.Gzip
        : CacheFilename.Zstd;
});
export function getArchiveFileSizeInBytes(filePath) {
    return fs.statSync(filePath).size;
}
export async function resolvePaths(patterns) {
    const paths = [];
    const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
    const globber = await glob.create(patterns.join('\n'), {
        implicitDescendants: false,
    });
    // eslint-disable-next-line no-restricted-syntax
    for await (const file of globber.globGenerator()) {
        const relativeFile = posixPath(path.relative(workspace, file));
        core.debug(`Matched: ${relativeFile}`);
        // Paths are made relative so the tar entries are all relative to the root of the workspace.
        if (relativeFile === '') {
            // path.relative returns empty string if workspace and file are equal
            paths.push('.');
        }
        else {
            paths.push(`${relativeFile}`);
        }
    }
    return paths;
}
export async function unlinkFile(filePath) {
    return util.promisify(fs.unlink)(filePath);
}
async function getVersion(app, additionalArgs = []) {
    let versionOutput = '';
    additionalArgs.push('--version');
    core.debug(`Checking ${app} ${additionalArgs.join(' ')}`);
    try {
        await exec.exec(`${app}`, additionalArgs, {
            ignoreReturnCode: true,
            silent: true,
            listeners: {
                stdout: (data) => {
                    versionOutput += data.toString();
                    return versionOutput;
                },
                stderr: (data) => {
                    versionOutput += data.toString();
                    return versionOutput;
                },
            },
        });
    }
    catch (err) {
        core.debug(err.message);
    }
    versionOutput = versionOutput.trim();
    core.debug(versionOutput);
    return versionOutput;
}
export const getGnuTarPathOnWindows = lazyInit(async () => {
    if (fs.existsSync(GnuTarPathOnWindows)) {
        return GnuTarPathOnWindows;
    }
    const versionOutput = await getVersion('tar');
    return versionOutput.toLowerCase().includes('gnu tar') ? io.which('tar') : '';
});
export function assertDefined(name, value) {
    if (value === undefined) {
        throw Error(`Expected ${name} but value was undefiend`);
    }
    return value;
}
export const isGhes = lazyInit(async () => {
    const ghUrl = new URL(process.env.GITHUB_SERVER_URL || 'https://github.com');
    return ghUrl.hostname.toUpperCase() !== 'GITHUB.COM';
});
export function posixFile(filename) {
    return filename;
}
export function posixPath(windowsPath) {
    return windowsPath
        // handle the edge-case of Window's long file names
        // See: https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file#short-vs-long-names
        .replace(/^\\\\\?\\/, "")
        // convert the separators, valid since both \ and / can't be in a windows filename
        .replace(/\\/g, '\/')
        // compress any // or /// to be just /, which is a safe operation under POSIX
        // and prevents accidental errors caused by manually doing path1+path2
        .replace(/\/\/+/g, '\/');
}
export function posixJoin(...paths) {
    return path.posix.join(...paths);
}
export function randomName() {
    return Math.floor(new Date().getTime() / 1000).toString(36)
        + crypto.randomBytes(12).toString('base64url');
}
