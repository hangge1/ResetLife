package auth

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"time"
)

var usernamePattern = regexp.MustCompile(`^[a-zA-Z0-9_-]{3,32}$`)

var ErrDuplicateUsername = errors.New("duplicate username")

type CreateUserInput struct {
	Username              string
	DisplayName           *string
	Role                  Role
	PasswordHash          string
	PasswordHashAlgorithm string
	Now                   time.Time
}

type ManagedUser struct {
	ID            string     `json:"id"`
	Username      string     `json:"username"`
	DisplayName   *string    `json:"displayName"`
	Role          Role       `json:"role"`
	CreatedAtIso  string     `json:"createdAtIso"`
	UpdatedAtIso  string     `json:"updatedAtIso"`
	DisabledAtIso *string    `json:"disabledAtIso"`
	DisabledAt    *time.Time `json:"-"`
}

type UpdateUserInput struct {
	UserID      string
	DisplayName *string
	Role        Role
	Now         time.Time
}

type UpdateUserPasswordInput struct {
	UserID                string
	PasswordHash          string
	PasswordHashAlgorithm string
	Now                   time.Time
}

type AdminRepository interface {
	LoginRepository
	CountActiveUsers(ctx context.Context) (int, error)
	CountActiveAdmins(ctx context.Context) (int, error)
	ListUsers(ctx context.Context) ([]ManagedUser, error)
	GetAnyUserByID(ctx context.Context, userID string) (*ManagedUser, error)
	CreateUser(ctx context.Context, input CreateUserInput) (*User, error)
	UpdateUser(ctx context.Context, input UpdateUserInput) (*ManagedUser, error)
	UpdateUserPassword(ctx context.Context, input UpdateUserPasswordInput) error
	DisableUser(ctx context.Context, userID string, now time.Time) (*ManagedUser, error)
	RevokeUserSessions(ctx context.Context, userID string, now time.Time) error
}

type AdminService struct {
	Repository AdminRepository
	Clock      func() time.Time
}

type CreateInitialAdminInput struct {
	Username        string
	DisplayName     string
	Password        string
	ConfirmPassword string
}

type CreateManagedUserInput struct {
	Username        string
	DisplayName     string
	Role            string
	Password        string
	ConfirmPassword string
}

type EnsureDefaultAdminInput struct {
	Username    string
	DisplayName string
	Password    string
}

type UpdateManagedUserInput struct {
	CurrentAdminUserID string
	UserID             string
	DisplayName        string
	Role               string
	Password           string
	ConfirmPassword    string
}

type DisableManagedUserInput struct {
	CurrentAdminUserID string
	UserID             string
}

func (s AdminService) CreateInitialAdmin(ctx context.Context, input CreateInitialAdminInput) (*LoginResult, *AuthFailure, error) {
	username := strings.TrimSpace(input.Username)
	displayName := strings.TrimSpace(input.DisplayName)
	fieldErrors := map[string]string{}

	if username == "" {
		fieldErrors["username"] = "required"
	} else if !usernamePattern.MatchString(username) {
		fieldErrors["username"] = "invalid_format"
	}
	if input.Password == "" {
		fieldErrors["password"] = "required"
	} else if len(input.Password) < 8 {
		fieldErrors["password"] = "too_short"
	}
	if input.Password != "" && input.ConfirmPassword == "" {
		fieldErrors["confirmPassword"] = "required"
	} else if input.Password != "" && input.ConfirmPassword != "" && input.Password != input.ConfirmPassword {
		fieldErrors["confirmPassword"] = "mismatch"
	}
	if len(fieldErrors) > 0 {
		return nil, &AuthFailure{FieldErrors: fieldErrors}, nil
	}

	activeUsers, err := s.Repository.CountActiveUsers(ctx)
	if err != nil {
		return nil, nil, err
	}
	if activeUsers > 0 {
		return nil, &AuthFailure{Form: "admin_already_exists"}, nil
	}

	passwordHash, err := HashAccessPassword(input.Password)
	if err != nil {
		return nil, nil, err
	}

	now := s.now()
	var displayNamePtr *string
	if displayName != "" {
		displayNamePtr = &displayName
	}

	user, err := s.Repository.CreateUser(ctx, CreateUserInput{
		Username:              username,
		DisplayName:           displayNamePtr,
		Role:                  RoleAdmin,
		PasswordHash:          passwordHash,
		PasswordHashAlgorithm: PasswordHashAlgorithm,
		Now:                   now,
	})
	if err != nil {
		return nil, nil, err
	}

	result, err := LoginService{Repository: s.Repository, Clock: s.Clock}.createSessionForUser(ctx, user)
	return result, nil, err
}

func (s AdminService) EnsureDefaultAdmin(ctx context.Context, input EnsureDefaultAdminInput) error {
	username := strings.TrimSpace(input.Username)
	displayName := strings.TrimSpace(input.DisplayName)
	password := input.Password
	if username == "" || !usernamePattern.MatchString(username) {
		return errors.New("invalid default admin username")
	}
	if len(password) < 8 {
		return errors.New("default admin password is too short")
	}
	if displayName == "" {
		displayName = username
	}

	passwordHash, err := HashAccessPassword(password)
	if err != nil {
		return err
	}

	now := s.now()
	displayNamePtr := &displayName
	user, err := s.Repository.GetActiveUserByUsername(ctx, username)
	if err != nil {
		return err
	}
	if user == nil {
		_, err := s.Repository.CreateUser(ctx, CreateUserInput{
			Username:              username,
			DisplayName:           displayNamePtr,
			Role:                  RoleAdmin,
			PasswordHash:          passwordHash,
			PasswordHashAlgorithm: PasswordHashAlgorithm,
			Now:                   now,
		})
		return err
	}

	if _, err := s.Repository.UpdateUser(ctx, UpdateUserInput{
		UserID:      user.ID,
		DisplayName: displayNamePtr,
		Role:        RoleAdmin,
		Now:         now,
	}); err != nil {
		return err
	}

	return s.Repository.UpdateUserPassword(ctx, UpdateUserPasswordInput{
		UserID:                user.ID,
		PasswordHash:          passwordHash,
		PasswordHashAlgorithm: PasswordHashAlgorithm,
		Now:                   now,
	})
}

func (s AdminService) ListManagedUsers(ctx context.Context) ([]ManagedUser, error) {
	users, err := s.Repository.ListUsers(ctx)
	if err != nil {
		return nil, err
	}
	if users == nil {
		return []ManagedUser{}, nil
	}
	return users, nil
}

func (s AdminService) CreateManagedUser(ctx context.Context, input CreateManagedUserInput) (*ManagedUser, *AuthFailure, error) {
	username := strings.TrimSpace(input.Username)
	displayName := strings.TrimSpace(input.DisplayName)
	role := normalizeRole(input.Role)
	fieldErrors := map[string]string{}

	if username == "" {
		fieldErrors["username"] = "required"
	} else if !usernamePattern.MatchString(username) {
		fieldErrors["username"] = "invalid_format"
	}
	if role == "" {
		fieldErrors["role"] = "invalid_role"
	}
	validateRequiredPassword(fieldErrors, input.Password, input.ConfirmPassword)
	if len(fieldErrors) > 0 {
		return nil, &AuthFailure{FieldErrors: fieldErrors}, nil
	}

	passwordHash, err := HashAccessPassword(input.Password)
	if err != nil {
		return nil, nil, err
	}

	if displayName == "" {
		displayName = username
	}
	user, err := s.Repository.CreateUser(ctx, CreateUserInput{
		Username:              username,
		DisplayName:           &displayName,
		Role:                  role,
		PasswordHash:          passwordHash,
		PasswordHashAlgorithm: PasswordHashAlgorithm,
		Now:                   s.now(),
	})
	if err != nil {
		if errors.Is(err, ErrDuplicateUsername) {
			return nil, &AuthFailure{FieldErrors: map[string]string{"username": "duplicate"}}, nil
		}
		return nil, nil, err
	}

	managed, err := s.Repository.GetAnyUserByID(ctx, user.ID)
	return managed, nil, err
}

func (s AdminService) UpdateManagedUser(ctx context.Context, input UpdateManagedUserInput) (*ManagedUser, *AuthFailure, error) {
	role := normalizeRole(input.Role)
	fieldErrors := map[string]string{}

	if strings.TrimSpace(input.UserID) == "" {
		fieldErrors["userId"] = "required"
	}
	if role == "" {
		fieldErrors["role"] = "invalid_role"
	}
	if input.Password != "" || input.ConfirmPassword != "" {
		validateOptionalPassword(fieldErrors, input.Password, input.ConfirmPassword)
	}
	if len(fieldErrors) > 0 {
		return nil, &AuthFailure{FieldErrors: fieldErrors}, nil
	}

	target, err := s.Repository.GetAnyUserByID(ctx, input.UserID)
	if err != nil {
		return nil, nil, err
	}
	if target == nil || target.DisabledAtIso != nil {
		return nil, &AuthFailure{Form: "user_not_found"}, nil
	}
	if target.ID == input.CurrentAdminUserID && role != RoleAdmin {
		return nil, &AuthFailure{FieldErrors: map[string]string{"role": "cannot_change_self_role"}}, nil
	}
	if target.Role == RoleAdmin && role != RoleAdmin {
		if ok, err := s.canRemoveAdminRole(ctx); err != nil {
			return nil, nil, err
		} else if !ok {
			return nil, &AuthFailure{FieldErrors: map[string]string{"role": "last_admin"}}, nil
		}
	}

	displayName := strings.TrimSpace(input.DisplayName)
	var displayNamePtr *string
	if displayName != "" {
		displayNamePtr = &displayName
	}

	now := s.now()
	updated, err := s.Repository.UpdateUser(ctx, UpdateUserInput{
		UserID:      input.UserID,
		DisplayName: displayNamePtr,
		Role:        role,
		Now:         now,
	})
	if err != nil {
		return nil, nil, err
	}
	if updated == nil {
		return nil, &AuthFailure{Form: "user_not_found"}, nil
	}

	if input.Password != "" {
		passwordHash, err := HashAccessPassword(input.Password)
		if err != nil {
			return nil, nil, err
		}
		if err := s.Repository.UpdateUserPassword(ctx, UpdateUserPasswordInput{
			UserID:                input.UserID,
			PasswordHash:          passwordHash,
			PasswordHashAlgorithm: PasswordHashAlgorithm,
			Now:                   now,
		}); err != nil {
			return nil, nil, err
		}
		if err := s.Repository.RevokeUserSessions(ctx, input.UserID, now); err != nil {
			return nil, nil, err
		}
	}

	return updated, nil, nil
}

func (s AdminService) DisableManagedUser(ctx context.Context, input DisableManagedUserInput) (*ManagedUser, *AuthFailure, error) {
	userID := strings.TrimSpace(input.UserID)
	if userID == "" {
		return nil, &AuthFailure{FieldErrors: map[string]string{"userId": "required"}}, nil
	}
	if userID == input.CurrentAdminUserID {
		return nil, &AuthFailure{Form: "cannot_disable_self"}, nil
	}

	target, err := s.Repository.GetAnyUserByID(ctx, userID)
	if err != nil {
		return nil, nil, err
	}
	if target == nil || target.DisabledAtIso != nil {
		return nil, &AuthFailure{Form: "user_not_found"}, nil
	}
	if target.Role == RoleAdmin {
		if ok, err := s.canRemoveAdminRole(ctx); err != nil {
			return nil, nil, err
		} else if !ok {
			return nil, &AuthFailure{Form: "last_admin"}, nil
		}
	}

	now := s.now()
	disabled, err := s.Repository.DisableUser(ctx, userID, now)
	if err != nil {
		return nil, nil, err
	}
	if err := s.Repository.RevokeUserSessions(ctx, userID, now); err != nil {
		return nil, nil, err
	}
	return disabled, nil, nil
}

func (s AdminService) NeedsInitialAdmin(ctx context.Context) (bool, error) {
	activeUsers, err := s.Repository.CountActiveUsers(ctx)
	if err != nil {
		return false, err
	}

	return activeUsers == 0, nil
}

func normalizeRole(role string) Role {
	switch Role(strings.TrimSpace(role)) {
	case RoleAdmin:
		return RoleAdmin
	case RoleUser:
		return RoleUser
	default:
		return ""
	}
}

func validateRequiredPassword(fieldErrors map[string]string, password string, confirmPassword string) {
	if password == "" {
		fieldErrors["password"] = "required"
	} else if len(password) < 8 {
		fieldErrors["password"] = "too_short"
	}
	if password != "" && confirmPassword == "" {
		fieldErrors["confirmPassword"] = "required"
	} else if password != "" && confirmPassword != "" && password != confirmPassword {
		fieldErrors["confirmPassword"] = "mismatch"
	}
}

func validateOptionalPassword(fieldErrors map[string]string, password string, confirmPassword string) {
	if password == "" {
		fieldErrors["password"] = "required"
	} else if len(password) < 8 {
		fieldErrors["password"] = "too_short"
	}
	if password != "" && confirmPassword == "" {
		fieldErrors["confirmPassword"] = "required"
	} else if password != "" && confirmPassword != "" && password != confirmPassword {
		fieldErrors["confirmPassword"] = "mismatch"
	}
}

func (s AdminService) canRemoveAdminRole(ctx context.Context) (bool, error) {
	activeAdmins, err := s.Repository.CountActiveAdmins(ctx)
	if err != nil {
		return false, err
	}
	return activeAdmins > 1, nil
}

func (s AdminService) now() time.Time {
	if s.Clock != nil {
		return s.Clock().UTC()
	}

	return time.Now().UTC()
}
