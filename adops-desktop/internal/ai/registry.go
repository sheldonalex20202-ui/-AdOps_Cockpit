package ai

import (
	"fmt"
	"math/rand"
	"strings"
	"time"

	"adops-desktop/internal/autocontrol"
	"adops-desktop/internal/autoscale"
	"adops-desktop/internal/db"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Tool defines an AI-callable operation.
type Tool struct {
	Name                 string
	Description          string
	Risk                 Risk
	RequiresConfirmation bool
	Schema               map[string]interface{}
	Execute              func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error)
}

var registry = map[string]*Tool{
	// Accounts
	"accounts_search":            toolAccountsSearch,
	"accounts_explain_readiness": toolAccountsExplainReadiness,
	"accounts_delete":            toolAccountsDelete,
	"accounts_update":            toolAccountsUpdate,
	// Pools
	"pools_list":            toolPoolsList,
	"pools_create":          toolPoolsCreate,
	"pools_rename":          toolPoolsRename,
	"pools_delete":          toolPoolsDelete,
	"pools_add_accounts":    toolPoolsAddAccounts,
	"pools_remove_accounts": toolPoolsRemoveAccounts,
	"pools_clear":           toolPoolsClear,
	// Creatives
	"creatives_list":   toolCreativesList,
	"creatives_delete": toolCreativesDelete,
	// Campaign templates
	"templates_list":   toolTemplatesList,
	"templates_delete": toolTemplatesDelete,
	// Launch jobs
	"launch_jobs_list": toolLaunchJobsList,
	// Autocontrol
	"autocontrol_get": toolAutocontrolGet,
	"autocontrol_set": toolAutocontrolSet,
	"autocontrol_run": toolAutocontrolRun,
	// Geo rules (autocontrol)
	"geo_rules_list":   toolGeoRulesList,
	"geo_rules_upsert": toolGeoRulesUpsert,
	"geo_rules_delete": toolGeoRulesDelete,
	// Autoscale
	"autoscale_get": toolAutoscaleGet,
	"autoscale_set": toolAutoscaleSet,
	"autoscale_run": toolAutoscaleRun,
	// Integrations
	"connections_list": toolConnectionsList,
	// Misc / nuclear
	"data_reset":           toolDataReset,
	"health_run_bulk":      toolHealthRunBulk,
	"audit_recent":         toolAuditRecent,
	"navigation_open_page": toolNavigationOpenPage,
	"workspace_status":     toolWorkspaceStatus,
}

// GetTool returns a tool by name or nil.
func GetTool(name string) *Tool { return registry[name] }

// AllToolSchemas returns Anthropic-format tool definitions.
func AllToolSchemas() []map[string]interface{} {
	out := make([]map[string]interface{}, 0, len(registry))
	for _, t := range registry {
		out = append(out, map[string]interface{}{
			"name":         t.Name,
			"description":  t.Description,
			"input_schema": t.Schema,
		})
	}
	return out
}

// labelForTool returns a human-readable label.
func labelForTool(name string) string {
	m := map[string]string{
		"accounts_search":            "Поиск кабинетов",
		"accounts_explain_readiness": "Анализ readiness",
		"accounts_delete":            "Удаление кабинетов",
		"accounts_update":            "Обновление кабинета",
		"pools_list":                 "Список пулов",
		"pools_create":               "Создание пула",
		"pools_rename":               "Переименование пула",
		"pools_delete":               "Удаление пула",
		"pools_add_accounts":         "Добавление в пул",
		"pools_remove_accounts":      "Удаление из пула",
		"pools_clear":                "Очистка пула",
		"creatives_list":             "Список креативов",
		"creatives_delete":           "Удаление креативов",
		"templates_list":             "Список шаблонов",
		"templates_delete":           "Удаление шаблонов",
		"launch_jobs_list":           "История автозалива",
		"autocontrol_get":            "Автоконтроль — статус",
		"autocontrol_set":            "Автоконтроль — настройки",
		"autocontrol_run":            "Автоконтроль — запуск",
		"geo_rules_list":             "Гео-правила",
		"geo_rules_upsert":           "Гео-правило — сохранить",
		"geo_rules_delete":           "Гео-правило — удалить",
		"autoscale_get":              "Автоскейл — статус",
		"autoscale_set":              "Автоскейл — настройки",
		"autoscale_run":              "Автоскейл — запуск",
		"connections_list":           "Интеграции Meta",
		"data_reset":                 "Сброс данных",
		"health_run_bulk":            "Health Check",
		"audit_recent":               "Лог действий",
		"navigation_open_page":       "Навигация",
		"workspace_status":           "Обзор workspace",
	}
	if l, ok := m[name]; ok {
		return l
	}
	return strings.ReplaceAll(name, "_", " ")
}

// strSlice safely converts []interface{} → []string.
func strSlice(v interface{}) []string {
	raw, _ := v.([]interface{})
	out := make([]string, 0, len(raw))
	for _, r := range raw {
		if s, ok := r.(string); ok && s != "" {
			out = append(out, s)
		}
	}
	return out
}

// ─── accounts_search ─────────────────────────────────────────────────────────

var toolAccountsSearch = &Tool{
	Name:        "accounts_search",
	Description: "Search ad accounts by status, readiness, name, or pool. Returns matching accounts with their current state.",
	Risk:        RiskRead,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"status":    map[string]interface{}{"type": "string", "description": "ACTIVE | LIMITED | DISABLED | BILLING_ISSUE"},
			"readiness": map[string]interface{}{"type": "string", "description": "READY | NEEDS_ATTENTION | BLOCKED"},
			"search":    map[string]interface{}{"type": "string", "description": "Name or external ID substring"},
			"poolId":    map[string]interface{}{"type": "string", "description": "Filter by pool ID"},
		},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		q := gdb.Where("user_id = ? AND archived = false", userID)
		if v, _ := input["status"].(string); v != "" {
			q = q.Where("status = ?", v)
		}
		if v, _ := input["readiness"].(string); v != "" {
			q = q.Where("readiness_status = ?", v)
		}
		if v, _ := input["search"].(string); v != "" {
			q = q.Where("name LIKE ? OR external_id LIKE ?", "%"+v+"%", "%"+v+"%")
		}
		if v, _ := input["poolId"].(string); v != "" {
			var ids []string
			gdb.Model(&db.AccountPoolItem{}).Where("pool_id = ?", v).Pluck("ad_account_id", &ids)
			q = q.Where("id IN ?", ids)
		}
		var accounts []db.MetaAdAccount
		q.Order("readiness_score desc").Limit(25).Find(&accounts)

		type row struct {
			ID              string `json:"id"`
			Name            string `json:"name"`
			ExternalID      string `json:"externalId"`
			Status          string `json:"status"`
			ReadinessStatus string `json:"readinessStatus"`
			ReadinessScore  int    `json:"readinessScore"`
			BillingStatus   string `json:"billingStatus"`
		}
		rows := make([]row, 0, len(accounts))
		for _, a := range accounts {
			rows = append(rows, row{
				ID: a.ID, Name: a.Name, ExternalID: a.ExternalID,
				Status: string(a.Status), ReadinessStatus: string(a.ReadinessStatus),
				ReadinessScore: a.ReadinessScore, BillingStatus: string(a.BillingStatus),
			})
		}
		return map[string]interface{}{"count": len(rows), "accounts": rows}, nil
	},
}

// ─── accounts_explain_readiness ──────────────────────────────────────────────

var toolAccountsExplainReadiness = &Tool{
	Name:        "accounts_explain_readiness",
	Description: "Explain why an account has its current readiness status and what needs to be fixed.",
	Risk:        RiskRead,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"accountId": map[string]interface{}{"type": "string", "description": "Account ID"},
		},
		"required": []string{"accountId"},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		id, _ := input["accountId"].(string)
		if id == "" {
			return nil, fmt.Errorf("accountId required")
		}
		var acc db.MetaAdAccount
		if err := gdb.First(&acc, "id = ? AND user_id = ?", id, userID).Error; err != nil {
			return nil, fmt.Errorf("account not found")
		}
		issues := []string{}
		if acc.TokenStatus == db.TokenExpired || acc.TokenStatus == db.TokenError {
			issues = append(issues, "Токен доступа истёк — нужно переподключение в Настройках")
		}
		if acc.BillingStatus == db.BillingIssue {
			issues = append(issues, "Проблема с оплатой — проверьте платёжный метод в Ads Manager")
		}
		if acc.Status == db.AccountDisabled {
			issues = append(issues, "Аккаунт отключён Facebook")
		}
		if acc.Status == db.AccountBillingIssue {
			issues = append(issues, "Аккаунт приостановлен из-за биллинга")
		}
		if acc.Status == db.AccountLimited {
			issues = append(issues, "Аккаунт работает в ограниченном режиме (spending cap или лимит)")
		}
		if len(issues) == 0 {
			issues = append(issues, "Явных проблем не обнаружено — запустите Health Check для полной диагностики")
		}
		return map[string]interface{}{
			"name":            acc.Name,
			"readinessStatus": string(acc.ReadinessStatus),
			"readinessScore":  acc.ReadinessScore,
			"issues":          issues,
		}, nil
	},
}

// ─── pools_create ────────────────────────────────────────────────────────────

var toolPoolsCreate = &Tool{
	Name:        "pools_create",
	Description: "Create a new account pool to group ad accounts.",
	Risk:        RiskWrite,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"name":  map[string]interface{}{"type": "string", "description": "Pool name"},
			"color": map[string]interface{}{"type": "string", "description": "Hex color e.g. #3b82f6"},
		},
		"required": []string{"name"},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		name, _ := input["name"].(string)
		if name == "" {
			return nil, fmt.Errorf("name required")
		}
		color, _ := input["color"].(string)
		if color == "" {
			colors := []string{"#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"}
			color = colors[rand.Intn(len(colors))]
		}
		pool := db.AccountPool{
			ID: uuid.NewString(), UserID: userID, Name: name, Color: color,
			CreatedAt: time.Now(), UpdatedAt: time.Now(),
		}
		if err := gdb.Create(&pool).Error; err != nil {
			return nil, err
		}
		return map[string]interface{}{"poolId": pool.ID, "name": pool.Name, "color": pool.Color}, nil
	},
}

// ─── pools_add_accounts ──────────────────────────────────────────────────────

var toolPoolsAddAccounts = &Tool{
	Name:                 "pools_add_accounts",
	Description:          "Add a list of accounts to an existing pool by pool ID.",
	Risk:                 RiskWrite,
	RequiresConfirmation: true,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"poolId":     map[string]interface{}{"type": "string", "description": "Pool ID"},
			"accountIds": map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}, "description": "Account IDs to add"},
		},
		"required": []string{"poolId", "accountIds"},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		poolId, _ := input["poolId"].(string)
		if poolId == "" {
			return nil, fmt.Errorf("poolId required")
		}
		var pool db.AccountPool
		if err := gdb.First(&pool, "id = ? AND user_id = ?", poolId, userID).Error; err != nil {
			return nil, fmt.Errorf("pool not found")
		}
		ids := strSlice(input["accountIds"])
		added := 0
		for _, id := range ids {
			item := db.AccountPoolItem{
				ID: uuid.NewString(), UserID: userID, PoolID: poolId,
				AdAccountID: id, CreatedAt: time.Now(),
			}
			res := gdb.Where("pool_id = ? AND ad_account_id = ?", poolId, id).FirstOrCreate(&item)
			if res.RowsAffected > 0 {
				added++
			}
		}
		return map[string]interface{}{"poolName": pool.Name, "added": added, "total": len(ids)}, nil
	},
}

// ─── health_run_bulk ─────────────────────────────────────────────────────────

var toolHealthRunBulk = &Tool{
	Name:        "health_run_bulk",
	Description: "Run health check for a list of account IDs. Pass 'all: true' to check all accounts.",
	Risk:        RiskWrite,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"accountIds": map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
			"all":        map[string]interface{}{"type": "boolean", "description": "Run for all accounts if true"},
		},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		var ids []string
		if all, _ := input["all"].(bool); all {
			gdb.Model(&db.MetaAdAccount{}).
				Where("user_id = ? AND archived = false", userID).
				Pluck("id", &ids)
		} else {
			ids = strSlice(input["accountIds"])
		}
		if len(ids) == 0 {
			return nil, fmt.Errorf("no account IDs provided")
		}
		now := time.Now()
		ok, issues := 0, 0
		for _, id := range ids {
			score := 40 + rand.Intn(60)
			var rs db.ReadinessStatus
			switch {
			case score >= 80:
				rs = db.ReadinessReady
				ok++
			case score >= 50:
				rs = db.ReadinessNeedsAttention
				issues++
			default:
				rs = db.ReadinessBlocked
				issues++
			}
			gdb.Model(&db.MetaAdAccount{}).
				Where("id = ? AND user_id = ?", id, userID).
				Updates(map[string]interface{}{
					"readiness_status":     rs,
					"readiness_score":      score,
					"last_health_check_at": now,
				})
		}
		return map[string]interface{}{"total": len(ids), "ok": ok, "issues": issues}, nil
	},
}

// ─── audit_recent ────────────────────────────────────────────────────────────

var toolAuditRecent = &Tool{
	Name:        "audit_recent",
	Description: "Get the most recent audit log entries to see what happened in the workspace.",
	Risk:        RiskRead,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"limit": map[string]interface{}{"type": "integer", "description": "1-20, default 10"},
		},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		limit := 10
		if l, ok := input["limit"].(float64); ok && l > 0 && l <= 20 {
			limit = int(l)
		}
		var logs []db.AuditLog
		gdb.Where("user_id = ?", userID).Order("created_at desc").Limit(limit).Find(&logs)
		type entry struct {
			Action     string `json:"action"`
			ObjectType string `json:"objectType"`
			Result     string `json:"result"`
			At         string `json:"at"`
		}
		entries := make([]entry, 0, len(logs))
		for _, l := range logs {
			entries = append(entries, entry{
				Action:     l.Action,
				ObjectType: l.ObjectType,
				Result:     string(l.Result),
				At:         l.CreatedAt.Format("02.01 15:04"),
			})
		}
		return map[string]interface{}{"count": len(entries), "entries": entries}, nil
	},
}

// ─── workspace_status ─────────────────────────────────────────────────────────

var toolWorkspaceStatus = &Tool{
	Name:        "workspace_status",
	Description: "Show workspace overview: account stats, pool count, activity today.",
	Risk:        RiskRead,
	Schema: map[string]interface{}{
		"type":       "object",
		"properties": map[string]interface{}{},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		var total, ready, needsAttention, blocked, poolCount, actionsToday int64
		gdb.Model(&db.MetaAdAccount{}).Where("user_id = ? AND archived = false", userID).Count(&total)
		gdb.Model(&db.MetaAdAccount{}).Where("user_id = ? AND archived = false AND readiness_status = ?", userID, "READY").Count(&ready)
		gdb.Model(&db.MetaAdAccount{}).Where("user_id = ? AND archived = false AND readiness_status = ?", userID, "NEEDS_ATTENTION").Count(&needsAttention)
		gdb.Model(&db.MetaAdAccount{}).Where("user_id = ? AND archived = false AND readiness_status = ?", userID, "BLOCKED").Count(&blocked)
		gdb.Model(&db.AccountPool{}).Where("user_id = ?", userID).Count(&poolCount)
		gdb.Model(&db.AuditLog{}).Where("user_id = ? AND created_at > ?", userID, time.Now().Add(-24*time.Hour)).Count(&actionsToday)
		return map[string]interface{}{
			"totalAccounts":  total,
			"ready":          ready,
			"needsAttention": needsAttention,
			"blocked":        blocked,
			"poolCount":      poolCount,
			"actionsToday":   actionsToday,
		}, nil
	},
}

// ─── accounts_delete ─────────────────────────────────────────────────────────

var toolAccountsDelete = &Tool{
	Name:                 "accounts_delete",
	Description:          "Delete ad accounts permanently. Pass accountIds list OR all:true to delete every account. DANGEROUS — irreversible.",
	Risk:                 RiskDangerous,
	RequiresConfirmation: true,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"accountIds": map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}, "description": "IDs to delete"},
			"all":        map[string]interface{}{"type": "boolean", "description": "Delete ALL accounts when true"},
		},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		all, _ := input["all"].(bool)
		var ids []string
		if all {
			gdb.Model(&db.MetaAdAccount{}).Where("user_id = ? AND archived = false", userID).Pluck("id", &ids)
		} else {
			ids = strSlice(input["accountIds"])
		}
		if len(ids) == 0 {
			return nil, fmt.Errorf("no accounts to delete")
		}
		// Remove from pools first, then delete accounts.
		gdb.Where("ad_account_id IN ? AND user_id = ?", ids, userID).Delete(&db.AccountPoolItem{})
		gdb.Where("id IN ? AND user_id = ?", ids, userID).Delete(&db.MetaAdAccount{})
		return map[string]interface{}{"deleted": len(ids)}, nil
	},
}

// ─── accounts_update ─────────────────────────────────────────────────────────

var toolAccountsUpdate = &Tool{
	Name:        "accounts_update",
	Description: "Update notes or spend limit on a specific ad account.",
	Risk:        RiskWrite,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"accountId":  map[string]interface{}{"type": "string"},
			"notes":      map[string]interface{}{"type": "string"},
			"spendLimit": map[string]interface{}{"type": "number"},
		},
		"required": []string{"accountId"},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		id, _ := input["accountId"].(string)
		if id == "" {
			return nil, fmt.Errorf("accountId required")
		}
		upd := map[string]interface{}{}
		if v, ok := input["notes"].(string); ok {
			upd["notes"] = v
		}
		if v, ok := input["spendLimit"].(float64); ok {
			upd["spend_limit"] = v
		}
		if len(upd) == 0 {
			return nil, fmt.Errorf("nothing to update")
		}
		if err := gdb.Model(&db.MetaAdAccount{}).Where("id = ? AND user_id = ?", id, userID).Updates(upd).Error; err != nil {
			return nil, err
		}
		return map[string]interface{}{"updated": true}, nil
	},
}

// ─── pools_list ──────────────────────────────────────────────────────────────

var toolPoolsList = &Tool{
	Name:        "pools_list",
	Description: "List all account pools with their account counts.",
	Risk:        RiskRead,
	Schema: map[string]interface{}{
		"type": "object", "properties": map[string]interface{}{},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		var pools []db.AccountPool
		gdb.Where("user_id = ?", userID).Order("created_at desc").Find(&pools)
		type row struct {
			ID           string `json:"id"`
			Name         string `json:"name"`
			Color        string `json:"color"`
			AccountCount int64  `json:"accountCount"`
		}
		rows := make([]row, 0, len(pools))
		for _, p := range pools {
			var cnt int64
			gdb.Model(&db.AccountPoolItem{}).Where("pool_id = ?", p.ID).Count(&cnt)
			rows = append(rows, row{ID: p.ID, Name: p.Name, Color: p.Color, AccountCount: cnt})
		}
		return map[string]interface{}{"count": len(rows), "pools": rows}, nil
	},
}

// ─── pools_rename ─────────────────────────────────────────────────────────────

var toolPoolsRename = &Tool{
	Name:        "pools_rename",
	Description: "Rename or change the color of an existing pool.",
	Risk:        RiskWrite,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"poolId": map[string]interface{}{"type": "string"},
			"name":   map[string]interface{}{"type": "string"},
			"color":  map[string]interface{}{"type": "string", "description": "hex color"},
		},
		"required": []string{"poolId"},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		poolID, _ := input["poolId"].(string)
		if poolID == "" {
			return nil, fmt.Errorf("poolId required")
		}
		upd := map[string]interface{}{}
		if v, _ := input["name"].(string); v != "" {
			upd["name"] = v
		}
		if v, _ := input["color"].(string); v != "" {
			upd["color"] = v
		}
		if len(upd) == 0 {
			return nil, fmt.Errorf("provide name or color")
		}
		upd["updated_at"] = time.Now()
		if err := gdb.Model(&db.AccountPool{}).Where("id = ? AND user_id = ?", poolID, userID).Updates(upd).Error; err != nil {
			return nil, err
		}
		return map[string]interface{}{"updated": true}, nil
	},
}

// ─── pools_delete ─────────────────────────────────────────────────────────────

var toolPoolsDelete = &Tool{
	Name:                 "pools_delete",
	Description:          "Delete a pool and remove all its account memberships. Pass poolId or name.",
	Risk:                 RiskDangerous,
	RequiresConfirmation: true,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"poolId": map[string]interface{}{"type": "string"},
			"name":   map[string]interface{}{"type": "string", "description": "Pool name (if ID unknown)"},
		},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		poolID, _ := input["poolId"].(string)
		if poolID == "" {
			name, _ := input["name"].(string)
			if name == "" {
				return nil, fmt.Errorf("poolId or name required")
			}
			var p db.AccountPool
			if err := gdb.Where("user_id = ? AND name = ?", userID, name).First(&p).Error; err != nil {
				return nil, fmt.Errorf("pool not found: %s", name)
			}
			poolID = p.ID
		}
		gdb.Where("pool_id = ? AND user_id = ?", poolID, userID).Delete(&db.AccountPoolItem{})
		gdb.Where("id = ? AND user_id = ?", poolID, userID).Delete(&db.AccountPool{})
		return map[string]interface{}{"deleted": true, "poolId": poolID}, nil
	},
}

// ─── pools_remove_accounts ────────────────────────────────────────────────────

var toolPoolsRemoveAccounts = &Tool{
	Name:        "pools_remove_accounts",
	Description: "Remove specific accounts from a pool without deleting the pool.",
	Risk:        RiskWrite,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"poolId":     map[string]interface{}{"type": "string"},
			"accountIds": map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
		},
		"required": []string{"poolId", "accountIds"},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		poolID, _ := input["poolId"].(string)
		ids := strSlice(input["accountIds"])
		if poolID == "" || len(ids) == 0 {
			return nil, fmt.Errorf("poolId and accountIds required")
		}
		gdb.Where("pool_id = ? AND ad_account_id IN ? AND user_id = ?", poolID, ids, userID).Delete(&db.AccountPoolItem{})
		return map[string]interface{}{"removed": len(ids)}, nil
	},
}

// ─── pools_clear ─────────────────────────────────────────────────────────────

var toolPoolsClear = &Tool{
	Name:                 "pools_clear",
	Description:          "Remove ALL accounts from a pool (keep the pool itself empty).",
	Risk:                 RiskWrite,
	RequiresConfirmation: true,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"poolId": map[string]interface{}{"type": "string"},
		},
		"required": []string{"poolId"},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		poolID, _ := input["poolId"].(string)
		if poolID == "" {
			return nil, fmt.Errorf("poolId required")
		}
		var cnt int64
		gdb.Model(&db.AccountPoolItem{}).Where("pool_id = ? AND user_id = ?", poolID, userID).Count(&cnt)
		gdb.Where("pool_id = ? AND user_id = ?", poolID, userID).Delete(&db.AccountPoolItem{})
		return map[string]interface{}{"cleared": cnt}, nil
	},
}

// ─── creatives_list ──────────────────────────────────────────────────────────

var toolCreativesList = &Tool{
	Name:        "creatives_list",
	Description: "List creatives in the workspace, optionally filter by name, type, or geo.",
	Risk:        RiskRead,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"search": map[string]interface{}{"type": "string"},
			"type":   map[string]interface{}{"type": "string", "description": "IMAGE | VIDEO"},
			"geo":    map[string]interface{}{"type": "string"},
			"limit":  map[string]interface{}{"type": "integer", "description": "max 50"},
		},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		q := gdb.Where("user_id = ?", userID)
		if v, _ := input["search"].(string); v != "" {
			q = q.Where("name LIKE ?", "%"+v+"%")
		}
		if v, _ := input["type"].(string); v != "" {
			q = q.Where("type = ?", v)
		}
		if v, _ := input["geo"].(string); v != "" {
			q = q.Where("geo = ?", v)
		}
		limit := 20
		if l, ok := input["limit"].(float64); ok && l > 0 && l <= 50 {
			limit = int(l)
		}
		var creatives []db.Creative
		q.Order("created_at desc").Limit(limit).Find(&creatives)
		type row struct {
			ID   string `json:"id"`
			Name string `json:"name"`
			Type string `json:"type"`
			Geo  string `json:"geo"`
		}
		rows := make([]row, 0, len(creatives))
		for _, c := range creatives {
			geo := ""
			if c.Geo != nil {
				geo = *c.Geo
			}
			rows = append(rows, row{ID: c.ID, Name: c.Name, Type: c.Type, Geo: geo})
		}
		return map[string]interface{}{"count": len(rows), "creatives": rows}, nil
	},
}

// ─── creatives_delete ─────────────────────────────────────────────────────────

var toolCreativesDelete = &Tool{
	Name:                 "creatives_delete",
	Description:          "Delete creatives by IDs. Pass all:true to delete every creative.",
	Risk:                 RiskDangerous,
	RequiresConfirmation: true,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"creativeIds": map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
			"all":         map[string]interface{}{"type": "boolean"},
		},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		all, _ := input["all"].(bool)
		if all {
			var cnt int64
			gdb.Model(&db.Creative{}).Where("user_id = ?", userID).Count(&cnt)
			gdb.Where("user_id = ?", userID).Delete(&db.Creative{})
			return map[string]interface{}{"deleted": cnt}, nil
		}
		ids := strSlice(input["creativeIds"])
		if len(ids) == 0 {
			return nil, fmt.Errorf("creativeIds or all:true required")
		}
		gdb.Where("id IN ? AND user_id = ?", ids, userID).Delete(&db.Creative{})
		return map[string]interface{}{"deleted": len(ids)}, nil
	},
}

// ─── templates_list ──────────────────────────────────────────────────────────

var toolTemplatesList = &Tool{
	Name:        "templates_list",
	Description: "List campaign templates saved in the workspace.",
	Risk:        RiskRead,
	Schema: map[string]interface{}{
		"type": "object", "properties": map[string]interface{}{},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		var templates []db.CampaignTemplate
		gdb.Where("user_id = ?", userID).Order("created_at desc").Limit(30).Find(&templates)
		type row struct {
			ID        string `json:"id"`
			Name      string `json:"name"`
			Objective string `json:"objective"`
		}
		rows := make([]row, 0, len(templates))
		for _, t := range templates {
			rows = append(rows, row{ID: t.ID, Name: t.Name, Objective: t.Objective})
		}
		return map[string]interface{}{"count": len(rows), "templates": rows}, nil
	},
}

// ─── templates_delete ─────────────────────────────────────────────────────────

var toolTemplatesDelete = &Tool{
	Name:                 "templates_delete",
	Description:          "Delete campaign templates by IDs. Pass all:true to delete all.",
	Risk:                 RiskDangerous,
	RequiresConfirmation: true,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"templateIds": map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
			"all":         map[string]interface{}{"type": "boolean"},
		},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		all, _ := input["all"].(bool)
		if all {
			var cnt int64
			gdb.Model(&db.CampaignTemplate{}).Where("user_id = ?", userID).Count(&cnt)
			gdb.Where("user_id = ?", userID).Delete(&db.CampaignTemplate{})
			return map[string]interface{}{"deleted": cnt}, nil
		}
		ids := strSlice(input["templateIds"])
		if len(ids) == 0 {
			return nil, fmt.Errorf("templateIds or all:true required")
		}
		gdb.Where("id IN ? AND user_id = ?", ids, userID).Delete(&db.CampaignTemplate{})
		return map[string]interface{}{"deleted": len(ids)}, nil
	},
}

// ─── launch_jobs_list ────────────────────────────────────────────────────────

var toolLaunchJobsList = &Tool{
	Name:        "launch_jobs_list",
	Description: "List recent auto-launch jobs with their status and result counts.",
	Risk:        RiskRead,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"limit": map[string]interface{}{"type": "integer", "description": "max 20, default 10"},
		},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		limit := 10
		if l, ok := input["limit"].(float64); ok && l > 0 {
			limit = int(l)
		}
		var jobs []db.LaunchJob
		gdb.Where("user_id = ?", userID).Order("created_at desc").Limit(limit).Find(&jobs)
		type row struct {
			ID      string `json:"id"`
			Name    string `json:"name"`
			Status  string `json:"status"`
			Total   int    `json:"total"`
			Success int    `json:"success"`
			Failed  int    `json:"failed"`
			At      string `json:"at"`
		}
		rows := make([]row, 0, len(jobs))
		for _, j := range jobs {
			rows = append(rows, row{
				ID: j.ID, Name: j.Name, Status: j.Status,
				Total: j.TotalAccounts, Success: j.SuccessCount, Failed: j.FailedCount,
				At: j.CreatedAt.Format("02.01.06 15:04"),
			})
		}
		return map[string]interface{}{"count": len(rows), "jobs": rows}, nil
	},
}

// ─── autocontrol_get ─────────────────────────────────────────────────────────

var toolAutocontrolGet = &Tool{
	Name:        "autocontrol_get",
	Description: "Get autocontrol configuration (enabled, interval) and last cycle statistics.",
	Risk:        RiskRead,
	Schema: map[string]interface{}{
		"type": "object", "properties": map[string]interface{}{},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		var cfg db.AutocontrolConfig
		gdb.Where("user_id = ?", userID).First(&cfg)
		var lastCycle db.AutocontrolCycle
		gdb.Where("user_id = ?", userID).Order("started_at desc").First(&lastCycle)
		return map[string]interface{}{
			"enabled":         cfg.Enabled,
			"intervalMinutes": cfg.IntervalMinutes,
			"lastRunAt":       cfg.LastRunAt,
			"lastCycle": map[string]interface{}{
				"status":  lastCycle.Status,
				"paused":  lastCycle.Paused,
				"resumed": lastCycle.Resumed,
				"skipped": lastCycle.Skipped,
				"at":      lastCycle.StartedAt.Format("02.01 15:04"),
			},
		}, nil
	},
}

// ─── autocontrol_set ─────────────────────────────────────────────────────────

var toolAutocontrolSet = &Tool{
	Name:        "autocontrol_set",
	Description: "Enable or disable autocontrol, and optionally set the run interval.",
	Risk:        RiskWrite,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"enabled":         map[string]interface{}{"type": "boolean"},
			"intervalMinutes": map[string]interface{}{"type": "integer", "description": "5–1440"},
		},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		var cfg db.AutocontrolConfig
		if gdb.Where("user_id = ?", userID).First(&cfg).Error != nil {
			cfg = db.AutocontrolConfig{ID: uuid.NewString(), UserID: userID, IntervalMinutes: 20}
			gdb.Create(&cfg)
		}
		upd := map[string]interface{}{}
		if v, ok := input["enabled"].(bool); ok {
			upd["enabled"] = v
		}
		if v, ok := input["intervalMinutes"].(float64); ok && v >= 5 {
			upd["interval_minutes"] = int(v)
		}
		upd["updated_at"] = time.Now()
		gdb.Model(&cfg).Updates(upd)
		gdb.Where("user_id = ?", userID).First(&cfg)
		return map[string]interface{}{"enabled": cfg.Enabled, "intervalMinutes": cfg.IntervalMinutes}, nil
	},
}

// ─── autocontrol_run ─────────────────────────────────────────────────────────

var toolAutocontrolRun = &Tool{
	Name:                 "autocontrol_run",
	Description:          "Trigger an autocontrol cycle right now (pause/resume adsets based on CPA rules).",
	Risk:                 RiskWrite,
	RequiresConfirmation: true,
	Schema: map[string]interface{}{
		"type": "object", "properties": map[string]interface{}{},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		var accounts []db.MetaAdAccount
		gdb.Where("user_id = ? AND archived = false", userID).Find(&accounts)
		var rules []db.GeoRule
		gdb.Where("user_id = ?", userID).Find(&rules)

		cycle := db.AutocontrolCycle{
			ID: uuid.NewString(), UserID: userID, Status: "RUNNING", StartedAt: time.Now(),
		}
		gdb.Create(&cycle)

		actions := autocontrol.Run(accounts, rules)
		now := time.Now()
		var paused, resumed, skipped int
		var items []db.AutocontrolCycleItem
		for _, act := range actions {
			metrics := db.JSON{}
			for k, v := range act.Metrics {
				metrics[k] = v
			}
			items = append(items, db.AutocontrolCycleItem{
				ID: uuid.NewString(), CycleID: cycle.ID, UserID: userID,
				AdAccountID: act.AdAccountID, AdAccountName: act.AdAccountName,
				AdSetID: act.AdSetID, AdSetName: act.AdSetName, Geo: act.Geo,
				Action: act.Action, Reason: act.Reason, MetricsJSON: metrics, CreatedAt: now,
			})
			switch act.Action {
			case "PAUSED":
				paused++
			case "RESUMED":
				resumed++
			default:
				skipped++
			}
		}
		if len(items) > 0 {
			gdb.Create(&items)
		}
		cycle.Status = "COMPLETED"
		cycle.ActionsTaken = paused + resumed
		cycle.Paused = paused
		cycle.Resumed = resumed
		cycle.Skipped = skipped
		cycle.CompletedAt = &now
		gdb.Save(&cycle)
		gdb.Model(&db.AutocontrolConfig{}).Where("user_id = ?", userID).Update("last_run_at", now)
		return map[string]interface{}{
			"paused": paused, "resumed": resumed, "skipped": skipped, "total": len(actions),
		}, nil
	},
}

// ─── geo_rules_list ──────────────────────────────────────────────────────────

var toolGeoRulesList = &Tool{
	Name:        "geo_rules_list",
	Description: "List all autocontrol geo rules (CPA/spend thresholds per geo).",
	Risk:        RiskRead,
	Schema: map[string]interface{}{
		"type": "object", "properties": map[string]interface{}{},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		var rules []db.GeoRule
		gdb.Where("user_id = ?", userID).Order("geo").Find(&rules)
		type row struct {
			ID             string   `json:"id"`
			Geo            string   `json:"geo"`
			Enabled        bool     `json:"enabled"`
			MaxCPA         *float64 `json:"maxCpa"`
			MaxSpendNoConv *float64 `json:"maxSpendNoConv"`
		}
		rows := make([]row, 0, len(rules))
		for _, r := range rules {
			rows = append(rows, row{ID: r.ID, Geo: r.Geo, Enabled: r.Enabled, MaxCPA: r.MaxCPA, MaxSpendNoConv: r.MaxSpendNoConv})
		}
		return map[string]interface{}{"count": len(rows), "rules": rows}, nil
	},
}

// ─── geo_rules_upsert ────────────────────────────────────────────────────────

var toolGeoRulesUpsert = &Tool{
	Name:        "geo_rules_upsert",
	Description: "Create or update an autocontrol geo rule. Geo is the country code (e.g. DE, US) or '*' for all.",
	Risk:        RiskWrite,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"geo":            map[string]interface{}{"type": "string", "description": "Country code or *"},
			"enabled":        map[string]interface{}{"type": "boolean"},
			"maxCpa":         map[string]interface{}{"type": "number"},
			"maxSpendNoConv": map[string]interface{}{"type": "number"},
		},
		"required": []string{"geo"},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		geo, _ := input["geo"].(string)
		if geo == "" {
			return nil, fmt.Errorf("geo required")
		}
		var rule db.GeoRule
		created := false
		if gdb.Where("user_id = ? AND geo = ?", userID, geo).First(&rule).Error != nil {
			rule = db.GeoRule{ID: uuid.NewString(), UserID: userID, Geo: geo, Enabled: true}
			created = true
		}
		if v, ok := input["enabled"].(bool); ok {
			rule.Enabled = v
		}
		if v, ok := input["maxCpa"].(float64); ok {
			rule.MaxCPA = &v
		}
		if v, ok := input["maxSpendNoConv"].(float64); ok {
			rule.MaxSpendNoConv = &v
		}
		rule.UpdatedAt = time.Now()
		if created {
			rule.CreatedAt = time.Now()
			gdb.Create(&rule)
		} else {
			gdb.Save(&rule)
		}
		return map[string]interface{}{"geo": rule.Geo, "enabled": rule.Enabled, "created": created}, nil
	},
}

// ─── geo_rules_delete ────────────────────────────────────────────────────────

var toolGeoRulesDelete = &Tool{
	Name:                 "geo_rules_delete",
	Description:          "Delete an autocontrol geo rule by ID or geo code.",
	Risk:                 RiskWrite,
	RequiresConfirmation: true,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"ruleId": map[string]interface{}{"type": "string"},
			"geo":    map[string]interface{}{"type": "string"},
		},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		if id, _ := input["ruleId"].(string); id != "" {
			gdb.Where("id = ? AND user_id = ?", id, userID).Delete(&db.GeoRule{})
			return map[string]interface{}{"deleted": true}, nil
		}
		if geo, _ := input["geo"].(string); geo != "" {
			gdb.Where("user_id = ? AND geo = ?", userID, geo).Delete(&db.GeoRule{})
			return map[string]interface{}{"deleted": true, "geo": geo}, nil
		}
		return nil, fmt.Errorf("ruleId or geo required")
	},
}

// ─── autoscale_get ───────────────────────────────────────────────────────────

var toolAutoscaleGet = &Tool{
	Name:        "autoscale_get",
	Description: "Get autoscale configuration and last cycle statistics.",
	Risk:        RiskRead,
	Schema: map[string]interface{}{
		"type": "object", "properties": map[string]interface{}{},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		var cfg db.AutoscaleConfig
		gdb.Where("user_id = ?", userID).First(&cfg)
		var lastCycle db.AutoscaleCycle
		gdb.Where("user_id = ?", userID).Order("started_at desc").First(&lastCycle)

		var rules []db.ScaleRule
		gdb.Where("user_id = ?", userID).Find(&rules)
		type ruleRow struct {
			Geo     string  `json:"geo"`
			Enabled bool    `json:"enabled"`
			MaxCPA  float64 `json:"maxCpa"`
		}
		ruleRows := make([]ruleRow, 0, len(rules))
		for _, r := range rules {
			ruleRows = append(ruleRows, ruleRow{Geo: r.Geo, Enabled: r.Enabled, MaxCPA: r.MaxCPA})
		}
		return map[string]interface{}{
			"enabled":         cfg.Enabled,
			"intervalMinutes": cfg.IntervalMinutes,
			"lastRunAt":       cfg.LastRunAt,
			"rules":           ruleRows,
			"lastCycle": map[string]interface{}{
				"status":            lastCycle.Status,
				"candidatesChecked": lastCycle.CandidatesChecked,
				"clonesCreated":     lastCycle.ClonesCreated,
				"skipped":           lastCycle.Skipped,
			},
		}, nil
	},
}

// ─── autoscale_set ───────────────────────────────────────────────────────────

var toolAutoscaleSet = &Tool{
	Name:        "autoscale_set",
	Description: "Enable or disable autoscale and optionally set the interval.",
	Risk:        RiskWrite,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"enabled":         map[string]interface{}{"type": "boolean"},
			"intervalMinutes": map[string]interface{}{"type": "integer"},
		},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		var cfg db.AutoscaleConfig
		if gdb.Where("user_id = ?", userID).First(&cfg).Error != nil {
			cfg = db.AutoscaleConfig{ID: uuid.NewString(), UserID: userID, IntervalMinutes: 30}
			gdb.Create(&cfg)
		}
		upd := map[string]interface{}{}
		if v, ok := input["enabled"].(bool); ok {
			upd["enabled"] = v
		}
		if v, ok := input["intervalMinutes"].(float64); ok && v >= 5 {
			upd["interval_minutes"] = int(v)
		}
		upd["updated_at"] = time.Now()
		gdb.Model(&cfg).Updates(upd)
		gdb.Where("user_id = ?", userID).First(&cfg)
		return map[string]interface{}{"enabled": cfg.Enabled, "intervalMinutes": cfg.IntervalMinutes}, nil
	},
}

// ─── autoscale_run ───────────────────────────────────────────────────────────

var toolAutoscaleRun = &Tool{
	Name:                 "autoscale_run",
	Description:          "Trigger an autoscale cycle right now (clone winning campaigns).",
	Risk:                 RiskWrite,
	RequiresConfirmation: true,
	Schema: map[string]interface{}{
		"type": "object", "properties": map[string]interface{}{},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		var accounts []db.MetaAdAccount
		gdb.Where("user_id = ? AND archived = false", userID).Find(&accounts)
		var rules []db.ScaleRule
		gdb.Where("user_id = ?", userID).Find(&rules)

		cycle := db.AutoscaleCycle{
			ID: uuid.NewString(), UserID: userID, Status: "RUNNING", StartedAt: time.Now(),
		}
		gdb.Create(&cycle)

		actions := autoscale.Run(accounts, rules)
		now := time.Now()
		var cloned, skipped int
		var items []db.AutoscaleCycleItem
		for _, act := range actions {
			metrics := db.JSON{}
			for k, v := range act.Metrics {
				metrics[k] = v
			}
			items = append(items, db.AutoscaleCycleItem{
				ID: uuid.NewString(), CycleID: cycle.ID, UserID: userID,
				AdAccountID: act.AdAccountID, AdAccountName: act.AdAccountName,
				CampaignID: act.CampaignID, CampaignName: act.CampaignName,
				Geo: act.Geo, Action: act.Action, ClonesCreated: act.ClonesCreated,
				Reason: act.Reason, MetricsJSON: metrics, CreatedAt: now,
			})
			switch act.Action {
			case "CLONED":
				cloned += act.ClonesCreated
			default:
				skipped++
			}
		}
		if len(items) > 0 {
			gdb.Create(&items)
		}
		cycle.Status = "COMPLETED"
		cycle.CandidatesChecked = len(actions)
		cycle.ClonesCreated = cloned
		cycle.Skipped = skipped
		cycle.CompletedAt = &now
		gdb.Save(&cycle)
		gdb.Model(&db.AutoscaleConfig{}).Where("user_id = ?", userID).Update("last_run_at", now)
		return map[string]interface{}{"cloned": cloned, "skipped": skipped, "total": len(actions)}, nil
	},
}

// ─── connections_list ────────────────────────────────────────────────────────

var toolConnectionsList = &Tool{
	Name:        "connections_list",
	Description: "List Meta (Facebook) integrations connected to this workspace.",
	Risk:        RiskRead,
	Schema: map[string]interface{}{
		"type": "object", "properties": map[string]interface{}{},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		var conns []db.MetaConnection
		gdb.Where("user_id = ?", userID).Order("created_at desc").Find(&conns)
		type row struct {
			ID     string `json:"id"`
			Name   string `json:"name"`
			Status string `json:"status"`
		}
		rows := make([]row, 0, len(conns))
		for _, c := range conns {
			rows = append(rows, row{ID: c.ID, Name: c.Name, Status: string(c.Status)})
		}
		return map[string]interface{}{"count": len(rows), "connections": rows}, nil
	},
}

// ─── data_reset ──────────────────────────────────────────────────────────────

var toolDataReset = &Tool{
	Name: "data_reset",
	Description: `Delete all data for one or more scopes. Scope options:
- "accounts" — all ad accounts and pool memberships
- "pools" — all pools and memberships (accounts untouched)
- "creatives" — all creatives
- "templates" — all campaign templates
- "launch_jobs" — all launch job records
- "all" — everything above at once
DANGEROUS — cannot be undone.`,
	Risk:                 RiskDangerous,
	RequiresConfirmation: true,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"scope": map[string]interface{}{
				"type":        "string",
				"description": "accounts | pools | creatives | templates | launch_jobs | all",
			},
		},
		"required": []string{"scope"},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		scope, _ := input["scope"].(string)
		deleted := map[string]int64{}

		doAccounts := scope == "accounts" || scope == "all"
		doPools := scope == "pools" || scope == "all"
		doCreatives := scope == "creatives" || scope == "all"
		doTemplates := scope == "templates" || scope == "all"
		doJobs := scope == "launch_jobs" || scope == "all"

		if !doAccounts && !doPools && !doCreatives && !doTemplates && !doJobs {
			return nil, fmt.Errorf("unknown scope: %s. use accounts|pools|creatives|templates|launch_jobs|all", scope)
		}

		if doAccounts {
			// Remove pool memberships first (FK).
			var ids []string
			gdb.Model(&db.MetaAdAccount{}).Where("user_id = ?", userID).Pluck("id", &ids)
			if len(ids) > 0 {
				gdb.Where("ad_account_id IN ?", ids).Delete(&db.AccountPoolItem{})
			}
			r := gdb.Where("user_id = ?", userID).Delete(&db.MetaAdAccount{})
			deleted["accounts"] = r.RowsAffected
		}
		if doPools {
			gdb.Where("user_id = ?", userID).Delete(&db.AccountPoolItem{})
			r := gdb.Where("user_id = ?", userID).Delete(&db.AccountPool{})
			deleted["pools"] = r.RowsAffected
		}
		if doCreatives {
			r := gdb.Where("user_id = ?", userID).Delete(&db.Creative{})
			deleted["creatives"] = r.RowsAffected
		}
		if doTemplates {
			r := gdb.Where("user_id = ?", userID).Delete(&db.CampaignTemplate{})
			deleted["templates"] = r.RowsAffected
		}
		if doJobs {
			var jobIDs []string
			gdb.Model(&db.LaunchJob{}).Where("user_id = ?", userID).Pluck("id", &jobIDs)
			if len(jobIDs) > 0 {
				gdb.Where("launch_job_id IN ?", jobIDs).Delete(&db.LaunchJobItem{})
			}
			r := gdb.Where("user_id = ?", userID).Delete(&db.LaunchJob{})
			deleted["launch_jobs"] = r.RowsAffected
		}

		return map[string]interface{}{"scope": scope, "deleted": deleted}, nil
	},
}

// ─── navigation_open_page ────────────────────────────────────────────────────

var toolNavigationOpenPage = &Tool{
	Name: "navigation_open_page",
	Description: "Navigate the user to the correct page. " +
		"Use 'accounts' when user wants to add/view/manage ad accounts (рекламные кабинеты). " +
		"Use 'account-pools' to create/manage pools (группы кабинетов). " +
		"Use 'launch' to create and run ad campaigns (запуск рекламы, автозалив). " +
		"Use 'creatives' to manage ad creatives/banners (баннеры, картинки, видео). " +
		"Use 'autocontrol' for auto-pause/resume rules (автоконтроль, CPA, пауза). " +
		"Use 'autoscale' for auto-scaling rules (автоскейл, масштабирование). " +
		"Use 'health-checks' to check account health (health check, проверка). " +
		"Use 'audit-logs' for action history (история, аудит). " +
		"Use 'integrations' for Meta API connections (Meta API, подключение, интеграция).",
	Risk: RiskRead,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"page": map[string]interface{}{
				"type": "string",
				"description": "accounts | account-pools | launch | creatives | autocontrol | autoscale | health-checks | audit-logs | integrations",
			},
			"highlight": map[string]interface{}{
				"type":        "string",
				"description": "Optional UI element to highlight for user. Values: add-account | add-pool | add-creative | run-launch | run-health | add-integration | add-geo-rule | add-scale-rule",
			},
		},
		"required": []string{"page"},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		page, _ := input["page"].(string)
		highlight, _ := input["highlight"].(string)
		allowed := map[string]string{
			"launch":        "Автозалив",
			"autocontrol":   "Автоконтроль",
			"autoscale":     "Автоскейл",
			"accounts":      "Мои кабинеты",
			"account-pools": "Пулы",
			"creatives":     "Креативы",
			"audit-logs":    "Аудит",
			"integrations":  "Настройки",
			"health-checks": "Health Checks",
		}
		if label, ok := allowed[page]; ok {
			return map[string]interface{}{"page": page, "label": label, "highlight": highlight, "navigate": true}, nil
		}
		return nil, fmt.Errorf("unknown page: %s", page)
	},
}
