package ai

import (
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"adops-desktop/internal/db"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// builtInGroqKey is populated by secrets.go (gitignored).
var builtInGroqKey = ""

// builtInGeminiKey is populated by secrets.go (gitignored).
var builtInGeminiKey = ""

// Service orchestrates Groq agentic loops with local tool execution.
type Service struct {
	gdb           *gorm.DB
	mu            sync.Mutex
	conversations map[string][]groqMsg
	displayMsgs   map[string][]DisplayMsg
	pending       map[string]*PendingAction
}

func New(gdb *gorm.DB) *Service {
	return &Service{
		gdb:           gdb,
		conversations: make(map[string][]groqMsg),
		displayMsgs:   make(map[string][]DisplayMsg),
		pending:       make(map[string]*PendingAction),
	}
}

// EnsureDefaultKey persists builtInGroqKey to DB on startup so it survives
// future builds that might not have the key in ldflags.
func (s *Service) EnsureDefaultKey() {
	if builtInGroqKey == "" {
		return
	}
	const sysUser = "__system__"
	var cfg db.AIConfig
	if s.gdb.Where("user_id = ?", sysUser).First(&cfg).Error != nil {
		s.gdb.Create(&db.AIConfig{ID: uuid.NewString(), UserID: sysUser, GroqApiKey: builtInGroqKey})
	} else if cfg.GroqApiKey != builtInGroqKey {
		s.gdb.Model(&cfg).Update("groq_api_key", builtInGroqKey)
	}
}

// ─── Config ──────────────────────────────────────────────────────────────────

func (s *Service) GetConfig(userID string) AIConfig {
	var cfg db.AIConfig
	s.gdb.Where("user_id = ?", userID).First(&cfg)
	key := cfg.GroqApiKey
	if key == "" {
		// Fall back to system-level default (saved by EnsureDefaultKey on startup).
		var sys db.AIConfig
		if s.gdb.Where("user_id = ?", "__system__").First(&sys).Error == nil {
			key = sys.GroqApiKey
		}
	}
	if key == "" {
		key = builtInGroqKey
	}
	return AIConfig{GroqApiKey: key}
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

// SendMessageWithFile handles a user message that optionally includes an
// attached file. Images are analyzed with Groq Vision first; the description
// is prepended to the text before entering the agentic loop.
func (s *Service) SendMessageWithFile(userID, convID, text, fileDataURL, fileName string) SendResult {
	if fileDataURL == "" {
		return s.SendMessage(userID, convID, text)
	}

	cfg := s.GetConfig(userID)
	enrichedText := text
	isImage := strings.HasPrefix(fileDataURL, "data:image/")

	if isImage {
		analysis, err := callGroqVisionAnalyze(cfg.GroqApiKey, text, fileDataURL)
		if err != nil {
			if fileName != "" {
				enrichedText = fmt.Sprintf("[Прикреплено изображение: %s]\n\n%s", fileName, text)
			}
		} else {
			if text != "" {
				enrichedText = fmt.Sprintf("[Прикреплено изображение «%s»]\nАнализ: %s\n\nЗапрос пользователя: %s", fileName, analysis, text)
			} else {
				enrichedText = fmt.Sprintf("[Изображение «%s»]\n%s", fileName, analysis)
			}
		}
	} else {
		if fileName != "" {
			enrichedText = fmt.Sprintf("[Файл: %s]\n\n%s", fileName, text)
		}
	}

	result := s.runGroqLoop(userID, convID, enrichedText)

	// Build display messages — user bubble shows original text + file info, not enriched text.
	dm := []DisplayMsg{{ID: uuid.NewString(), Kind: "user", Text: text, FileName: fileName, IsImage: isImage}}
	if len(result.ToolsExecuted) > 0 {
		dm = append(dm, DisplayMsg{ID: uuid.NewString(), Kind: "tools", Tools: result.ToolsExecuted})
	}
	if result.Reply != "" {
		dm = append(dm, DisplayMsg{ID: uuid.NewString(), Kind: "assistant", Text: result.Reply})
	}
	if result.Error != "" {
		dm = append(dm, DisplayMsg{ID: uuid.NewString(), Kind: "error", Error: result.Error})
	}
	s.mu.Lock()
	s.displayMsgs[convID] = append(s.displayMsgs[convID], dm...)
	s.mu.Unlock()
	go s.persistConversation(userID, convID)

	return result
}

// SendMessage routes the input: slash commands execute instantly, everything
// else goes through the Groq agentic loop (Groq picks the right tool).
func (s *Service) SendMessage(userID, convID, input string) SendResult {
	trimmed := strings.TrimSpace(input)

	// Fast path: explicit slash commands bypass Groq entirely (0 tokens).
	if strings.HasPrefix(trimmed, "/") {
		cmd := Parse(trimmed)
		if cmd.Tool == "show_help" {
			return SendResult{Reply: helpText()}
		}
		if !cmd.UseGroq {
			return s.executeCommand(userID, cmd)
		}
	}

	result := s.runGroqLoop(userID, convID, input)

	dm := []DisplayMsg{{ID: uuid.NewString(), Kind: "user", Text: input}}
	if len(result.ToolsExecuted) > 0 {
		dm = append(dm, DisplayMsg{ID: uuid.NewString(), Kind: "tools", Tools: result.ToolsExecuted})
	}
	if result.Reply != "" {
		dm = append(dm, DisplayMsg{ID: uuid.NewString(), Kind: "assistant", Text: result.Reply})
	}
	if result.Error != "" {
		dm = append(dm, DisplayMsg{ID: uuid.NewString(), Kind: "error", Error: result.Error})
	}
	s.mu.Lock()
	s.displayMsgs[convID] = append(s.displayMsgs[convID], dm...)
	s.mu.Unlock()
	go s.persistConversation(userID, convID)

	return result
}

// ConfirmAction executes a pending tool call and resumes the Groq loop.
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

	result, execErr := tool.Execute(s.gdb, userID, pa.Input)
	exec := ToolExecution{ToolName: pa.ToolName, Label: pa.Label, Risk: pa.Risk, Params: pa.Input}
	if execErr != nil {
		exec.Error = execErr.Error()
	} else {
		exec.Result = result
	}

	// Feed result back into conversation history.
	resultJSON, _ := json.Marshal(result)
	if execErr != nil {
		resultJSON = []byte(fmt.Sprintf(`{"error":"%s"}`, execErr.Error()))
	}
	s.mu.Lock()
	s.conversations[convID] = append(s.conversations[convID], groqMsg{
		Role:       "tool",
		ToolCallID: pa.ToolUseID,
		Content:    string(resultJSON),
	})
	s.mu.Unlock()

	// Resume Groq to generate final text answer.
	cfg := s.GetConfig(userID)
	system := s.buildGroqSystem(userID)

	s.mu.Lock()
	history := make([]groqMsg, len(s.conversations[convID]))
	copy(history, s.conversations[convID])
	s.mu.Unlock()

	resp, err := callGroqChat(cfg.GroqApiKey, system, history, nil) // no tools for final answer
	if err != nil {
		return SendResult{ToolsExecuted: []ToolExecution{exec}, Error: err.Error()}
	}
	finalContent := resp.Choices[0].Message.Content
	s.mu.Lock()
	s.conversations[convID] = append(s.conversations[convID], groqMsg{
		Role: "assistant", Content: finalContent,
	})
	s.mu.Unlock()

	// Track confirmed action in display history.
	var dm []DisplayMsg
	dm = append(dm, DisplayMsg{ID: uuid.NewString(), Kind: "tools", Tools: []ToolExecution{exec}})
	if finalContent != "" {
		dm = append(dm, DisplayMsg{ID: uuid.NewString(), Kind: "assistant", Text: finalContent})
	}
	s.mu.Lock()
	s.displayMsgs[convID] = append(s.displayMsgs[convID], dm...)
	s.mu.Unlock()
	go s.persistConversation(userID, convID)

	return SendResult{Reply: finalContent, ToolsExecuted: []ToolExecution{exec}}
}

// CancelAction removes a pending action.
func (s *Service) CancelAction(actionID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok := s.pending[actionID]
	delete(s.pending, actionID)
	return ok
}

// ClearConversation removes in-memory history (DB record is kept for history).
func (s *Service) ClearConversation(convID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.conversations, convID)
	delete(s.displayMsgs, convID)
	return true
}

// ─── Chat history persistence ─────────────────────────────────────────────────

func truncRunes(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n]) + "…"
}

// persistConversation saves the current groq context + display messages to DB.
// Always called in a goroutine to avoid blocking the response path.
func (s *Service) persistConversation(userID, convID string) {
	s.mu.Lock()
	hist := make([]groqMsg, len(s.conversations[convID]))
	copy(hist, s.conversations[convID])
	disp := make([]DisplayMsg, len(s.displayMsgs[convID]))
	copy(disp, s.displayMsgs[convID])
	s.mu.Unlock()

	if len(hist) == 0 || len(disp) == 0 {
		return
	}

	title := "Новый чат"
	for _, m := range hist {
		if m.Role == "user" && m.Content != "" {
			title = truncRunes(m.Content, 45)
			break
		}
	}

	preview := ""
	for i := len(hist) - 1; i >= 0; i-- {
		if hist[i].Role == "assistant" && hist[i].Content != "" {
			preview = truncRunes(hist[i].Content, 60)
			break
		}
	}

	userMsgs := 0
	for _, m := range hist {
		if m.Role == "user" {
			userMsgs++
		}
	}

	histJSON, _ := json.Marshal(hist)
	dispJSON, _ := json.Marshal(disp)
	now := time.Now()

	var existing db.AIConversation
	if s.gdb.Where("id = ? AND user_id = ?", convID, userID).First(&existing).Error != nil {
		s.gdb.Create(&db.AIConversation{
			ID: convID, UserID: userID,
			Title: title, Preview: preview, MsgCount: userMsgs,
			HistoryJSON: string(histJSON), DisplayJSON: string(dispJSON),
			CreatedAt: now, UpdatedAt: now,
		})
	} else {
		s.gdb.Model(&existing).Updates(map[string]interface{}{
			"title": title, "preview": preview, "msg_count": userMsgs,
			"history_json": string(histJSON), "display_json": string(dispJSON),
			"updated_at": now,
		})
	}
}

// GetConversations returns the last 50 conversations for a user, newest first.
func (s *Service) GetConversations(userID string) []ConvSummary {
	var convs []db.AIConversation
	s.gdb.Where("user_id = ?", userID).Order("updated_at desc").Limit(50).Find(&convs)
	out := make([]ConvSummary, 0, len(convs))
	for _, c := range convs {
		out = append(out, ConvSummary{
			ID: c.ID, Title: c.Title, Preview: c.Preview,
			MsgCount: c.MsgCount, UpdatedAt: c.UpdatedAt,
		})
	}
	return out
}

// LoadConversation restores a past conversation into memory and returns display messages.
func (s *Service) LoadConversation(userID, convID string) ([]DisplayMsg, error) {
	var conv db.AIConversation
	if err := s.gdb.Where("id = ? AND user_id = ?", convID, userID).First(&conv).Error; err != nil {
		return nil, err
	}
	if conv.HistoryJSON != "" {
		var hist []groqMsg
		if json.Unmarshal([]byte(conv.HistoryJSON), &hist) == nil {
			s.mu.Lock()
			s.conversations[convID] = hist
			s.mu.Unlock()
		}
	}
	var disp []DisplayMsg
	if conv.DisplayJSON != "" {
		if json.Unmarshal([]byte(conv.DisplayJSON), &disp) == nil {
			s.mu.Lock()
			s.displayMsgs[convID] = disp
			s.mu.Unlock()
		}
	}
	return disp, nil
}

// DeleteAIConversation removes a conversation from memory and DB.
func (s *Service) DeleteAIConversation(userID, convID string) error {
	s.mu.Lock()
	delete(s.conversations, convID)
	delete(s.displayMsgs, convID)
	s.mu.Unlock()
	return s.gdb.Where("id = ? AND user_id = ?", convID, userID).Delete(&db.AIConversation{}).Error
}

// ─── Semantic tool routing ────────────────────────────────────────────────────

// selectToolsForQuery returns the subset of tool schemas relevant to the user's
// input (max ~12 tools). Sending all 30 schemas to llama-3.3-70b causes
// "failed_generation" because the context becomes too large for reliable JSON.
func selectToolsForQuery(input string) []groqToolDef {
	low := strings.ToLower(input)
	has := func(keywords ...string) bool {
		for _, kw := range keywords {
			if strings.Contains(low, kw) {
				return true
			}
		}
		return false
	}

	// Always include these lightweight read-only tools.
	selected := map[string]bool{
		"workspace_status":     true,
		"navigation_open_page": true,
	}

	switch {
	case has("кабинет", "account", "баер", "рекламн", "сколько", "готов", "блок", "ready", "blocked"):
		selected["accounts_search"] = true
		selected["accounts_explain_readiness"] = true
		selected["health_run_bulk"] = true
		if has("удал", "очист", "delete", "remove", "все") {
			selected["accounts_delete"] = true
		}
		if has("заметк", "note", "лимит", "limit") {
			selected["accounts_update"] = true
		}

	case has("пул", "pool", "группа", "group"):
		selected["pools_list"] = true
		selected["pools_create"] = true
		selected["pools_add_accounts"] = true
		if has("удал", "delete") {
			selected["pools_delete"] = true
		}
		if has("убра", "remove", "исключ") {
			selected["pools_remove_accounts"] = true
		}
		if has("переименова", "цвет", "rename", "color") {
			selected["pools_rename"] = true
		}
		if has("очист", "clear") {
			selected["pools_clear"] = true
		}

	case has("health", "проверк", "статус кабин", "диагност"):
		selected["health_run_bulk"] = true
		selected["accounts_search"] = true

	case has("креатив", "creative", "баннер", "картинк", "изображ", "медиа"):
		selected["creatives_list"] = true
		if has("удал", "delete") {
			selected["creatives_delete"] = true
		}

	case has("шаблон", "template", "кампани", "campaign"):
		selected["templates_list"] = true
		if has("удал", "delete") {
			selected["templates_delete"] = true
		}

	case has("автоконтрол", "autocontrol", "контрол", "пауз", "возобнов", "cpa", "спенд"):
		selected["autocontrol_get"] = true
		selected["autocontrol_set"] = true
		selected["autocontrol_run"] = true
		selected["geo_rules_list"] = true
		if has("правил", "гео", "rule", "geo") {
			selected["geo_rules_upsert"] = true
			selected["geo_rules_delete"] = true
		}

	case has("автоскейл", "autoscale", "масштаб", "клон", "scale"):
		selected["autoscale_get"] = true
		selected["autoscale_set"] = true
		selected["autoscale_run"] = true

	case has("гео", "geo", "правил", "rule"):
		selected["geo_rules_list"] = true
		selected["geo_rules_upsert"] = true
		selected["geo_rules_delete"] = true
		selected["autocontrol_get"] = true

	case has("залив", "launch", "запуск кампан", "история"):
		selected["launch_jobs_list"] = true

	case has("лог", "аудит", "audit", "что происход", "недавн", "последн"):
		selected["audit_recent"] = true

	case has("интеграц", "подключ", "meta", "facebook", "токен", "connect"):
		selected["connections_list"] = true

	case has("удал", "очист", "сброс", "reset", "delete", "всё", "все данн", "полност"):
		selected["data_reset"] = true
		selected["accounts_delete"] = true
		selected["pools_list"] = true
		selected["creatives_list"] = true
		selected["templates_list"] = true

	default:
		selected["accounts_search"] = true
		selected["pools_list"] = true
		selected["health_run_bulk"] = true
		selected["audit_recent"] = true
	}

	all := groqToolSchemas()
	out := make([]groqToolDef, 0, len(selected))
	for _, t := range all {
		if selected[t.Function.Name] {
			out = append(out, t)
		}
	}
	return out
}

// ─── Groq agentic loop ────────────────────────────────────────────────────────

// runGroqLoop sends input to Groq, executes any requested tools locally,
// then calls Groq a final time WITHOUT tools to get a text summary.
// This two-phase approach avoids Groq's "failed_generation" error that occurs
// when the model attempts another tool call after receiving tool results.
func (s *Service) runGroqLoop(userID, convID, input string) SendResult {
	cfg := s.GetConfig(userID)

	s.mu.Lock()
	s.conversations[convID] = append(s.conversations[convID], groqMsg{Role: "user", Content: input})
	s.mu.Unlock()

	system := s.buildGroqSystem(userID)
	// Semantic routing: send only the tools relevant to this query (max ~12).
	// Sending all 30 schemas causes "failed_generation" on llama-3.3-70b.
	tools := selectToolsForQuery(input)
	var allExecs []ToolExecution

	// Phase 1: up to 3 rounds of tool selection + execution.
	for round := 0; round < 3; round++ {
		s.mu.Lock()
		history := make([]groqMsg, len(s.conversations[convID]))
		copy(history, s.conversations[convID])
		s.mu.Unlock()

		resp, err := callGroqChat(cfg.GroqApiKey, system, history, tools)
		if err != nil {
			return SendResult{Error: err.Error(), ToolsExecuted: allExecs}
		}
		msg := resp.Choices[0].Message

		// No tool calls → Groq gave a direct text answer, we're done.
		if len(msg.ToolCalls) == 0 {
			s.mu.Lock()
			s.conversations[convID] = append(s.conversations[convID], groqMsg{
				Role: "assistant", Content: msg.Content,
			})
			s.mu.Unlock()
			nav, hl := s.navFrom(allExecs)
			return SendResult{Reply: msg.Content, ToolsExecuted: allExecs, NavigateTo: nav, HighlightTarget: hl}
		}

		// Append assistant message (contains tool_calls) to history.
		s.mu.Lock()
		s.conversations[convID] = append(s.conversations[convID], groqMsg{
			Role: "assistant", Content: msg.Content, ToolCalls: msg.ToolCalls,
		})
		s.mu.Unlock()

		// Execute each requested tool.
		pendingFound := false
		for _, tc := range msg.ToolCalls {
			toolName := tc.Function.Name
			var params map[string]interface{}
			_ = json.Unmarshal([]byte(tc.Function.Arguments), &params)

			tool := GetTool(toolName)
			if tool == nil {
				s.mu.Lock()
				s.conversations[convID] = append(s.conversations[convID], groqMsg{
					Role: "tool", ToolCallID: tc.ID,
					Content: fmt.Sprintf(`{"error":"unknown tool: %s"}`, toolName),
				})
				s.mu.Unlock()
				continue
			}

			if tool.RequiresConfirmation {
				actionID := uuid.NewString()
				pa := &PendingAction{
					ID: actionID, ToolUseID: tc.ID,
					ToolName: toolName, Input: params,
					Summary:   buildSummary(toolName, params),
					Risk:      tool.Risk, Label: labelForTool(toolName),
					ExpiresAt: time.Now().Add(5 * time.Minute),
				}
				s.mu.Lock()
				s.pending[actionID] = pa
				s.mu.Unlock()
				pendingFound = true
				return SendResult{ToolsExecuted: allExecs, PendingAction: pa}
			}

			result, execErr := tool.Execute(s.gdb, userID, params)
			exec := ToolExecution{
				ToolName: toolName, Label: labelForTool(toolName),
				Risk: tool.Risk, Params: params,
			}
			if execErr != nil {
				exec.Error = execErr.Error()
			} else {
				exec.Result = result
			}
			allExecs = append(allExecs, exec)

			resultJSON, _ := json.Marshal(result)
			if execErr != nil {
				resultJSON = []byte(fmt.Sprintf(`{"error":"%s"}`, execErr.Error()))
			}
			s.mu.Lock()
			s.conversations[convID] = append(s.conversations[convID], groqMsg{
				Role: "tool", ToolCallID: tc.ID, Content: string(resultJSON),
			})
			s.mu.Unlock()
		}
		if pendingFound {
			break
		}
	}

	// Phase 2: final call WITHOUT tools so Groq generates a text summary
	// instead of trying (and failing) to call another function.
	s.mu.Lock()
	history := make([]groqMsg, len(s.conversations[convID]))
	copy(history, s.conversations[convID])
	s.mu.Unlock()

	finalResp, err := callGroqChat(cfg.GroqApiKey, system, history, nil)
	nav, hl := s.navFrom(allExecs)
	if err != nil {
		return SendResult{ToolsExecuted: allExecs, NavigateTo: nav, HighlightTarget: hl}
	}
	finalText := finalResp.Choices[0].Message.Content
	s.mu.Lock()
	s.conversations[convID] = append(s.conversations[convID], groqMsg{
		Role: "assistant", Content: finalText,
	})
	s.mu.Unlock()

	return SendResult{Reply: finalText, ToolsExecuted: allExecs, NavigateTo: nav, HighlightTarget: hl}
}

func (s *Service) navFrom(execs []ToolExecution) (nav string, highlight string) {
	for _, e := range execs {
		if e.ToolName == "navigation_open_page" {
			if r, ok := e.Result.(map[string]interface{}); ok {
				nav, _ = r["page"].(string)
				highlight, _ = r["highlight"].(string)
				return
			}
		}
	}
	return
}

// ─── Slash command executor (fast path) ──────────────────────────────────────

func (s *Service) executeCommand(userID string, cmd *ParsedCommand) SendResult {
	if cmd.Tool == "accounts_explain_readiness" {
		if query, ok := cmd.Params["query"].(string); ok && query != "" {
			var acc db.MetaAdAccount
			if s.gdb.Where(
				"user_id = ? AND archived = false AND (name LIKE ? OR external_id LIKE ?)",
				userID, "%"+query+"%", "%"+query+"%",
			).Order("readiness_score asc").First(&acc).Error == nil {
				cmd.Params = map[string]interface{}{"accountId": acc.ID}
			} else {
				return s.executeCommand(userID, &ParsedCommand{
					Tool:   "accounts_search",
					Params: map[string]interface{}{"search": query},
				})
			}
		} else if _, hasID := cmd.Params["accountId"]; !hasID {
			return SendResult{Reply: "Укажи название: /объясни [название кабинета]"}
		}
	}

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

	if tool.RequiresConfirmation {
		actionID := uuid.NewString()
		pa := &PendingAction{
			ID: actionID, ToolUseID: actionID,
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

	nav, hl := "", ""
	if cmd.Tool == "navigation_open_page" {
		if r, ok := result.(map[string]interface{}); ok {
			nav, _ = r["page"].(string)
			hl, _ = r["highlight"].(string)
		}
	}
	return SendResult{ToolsExecuted: []ToolExecution{exec}, NavigateTo: nav, HighlightTarget: hl}
}

// ─── System prompt ────────────────────────────────────────────────────────────

func (s *Service) buildGroqSystem(userID string) string {
	var total, ready, blocked, poolCount, creatives, templates int64
	s.gdb.Model(&db.MetaAdAccount{}).Where("user_id = ? AND archived = false", userID).Count(&total)
	s.gdb.Model(&db.MetaAdAccount{}).Where("user_id = ? AND archived = false AND readiness_status = 'READY'", userID).Count(&ready)
	s.gdb.Model(&db.MetaAdAccount{}).Where("user_id = ? AND archived = false AND readiness_status = 'BLOCKED'", userID).Count(&blocked)
	s.gdb.Model(&db.AccountPool{}).Where("user_id = ?", userID).Count(&poolCount)
	s.gdb.Model(&db.Creative{}).Where("user_id = ?", userID).Count(&creatives)
	s.gdb.Model(&db.CampaignTemplate{}).Where("user_id = ?", userID).Count(&templates)

	return fmt.Sprintf(
		"Ты AI Operator в AdOps Cockpit — инструменте медиабаера Facebook.\n"+
			"Workspace: %d кабинетов (%d READY, %d BLOCKED), %d пулов, %d креативов, %d шаблонов.\n"+
			"Страницы: accounts=создать/просмотреть рекламные кабинеты, account-pools=группы кабинетов, "+
			"launch=запуск рекламных кампаний (автозалив), creatives=баннеры и видео, "+
			"autocontrol=автопауза по KPI, autoscale=автомасштабирование, "+
			"health-checks=проверка кабинетов, audit-logs=история действий, integrations=подключение Meta API.\n"+
			"При навигации: используй highlight чтобы указать на нужный элемент интерфейса.\n"+
			"Всегда вызывай инструмент для получения данных — не отвечай без реальной информации.\n"+
			"Отвечай по-русски кратко и конкретно.",
		total, ready, blocked, poolCount, creatives, templates,
	)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func buildSummary(toolName string, params map[string]interface{}) string {
	switch toolName {
	case "accounts_delete":
		if all, _ := params["all"].(bool); all {
			return "Удалить ВСЕ рекламные кабинеты"
		}
		ids, _ := params["accountIds"].([]interface{})
		return fmt.Sprintf("Удалить %d кабинетов", len(ids))
	case "pools_add_accounts":
		ids, _ := params["accountIds"].([]interface{})
		poolId, _ := params["poolId"].(string)
		return fmt.Sprintf("Добавить %d кабинетов в пул %s", len(ids), poolId)
	case "pools_delete":
		if name, _ := params["name"].(string); name != "" {
			return fmt.Sprintf("Удалить пул «%s»", name)
		}
		return "Удалить пул"
	case "pools_clear":
		return "Очистить все кабинеты из пула"
	case "health_run_bulk":
		if all, _ := params["all"].(bool); all {
			return "Запустить health check для всех кабинетов"
		}
		ids, _ := params["accountIds"].([]interface{})
		return fmt.Sprintf("Запустить health check для %d кабинетов", len(ids))
	case "creatives_delete":
		if all, _ := params["all"].(bool); all {
			return "Удалить ВСЕ креативы"
		}
		ids, _ := params["creativeIds"].([]interface{})
		return fmt.Sprintf("Удалить %d креативов", len(ids))
	case "templates_delete":
		if all, _ := params["all"].(bool); all {
			return "Удалить ВСЕ шаблоны кампаний"
		}
		ids, _ := params["templateIds"].([]interface{})
		return fmt.Sprintf("Удалить %d шаблонов", len(ids))
	case "data_reset":
		scope, _ := params["scope"].(string)
		return fmt.Sprintf("Полный сброс данных: scope=%s (НЕОБРАТИМО)", scope)
	case "autocontrol_run":
		return "Запустить цикл Автоконтроля прямо сейчас"
	case "autoscale_run":
		return "Запустить цикл Автоскейла прямо сейчас"
	case "geo_rules_delete":
		if geo, _ := params["geo"].(string); geo != "" {
			return fmt.Sprintf("Удалить гео-правило для %s", geo)
		}
		return "Удалить гео-правило"
	default:
		return labelForTool(toolName)
	}
}

func helpText() string {
	return "Доступные команды:\n" +
		"/кабинеты [ready|blocked|limited] [поиск]\n" +
		"/health [all]\n" +
		"/пул [название]\n" +
		"/пул добавить [пул] [ready|blocked]\n" +
		"/статус\n" +
		"/лог [N]\n" +
		"/объясни [кабинет]\n" +
		"/открой [страница]"
}
