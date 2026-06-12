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
export const getVersion = (): Promise<string> => Go.GetVersion();
export const startUpdate = (url: string): Promise<void> => Go.StartUpdate(url);

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
export const getLaunchJobsDetailed = (limit = 100) => Go.GetLaunchJobsDetailed(limit);

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
  angle?: string;
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
  campaignNameTpl: string;
  vertical: string;
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

// ─── Autocontrol ──────────────────────────────────────────────────────────────

export const getAutocontrolConfig = () => Go.GetAutocontrolConfig();
export const saveAutocontrolConfig = (enabled: boolean, intervalMinutes: number) =>
  Go.SaveAutocontrolConfig(enabled, intervalMinutes);
export const getGeoRules = () => Go.GetGeoRules();
export const createGeoRule = (input: GeoRuleInput) => Go.CreateGeoRule(input);
export const updateGeoRule = (id: string, input: GeoRuleInput) => Go.UpdateGeoRule(id, input);
export const deleteGeoRule = (id: string) => Go.DeleteGeoRule(id);
export const getPauseWindows = () => Go.GetPauseWindows();
export const createPauseWindow = (input: PauseWindowInput) => Go.CreatePauseWindow(input);
export const deletePauseWindow = (id: string) => Go.DeletePauseWindow(id);
export const forceRunAutocontrol = () => Go.ForceRunAutocontrol();
export const getAutocontrolCycles = (limit?: number) => Go.GetAutocontrolCycles(limit ?? 20);
export const getAutocontrolCycleDetail = (cycleId: string) => Go.GetAutocontrolCycleDetail(cycleId);

export interface GeoRuleInput {
  geo: string;
  enabled: boolean;
  maxCpa: number | null;
  maxSpendNoConv: number | null;
  maxUcpcNoConv: number | null;
  maxSpendHighUcpc: number | null;
}

export interface PauseWindowInput {
  label: string;
  dayOfWeek: number;
  startHour: number;
  endHour: number;
  enabled: boolean;
}

// ─── Autoscale ────────────────────────────────────────────────────────────────

export const getAutoscaleConfig = () => Go.GetAutoscaleConfig();
export const saveAutoscaleConfig = (enabled: boolean, intervalMinutes: number) =>
  Go.SaveAutoscaleConfig(enabled, intervalMinutes);
export const getScaleRules = () => Go.GetScaleRules();
export const createScaleRule = (input: ScaleRuleInput) => Go.CreateScaleRule(input);
export const updateScaleRule = (id: string, input: ScaleRuleInput) => Go.UpdateScaleRule(id, input);
export const deleteScaleRule = (id: string) => Go.DeleteScaleRule(id);
export const forceRunAutoscale = () => Go.ForceRunAutoscale();
export const getAutoscaleCycles = (limit?: number) => Go.GetAutoscaleCycles(limit ?? 20);
export const getAutoscaleCycleDetail = (cycleId: string) => Go.GetAutoscaleCycleDetail(cycleId);

export interface ScaleRuleInput {
  name: string;
  geo: string;
  enabled: boolean;
  minSpend: number;
  maxCpa: number;
  minConversions: number;
  cloneCount: number;
  budgetMultiplier: number;
}

// ─── AI Operator ──────────────────────────────────────────────────────────────

export const sendAIMessage    = (input: string, convID: string) => Go.SendAIMessage(input, convID);
export const confirmAIAction  = (actionID: string, convID: string) => Go.ConfirmAIAction(actionID, convID);
export const cancelAIAction   = (actionID: string) => Go.CancelAIAction(actionID);
export const clearAIConversation = (convID: string) => Go.ClearAIConversation(convID);
export const getAIConfig      = () => Go.GetAIConfig();
export const saveAIConfig     = (provider: string, apiKey: string, model: string) =>
  Go.SaveAIConfig(provider, apiKey, model);
