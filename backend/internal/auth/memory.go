package auth

import (
	"context"
	"sync"
	"time"
)

type MemoryRepository struct {
	mu       sync.RWMutex
	sessions map[string]Session
	users    map[string]User
}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		sessions: make(map[string]Session),
		users:    make(map[string]User),
	}
}

func (r *MemoryRepository) SaveUser(user User) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.users[user.ID] = user
}

func (r *MemoryRepository) SaveSession(session Session) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.sessions[session.SessionTokenHash] = session
}

func (r *MemoryRepository) FindActiveSessionByHash(_ context.Context, sessionTokenHash string, now time.Time) (*Session, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	session, ok := r.sessions[sessionTokenHash]
	if !ok {
		return nil, nil
	}

	if session.RevokedAt != nil || !session.ExpiresAt.IsZero() && !session.ExpiresAt.After(now) {
		return nil, nil
	}

	return &session, nil
}

func (r *MemoryRepository) GetActiveUserByID(_ context.Context, userID string) (*User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	user, ok := r.users[userID]
	if !ok {
		return nil, nil
	}

	if user.DisabledAt != nil {
		return nil, nil
	}

	return &user, nil
}
