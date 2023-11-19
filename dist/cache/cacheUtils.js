"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomName = exports.posixJoin = exports.posixPath = exports.posixFile = exports.isGhes = exports.assertDefined = exports.getGnuTarPathOnWindows = exports.unlinkFile = exports.resolvePaths = exports.getArchiveFileSizeInBytes = exports.getCacheFileName = exports.getCompressionMethod = exports.lazyInit = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const util = __importStar(require("util"));
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const glob = __importStar(require("@actions/glob"));
const io = __importStar(require("@actions/io"));
const semver = __importStar(require("semver"));
const crypto = __importStar(require("crypto"));
const constants_1 = require("./constants");
function lazyInit(fn) {
    let prom = undefined;
    return () => prom = (prom || fn());
}
exports.lazyInit = lazyInit;
// Use zstandard if possible to maximize cache performance
exports.getCompressionMethod = lazyInit(async () => {
    const versionOutput = await getVersion('zstd', ['--quiet']);
    const version = semver.clean(versionOutput);
    core.debug(`zstd version: ${version}`);
    if (versionOutput === '') {
        return constants_1.CompressionMethod.Gzip;
    }
    return constants_1.CompressionMethod.ZstdWithoutLong;
});
exports.getCacheFileName = lazyInit(async () => {
    return await (0, exports.getCompressionMethod)() === constants_1.CompressionMethod.Gzip
        ? constants_1.CacheFilename.Gzip
        : constants_1.CacheFilename.Zstd;
});
function getArchiveFileSizeInBytes(filePath) {
    return fs.statSync(filePath).size;
}
exports.getArchiveFileSizeInBytes = getArchiveFileSizeInBytes;
async function resolvePaths(patterns) {
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
exports.resolvePaths = resolvePaths;
async function unlinkFile(filePath) {
    return util.promisify(fs.unlink)(filePath);
}
exports.unlinkFile = unlinkFile;
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
exports.getGnuTarPathOnWindows = lazyInit(async () => {
    if (fs.existsSync(constants_1.GnuTarPathOnWindows)) {
        return constants_1.GnuTarPathOnWindows;
    }
    const versionOutput = await getVersion('tar');
    return versionOutput.toLowerCase().includes('gnu tar') ? io.which('tar') : '';
});
function assertDefined(name, value) {
    if (value === undefined) {
        throw Error(`Expected ${name} but value was undefiend`);
    }
    return value;
}
exports.assertDefined = assertDefined;
exports.isGhes = lazyInit(async () => {
    const ghUrl = new URL(process.env.GITHUB_SERVER_URL || 'https://github.com');
    return ghUrl.hostname.toUpperCase() !== 'GITHUB.COM';
});
function posixFile(filename) {
    return filename;
}
exports.posixFile = posixFile;
function posixPath(windowsPath) {
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
exports.posixPath = posixPath;
function posixJoin(...paths) {
    return path.posix.join(...paths);
}
exports.posixJoin = posixJoin;
function randomName() {
    return Math.floor(new Date().getTime() / 1000).toString(36)
        + crypto.randomBytes(12).toString('base64url');
}
exports.randomName = randomName;
