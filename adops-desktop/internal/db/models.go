package db

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// ─── JSON helper ─────────────────────────────────────────────────────────────

type JSON map[string]interface{}

func (j JSON) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	b, err := json.Marshal(j)
	return string(b), err
}

func (j *JSON) Scan(val interface{}) error {
	if val == nil {
		*j = nil
		return nil
	}
	var s string
	switch v := val.(type) {
	case string:
		s = v
	case []byte:
		s = string(v)
	default:
		return fmt.Errorf("unsupported type: %T", val)
	}
	return json.Unmarshal([]byte(s), j)
}

// ─── Enums ───────────────────────────────────────────────────────────────────

type ConnectionStatus string

const (
	ConnectionActive  ConnectionStatus = "ACTIVE"
	ConnectionExpired ConnectionStatus = "EXPIRED"
	ConnectionError   ConnectionStatus = "ERROR"
	ConnectionMock    ConnectionStatus = "MOCK"
)

type AccountStatus string

const (
	AccountActive       AccountStatus = "ACTIVE"
	AccountLimited      AccountStatus = "LIMITED"
	AccountDisabled     AccountStatus = "DISABLED"
	AccountBillingIssue AccountStatus = "BILLING_ISSUE"
	AccountUnknown      AccountStatus = "UNKNOWN"
)

type ReadinessStatus string

const (
	ReadinessReady          ReadinessStatus = "READY"
	ReadinessNeedsAttention ReadinessStatus = "NEEDS_ATTENTION"
	ReadinessBlocked        ReadinessStatus = "BLOCKED"
	ReadinessUnknown        ReadinessStatus = "UNKNOWN"
)

type TokenStatus string

const (
	TokenValid   TokenStatus = "VALID"
	TokenExpired TokenStatus = "EXPIRED"
	TokenError   TokenStatus = "ERROR"
	TokenMock    TokenStatus = "MOCK"
	TokenUnknown TokenStatus = "UNKNOWN"
)

type BillingStatus string

const (
	BillingOK      BillingStatus = "OK"
	BillingIssue   BillingStatus = "ISSUE"
	BillingUnknown BillingStatus = "UNKNOWN"
)

type AuditResult string

const (
	AuditSuccess AuditResult = "SUCCESS"
	AuditFailed  AuditResult = "FAILED"
)

// ─── Models ──────────────────────────────────────────────────────────────────

type User struct {
	ID        string    `gorm:"primaryKey;type:text" json:"id"`
	Email     string    `gorm:"uniqueIndex;type:text" json:"email"`
	Name      string    `gorm:"type:text" json:"name"`
	PassHash  string    `gorm:"type:text" json:"-"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type MetaConnection struct {
	ID                   string           `gorm:"primaryKey;type:text" json:"id"`
	UserID               string           `gorm:"index;type:text" json:"userId"`
	Name                 string           `gorm:"type:text" json:"name"`
	AccessTokenEncrypted string           `gorm:"type:text" json:"accessTokenEncrypted,omitempty"`
	Status               ConnectionStatus `gorm:"type:text;default:'MOCK'" json:"status"`
	CreatedAt            time.Time        `json:"createdAt"`
	UpdatedAt            time.Time        `json:"updatedAt"`
}

type MetaAdAccount struct {
	ID               string          `gorm:"primaryKey;type:text" json:"id"`
	UserID           string          `gorm:"index;type:text" json:"userId"`
	ConnectionID     *string         `gorm:"type:text" json:"connectionId"`
	ExternalID       string          `gorm:"type:text" json:"externalId"`
	Name             string          `gorm:"type:text" json:"name"`
	Currency         string          `gorm:"type:text;default:'USD'" json:"currency"`
	Timezone         string          `gorm:"type:text;default:'UTC'" json:"timezone"`
	Status           AccountStatus   `gorm:"type:text;default:'UNKNOWN'" json:"status"`
	ReadinessStatus  ReadinessStatus `gorm:"type:text;default:'UNKNOWN'" json:"readinessStatus"`
	ReadinessScore   int             `gorm:"default:0" json:"readinessScore"`
	BillingStatus    BillingStatus   `gorm:"type:text;default:'UNKNOWN'" json:"billingStatus"`
	TokenStatus      TokenStatus     `gorm:"type:text;default:'UNKNOWN'" json:"tokenStatus"`
	SpendLimit       *float64        `json:"spendLimit"`
	Notes            *string         `gorm:"type:text" json:"notes"`
	LastSyncAt       *time.Time      `json:"lastSyncAt"`
	LastHealthCheckAt *time.Time     `json:"lastHealthCheckAt"`
	Archived         bool            `gorm:"default:false" json:"archived"`
	CreatedAt        time.Time       `json:"createdAt"`
	UpdatedAt        time.Time       `json:"updatedAt"`

	Pools []AccountPoolItem `gorm:"foreignKey:AdAccountID" json:"pools,omitempty"`
}

type AccountPool struct {
	ID          string    `gorm:"primaryKey;type:text" json:"id"`
	UserID      string    `gorm:"index;type:text" json:"userId"`
	Name        string    `gorm:"type:text" json:"name"`
	Description *string   `gorm:"type:text" json:"description"`
	Color       string    `gorm:"type:text;default:'#2563eb'" json:"color"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`

	Items []AccountPoolItem `gorm:"foreignKey:PoolID" json:"items,omitempty"`
}

type AccountPoolItem struct {
	ID         string    `gorm:"primaryKey;type:text" json:"id"`
	UserID     string    `gorm:"index;type:text" json:"userId"`
	PoolID     string    `gorm:"index;type:text" json:"poolId"`
	AdAccountID string   `gorm:"index;type:text" json:"adAccountId"`
	CreatedAt  time.Time `json:"createdAt"`

	Pool      *AccountPool   `gorm:"foreignKey:PoolID" json:"pool,omitempty"`
	AdAccount *MetaAdAccount `gorm:"foreignKey:AdAccountID" json:"adAccount,omitempty"`
}

type AccountHealthCheck struct {
	ID         string          `gorm:"primaryKey;type:text" json:"id"`
	UserID     string          `gorm:"index;type:text" json:"userId"`
	AdAccountID string         `gorm:"index;type:text" json:"adAccountId"`
	Score      int             `json:"score"`
	Status     ReadinessStatus `gorm:"type:text" json:"status"`
	ChecksJSON JSON            `gorm:"type:text" json:"checksJson"`
	CreatedAt  time.Time       `json:"createdAt"`
}

type AuditLog struct {
	ID           string      `gorm:"primaryKey;type:text" json:"id"`
	UserID       *string     `gorm:"type:text" json:"userId"`
	Action       string      `gorm:"type:text" json:"action"`
	ObjectType   string      `gorm:"type:text" json:"objectType"`
	ObjectID     *string     `gorm:"type:text" json:"objectId"`
	OldValueJSON JSON        `gorm:"type:text" json:"oldValueJson"`
	NewValueJSON JSON        `gorm:"type:text" json:"newValueJson"`
	Result       AuditResult `gorm:"type:text;default:'SUCCESS'" json:"result"`
	ErrorMessage *string     `gorm:"type:text" json:"errorMessage"`
	CreatedAt    time.Time   `json:"createdAt"`
}

type CampaignTemplate struct {
	ID               string    `gorm:"primaryKey;type:text" json:"id"`
	UserID           string    `gorm:"index;type:text" json:"userId"`
	Name             string    `gorm:"type:text" json:"name"`
	Objective        string    `gorm:"type:text" json:"objective"`
	BuyingType       string    `gorm:"type:text;default:'AUCTION'" json:"buyingType"`
	CampaignStatus   string    `gorm:"type:text;default:'PAUSED'" json:"campaignStatus"`
	DailyBudget      *float64  `json:"dailyBudget"`
	BidStrategy      string    `gorm:"type:text;default:'LOWEST_COST_WITHOUT_CAP'" json:"bidStrategy"`
	OptimizationGoal string    `gorm:"type:text;default:'LINK_CLICKS'" json:"optimizationGoal"`
	BillingEvent     string    `gorm:"type:text;default:'IMPRESSIONS'" json:"billingEvent"`
	TargetingJSON    JSON      `gorm:"type:text" json:"targetingJson"`
	AdSetNameTpl     string    `gorm:"type:text;default:'{account} - AdSet'" json:"adSetNameTpl"`
	AdNameTpl        string    `gorm:"type:text;default:'{account} - {creative}'" json:"adNameTpl"`
	CampaignNameTpl  string    `gorm:"type:text;default:'{account} | {date}'" json:"campaignNameTpl"`
	Vertical         string    `gorm:"type:text;default:''" json:"vertical"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type Creative struct {
	ID             string    `gorm:"primaryKey;type:text" json:"id"`
	UserID         string    `gorm:"index;type:text" json:"userId"`
	Name           string    `gorm:"type:text" json:"name"`
	Type           string    `gorm:"type:text;default:'IMAGE'" json:"type"`
	ZGroup         *string   `gorm:"type:text" json:"zGroup"`
	Geo            *string   `gorm:"type:text" json:"geo"`
	MediaURL       *string   `gorm:"type:text" json:"mediaUrl"`
	Headline       *string   `gorm:"type:text" json:"headline"`
	PrimaryText    *string   `gorm:"type:text" json:"primaryText"`
	Description    *string   `gorm:"type:text" json:"description"`
	CallToAction   string    `gorm:"type:text;default:'LEARN_MORE'" json:"callToAction"`
	DestinationURL *string   `gorm:"type:text" json:"destinationUrl"`
	Angle          *string   `gorm:"type:text" json:"angle"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type HeadlineSet struct {
	ID            string    `gorm:"primaryKey;type:text" json:"id"`
	UserID        string    `gorm:"index;type:text" json:"userId"`
	Name          string    `gorm:"type:text" json:"name"`
	Source        string    `gorm:"type:text;default:'MANUAL'" json:"source"`
	ExternalID    *string   `gorm:"type:text" json:"externalId"`
	Geo           *string   `gorm:"type:text" json:"geo"`
	HeadlinesJSON JSON      `gorm:"type:text" json:"headlinesJson"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type LaunchJob struct {
	ID                 string    `gorm:"primaryKey;type:text" json:"id"`
	UserID             string    `gorm:"index;type:text" json:"userId"`
	Name               string    `gorm:"type:text" json:"name"`
	CampaignTemplateID *string   `gorm:"type:text" json:"campaignTemplateId"`
	Status             string    `gorm:"type:text;default:'PENDING'" json:"status"`
	TotalAccounts      int       `gorm:"default:0" json:"totalAccounts"`
	SuccessCount       int       `gorm:"default:0" json:"successCount"`
	FailedCount        int       `gorm:"default:0" json:"failedCount"`
	ConfigJSON         JSON      `gorm:"type:text" json:"configJson"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
	CompletedAt        *time.Time `json:"completedAt"`

	Items []LaunchJobItem `gorm:"foreignKey:LaunchJobID" json:"items,omitempty"`
}

type LaunchJobItem struct {
	ID           string     `gorm:"primaryKey;type:text" json:"id"`
	LaunchJobID  string     `gorm:"index;type:text" json:"launchJobId"`
	AdAccountID  string     `gorm:"index;type:text" json:"adAccountId"`
	UserID       string     `gorm:"index;type:text" json:"userId"`
	Status       string     `gorm:"type:text;default:'PENDING'" json:"status"`
	ErrorMessage *string    `gorm:"type:text" json:"errorMessage"`
	ResultJSON   JSON       `gorm:"type:text" json:"resultJson"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`

	AdAccount *MetaAdAccount `gorm:"foreignKey:AdAccountID" json:"adAccount,omitempty"`
}

// ─── App settings (single row) ────────────────────────────────────────────────

type AppSettings struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	UserID       string    `gorm:"type:text" json:"userId"`
	LicenseKey   string    `gorm:"type:text" json:"licenseKey"`
	LicenseValid bool      `gorm:"default:false" json:"licenseValid"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// ─── Autocontrol ──────────────────────────────────────────────────────────────

// AutocontrolConfig — singleton per user
type AutocontrolConfig struct {
	ID              string     `gorm:"primaryKey;type:text" json:"id"`
	UserID          string     `gorm:"uniqueIndex;type:text" json:"userId"`
	Enabled         bool       `gorm:"default:false" json:"enabled"`
	IntervalMinutes int        `gorm:"default:20" json:"intervalMinutes"`
	LastRunAt       *time.Time `json:"lastRunAt"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

// GeoRule — one rule per GEO with CPA/spend thresholds
type GeoRule struct {
	ID               string    `gorm:"primaryKey;type:text" json:"id"`
	UserID           string    `gorm:"index;type:text" json:"userId"`
	Geo              string    `gorm:"type:text" json:"geo"`
	Enabled          bool      `gorm:"default:true" json:"enabled"`
	MaxCPA           *float64  `json:"maxCpa"`
	MaxSpendNoConv   *float64  `json:"maxSpendNoConv"`
	MaxUCPCNoConv    *float64  `json:"maxUcpcNoConv"`
	MaxSpendHighUCPC *float64  `json:"maxSpendHighUcpc"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

// PauseWindow — global time window where autocontrol doesn't run
type PauseWindow struct {
	ID        string    `gorm:"primaryKey;type:text" json:"id"`
	UserID    string    `gorm:"index;type:text" json:"userId"`
	Label     string    `gorm:"type:text" json:"label"`
	DayOfWeek int       `gorm:"default:-1" json:"dayOfWeek"` // -1=every day, 0=Sun..6=Sat
	StartHour int       `json:"startHour"`
	EndHour   int       `json:"endHour"`
	Enabled   bool      `gorm:"default:true" json:"enabled"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// AutocontrolCycle — one scheduled run
type AutocontrolCycle struct {
	ID           string                 `gorm:"primaryKey;type:text" json:"id"`
	UserID       string                 `gorm:"index;type:text" json:"userId"`
	Status       string                 `gorm:"type:text;default:'RUNNING'" json:"status"`
	ActionsTaken int                    `gorm:"default:0" json:"actionsTaken"`
	Paused       int                    `gorm:"default:0" json:"paused"`
	Resumed      int                    `gorm:"default:0" json:"resumed"`
	Skipped      int                    `gorm:"default:0" json:"skipped"`
	ErrorMessage *string                `gorm:"type:text" json:"errorMessage"`
	StartedAt    time.Time              `json:"startedAt"`
	CompletedAt  *time.Time             `json:"completedAt"`
	Items        []AutocontrolCycleItem `gorm:"foreignKey:CycleID" json:"items,omitempty"`
}

// AutocontrolCycleItem — per-adset action within a cycle
type AutocontrolCycleItem struct {
	ID            string    `gorm:"primaryKey;type:text" json:"id"`
	CycleID       string    `gorm:"index;type:text" json:"cycleId"`
	UserID        string    `gorm:"index;type:text" json:"userId"`
	AdAccountID   string    `gorm:"index;type:text" json:"adAccountId"`
	AdAccountName string    `gorm:"type:text" json:"adAccountName"`
	AdSetID       string    `gorm:"type:text" json:"adSetId"`
	AdSetName     string    `gorm:"type:text" json:"adSetName"`
	Geo           string    `gorm:"type:text" json:"geo"`
	Action        string    `gorm:"type:text" json:"action"` // PAUSED, RESUMED, SKIPPED, NO_RULE
	Reason        string    `gorm:"type:text" json:"reason"`
	MetricsJSON   JSON      `gorm:"type:text" json:"metricsJson"`
	CreatedAt     time.Time `json:"createdAt"`
}
