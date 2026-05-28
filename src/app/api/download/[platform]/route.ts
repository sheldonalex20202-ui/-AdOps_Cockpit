import { NextRequest, NextResponse } from "next/server";
import { get } from "https";
import type { IncomingMessage } from "http";

const REPO = "sheldonalex20202-ui/-AdOps_Cockpit";

const ASSET_NAMES: Record<string, string> = {
  windows:       "AdOpsCockpit-windows-installer.exe",
  "macos-arm":   "AdOpsCockpit-macos-arm64.dmg",
  "macos-intel": "AdOpsCockpit-macos-intel.dmg",
};

// GitHub returns a 302 to a pre-signed CDN URL when fetching an asset with
// Accept: application/octet-stream. We capture that URL using the Node.js
// https module (native fetch doesn't expose the Location header on opaque
// redirects in all environments).
function resolveSignedUrl(apiUrl: string, token: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = get(
      apiUrl,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/octet-stream",
          "User-Agent": "AdOpsCockpit-Updater/1.0",
        },
      },
      (res: IncomingMessage) => {
        res.resume(); // drain so the socket is freed
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          resolve(res.headers.location);
        } else {
          reject(new Error(`github asset redirect: got ${res.statusCode}`));
        }
      }
    );
    req.on("error", reject);
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { platform: string } }
) {
  const token = process.env.GITHUB_RELEASES_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "GITHUB_RELEASES_TOKEN not set" }, { status: 500 });
  }

  const assetName = ASSET_NAMES[params.platform];
  if (!assetName) {
    return NextResponse.json({ error: "unknown platform" }, { status: 400 });
  }

  // 1. Fetch latest release metadata to get asset IDs
  const releaseRes = await fetch(
    `https://api.github.com/repos/${REPO}/releases/latest`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "AdOpsCockpit-Updater/1.0",
      },
      cache: "no-store",
    }
  );

  if (!releaseRes.ok) {
    return NextResponse.json(
      { error: `github releases api: ${releaseRes.status}` },
      { status: 502 }
    );
  }

  const release = await releaseRes.json();
  const asset = (release.assets as Array<{ name: string; url: string }> | undefined)
    ?.find((a) => a.name === assetName);

  if (!asset) {
    return NextResponse.json({ error: "asset not found in latest release" }, { status: 404 });
  }

  // 2. Get the pre-signed CDN URL from GitHub (302 redirect) and forward it
  const signedUrl = await resolveSignedUrl(asset.url, token);
  return NextResponse.redirect(signedUrl, { status: 302 });
}
