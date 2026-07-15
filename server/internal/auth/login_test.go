package auth

import (
	"context"
	"testing"
	"time"
)

func TestLoginServiceCreatesSessionForValidUser(t *testing.T) {
	t.Parallel()

	displayName := "Admin"
	now := time.Date(2026, 7, 15, 0, 0, 0, 0, time.UTC)
	repository := &fakeLoginRepository{
		user: &User{
			ID:           "user-1",
			Username:     "admin",
			DisplayName:  &displayName,
			Role:         RoleAdmin,
			PasswordHash: "scrypt:v1:16384:8:1:MDEyMzQ1Njc4OWFiY2RlZg:tjK03tRvEjqCcPwmgtddMkgjlXrk8U_b9rIvfeBMKCcxlckVogBtTKwjk3CpCcSQhX0X2CBkh7x8-hWN0EaASQ",
		},
	}

	result, failure, err := LoginService{
		Repository: repository,
		Clock: func() time.Time {
			return now
		},
	}.Login(context.Background(), LoginInput{
		Username: " admin ",
		Password: "correct horse battery staple",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if failure != nil {
		t.Fatalf("expected no failure, got %#v", failure)
	}
	if result == nil || result.User.UserID != "user-1" || result.User.Role != RoleAdmin {
		t.Fatalf("unexpected login result %#v", result)
	}
	if result.SessionToken == "" {
		t.Fatal("expected session token")
	}
	if !result.ExpiresAt.Equal(now.Add(SessionMaxAge)) {
		t.Fatalf("unexpected expiry %s", result.ExpiresAt)
	}
	if repository.createdSession == nil || repository.createdSession.UserID != "user-1" {
		t.Fatalf("expected created session, got %#v", repository.createdSession)
	}
}

func TestLoginServiceRejectsInvalidCredentials(t *testing.T) {
	t.Parallel()

	result, failure, err := LoginService{
		Repository: &fakeLoginRepository{
			user: &User{
				ID:           "user-1",
				Username:     "admin",
				Role:         RoleAdmin,
				PasswordHash: "scrypt:v1:16384:8:1:MDEyMzQ1Njc4OWFiY2RlZg:tjK03tRvEjqCcPwmgtddMkgjlXrk8U_b9rIvfeBMKCcxlckVogBtTKwjk3CpCcSQhX0X2CBkh7x8-hWN0EaASQ",
			},
		},
	}.Login(context.Background(), LoginInput{
		Username: "admin",
		Password: "wrong",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result != nil {
		t.Fatalf("expected no result, got %#v", result)
	}
	if failure == nil || failure.Form != "invalid_credentials" {
		t.Fatalf("expected invalid credentials, got %#v", failure)
	}
}

func TestLoginServiceReturnsFieldErrors(t *testing.T) {
	t.Parallel()

	result, failure, err := LoginService{Repository: &fakeLoginRepository{}}.Login(context.Background(), LoginInput{})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result != nil {
		t.Fatalf("expected no result, got %#v", result)
	}
	if failure == nil || failure.FieldErrors["username"] != "required" || failure.FieldErrors["password"] != "required" {
		t.Fatalf("unexpected failure %#v", failure)
	}
}

type fakeLoginRepository struct {
	user           *User
	createdSession *CreateSessionInput
	revokedHash    string
}

func (r *fakeLoginRepository) GetActiveUserByUsername(context.Context, string) (*User, error) {
	return r.user, nil
}

func (r *fakeLoginRepository) CreateSession(_ context.Context, input CreateSessionInput) (*Session, error) {
	r.createdSession = &input
	return &Session{
		ID:               "session-1",
		UserID:           input.UserID,
		SessionTokenHash: input.SessionTokenHash,
		ExpiresAt:        input.ExpiresAt,
	}, nil
}

func (r *fakeLoginRepository) RevokeSessionByHash(_ context.Context, sessionTokenHash string, _ time.Time) error {
	r.revokedHash = sessionTokenHash
	return nil
}
