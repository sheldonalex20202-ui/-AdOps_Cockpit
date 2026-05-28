package audit

import (
	"time"

	"adops-desktop/internal/db"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Service struct {
	gdb *gorm.DB
}

func New(gdb *gorm.DB) *Service { return &Service{gdb: gdb} }

func (s *Service) Log(userID, action, objectType string, objectID *string, result db.AuditResult, errMsg *string, old, new_ db.JSON) {
	entry := db.AuditLog{
		ID:           uuid.NewString(),
		UserID:       &userID,
		Action:       action,
		ObjectType:   objectType,
		ObjectID:     objectID,
		Result:       result,
		ErrorMessage: errMsg,
		OldValueJSON: old,
		NewValueJSON: new_,
		CreatedAt:    time.Now(),
	}
	s.gdb.Create(&entry)
}

func (s *Service) OK(userID, action, objectType, objectID string, payload db.JSON) {
	id := objectID
	s.Log(userID, action, objectType, &id, db.AuditSuccess, nil, nil, payload)
}

func (s *Service) Fail(userID, action, objectType, objectID, errMsg string) {
	id := objectID
	msg := errMsg
	s.Log(userID, action, objectType, &id, db.AuditFailed, &msg, nil, nil)
}

func (s *Service) List(userID string, limit, offset int) ([]db.AuditLog, error) {
	var logs []db.AuditLog
	err := s.gdb.
		Where("user_id = ?", userID).
		Order("created_at desc").
		Limit(limit).Offset(offset).
		Find(&logs).Error
	return logs, err
}
