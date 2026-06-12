package ai

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"adops-desktop/internal/db"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Service orchestrates command parsing and execution.
type Service struct {
	gdb     *gorm.DB
	mu      sync.Mutex
	pending map[string]*PendingAction
}

// New creates a new AI service.
func New(gdb *gorm.DB) *Service {
	return &Service{
		gdb:     gdb,
		pending: make(map[string]*PendingAction),
	}
}

// ─── Config ──────────────────────────────────────────────────────────────────

func (s *Service) GetConfig(userID string) AIConfig {
	var cfg db.AIConfig
	s.gdb.Where("user_id = ?", userID).First(&cfg)
	return AIConfig{GroqApiKey: cfg.GroqApiKey}
}

func (s *Service) SaveConfig(userID, groqApiKey string) error {
	var existing db.AIConfig
	err := s.gdb.Where("user_id = ?", userID).First(&existing).Error
	if err != nil {
		return s.gdb.Create(&db.AIConfig{
			ID: uuid.NewString(), UserID: userID, GroqApiKey: groqApiKey,
		}).Error
	}
	return s.gdb.Model(&existing).Update("groq_api_key", groqApiKey).Error
}

// ─── Public API ──────────────────────────────────────────────────────────────

// SendMessage parses input and routes to local executor or Groq fallback.
func (s *Service) SendMessage(userID, convID, input string) SendResult {
	cmd := Parse(input)
	if cmd.UseGroq {
		cfg := s.GetConfig(userID)
		return s.handleGroq(userID, cfg.GroqApiKey, input)
	}
	if cmd.Tool == "show_help" {
		return SendResult{Reply: helpText()}
	}
	return s.executeCommand(userID, cmd)
}

// ConfirmAction executes a previously stored pending action.
func (s *Service) ConfirmAction(userID, convID, actionID string) SendResult {
	s.mu.Lock()
	pa := s.pending[actionID]
	if pa == nil {
		s.mu.Unlock()
		return SendResult{Error: "действие не найдено или истекло"}
	}
	if time.Now().After(pa.ExpiresAt) {
		delete(s.pending, actionID)
		s.mu.Unlock()
		return SendResult{Error: "время подтверждения истекло"}
	}
	delete(s.pending, actionID)
	s.mu.Unlock()

	tool := GetTool(pa.ToolName)
	if tool == nil {
		return SendResult{Error: "unknown tool: " + pa.ToolName}
	}
	result, err := tool.Execute(s.gdb, userID, pa.Input)
	exec := ToolExecution{ToolName: pa.ToolName, Label: pa.Label, Risk: pa.Risk, Params: pa.Input}
	if err != nil {
		exec.Error = err.Error()
	} else {
		exec.Result = result
	}
	return SendResult{ToolsExecuted: []ToolExecution{exec}}
}

// CancelAction removes a pending action.
func (s *Service) CancelAction(actionID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok := s.pending[actionID]
	delete(s.pending, actionID)
	return ok
}

// ClearConversation is a no-op in command mode (stateless).
func (s *Service) ClearConversation(convID string) bool { return true }

// ─── Command executor ─────────────────────────────────────────────────────────

func (s *Service) executeCommand(userID string, cmd *ParsedCommand) SendResult {
	// Compound: explain by name query — find account first.
	if cmd.Tool == "accounts_explain_readiness" {
		if query, ok := cmd.Params["query"].(string); ok && query != "" {
			var acc db.MetaAdAccount
			if s.gdb.Where(
				"user_id = ? AND archived = false AND (name LIKE ? OR external_id LIKE ?)",
				userID, "%"+query+"%", "%"+query+"%",
			).Order("readiness_score asc").First(&acc).Error == nil {
				cmd.Params = map[string]interface{}{"accountId": acc.ID}
			} else {
				// Fall back to search so user can pick
				return s.executeCommand(userID, &ParsedCommand{
					Tool:   "accounts_search",
					Params: map[string]interface{}{"search": query},
				})
			}
		} else if _, hasID := cmd.Params["accountId"]; !hasID {
			return SendResult{Reply: "Укажи название: /объясни [название кабинета]"}
		}
	}

	// Compound: add accounts by pool name + filters.
	if cmd.Tool == "pools_add_accounts" {
		if poolQuery, ok := cmd.Params["poolQuery"].(string); ok {
			var pool db.AccountPool
			if s.gdb.Where("user_id = ? AND name LIKE ?", userID, "%"+poolQuery+"%").
				First(&pool).Error != nil {
				return SendResult{Error: fmt.Sprintf("Пул «%s» не найден", poolQuery)}
			}
			filters, _ := cmd.Params["filters"].(map[string]interface{})
			if filters == nil {
				filters = map[string]interface{}{}
			}
			searchTool := GetTool("accounts_search")
			raw, _ := searchTool.Execute(s.gdb, userID, filters)
			b, _ := json.Marshal(raw)
			var sr struct {
				Accounts []struct{ ID string `json:"id"` } `json:"accounts"`
			}
			_ = json.Unmarshal(b, &sr)
			ids := make([]interface{}, 0, len(sr.Accounts))
			for _, a := range sr.Accounts {
				ids = append(ids, a.ID)
			}
			cmd.Params = map[string]interface{}{"poolId": pool.ID, "accountIds": ids}
		}
	}

	tool := GetTool(cmd.Tool)
	if tool == nil {
		return SendResult{Reply: "Команда не найдена. " + helpText()}
	}

	// Needs user confirmation before executing.
	if tool.RequiresConfirmation {
		actionID := uuid.NewString()
		pa := &PendingAction{
			ID:        actionID,
			ToolUseID: actionID,
			ToolName:  cmd.Tool,
			Input:     cmd.Params,
			Summary:   buildSummary(cmd.Tool, cmd.Params),
			Risk:      tool.Risk,
			Label:     labelForTool(cmd.Tool),
			ExpiresAt: time.Now().Add(5 * time.Minute),
		}
		s.mu.Lock()
		s.pending[actionID] = pa
		s.mu.Unlock()
		return SendResult{PendingAction: pa}
	}

	// Execute immediately.
	result, err := tool.Execute(s.gdb, userID, cmd.Params)
	exec := ToolExecution{
		ToolName: cmd.Tool, Label: labelForTool(cmd.Tool),
		Risk: tool.Risk, Params: cmd.Params,
	}
	if err != nil {
		exec.Error = err.Error()
	} else {
		exec.Result = result
	}

	nav := ""
	if cmd.Tool == "navigation_open_page" {
		if r, ok := result.(map[string]interface{}); ok {
			nav, _ = r["page"].(string)
		}
	}

	return SendResult{ToolsExecuted: []ToolExecution{exec}, NavigateTo: nav}
}

// ─── Groq fallback ────────────────────────────────────────────────────────────

func (s *Service) handleGroq(userID, groqApiKey, input string) SendResult {
	if groqApiKey == "" {
		return SendResult{Reply: "Команда не распознана.\n\n" + helpText()}
	}

	var total, ready, blocked int64
	s.gdb.Model(&db.MetaAdAccount{}).Where("user_id = ? AND archived = false", userID).Count(&total)
	s.gdb.Model(&db.MetaAdAccount{}).
		Where("user_id = ? AND archived = false AND readiness_status = 'READY'", userID).Count(&ready)
	s.gdb.Model(&db.MetaAdAccount{}).
		Where("user_id = ? AND archived = false AND readiness_status = 'BLOCKED'", userID).Count(&blocked)

	system := fmt.Sprintf(
		"Ты помощник AdOps Cockpit — инструмента медиабаера Facebook. "+
			"Workspace: %d кабинетов (%d READY, %d BLOCKED). "+
			"Команды: /кабинеты, /health, /пул [название], /лог, /статус, /объясни [кабинет], /открой [страница]. "+
			"Отвечай по-русски кратко (1-3 предложения). Предлагай команды для действий.",
		total, ready, blocked,
	)

	reply, err := callGroq(groqApiKey, system, input)
	if err != nil {
		return SendResult{Error: err.Error()}
	}
	return SendResult{Reply: reply}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func buildSummary(toolName string, params map[string]interface{}) string {
	switch toolName {
	case "pools_add_accounts":
		ids, _ := params["accountIds"].([]interface{})
		poolId, _ := params["poolId"].(string)
		return fmt.Sprintf("Добавить %d кабинетов в пул %s", len(ids), poolId)
	case "health_run_bulk":
		if all, _ := params["all"].(bool); all {
			return "Запустить health check для всех кабинетов"
		}
		ids, _ := params["accountIds"].([]interface{})
		return fmt.Sprintf("Запустить health check для %d кабинетов", len(ids))
	default:
		return labelForTool(toolName)
	}
}

func helpText() string {
	return "Доступные команды:\n" +
		"/кабинеты [ready|blocked|limited] [поиск] — поиск\n" +
		"/health [all] — health check\n" +
		"/пул [название] — создать пул\n" +
		"/пул добавить [пул] [ready|blocked] — добавить кабинеты\n" +
		"/статус — обзор workspace\n" +
		"/лог [N] — последние N действий\n" +
		"/объясни [кабинет] — анализ readiness\n" +
		"/открой [страница] — перейти"
}
