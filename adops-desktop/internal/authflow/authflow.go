package authflow

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"adops-desktop/internal/session"
)

type Flow struct {
	mu     sync.Mutex
	server *http.Server
	state  string
}

func New() *Flow {
	return &Flow{}
}

func (f *Flow) Start(webURL string, onSession func(session.Session) error) (string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	if f.server != nil {
		_ = f.server.Shutdown(context.Background())
		f.server = nil
	}

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return "", err
	}

	state, err := randomState()
	if err != nil {
		_ = listener.Close()
		return "", err
	}
	f.state = state

	callbackBase := "http://" + listener.Addr().String()
	mux := http.NewServeMux()
	server := &http.Server{Handler: mux}
	f.server = server

	mux.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
		// Required for Chrome's Private Network Access policy:
		// fetch() from an HTTPS page to http://127.0.0.1 needs these headers.
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Private-Network", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		q := r.URL.Query()
		if q.Get("state") != state {
			http.Error(w, "invalid state", http.StatusBadRequest)
			return
		}
		s := session.FromCallback(
			q.Get("token"),
			q.Get("userId"),
			q.Get("email"),
			q.Get("name"),
			q.Get("plan"),
			q.Get("expiresAt"),
		)
		if s.Expired() {
			http.Error(w, "invalid or expired token", http.StatusBadRequest)
			return
		}
		if err := onSession(s); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write([]byte(callbackHTML()))
		go func() {
			time.Sleep(250 * time.Millisecond)
			_ = server.Shutdown(context.Background())
		}()
	})

	go func() {
		if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
			fmt.Println("[authflow] callback server failed:", err.Error())
		}
	}()

	loginURL, err := buildLoginURL(webURL, callbackBase, state)
	if err != nil {
		_ = server.Shutdown(context.Background())
		return "", err
	}
	return loginURL, nil
}

func (f *Flow) Close() {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.server != nil {
		_ = f.server.Shutdown(context.Background())
		f.server = nil
	}
}

func buildLoginURL(webURL, callback, state string) (string, error) {
	base, err := url.Parse(strings.TrimRight(webURL, "/") + "/login")
	if err != nil {
		return "", err
	}
	q := base.Query()
	q.Set("callback", callback)
	q.Set("state", state)
	base.RawQuery = q.Encode()
	return base.String(), nil
}

func randomState() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func callbackHTML() string {
	return `<!doctype html><html><head><meta charset="utf-8"><title>AdOps Cockpit</title></head><body style="font-family:system-ui,sans-serif;background:#0a0a0a;color:#fafafa;display:grid;min-height:100vh;place-items:center;margin:0"><main style="text-align:center"><h1 style="font-size:20px">Авторизация завершена</h1><p style="color:#a1a1aa">Можно вернуться в AdOps Cockpit.</p></main></body></html>`
}
