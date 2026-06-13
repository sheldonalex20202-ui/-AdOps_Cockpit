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
	Model              string        `json:"model"`
	Messages           []groqMsg     `json:"messages"`
	Tools              []groqToolDef `json:"tools,omitempty"`
	ToolChoice         string        `json:"tool_choice,omitempty"`
	MaxTokens          int           `json:"max_tokens"`
	ParallelToolCalls  bool          `json:"parallel_tool_calls"`
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

const groqVisionModel = "llama-3.2-11b-vision-preview"

// callGroqVisionAnalyze sends an image data-URL + optional user text to the
// vision model and returns a text description. Used as a pre-processing step
// before the main agentic loop.
func callGroqVisionAnalyze(apiKey, userText, imageDataURL string) (string, error) {
	if apiKey == "" {
		return "", fmt.Errorf("groq_key_missing")
	}
	prompt := userText
	if prompt == "" {
		prompt = "Опиши это изображение подробно: содержание, текст, цвета, элементы дизайна, возможное назначение в рекламе."
	}

	content := []map[string]interface{}{
		{"type": "image_url", "image_url": map[string]interface{}{"url": imageDataURL}},
		{"type": "text", "text": prompt},
	}

	reqBody := map[string]interface{}{
		"model": groqVisionModel,
		"messages": []map[string]interface{}{
			{"role": "system", "content": "Ты ассистент по анализу рекламных материалов. Описывай изображения детально на русском языке."},
			{"role": "user", "content": content},
		},
		"max_tokens": 1024,
	}

	body, _ := json.Marshal(reqBody)
	req, err := http.NewRequest("POST", groqEndpoint, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("Groq Vision недоступен: %v", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var result groqChatResp
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("ошибка ответа Groq Vision: %v", err)
	}
	if result.Error != nil {
		return "", fmt.Errorf("Groq Vision: %s", result.Error.Message)
	}
	if len(result.Choices) == 0 {
		return "", fmt.Errorf("пустой ответ от Groq Vision")
	}
	return result.Choices[0].Message.Content, nil
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
		Model:             groqModel,
		Messages:          full,
		MaxTokens:         1024,
		ParallelToolCalls: false, // prevents malformed multi-tool JSON (failed_generation)
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
