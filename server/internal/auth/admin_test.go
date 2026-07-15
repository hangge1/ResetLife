package auth

import (
	"context"
	"testing"
	"time"
)

func TestAdminServiceCreatesInitialAdminAndSession(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 7, 15, 0, 0, 0, 0, time.UTC)
	repository := &fakeAdminRepository{}

	result, failure, err := AdminService{
		Repository: repository,
		Clock: func() time.Time {
			return now
		},
	}.CreateInitialAdmin(context.Background(), CreateInitialAdminInput{
		Username:        "admin",
		DisplayName:     "Administrator",
		Password:        "password123",
		ConfirmPassword: "password123",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if failure != nil {
		t.Fatalf("expected no failure, got %#v", failure)
	}
	if result == nil || result.User.Username != "admin" || result.User.Role != RoleAdmin {
		t.Fatalf("unexpected result %#v", result)
	}
	if repository.createdUser == nil || !VerifyAccessPassword("password123", repository.createdUser.PasswordHash) {
		t.Fatalf("expected password hash to be stored, user=%#v", repository.createdUser)
	}
	if repository.createdSession == nil || repository.createdSession.UserID != "user-1" {
		t.Fatalf("expected session to be created, got %#v", repository.createdSession)
	}
}

func TestAdminServiceRejectsWhenAdminExists(t *testing.T) {
	t.Parallel()

	result, failure, err := AdminService{
		Repository: &fakeAdminRepository{activeUsers: 1},
	}.CreateInitialAdmin(context.Background(), CreateInitialAdminInput{
		Username:        "admin",
		Password:        "password123",
		ConfirmPassword: "password123",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result != nil {
		t.Fatalf("expected no result, got %#v", result)
	}
	if failure == nil || failure.Form != "admin_already_exists" {
		t.Fatalf("expected admin_already_exists, got %#v", failure)
	}
}

func TestAdminServiceValidatesFields(t *testing.T) {
	t.Parallel()

	result, failure, err := AdminService{Repository: &fakeAdminRepository{}}.CreateInitialAdmin(context.Background(), CreateInitialAdminInput{
		Username:        "a",
		Password:        "short",
		ConfirmPassword: "different",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result != nil {
		t.Fatalf("expected no result, got %#v", result)
	}
	if failure == nil ||
		failure.FieldErrors["username"] != "invalid_format" ||
		failure.FieldErrors["password"] != "too_short" ||
		failure.FieldErrors["confirmPassword"] != "mismatch" {
		t.Fatalf("unexpected failure %#v", failure)
	}
}

func TestAdminServiceManagesUsers(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 7, 15, 0, 0, 0, 0, time.UTC)
	repository := &fakeAdminRepository{
		users: []ManagedUser{
			{ID: "admin-1", Username: "admin", Role: RoleAdmin},
		},
		activeAdmins: 1,
	}
	service := AdminService{
		Repository: repository,
		Clock: func() time.Time {
			return now
		},
	}

	created, failure, err := service.CreateManagedUser(context.Background(), CreateManagedUserInput{
		Username:        "runner",
		DisplayName:     "",
		Role:            "user",
		Password:        "password123",
		ConfirmPassword: "password123",
	})
	if err != nil {
		t.Fatalf("create managed user: %v", err)
	}
	if failure != nil {
		t.Fatalf("expected no failure, got %#v", failure)
	}
	if created == nil || created.Username != "runner" || created.DisplayName == nil || *created.DisplayName != "runner" {
		t.Fatalf("unexpected created user %#v", created)
	}
	if repository.createdUser == nil || repository.createdUser.Role != RoleUser || !VerifyAccessPassword("password123", repository.createdUser.PasswordHash) {
		t.Fatalf("unexpected create input %#v", repository.createdUser)
	}

	updated, failure, err := service.UpdateManagedUser(context.Background(), UpdateManagedUserInput{
		CurrentAdminUserID: "admin-1",
		UserID:             created.ID,
		DisplayName:        "Runner",
		Role:               "user",
		Password:           "newpassword",
		ConfirmPassword:    "newpassword",
	})
	if err != nil {
		t.Fatalf("update managed user: %v", err)
	}
	if failure != nil {
		t.Fatalf("expected no failure, got %#v", failure)
	}
	if updated == nil || repository.updatedUser == nil || repository.updatedUser.UserID != created.ID {
		t.Fatalf("expected user update, updated=%#v input=%#v", updated, repository.updatedUser)
	}
	if repository.updatedPassword == nil || !VerifyAccessPassword("newpassword", repository.updatedPassword.PasswordHash) {
		t.Fatalf("expected password update, got %#v", repository.updatedPassword)
	}
	if repository.revokedUserID != created.ID {
		t.Fatalf("expected sessions revoked for %q, got %q", created.ID, repository.revokedUserID)
	}
}

func TestAdminServiceProtectsLastAdminAndSelf(t *testing.T) {
	t.Parallel()

	repository := &fakeAdminRepository{
		activeAdmins: 1,
		users: []ManagedUser{
			{ID: "admin-1", Username: "admin", Role: RoleAdmin},
			{ID: "admin-2", Username: "other-admin", Role: RoleAdmin},
		},
	}
	service := AdminService{Repository: repository}

	_, failure, err := service.UpdateManagedUser(context.Background(), UpdateManagedUserInput{
		CurrentAdminUserID: "admin-1",
		UserID:             "admin-1",
		Role:               "user",
	})
	if err != nil {
		t.Fatalf("update self role: %v", err)
	}
	if failure == nil || failure.FieldErrors["role"] != "cannot_change_self_role" {
		t.Fatalf("expected self role failure, got %#v", failure)
	}

	_, failure, err = service.DisableManagedUser(context.Background(), DisableManagedUserInput{
		CurrentAdminUserID: "admin-1",
		UserID:             "admin-2",
	})
	if err != nil {
		t.Fatalf("disable last admin: %v", err)
	}
	if failure == nil || failure.Form != "last_admin" {
		t.Fatalf("expected last_admin failure, got %#v", failure)
	}

	_, failure, err = service.DisableManagedUser(context.Background(), DisableManagedUserInput{
		CurrentAdminUserID: "admin-1",
		UserID:             "admin-1",
	})
	if err != nil {
		t.Fatalf("disable self: %v", err)
	}
	if failure == nil || failure.Form != "cannot_disable_self" {
		t.Fatalf("expected cannot_disable_self failure, got %#v", failure)
	}
}

type fakeAdminRepository struct {
	fakeLoginRepository
	activeUsers     int
	activeAdmins    int
	users           []ManagedUser
	createdUser     *CreateUserInput
	updatedUser     *UpdateUserInput
	updatedPassword *UpdateUserPasswordInput
	disabledUserID  string
	revokedUserID   string
}

func (r *fakeAdminRepository) CountActiveUsers(context.Context) (int, error) {
	return r.activeUsers, nil
}

func (r *fakeAdminRepository) CountActiveAdmins(context.Context) (int, error) {
	return r.activeAdmins, nil
}

func (r *fakeAdminRepository) ListUsers(context.Context) ([]ManagedUser, error) {
	return r.users, nil
}

func (r *fakeAdminRepository) GetAnyUserByID(_ context.Context, userID string) (*ManagedUser, error) {
	for index := range r.users {
		if r.users[index].ID == userID {
			return &r.users[index], nil
		}
	}
	return nil, nil
}

func (r *fakeAdminRepository) CreateUser(_ context.Context, input CreateUserInput) (*User, error) {
	r.createdUser = &input
	id := "user-1"
	displayName := input.DisplayName
	managed := ManagedUser{
		ID:          id,
		Username:    input.Username,
		DisplayName: displayName,
		Role:        input.Role,
	}
	r.users = append(r.users, managed)
	return &User{
		ID:           id,
		Username:     input.Username,
		DisplayName:  displayName,
		Role:         input.Role,
		PasswordHash: input.PasswordHash,
	}, nil
}

func (r *fakeAdminRepository) UpdateUser(_ context.Context, input UpdateUserInput) (*ManagedUser, error) {
	r.updatedUser = &input
	for index := range r.users {
		if r.users[index].ID == input.UserID {
			r.users[index].DisplayName = input.DisplayName
			r.users[index].Role = input.Role
			return &r.users[index], nil
		}
	}
	return nil, nil
}

func (r *fakeAdminRepository) UpdateUserPassword(_ context.Context, input UpdateUserPasswordInput) error {
	r.updatedPassword = &input
	return nil
}

func (r *fakeAdminRepository) DisableUser(_ context.Context, userID string, now time.Time) (*ManagedUser, error) {
	r.disabledUserID = userID
	disabledAtIso := now.UTC().Format(time.RFC3339)
	for index := range r.users {
		if r.users[index].ID == userID {
			r.users[index].DisabledAtIso = &disabledAtIso
			return &r.users[index], nil
		}
	}
	return nil, nil
}

func (r *fakeAdminRepository) RevokeUserSessions(_ context.Context, userID string, _ time.Time) error {
	r.revokedUserID = userID
	return nil
}
