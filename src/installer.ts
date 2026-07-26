import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as httpm from '@actions/http-client';
import * as tc from '@actions/tool-cache';

const osPlat: string = os.platform();
const osArch: string = os.arch();

export interface GitHubRelease {
  id: number;
  tag_name: string;
  html_url: string;
  assets: Array<string>;
}

export const getRelease = async (version: string): Promise<GitHubRelease> => {
  const url = `https://raw.githubusercontent.com/crazy-max/ghaction-upx/master/.github/upx-releases.json`;
  const http: httpm.HttpClient = new httpm.HttpClient('ghaction-upx');
  const resp: httpm.HttpClientResponse = await http.get(url);
  const body = await resp.readBody();
  const statusCode = resp.message.statusCode || 500;
  if (statusCode >= 400) {
    throw new Error(`Failed to get UPX release ${version} from ${url} with status code ${statusCode}: ${body}`);
  }
  const releases = <Record<string, GitHubRelease>>JSON.parse(body);
  if (!releases[version]) {
    throw new Error(`Cannot find UPX release ${version} in ${url}`);
  }
  return releases[version];
};

const PLATFORM_TOKENS: Record<string, string> = {
  'win32:x64': 'win64',
  'win32:ia32': 'win32',
  'linux:x64': 'amd64_linux',
  'linux:ia32': 'i386_linux',
  'linux:arm64': 'arm64_linux',
  'linux:mips': 'mips_linux',
  'linux:mipsel': 'mipsel_linux',
  'linux:ppc': 'powerpc_linux',
  'linux:ppc64': 'powerpc64le_linux',
  'linux:riscv64': 'riscv64_linux'
};

function getLinuxArmToken(): string {
  const armVersion = (process.config.variables as any).arm_version;
  return armVersion === '7' ? 'armeb_linux' : 'arm_linux';
}

function getPlatformToken(): string | undefined {
  if (osPlat === 'linux' && osArch === 'arm') {
    return getLinuxArmToken();
  }
  return PLATFORM_TOKENS[`${osPlat}:${osArch}`];
}

function getName(version: string, platformToken: string): string {
  return util.format('upx-%s-%s', version, platformToken);
}

function unsupportedPlatformError(): Error {
  return new Error(`Could not find a matching UPX asset for ${osPlat}/${osArch}`);
}

async function installUpxWithBrew(): Promise<string> {
  core.startGroup('Installing UPX with Homebrew');
  try {
    await exec.exec('brew', ['install', 'upx']);
  } finally {
    core.endGroup();
  }

  return '/opt/homebrew/bin/upx';
}

export async function getUPX(version: string): Promise<string> {
  if (osPlat === 'darwin') {
    return await installUpxWithBrew();
  }

  const release: GitHubRelease = await getRelease(version);
  const semver: string = release.tag_name.replace(/^v/, '');
  core.info(`UPX ${semver} found`);

  const platformToken = getPlatformToken();
  if (!platformToken) {
    throw unsupportedPlatformError();
  }

  const ext = osPlat === 'win32' ? 'zip' : 'tar.xz';
  const assetName = getName(semver, platformToken);
  const downloadUrl = release.assets.find(asset => asset.endsWith(`/${assetName}.${ext}`));
  if (!downloadUrl) {
    throw new Error(
      `UPX ${semver} has no "${assetName}.${ext}" asset. See ${release.html_url} for what is actually published.`
    );
  }

  core.startGroup(`Downloading ${downloadUrl}...`);
  let cachePath: string;
  try {
    const downloadPath = await tc.downloadTool(downloadUrl);
    core.info(`Downloaded to ${downloadPath}`);

    const extractedPath =
      osPlat === 'win32' ? await tc.extractZip(downloadPath) : await tc.extractTar(downloadPath, undefined, 'x');
    core.info(`Extracted to ${extractedPath}`);

    cachePath = await tc.cacheDir(extractedPath, 'ghaction-upx', semver);
    core.debug(`Cached to ${cachePath}`);
  } finally {
    core.endGroup();
  }

  const exePath = path.join(cachePath, assetName, osPlat === 'win32' ? 'upx.exe' : 'upx');
  core.debug(`Exe path is ${exePath}`);

  return exePath;
}
