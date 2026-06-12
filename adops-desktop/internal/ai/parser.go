package ai

import (
	"regexp"
	"strconv"
	"strings"
)

// ParsedCommand is the result of parsing a user input string.
type ParsedCommand struct {
	Tool    string
	Params  map[string]interface{}
	UseGroq bool // true when no command matched — falls back to Groq
}

// Parse routes input to a local command or Groq fallback.
func Parse(input string) *ParsedCommand {
	s := strings.TrimSpace(input)
	if strings.HasPrefix(s, "/") {
		if cmd := parseSlash(s[1:]); cmd != nil {
			return cmd
		}
	}
	if cmd := parseKeywords(s); cmd != nil {
		return cmd
	}
	return &ParsedCommand{UseGroq: true}
}

// ─── Slash commands ───────────────────────────────────────────────────────────

// parseSlash handles /command [args] syntax.
func parseSlash(s string) *ParsedCommand {
	parts := splitArgs(s)
	if len(parts) == 0 {
		return nil
	}
	cmd := strings.ToLower(parts[0])
	args := parts[1:]

	switch cmd {
	case "кабинеты", "кабинет", "acc", "accounts", "k", "а":
		return &ParsedCommand{Tool: "accounts_search", Params: accountFilters(args)}

	case "пул", "pool", "p", "п":
		if len(args) == 0 {
			return &ParsedCommand{Tool: "workspace_status", Params: map[string]interface{}{}}
		}
		sub := strings.ToLower(args[0])
		switch sub {
		case "создать", "create", "new", "новый", "создай", "н":
			name := strings.Join(args[1:], " ")
			if name == "" {
				name = "Новый пул"
			}
			return &ParsedCommand{Tool: "pools_create", Params: map[string]interface{}{"name": name}}
		case "добавить", "add", "д":
			if len(args) < 2 {
				return nil
			}
			return &ParsedCommand{Tool: "pools_add_accounts", Params: map[string]interface{}{
				"poolQuery": args[1],
				"filters":   accountFilters(args[2:]),
			}}
		default:
			name := strings.Join(args, " ")
			return &ParsedCommand{Tool: "pools_create", Params: map[string]interface{}{"name": name}}
		}

	case "health", "h", "хелс", "проверь":
		p := map[string]interface{}{}
		if len(args) == 0 || (len(args) == 1 && strings.ToLower(args[0]) == "all") {
			p["all"] = true
		} else {
			ids := make([]interface{}, len(args))
			for i, a := range args {
				ids[i] = a
			}
			p["accountIds"] = ids
		}
		return &ParsedCommand{Tool: "health_run_bulk", Params: p}

	case "лог", "log", "аудит", "audit", "l", "л":
		limit := 10
		if len(args) > 0 {
			if n, err := strconv.Atoi(args[0]); err == nil && n > 0 && n <= 50 {
				limit = n
			}
		}
		return &ParsedCommand{Tool: "audit_recent", Params: map[string]interface{}{"limit": float64(limit)}}

	case "статус", "status", "сводка", "overview", "s", "с":
		return &ParsedCommand{Tool: "workspace_status", Params: map[string]interface{}{}}

	case "объясни", "explain", "почему", "о", "why", "е":
		query := strings.Join(args, " ")
		return &ParsedCommand{Tool: "accounts_explain_readiness", Params: map[string]interface{}{"query": query}}

	case "открой", "open", "перейди", "goto", "go", "иди", "г":
		page := normalizePage(strings.Join(args, " "))
		return &ParsedCommand{Tool: "navigation_open_page", Params: map[string]interface{}{"page": page}}

	case "помощь", "help", "?", "команды":
		return &ParsedCommand{Tool: "show_help", Params: map[string]interface{}{}}
	}
	return nil
}

// ─── Keyword matching ─────────────────────────────────────────────────────────

// parseKeywords matches natural language patterns without any LLM.
func parseKeywords(s string) *ParsedCommand {
	lower := strings.ToLower(s)

	if matchAny(lower, "статус", "сводка", "обзор", "что происходит", "итоги") {
		return &ParsedCommand{Tool: "workspace_status", Params: map[string]interface{}{}}
	}

	if matchAny(lower, "health check", "health-check", "проверь здоровь", "запусти health", "запустить health", "захелзить") {
		return &ParsedCommand{Tool: "health_run_bulk", Params: map[string]interface{}{"all": true}}
	}

	if matchAny(lower, "покажи", "найди", "выведи", "список", "какие", "все") &&
		matchAny(lower, "кабинет", "аккаунт", "account") {
		args := []string{}
		if matchAny(lower, "ready", "готов") {
			args = append(args, "ready")
		}
		if matchAny(lower, "blocked", "заблок") {
			args = append(args, "blocked")
		}
		if matchAny(lower, "проблем", "attention", "нужно внимание") {
			args = append(args, "attention")
		}
		return &ParsedCommand{Tool: "accounts_search", Params: accountFilters(args)}
	}

	if matchAny(lower, "создай пул", "создать пул", "новый пул", "сделай пул") {
		return &ParsedCommand{Tool: "pools_create", Params: map[string]interface{}{"name": extractPoolName(s)}}
	}

	if matchAny(lower, "последние действия", "история действий", "аудит лог") {
		return &ParsedCommand{Tool: "audit_recent", Params: map[string]interface{}{"limit": float64(10)}}
	}

	if matchAny(lower, "помощь", "команды", "что умеешь", "как пользоваться") {
		return &ParsedCommand{Tool: "show_help", Params: map[string]interface{}{}}
	}

	return nil
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func matchAny(s string, patterns ...string) bool {
	for _, p := range patterns {
		if strings.Contains(s, p) {
			return true
		}
	}
	return false
}

// accountFilters extracts readiness/status/search from arg tokens.
func accountFilters(args []string) map[string]interface{} {
	p := map[string]interface{}{}
	var search []string
	for _, a := range args {
		switch strings.ToLower(a) {
		case "ready", "готов", "готовые", "r":
			p["readiness"] = "READY"
		case "blocked", "заблок", "заблокированные", "b":
			p["readiness"] = "BLOCKED"
		case "attention", "needs_attention", "внимание", "проблемные", "na":
			p["readiness"] = "NEEDS_ATTENTION"
		case "active", "актив", "активные":
			p["status"] = "ACTIVE"
		case "limited", "ограниченные", "lim":
			p["status"] = "LIMITED"
		case "disabled", "отключённые", "off":
			p["status"] = "DISABLED"
		case "billing":
			p["status"] = "BILLING_ISSUE"
		default:
			search = append(search, a)
		}
	}
	if len(search) > 0 {
		p["search"] = strings.Join(search, " ")
	}
	return p
}

var rePoolName = regexp.MustCompile(`(?i)(?:пул|pool)\s+[«"']?([^«"']+)[»"']?`)

func extractPoolName(s string) string {
	if m := rePoolName.FindStringSubmatch(s); len(m) > 1 {
		return strings.TrimSpace(m[1])
	}
	return "Новый пул"
}

func normalizePage(s string) string {
	lower := strings.ToLower(strings.TrimSpace(s))
	pages := map[string]string{
		"кабинеты": "accounts", "кабинет": "accounts",
		"пулы": "account-pools", "пул": "account-pools", "pool": "account-pools",
		"автозалив": "launch", "залив": "launch", "launch": "launch",
		"автоконтроль": "autocontrol", "контроль": "autocontrol",
		"автоскейл": "autoscale", "скейл": "autoscale",
		"креативы": "creatives",
		"история": "launch-history", "history": "launch-history",
		"аудит": "audit-logs", "лог": "audit-logs",
		"настройки": "integrations", "settings": "integrations",
		"health": "health-checks", "хелс": "health-checks",
		"ai": "ai-operator", "оператор": "ai-operator",
	}
	for k, v := range pages {
		if strings.Contains(lower, k) {
			return v
		}
	}
	return lower
}

// splitArgs splits on whitespace, respecting quoted strings.
func splitArgs(s string) []string {
	var parts []string
	var cur strings.Builder
	inQuote := false
	for _, r := range s {
		switch {
		case r == '"' || r == '\'' || r == '«' || r == '»':
			inQuote = !inQuote
		case (r == ' ' || r == '\t') && !inQuote:
			if cur.Len() > 0 {
				parts = append(parts, cur.String())
				cur.Reset()
			}
		default:
			cur.WriteRune(r)
		}
	}
	if cur.Len() > 0 {
		parts = append(parts, cur.String())
	}
	return parts
}
