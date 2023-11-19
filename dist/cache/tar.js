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
exports.createTar = exports.extractTar = exports.listTar = exports.getCacheFileName = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const exec_1 = require("@actions/exec");
const io = __importStar(require("@actions/io"));
const utils = __importStar(require("./cacheUtils"));
const constants_1 = require("./constants");
const IS_WINDOWS = process.platform === 'win32';
// Returns tar path and type: BSD or GNU
const getTarTool = utils.lazyInit(async () => {
    switch (process.platform) {
        case 'win32': {
            const gnuTar = await utils.getGnuTarPathOnWindows();
            const systemTar = constants_1.SystemTarPathOnWindows;
            if (gnuTar) {
                // Use GNUtar as default on windows
                return { path: gnuTar, type: constants_1.ArchiveToolType.GNU };
            }
            if ((await fs.stat(systemTar)).isFile()) {
                return { path: systemTar, type: constants_1.ArchiveToolType.BSD };
            }
            break;
        }
        case 'darwin': {
            const gnuTar = await io.which('gtar', false);
            if (gnuTar) {
                // fix permission denied errors when extracting BSD tar archive with GNU tar - https://github.com/actions/cache/issues/527
                return { path: gnuTar, type: constants_1.ArchiveToolType.GNU };
            }
            return {
                path: await io.which('tar', true),
                type: constants_1.ArchiveToolType.BSD,
            };
        }
        default:
            break;
    }
    // Default assumption is GNU tar is present in path
    return {
        path: await io.which('tar', true),
        type: constants_1.ArchiveToolType.GNU,
    };
});
const isBsdTarZstd = utils.lazyInit(async () => {
    const tarPath = await getTarTool();
    const compressionMethod = await utils.getCompressionMethod();
    return tarPath.type === constants_1.ArchiveToolType.BSD
        && compressionMethod !== constants_1.CompressionMethod.Gzip
        && IS_WINDOWS;
});
exports.getCacheFileName = utils.lazyInit(async () => {
    return utils.posixFile(await isBsdTarZstd()
        ? constants_1.TarFilename
        : await utils.getCacheFileName());
});
async function getTarProgram(methodSpecificArgs) {
    const tarPath = await getTarTool();
    const program = tarPath.path;
    const args = await methodSpecificArgs();
    // Platform specific args
    if (tarPath.type === constants_1.ArchiveToolType.GNU) {
        switch (process.platform) {
            case 'win32':
                args.push('--force-local');
                break;
            case 'darwin':
                args.push('--delay-directory-restore');
                break;
            default:
        }
    }
    return { program, args };
}
// Return create specific arguments
async function getTarCreateArgs(manifestPath, archivePath) {
    const workingDirectory = utils.posixPath(getWorkingDirectory());
    return [
        '--posix',
        '-cf',
        archivePath,
        '-P',
        '-C',
        workingDirectory,
        '--files-from',
        manifestPath,
    ];
}
async function getTarExtractArgs(archivePath) {
    const workingDirectory = getWorkingDirectory();
    const file = await isBsdTarZstd() ? constants_1.TarFilename : archivePath;
    return [
        '-xf',
        file,
        '-P',
        '-C',
        utils.posixPath(workingDirectory),
    ];
}
// Return arguments for tar as per tarPath, compressionMethod, method type and os
async function getTarListArgs(archivePath) {
    const file = await isBsdTarZstd() ? constants_1.TarFilename : utils.posixPath(archivePath);
    return [
        '-tf',
        file,
        '-P',
    ];
}
// Returns commands to run tar and compression program
async function getCommands(addMethodSpecificTarArgs, getProgram, isCreate = false) {
    const tarProgram = (await getTarProgram(addMethodSpecificTarArgs));
    const compressionProgram = (await getProgram());
    if ("program" in compressionProgram) {
        if (isCreate) {
            return [compressionProgram, tarProgram];
        }
        else {
            return [tarProgram, compressionProgram];
        }
    }
    return [{
            program: tarProgram.program,
            args: tarProgram.args.concat(compressionProgram)
        }];
}
function getWorkingDirectory() {
    return process.env.GITHUB_WORKSPACE ?? process.cwd();
}
// Common function for extractTar and listTar to get the compression method
async function getDecompressionProgram(archivePath) {
    const compressionMethod = await utils.getCompressionMethod();
    // -d: Decompress.
    // unzstd is equivalent to 'zstd -d'
    // --long=#: Enables long distance matching with # bits. Maximum is 30 (1GB) on 32-bit OS and 31 (2GB) on 64-bit.
    // Using 30 here because we also support 32-bit self-hosted runners.
    const BSD_TAR_ZSTD = await isBsdTarZstd();
    switch (compressionMethod) {
        case constants_1.CompressionMethod.Zstd:
            if (BSD_TAR_ZSTD) {
                return {
                    program: 'zstd',
                    args: ['-d', '--long=30', '--force', '-o', constants_1.TarFilename, archivePath],
                };
            }
            if (IS_WINDOWS) {
                return ['--use-compress-program', '"zstd -d --long=30"'];
            }
            return ['--use-compress-program', 'unzstd', '--long=30'];
        case constants_1.CompressionMethod.ZstdWithoutLong:
            if (BSD_TAR_ZSTD) {
                return {
                    program: 'zstd',
                    args: ['-d', '--force', '-o', constants_1.TarFilename, archivePath],
                };
            }
            if (IS_WINDOWS) {
                return ['--use-compress-program', '"zstd -d"'];
            }
            return ['--use-compress-program', 'unzstd'];
        default:
            return Promise.resolve(['-z']);
    }
}
// Used for creating the archive
// -T#: Compress using # working thread. If # is 0, attempt to detect and use the number of physical CPU cores.
// zstdmt is equivalent to 'zstd -T0'
// --long=#: Enables long distance matching with # bits. Maximum is 30 (1GB) on 32-bit OS and 31 (2GB) on 64-bit.
// Using 30 here because we also support 32-bit self-hosted runners.
// Long range mode is added to zstd in v1.3.2 release, so we will not use --long in older version of zstd.
async function getCompressionProgram(archivePath) {
    const compressionMethod = await utils.getCompressionMethod();
    const BSD_TAR_ZSTD = await isBsdTarZstd();
    switch (compressionMethod) {
        case constants_1.CompressionMethod.Zstd:
            if (BSD_TAR_ZSTD) {
                return {
                    program: 'zstd',
                    args: ['-T0', '--long=30', '--force', '-o', archivePath, constants_1.TarFilename]
                };
            }
            if (IS_WINDOWS) {
                return ['--use-compress-program', '"zstd -T0 --long=30"'];
            }
            return ['--use-compress-program', 'zstdmt', '--long=30'];
        case constants_1.CompressionMethod.ZstdWithoutLong:
            if (BSD_TAR_ZSTD) {
                return {
                    program: 'zstd',
                    args: ['-T0', '--force', '-o', archivePath, constants_1.TarFilename]
                };
            }
            if (IS_WINDOWS) {
                return ['--use-compress-program', '"zstd -T0"'];
            }
            return ['--use-compress-program', 'zstdmt'];
        default:
            return ['-z'];
    }
}
// Executes all commands as separate processes
async function execCommands(commands, cwd) {
    // eslint-disable-next-line no-restricted-syntax
    for (const command of commands) {
        try {
            // eslint-disable-next-line no-await-in-loop
            await (0, exec_1.exec)(command.program, command.args, {
                cwd,
                env: { ...process.env, MSYS: 'winsymlinks:nativestrict' },
            });
        }
        catch (error) {
            throw new Error(`${command.program} failed with error: ${error.message}`);
        }
    }
}
// List the contents of a tar
async function listTar(archivePath) {
    const commands = await getCommands(() => getTarListArgs(archivePath), () => getDecompressionProgram(archivePath));
    await execCommands(commands);
}
exports.listTar = listTar;
// Extract a tar
async function extractTar(archivePath) {
    // Create directory to extract tar into
    const workingDirectory = getWorkingDirectory();
    await io.mkdirP(workingDirectory);
    const commands = await getCommands(() => getTarExtractArgs(archivePath), () => getDecompressionProgram(archivePath));
    await execCommands(commands);
}
exports.extractTar = extractTar;
// Create a tar
async function createTar(archiveFolder, sourceDirectories) {
    // Use temp files to avoid multiple writers
    const randomName = utils.randomName();
    const manifestFilename = `manifest.${randomName}.txt`;
    const TarTempFileName = utils.posixPath(randomName + await (0, exports.getCacheFileName)());
    const ZipTempFileName = utils.posixPath(randomName + await utils.getCacheFileName());
    const ZipFileName = utils.posixPath(await utils.getCacheFileName());
    const manifestPath = path.join(archiveFolder, manifestFilename);
    const TarTempPath = utils.posixJoin(archiveFolder, TarTempFileName);
    const ZipTempPath = utils.posixJoin(archiveFolder, ZipTempFileName);
    const ZipPath = utils.posixJoin(archiveFolder, ZipFileName);
    // Write source directories to manifest.txt to avoid command length limits
    await fs.writeFile(manifestPath, sourceDirectories.join('\n'));
    const commands = await getCommands(() => getTarCreateArgs(utils.posixPath(manifestPath), TarTempPath), () => getCompressionProgram(ZipTempPath), true);
    await execCommands(commands, archiveFolder);
    await fs.link(ZipTempPath, ZipPath);
    await fs.unlink(ZipTempPath);
}
exports.createTar = createTar;
