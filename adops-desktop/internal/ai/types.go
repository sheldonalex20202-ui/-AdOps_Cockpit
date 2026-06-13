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
	Reply           string          `json:"reply"`
	ToolsExecuted   []ToolExecution `json:"toolsExecuted,omitempty"`
	PendingAction   *PendingAction  `json:"pendingAction,omitempty"`
	NavigateTo      string          `json:"navigateTo,omitempty"`
	HighlightTarget string          `json:"highlightTarget,omitempty"`
	Error           string          `json:"error,omitempty"`
}

// AIConfig holds LLM settings (Groq is the fallback LLM; commands work without any key).
type AIConfig struct {
	GroqApiKey string `json:"groqApiKey"`
}

// ConvSummary is a lightweight entry in the chat history list.
type ConvSummary struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Preview   string    `json:"preview"`
	MsgCount  int       `json:"msgCount"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// DisplayMsg is a serialisable chat bubble stored in AIConversation.DisplayJSON.
// Images/files are referenced by name only — dataURL is never persisted.
type DisplayMsg struct {
	ID       string          `json:"id"`
	Kind     string          `json:"kind"` // user | assistant | tools | error
	Text     string          `json:"text,omitempty"`
	Tools    []ToolExecution `json:"tools,omitempty"`
	Error    string          `json:"error,omitempty"`
	FileName string          `json:"fileName,omitempty"`
	IsImage  bool            `json:"isImage,omitempty"`
}
