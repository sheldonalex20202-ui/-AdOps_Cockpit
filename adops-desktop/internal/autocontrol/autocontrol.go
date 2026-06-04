package autocontrol

import (
	"fmt"
	"math/rand"

	"adops-desktop/internal/db"

	"github.com/google/uuid"
)

// CycleAction describes a single action taken on an ad set during a cycle run.
type CycleAction struct {
	AdSetID       string
	AdSetName     string
	Geo           string
	AdAccountID   string
	AdAccountName string
	Action        string // PAUSED, RESUMED, SKIPPED, NO_RULE
	Reason        string
	Metrics       map[string]interface{}
}

// Run executes a mock autocontrol cycle over the given accounts and geo rules.
// It generates 2–4 mock adsets per account, computes CPA/uCPC metrics, and
// applies the matching GeoRule thresholds to decide the action for each adset.
func Run(accounts []db.MetaAdAccount, rules []db.GeoRule) []CycleAction {
	ruleMap := map[string]*db.GeoRule{}
	for i := range rules {
		if rules[i].Enabled {
			ruleMap[rules[i].Geo] = &rules[i]
		}
	}

	// When no rules configured, use default thresholds so test runs show
	// PAUSED/SKIPPED/RESUMED results instead of all NO_RULE.
	noRulesConfigured := len(ruleMap) == 0
	if noRulesConfigured {
		defaultMaxCPA := float64(20)
		defaultMaxSpend := float64(80)
		ruleMap["*"] = &db.GeoRule{
			Enabled:        true,
			MaxCPA:         &defaultMaxCPA,
			MaxSpendNoConv: &defaultMaxSpend,
		}
	}

	geos := make([]string, 0, len(ruleMap))
	for g := range ruleMap {
		if g != "*" {
			geos = append(geos, g)
		}
	}
	if len(geos) == 0 {
		geos = []string{"DE", "US", "FR", "RU", "BR"}
	}

	var actions []CycleAction

	for _, acc := range accounts {
		count := 2 + rand.Intn(3) // 2–4 adsets per account
		for i := 0; i < count; i++ {
			geo := geos[rand.Intn(len(geos))]
			spend := 10.0 + rand.Float64()*290.0 // 10–300
			conversions := rand.Intn(11)           // 0–10
			clicks := conversions*3 + rand.Intn(50) + 5

			var cpa, ucpc float64
			if conversions > 0 {
				cpa = spend / float64(conversions)
			} else {
				cpa = 9999
			}
			if clicks > 0 {
				ucpc = spend / float64(clicks)
			}

			adSetID := uuid.NewString()[:8]
			adSetName := fmt.Sprintf("%s | %s | adset_%s", acc.Name, geo, adSetID)

			metrics := map[string]interface{}{
				"spend":       fmt.Sprintf("%.2f", spend),
				"conversions": conversions,
				"clicks":      clicks,
				"cpa":         fmt.Sprintf("%.2f", cpa),
				"ucpc":        fmt.Sprintf("%.3f", ucpc),
			}

			rule, hasRule := ruleMap[geo]
			if !hasRule {
				rule, hasRule = ruleMap["*"]
			}

			action := CycleAction{
				AdSetID:       adSetID,
				AdSetName:     adSetName,
				Geo:           geo,
				AdAccountID:   acc.ID,
				AdAccountName: acc.Name,
				Metrics:       metrics,
			}

			switch {
			case !hasRule:
				action.Action = "NO_RULE"
				action.Reason = fmt.Sprintf("Нет правила для GEO %s", geo)

			case rule.MaxCPA != nil && conversions > 0 && cpa > *rule.MaxCPA:
				action.Action = "PAUSED"
				action.Reason = fmt.Sprintf("CPA $%.2f > лимит $%.2f", cpa, *rule.MaxCPA)

			case rule.MaxSpendNoConv != nil && conversions == 0 && spend > *rule.MaxSpendNoConv:
				action.Action = "PAUSED"
				action.Reason = fmt.Sprintf("Расход $%.2f без конверсий > лимит $%.2f", spend, *rule.MaxSpendNoConv)

			case rule.MaxUCPCNoConv != nil && conversions == 0 && ucpc > *rule.MaxUCPCNoConv:
				action.Action = "PAUSED"
				action.Reason = fmt.Sprintf("uCPC $%.3f без конверсий > лимит $%.3f", ucpc, *rule.MaxUCPCNoConv)

			default:
				// Randomly resume a small fraction to simulate metric recovery
				if rand.Float64() < 0.15 {
					action.Action = "RESUMED"
					action.Reason = "Метрики восстановились, adset возобновлён"
				} else {
					action.Action = "SKIPPED"
					action.Reason = "Метрики в норме"
				}
			}

			actions = append(actions, action)
		}
	}

	return actions
}
