import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import * as core from '@actions/core';
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

function getPlatformCandidates(): string[] {
  // Node reports macOS as "darwin"; some release assets may use "macos".
  const base = osArch === 'x64'
    ? (osPlat === 'win32' ? 'win64' : `amd64`)
    : osArch === 'x32'
      ? (osPlat === 'win32' ? 'win32' : `i386`)
      : osArch === 'arm'
        ? (() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const armVersion = (process.config.variables as any).arm_version;
            return armVersion === '7' ? 'armeb' : 'arm';
          })()
        : osArch;

  if (osPlat === 'darwin') {
    return [`${base}_darwin`, `${base}_macos`];
  }

  return [`${base}_${osPlat}`];
}

function getName(version: string, platform: string): string {
  return util.format('upx-%s-%s', version, platform);
}

export async function getUPX(version: string): Promise<string> {
  const release: GitHubRelease = await getRelease(version);
  const semver: string = release.tag_name.replace(/^v/, '');
  core.info(`UPX ${semver} found`);

  const candidates = getPlatformCandidates();
  const ext = osPlat === 'win32' ? 'zip' : 'tar.xz';

  let downloadUrl: string | undefined;
  let extractedPath: string | undefined;
  let cachePath: string | undefined;

  for (const platform of candidates) {
    const filename = `${getName(semver, platform)}.${ext}`;
    const candidateUrl = `https://github.com/upx/upx/releases/download/v${semver}/${filename}`;

    try {
      core.startGroup(`Downloading ${candidateUrl}...`);

      const downloadPath: string = await tc.downloadTool(candidateUrl);
      core.info(`Downloaded to ${downloadPath}`);

      if (osPlat === 'win32') {
        extractedPath = await tc.extractZip(downloadPath);
      } else {
        extractedPath = await tc.extractTar(downloadPath, undefined, 'x');
      }
      core.info(`Extracted to ${extractedPath}`);

      cachePath = await tc.cacheDir(extractedPath, 'ghaction-upx', semver);
      core.debug(`Cached to ${cachePath}`);

      downloadUrl = candidateUrl;
      break;
    } catch (err) {
      core.warning(`Failed with ${platform}: ${(err as Error).message}`);
      core.endGroup();
    }
  }

  if (!downloadUrl || !cachePath) {
    throw new Error(`Could not find a matching UPX asset for ${osPlat}/${osArch}`);
  }

  const selectedPlatform = candidates.find((platform) => {
    const exePath = path.join(cachePath!, getName(semver, platform), osPlat === 'win32' ? 'upx.exe' : 'upx');
    return true;
  }) ?? candidates[0];

  const exePath = path.join(cachePath, getName(semver, selectedPlatform), osPlat === 'win32' ? 'upx.exe' : 'upx');
  core.debug(`Exe path is ${exePath}`);
  core.endGroup();

  return exePath;
}
