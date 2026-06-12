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

type groqRequest struct {
	Model     string        `json:"model"`
	Messages  []groqMessage `json:"messages"`
	MaxTokens int           `json:"max_tokens"`
}

type groqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type groqResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

// callGroq sends a single-turn request to Groq and returns the text reply.
func callGroq(apiKey, systemPrompt, userMessage string) (string, error) {
	if apiKey == "" {
		return "", fmt.Errorf("groq_key_missing")
	}

	payload := groqRequest{
		Model:     groqModel,
		MaxTokens: 300,
		Messages: []groqMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userMessage},
		},
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", groqEndpoint, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("Groq недоступен: %v", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var result groqResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("ошибка ответа Groq: %v", err)
	}
	if result.Error != nil {
		return "", fmt.Errorf("Groq ошибка: %s", result.Error.Message)
	}
	if len(result.Choices) == 0 {
		return "", fmt.Errorf("пустой ответ от Groq")
	}
	return result.Choices[0].Message.Content, nil
}
