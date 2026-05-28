package auth

import (
	"errors"
	"time"

	"adops-desktop/internal/db"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrNotFound       = errors.New("user not found")
	ErrWrongPassword  = errors.New("wrong password")
	ErrAlreadyExists  = errors.New("email already registered")
	ErrNotSetup       = errors.New("app not set up")
)

type Service struct {
	gdb *gorm.DB
}

func New(gdb *gorm.DB) *Service { return &Service{gdb: gdb} }

// IsSetup returns true if at least one user exists.
func (s *Service) IsSetup() bool {
	var count int64
	s.gdb.Model(&db.User{}).Count(&count)
	return count > 0
}

// Register creates the first (and only) user.
func (s *Service) Register(email, name, password string) (*db.User, error) {
	var count int64
	s.gdb.Model(&db.User{}).Count(&count)
	if count > 0 {
		return nil, ErrAlreadyExists
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	u := &db.User{
		ID:        uuid.NewString(),
		Email:     email,
		Name:      name,
		PassHash:  string(hash),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := s.gdb.Create(u).Error; err != nil {
		return nil, err
	}
	return u, nil
}

// Login verifies credentials and returns the user.
func (s *Service) Login(email, password string) (*db.User, error) {
	var u db.User
	if err := s.gdb.Where("email = ?", email).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PassHash), []byte(password)); err != nil {
		return nil, ErrWrongPassword
	}
	return &u, nil
}

// GetUser returns user by id.
func (s *Service) GetUser(id string) (*db.User, error) {
	var u db.User
	if err := s.gdb.First(&u, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &u, nil
}
