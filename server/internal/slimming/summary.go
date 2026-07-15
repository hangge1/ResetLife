package slimming

import (
	"context"
	"errors"
	"time"
)

var ErrUnsupportedRepository = errors.New("slimming repository does not support requested operation")

type HealthSnapshot struct {
	LocalDate         string   `json:"localDate"`
	WeightKg          *float64 `json:"weightKg"`
	WaistCm           *float64 `json:"waistCm"`
	BodyFatPercentage *float64 `json:"bodyFatPercentage"`
}

type HealthGoal struct {
	TargetWeightKg          *float64 `json:"targetWeightKg"`
	TargetWaistCm           *float64 `json:"targetWaistCm"`
	TargetHipCm             *float64 `json:"targetHipCm"`
	TargetBodyFatPercentage *float64 `json:"targetBodyFatPercentage"`
}

type RunGoal struct {
	WeeklyRunCount   *int     `json:"weeklyRunCount"`
	WeeklyDistanceKm *float64 `json:"weeklyDistanceKm"`
}

type RunAggregate struct {
	LocalDate  string  `json:"localDate,omitempty"`
	Count      int     `json:"count"`
	DistanceKm float64 `json:"distanceKm"`
}

type Summary struct {
	HealthSnapshot *HealthSnapshot `json:"healthSnapshot"`
	HealthGoal     *HealthGoal     `json:"healthGoal"`
	RunGoal        *RunGoal        `json:"runGoal"`
	TodayRun       RunAggregate    `json:"todayRun"`
	TotalRun       RunAggregate    `json:"totalRun"`
}

type Repository interface {
	GetSummary(ctx context.Context, userID string, localDate string) (*Summary, error)
}

type Service struct {
	Repository Repository
	Clock      func() time.Time
}

func (s Service) GetSummary(ctx context.Context, userID string) (*Summary, error) {
	localDate := s.now().Format("2006-01-02")
	return s.Repository.GetSummary(ctx, userID, localDate)
}

func (s Service) now() time.Time {
	if s.Clock != nil {
		return s.Clock()
	}

	return time.Now()
}
