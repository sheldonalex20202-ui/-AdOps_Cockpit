import { NextResponse } from "next/server";

const BASE = "https://ad-ops-cockpit.vercel.app";

export async function GET() {
  const version = process.env.LATEST_APP_VERSION ?? "v1.0.0";
  return NextResponse.json(
    {
      version,
      windowsUrl:   `${BASE}/api/download/windows`,
      macosArmUrl:  `${BASE}/api/download/macos-arm`,
      macosIntelUrl:`${BASE}/api/download/macos-intel`,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
