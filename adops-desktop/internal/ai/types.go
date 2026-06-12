package ai

import "time"

// Risk defines how safe a tool action is.
type Risk string

const (
	RiskRead      Risk = "read"
	RiskPrepare   Risk = "prepare"
	RiskWrite     Risk = "write"
	RiskDangerous Risk = "dangerous"
)

// ToolExecution describes a tool call that was already executed.
type ToolExecution struct {
	ToolName string      `json:"toolName"`
	Label    string      `json:"label"`
	Risk     Risk        `json:"risk"`
	Params   interface{} `json:"params,omitempty"`
	Result   interface{} `json:"result,omitempty"`
	Error    string      `json:"error,omitempty"`
}

// PendingAction is a tool call waiting for user confirmation.
type PendingAction struct {
	ID        string                 `json:"id"`
	ToolUseID string                 `json:"-"`
	ToolName  string                 `json:"-"`
	Input     map[string]interface{} `json:"-"`
	Summary   string                 `json:"summary"`
	Risk      Risk                   `json:"risk"`
	Label     string                 `json:"label"`
	ExpiresAt time.Time              `json:"expiresAt"`
}

// SendResult is returned by SendAIMessage and ConfirmAIAction.
type SendResult struct {
	Reply         string          `json:"reply"`
	ToolsExecuted []ToolExecution `json:"toolsExecuted,omitempty"`
	PendingAction *PendingAction  `json:"pendingAction,omitempty"`
	NavigateTo    string          `json:"navigateTo,omitempty"`
	Error         string          `json:"error,omitempty"`
}

// AIConfig holds LLM provider settings.
type AIConfig struct {
	Provider string `json:"provider"`
	ApiKey   string `json:"apiKey"`
	Model    string `json:"model"`
}

// apiMsg is an Anthropic messages API message (role + content).
type apiMsg map[string]interface{}
