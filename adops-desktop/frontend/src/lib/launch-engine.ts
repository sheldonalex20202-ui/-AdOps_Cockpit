export type LaunchStructure = "CBO" | "ABO" | "ISOLATION" | "Z_GROUPED";

const MOCK_ERRORS = [
  "Meta API: Account temporarily restricted",
  "Meta API: Invalid token — refresh required",
  "Meta API: Daily spend limit reached",
  "Meta API: Account needs business verification",
  "Meta API: Rate limit exceeded, retry in 60s",
  "Meta API: Billing threshold not set",
];

function mid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`;
}

function applyTpl(tpl: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), tpl);
}

function dateStr() {
  return new Date().toISOString().slice(0, 10);
}

export type CreativeRef = { id: string; name: string; zGroup?: string | null; geo?: string | null };

// ─── Structure builders ───────────────────────────────────────────────────────

function buildCBO(accountName: string, creatives: CreativeRef[], cfg: Record<string, string>) {
  const vars = { account: accountName, date: dateStr(), objective: cfg.objective, creative: "all" };
  const campaignName = applyTpl(cfg.campaignNameTpl, vars);
  return {
    structure: "CBO",
    campaign: { id: mid("camp"), name: campaignName },
    adSets: creatives.map((c) => ({
      adSetId: mid("adset"),
      adSetName: applyTpl(cfg.adSetNameTpl, { ...vars, creative: c.name }),
      adId: mid("ad"),
      creativeName: c.name,
    })),
    totalCampaigns: 1,
    totalAdSets: creatives.length,
    totalAds: creatives.length,
  };
}

function buildABO(accountName: string, creatives: CreativeRef[], cfg: Record<string, string>) {
  const vars = { account: accountName, date: dateStr(), objective: cfg.objective, creative: "all" };
  return {
    structure: "ABO",
    campaign: { id: mid("camp"), name: applyTpl(cfg.campaignNameTpl, vars) },
    adSet: { id: mid("adset"), name: applyTpl(cfg.adSetNameTpl, vars) },
    ads: creatives.map((c) => ({ adId: mid("ad"), creativeName: c.name })),
    totalCampaigns: 1,
    totalAdSets: 1,
    totalAds: creatives.length,
  };
}

function buildISOLATION(accountName: string, creatives: CreativeRef[], cfg: Record<string, string>) {
  return {
    structure: "ISOLATION",
    campaigns: creatives.map((c) => {
      const vars = { account: accountName, date: dateStr(), objective: cfg.objective, creative: c.name };
      return {
        campaignId: mid("camp"),
        campaignName: applyTpl(cfg.campaignNameTpl, vars),
        adSetId: mid("adset"),
        adId: mid("ad"),
        creativeName: c.name,
      };
    }),
    totalCampaigns: creatives.length,
    totalAdSets: creatives.length,
    totalAds: creatives.length,
  };
}

function buildZGrouped(
  accountName: string,
  creatives: CreativeRef[],
  cfg: Record<string, string>,
  headlines: Record<string, string>,
  campaignsPerAccount: number
) {
  // Group creatives by Z-group
  const byZ = new Map<string, CreativeRef[]>();
  for (const c of creatives) {
    const z = c.zGroup ?? "Z0";
    if (!byZ.has(z)) byZ.set(z, []);
    byZ.get(z)!.push(c);
  }
  const zGroups = [...byZ.keys()].sort();

  const campaigns = [];
  for (let i = 1; i <= campaignsPerAccount; i++) {
    const vars = { account: accountName, date: dateStr(), objective: cfg.objective, num: String(i) };
    const campaignName = applyTpl(cfg.campaignNameTpl, vars) + (campaignsPerAccount > 1 ? ` | C${i}` : "");
    const adSets = zGroups.map((z) => {
      const headline = headlines[z] ?? "";
      const zCreatives = byZ.get(z) ?? [];
      return {
        adSetId: mid("adset"),
        adSetName: applyTpl(cfg.adSetNameTpl, { ...vars, creative: z, zGroup: z }),
        zGroup: z,
        headline,
        ads: zCreatives.map((c) => ({ adId: mid("ad"), creativeName: c.name })),
      };
    });
    campaigns.push({ campaignId: mid("camp"), campaignName, adSets });
  }

  const totalAds = campaigns.reduce(
    (sum, camp) => sum + camp.adSets.reduce((s, as) => s + as.ads.length, 0), 0
  );

  return {
    structure: "Z_GROUPED",
    campaigns,
    totalCampaigns: campaigns.length,
    totalAdSets: campaigns.length * zGroups.length,
    totalAds,
  };
}

// ─── Totals calculator (used in UI) ──────────────────────────────────────────

export function calcTotals(
  structure: LaunchStructure,
  accounts: number,
  creatives: number,
  zGroups: number = 0,
  campaignsPerAccount: number = 1
) {
  if (structure === "CBO")
    return { campaigns: accounts, adSets: accounts * creatives, ads: accounts * creatives };
  if (structure === "ABO")
    return { campaigns: accounts, adSets: accounts, ads: accounts * creatives };
  if (structure === "ISOLATION")
    return { campaigns: accounts * creatives, adSets: accounts * creatives, ads: accounts * creatives };
  // Z_GROUPED
  const effectiveZGroups = zGroups || 1;
  return {
    campaigns: accounts * campaignsPerAccount,
    adSets: accounts * campaignsPerAccount * effectiveZGroups,
    ads: accounts * campaignsPerAccount * creatives,
  };
}

// ─── Parse creative filename ──────────────────────────────────────────────────
// Format: OFFER-GEO-DATE-VERSION-ZNUM  e.g. SKANDAL-ES-1805-2-Z1

export function parseCreativeFilename(name: string): {
  offerName: string;
  geo: string | null;
  date: string | null;
  version: string | null;
  zNum: string | null;
} {
  const clean = name.replace(/\.[^.]+$/, ""); // strip extension
  const match = clean.match(/^(.+?)-([A-Z]{2,4})-(\d{4})-(\d+)-(Z\d+)$/i);
  if (match) {
    return {
      offerName: match[1].toUpperCase(),
      geo: match[2].toUpperCase(),
      date: match[3],
      version: match[4],
      zNum: match[5].toUpperCase(),
    };
  }
  // Fallback: extract just Z-num from end
  const zMatch = clean.match(/[_\-\s](Z\d+)$/i) ?? clean.match(/(Z\d+)$/i);
  return { offerName: clean, geo: null, date: null, version: null, zNum: zMatch?.[1]?.toUpperCase() ?? null };
}

export function parseZGroup(filename: string): string | null {
  return parseCreativeFilename(filename).zNum;
}

// runLaunchJob moved to Go backend (internal/launch/engine.go)
