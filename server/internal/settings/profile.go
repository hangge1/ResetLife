package settings

import (
	"context"
	"encoding/json"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type Setting struct {
	ID        string
	UserID    string
	Type      string
	Key       string
	ValueJSON string
}

type SaveSettingInput struct {
	UserID    string
	Type      string
	Key       string
	ValueJSON string
	Now       time.Time
}

type Repository interface {
	GetSetting(ctx context.Context, userID string, settingType string, key string) (*Setting, error)
	SaveSetting(ctx context.Context, input SaveSettingInput) (*Setting, error)
}

type Service struct {
	Repository Repository
	Clock      func() time.Time
	MailSender MailSender
}

type Profile struct {
	Nickname      string   `json:"nickname"`
	HeightCm      *float64 `json:"heightCm"`
	ReminderEmail string   `json:"reminderEmail"`
}

type ProfileInput struct {
	Nickname      string `json:"nickname"`
	HeightCm      string `json:"heightCm"`
	ReminderEmail string `json:"reminderEmail"`
}

type ValidationFailure struct {
	FieldErrors map[string]string `json:"fieldErrors,omitempty"`
	Form        string            `json:"form,omitempty"`
}

const (
	profileType = "profile"
	profileKey  = "basic"
)

var emailPattern = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

func (s Service) GetProfile(ctx context.Context, userID string) (*Profile, error) {
	setting, err := s.Repository.GetSetting(ctx, userID, profileType, profileKey)
	if err != nil {
		return nil, err
	}
	if setting == nil {
		return &Profile{}, nil
	}

	return normalizeProfile(setting.ValueJSON), nil
}

func (s Service) SaveProfile(ctx context.Context, userID string, input ProfileInput) (*Profile, *ValidationFailure, error) {
	profile, failure := parseProfileInput(input)
	if failure != nil {
		return nil, failure, nil
	}

	valueJSON, err := json.Marshal(profile)
	if err != nil {
		return nil, nil, err
	}

	saved, err := s.Repository.SaveSetting(ctx, SaveSettingInput{
		UserID:    userID,
		Type:      profileType,
		Key:       profileKey,
		ValueJSON: string(valueJSON),
		Now:       s.now().UTC(),
	})
	if err != nil {
		return nil, nil, err
	}

	return normalizeProfile(saved.ValueJSON), nil, nil
}

func parseProfileInput(input ProfileInput) (*Profile, *ValidationFailure) {
	fieldErrors := map[string]string{}
	nickname := strings.TrimSpace(input.Nickname)
	reminderEmail := strings.TrimSpace(input.ReminderEmail)

	var heightCm *float64
	if trimmed := strings.TrimSpace(input.HeightCm); trimmed != "" {
		value, err := strconv.ParseFloat(trimmed, 64)
		if err != nil || !isFinite(value) || value <= 0 {
			fieldErrors["heightCm"] = "range"
		} else {
			heightCm = &value
		}
	}

	if reminderEmail != "" && !emailPattern.MatchString(reminderEmail) {
		fieldErrors["reminderEmail"] = "invalid_email"
	}

	if len(fieldErrors) > 0 {
		return nil, &ValidationFailure{FieldErrors: fieldErrors}
	}

	return &Profile{
		Nickname:      nickname,
		HeightCm:      heightCm,
		ReminderEmail: reminderEmail,
	}, nil
}

func normalizeProfile(valueJSON string) *Profile {
	var profile Profile
	if err := json.Unmarshal([]byte(valueJSON), &profile); err != nil {
		return &Profile{}
	}

	if profile.HeightCm != nil && (!isFinite(*profile.HeightCm) || *profile.HeightCm <= 0) {
		profile.HeightCm = nil
	}

	return &profile
}

func (s Service) now() time.Time {
	if s.Clock != nil {
		return s.Clock()
	}

	return time.Now()
}

func isFinite(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0)
}
