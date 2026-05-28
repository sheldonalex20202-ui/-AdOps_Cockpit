package health

import (
	"time"

	"adops-desktop/internal/db"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CheckResult struct {
	Token   string `json:"token"`
	Account string `json:"account"`
	Billing string `json:"billing"`
	Limit   string `json:"limit"`
	Sync    string `json:"sync"`
}

type Service struct {
	gdb *gorm.DB
}

func New(gdb *gorm.DB) *Service { return &Service{gdb: gdb} }

// RunCheck computes readiness score for an ad account and persists the result.
func (s *Service) RunCheck(userID, adAccountID string) (*db.AccountHealthCheck, error) {
	var acc db.MetaAdAccount
	if err := s.gdb.First(&acc, "id = ? AND user_id = ?", adAccountID, userID).Error; err != nil {
		return nil, err
	}

	checks, score := computeChecks(&acc)
	status := scoreToStatus(score)

	now := time.Now()
	hc := &db.AccountHealthCheck{
		ID:          uuid.NewString(),
		UserID:      userID,
		AdAccountID: adAccountID,
		Score:       score,
		Status:      status,
		ChecksJSON:  db.JSON{"token": checks.Token, "account": checks.Account, "billing": checks.Billing, "limit": checks.Limit, "sync": checks.Sync},
		CreatedAt:   now,
	}

	if err := s.gdb.Create(hc).Error; err != nil {
		return nil, err
	}

	// Update account readiness fields
	s.gdb.Model(&db.MetaAdAccount{}).Where("id = ?", adAccountID).Updates(map[string]interface{}{
		"readiness_status":    status,
		"readiness_score":     score,
		"last_health_check_at": now,
		"updated_at":          now,
	})

	return hc, nil
}

func computeChecks(acc *db.MetaAdAccount) (CheckResult, int) {
	score := 0
	var c CheckResult

	// Token check (30 pts)
	switch acc.TokenStatus {
	case db.TokenValid:
		c.Token = "ok"
		score += 30
	case db.TokenMock:
		c.Token = "mock"
		score += 20
	default:
		c.Token = "fail"
	}

	// Account status check (30 pts)
	switch acc.Status {
	case db.AccountActive:
		c.Account = "ok"
		score += 30
	case db.AccountLimited:
		c.Account = "limited"
		score += 15
	default:
		c.Account = "fail"
	}

	// Billing check (20 pts)
	switch acc.BillingStatus {
	case db.BillingOK:
		c.Billing = "ok"
		score += 20
	case db.BillingUnknown:
		c.Billing = "unknown"
		score += 10
	default:
		c.Billing = "fail"
	}

	// Spend limit check (10 pts)
	if acc.SpendLimit != nil && *acc.SpendLimit > 0 {
		c.Limit = "ok"
		score += 10
	} else {
		c.Limit = "none"
		score += 5
	}

	// Sync freshness check (10 pts)
	if acc.LastSyncAt != nil && time.Since(*acc.LastSyncAt) < 24*time.Hour {
		c.Sync = "fresh"
		score += 10
	} else if acc.LastSyncAt != nil {
		c.Sync = "stale"
		score += 5
	} else {
		c.Sync = "never"
	}

	return c, score
}

func scoreToStatus(score int) db.ReadinessStatus {
	switch {
	case score >= 75:
		return db.ReadinessReady
	case score >= 40:
		return db.ReadinessNeedsAttention
	default:
		return db.ReadinessBlocked
	}
}
