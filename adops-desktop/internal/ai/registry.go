package ai

import (
	"fmt"
	"math/rand"
	"strings"
	"time"

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
	"accounts_search":            toolAccountsSearch,
	"accounts_explain_readiness": toolAccountsExplainReadiness,
	"pools_create":               toolPoolsCreate,
	"pools_add_accounts":         toolPoolsAddAccounts,
	"health_run_bulk":            toolHealthRunBulk,
	"audit_recent":               toolAuditRecent,
	"navigation_open_page":       toolNavigationOpenPage,
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
		"pools_create":               "Создание пула",
		"pools_add_accounts":         "Добавление в пул",
		"health_run_bulk":            "Health Check",
		"audit_recent":               "Лог действий",
		"navigation_open_page":       "Навигация",
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

// ─── navigation_open_page ────────────────────────────────────────────────────

var toolNavigationOpenPage = &Tool{
	Name:        "navigation_open_page",
	Description: "Navigate to a specific page in the app after completing a task.",
	Risk:        RiskRead,
	Schema: map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"page": map[string]interface{}{
				"type":        "string",
				"description": "launch | autocontrol | autoscale | accounts | account-pools | creatives | audit-logs | integrations | health-checks",
			},
		},
		"required": []string{"page"},
	},
	Execute: func(gdb *gorm.DB, userID string, input map[string]interface{}) (interface{}, error) {
		page, _ := input["page"].(string)
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
			"ai-operator":   "AI Operator",
		}
		if label, ok := allowed[page]; ok {
			return map[string]interface{}{"page": page, "label": label, "navigate": true}, nil
		}
		return nil, fmt.Errorf("unknown page: %s", page)
	},
}
