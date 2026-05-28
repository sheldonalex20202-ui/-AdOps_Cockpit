package launch

import (
	"fmt"
	"math/rand"
	"regexp"
	"strings"
	"time"

	"adops-desktop/internal/db"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Structure string

const (
	StructureCBO       Structure = "CBO"
	StructureABO       Structure = "ABO"
	StructureIsolation Structure = "ISOLATION"
	StructureZGrouped  Structure = "Z_GROUPED"
)

type CreativeRef struct {
	ID     string  `json:"id"`
	Name   string  `json:"name"`
	ZGroup *string `json:"zGroup"`
	Geo    *string `json:"geo"`
}

type Totals struct {
	Campaigns int `json:"campaigns"`
	AdSets    int `json:"adSets"`
	Ads       int `json:"ads"`
}

type ParsedCreative struct {
	OfferName string  `json:"offerName"`
	Geo       *string `json:"geo"`
	Date      *string `json:"date"`
	Version   *string `json:"version"`
	ZNum      *string `json:"zNum"`
}

var mockErrors = []string{
	"Meta API: Account temporarily restricted",
	"Meta API: Invalid token — refresh required",
	"Meta API: Daily spend limit reached",
	"Meta API: Account needs business verification",
	"Meta API: Rate limit exceeded, retry in 60s",
	"Meta API: Billing threshold not set",
}

// CalcTotals calculates expected campaign/adset/ad counts.
func CalcTotals(structure Structure, accounts, creatives, zGroups, campaignsPerAccount int) Totals {
	if zGroups == 0 {
		zGroups = 1
	}
	if campaignsPerAccount == 0 {
		campaignsPerAccount = 1
	}
	switch structure {
	case StructureCBO:
		return Totals{accounts, accounts * creatives, accounts * creatives}
	case StructureABO:
		return Totals{accounts, accounts, accounts * creatives}
	case StructureIsolation:
		n := accounts * creatives
		return Totals{n, n, n}
	default: // Z_GROUPED
		camps := accounts * campaignsPerAccount
		return Totals{camps, camps * zGroups, camps * creatives}
	}
}

// ParseCreativeFilename parses OFFER-GEO-DATE-VERSION-ZNUM convention.
func ParseCreativeFilename(name string) ParsedCreative {
	ext := regexp.MustCompile(`\.[^.]+$`)
	clean := ext.ReplaceAllString(name, "")

	full := regexp.MustCompile(`(?i)^(.+?)-([A-Z]{2,4})-(\d{4})-(\d+)-(Z\d+)$`)
	if m := full.FindStringSubmatch(clean); m != nil {
		offer := strings.ToUpper(m[1])
		geo := strings.ToUpper(m[2])
		date := m[3]
		ver := m[4]
		znum := strings.ToUpper(m[5])
		return ParsedCreative{offer, &geo, &date, &ver, &znum}
	}

	zOnly := regexp.MustCompile(`(?i)[_\- ](Z\d+)$|(Z\d+)$`)
	if m := zOnly.FindStringSubmatch(clean); m != nil {
		z := strings.ToUpper(m[1] + m[2])
		return ParsedCreative{clean, nil, nil, nil, &z}
	}
	return ParsedCreative{OfferName: clean}
}

// ─── Service ─────────────────────────────────────────────────────────────────

type Service struct {
	gdb *gorm.DB
}

func New(gdb *gorm.DB) *Service { return &Service{gdb: gdb} }

type RunConfig struct {
	Structure          Structure         `json:"structure"`
	Creatives          []CreativeRef     `json:"creatives"`
	Headlines          map[string]string `json:"headlines"`
	CampaignsPerAccount int             `json:"campaignsPerAccount"`
	Cfg                map[string]string `json:"cfg"`
}

// Run executes a launch job (mock) and updates DB records.
func (s *Service) Run(jobID string, rc RunConfig) error {
	var items []db.LaunchJobItem
	if err := s.gdb.Preload("AdAccount").Where("launch_job_id = ?", jobID).Find(&items).Error; err != nil {
		return err
	}

	successCount, failedCount := 0, 0

	for _, item := range items {
		success := rand.Float64() > 0.15
		now := time.Now()

		if success {
			result := buildResult(item.AdAccount.Name, rc)
			s.gdb.Model(&db.LaunchJobItem{}).Where("id = ?", item.ID).Updates(map[string]interface{}{
				"status":     "SUCCESS",
				"result_json": db.JSON(result),
				"updated_at": now,
			})
			successCount++
		} else {
			errMsg := mockErrors[rand.Intn(len(mockErrors))]
			s.gdb.Model(&db.LaunchJobItem{}).Where("id = ?", item.ID).Updates(map[string]interface{}{
				"status":        "FAILED",
				"error_message": errMsg,
				"updated_at":    now,
			})
			failedCount++
		}
	}

	finalStatus := "COMPLETED"
	if failedCount > 0 && successCount == 0 {
		finalStatus = "FAILED"
	} else if failedCount > 0 {
		finalStatus = "PARTIAL"
	}

	now := time.Now()
	return s.gdb.Model(&db.LaunchJob{}).Where("id = ?", jobID).Updates(map[string]interface{}{
		"status":       finalStatus,
		"success_count": successCount,
		"failed_count": failedCount,
		"completed_at": now,
		"updated_at":   now,
	}).Error
}

func mid(prefix string) string {
	return fmt.Sprintf("%s_%s", prefix, uuid.NewString()[:8])
}

func applyTpl(tpl string, vars map[string]string) string {
	for k, v := range vars {
		tpl = strings.ReplaceAll(tpl, "{"+k+"}", v)
	}
	return tpl
}

func dateStr() string {
	return time.Now().Format("2006-01-02")
}

func buildResult(accountName string, rc RunConfig) map[string]interface{} {
	vars := map[string]string{
		"account":   accountName,
		"date":      dateStr(),
		"objective": rc.Cfg["objective"],
		"creative":  "all",
	}

	switch rc.Structure {
	case StructureCBO:
		adSets := make([]map[string]string, 0, len(rc.Creatives))
		for _, c := range rc.Creatives {
			adSets = append(adSets, map[string]string{
				"adSetId":      mid("adset"),
				"adSetName":    applyTpl(rc.Cfg["adSetNameTpl"], merge(vars, map[string]string{"creative": c.Name})),
				"adId":         mid("ad"),
				"creativeName": c.Name,
			})
		}
		return map[string]interface{}{
			"structure": "CBO",
			"campaign":  map[string]string{"id": mid("camp"), "name": applyTpl(rc.Cfg["campaignNameTpl"], vars)},
			"adSets":    adSets, "totalCampaigns": 1, "totalAdSets": len(rc.Creatives), "totalAds": len(rc.Creatives),
		}

	case StructureABO:
		ads := make([]map[string]string, 0, len(rc.Creatives))
		for _, c := range rc.Creatives {
			ads = append(ads, map[string]string{"adId": mid("ad"), "creativeName": c.Name})
		}
		return map[string]interface{}{
			"structure": "ABO",
			"campaign":  map[string]string{"id": mid("camp"), "name": applyTpl(rc.Cfg["campaignNameTpl"], vars)},
			"adSet":     map[string]string{"id": mid("adset"), "name": applyTpl(rc.Cfg["adSetNameTpl"], vars)},
			"ads":       ads, "totalCampaigns": 1, "totalAdSets": 1, "totalAds": len(rc.Creatives),
		}

	case StructureIsolation:
		camps := make([]map[string]string, 0, len(rc.Creatives))
		for _, c := range rc.Creatives {
			v := merge(vars, map[string]string{"creative": c.Name})
			camps = append(camps, map[string]string{
				"campaignId":   mid("camp"),
				"campaignName": applyTpl(rc.Cfg["campaignNameTpl"], v),
				"adSetId":      mid("adset"), "adId": mid("ad"), "creativeName": c.Name,
			})
		}
		n := len(rc.Creatives)
		return map[string]interface{}{
			"structure": "ISOLATION", "campaigns": camps,
			"totalCampaigns": n, "totalAdSets": n, "totalAds": n,
		}

	default: // Z_GROUPED
		byZ := map[string][]CreativeRef{}
		for _, c := range rc.Creatives {
			z := "Z0"
			if c.ZGroup != nil {
				z = *c.ZGroup
			}
			byZ[z] = append(byZ[z], c)
		}
		n := rc.CampaignsPerAccount
		if n < 1 {
			n = 1
		}
		camps := make([]map[string]interface{}, 0, n)
		totalAds := 0
		for i := 1; i <= n; i++ {
			v := merge(vars, map[string]string{"num": fmt.Sprintf("%d", i)})
			campName := applyTpl(rc.Cfg["campaignNameTpl"], v)
			if n > 1 {
				campName += fmt.Sprintf(" | C%d", i)
			}
			adSets := make([]map[string]interface{}, 0)
			for z, zCreatives := range byZ {
				ads := make([]map[string]string, 0, len(zCreatives))
				for _, c := range zCreatives {
					ads = append(ads, map[string]string{"adId": mid("ad"), "creativeName": c.Name})
					totalAds++
				}
				adSets = append(adSets, map[string]interface{}{
					"adSetId":   mid("adset"),
					"adSetName": applyTpl(rc.Cfg["adSetNameTpl"], merge(v, map[string]string{"zGroup": z, "creative": z})),
					"zGroup":    z, "headline": rc.Headlines[z], "ads": ads,
				})
			}
			camps = append(camps, map[string]interface{}{"campaignId": mid("camp"), "campaignName": campName, "adSets": adSets})
		}
		zCount := len(byZ)
		return map[string]interface{}{
			"structure": "Z_GROUPED", "campaigns": camps,
			"totalCampaigns": n, "totalAdSets": n * zCount, "totalAds": totalAds,
		}
	}
}

func merge(a, b map[string]string) map[string]string {
	out := make(map[string]string, len(a)+len(b))
	for k, v := range a {
		out[k] = v
	}
	for k, v := range b {
		out[k] = v
	}
	return out
}
