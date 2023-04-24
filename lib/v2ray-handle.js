"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.v2ray = exports.checkIfExists = exports.fetchAndVerifyRelease = exports.detectArch = exports.PROGRAM_FILEPATH = exports.HANDLE_DIRECTORY = exports.getDigestHex = exports.printDigestJSON = exports.fetchAllDigests = exports.fetchDigest = exports.DIGESTS = exports.VERSION = exports.SUPPORTED_ARCHES = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const path_1 = __importDefault(require("path"));
const mkdirp_1 = __importDefault(require("mkdirp"));
const decompress_1 = __importDefault(require("decompress"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const os_1 = __importDefault(require("os"));
const crypto_1 = __importDefault(require("crypto"));
const child_process_1 = __importDefault(require("child_process"));
exports.SUPPORTED_ARCHES = [
    "dragonfly-64",
    "freebsd-32",
    "freebsd-64",
    "linux-32",
    "linux-64",
    "linux-arm32-v5",
    "linux-arm32-v6",
    "linux-arm32-v7a",
    "linux-arm64-v8a",
    "linux-mips32",
    "linux-mips32le",
    "linux-mips64",
    "linux-mips64le",
    "linux-ppc64",
    "linux-ppc64le",
    "linux-riscv64",
    "linux-s390x",
    "macos-64",
    "openbsd-32",
    "openbsd-64",
    "windows-32",
    "windows-64",
    "windows-arm32-v7a"
];
exports.VERSION = "v4.31.0";
const digests_json_1 = __importDefault(require("./digests.json"));
exports.DIGESTS = digests_json_1.default;
const fetchDigest = async (arch) => {
    return (await (0, node_fetch_1.default)("https://github.com/v2fly/v2ray-core/releases/download/" + exports.VERSION + "/v2ray-" + arch + ".zip.dgst", {
        method: 'GET'
    })).text();
};
exports.fetchDigest = fetchDigest;
const fetchAllDigests = async () => {
    const digests = [];
    for (const arch of exports.SUPPORTED_ARCHES) {
        digests.push(await (0, exports.fetchDigest)(arch));
    }
    return exports.SUPPORTED_ARCHES.reduce((r, v, i) => {
        r[v] = digests[i];
        return r;
    }, {});
};
exports.fetchAllDigests = fetchAllDigests;
const printDigestJSON = async () => {
    console.log(JSON.stringify(await (0, exports.fetchAllDigests)(), null, 2));
};
exports.printDigestJSON = printDigestJSON;
const getDigestHex = (arch, hashType) => exports.DIGESTS[arch].split('\n').filter(Boolean).find((v) => v.match(hashType)).split('=')[1].trim();
exports.getDigestHex = getDigestHex;
exports.HANDLE_DIRECTORY = path_1.default.join(process.env.HOME, '.v2ray-handle');
exports.PROGRAM_FILEPATH = path_1.default.join(exports.HANDLE_DIRECTORY, 'v2ray');
const detectArch = () => {
    return os_1.default.platform() + '-' + os_1.default.arch().replace('x', '');
};
exports.detectArch = detectArch;
const fetchAndVerifyRelease = async (hashType = 'SHA512') => {
    const arch = (0, exports.detectArch)();
    const filename = "v2ray-" + arch + ".zip";
    const response = Buffer.from(await (await (await (0, node_fetch_1.default)("https://github.com/v2fly/v2ray-core/releases/download/" + exports.VERSION + "/" + filename, {
        method: "GET"
    })).blob()).arrayBuffer());
    if (crypto_1.default.createHash(hashType.toLowerCase()).update(response).digest().toString('hex') !== (0, exports.getDigestHex)(arch, hashType))
        throw Error(hashType + ' mismatch -- abort');
    await (0, mkdirp_1.default)(exports.HANDLE_DIRECTORY);
    const filepath = path_1.default.join(exports.HANDLE_DIRECTORY, filename);
    await fs_extra_1.default.writeFile(filepath, response);
    await (0, decompress_1.default)(filepath, exports.HANDLE_DIRECTORY);
};
exports.fetchAndVerifyRelease = fetchAndVerifyRelease;
const checkIfExists = async () => {
    return (await fs_extra_1.default.exists(exports.HANDLE_DIRECTORY) && await fs_extra_1.default.exists(path_1.default.join(exports.HANDLE_DIRECTORY, 'v2ray')));
};
exports.checkIfExists = checkIfExists;
const v2ray = async (config) => {
    if (!await (0, exports.checkIfExists)())
        await (0, exports.fetchAndVerifyRelease)();
    const configHash = crypto_1.default.createHash('SHA512').update(JSON.stringify(config)).digest('hex').substr(0, 16);
    const configFilepath = path_1.default.join(exports.HANDLE_DIRECTORY, configHash + '.json');
    await fs_extra_1.default.writeFile(configFilepath, JSON.stringify(config, null, 2));
    const subprocess = await new Promise((resolve, reject) => {
        const proc = child_process_1.default.spawn(exports.PROGRAM_FILEPATH, ['-config', configFilepath]);
        proc.on('error', (err) => reject(err));
        const handler = (data) => {
            if (data.toString('utf8').match(configHash)) {
                proc.stdout.removeListener('data', handler);
                resolve(proc);
            }
        };
        proc.stdout.on('data', handler);
    });
    return subprocess;
};
exports.v2ray = v2ray;
//# sourceMappingURL=v2ray-handle.js.map