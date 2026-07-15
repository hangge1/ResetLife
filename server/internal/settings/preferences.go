package settings

import (
	"context"
	"encoding/json"
	"regexp"
	"strconv"
	"strings"
)

type TrendThresholds struct {
	MinimumDays    int `json:"minimumDays"`
	MinimumRecords int `json:"minimumRecords"`
}

type TrendThresholdInput struct {
	MinimumDays    string `json:"minimumDays"`
	MinimumRecords string `json:"minimumRecords"`
}

type ReminderRules struct {
	ReminderTime string `json:"reminderTime"`
	InAppEnabled bool   `json:"inAppEnabled"`
	EmailEnabled bool   `json:"emailEnabled"`
}

type ReminderRuleInput struct {
	ReminderTime string `json:"reminderTime"`
	InAppEnabled bool   `json:"inAppEnabled"`
	EmailEnabled bool   `json:"emailEnabled"`
}

const (
	trendType    = "trend"
	trendKey     = "estimation-thresholds"
	reminderType = "reminder"
	reminderKey  = "rules"
)

var timePattern = regexp.MustCompile(`^\d{2}:\d{2}$`)

func (s Service) GetTrendThresholds(ctx context.Context, userID string) (*TrendThresholds, error) {
	setting, err := s.Repository.GetSetting(ctx, userID, trendType, trendKey)
	if err != nil {
		return nil, err
	}
	if setting == nil {
		return defaultTrendThresholds(), nil
	}

	return normalizeTrendThresholds(setting.ValueJSON), nil
}

func (s Service) SaveTrendThresholds(ctx context.Context, userID string, input TrendThresholdInput) (*TrendThresholds, *ValidationFailure, error) {
	thresholds, failure := parseTrendThresholdInput(input)
	if failure != nil {
		return nil, failure, nil
	}

	valueJSON, err := json.Marshal(thresholds)
	if err != nil {
		return nil, nil, err
	}

	saved, err := s.Repository.SaveSetting(ctx, SaveSettingInput{
		UserID:    userID,
		Type:      trendType,
		Key:       trendKey,
		ValueJSON: string(valueJSON),
		Now:       s.now().UTC(),
	})
	if err != nil {
		return nil, nil, err
	}

	return normalizeTrendThresholds(saved.ValueJSON), nil, nil
}

func (s Service) GetReminderRules(ctx context.Context, userID string) (*ReminderRules, error) {
	setting, err := s.Repository.GetSetting(ctx, userID, reminderType, reminderKey)
	if err != nil {
		return nil, err
	}
	if setting == nil {
		return defaultReminderRules(), nil
	}

	return normalizeReminderRules(setting.ValueJSON), nil
}

func (s Service) SaveReminderRules(ctx context.Context, userID string, input ReminderRuleInput) (*ReminderRules, *ValidationFailure, error) {
	rules, failure := parseReminderRuleInput(input)
	if failure != nil {
		return nil, failure, nil
	}

	valueJSON, err := json.Marshal(rules)
	if err != nil {
		return nil, nil, err
	}

	saved, err := s.Repository.SaveSetting(ctx, SaveSettingInput{
		UserID:    userID,
		Type:      reminderType,
		Key:       reminderKey,
		ValueJSON: string(valueJSON),
		Now:       s.now().UTC(),
	})
	if err != nil {
		return nil, nil, err
	}

	return normalizeReminderRules(saved.ValueJSON), nil, nil
}

func parseTrendThresholdInput(input TrendThresholdInput) (*TrendThresholds, *ValidationFailure) {
	fieldErrors := map[string]string{}
	minimumDays, ok := parseInteger(input.MinimumDays)
	if !ok || minimumDays < 7 {
		fieldErrors["minimumDays"] = "range"
	}
	minimumRecords, ok := parseInteger(input.MinimumRecords)
	if !ok || minimumRecords < 3 {
		fieldErrors["minimumRecords"] = "range"
	}
	if len(fieldErrors) > 0 {
		return nil, &ValidationFailure{FieldErrors: fieldErrors}
	}

	return &TrendThresholds{MinimumDays: minimumDays, MinimumRecords: minimumRecords}, nil
}

func parseReminderRuleInput(input ReminderRuleInput) (*ReminderRules, *ValidationFailure) {
	reminderTime := strings.TrimSpace(input.ReminderTime)
	if !isValidTime(reminderTime) {
		return nil, &ValidationFailure{FieldErrors: map[string]string{"reminderTime": "invalid_time"}}
	}

	return &ReminderRules{
		ReminderTime: reminderTime,
		InAppEnabled: input.InAppEnabled,
		EmailEnabled: input.EmailEnabled,
	}, nil
}

func normalizeTrendThresholds(valueJSON string) *TrendThresholds {
	var thresholds TrendThresholds
	if err := json.Unmarshal([]byte(valueJSON), &thresholds); err != nil {
		return defaultTrendThresholds()
	}
	if thresholds.MinimumDays < 7 {
		thresholds.MinimumDays = 7
	}
	if thresholds.MinimumRecords < 3 {
		thresholds.MinimumRecords = 3
	}
	return &thresholds
}

func normalizeReminderRules(valueJSON string) *ReminderRules {
	var rules ReminderRules
	if err := json.Unmarshal([]byte(valueJSON), &rules); err != nil {
		return defaultReminderRules()
	}
	if !isValidTime(rules.ReminderTime) {
		rules.ReminderTime = "20:30"
	}
	return &rules
}

func defaultTrendThresholds() *TrendThresholds {
	return &TrendThresholds{MinimumDays: 7, MinimumRecords: 3}
}

func defaultReminderRules() *ReminderRules {
	return &ReminderRules{ReminderTime: "20:30"}
}

func parseInteger(raw string) (int, bool) {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	return value, err == nil
}

func isValidTime(value string) bool {
	if !timePattern.MatchString(value) {
		return false
	}
	hour, _ := strconv.Atoi(value[0:2])
	minute, _ := strconv.Atoi(value[3:5])
	return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
}
