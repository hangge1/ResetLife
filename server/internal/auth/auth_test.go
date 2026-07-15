package auth

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestHashSessionTokenMatchesNodeBase64URLSHA256(t *testing.T) {
	t.Parallel()

	got := HashSessionToken("session-token")
	want := "wQHpEUaclpFxBAtQ1wVDMTz5aP3vW6zHgHdvj7OZqzY"

	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestResolverReturnsNilWithoutToken(t *testing.T) {
	t.Parallel()

	repository := &fakeRepository{}
	resolver := Resolver{Repository: repository}

	context, err := resolver.Resolve(context.Background(), "")

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if context != nil {
		t.Fatalf("expected nil context, got %#v", context)
	}
	if repository.sessionHash != "" {
		t.Fatalf("repository should not be called")
	}
}

func TestResolverReturnsUserContext(t *testing.T) {
	t.Parallel()

	displayName := "管理员"
	repository := &fakeRepository{
		session: &Session{ID: "session-1", UserID: "user-1"},
		user: &User{
			ID:          "user-1",
			Username:    "admin",
			DisplayName: &displayName,
			Role:        RoleAdmin,
		},
	}
	resolver := Resolver{
		Repository: repository,
		Clock: func() time.Time {
			return time.Date(2026, 7, 15, 0, 0, 0, 0, time.UTC)
		},
	}

	context, err := resolver.Resolve(context.Background(), "session-token")

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if context == nil {
		t.Fatal("expected auth context")
	}
	if context.Mode != "user" || context.UserID != "user-1" || context.Username != "admin" || context.Role != RoleAdmin {
		t.Fatalf("unexpected auth context %#v", context)
	}
	if context.DisplayName == nil || *context.DisplayName != displayName {
		t.Fatalf("unexpected display name %#v", context.DisplayName)
	}
	if repository.sessionHash != HashSessionToken("session-token") {
		t.Fatalf("unexpected session hash %q", repository.sessionHash)
	}
	if !repository.now.Equal(time.Date(2026, 7, 15, 0, 0, 0, 0, time.UTC)) {
		t.Fatalf("unexpected resolver time %s", repository.now)
	}
}

func TestResolverPropagatesRepositoryError(t *testing.T) {
	t.Parallel()

	expected := errors.New("database unavailable")
	resolver := Resolver{Repository: &fakeRepository{err: expected}}

	context, err := resolver.Resolve(context.Background(), "session-token")

	if !errors.Is(err, expected) {
		t.Fatalf("expected %v, got %v", expected, err)
	}
	if context != nil {
		t.Fatalf("expected nil context, got %#v", context)
	}
}

type fakeRepository struct {
	session     *Session
	user        *User
	err         error
	sessionHash string
	now         time.Time
}

func (r *fakeRepository) FindActiveSessionByHash(_ context.Context, sessionTokenHash string, now time.Time) (*Session, error) {
	r.sessionHash = sessionTokenHash
	r.now = now
	if r.err != nil {
		return nil, r.err
	}

	return r.session, nil
}

func (r *fakeRepository) GetActiveUserByID(context.Context, string) (*User, error) {
	if r.err != nil {
		return nil, r.err
	}

	return r.user, nil
}
