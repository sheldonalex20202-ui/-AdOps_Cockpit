package db

import (
	"os"
	"path/filepath"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Open() (*gorm.DB, error) {
	dir, err := dataDir()
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, err
	}

	dsn := filepath.Join(dir, "adops.db")
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, err
	}

	db.Exec("PRAGMA journal_mode=WAL")
	db.Exec("PRAGMA foreign_keys=ON")

	if err := migrate(db); err != nil {
		return nil, err
	}
	return db, nil
}

func migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&User{},
		&MetaConnection{},
		&MetaAdAccount{},
		&AccountPool{},
		&AccountPoolItem{},
		&AccountHealthCheck{},
		&AuditLog{},
		&CampaignTemplate{},
		&Creative{},
		&HeadlineSet{},
		&LaunchJob{},
		&LaunchJobItem{},
		&AppSettings{},
		&AutocontrolConfig{},
		&GeoRule{},
		&PauseWindow{},
		&AutocontrolCycle{},
		&AutocontrolCycleItem{},
		&AutoscaleConfig{},
		&ScaleRule{},
		&AutoscaleCycle{},
		&AutoscaleCycleItem{},
		&AIConfig{},
		&AIConversation{},
	)
}

// dataDir returns platform-appropriate app data directory.
// Windows: %APPDATA%\AdOpsCockpit
// macOS:   ~/Library/Application Support/AdOpsCockpit
func dataDir() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		home, err2 := os.UserHomeDir()
		if err2 != nil {
			return "", err
		}
		base = home
	}
	return filepath.Join(base, "AdOpsCockpit"), nil
}
