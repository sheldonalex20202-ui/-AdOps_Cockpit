import { NextResponse } from "next/server";

export async function GET() {
  const version = process.env.LATEST_APP_VERSION ?? "v1.0.0";
  return NextResponse.json(
    {
      version,
      windowsUrl:
        "https://github.com/sheldonalex20202-ui/-AdOps_Cockpit/releases/latest/download/AdOpsCockpit-windows-installer.exe",
      macosArmUrl:
        "https://github.com/sheldonalex20202-ui/-AdOps_Cockpit/releases/latest/download/AdOpsCockpit-macos-arm64.dmg",
      macosIntelUrl:
        "https://github.com/sheldonalex20202-ui/-AdOps_Cockpit/releases/latest/download/AdOpsCockpit-macos-intel.dmg",
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
