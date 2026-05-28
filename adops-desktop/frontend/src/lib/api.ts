/**
 * Wails IPC layer — replaces all fetch("/api/...") calls.
 * After `wails dev` or `wails build`, the wailsjs/go/main/App module is
 * auto-generated from app.go exports. Until first build, we import via
 * the runtime path that Wails injects at startup.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — generated at build time
import * as Go from "../../wailsjs/go/main/App";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const isSetup = (): Promise<boolean> => Go.IsSetup();
export const startLoginFlow = () => Go.StartLoginFlow();
export const logout = (): Promise<void> => Go.Logout();
export const getCurrentUser = () => Go.GetCurrentUser();
export const openBillingPage = () => Go.OpenBillingPage();
export const checkForUpdate = (): Promise<UpdateInfo> => Go.CheckForUpdate();
export const openReleasePage = (): Promise<void> => Go.OpenReleasePage();

// ─── Accounts ────────────────────────────────────────────────────────────────

export const getAccounts = (poolId = "", status = "", search = "", archived = false) =>
  Go.GetAccounts(poolId, status, search, archived);
export const createAccount = (input: AccountInput) => Go.CreateAccount(input);
export const updateAccount = (id: string, input: AccountInput) => Go.UpdateAccount(id, input);
export const archiveAccounts = (ids: string[], archive: boolean) => Go.ArchiveAccounts(ids, archive);
export const mockImportAccounts = (count: number) => Go.MockImportAccounts(count);
export const mockSyncAccount = (id: string) => Go.MockSyncAccount(id);

// ─── Pools ───────────────────────────────────────────────────────────────────

export const getPools = () => Go.GetPools();
export const createPool = (input: PoolInput) => Go.CreatePool(input);
export const deletePool = (id: string) => Go.DeletePool(id);
export const addAccountsToPool = (poolId: string, accountIds: string[]) => Go.AddAccountsToPool(poolId, accountIds);
export const removeAccountFromPool = (poolId: string, accountId: string) => Go.RemoveAccountFromPool(poolId, accountId);

// ─── Health ───────────────────────────────────────────────────────────────────

export const runHealthCheck = (adAccountId: string) => Go.RunHealthCheck(adAccountId);
export const runBulkHealthCheck = (adAccountIds: string[]) => Go.RunBulkHealthCheck(adAccountIds);
export const getHealthHistory = (adAccountId: string, limit = 10) => Go.GetHealthHistory(adAccountId, limit);

// ─── Creatives ────────────────────────────────────────────────────────────────

export const getCreatives = (geo = "", zGroup = "") => Go.GetCreatives(geo, zGroup);
export const createCreative = (input: CreativeInput) => Go.CreateCreative(input);
export const deleteCreative = (id: string) => Go.DeleteCreative(id);

// ─── Templates ────────────────────────────────────────────────────────────────

export const getTemplates = () => Go.GetTemplates();
export const createTemplate = (input: TemplateInput) => Go.CreateTemplate(input);
export const deleteTemplate = (id: string) => Go.DeleteTemplate(id);

// ─── Headline Sets ────────────────────────────────────────────────────────────

export const getHeadlineSets = () => Go.GetHeadlineSets();
export const createHeadlineSet = (input: HeadlineSetInput) => Go.CreateHeadlineSet(input);
export const keitaroSync = (name: string, keitaroUrl: string, apiKey: string, campaignId: string, geo?: string) =>
  Go.KeitaroSync(name, keitaroUrl, apiKey, campaignId, geo);
export const deleteHeadlineSet = (id: string) => Go.DeleteHeadlineSet(id);

// ─── Launch ───────────────────────────────────────────────────────────────────

export const createLaunchJob = (input: LaunchInput) => Go.CreateLaunchJob(input);
export const getLaunchJobs = (limit = 20) => Go.GetLaunchJobs(limit);
export const getLaunchJob = (id: string) => Go.GetLaunchJob(id);

// ─── Audit ────────────────────────────────────────────────────────────────────

export const getAuditLogs = (limit = 50, offset = 0) => Go.GetAuditLogs(limit, offset);

// ─── Input types (mirror generated main.* Go structs) ────────────────────────

export interface AccountInput {
  externalId: string;
  name: string;
  currency: string;
  timezone: string;
  notes?: string;
}

export interface PoolInput {
  name: string;
  description?: string;
  color: string;
}

export interface CreativeInput {
  name: string;
  type: string;
  zGroup?: string;
  geo?: string;
  mediaUrl?: string;
  headline?: string;
  primaryText?: string;
  description?: string;
  callToAction: string;
  destinationUrl?: string;
}

export interface TemplateInput {
  name: string;
  objective: string;
  campaignStatus: string;
  dailyBudget?: number;
  bidStrategy: string;
  optimizationGoal: string;
  adSetNameTpl: string;
  adNameTpl: string;
}

export interface HeadlineSetInput {
  name: string;
  geo?: string;
  headlinesJson: Record<string, string>;
}

export interface UpdateInfo {
  available: boolean;
  version: string;
  url: string;
  notes: string;
}

export interface LaunchInput {
  name: string;
  accountIds: string[];
  creativeIds: string[];
  structure: string;
  headlineSetId: string;
  campaignsPerAccount: number;
  config: Record<string, string>;
}
