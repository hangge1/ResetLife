package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"time"
)

const (
	DefaultAdminUserID    = "default-admin"
	UserSessionCookieName = "slimming_user_session"
	PasswordHashAlgorithm = "scrypt:v1"
	SessionMaxAge         = 30 * 24 * time.Hour
)

type Role string

const (
	RoleAdmin Role = "admin"
	RoleUser  Role = "user"
)

type Session struct {
	ID               string
	UserID           string
	SessionTokenHash string
	ExpiresAt        time.Time
	RevokedAt        *time.Time
}

type User struct {
	ID           string
	Username     string
	DisplayName  *string
	Role         Role
	PasswordHash string
	DisabledAt   *time.Time
}

type Context struct {
	Mode        string  `json:"mode"`
	UserID      string  `json:"userId"`
	Username    string  `json:"username"`
	DisplayName *string `json:"displayName"`
	Role        Role    `json:"role"`
}

type Repository interface {
	FindActiveSessionByHash(ctx context.Context, sessionTokenHash string, now time.Time) (*Session, error)
	GetActiveUserByID(ctx context.Context, userID string) (*User, error)
}

type Resolver struct {
	Repository Repository
	Clock      func() time.Time
}

func (r Resolver) Resolve(ctx context.Context, sessionToken string) (*Context, error) {
	if sessionToken == "" {
		return nil, nil
	}

	now := time.Now().UTC()
	if r.Clock != nil {
		now = r.Clock().UTC()
	}

	session, err := r.Repository.FindActiveSessionByHash(ctx, HashSessionToken(sessionToken), now)
	if err != nil || session == nil {
		return nil, err
	}

	user, err := r.Repository.GetActiveUserByID(ctx, session.UserID)
	if err != nil || user == nil {
		return nil, err
	}

	return &Context{
		Mode:        "user",
		UserID:      user.ID,
		Username:    user.Username,
		DisplayName: user.DisplayName,
		Role:        user.Role,
	}, nil
}

func HashSessionToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

func CreateSessionToken() (string, error) {
	var token [32]byte
	if _, err := rand.Read(token[:]); err != nil {
		return "", err
	}

	return base64.RawURLEncoding.EncodeToString(token[:]), nil
}
