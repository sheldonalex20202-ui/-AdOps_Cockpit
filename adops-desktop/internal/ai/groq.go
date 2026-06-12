package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	groqEndpoint = "https://api.groq.com/openai/v1/chat/completions"
	groqModel    = "llama-3.3-70b-versatile"
)

// ─── Message types (OpenAI-compatible) ───────────────────────────────────────

type groqMsg struct {
	Role       string         `json:"role"`
	Content    string         `json:"content,omitempty"`
	ToolCalls  []groqToolCall `json:"tool_calls,omitempty"`
	ToolCallID string         `json:"tool_call_id,omitempty"`
}

type groqToolCall struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Function struct {
		Name      string `json:"name"`
		Arguments string `json:"arguments"`
	} `json:"function"`
}

// ─── Tool schema (OpenAI format) ─────────────────────────────────────────────

type groqToolDef struct {
	Type     string `json:"type"`
	Function struct {
		Name        string                 `json:"name"`
		Description string                 `json:"description"`
		Parameters  map[string]interface{} `json:"parameters"`
	} `json:"function"`
}

// groqToolSchemas converts the local registry to Groq/OpenAI tool format.
func groqToolSchemas() []groqToolDef {
	out := make([]groqToolDef, 0, len(registry))
	for _, t := range registry {
		var def groqToolDef
		def.Type = "function"
		def.Function.Name = t.Name
		def.Function.Description = t.Description
		def.Function.Parameters = t.Schema
		out = append(out, def)
	}
	return out
}

// ─── HTTP call ────────────────────────────────────────────────────────────────

type groqChatReq struct {
	Model      string        `json:"model"`
	Messages   []groqMsg     `json:"messages"`
	Tools      []groqToolDef `json:"tools,omitempty"`
	ToolChoice string        `json:"tool_choice,omitempty"`
	MaxTokens  int           `json:"max_tokens"`
}

type groqChatResp struct {
	Choices []struct {
		Message struct {
			Role      string         `json:"role"`
			Content   string         `json:"content"`
			ToolCalls []groqToolCall `json:"tool_calls"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

// callGroqChat sends messages + tool schemas to Groq and returns the raw response.
func callGroqChat(apiKey, system string, messages []groqMsg, tools []groqToolDef) (*groqChatResp, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("groq_key_missing")
	}

	full := make([]groqMsg, 0, len(messages)+1)
	if system != "" {
		full = append(full, groqMsg{Role: "system", Content: system})
	}
	full = append(full, messages...)

	req := groqChatReq{
		Model:     groqModel,
		Messages:  full,
		MaxTokens: 1024,
	}
	if len(tools) > 0 {
		req.Tools = tools
		req.ToolChoice = "auto"
	}

	body, _ := json.Marshal(req)
	httpReq, err := http.NewRequest("POST", groqEndpoint, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("Groq недоступен: %v", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var result groqChatResp
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("ошибка ответа Groq: %v", err)
	}
	if result.Error != nil {
		return nil, fmt.Errorf("Groq: %s", result.Error.Message)
	}
	if len(result.Choices) == 0 {
		return nil, fmt.Errorf("пустой ответ от Groq")
	}
	return &result, nil
}
