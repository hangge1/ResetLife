package auth

import (
	"context"
	"testing"
	"time"
)

func TestMemoryRepositoryFindsActiveSessionAndUser(t *testing.T) {
	t.Parallel()

	repository := NewMemoryRepository()
	expiresAt := time.Date(2026, 7, 16, 0, 0, 0, 0, time.UTC)
	repository.SaveSession(Session{
		ID:               "session-1",
		UserID:           "user-1",
		SessionTokenHash: "hash-1",
		ExpiresAt:        expiresAt,
	})
	repository.SaveUser(User{
		ID:       "user-1",
		Username: "admin",
		Role:     RoleAdmin,
	})

	session, err := repository.FindActiveSessionByHash(context.Background(), "hash-1", expiresAt.Add(-time.Hour))
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if session == nil || session.UserID != "user-1" {
		t.Fatalf("unexpected session %#v", session)
	}

	user, err := repository.GetActiveUserByID(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if user == nil || user.Username != "admin" || user.Role != RoleAdmin {
		t.Fatalf("unexpected user %#v", user)
	}
}

func TestMemoryRepositoryFiltersExpiredRevokedAndDisabledRecords(t *testing.T) {
	t.Parallel()

	repository := NewMemoryRepository()
	now := time.Date(2026, 7, 16, 0, 0, 0, 0, time.UTC)
	revokedAt := now.Add(-time.Hour)
	disabledAt := now.Add(-time.Hour)

	repository.SaveSession(Session{
		ID:               "expired",
		UserID:           "user-1",
		SessionTokenHash: "expired-hash",
		ExpiresAt:        now,
	})
	repository.SaveSession(Session{
		ID:               "revoked",
		UserID:           "user-1",
		SessionTokenHash: "revoked-hash",
		ExpiresAt:        now.Add(time.Hour),
		RevokedAt:        &revokedAt,
	})
	repository.SaveUser(User{
		ID:         "disabled",
		Username:   "disabled",
		Role:       RoleUser,
		DisabledAt: &disabledAt,
	})

	if session, err := repository.FindActiveSessionByHash(context.Background(), "expired-hash", now); err != nil || session != nil {
		t.Fatalf("expected expired session to be hidden, session=%#v err=%v", session, err)
	}
	if session, err := repository.FindActiveSessionByHash(context.Background(), "revoked-hash", now); err != nil || session != nil {
		t.Fatalf("expected revoked session to be hidden, session=%#v err=%v", session, err)
	}
	if user, err := repository.GetActiveUserByID(context.Background(), "disabled"); err != nil || user != nil {
		t.Fatalf("expected disabled user to be hidden, user=%#v err=%v", user, err)
	}
}
