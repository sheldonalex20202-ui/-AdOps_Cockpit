package autoscale

import (
	"fmt"
	"math/rand"

	"adops-desktop/internal/db"

	"github.com/google/uuid"
)

// ScaleAction describes a single action taken on a campaign during a cycle run.
type ScaleAction struct {
	CampaignID    string
	CampaignName  string
	Geo           string
	AdAccountID   string
	AdAccountName string
	Action        string // CLONED, SKIPPED, NO_RULE
	ClonesCreated int
	Reason        string
	Metrics       map[string]interface{}
}

// Run executes a mock autoscale cycle over the given accounts and scale rules.
// It generates 2–4 mock campaigns per account, computes CPA/spend/conversion
// metrics, and applies the matching ScaleRule thresholds to decide whether to
// clone a campaign or skip it.
func Run(accounts []db.MetaAdAccount, rules []db.ScaleRule) []ScaleAction {
	// Build rule lookup: geo → rule (prefer specific geo over wildcard)
	geoRuleMap := map[string]*db.ScaleRule{}
	var wildcardRule *db.ScaleRule
	for i := range rules {
		if !rules[i].Enabled {
			continue
		}
		if rules[i].Geo == "" {
			r := rules[i]
			wildcardRule = &r
		} else {
			r := rules[i]
			geoRuleMap[rules[i].Geo] = &r
		}
	}

	// Collect GEOs from rules for mock data generation
	geos := make([]string, 0, len(geoRuleMap))
	for g := range geoRuleMap {
		geos = append(geos, g)
	}
	if len(geos) == 0 {
		geos = []string{"DE", "US", "FR", "RU", "BR"}
	}

	var actions []ScaleAction

	for _, acc := range accounts {
		count := 2 + rand.Intn(3) // 2–4 campaigns per account
		for i := 0; i < count; i++ {
			geo := geos[rand.Intn(len(geos))]
			spend := 20.0 + rand.Float64()*380.0 // 20–400
			conversions := rand.Intn(21)           // 0–20

			var cpa float64
			if conversions > 0 {
				cpa = spend / float64(conversions)
			} else {
				cpa = 9999
			}

			campaignID := uuid.NewString()[:8]
			campaignName := fmt.Sprintf("%s | %s | camp_%s", acc.Name, geo, campaignID)

			metrics := map[string]interface{}{
				"spend":       fmt.Sprintf("%.2f", spend),
				"conversions": conversions,
				"cpa":         fmt.Sprintf("%.2f", cpa),
			}

			// Find matching rule: geo-specific first, then wildcard
			rule, hasRule := geoRuleMap[geo]
			if !hasRule && wildcardRule != nil {
				rule = wildcardRule
				hasRule = true
			}

			action := ScaleAction{
				CampaignID:    campaignID,
				CampaignName:  campaignName,
				Geo:           geo,
				AdAccountID:   acc.ID,
				AdAccountName: acc.Name,
				Metrics:       metrics,
			}

			switch {
			case !hasRule:
				action.Action = "NO_RULE"
				action.Reason = fmt.Sprintf("Нет правила для GEO %s", geo)

			case spend < rule.MinSpend:
				action.Action = "SKIPPED"
				action.Reason = fmt.Sprintf("Расход $%.2f < минимум $%.2f", spend, rule.MinSpend)

			case conversions < rule.MinConversions:
				action.Action = "SKIPPED"
				action.Reason = fmt.Sprintf("Конверсий %d < минимум %d", conversions, rule.MinConversions)

			case cpa > rule.MaxCPA:
				action.Action = "SKIPPED"
				action.Reason = fmt.Sprintf("CPA $%.2f > лимит $%.2f", cpa, rule.MaxCPA)

			default:
				action.Action = "CLONED"
				action.ClonesCreated = rule.CloneCount
				action.Reason = fmt.Sprintf(
					"Победитель: расход $%.2f ≥ $%.2f, конверсий %d ≥ %d, CPA $%.2f ≤ $%.2f → создано %d клонов",
					spend, rule.MinSpend, conversions, rule.MinConversions, cpa, rule.MaxCPA, rule.CloneCount,
				)
			}

			actions = append(actions, action)
		}
	}

	return actions
}
