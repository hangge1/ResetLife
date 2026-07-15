package slimming

import (
	"context"
	"sort"
	"time"
)

type HistoryRecordType string

const (
	HistoryRecordAll    HistoryRecordType = "all"
	HistoryRecordHealth HistoryRecordType = "health"
	HistoryRecordRun    HistoryRecordType = "run"
)

type HistoryRange string

const (
	HistoryRangeAll    HistoryRange = "all"
	HistoryRangeLast7  HistoryRange = "last7"
	HistoryRangeLast30 HistoryRange = "last30"
	HistoryRangeCustom HistoryRange = "custom"
)

type HistoryFilters struct {
	Type           HistoryRecordType
	Range          HistoryRange
	TodayLocalDate string
	StartDate      string
	EndDate        string
}

type HistoryEntry struct {
	ID           string        `json:"id"`
	Kind         string        `json:"kind"`
	LocalDate    string        `json:"localDate"`
	CreatedAtIso string        `json:"createdAtIso"`
	Health       *HealthRecord `json:"health,omitempty"`
	Run          *RunRecord    `json:"run,omitempty"`
}

type HistoryResponse struct {
	Entries []HistoryEntry `json:"entries"`
}

func (s Service) ListHistory(ctx context.Context, userID string, filters HistoryFilters) (*HistoryResponse, error) {
	repository, ok := s.Repository.(combinedRecordsRepository)
	if !ok {
		return nil, ErrUnsupportedRepository
	}

	filters = normalizeHistoryFilters(filters, s.now().Format("2006-01-02"))

	entries := make([]HistoryEntry, 0)
	if filters.Type != HistoryRecordRun {
		records, err := repository.ListHealthRecords(ctx, userID)
		if err != nil {
			return nil, err
		}
		for _, record := range records {
			if !historyEntryInRange(record.LocalDate, filters) {
				continue
			}
			record := record
			entries = append(entries, HistoryEntry{
				ID:           record.ID,
				Kind:         string(HistoryRecordHealth),
				LocalDate:    record.LocalDate,
				CreatedAtIso: record.CreatedAtIso,
				Health:       &record,
			})
		}
	}

	if filters.Type != HistoryRecordHealth {
		records, err := repository.ListRunRecords(ctx, userID)
		if err != nil {
			return nil, err
		}
		for _, record := range records {
			if !historyEntryInRange(record.LocalDate, filters) {
				continue
			}
			record := record
			entries = append(entries, HistoryEntry{
				ID:           record.ID,
				Kind:         string(HistoryRecordRun),
				LocalDate:    record.LocalDate,
				CreatedAtIso: record.CreatedAtIso,
				Run:          &record,
			})
		}
	}

	sort.SliceStable(entries, func(i, j int) bool {
		left := entries[i]
		right := entries[j]
		if left.LocalDate != right.LocalDate {
			return left.LocalDate > right.LocalDate
		}
		return left.CreatedAtIso > right.CreatedAtIso
	})

	return &HistoryResponse{Entries: entries}, nil
}

func normalizeHistoryFilters(filters HistoryFilters, fallbackToday string) HistoryFilters {
	if filters.Type == "" {
		filters.Type = HistoryRecordAll
	}
	if filters.Type != HistoryRecordAll && filters.Type != HistoryRecordHealth && filters.Type != HistoryRecordRun {
		filters.Type = HistoryRecordAll
	}

	if filters.Range == "" {
		filters.Range = HistoryRangeAll
	}
	if filters.Range != HistoryRangeAll && filters.Range != HistoryRangeLast7 && filters.Range != HistoryRangeLast30 && filters.Range != HistoryRangeCustom {
		filters.Range = HistoryRangeAll
	}

	if filters.TodayLocalDate == "" {
		filters.TodayLocalDate = fallbackToday
	}

	return filters
}

func historyEntryInRange(localDate string, filters HistoryFilters) bool {
	startDate, endDate := historyRangeBounds(filters)
	if startDate != "" && localDate < startDate {
		return false
	}
	if endDate != "" && localDate > endDate {
		return false
	}
	return true
}

func historyRangeBounds(filters HistoryFilters) (string, string) {
	switch filters.Range {
	case HistoryRangeLast7:
		return addLocalDays(filters.TodayLocalDate, -6), filters.TodayLocalDate
	case HistoryRangeLast30:
		return addLocalDays(filters.TodayLocalDate, -29), filters.TodayLocalDate
	case HistoryRangeCustom:
		return filters.StartDate, filters.EndDate
	default:
		return "", ""
	}
}

func addLocalDays(localDate string, days int) string {
	parsed, err := time.Parse("2006-01-02", localDate)
	if err != nil {
		return localDate
	}

	return parsed.AddDate(0, 0, days).Format("2006-01-02")
}
