package settings

import (
	"context"
	"testing"
	"time"
)

func TestServiceSavesAndLoadsProfile(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 7, 15, 0, 0, 0, 0, time.UTC)
	repository := &fakeRepository{}
	service := Service{
		Repository: repository,
		Clock: func() time.Time {
			return now
		},
	}

	profile, failure, err := service.SaveProfile(context.Background(), "user-1", ProfileInput{
		Nickname:      " Admin ",
		HeightCm:      "178.5",
		ReminderEmail: "admin@example.com",
	})
	if err != nil {
		t.Fatalf("save profile: %v", err)
	}
	if failure != nil {
		t.Fatalf("expected no failure, got %#v", failure)
	}
	if profile.Nickname != "Admin" || profile.HeightCm == nil || *profile.HeightCm != 178.5 || profile.ReminderEmail != "admin@example.com" {
		t.Fatalf("unexpected profile %#v", profile)
	}
	if repository.saved == nil || repository.saved.UserID != "user-1" || repository.saved.Type != profileType || repository.saved.Key != profileKey {
		t.Fatalf("unexpected save input %#v", repository.saved)
	}

	loaded, err := service.GetProfile(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("get profile: %v", err)
	}
	if loaded.Nickname != "Admin" {
		t.Fatalf("unexpected loaded profile %#v", loaded)
	}
}

func TestServiceRejectsInvalidProfile(t *testing.T) {
	t.Parallel()

	profile, failure, err := Service{Repository: &fakeRepository{}}.SaveProfile(context.Background(), "user-1", ProfileInput{
		HeightCm:      "-1",
		ReminderEmail: "not-email",
	})
	if err != nil {
		t.Fatalf("save profile: %v", err)
	}
	if profile != nil || failure == nil || failure.FieldErrors["heightCm"] != "range" || failure.FieldErrors["reminderEmail"] != "invalid_email" {
		t.Fatalf("unexpected validation result profile=%#v failure=%#v", profile, failure)
	}
}

func TestServiceSavesTrendThresholdsAndReminderRules(t *testing.T) {
	t.Parallel()

	repository := &fakeRepository{}
	service := Service{Repository: repository}

	thresholds, thresholdFailure, err := service.SaveTrendThresholds(context.Background(), "user-1", TrendThresholdInput{
		MinimumDays:    "14",
		MinimumRecords: "5",
	})
	if err != nil {
		t.Fatalf("save thresholds: %v", err)
	}
	if thresholdFailure != nil || thresholds.MinimumDays != 14 || thresholds.MinimumRecords != 5 {
		t.Fatalf("unexpected thresholds=%#v failure=%#v", thresholds, thresholdFailure)
	}

	rules, ruleFailure, err := service.SaveReminderRules(context.Background(), "user-1", ReminderRuleInput{
		ReminderTime: "21:15",
		InAppEnabled: true,
		EmailEnabled: true,
	})
	if err != nil {
		t.Fatalf("save reminder rules: %v", err)
	}
	if ruleFailure != nil || rules.ReminderTime != "21:15" || !rules.InAppEnabled || !rules.EmailEnabled {
		t.Fatalf("unexpected rules=%#v failure=%#v", rules, ruleFailure)
	}
}

func TestServiceRejectsInvalidPreferences(t *testing.T) {
	t.Parallel()

	thresholds, thresholdFailure, err := Service{Repository: &fakeRepository{}}.SaveTrendThresholds(context.Background(), "user-1", TrendThresholdInput{
		MinimumDays:    "6",
		MinimumRecords: "2",
	})
	if err != nil {
		t.Fatalf("save thresholds: %v", err)
	}
	if thresholds != nil || thresholdFailure == nil || thresholdFailure.FieldErrors["minimumDays"] != "range" || thresholdFailure.FieldErrors["minimumRecords"] != "range" {
		t.Fatalf("unexpected threshold validation thresholds=%#v failure=%#v", thresholds, thresholdFailure)
	}

	rules, ruleFailure, err := Service{Repository: &fakeRepository{}}.SaveReminderRules(context.Background(), "user-1", ReminderRuleInput{
		ReminderTime: "99:99",
	})
	if err != nil {
		t.Fatalf("save reminder rules: %v", err)
	}
	if rules != nil || ruleFailure == nil || ruleFailure.FieldErrors["reminderTime"] != "invalid_time" {
		t.Fatalf("unexpected rule validation rules=%#v failure=%#v", rules, ruleFailure)
	}
}

func TestServiceSavesSmtpConfigAndKeepsExistingPassword(t *testing.T) {
	t.Parallel()

	repository := &fakeRepository{}
	service := Service{Repository: repository}

	first, failure, err := service.SaveSmtpConfig(context.Background(), "global", SmtpConfigInput{
		Host:       "smtp.example.com",
		Port:       "465",
		Username:   "mailer",
		Password:   "secret",
		FromEmail:  "from@example.com",
		SecureMode: "ssl",
	})
	if err != nil {
		t.Fatalf("save smtp config: %v", err)
	}
	if failure != nil || first == nil || !first.PasswordConfigured {
		t.Fatalf("unexpected first config=%#v failure=%#v", first, failure)
	}

	second, failure, err := service.SaveSmtpConfig(context.Background(), "global", SmtpConfigInput{
		Host:       "smtp.example.com",
		Port:       "587",
		Username:   "mailer",
		Password:   "",
		FromEmail:  "from@example.com",
		SecureMode: "starttls",
	})
	if err != nil {
		t.Fatalf("update smtp config: %v", err)
	}
	if failure != nil || second == nil || !second.PasswordConfigured || second.Port != 587 || second.SecureMode != SmtpSecureStartTLS {
		t.Fatalf("unexpected second config=%#v failure=%#v", second, failure)
	}

	secret, err := service.getSmtpSecretConfig(context.Background(), "global")
	if err != nil {
		t.Fatalf("get smtp secret config: %v", err)
	}
	if secret.Password != "secret" {
		t.Fatalf("expected retained password, got %q", secret.Password)
	}
}

func TestServiceRejectsInvalidSmtpConfig(t *testing.T) {
	t.Parallel()

	config, failure, err := Service{Repository: &fakeRepository{}}.SaveSmtpConfig(context.Background(), "global", SmtpConfigInput{
		Port:       "70000",
		FromEmail:  "bad",
		SecureMode: "unknown",
	})
	if err != nil {
		t.Fatalf("save smtp config: %v", err)
	}
	if config != nil || failure == nil || failure.FieldErrors["host"] != "required" || failure.FieldErrors["port"] != "range" || failure.FieldErrors["fromEmail"] != "invalid_email" {
		t.Fatalf("unexpected smtp validation config=%#v failure=%#v", config, failure)
	}
}

func TestServiceSendsTestEmailWithConfiguredSmtp(t *testing.T) {
	t.Parallel()

	sender := &fakeMailSender{}
	service := Service{Repository: &fakeRepository{}, MailSender: sender}
	_, failure, err := service.SaveSmtpConfig(context.Background(), "global", SmtpConfigInput{
		Host:       "smtp.example.com",
		Port:       "465",
		Username:   "mailer",
		Password:   "secret",
		FromEmail:  "from@example.com",
		SecureMode: "ssl",
	})
	if err != nil || failure != nil {
		t.Fatalf("save smtp config err=%v failure=%#v", err, failure)
	}

	result, testFailure, err := service.SendTestEmail(context.Background(), "global", TestEmailInput{
		RecipientEmail: "to@example.com",
	})
	if err != nil {
		t.Fatalf("send test email: %v", err)
	}
	if testFailure != nil || result == nil || result.Message == "" {
		t.Fatalf("unexpected test result=%#v failure=%#v", result, testFailure)
	}
	if sender.recipientEmail != "to@example.com" || sender.config.Password != "secret" {
		t.Fatalf("unexpected sender state %#v", sender)
	}
}

func TestServiceRejectsTestEmailWithoutSmtpConfig(t *testing.T) {
	t.Parallel()

	result, failure, err := Service{Repository: &fakeRepository{}}.SendTestEmail(context.Background(), "global", TestEmailInput{
		RecipientEmail: "to@example.com",
	})
	if err != nil {
		t.Fatalf("send test email: %v", err)
	}
	if result != nil || failure == nil || failure.Form != "smtp_config_required" {
		t.Fatalf("unexpected test result=%#v failure=%#v", result, failure)
	}
}

type fakeMailSender struct {
	config         SmtpSecretConfig
	recipientEmail string
	subject        string
	text           string
	err            error
}

func (s *fakeMailSender) Send(_ context.Context, config SmtpSecretConfig, recipientEmail string, subject string, text string) error {
	s.config = config
	s.recipientEmail = recipientEmail
	s.subject = subject
	s.text = text
	return s.err
}

type fakeRepository struct {
	settings map[string]*Setting
	saved    *SaveSettingInput
}

func (r *fakeRepository) GetSetting(_ context.Context, _ string, settingType string, key string) (*Setting, error) {
	return r.settings[settingType+"/"+key], nil
}

func (r *fakeRepository) SaveSetting(_ context.Context, input SaveSettingInput) (*Setting, error) {
	if r.settings == nil {
		r.settings = map[string]*Setting{}
	}
	r.saved = &input
	setting := &Setting{
		ID:        "setting-1",
		UserID:    input.UserID,
		Type:      input.Type,
		Key:       input.Key,
		ValueJSON: input.ValueJSON,
	}
	r.settings[input.Type+"/"+input.Key] = setting
	return setting, nil
}
