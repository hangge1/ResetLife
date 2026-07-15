package auth

import (
	"context"
	"strings"
	"time"
)

type CreateSessionInput struct {
	UserID           string
	SessionTokenHash string
	Now              time.Time
	ExpiresAt        time.Time
}

type LoginRepository interface {
	GetActiveUserByUsername(ctx context.Context, username string) (*User, error)
	CreateSession(ctx context.Context, input CreateSessionInput) (*Session, error)
	RevokeSessionByHash(ctx context.Context, sessionTokenHash string, now time.Time) error
}

type LoginService struct {
	Repository LoginRepository
	Clock      func() time.Time
}

type LoginInput struct {
	Username string
	Password string
}

type LoginResult struct {
	User         Context   `json:"user"`
	SessionToken string    `json:"-"`
	ExpiresAt    time.Time `json:"expiresAt"`
}

type AuthFailure struct {
	FieldErrors map[string]string `json:"fieldErrors,omitempty"`
	Form        string            `json:"form,omitempty"`
}

func (s LoginService) Login(ctx context.Context, input LoginInput) (*LoginResult, *AuthFailure, error) {
	username := strings.TrimSpace(input.Username)
	fieldErrors := map[string]string{}
	if username == "" {
		fieldErrors["username"] = "required"
	}
	if input.Password == "" {
		fieldErrors["password"] = "required"
	}
	if len(fieldErrors) > 0 {
		return nil, &AuthFailure{FieldErrors: fieldErrors}, nil
	}

	user, err := s.Repository.GetActiveUserByUsername(ctx, username)
	if err != nil {
		return nil, nil, err
	}
	if user == nil || !VerifyAccessPassword(input.Password, user.PasswordHash) {
		return nil, &AuthFailure{Form: "invalid_credentials"}, nil
	}

	result, err := s.createSessionForUser(ctx, user)
	return result, nil, err
}

func (s LoginService) Logout(ctx context.Context, sessionToken string) error {
	if sessionToken == "" {
		return nil
	}

	return s.Repository.RevokeSessionByHash(ctx, HashSessionToken(sessionToken), s.now())
}

func (s LoginService) now() time.Time {
	if s.Clock != nil {
		return s.Clock().UTC()
	}

	return time.Now().UTC()
}

func (s LoginService) createSessionForUser(ctx context.Context, user *User) (*LoginResult, error) {
	sessionToken, err := CreateSessionToken()
	if err != nil {
		return nil, err
	}

	now := s.now()
	expiresAt := now.Add(SessionMaxAge)
	if _, err := s.Repository.CreateSession(ctx, CreateSessionInput{
		UserID:           user.ID,
		SessionTokenHash: HashSessionToken(sessionToken),
		Now:              now,
		ExpiresAt:        expiresAt,
	}); err != nil {
		return nil, err
	}

	return &LoginResult{
		User: Context{
			Mode:        "user",
			UserID:      user.ID,
			Username:    user.Username,
			DisplayName: user.DisplayName,
			Role:        user.Role,
		},
		SessionToken: sessionToken,
		ExpiresAt:    expiresAt,
	}, nil
}
