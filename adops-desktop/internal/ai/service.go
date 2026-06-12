package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"adops-desktop/internal/db"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	anthropicEndpoint = "https://api.anthropic.com/v1/messages"
	anthropicVersion  = "2023-06-01"
	defaultModel      = "claude-haiku-4-5-20251001"
	maxIterations     = 4
)

// Service orchestrates AI conversations.
type Service struct {
	gdb           *gorm.DB
	mu            sync.Mutex
	conversations map[string][]apiMsg
	pending       map[string]*PendingAction
}

// New creates a new AI service.
func New(gdb *gorm.DB) *Service {
	return &Service{
		gdb:           gdb,
		conversations: make(map[string][]apiMsg),
		pending:       make(map[string]*PendingAction),
	}
}

// ─── Config ──────────────────────────────────────────────────────────────────

func (s *Service) GetConfig(userID string) AIConfig {
	var cfg db.AIConfig
	s.gdb.Where("user_id = ?", userID).First(&cfg)
	return AIConfig{
		Provider: orDefault(cfg.Provider, "anthropic"),
		ApiKey:   cfg.ApiKey,
		Model:    orDefault(cfg.Model, defaultModel),
	}
}

func (s *Service) SaveConfig(userID, provider, apiKey, model string) error {
	if model == "" {
		model = defaultModel
	}
	if provider == "" {
		provider = "anthropic"
	}
	var existing db.AIConfig
	err := s.gdb.Where("user_id = ?", userID).First(&existing).Error
	if err != nil {
		return s.gdb.Create(&db.AIConfig{
			ID: uuid.NewString(), UserID: userID,
			Provider: provider, ApiKey: apiKey, Model: model,
		}).Error
	}
	return s.gdb.Model(&existing).Updates(map[string]interface{}{
		"provider": provider, "api_key": apiKey, "model": model,
	}).Error
}

// ─── Public API ──────────────────────────────────────────────────────────────

// SendMessage handles a user prompt.
func (s *Service) SendMessage(userID, convID, input string) SendResult {
	cfg := s.GetConfig(userID)
	if cfg.ApiKey == "" {
		return SendResult{Error: "api_key_missing"}
	}

	s.mu.Lock()
	s.conversations[convID] = append(s.conversations[convID], apiMsg{
		"role": "user", "content": input,
	})
	s.mu.Unlock()

	return s.runLoop(userID, convID, cfg, nil)
}

// ConfirmAction executes a pending action and continues the conversation.
func (s *Service) ConfirmAction(userID, convID, actionID string) SendResult {
	cfg := s.GetConfig(userID)
	if cfg.ApiKey == "" {
		return SendResult{Error: "api_key_missing"}
	}

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

	result, execErr := tool.Execute(s.gdb, userID, pa.Input)
	exec := ToolExecution{
		ToolName: pa.ToolName, Label: labelForTool(pa.ToolName),
		Risk: pa.Risk, Params: pa.Input,
	}
	if execErr != nil {
		exec.Error = execErr.Error()
	} else {
		exec.Result = result
	}

	resultJSON, _ := json.Marshal(result)
	if execErr != nil {
		resultJSON = []byte(`{"error":"` + execErr.Error() + `"}`)
	}

	s.mu.Lock()
	s.conversations[convID] = append(s.conversations[convID],
		apiMsg{
			"role": "assistant",
			"content": []interface{}{
				map[string]interface{}{
					"type": "tool_use", "id": pa.ToolUseID,
					"name": pa.ToolName, "input": pa.Input,
				},
			},
		},
		apiMsg{
			"role": "user",
			"content": []interface{}{
				map[string]interface{}{
					"type": "tool_result", "tool_use_id": pa.ToolUseID,
					"content": string(resultJSON),
				},
			},
		},
	)
	s.mu.Unlock()

	res := s.runLoop(userID, convID, cfg, nil)
	res.ToolsExecuted = append([]ToolExecution{exec}, res.ToolsExecuted...)
	return res
}

// CancelAction cancels a pending action.
func (s *Service) CancelAction(actionID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok := s.pending[actionID]
	delete(s.pending, actionID)
	return ok
}

// ClearConversation removes conversation history.
func (s *Service) ClearConversation(convID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.conversations, convID)
	return true
}

// ─── Agentic loop ────────────────────────────────────────────────────────────

func (s *Service) runLoop(userID, convID string, cfg AIConfig, prevExecs []ToolExecution) SendResult {
	systemPrompt := s.buildSystemPrompt(userID)

	for i := 0; i < maxIterations; i++ {
		s.mu.Lock()
		history := make([]apiMsg, len(s.conversations[convID]))
		copy(history, s.conversations[convID])
		s.mu.Unlock()

		resp, err := callAnthropic(cfg, systemPrompt, history)
		if err != nil {
			return SendResult{Error: err.Error(), ToolsExecuted: prevExecs}
		}

		var textParts []string
		var toolUses []map[string]interface{}
		for _, block := range resp.Content {
			switch block["type"] {
			case "text":
				if t, ok := block["text"].(string); ok {
					textParts = append(textParts, t)
				}
			case "tool_use":
				toolUses = append(toolUses, block)
			}
		}

		reply := ""
		if len(textParts) > 0 {
			reply = textParts[0]
		}

		// No tool calls → conversation complete.
		if len(toolUses) == 0 {
			s.mu.Lock()
			s.conversations[convID] = append(s.conversations[convID], apiMsg{
				"role": "assistant", "content": reply,
			})
			s.mu.Unlock()

			nav := ""
			for _, e := range prevExecs {
				if e.ToolName == "navigation_open_page" {
					if r, ok := e.Result.(map[string]interface{}); ok {
						nav, _ = r["page"].(string)
					}
				}
			}
			return SendResult{Reply: reply, ToolsExecuted: prevExecs, NavigateTo: nav}
		}

		// Handle first tool use.
		tu := toolUses[0]
		toolName, _ := tu["name"].(string)
		toolUseID, _ := tu["id"].(string)

		var toolInput map[string]interface{}
		switch v := tu["input"].(type) {
		case map[string]interface{}:
			toolInput = v
		default:
			b, _ := json.Marshal(tu["input"])
			_ = json.Unmarshal(b, &toolInput)
		}

		tool := GetTool(toolName)
		if tool == nil {
			return SendResult{Error: "unknown tool: " + toolName, ToolsExecuted: prevExecs}
		}

		// Needs confirmation → pause and wait.
		if tool.RequiresConfirmation {
			actionID := uuid.NewString()
			pa := &PendingAction{
				ID: actionID, ToolUseID: toolUseID,
				ToolName: toolName, Input: toolInput,
				Summary:   fmt.Sprintf("%s: %v", labelForTool(toolName), toolInput),
				Risk:      tool.Risk,
				Label:     labelForTool(toolName),
				ExpiresAt: time.Now().Add(5 * time.Minute),
			}
			s.mu.Lock()
			s.pending[actionID] = pa
			s.conversations[convID] = append(s.conversations[convID], apiMsg{
				"role": "assistant",
				"content": []interface{}{
					map[string]interface{}{
						"type": "tool_use", "id": toolUseID,
						"name": toolName, "input": toolInput,
					},
				},
			})
			s.mu.Unlock()
			return SendResult{Reply: reply, ToolsExecuted: prevExecs, PendingAction: pa}
		}

		// Execute immediately.
		result, execErr := tool.Execute(s.gdb, userID, toolInput)
		exec := ToolExecution{
			ToolName: toolName, Label: labelForTool(toolName),
			Risk: tool.Risk, Params: toolInput,
		}
		if execErr != nil {
			exec.Error = execErr.Error()
		} else {
			exec.Result = result
		}
		prevExecs = append(prevExecs, exec)

		resultJSON, _ := json.Marshal(result)
		if execErr != nil {
			resultJSON = []byte(`{"error":"` + execErr.Error() + `"}`)
		}

		s.mu.Lock()
		s.conversations[convID] = append(s.conversations[convID],
			apiMsg{
				"role": "assistant",
				"content": []interface{}{
					map[string]interface{}{
						"type": "tool_use", "id": toolUseID,
						"name": toolName, "input": toolInput,
					},
				},
			},
			apiMsg{
				"role": "user",
				"content": []interface{}{
					map[string]interface{}{
						"type": "tool_result", "tool_use_id": toolUseID,
						"content": string(resultJSON),
					},
				},
			},
		)
		s.mu.Unlock()
	}

	return SendResult{Error: "превышено число шагов", ToolsExecuted: prevExecs}
}

// ─── System prompt ───────────────────────────────────────────────────────────

func (s *Service) buildSystemPrompt(userID string) string {
	var total, ready, blocked, poolCount int64
	s.gdb.Model(&db.MetaAdAccount{}).
		Where("user_id = ? AND archived = false", userID).Count(&total)
	s.gdb.Model(&db.MetaAdAccount{}).
		Where("user_id = ? AND archived = false AND readiness_status = ?", userID, "READY").Count(&ready)
	s.gdb.Model(&db.MetaAdAccount{}).
		Where("user_id = ? AND archived = false AND readiness_status = ?", userID, "BLOCKED").Count(&blocked)
	s.gdb.Model(&db.AccountPool{}).
		Where("user_id = ?", userID).Count(&poolCount)

	return fmt.Sprintf(`Ты AI Operator в приложении AdOps Cockpit — рабочем столе медиабаера Facebook.

Workspace прямо сейчас:
- Кабинетов: %d (READY: %d, BLOCKED: %d)
- Пулов: %d

Твои возможности:
- Находить кабинеты по статусу, readiness, названию, пулу
- Объяснять проблемы readiness конкретного кабинета
- Создавать пулы и добавлять в них кабинеты
- Запускать health checks
- Показывать историю действий
- Переходить на нужные страницы

Правила:
- Всегда отвечай по-русски
- Будь кратким и конкретным
- Используй инструменты для реальных данных
- Не придумывай данные — используй только то, что вернул инструмент
- После успешного действия предложи следующий логичный шаг
- Опасные массовые операции (добавление в пул) уточни у пользователя`, total, ready, blocked, poolCount)
}

// ─── Anthropic HTTP ──────────────────────────────────────────────────────────

type anthropicResp struct {
	Content []map[string]interface{} `json:"content"`
	Err     *struct {
		Message string `json:"message"`
	} `json:"error"`
}

func callAnthropic(cfg AIConfig, system string, messages []apiMsg) (*anthropicResp, error) {
	payload := map[string]interface{}{
		"model":      cfg.Model,
		"max_tokens": 1024,
		"system":     system,
		"tools":      AllToolSchemas(),
		"messages":   messages,
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", anthropicEndpoint, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("x-api-key", cfg.ApiKey)
	req.Header.Set("anthropic-version", anthropicVersion)
	req.Header.Set("content-type", "application/json")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("не удалось подключиться к AI: %v", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	var result anthropicResp
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("ошибка разбора ответа API: %v", err)
	}
	if result.Err != nil {
		return nil, fmt.Errorf("AI ошибка: %s", result.Err.Message)
	}
	return &result, nil
}

func orDefault(s, def string) string {
	if s == "" {
		return def
	}
	return s
}
