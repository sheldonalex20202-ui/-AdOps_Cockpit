package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	groqEndpoint      = "https://api.groq.com/openai/v1/chat/completions"
	groqModel         = "llama-3.3-70b-versatile"
	groqFallbackModel = "llama-3.1-8b-instant"

	geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
	geminiModel    = "gemini-2.0-flash"
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
		msg := result.Error.Message
		if isRateLimitErr(fmt.Errorf(msg)) && builtInGeminiKey != "" {
			return callGeminiVisionAnalyze(builtInGeminiKey, userText, imageDataURL)
		}
		if isRateLimitErr(fmt.Errorf(msg)) {
			return "", fmt.Errorf("превышен дневной лимит токенов Groq. Попробуйте позже.")
		}
		return "", fmt.Errorf("Groq Vision: %s", msg)
	}
	if len(result.Choices) == 0 {
		return "", fmt.Errorf("пустой ответ от Groq Vision")
	}
	return result.Choices[0].Message.Content, nil
}

func isRateLimitErr(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "rate limit") ||
		strings.Contains(msg, "rate_limit") ||
		strings.Contains(msg, "quota") ||
		strings.Contains(msg, "429")
}

// callGroqChat sends messages + tool schemas to Groq.
// On rate-limit: retries llama-3.1-8b-instant, then falls back to Gemini 2.0 Flash.
func callGroqChat(apiKey, system string, messages []groqMsg, tools []groqToolDef) (*groqChatResp, error) {
	resp, err := callGroqChatModel(apiKey, groqModel, system, messages, tools)
	if err != nil && isRateLimitErr(err) {
		resp, err = callGroqChatModel(apiKey, groqFallbackModel, system, messages, tools)
	}
	if err != nil && isRateLimitErr(err) && builtInGeminiKey != "" {
		resp, err = callGeminiChat(builtInGeminiKey, system, messages, tools)
	}
	if err != nil && isRateLimitErr(err) {
		return nil, fmt.Errorf("все AI провайдеры исчерпали дневной лимит запросов. Попробуйте через несколько минут или завтра.")
	}
	return resp, err
}

// callGeminiVisionAnalyze sends an image to Gemini 2.0 Flash for analysis.
func callGeminiVisionAnalyze(apiKey, userText, imageDataURL string) (string, error) {
	prompt := userText
	if prompt == "" {
		prompt = "Опиши это изображение подробно: содержание, текст, цвета, элементы дизайна, возможное назначение в рекламе."
	}
	reqMap := map[string]interface{}{
		"model": geminiModel,
		"messages": []map[string]interface{}{
			{"role": "system", "content": "Ты ассистент по анализу рекламных материалов. Описывай изображения детально на русском языке."},
			{"role": "user", "content": []map[string]interface{}{
				{"type": "image_url", "image_url": map[string]string{"url": imageDataURL}},
				{"type": "text", "text": prompt},
			}},
		},
		"max_tokens": 1024,
	}
	body, _ := json.Marshal(reqMap)
	httpReq, err := http.NewRequest("POST", geminiEndpoint, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("Gemini Vision недоступен: %v", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		preview := string(respBody)
		if len(preview) > 200 {
			preview = preview[:200]
		}
		return "", fmt.Errorf("Gemini Vision HTTP %d: %s", resp.StatusCode, preview)
	}
	var result groqChatResp
	if err := json.Unmarshal(respBody, &result); err != nil {
		preview := string(respBody)
		if len(preview) > 200 {
			preview = preview[:200]
		}
		return "", fmt.Errorf("Gemini Vision: неожиданный формат ответа: %s", preview)
	}
	if result.Error != nil {
		return "", fmt.Errorf("Gemini Vision: %s", result.Error.Message)
	}
	if len(result.Choices) == 0 {
		return "", fmt.Errorf("пустой ответ от Gemini Vision")
	}
	return result.Choices[0].Message.Content, nil
}

// callGeminiChat calls Gemini 2.0 Flash via its OpenAI-compatible endpoint.
// Tools are intentionally omitted — Gemini is used as a text-only fallback.
func callGeminiChat(apiKey, system string, messages []groqMsg, _ []groqToolDef) (*groqChatResp, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("gemini_key_missing")
	}

	full := make([]groqMsg, 0, len(messages)+1)
	if system != "" {
		full = append(full, groqMsg{Role: "system", Content: system})
	}
	full = append(full, messages...)

	reqMap := map[string]interface{}{
		"model":      geminiModel,
		"messages":   full,
		"max_tokens": 1024,
	}

	body, _ := json.Marshal(reqMap)
	httpReq, err := http.NewRequest("POST", geminiEndpoint, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("Gemini недоступен: %v", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		preview := string(respBody)
		if len(preview) > 200 {
			preview = preview[:200]
		}
		return nil, fmt.Errorf("Gemini HTTP %d: %s", resp.StatusCode, preview)
	}
	var result groqChatResp
	if err := json.Unmarshal(respBody, &result); err != nil {
		preview := string(respBody)
		if len(preview) > 200 {
			preview = preview[:200]
		}
		return nil, fmt.Errorf("Gemini: неожиданный формат ответа: %s", preview)
	}
	if result.Error != nil {
		return nil, fmt.Errorf("Gemini: %s", result.Error.Message)
	}
	if len(result.Choices) == 0 {
		return nil, fmt.Errorf("пустой ответ от Gemini")
	}
	return &result, nil
}

func callGroqChatModel(apiKey, model, system string, messages []groqMsg, tools []groqToolDef) (*groqChatResp, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("groq_key_missing")
	}

	full := make([]groqMsg, 0, len(messages)+1)
	if system != "" {
		full = append(full, groqMsg{Role: "system", Content: system})
	}
	full = append(full, messages...)

	req := groqChatReq{
		Model:             model,
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
