package main

import (
	"context"
	"fmt"
	"math/rand"
	"os"
	"strings"
	"sync"
	"time"

	"adops-desktop/internal/audit"
	"adops-desktop/internal/authflow"
	"adops-desktop/internal/db"
	"adops-desktop/internal/health"
	"adops-desktop/internal/launch"
	"adops-desktop/internal/license"
	"adops-desktop/internal/session"
	"adops-desktop/internal/updater"

	"github.com/google/uuid"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"gorm.io/gorm"
)

// ─── App ─────────────────────────────────────────────────────────────────────

type App struct {
	ctx        context.Context
	gdb        *gorm.DB
	auditSvc   *audit.Service
	healthSvc  *health.Service
	launchSvc  *launch.Service
	licenseSvc *license.Service
	authFlow   *authflow.Flow

	// Session
	currentUserID string
	currentUser   *session.User
	sessionMu     sync.RWMutex

	// ready is closed when startup() finishes; IPC calls block on it.
	ready     chan struct{}
	readyOnce sync.Once
}

func NewApp() *App { return &App{ready: make(chan struct{})} }

// waitReady blocks until startup() completes (max 15s).
func (a *App) waitReady() {
	select {
	case <-a.ready:
	case <-time.After(15 * time.Second):
	}
}

func (a *App) startup(ctx context.Context) {
	defer a.readyOnce.Do(func() { close(a.ready) })
	a.ctx = ctx
	gdb, err := db.Open()
	if err != nil {
		fmt.Println("[startup] DB open failed:", err.Error())
		return
	}
	a.gdb = gdb
	a.auditSvc = audit.New(gdb)
	a.healthSvc = health.New(gdb)
	a.launchSvc = launch.New(gdb)
	a.licenseSvc = license.New(gdb)
	a.authFlow = authflow.New()
	a.restoreSession()
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

type AuthResponse struct {
	User  *session.User `json:"user"`
	Error string        `json:"error,omitempty"`
}

func (a *App) IsSetup() bool {
	a.waitReady()
	return true
}

type LoginFlowResponse struct {
	URL   string `json:"url,omitempty"`
	Error string `json:"error,omitempty"`
}

func (a *App) StartLoginFlow() LoginFlowResponse {
	a.waitReady()
	loginURL, err := a.authFlow.Start(webURL(), func(s session.Session) error {
		if err := session.Save(s); err != nil {
			return err
		}
		a.setSession(s.User())
		return nil
	})
	if err != nil {
		return LoginFlowResponse{Error: err.Error()}
	}
	if a.ctx != nil {
		runtime.BrowserOpenURL(a.ctx, loginURL)
	}
	return LoginFlowResponse{URL: loginURL}
}

func (a *App) Logout() {
	a.sessionMu.Lock()
	a.currentUserID = ""
	a.currentUser = nil
	a.sessionMu.Unlock()
	if a.authFlow != nil {
		a.authFlow.Close()
	}
	_ = session.Clear()
}

func (a *App) GetCurrentUser() AuthResponse {
	a.waitReady()
	a.sessionMu.RLock()
	user := a.currentUser
	a.sessionMu.RUnlock()
	if user == nil {
		return AuthResponse{Error: "not_authenticated"}
	}
	return AuthResponse{User: user}
}

func (a *App) OpenBillingPage() {
	a.waitReady()
	if a.ctx != nil {
		runtime.BrowserOpenURL(a.ctx, webURL()+"/pricing")
	}
}

// ─── Accounts ────────────────────────────────────────────────────────────────

type AccountsResult struct {
	Accounts []db.MetaAdAccount `json:"accounts"`
	Total    int64              `json:"total"`
	Error    string             `json:"error,omitempty"`
}

func (a *App) GetAccounts(poolID, status, search string, archived bool) AccountsResult {
	if a.currentUserID == "" {
		return AccountsResult{Error: "not_authenticated"}
	}
	q := a.gdb.Where("user_id = ? AND archived = ?", a.currentUserID, archived)

	if poolID != "" {
		var ids []string
		a.gdb.Model(&db.AccountPoolItem{}).Where("pool_id = ?", poolID).Pluck("ad_account_id", &ids)
		q = q.Where("id IN ?", ids)
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}
	if search != "" {
		q = q.Where("name LIKE ? OR external_id LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var accounts []db.MetaAdAccount
	var total int64
	q.Count(&total)
	q.Preload("Pools.Pool").Order("created_at desc").Find(&accounts)

	return AccountsResult{Accounts: accounts, Total: total}
}

type AccountInput struct {
	ExternalID string  `json:"externalId"`
	Name       string  `json:"name"`
	Currency   string  `json:"currency"`
	Timezone   string  `json:"timezone"`
	Notes      *string `json:"notes"`
}

func (a *App) CreateAccount(input AccountInput) (db.MetaAdAccount, error) {
	if a.currentUserID == "" {
		return db.MetaAdAccount{}, fmt.Errorf("not_authenticated")
	}
	acc := db.MetaAdAccount{
		ID:          uuid.NewString(),
		UserID:      a.currentUserID,
		ExternalID:  input.ExternalID,
		Name:        input.Name,
		Currency:    orDefault(input.Currency, "USD"),
		Timezone:    orDefault(input.Timezone, "UTC"),
		Notes:       input.Notes,
		Status:      db.AccountUnknown,
		TokenStatus: db.TokenMock,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := a.gdb.Create(&acc).Error; err != nil {
		return db.MetaAdAccount{}, err
	}
	a.auditSvc.OK(a.currentUserID, "create", "MetaAdAccount", acc.ID, db.JSON{"name": acc.Name})
	return acc, nil
}

func (a *App) UpdateAccount(id string, input AccountInput) (db.MetaAdAccount, error) {
	if a.currentUserID == "" {
		return db.MetaAdAccount{}, fmt.Errorf("not_authenticated")
	}
	updates := map[string]interface{}{
		"name": input.Name, "currency": input.Currency,
		"timezone": input.Timezone, "notes": input.Notes, "updated_at": time.Now(),
	}
	if err := a.gdb.Model(&db.MetaAdAccount{}).
		Where("id = ? AND user_id = ?", id, a.currentUserID).
		Updates(updates).Error; err != nil {
		return db.MetaAdAccount{}, err
	}
	var acc db.MetaAdAccount
	a.gdb.First(&acc, "id = ?", id)
	a.auditSvc.OK(a.currentUserID, "update", "MetaAdAccount", id, db.JSON{"name": input.Name})
	return acc, nil
}

func (a *App) ArchiveAccounts(ids []string, archive bool) error {
	if a.currentUserID == "" {
		return fmt.Errorf("not_authenticated")
	}
	return a.gdb.Model(&db.MetaAdAccount{}).
		Where("id IN ? AND user_id = ?", ids, a.currentUserID).
		Updates(map[string]interface{}{"archived": archive, "updated_at": time.Now()}).Error
}

func (a *App) MockImportAccounts(count int) (int, error) {
	if a.currentUserID == "" {
		return 0, fmt.Errorf("not_authenticated")
	}
	if count <= 0 || count > 100 {
		count = 30
	}
	statuses := []db.AccountStatus{db.AccountActive, db.AccountActive, db.AccountActive, db.AccountLimited, db.AccountDisabled}
	tokens := []db.TokenStatus{db.TokenMock, db.TokenMock, db.TokenValid, db.TokenExpired}
	billings := []db.BillingStatus{db.BillingOK, db.BillingOK, db.BillingIssue, db.BillingUnknown}
	geos := []string{"USA", "GBR", "DEU", "FRA", "ESP", "ITA", "POL", "UKR"}

	now := time.Now()
	created := 0
	for i := 0; i < count; i++ {
		geo := geos[rand.Intn(len(geos))]
		extID := fmt.Sprintf("act_%d", rand.Intn(9000000000)+1000000000)
		acc := db.MetaAdAccount{
			ID:            uuid.NewString(),
			UserID:        a.currentUserID,
			ExternalID:    extID,
			Name:          fmt.Sprintf("Кабинет %s #%d", geo, i+1),
			Currency:      "USD",
			Timezone:      "UTC",
			Status:        statuses[rand.Intn(len(statuses))],
			TokenStatus:   tokens[rand.Intn(len(tokens))],
			BillingStatus: billings[rand.Intn(len(billings))],
			CreatedAt:     now,
			UpdatedAt:     now,
		}
		if rand.Float32() > 0.3 {
			limit := float64(rand.Intn(5)*50 + 50)
			acc.SpendLimit = &limit
		}
		if a.gdb.Create(&acc).Error == nil {
			created++
		}
	}
	a.auditSvc.OK(a.currentUserID, "import", "MetaAdAccount", "bulk", db.JSON{"count": created})
	return created, nil
}

// ─── Pools ────────────────────────────────────────────────────────────────────

type PoolsResult struct {
	Pools []db.AccountPool `json:"pools"`
}

func (a *App) GetPools() PoolsResult {
	if a.currentUserID == "" {
		return PoolsResult{}
	}
	var pools []db.AccountPool
	a.gdb.Where("user_id = ?", a.currentUserID).
		Preload("Items.AdAccount").
		Order("created_at desc").Find(&pools)
	return PoolsResult{Pools: pools}
}

type PoolInput struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
	Color       string  `json:"color"`
}

func (a *App) CreatePool(input PoolInput) (db.AccountPool, error) {
	if a.currentUserID == "" {
		return db.AccountPool{}, fmt.Errorf("not_authenticated")
	}
	pool := db.AccountPool{
		ID:          uuid.NewString(),
		UserID:      a.currentUserID,
		Name:        input.Name,
		Description: input.Description,
		Color:       orDefault(input.Color, "#2563eb"),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := a.gdb.Create(&pool).Error; err != nil {
		return db.AccountPool{}, err
	}
	a.auditSvc.OK(a.currentUserID, "create", "AccountPool", pool.ID, db.JSON{"name": pool.Name})
	return pool, nil
}

func (a *App) DeletePool(id string) error {
	if a.currentUserID == "" {
		return fmt.Errorf("not_authenticated")
	}
	return a.gdb.Where("id = ? AND user_id = ?", id, a.currentUserID).Delete(&db.AccountPool{}).Error
}

func (a *App) AddAccountsToPool(poolID string, accountIDs []string) error {
	if a.currentUserID == "" {
		return fmt.Errorf("not_authenticated")
	}
	for _, aid := range accountIDs {
		item := db.AccountPoolItem{
			ID: uuid.NewString(), UserID: a.currentUserID,
			PoolID: poolID, AdAccountID: aid, CreatedAt: time.Now(),
		}
		a.gdb.Where(db.AccountPoolItem{PoolID: poolID, AdAccountID: aid}).FirstOrCreate(&item)
	}
	return nil
}

func (a *App) RemoveAccountFromPool(poolID, accountID string) error {
	return a.gdb.Where("pool_id = ? AND ad_account_id = ? AND user_id = ?",
		poolID, accountID, a.currentUserID).Delete(&db.AccountPoolItem{}).Error
}

// ─── Health Checks ────────────────────────────────────────────────────────────

type HealthResult struct {
	Check *db.AccountHealthCheck `json:"check"`
	Error string                 `json:"error,omitempty"`
}

func (a *App) RunHealthCheck(adAccountID string) HealthResult {
	if a.currentUserID == "" {
		return HealthResult{Error: "not_authenticated"}
	}
	hc, err := a.healthSvc.RunCheck(a.currentUserID, adAccountID)
	if err != nil {
		a.auditSvc.Fail(a.currentUserID, "health-check", "MetaAdAccount", adAccountID, err.Error())
		return HealthResult{Error: err.Error()}
	}
	a.auditSvc.OK(a.currentUserID, "health-check", "MetaAdAccount", adAccountID, db.JSON{"score": hc.Score})
	return HealthResult{Check: hc}
}

func (a *App) RunBulkHealthCheck(adAccountIDs []string) []HealthResult {
	results := make([]HealthResult, 0, len(adAccountIDs))
	for _, id := range adAccountIDs {
		results = append(results, a.RunHealthCheck(id))
	}
	return results
}

func (a *App) GetHealthHistory(adAccountID string, limit int) []db.AccountHealthCheck {
	var checks []db.AccountHealthCheck
	a.gdb.Where("ad_account_id = ? AND user_id = ?", adAccountID, a.currentUserID).
		Order("created_at desc").Limit(limit).Find(&checks)
	return checks
}

// ─── Creatives ────────────────────────────────────────────────────────────────

type CreativesResult struct {
	Creatives []db.Creative `json:"creatives"`
}

func (a *App) GetCreatives(geo, zGroup string) CreativesResult {
	if a.currentUserID == "" {
		return CreativesResult{}
	}
	q := a.gdb.Where("user_id = ?", a.currentUserID)
	if geo != "" {
		q = q.Where("geo = ?", geo)
	}
	if zGroup != "" {
		q = q.Where("z_group = ?", zGroup)
	}
	var creatives []db.Creative
	q.Order("created_at desc").Find(&creatives)
	return CreativesResult{Creatives: creatives}
}

type CreativeInput struct {
	Name           string  `json:"name"`
	Type           string  `json:"type"`
	ZGroup         *string `json:"zGroup"`
	Geo            *string `json:"geo"`
	MediaURL       *string `json:"mediaUrl"`
	Headline       *string `json:"headline"`
	PrimaryText    *string `json:"primaryText"`
	Description    *string `json:"description"`
	CallToAction   string  `json:"callToAction"`
	DestinationURL *string `json:"destinationUrl"`
}

func (a *App) CreateCreative(input CreativeInput) (db.Creative, error) {
	if a.currentUserID == "" {
		return db.Creative{}, fmt.Errorf("not_authenticated")
	}
	c := db.Creative{
		ID: uuid.NewString(), UserID: a.currentUserID,
		Name: input.Name, Type: orDefault(input.Type, "IMAGE"),
		ZGroup: input.ZGroup, Geo: input.Geo, MediaURL: input.MediaURL,
		Headline: input.Headline, PrimaryText: input.PrimaryText,
		Description:    input.Description,
		CallToAction:   orDefault(input.CallToAction, "LEARN_MORE"),
		DestinationURL: input.DestinationURL,
		CreatedAt:      time.Now(), UpdatedAt: time.Now(),
	}

	// Auto-parse Z-group and geo from name if not provided
	if c.ZGroup == nil || c.Geo == nil {
		parsed := launch.ParseCreativeFilename(input.Name)
		if c.ZGroup == nil {
			c.ZGroup = parsed.ZNum
		}
		if c.Geo == nil {
			c.Geo = parsed.Geo
		}
	}

	if err := a.gdb.Create(&c).Error; err != nil {
		return db.Creative{}, err
	}
	return c, nil
}

func (a *App) DeleteCreative(id string) error {
	return a.gdb.Where("id = ? AND user_id = ?", id, a.currentUserID).Delete(&db.Creative{}).Error
}

// ─── Campaign Templates ───────────────────────────────────────────────────────

type TemplatesResult struct {
	Templates []db.CampaignTemplate `json:"templates"`
}

func (a *App) GetTemplates() TemplatesResult {
	if a.currentUserID == "" {
		return TemplatesResult{}
	}
	var templates []db.CampaignTemplate
	a.gdb.Where("user_id = ?", a.currentUserID).Order("created_at desc").Find(&templates)
	return TemplatesResult{Templates: templates}
}

type TemplateInput struct {
	Name             string   `json:"name"`
	Objective        string   `json:"objective"`
	CampaignStatus   string   `json:"campaignStatus"`
	DailyBudget      *float64 `json:"dailyBudget"`
	BidStrategy      string   `json:"bidStrategy"`
	OptimizationGoal string   `json:"optimizationGoal"`
	AdSetNameTpl     string   `json:"adSetNameTpl"`
	AdNameTpl        string   `json:"adNameTpl"`
}

func (a *App) CreateTemplate(input TemplateInput) (db.CampaignTemplate, error) {
	if a.currentUserID == "" {
		return db.CampaignTemplate{}, fmt.Errorf("not_authenticated")
	}
	t := db.CampaignTemplate{
		ID: uuid.NewString(), UserID: a.currentUserID,
		Name: input.Name, Objective: input.Objective,
		CampaignStatus:   orDefault(input.CampaignStatus, "PAUSED"),
		DailyBudget:      input.DailyBudget,
		BidStrategy:      orDefault(input.BidStrategy, "LOWEST_COST_WITHOUT_CAP"),
		OptimizationGoal: orDefault(input.OptimizationGoal, "LINK_CLICKS"),
		BillingEvent:     "IMPRESSIONS",
		AdSetNameTpl:     orDefault(input.AdSetNameTpl, "{account} - AdSet"),
		AdNameTpl:        orDefault(input.AdNameTpl, "{account} - {creative}"),
		CreatedAt:        time.Now(), UpdatedAt: time.Now(),
	}
	if err := a.gdb.Create(&t).Error; err != nil {
		return db.CampaignTemplate{}, err
	}
	return t, nil
}

func (a *App) DeleteTemplate(id string) error {
	return a.gdb.Where("id = ? AND user_id = ?", id, a.currentUserID).Delete(&db.CampaignTemplate{}).Error
}

// ─── Headline Sets ────────────────────────────────────────────────────────────

type HeadlineSetsResult struct {
	Sets []db.HeadlineSet `json:"sets"`
}

func (a *App) GetHeadlineSets() HeadlineSetsResult {
	if a.currentUserID == "" {
		return HeadlineSetsResult{}
	}
	var sets []db.HeadlineSet
	a.gdb.Where("user_id = ?", a.currentUserID).Order("created_at desc").Find(&sets)
	return HeadlineSetsResult{Sets: sets}
}

type HeadlineSetInput struct {
	Name          string            `json:"name"`
	Geo           *string           `json:"geo"`
	HeadlinesJSON map[string]string `json:"headlinesJson"`
}

func (a *App) CreateHeadlineSet(input HeadlineSetInput) (db.HeadlineSet, error) {
	if a.currentUserID == "" {
		return db.HeadlineSet{}, fmt.Errorf("not_authenticated")
	}
	jsonMap := db.JSON{}
	for k, v := range input.HeadlinesJSON {
		jsonMap[k] = v
	}
	hs := db.HeadlineSet{
		ID: uuid.NewString(), UserID: a.currentUserID,
		Name: input.Name, Source: "MANUAL", Geo: input.Geo,
		HeadlinesJSON: jsonMap,
		CreatedAt:     time.Now(), UpdatedAt: time.Now(),
	}
	if err := a.gdb.Create(&hs).Error; err != nil {
		return db.HeadlineSet{}, err
	}
	return hs, nil
}

// KeitaroSync — mock sync of headlines from Keitaro tracker.
func (a *App) KeitaroSync(name, keitaroURL, apiKey, campaignID string, geo *string) (db.HeadlineSet, error) {
	if a.currentUserID == "" {
		return db.HeadlineSet{}, fmt.Errorf("not_authenticated")
	}
	// Mock: generate random headlines for Z1-Z5
	headlines := db.JSON{
		"Z1": "Похудей за 30 дней без диет!",
		"Z2": "Секрет стройности раскрыт врачами",
		"Z3": "Минус 10 кг за месяц — реальные истории",
		"Z4": "Новый метод похудения покоряет мир",
		"Z5": "Учёные шокировали диетологов",
	}
	hs := db.HeadlineSet{
		ID: uuid.NewString(), UserID: a.currentUserID,
		Name: name, Source: "KEITARO", Geo: geo,
		HeadlinesJSON: headlines,
		CreatedAt:     time.Now(), UpdatedAt: time.Now(),
	}
	if err := a.gdb.Create(&hs).Error; err != nil {
		return db.HeadlineSet{}, err
	}
	a.auditSvc.OK(a.currentUserID, "sync", "HeadlineSet", hs.ID, db.JSON{"source": "keitaro"})
	return hs, nil
}

func (a *App) DeleteHeadlineSet(id string) error {
	return a.gdb.Where("id = ? AND user_id = ?", id, a.currentUserID).Delete(&db.HeadlineSet{}).Error
}

// ─── Launch Jobs ──────────────────────────────────────────────────────────────

type LaunchInput struct {
	Name                string            `json:"name"`
	AccountIDs          []string          `json:"accountIds"`
	CreativeIDs         []string          `json:"creativeIds"`
	Structure           launch.Structure  `json:"structure"`
	HeadlineSetID       string            `json:"headlineSetId"`
	CampaignsPerAccount int               `json:"campaignsPerAccount"`
	Config              map[string]string `json:"config"`
}

type LaunchResult struct {
	Job   *db.LaunchJob `json:"job"`
	Error string        `json:"error,omitempty"`
}

func (a *App) CreateLaunchJob(input LaunchInput) LaunchResult {
	if a.currentUserID == "" {
		return LaunchResult{Error: "not_authenticated"}
	}

	// Load creatives
	var creatives []db.Creative
	a.gdb.Where("id IN ? AND user_id = ?", input.CreativeIDs, a.currentUserID).Find(&creatives)
	creativeRefs := make([]launch.CreativeRef, 0, len(creatives))
	for _, c := range creatives {
		creativeRefs = append(creativeRefs, launch.CreativeRef{
			ID: c.ID, Name: c.Name, ZGroup: c.ZGroup, Geo: c.Geo,
		})
	}

	// Load headlines if set
	headlines := map[string]string{}
	if input.HeadlineSetID != "" {
		var hs db.HeadlineSet
		if a.gdb.First(&hs, "id = ? AND user_id = ?", input.HeadlineSetID, a.currentUserID).Error == nil {
			for k, v := range hs.HeadlinesJSON {
				if s, ok := v.(string); ok {
					headlines[k] = s
				}
			}
		}
	}

	// Create job
	now := time.Now()
	job := db.LaunchJob{
		ID: uuid.NewString(), UserID: a.currentUserID,
		Name: input.Name, Status: "RUNNING",
		TotalAccounts: len(input.AccountIDs),
		ConfigJSON: db.JSON{
			"structure":       string(input.Structure),
			"objective":       input.Config["objective"],
			"campaignStatus":  input.Config["campaignStatus"],
			"campaignNameTpl": input.Config["campaignNameTpl"],
			"adSetNameTpl":    input.Config["adSetNameTpl"],
			"adNameTpl":       input.Config["adNameTpl"],
		},
		CreatedAt: now, UpdatedAt: now,
	}
	if err := a.gdb.Create(&job).Error; err != nil {
		return LaunchResult{Error: err.Error()}
	}

	// Create job items
	for _, aid := range input.AccountIDs {
		item := db.LaunchJobItem{
			ID: uuid.NewString(), LaunchJobID: job.ID,
			AdAccountID: aid, UserID: a.currentUserID,
			Status: "PENDING", CreatedAt: now, UpdatedAt: now,
		}
		a.gdb.Create(&item)
	}

	// Run (synchronous mock)
	rc := launch.RunConfig{
		Structure:           input.Structure,
		Creatives:           creativeRefs,
		Headlines:           headlines,
		CampaignsPerAccount: input.CampaignsPerAccount,
		Cfg:                 input.Config,
	}
	if err := a.launchSvc.Run(job.ID, rc); err != nil {
		return LaunchResult{Error: err.Error()}
	}

	// Return full job with items
	var fullJob db.LaunchJob
	a.gdb.Preload("Items.AdAccount").First(&fullJob, "id = ?", job.ID)

	a.auditSvc.OK(a.currentUserID, "launch", "LaunchJob", job.ID, db.JSON{
		"accounts": len(input.AccountIDs), "structure": string(input.Structure),
	})

	return LaunchResult{Job: &fullJob}
}

func (a *App) GetLaunchJobs(limit int) []db.LaunchJob {
	if a.currentUserID == "" {
		return nil
	}
	var jobs []db.LaunchJob
	a.gdb.Where("user_id = ?", a.currentUserID).
		Order("created_at desc").Limit(limit).Find(&jobs)
	return jobs
}

func (a *App) GetLaunchJob(id string) (*db.LaunchJob, error) {
	var job db.LaunchJob
	if err := a.gdb.Preload("Items.AdAccount").
		First(&job, "id = ? AND user_id = ?", id, a.currentUserID).Error; err != nil {
		return nil, err
	}
	return &job, nil
}

// ─── Audit ────────────────────────────────────────────────────────────────────

func (a *App) GetAuditLogs(limit, offset int) []db.AuditLog {
	if a.currentUserID == "" {
		return nil
	}
	logs, _ := a.auditSvc.List(a.currentUserID, limit, offset)
	return logs
}

// ─── License ─────────────────────────────────────────────────────────────────

func (a *App) ActivateLicense(key string) (license.Status, error) {
	return a.licenseSvc.Activate(key)
}

func (a *App) GetLicenseStatus() license.Status {
	return a.licenseSvc.GetStatus()
}

// ─── Meta mock sync ───────────────────────────────────────────────────────────

func (a *App) MockSyncAccount(id string) error {
	if a.currentUserID == "" {
		return fmt.Errorf("not_authenticated")
	}
	statuses := []db.AccountStatus{db.AccountActive, db.AccountActive, db.AccountLimited, db.AccountDisabled}
	tokens := []db.TokenStatus{db.TokenMock, db.TokenValid, db.TokenExpired}
	billings := []db.BillingStatus{db.BillingOK, db.BillingOK, db.BillingIssue}
	now := time.Now()

	err := a.gdb.Model(&db.MetaAdAccount{}).
		Where("id = ? AND user_id = ?", id, a.currentUserID).
		Updates(map[string]interface{}{
			"status":         statuses[rand.Intn(len(statuses))],
			"token_status":   tokens[rand.Intn(len(tokens))],
			"billing_status": billings[rand.Intn(len(billings))],
			"last_sync_at":   now,
			"updated_at":     now,
		}).Error

	if err == nil {
		a.auditSvc.OK(a.currentUserID, "sync", "MetaAdAccount", id, db.JSON{"source": "mock"})
	}
	return err
}

// ─── Updater ─────────────────────────────────────────────────────────────────

type UpdateInfo struct {
	Available bool   `json:"available"`
	Version   string `json:"version"`
	URL       string `json:"url"`
	Notes     string `json:"notes"`
}

func (a *App) CheckForUpdate() UpdateInfo {
	info, err := updater.Check(webURL(), Version)
	if err != nil {
		return UpdateInfo{}
	}
	return UpdateInfo(info)
}

func (a *App) OpenReleasePage() {
	if a.ctx != nil {
		runtime.BrowserOpenURL(a.ctx, "https://github.com/sheldonalex20202-ui/-AdOps_Cockpit/releases/latest")
	}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func orDefault(s, def string) string {
	if s == "" {
		return def
	}
	return s
}

func (a *App) restoreSession() {
	s, err := session.Load()
	if err != nil || s.Expired() {
		return
	}
	// JWT is self-contained with a 30-day expiry — no network call needed on startup.
	// Online verify would hit a cold-start Vercel function and time out,
	// causing Clear() to delete a perfectly valid session.
	a.setSession(s.User())
}

func (a *App) setSession(user session.User) {
	a.sessionMu.Lock()
	defer a.sessionMu.Unlock()
	a.currentUserID = user.ID
	a.currentUser = &user
}

func webURL() string {
	if v := strings.TrimRight(os.Getenv("ADOPS_WEB_URL"), "/"); v != "" {
		return v
	}
	return "https://ad-ops-cockpit-2rxv82q03-sheldonalex20202-uis-projects.vercel.app"
}
