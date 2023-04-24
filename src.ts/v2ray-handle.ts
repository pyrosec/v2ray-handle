import fetch from "node-fetch";
import path from "path";
import mkdirp from "mkdirp";
import decompress from "decompress";
import fs from "fs-extra";
import os from "os";
import crypto from "crypto";
import child_process from "child_process";

export const SUPPORTED_ARCHES = [
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

export const VERSION = "v4.31.0";

import digestJson from "./digests.json";

export const DIGESTS = digestJson;

export const fetchDigest = async (arch) => {
  return (await fetch("https://github.com/v2fly/v2ray-core/releases/download/" + VERSION + "/v2ray-" + arch + ".zip.dgst", {
    method: 'GET'
  })).text();
};

export const fetchAllDigests = async () => {
  const digests = [];
  for (const arch of SUPPORTED_ARCHES) {
    digests.push(await fetchDigest(arch));
  }
  return SUPPORTED_ARCHES.reduce((r, v, i) => {
    r[v] = digests[i];
    return r;
  }, {});
};

export const printDigestJSON = async () => {
  console.log(JSON.stringify(await fetchAllDigests(), null, 2));
}; 

export const getDigestHex = (arch, hashType) => DIGESTS[arch].split('\n').filter(Boolean).find((v) => v.match(hashType)).split('=')[1].trim();

export const HANDLE_DIRECTORY = path.join(process.env.HOME, '.v2ray-handle');

export const PROGRAM_FILEPATH = path.join(HANDLE_DIRECTORY, 'v2ray');

export const detectArch = () => {
  return os.platform() + '-' + os.arch().replace('x', '');
};

export const fetchAndVerifyRelease = async (hashType = 'SHA512') => {
  
  const arch = detectArch();
  const filename = "v2ray-" + arch + ".zip";
  const response = Buffer.from(await (await (await fetch("https://github.com/v2fly/v2ray-core/releases/download/" + VERSION + "/" + filename, {
    method: "GET"
  })).blob()).arrayBuffer());
  if (crypto.createHash(hashType.toLowerCase()).update(response).digest().toString('hex') !== getDigestHex(arch, hashType)) throw Error(hashType + ' mismatch -- abort');
  await mkdirp(HANDLE_DIRECTORY);
  const filepath = path.join(HANDLE_DIRECTORY, filename);
  await fs.writeFile(filepath, response);
  await decompress(filepath, HANDLE_DIRECTORY);
}

export const checkIfExists = async () => {
  return (await fs.exists(HANDLE_DIRECTORY) && await fs.exists(path.join(HANDLE_DIRECTORY, 'v2ray')));
};

export const v2ray = async (config) => {
  if (!await checkIfExists()) await fetchAndVerifyRelease();
  const configHash = crypto.createHash('SHA512').update(JSON.stringify(config)).digest('hex').substr(0, 16); 
  const configFilepath = path.join(HANDLE_DIRECTORY, configHash + '.json');
  await fs.writeFile(configFilepath, JSON.stringify(config, null, 2));
  const subprocess = await new Promise((resolve, reject) => {
    const proc = child_process.spawn(PROGRAM_FILEPATH, ['-config', configFilepath]);
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
