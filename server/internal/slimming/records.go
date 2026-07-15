package slimming

import (
	"context"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type HealthRecord struct {
	ID                string   `json:"id"`
	LocalDate         string   `json:"localDate"`
	WeightKg          *float64 `json:"weightKg"`
	WaistCm           *float64 `json:"waistCm"`
	HipCm             *float64 `json:"hipCm"`
	BodyFatPercentage *float64 `json:"bodyFatPercentage"`
	CreatedAtIso      string   `json:"createdAtIso,omitempty"`
	UpdatedAtIso      string   `json:"updatedAtIso,omitempty"`
}

type RunRecord struct {
	ID                  string   `json:"id"`
	LocalDate           string   `json:"localDate"`
	DistanceKm          float64  `json:"distanceKm"`
	DurationSeconds     *int     `json:"durationSeconds"`
	PaceSecondsPerKm    *int     `json:"paceSecondsPerKm"`
	AverageHeartRateBpm *int     `json:"averageHeartRateBpm"`
	AverageStrideMeters *float64 `json:"averageStrideMeters"`
	CadenceSpm          *int     `json:"cadenceSpm"`
	CreatedAtIso        string   `json:"createdAtIso,omitempty"`
	UpdatedAtIso        string   `json:"updatedAtIso,omitempty"`
}

type HealthRecordInput struct {
	LocalDate         string `json:"localDate"`
	WeightKg          string `json:"weightKg"`
	WaistCm           string `json:"waistCm"`
	HipCm             string `json:"hipCm"`
	BodyFatPercentage string `json:"bodyFatPercentage"`
}

type RunRecordInput struct {
	LocalDate           string `json:"localDate"`
	DistanceKm          string `json:"distanceKm"`
	DurationMinutes     string `json:"durationMinutes"`
	AverageHeartRateBpm string `json:"averageHeartRateBpm"`
	AverageStrideMeters string `json:"averageStrideMeters"`
	CadenceSpm          string `json:"cadenceSpm"`
}

type UpsertHealthRecordInput struct {
	UserID            string
	LocalDate         string
	WeightKg          *float64
	WaistCm           *float64
	HipCm             *float64
	BodyFatPercentage *float64
	Now               time.Time
}

type CreateRunRecordInput struct {
	UserID              string
	LocalDate           string
	DistanceKm          float64
	DurationSeconds     *int
	PaceSecondsPerKm    *int
	AverageHeartRateBpm *int
	AverageStrideMeters *float64
	CadenceSpm          *int
	Now                 time.Time
}

type UpdateHealthRecordInput struct {
	UserID            string
	ID                string
	LocalDate         string
	WeightKg          *float64
	WaistCm           *float64
	HipCm             *float64
	BodyFatPercentage *float64
	Now               time.Time
}

type UpdateRunRecordInput struct {
	UserID              string
	ID                  string
	LocalDate           string
	DistanceKm          float64
	DurationSeconds     *int
	PaceSecondsPerKm    *int
	AverageHeartRateBpm *int
	AverageStrideMeters *float64
	CadenceSpm          *int
	Now                 time.Time
}

type ValidationFailure struct {
	FieldErrors map[string]string `json:"fieldErrors,omitempty"`
	Form        string            `json:"form,omitempty"`
}

type RecordsRepository interface {
	UpsertHealthRecord(ctx context.Context, input UpsertHealthRecordInput) (*HealthRecord, error)
	CreateRunRecord(ctx context.Context, input CreateRunRecordInput) (*RunRecord, error)
	UpdateHealthRecord(ctx context.Context, input UpdateHealthRecordInput) (*HealthRecord, error)
	UpdateRunRecord(ctx context.Context, input UpdateRunRecordInput) (*RunRecord, error)
	DeleteHealthRecord(ctx context.Context, userID string, id string) (*HealthRecord, error)
	DeleteRunRecord(ctx context.Context, userID string, id string) (*RunRecord, error)
	ListHealthRecords(ctx context.Context, userID string) ([]HealthRecord, error)
	ListRunRecords(ctx context.Context, userID string) ([]RunRecord, error)
}

type combinedRecordsRepository interface {
	Repository
	RecordsRepository
}

var localDatePattern = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

func (s Service) SaveHealthRecord(ctx context.Context, userID string, input HealthRecordInput) (*HealthRecord, *ValidationFailure, error) {
	repository, ok := s.Repository.(combinedRecordsRepository)
	if !ok {
		return nil, nil, ErrUnsupportedRepository
	}

	fieldErrors := validateLocalDate(input.LocalDate)
	weightKg, hasWeight := parseOptionalDecimal(fieldErrors, "weightKg", input.WeightKg, 30, 250)
	waistCm, hasWaist := parseOptionalDecimal(fieldErrors, "waistCm", input.WaistCm, 40, 200)
	hipCm, hasHip := parseOptionalDecimal(fieldErrors, "hipCm", input.HipCm, 50, 220)
	bodyFat, hasBodyFat := parseOptionalDecimal(fieldErrors, "bodyFatPercentage", input.BodyFatPercentage, 3, 70)

	if !hasWeight && !hasWaist && !hasHip && !hasBodyFat {
		return nil, &ValidationFailure{FieldErrors: fieldErrors, Form: "health_record_required"}, nil
	}
	if len(fieldErrors) > 0 {
		return nil, &ValidationFailure{FieldErrors: fieldErrors}, nil
	}

	record, err := repository.UpsertHealthRecord(ctx, UpsertHealthRecordInput{
		UserID:            userID,
		LocalDate:         input.LocalDate,
		WeightKg:          weightKg,
		WaistCm:           waistCm,
		HipCm:             hipCm,
		BodyFatPercentage: bodyFat,
		Now:               s.now().UTC(),
	})
	return record, nil, err
}

func (s Service) CreateRunRecord(ctx context.Context, userID string, input RunRecordInput) (*RunRecord, *ValidationFailure, error) {
	repository, ok := s.Repository.(combinedRecordsRepository)
	if !ok {
		return nil, nil, ErrUnsupportedRepository
	}

	fieldErrors := validateLocalDate(input.LocalDate)
	distanceKm, _ := parseRequiredDecimal(fieldErrors, "distanceKm", input.DistanceKm, 0.1, 100)
	durationMinutes, hasDuration := parseOptionalInteger(fieldErrors, "durationMinutes", input.DurationMinutes, 1, 600)
	heartRate, _ := parseOptionalInteger(fieldErrors, "averageHeartRateBpm", input.AverageHeartRateBpm, 60, 220)
	stride, _ := parseOptionalDecimal(fieldErrors, "averageStrideMeters", input.AverageStrideMeters, 0.4, 2.5)
	cadence, _ := parseOptionalInteger(fieldErrors, "cadenceSpm", input.CadenceSpm, 80, 240)

	var durationSeconds *int
	var paceSecondsPerKm *int
	if hasDuration && distanceKm != nil && fieldErrors["durationMinutes"] == "" && fieldErrors["distanceKm"] == "" {
		duration := *durationMinutes
		paceMinutesPerKm := float64(duration) / *distanceKm
		if paceMinutesPerKm < 2 || paceMinutesPerKm > 30 {
			fieldErrors["durationMinutes"] = "unreasonable_pace"
		} else {
			seconds := duration * 60
			pace := int(math.Round(float64(seconds) / *distanceKm))
			durationSeconds = &seconds
			paceSecondsPerKm = &pace
		}
	}

	if len(fieldErrors) > 0 {
		return nil, &ValidationFailure{FieldErrors: compactFieldErrors(fieldErrors)}, nil
	}

	record, err := repository.CreateRunRecord(ctx, CreateRunRecordInput{
		UserID:              userID,
		LocalDate:           input.LocalDate,
		DistanceKm:          *distanceKm,
		DurationSeconds:     durationSeconds,
		PaceSecondsPerKm:    paceSecondsPerKm,
		AverageHeartRateBpm: heartRate,
		AverageStrideMeters: stride,
		CadenceSpm:          cadence,
		Now:                 s.now().UTC(),
	})
	return record, nil, err
}

func (s Service) UpdateHealthRecord(ctx context.Context, userID string, id string, input HealthRecordInput) (*HealthRecord, *ValidationFailure, error) {
	repository, ok := s.Repository.(combinedRecordsRepository)
	if !ok {
		return nil, nil, ErrUnsupportedRepository
	}

	fieldErrors := validateLocalDate(input.LocalDate)
	weightKg, hasWeight := parseOptionalDecimal(fieldErrors, "weightKg", input.WeightKg, 30, 250)
	waistCm, hasWaist := parseOptionalDecimal(fieldErrors, "waistCm", input.WaistCm, 40, 200)
	hipCm, hasHip := parseOptionalDecimal(fieldErrors, "hipCm", input.HipCm, 50, 220)
	bodyFat, hasBodyFat := parseOptionalDecimal(fieldErrors, "bodyFatPercentage", input.BodyFatPercentage, 3, 70)

	if !hasWeight && !hasWaist && !hasHip && !hasBodyFat {
		return nil, &ValidationFailure{FieldErrors: fieldErrors, Form: "health_record_required"}, nil
	}
	if len(fieldErrors) > 0 {
		return nil, &ValidationFailure{FieldErrors: fieldErrors}, nil
	}

	record, err := repository.UpdateHealthRecord(ctx, UpdateHealthRecordInput{
		UserID:            userID,
		ID:                id,
		LocalDate:         input.LocalDate,
		WeightKg:          weightKg,
		WaistCm:           waistCm,
		HipCm:             hipCm,
		BodyFatPercentage: bodyFat,
		Now:               s.now().UTC(),
	})
	return record, nil, err
}

func (s Service) UpdateRunRecord(ctx context.Context, userID string, id string, input RunRecordInput) (*RunRecord, *ValidationFailure, error) {
	repository, ok := s.Repository.(combinedRecordsRepository)
	if !ok {
		return nil, nil, ErrUnsupportedRepository
	}

	parsed, failure := parseRunRecordInput(input)
	if failure != nil {
		return nil, failure, nil
	}

	record, err := repository.UpdateRunRecord(ctx, UpdateRunRecordInput{
		UserID:              userID,
		ID:                  id,
		LocalDate:           input.LocalDate,
		DistanceKm:          parsed.distanceKm,
		DurationSeconds:     parsed.durationSeconds,
		PaceSecondsPerKm:    parsed.paceSecondsPerKm,
		AverageHeartRateBpm: parsed.averageHeartRateBpm,
		AverageStrideMeters: parsed.averageStrideMeters,
		CadenceSpm:          parsed.cadenceSpm,
		Now:                 s.now().UTC(),
	})
	return record, nil, err
}

func (s Service) DeleteHealthRecord(ctx context.Context, userID string, id string) (*HealthRecord, error) {
	repository, ok := s.Repository.(combinedRecordsRepository)
	if !ok {
		return nil, ErrUnsupportedRepository
	}

	return repository.DeleteHealthRecord(ctx, userID, id)
}

func (s Service) DeleteRunRecord(ctx context.Context, userID string, id string) (*RunRecord, error) {
	repository, ok := s.Repository.(combinedRecordsRepository)
	if !ok {
		return nil, ErrUnsupportedRepository
	}

	return repository.DeleteRunRecord(ctx, userID, id)
}

type parsedRunRecordInput struct {
	distanceKm          float64
	durationSeconds     *int
	paceSecondsPerKm    *int
	averageHeartRateBpm *int
	averageStrideMeters *float64
	cadenceSpm          *int
}

func parseRunRecordInput(input RunRecordInput) (*parsedRunRecordInput, *ValidationFailure) {
	fieldErrors := validateLocalDate(input.LocalDate)
	distanceKm, _ := parseRequiredDecimal(fieldErrors, "distanceKm", input.DistanceKm, 0.1, 100)
	durationMinutes, hasDuration := parseOptionalInteger(fieldErrors, "durationMinutes", input.DurationMinutes, 1, 600)
	heartRate, _ := parseOptionalInteger(fieldErrors, "averageHeartRateBpm", input.AverageHeartRateBpm, 60, 220)
	stride, _ := parseOptionalDecimal(fieldErrors, "averageStrideMeters", input.AverageStrideMeters, 0.4, 2.5)
	cadence, _ := parseOptionalInteger(fieldErrors, "cadenceSpm", input.CadenceSpm, 80, 240)

	var durationSeconds *int
	var paceSecondsPerKm *int
	if hasDuration && distanceKm != nil && fieldErrors["durationMinutes"] == "" && fieldErrors["distanceKm"] == "" {
		duration := *durationMinutes
		paceMinutesPerKm := float64(duration) / *distanceKm
		if paceMinutesPerKm < 2 || paceMinutesPerKm > 30 {
			fieldErrors["durationMinutes"] = "unreasonable_pace"
		} else {
			seconds := duration * 60
			pace := int(math.Round(float64(seconds) / *distanceKm))
			durationSeconds = &seconds
			paceSecondsPerKm = &pace
		}
	}

	if len(fieldErrors) > 0 {
		return nil, &ValidationFailure{FieldErrors: compactFieldErrors(fieldErrors)}
	}

	return &parsedRunRecordInput{
		distanceKm:          *distanceKm,
		durationSeconds:     durationSeconds,
		paceSecondsPerKm:    paceSecondsPerKm,
		averageHeartRateBpm: heartRate,
		averageStrideMeters: stride,
		cadenceSpm:          cadence,
	}, nil
}

func validateLocalDate(localDate string) map[string]string {
	fieldErrors := map[string]string{}
	if !localDatePattern.MatchString(localDate) {
		fieldErrors["localDate"] = "invalid_date"
		return fieldErrors
	}

	parsed, err := time.Parse("2006-01-02", localDate)
	if err != nil || parsed.Format("2006-01-02") != localDate {
		fieldErrors["localDate"] = "invalid_date"
	}

	return fieldErrors
}

func parseRequiredDecimal(fieldErrors map[string]string, key string, raw string, minValue float64, maxValue float64) (*float64, bool) {
	value, present := parseOptionalDecimal(fieldErrors, key, raw, minValue, maxValue)
	if !present {
		fieldErrors[key] = "required"
	}

	return value, present
}

func parseRequiredInteger(fieldErrors map[string]string, key string, raw string, minValue int, maxValue int) (*int, bool) {
	value, present := parseOptionalInteger(fieldErrors, key, raw, minValue, maxValue)
	if !present {
		fieldErrors[key] = "required"
	}

	return value, present
}

func parseOptionalDecimal(fieldErrors map[string]string, key string, raw string, minValue float64, maxValue float64) (*float64, bool) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil, false
	}

	value, err := strconv.ParseFloat(trimmed, 64)
	if err != nil || !isFinite(value) || value < minValue || value > maxValue {
		fieldErrors[key] = "range"
		return nil, true
	}

	return &value, true
}

func parseOptionalInteger(fieldErrors map[string]string, key string, raw string, minValue int, maxValue int) (*int, bool) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil, false
	}

	value, err := strconv.Atoi(trimmed)
	if err != nil || value < minValue || value > maxValue {
		fieldErrors[key] = "range"
		return nil, true
	}

	return &value, true
}

func compactFieldErrors(fieldErrors map[string]string) map[string]string {
	compacted := map[string]string{}
	for key, value := range fieldErrors {
		if value != "" {
			compacted[key] = value
		}
	}

	return compacted
}

func isFinite(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0)
}
