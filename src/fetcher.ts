import {Octokit} from '@octokit/core';

const octokit = new Octokit();

export interface GitHubRelease {
  id: number;
  tag_name: string;
  html_url: string;
  assets: {[key: string]: string};
}

export interface UPXIndex {
  [key: string]: GitHubRelease;
}

const oslist: string[] = [
  'amd64_linux',
  'arm64_linux',
  'armeb_linux',
  'arm_linux',
  'i386_linux',
  'mipsel_linux',
  'mips_linux',
  'powerpc64le_linux',
  'powerpc_linux',
  'riscv64_linux',
  'win32',
  'win64'
];

const os = oslist.join('|');

// Supports both:
//   upx-3.95-win64.zip
//   upx-5.2.0-win64.zip
const pattern = new RegExp(`^upx-\\d+\\.\\d+(?:\\.\\d+)?-(?:${os})\\.(?:tar\\.xz|zip)$`);

export async function fetchGithubReleases(): Promise<UPXIndex> {
  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/releases', {
      owner: 'upx',
      repo: 'upx',
      per_page: 100
    });

    const data = response.data
      .filter(release => release.assets.length > 0)
      .filter(release => !release.prerelease)
      .reduce((acc: UPXIndex, release) => {
        const assetsRecord = release.assets
          .filter(asset => pattern.test(asset.name))
          .reduce((assetAcc: Record<string, string>, asset) => {
            assetAcc[asset.name] = asset.browser_download_url;
            return assetAcc;
          }, {});

        // Don't include releases with no matching UPX binaries.
        if (Object.keys(assetsRecord).length === 0) {
          return acc;
        }

        acc[release.tag_name] = {
          id: release.id,
          tag_name: release.tag_name,
          html_url: release.html_url,
          assets: assetsRecord
        };

        return acc;
      }, {});

    // GitHub returns releases newest-first.
    const firstRelease = Object.values(data)[0];

    if (firstRelease) {
      data.latest = firstRelease;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch UPX releases:', error);
    throw error;
  }
}
