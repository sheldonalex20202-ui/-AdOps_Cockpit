export namespace db {
	
	export class AccountHealthCheck {
	    id: string;
	    userId: string;
	    adAccountId: string;
	    score: number;
	    status: string;
	    checksJson: Record<string, any>;
	    // Go type: time
	    createdAt: any;
	
	    static createFrom(source: any = {}) {
	        return new AccountHealthCheck(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.userId = source["userId"];
	        this.adAccountId = source["adAccountId"];
	        this.score = source["score"];
	        this.status = source["status"];
	        this.checksJson = source["checksJson"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class MetaAdAccount {
	    id: string;
	    userId: string;
	    connectionId?: string;
	    externalId: string;
	    name: string;
	    currency: string;
	    timezone: string;
	    status: string;
	    readinessStatus: string;
	    readinessScore: number;
	    billingStatus: string;
	    tokenStatus: string;
	    spendLimit?: number;
	    notes?: string;
	    // Go type: time
	    lastSyncAt?: any;
	    // Go type: time
	    lastHealthCheckAt?: any;
	    archived: boolean;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	    pools?: AccountPoolItem[];
	
	    static createFrom(source: any = {}) {
	        return new MetaAdAccount(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.userId = source["userId"];
	        this.connectionId = source["connectionId"];
	        this.externalId = source["externalId"];
	        this.name = source["name"];
	        this.currency = source["currency"];
	        this.timezone = source["timezone"];
	        this.status = source["status"];
	        this.readinessStatus = source["readinessStatus"];
	        this.readinessScore = source["readinessScore"];
	        this.billingStatus = source["billingStatus"];
	        this.tokenStatus = source["tokenStatus"];
	        this.spendLimit = source["spendLimit"];
	        this.notes = source["notes"];
	        this.lastSyncAt = this.convertValues(source["lastSyncAt"], null);
	        this.lastHealthCheckAt = this.convertValues(source["lastHealthCheckAt"], null);
	        this.archived = source["archived"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	        this.pools = this.convertValues(source["pools"], AccountPoolItem);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class AccountPoolItem {
	    id: string;
	    userId: string;
	    poolId: string;
	    adAccountId: string;
	    // Go type: time
	    createdAt: any;
	    pool?: AccountPool;
	    adAccount?: MetaAdAccount;
	
	    static createFrom(source: any = {}) {
	        return new AccountPoolItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.userId = source["userId"];
	        this.poolId = source["poolId"];
	        this.adAccountId = source["adAccountId"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.pool = this.convertValues(source["pool"], AccountPool);
	        this.adAccount = this.convertValues(source["adAccount"], MetaAdAccount);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class AccountPool {
	    id: string;
	    userId: string;
	    name: string;
	    description?: string;
	    color: string;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	    items?: AccountPoolItem[];
	
	    static createFrom(source: any = {}) {
	        return new AccountPool(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.userId = source["userId"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.color = source["color"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	        this.items = this.convertValues(source["items"], AccountPoolItem);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class AuditLog {
	    id: string;
	    userId?: string;
	    action: string;
	    objectType: string;
	    objectId?: string;
	    oldValueJson: Record<string, any>;
	    newValueJson: Record<string, any>;
	    result: string;
	    errorMessage?: string;
	    // Go type: time
	    createdAt: any;
	
	    static createFrom(source: any = {}) {
	        return new AuditLog(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.userId = source["userId"];
	        this.action = source["action"];
	        this.objectType = source["objectType"];
	        this.objectId = source["objectId"];
	        this.oldValueJson = source["oldValueJson"];
	        this.newValueJson = source["newValueJson"];
	        this.result = source["result"];
	        this.errorMessage = source["errorMessage"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CampaignTemplate {
	    id: string;
	    userId: string;
	    name: string;
	    objective: string;
	    buyingType: string;
	    campaignStatus: string;
	    dailyBudget?: number;
	    bidStrategy: string;
	    optimizationGoal: string;
	    billingEvent: string;
	    targetingJson: Record<string, any>;
	    adSetNameTpl: string;
	    adNameTpl: string;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new CampaignTemplate(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.userId = source["userId"];
	        this.name = source["name"];
	        this.objective = source["objective"];
	        this.buyingType = source["buyingType"];
	        this.campaignStatus = source["campaignStatus"];
	        this.dailyBudget = source["dailyBudget"];
	        this.bidStrategy = source["bidStrategy"];
	        this.optimizationGoal = source["optimizationGoal"];
	        this.billingEvent = source["billingEvent"];
	        this.targetingJson = source["targetingJson"];
	        this.adSetNameTpl = source["adSetNameTpl"];
	        this.adNameTpl = source["adNameTpl"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Creative {
	    id: string;
	    userId: string;
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
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new Creative(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.userId = source["userId"];
	        this.name = source["name"];
	        this.type = source["type"];
	        this.zGroup = source["zGroup"];
	        this.geo = source["geo"];
	        this.mediaUrl = source["mediaUrl"];
	        this.headline = source["headline"];
	        this.primaryText = source["primaryText"];
	        this.description = source["description"];
	        this.callToAction = source["callToAction"];
	        this.destinationUrl = source["destinationUrl"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class HeadlineSet {
	    id: string;
	    userId: string;
	    name: string;
	    source: string;
	    externalId?: string;
	    geo?: string;
	    headlinesJson: Record<string, any>;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new HeadlineSet(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.userId = source["userId"];
	        this.name = source["name"];
	        this.source = source["source"];
	        this.externalId = source["externalId"];
	        this.geo = source["geo"];
	        this.headlinesJson = source["headlinesJson"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class LaunchJobItem {
	    id: string;
	    launchJobId: string;
	    adAccountId: string;
	    userId: string;
	    status: string;
	    errorMessage?: string;
	    resultJson: Record<string, any>;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	    adAccount?: MetaAdAccount;
	
	    static createFrom(source: any = {}) {
	        return new LaunchJobItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.launchJobId = source["launchJobId"];
	        this.adAccountId = source["adAccountId"];
	        this.userId = source["userId"];
	        this.status = source["status"];
	        this.errorMessage = source["errorMessage"];
	        this.resultJson = source["resultJson"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	        this.adAccount = this.convertValues(source["adAccount"], MetaAdAccount);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class LaunchJob {
	    id: string;
	    userId: string;
	    name: string;
	    campaignTemplateId?: string;
	    status: string;
	    totalAccounts: number;
	    successCount: number;
	    failedCount: number;
	    configJson: Record<string, any>;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	    // Go type: time
	    completedAt?: any;
	    items?: LaunchJobItem[];
	
	    static createFrom(source: any = {}) {
	        return new LaunchJob(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.userId = source["userId"];
	        this.name = source["name"];
	        this.campaignTemplateId = source["campaignTemplateId"];
	        this.status = source["status"];
	        this.totalAccounts = source["totalAccounts"];
	        this.successCount = source["successCount"];
	        this.failedCount = source["failedCount"];
	        this.configJson = source["configJson"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	        this.completedAt = this.convertValues(source["completedAt"], null);
	        this.items = this.convertValues(source["items"], LaunchJobItem);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class AutocontrolConfig {
	    id: string;
	    userId: string;
	    enabled: boolean;
	    intervalMinutes: number;
	    lastRunAt?: any;
	    createdAt: any;
	    updatedAt: any;

	    static createFrom(source: any = {}) { return new AutocontrolConfig(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.userId = source["userId"];
	        this.enabled = source["enabled"];
	        this.intervalMinutes = source["intervalMinutes"];
	        this.lastRunAt = source["lastRunAt"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class GeoRule {
	    id: string;
	    userId: string;
	    geo: string;
	    enabled: boolean;
	    maxCpa?: number;
	    maxSpendNoConv?: number;
	    maxUcpcNoConv?: number;
	    maxSpendHighUcpc?: number;
	    createdAt: any;
	    updatedAt: any;

	    static createFrom(source: any = {}) { return new GeoRule(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.userId = source["userId"];
	        this.geo = source["geo"];
	        this.enabled = source["enabled"];
	        this.maxCpa = source["maxCpa"];
	        this.maxSpendNoConv = source["maxSpendNoConv"];
	        this.maxUcpcNoConv = source["maxUcpcNoConv"];
	        this.maxSpendHighUcpc = source["maxSpendHighUcpc"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class PauseWindow {
	    id: string;
	    userId: string;
	    label: string;
	    dayOfWeek: number;
	    startHour: number;
	    endHour: number;
	    enabled: boolean;
	    createdAt: any;
	    updatedAt: any;

	    static createFrom(source: any = {}) { return new PauseWindow(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.userId = source["userId"];
	        this.label = source["label"];
	        this.dayOfWeek = source["dayOfWeek"];
	        this.startHour = source["startHour"];
	        this.endHour = source["endHour"];
	        this.enabled = source["enabled"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class AutocontrolCycleItem {
	    id: string;
	    cycleId: string;
	    userId: string;
	    adAccountId: string;
	    adAccountName: string;
	    adSetId: string;
	    adSetName: string;
	    geo: string;
	    action: string;
	    reason: string;
	    metricsJson: Record<string, any>;
	    createdAt: any;

	    static createFrom(source: any = {}) { return new AutocontrolCycleItem(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.cycleId = source["cycleId"];
	        this.userId = source["userId"];
	        this.adAccountId = source["adAccountId"];
	        this.adAccountName = source["adAccountName"];
	        this.adSetId = source["adSetId"];
	        this.adSetName = source["adSetName"];
	        this.geo = source["geo"];
	        this.action = source["action"];
	        this.reason = source["reason"];
	        this.metricsJson = source["metricsJson"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class AutocontrolCycle {
	    id: string;
	    userId: string;
	    status: string;
	    actionsTaken: number;
	    paused: number;
	    resumed: number;
	    skipped: number;
	    errorMessage?: string;
	    startedAt: any;
	    completedAt?: any;
	    items?: AutocontrolCycleItem[];

	    static createFrom(source: any = {}) { return new AutocontrolCycle(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.userId = source["userId"];
	        this.status = source["status"];
	        this.actionsTaken = source["actionsTaken"];
	        this.paused = source["paused"];
	        this.resumed = source["resumed"];
	        this.skipped = source["skipped"];
	        this.errorMessage = source["errorMessage"];
	        this.startedAt = source["startedAt"];
	        this.completedAt = source["completedAt"];
	        this.items = source["items"];
	    }
	}
	export class AutoscaleConfig {
	    id: string;
	    userId: string;
	    enabled: boolean;
	    intervalMinutes: number;
	    lastRunAt?: any;
	    createdAt: any;
	    updatedAt: any;

	    static createFrom(source: any = {}) { return new AutoscaleConfig(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.userId = source["userId"];
	        this.enabled = source["enabled"];
	        this.intervalMinutes = source["intervalMinutes"];
	        this.lastRunAt = source["lastRunAt"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class ScaleRule {
	    id: string;
	    userId: string;
	    name: string;
	    geo: string;
	    enabled: boolean;
	    minSpend: number;
	    maxCpa: number;
	    minConversions: number;
	    cloneCount: number;
	    budgetMultiplier: number;
	    createdAt: any;
	    updatedAt: any;

	    static createFrom(source: any = {}) { return new ScaleRule(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.userId = source["userId"];
	        this.name = source["name"];
	        this.geo = source["geo"];
	        this.enabled = source["enabled"];
	        this.minSpend = source["minSpend"];
	        this.maxCpa = source["maxCpa"];
	        this.minConversions = source["minConversions"];
	        this.cloneCount = source["cloneCount"];
	        this.budgetMultiplier = source["budgetMultiplier"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class AutoscaleCycleItem {
	    id: string;
	    cycleId: string;
	    userId: string;
	    adAccountId: string;
	    adAccountName: string;
	    campaignId: string;
	    campaignName: string;
	    geo: string;
	    action: string;
	    clonesCreated: number;
	    reason: string;
	    metricsJson: Record<string, any>;
	    createdAt: any;

	    static createFrom(source: any = {}) { return new AutoscaleCycleItem(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.cycleId = source["cycleId"];
	        this.userId = source["userId"];
	        this.adAccountId = source["adAccountId"];
	        this.adAccountName = source["adAccountName"];
	        this.campaignId = source["campaignId"];
	        this.campaignName = source["campaignName"];
	        this.geo = source["geo"];
	        this.action = source["action"];
	        this.clonesCreated = source["clonesCreated"];
	        this.reason = source["reason"];
	        this.metricsJson = source["metricsJson"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class AutoscaleCycle {
	    id: string;
	    userId: string;
	    status: string;
	    candidatesChecked: number;
	    clonesCreated: number;
	    skipped: number;
	    errorMessage?: string;
	    startedAt: any;
	    completedAt?: any;
	    items?: AutoscaleCycleItem[];

	    static createFrom(source: any = {}) { return new AutoscaleCycle(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.userId = source["userId"];
	        this.status = source["status"];
	        this.candidatesChecked = source["candidatesChecked"];
	        this.clonesCreated = source["clonesCreated"];
	        this.skipped = source["skipped"];
	        this.errorMessage = source["errorMessage"];
	        this.startedAt = source["startedAt"];
	        this.completedAt = source["completedAt"];
	        this.items = source["items"];
	    }
	}

}

export namespace license {
	
	export class Status {
	    valid: boolean;
	    key: string;
	    // Go type: time
	    expiresAt?: any;
	
	    static createFrom(source: any = {}) {
	        return new Status(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.valid = source["valid"];
	        this.key = source["key"];
	        this.expiresAt = this.convertValues(source["expiresAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace main {
	
	export class AccountInput {
	    externalId: string;
	    name: string;
	    currency: string;
	    timezone: string;
	    notes?: string;
	
	    static createFrom(source: any = {}) {
	        return new AccountInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.externalId = source["externalId"];
	        this.name = source["name"];
	        this.currency = source["currency"];
	        this.timezone = source["timezone"];
	        this.notes = source["notes"];
	    }
	}
	export class AccountsResult {
	    accounts: db.MetaAdAccount[];
	    total: number;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new AccountsResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.accounts = this.convertValues(source["accounts"], db.MetaAdAccount);
	        this.total = source["total"];
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class AuthResponse {
	    user?: session.User;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new AuthResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.user = this.convertValues(source["user"], session.User);
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CreativeInput {
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
	
	    static createFrom(source: any = {}) {
	        return new CreativeInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.type = source["type"];
	        this.zGroup = source["zGroup"];
	        this.geo = source["geo"];
	        this.mediaUrl = source["mediaUrl"];
	        this.headline = source["headline"];
	        this.primaryText = source["primaryText"];
	        this.description = source["description"];
	        this.callToAction = source["callToAction"];
	        this.destinationUrl = source["destinationUrl"];
	    }
	}
	export class CreativesResult {
	    creatives: db.Creative[];
	
	    static createFrom(source: any = {}) {
	        return new CreativesResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.creatives = this.convertValues(source["creatives"], db.Creative);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class HeadlineSetInput {
	    name: string;
	    geo?: string;
	    headlinesJson: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new HeadlineSetInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.geo = source["geo"];
	        this.headlinesJson = source["headlinesJson"];
	    }
	}
	export class HeadlineSetsResult {
	    sets: db.HeadlineSet[];
	
	    static createFrom(source: any = {}) {
	        return new HeadlineSetsResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sets = this.convertValues(source["sets"], db.HeadlineSet);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class HealthResult {
	    check?: db.AccountHealthCheck;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new HealthResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.check = this.convertValues(source["check"], db.AccountHealthCheck);
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class LaunchInput {
	    name: string;
	    accountIds: string[];
	    creativeIds: string[];
	    structure: string;
	    headlineSetId: string;
	    campaignsPerAccount: number;
	    config: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new LaunchInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.accountIds = source["accountIds"];
	        this.creativeIds = source["creativeIds"];
	        this.structure = source["structure"];
	        this.headlineSetId = source["headlineSetId"];
	        this.campaignsPerAccount = source["campaignsPerAccount"];
	        this.config = source["config"];
	    }
	}
	export class LaunchResult {
	    job?: db.LaunchJob;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new LaunchResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.job = this.convertValues(source["job"], db.LaunchJob);
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class LoginFlowResponse {
	    url?: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new LoginFlowResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.url = source["url"];
	        this.error = source["error"];
	    }
	}
	export class PoolInput {
	    name: string;
	    description?: string;
	    color: string;
	
	    static createFrom(source: any = {}) {
	        return new PoolInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.description = source["description"];
	        this.color = source["color"];
	    }
	}
	export class PoolsResult {
	    pools: db.AccountPool[];
	
	    static createFrom(source: any = {}) {
	        return new PoolsResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pools = this.convertValues(source["pools"], db.AccountPool);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TemplateInput {
	    name: string;
	    objective: string;
	    campaignStatus: string;
	    dailyBudget?: number;
	    bidStrategy: string;
	    optimizationGoal: string;
	    adSetNameTpl: string;
	    adNameTpl: string;
	
	    static createFrom(source: any = {}) {
	        return new TemplateInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.objective = source["objective"];
	        this.campaignStatus = source["campaignStatus"];
	        this.dailyBudget = source["dailyBudget"];
	        this.bidStrategy = source["bidStrategy"];
	        this.optimizationGoal = source["optimizationGoal"];
	        this.adSetNameTpl = source["adSetNameTpl"];
	        this.adNameTpl = source["adNameTpl"];
	    }
	}
	export class TemplatesResult {
	    templates: db.CampaignTemplate[];
	
	    static createFrom(source: any = {}) {
	        return new TemplatesResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.templates = this.convertValues(source["templates"], db.CampaignTemplate);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class GeoRuleInput {
	    geo: string;
	    enabled: boolean;
	    maxCpa: number | null;
	    maxSpendNoConv: number | null;
	    maxUcpcNoConv: number | null;
	    maxSpendHighUcpc: number | null;

	    static createFrom(source: any = {}) { return new GeoRuleInput(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.geo = source["geo"];
	        this.enabled = source["enabled"];
	        this.maxCpa = source["maxCpa"];
	        this.maxSpendNoConv = source["maxSpendNoConv"];
	        this.maxUcpcNoConv = source["maxUcpcNoConv"];
	        this.maxSpendHighUcpc = source["maxSpendHighUcpc"];
	    }
	}
	export class PauseWindowInput {
	    label: string;
	    dayOfWeek: number;
	    startHour: number;
	    endHour: number;
	    enabled: boolean;

	    static createFrom(source: any = {}) { return new PauseWindowInput(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.label = source["label"];
	        this.dayOfWeek = source["dayOfWeek"];
	        this.startHour = source["startHour"];
	        this.endHour = source["endHour"];
	        this.enabled = source["enabled"];
	    }
	}
	export class AutocontrolConfigResult {
	    config: db.AutocontrolConfig;
	    error?: string;

	    static createFrom(source: any = {}) { return new AutocontrolConfigResult(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.config = this.convertValues(source["config"], db.AutocontrolConfig);
	        this.error = source["error"];
	    }
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) { return a; }
		    if (a.slice && a.map) { return (a as any[]).map(elem => this.convertValues(elem, classs)); }
		    else if ("object" === typeof a) { if (asMap) { for (const key of Object.keys(a)) { a[key] = new classs(a[key]); } return a; } return new classs(a); }
		    return a;
		}
	}
	export class GeoRulesResult {
	    rules: db.GeoRule[];
	    error?: string;

	    static createFrom(source: any = {}) { return new GeoRulesResult(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.rules = source["rules"];
	        this.error = source["error"];
	    }
	}
	export class PauseWindowsResult {
	    windows: db.PauseWindow[];
	    error?: string;

	    static createFrom(source: any = {}) { return new PauseWindowsResult(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.windows = source["windows"];
	        this.error = source["error"];
	    }
	}
	export class AutocontrolCyclesResult {
	    cycles: db.AutocontrolCycle[];
	    error?: string;

	    static createFrom(source: any = {}) { return new AutocontrolCyclesResult(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cycles = source["cycles"];
	        this.error = source["error"];
	    }
	}
	export class AutocontrolCycleDetailResult {
	    cycle: db.AutocontrolCycle;
	    error?: string;

	    static createFrom(source: any = {}) { return new AutocontrolCycleDetailResult(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cycle = source["cycle"];
	        this.error = source["error"];
	    }
	}
	export class ScaleRuleInput {
	    name: string;
	    geo: string;
	    enabled: boolean;
	    minSpend: number;
	    maxCpa: number;
	    minConversions: number;
	    cloneCount: number;
	    budgetMultiplier: number;

	    static createFrom(source: any = {}) { return new ScaleRuleInput(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.geo = source["geo"];
	        this.enabled = source["enabled"];
	        this.minSpend = source["minSpend"];
	        this.maxCpa = source["maxCpa"];
	        this.minConversions = source["minConversions"];
	        this.cloneCount = source["cloneCount"];
	        this.budgetMultiplier = source["budgetMultiplier"];
	    }
	}
	export class AutoscaleConfigResult {
	    config: db.AutoscaleConfig;
	    error?: string;

	    static createFrom(source: any = {}) { return new AutoscaleConfigResult(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.config = source["config"];
	        this.error = source["error"];
	    }
	}
	export class ScaleRulesResult {
	    rules: db.ScaleRule[];
	    error?: string;

	    static createFrom(source: any = {}) { return new ScaleRulesResult(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.rules = source["rules"];
	        this.error = source["error"];
	    }
	}
	export class AutoscaleCyclesResult {
	    cycles: db.AutoscaleCycle[];
	    error?: string;

	    static createFrom(source: any = {}) { return new AutoscaleCyclesResult(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cycles = source["cycles"];
	        this.error = source["error"];
	    }
	}
	export class AutoscaleCycleDetailResult {
	    cycle: db.AutoscaleCycle;
	    error?: string;

	    static createFrom(source: any = {}) { return new AutoscaleCycleDetailResult(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cycle = source["cycle"];
	        this.error = source["error"];
	    }
	}

	export class AIOperatorResult {
	    reply: string;
	    toolsExecuted?: any[];
	    pendingAction?: any;
	    navigateTo?: string;
	    error?: string;

	    static createFrom(source: any = {}) { return new AIOperatorResult(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.reply = source["reply"];
	        this.toolsExecuted = source["toolsExecuted"];
	        this.pendingAction = source["pendingAction"];
	        this.navigateTo = source["navigateTo"];
	        this.error = source["error"];
	    }
	}

	export class AIConfigResult {
	    groqApiKey: string;

	    static createFrom(source: any = {}) { return new AIConfigResult(source); }
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.groqApiKey = source["groqApiKey"] ?? "";
	    }
	}

}

export namespace session {
	
	export class User {
	    id: string;
	    email: string;
	    name: string;
	    plan: string;
	    expiresAt: string;
	
	    static createFrom(source: any = {}) {
	        return new User(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.email = source["email"];
	        this.name = source["name"];
	        this.plan = source["plan"];
	        this.expiresAt = source["expiresAt"];
	    }
	}

}

