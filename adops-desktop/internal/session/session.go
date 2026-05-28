package session

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

type User struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	Plan      string `json:"plan"`
	ExpiresAt string `json:"expiresAt"`
}

type Session struct {
	Token     string `json:"token"`
	UserID    string `json:"userId"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	Plan      string `json:"plan"`
	ExpiresAt string `json:"expiresAt"`
}

type VerifyResponse struct {
	Valid bool `json:"valid"`
	User  User `json:"user"`
}

func FromCallback(token, userID, email, name, plan, expiresAt string) Session {
	return Session{
		Token: token, UserID: userID, Email: email, Name: name, Plan: plan, ExpiresAt: expiresAt,
	}
}

func (s Session) User() User {
	return User{ID: s.UserID, Email: s.Email, Name: s.Name, Plan: s.Plan, ExpiresAt: s.ExpiresAt}
}

func (s Session) Expired() bool {
	if s.Token == "" || s.UserID == "" {
		return true
	}
	expiresAt, err := time.Parse(time.RFC3339, s.ExpiresAt)
	if err != nil {
		return true
	}
	return time.Now().After(expiresAt)
}

func Load() (Session, error) {
	path, err := path()
	if err != nil {
		return Session{}, err
	}
	b, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return Session{}, nil
		}
		return Session{}, err
	}
	var s Session
	if err := json.Unmarshal(b, &s); err != nil {
		return Session{}, err
	}
	return s, nil
}

func Save(s Session) error {
	path, err := path()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return err
	}
	b, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, b, 0600)
}

func Clear() error {
	path, err := path()
	if err != nil {
		return err
	}
	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

func Verify(webURL, token string) (Session, error) {
	req, err := http.NewRequest(http.MethodGet, webURL+"/api/session/verify", nil)
	if err != nil {
		return Session{}, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	client := http.Client{Timeout: 8 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return Session{}, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return Session{}, errors.New("session verification failed")
	}

	var payload VerifyResponse
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return Session{}, err
	}
	if !payload.Valid {
		return Session{}, errors.New("session is invalid")
	}
	return Session{
		Token: token, UserID: payload.User.ID, Email: payload.User.Email,
		Name: payload.User.Name, Plan: payload.User.Plan, ExpiresAt: payload.User.ExpiresAt,
	}, nil
}

func path() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(base, "AdOpsCockpit", "session.json"), nil
}
