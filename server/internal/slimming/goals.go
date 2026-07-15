package slimming

import (
	"context"
	"time"
)

type HealthGoalInput struct {
	TargetWeightKg          string `json:"targetWeightKg"`
	TargetWaistCm           string `json:"targetWaistCm"`
	TargetHipCm             string `json:"targetHipCm"`
	TargetBodyFatPercentage string `json:"targetBodyFatPercentage"`
}

type RunGoalInput struct {
	WeeklyRunCount   string `json:"weeklyRunCount"`
	WeeklyDistanceKm string `json:"weeklyDistanceKm"`
}

type SaveHealthGoalInput struct {
	UserID                  string
	TargetWeightKg          float64
	TargetWaistCm           *float64
	TargetHipCm             *float64
	TargetBodyFatPercentage *float64
	Now                     time.Time
}

type SaveRunGoalInput struct {
	UserID           string
	WeeklyRunCount   int
	WeeklyDistanceKm float64
	Now              time.Time
}

type GoalsRepository interface {
	SaveHealthGoal(ctx context.Context, input SaveHealthGoalInput) (*HealthGoal, error)
	SaveRunGoal(ctx context.Context, input SaveRunGoalInput) (*RunGoal, error)
}

type combinedGoalsRepository interface {
	Repository
	GoalsRepository
}

func (s Service) SaveHealthGoal(ctx context.Context, userID string, input HealthGoalInput) (*HealthGoal, *ValidationFailure, error) {
	repository, ok := s.Repository.(combinedGoalsRepository)
	if !ok {
		return nil, nil, ErrUnsupportedRepository
	}

	fieldErrors := map[string]string{}
	targetWeight, _ := parseRequiredDecimal(fieldErrors, "targetWeightKg", input.TargetWeightKg, 0.0000001, 1_000_000)
	targetWaist, _ := parseOptionalDecimal(fieldErrors, "targetWaistCm", input.TargetWaistCm, 0.0000001, 1_000_000)
	targetHip, _ := parseOptionalDecimal(fieldErrors, "targetHipCm", input.TargetHipCm, 0.0000001, 1_000_000)
	targetBodyFat, _ := parseOptionalDecimal(fieldErrors, "targetBodyFatPercentage", input.TargetBodyFatPercentage, 0, 100)

	if len(fieldErrors) > 0 {
		return nil, &ValidationFailure{FieldErrors: compactFieldErrors(fieldErrors)}, nil
	}

	goal, err := repository.SaveHealthGoal(ctx, SaveHealthGoalInput{
		UserID:                  userID,
		TargetWeightKg:          *targetWeight,
		TargetWaistCm:           targetWaist,
		TargetHipCm:             targetHip,
		TargetBodyFatPercentage: targetBodyFat,
		Now:                     s.now().UTC(),
	})
	return goal, nil, err
}

func (s Service) SaveRunGoal(ctx context.Context, userID string, input RunGoalInput) (*RunGoal, *ValidationFailure, error) {
	repository, ok := s.Repository.(combinedGoalsRepository)
	if !ok {
		return nil, nil, ErrUnsupportedRepository
	}

	fieldErrors := map[string]string{}
	weeklyRunCount, _ := parseRequiredInteger(fieldErrors, "weeklyRunCount", input.WeeklyRunCount, 1, 1000)
	weeklyDistanceKm, _ := parseRequiredDecimal(fieldErrors, "weeklyDistanceKm", input.WeeklyDistanceKm, 0.0000001, 100000)

	if len(fieldErrors) > 0 {
		return nil, &ValidationFailure{FieldErrors: compactFieldErrors(fieldErrors)}, nil
	}

	goal, err := repository.SaveRunGoal(ctx, SaveRunGoalInput{
		UserID:           userID,
		WeeklyRunCount:   *weeklyRunCount,
		WeeklyDistanceKm: *weeklyDistanceKm,
		Now:              s.now().UTC(),
	})
	return goal, nil, err
}
