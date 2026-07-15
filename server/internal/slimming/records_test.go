package slimming

import (
	"context"
	"testing"
	"time"
)

func TestServiceSavesHealthRecordWithValidation(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 7, 15, 0, 0, 0, 0, time.UTC)
	repository := &fakeRecordsRepository{}
	record, failure, err := Service{
		Repository: repository,
		Clock: func() time.Time {
			return now
		},
	}.SaveHealthRecord(context.Background(), "user-1", HealthRecordInput{
		LocalDate:         "2026-07-15",
		WeightKg:          "81.8",
		WaistCm:           "90.4",
		BodyFatPercentage: "24.1",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if failure != nil {
		t.Fatalf("expected no failure, got %#v", failure)
	}
	if record == nil || repository.healthInput == nil || repository.healthInput.UserID != "user-1" {
		t.Fatalf("expected health record to be saved, record=%#v input=%#v", record, repository.healthInput)
	}
	if repository.healthInput.WeightKg == nil || *repository.healthInput.WeightKg != 81.8 {
		t.Fatalf("unexpected weight %#v", repository.healthInput.WeightKg)
	}
}

func TestServiceRejectsEmptyHealthRecord(t *testing.T) {
	t.Parallel()

	record, failure, err := Service{Repository: &fakeRecordsRepository{}}.SaveHealthRecord(context.Background(), "user-1", HealthRecordInput{
		LocalDate: "2026-07-15",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if record != nil {
		t.Fatalf("expected no record, got %#v", record)
	}
	if failure == nil || failure.Form != "health_record_required" {
		t.Fatalf("unexpected failure %#v", failure)
	}
}

func TestServiceCreatesRunRecordAndCalculatesPace(t *testing.T) {
	t.Parallel()

	repository := &fakeRecordsRepository{}
	record, failure, err := Service{Repository: repository}.CreateRunRecord(context.Background(), "user-1", RunRecordInput{
		LocalDate:           "2026-07-15",
		DistanceKm:          "5.2",
		DurationMinutes:     "34",
		AverageHeartRateBpm: "145",
		AverageStrideMeters: "1.08",
		CadenceSpm:          "166",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if failure != nil {
		t.Fatalf("expected no failure, got %#v", failure)
	}
	if record == nil || repository.runInput == nil || repository.runInput.DistanceKm != 5.2 {
		t.Fatalf("expected run record to be saved, record=%#v input=%#v", record, repository.runInput)
	}
	if repository.runInput.DurationSeconds == nil || *repository.runInput.DurationSeconds != 2040 {
		t.Fatalf("unexpected duration %#v", repository.runInput.DurationSeconds)
	}
	if repository.runInput.PaceSecondsPerKm == nil || *repository.runInput.PaceSecondsPerKm != 392 {
		t.Fatalf("unexpected pace %#v", repository.runInput.PaceSecondsPerKm)
	}
}

func TestServiceRejectsInvalidRunRecord(t *testing.T) {
	t.Parallel()

	record, failure, err := Service{Repository: &fakeRecordsRepository{}}.CreateRunRecord(context.Background(), "user-1", RunRecordInput{
		LocalDate:       "2026-02-31",
		DistanceKm:      "",
		DurationMinutes: "1",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if record != nil {
		t.Fatalf("expected no record, got %#v", record)
	}
	if failure == nil || failure.FieldErrors["localDate"] != "invalid_date" || failure.FieldErrors["distanceKm"] != "required" {
		t.Fatalf("unexpected failure %#v", failure)
	}
}

func TestServiceSavesHealthGoal(t *testing.T) {
	t.Parallel()

	repository := &fakeRecordsRepository{}
	goal, failure, err := Service{Repository: repository}.SaveHealthGoal(context.Background(), "user-1", HealthGoalInput{
		TargetWeightKg:          "75",
		TargetWaistCm:           "84",
		TargetHipCm:             "96",
		TargetBodyFatPercentage: "18",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if failure != nil {
		t.Fatalf("expected no failure, got %#v", failure)
	}
	if goal == nil || repository.healthGoalInput == nil || repository.healthGoalInput.UserID != "user-1" {
		t.Fatalf("expected health goal to be saved, goal=%#v input=%#v", goal, repository.healthGoalInput)
	}
	if repository.healthGoalInput.TargetHipCm == nil || *repository.healthGoalInput.TargetHipCm != 96 {
		t.Fatalf("unexpected target hip %#v", repository.healthGoalInput.TargetHipCm)
	}
}

func TestServiceSavesRunGoal(t *testing.T) {
	t.Parallel()

	repository := &fakeRecordsRepository{}
	goal, failure, err := Service{Repository: repository}.SaveRunGoal(context.Background(), "user-1", RunGoalInput{
		WeeklyRunCount:   "4",
		WeeklyDistanceKm: "32.5",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if failure != nil {
		t.Fatalf("expected no failure, got %#v", failure)
	}
	if goal == nil || repository.runGoalInput == nil || repository.runGoalInput.WeeklyRunCount != 4 {
		t.Fatalf("expected run goal to be saved, goal=%#v input=%#v", goal, repository.runGoalInput)
	}
}

func TestServiceRejectsInvalidGoals(t *testing.T) {
	t.Parallel()

	healthGoal, healthFailure, err := Service{Repository: &fakeRecordsRepository{}}.SaveHealthGoal(context.Background(), "user-1", HealthGoalInput{
		TargetWeightKg: "-1",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if healthGoal != nil || healthFailure == nil || healthFailure.FieldErrors["targetWeightKg"] != "range" {
		t.Fatalf("unexpected health failure goal=%#v failure=%#v", healthGoal, healthFailure)
	}

	runGoal, runFailure, err := Service{Repository: &fakeRecordsRepository{}}.SaveRunGoal(context.Background(), "user-1", RunGoalInput{
		WeeklyRunCount:   "1.5",
		WeeklyDistanceKm: "",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if runGoal != nil || runFailure == nil || runFailure.FieldErrors["weeklyRunCount"] != "range" || runFailure.FieldErrors["weeklyDistanceKm"] != "required" {
		t.Fatalf("unexpected run failure goal=%#v failure=%#v", runGoal, runFailure)
	}
}

func TestServiceListsHistoryWithTypeRangeAndSorting(t *testing.T) {
	t.Parallel()

	repository := &fakeRecordsRepository{
		healthRecords: []HealthRecord{
			{ID: "health-old", LocalDate: "2026-07-01", CreatedAtIso: "2026-07-01T08:00:00Z"},
			{ID: "health-new", LocalDate: "2026-07-15", CreatedAtIso: "2026-07-15T08:00:00Z"},
		},
		runRecords: []RunRecord{
			{ID: "run-newer", LocalDate: "2026-07-15", DistanceKm: 5, CreatedAtIso: "2026-07-15T09:00:00Z"},
			{ID: "run-old", LocalDate: "2026-06-30", DistanceKm: 10, CreatedAtIso: "2026-06-30T09:00:00Z"},
		},
	}

	history, err := Service{Repository: repository}.ListHistory(context.Background(), "user-1", HistoryFilters{
		Type:           HistoryRecordAll,
		Range:          HistoryRangeLast7,
		TodayLocalDate: "2026-07-15",
	})
	if err != nil {
		t.Fatalf("list history: %v", err)
	}
	if len(history.Entries) != 2 {
		t.Fatalf("expected two recent entries, got %#v", history.Entries)
	}
	if history.Entries[0].ID != "run-newer" || history.Entries[1].ID != "health-new" {
		t.Fatalf("unexpected history order %#v", history.Entries)
	}
}

func TestServiceListsEmptyHistoryAsEmptySlice(t *testing.T) {
	t.Parallel()

	history, err := Service{Repository: &fakeRecordsRepository{}}.ListHistory(context.Background(), "user-1", HistoryFilters{
		Type:           HistoryRecordAll,
		Range:          HistoryRangeLast7,
		TodayLocalDate: "2026-07-15",
	})
	if err != nil {
		t.Fatalf("list history: %v", err)
	}
	if history == nil {
		t.Fatal("expected history response")
	}
	if history.Entries == nil {
		t.Fatal("expected empty entries slice, got nil")
	}
	if len(history.Entries) != 0 {
		t.Fatalf("expected no entries, got %#v", history.Entries)
	}
}

func TestServiceUpdatesRunRecordAndRecalculatesPace(t *testing.T) {
	t.Parallel()

	repository := &fakeRecordsRepository{}
	record, failure, err := Service{Repository: repository}.UpdateRunRecord(context.Background(), "user-1", "run-1", RunRecordInput{
		LocalDate:       "2026-07-16",
		DistanceKm:      "6",
		DurationMinutes: "36",
	})
	if err != nil {
		t.Fatalf("update run record: %v", err)
	}
	if failure != nil {
		t.Fatalf("expected no failure, got %#v", failure)
	}
	if record == nil || repository.updatedRun == nil || repository.updatedRun.ID != "run-1" {
		t.Fatalf("expected run update, record=%#v input=%#v", record, repository.updatedRun)
	}
	if repository.updatedRun.PaceSecondsPerKm == nil || *repository.updatedRun.PaceSecondsPerKm != 360 {
		t.Fatalf("unexpected pace %#v", repository.updatedRun.PaceSecondsPerKm)
	}
}

func TestServiceDeletesRecords(t *testing.T) {
	t.Parallel()

	repository := &fakeRecordsRepository{}
	if _, err := (Service{Repository: repository}).DeleteHealthRecord(context.Background(), "user-1", "health-1"); err != nil {
		t.Fatalf("delete health record: %v", err)
	}
	if _, err := (Service{Repository: repository}).DeleteRunRecord(context.Background(), "user-1", "run-1"); err != nil {
		t.Fatalf("delete run record: %v", err)
	}
	if repository.deletedHealthID != "health-1" || repository.deletedRunID != "run-1" {
		t.Fatalf("unexpected deleted IDs health=%q run=%q", repository.deletedHealthID, repository.deletedRunID)
	}
}

type fakeRecordsRepository struct {
	summary         *Summary
	healthInput     *UpsertHealthRecordInput
	runInput        *CreateRunRecordInput
	updatedHealth   *UpdateHealthRecordInput
	updatedRun      *UpdateRunRecordInput
	deletedHealthID string
	deletedRunID    string
	healthRecords   []HealthRecord
	runRecords      []RunRecord
	healthGoalInput *SaveHealthGoalInput
	runGoalInput    *SaveRunGoalInput
}

func (r *fakeRecordsRepository) GetSummary(context.Context, string, string) (*Summary, error) {
	return r.summary, nil
}

func (r *fakeRecordsRepository) UpsertHealthRecord(_ context.Context, input UpsertHealthRecordInput) (*HealthRecord, error) {
	r.healthInput = &input
	return &HealthRecord{ID: "health-1", LocalDate: input.LocalDate, WeightKg: input.WeightKg}, nil
}

func (r *fakeRecordsRepository) CreateRunRecord(_ context.Context, input CreateRunRecordInput) (*RunRecord, error) {
	r.runInput = &input
	return &RunRecord{
		ID:                  "run-1",
		LocalDate:           input.LocalDate,
		DistanceKm:          input.DistanceKm,
		DurationSeconds:     input.DurationSeconds,
		PaceSecondsPerKm:    input.PaceSecondsPerKm,
		AverageHeartRateBpm: input.AverageHeartRateBpm,
		AverageStrideMeters: input.AverageStrideMeters,
		CadenceSpm:          input.CadenceSpm,
	}, nil
}

func (r *fakeRecordsRepository) UpdateHealthRecord(_ context.Context, input UpdateHealthRecordInput) (*HealthRecord, error) {
	r.updatedHealth = &input
	return &HealthRecord{ID: input.ID, LocalDate: input.LocalDate, WeightKg: input.WeightKg}, nil
}

func (r *fakeRecordsRepository) UpdateRunRecord(_ context.Context, input UpdateRunRecordInput) (*RunRecord, error) {
	r.updatedRun = &input
	return &RunRecord{
		ID:               input.ID,
		LocalDate:        input.LocalDate,
		DistanceKm:       input.DistanceKm,
		DurationSeconds:  input.DurationSeconds,
		PaceSecondsPerKm: input.PaceSecondsPerKm,
	}, nil
}

func (r *fakeRecordsRepository) DeleteHealthRecord(_ context.Context, _ string, id string) (*HealthRecord, error) {
	r.deletedHealthID = id
	return &HealthRecord{ID: id, LocalDate: "2026-07-15"}, nil
}

func (r *fakeRecordsRepository) DeleteRunRecord(_ context.Context, _ string, id string) (*RunRecord, error) {
	r.deletedRunID = id
	return &RunRecord{ID: id, LocalDate: "2026-07-15", DistanceKm: 5}, nil
}

func (r *fakeRecordsRepository) ListHealthRecords(context.Context, string) ([]HealthRecord, error) {
	return r.healthRecords, nil
}

func (r *fakeRecordsRepository) ListRunRecords(context.Context, string) ([]RunRecord, error) {
	return r.runRecords, nil
}

func (r *fakeRecordsRepository) SaveHealthGoal(_ context.Context, input SaveHealthGoalInput) (*HealthGoal, error) {
	r.healthGoalInput = &input
	return &HealthGoal{
		TargetWeightKg:          &input.TargetWeightKg,
		TargetWaistCm:           input.TargetWaistCm,
		TargetHipCm:             input.TargetHipCm,
		TargetBodyFatPercentage: input.TargetBodyFatPercentage,
	}, nil
}

func (r *fakeRecordsRepository) SaveRunGoal(_ context.Context, input SaveRunGoalInput) (*RunGoal, error) {
	r.runGoalInput = &input
	return &RunGoal{
		WeeklyRunCount:   &input.WeeklyRunCount,
		WeeklyDistanceKm: &input.WeeklyDistanceKm,
	}, nil
}
