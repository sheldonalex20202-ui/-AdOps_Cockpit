package license

import (
	"adops-desktop/internal/db"
	"time"

	"gorm.io/gorm"
)

type Status struct {
	Valid     bool   `json:"valid"`
	Key       string `json:"key"`
	ExpiresAt *time.Time `json:"expiresAt"`
}

type Service struct {
	gdb *gorm.DB
}

func New(gdb *gorm.DB) *Service { return &Service{gdb: gdb} }

// Activate stores and validates a license key.
// Currently stub — will use RSA signature verification in production.
func (s *Service) Activate(key string) (Status, error) {
	// TODO: verify RSA signature against embedded public key
	valid := len(key) >= 16 // placeholder check

	s.gdb.Save(&db.AppSettings{
		ID:           1,
		LicenseKey:   key,
		LicenseValid: valid,
		UpdatedAt:    time.Now(),
	})

	return Status{Valid: valid, Key: key}, nil
}

func (s *Service) GetStatus() Status {
	var settings db.AppSettings
	if err := s.gdb.First(&settings).Error; err != nil {
		return Status{Valid: false}
	}
	return Status{Valid: settings.LicenseValid, Key: settings.LicenseKey}
}
