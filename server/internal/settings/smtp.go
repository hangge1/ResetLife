package settings

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/smtp"
	"strconv"
	"strings"
	"time"
)

type SmtpSecureMode string

const (
	SmtpSecureNone     SmtpSecureMode = "none"
	SmtpSecureSSL      SmtpSecureMode = "ssl"
	SmtpSecureStartTLS SmtpSecureMode = "starttls"
)

type SmtpConfig struct {
	Host               string         `json:"host"`
	Port               int            `json:"port"`
	Username           string         `json:"username"`
	FromEmail          string         `json:"fromEmail"`
	SecureMode         SmtpSecureMode `json:"secureMode"`
	PasswordConfigured bool           `json:"passwordConfigured"`
}

type SmtpSecretConfig struct {
	SmtpConfig
	Password string `json:"password"`
}

type SmtpConfigInput struct {
	Host       string `json:"host"`
	Port       string `json:"port"`
	Username   string `json:"username"`
	Password   string `json:"password"`
	FromEmail  string `json:"fromEmail"`
	SecureMode string `json:"secureMode"`
}

type TestEmailInput struct {
	RecipientEmail string `json:"recipientEmail"`
}

type TestEmailResult struct {
	Message string `json:"message"`
}

type MailSender interface {
	Send(ctx context.Context, config SmtpSecretConfig, recipientEmail string, subject string, text string) error
}

type DefaultMailSender struct{}

const (
	smtpType        = "smtp"
	smtpConfigKey   = "config"
	smtpLastTestKey = "last-test"
)

func (s Service) GetSmtpConfig(ctx context.Context, userID string) (*SmtpConfig, error) {
	secret, err := s.getSmtpSecretConfig(ctx, userID)
	if err != nil {
		return nil, err
	}

	return publicSmtpConfig(secret), nil
}

func (s Service) SaveSmtpConfig(ctx context.Context, userID string, input SmtpConfigInput) (*SmtpConfig, *ValidationFailure, error) {
	parsed, failure := parseSmtpConfigInput(input)
	if failure != nil {
		return nil, failure, nil
	}

	existing, err := s.getSmtpSecretConfig(ctx, userID)
	if err != nil {
		return nil, nil, err
	}
	if parsed.Password == "" && existing != nil {
		parsed.Password = existing.Password
	}
	parsed.PasswordConfigured = parsed.Password != ""

	valueJSON, err := json.Marshal(parsed)
	if err != nil {
		return nil, nil, err
	}

	saved, err := s.Repository.SaveSetting(ctx, SaveSettingInput{
		UserID:    userID,
		Type:      smtpType,
		Key:       smtpConfigKey,
		ValueJSON: string(valueJSON),
		Now:       s.now().UTC(),
	})
	if err != nil {
		return nil, nil, err
	}

	return publicSmtpConfig(normalizeSmtpSecretConfig(saved.ValueJSON)), nil, nil
}

func (s Service) ClearSmtpConfig(ctx context.Context, userID string) (*SmtpConfig, error) {
	empty := defaultSmtpSecretConfig()
	valueJSON, err := json.Marshal(empty)
	if err != nil {
		return nil, err
	}

	saved, err := s.Repository.SaveSetting(ctx, SaveSettingInput{
		UserID:    userID,
		Type:      smtpType,
		Key:       smtpConfigKey,
		ValueJSON: string(valueJSON),
		Now:       s.now().UTC(),
	})
	if err != nil {
		return nil, err
	}

	return publicSmtpConfig(normalizeSmtpSecretConfig(saved.ValueJSON)), nil
}

func (s Service) SendTestEmail(ctx context.Context, userID string, input TestEmailInput) (*TestEmailResult, *ValidationFailure, error) {
	recipientEmail := strings.TrimSpace(input.RecipientEmail)
	if recipientEmail == "" || !emailPattern.MatchString(recipientEmail) {
		return nil, &ValidationFailure{FieldErrors: map[string]string{"recipientEmail": "invalid_email"}}, nil
	}

	config, err := s.getSmtpSecretConfig(ctx, userID)
	if err != nil {
		return nil, nil, err
	}
	if config == nil || config.Host == "" || config.FromEmail == "" {
		return nil, &ValidationFailure{Form: "smtp_config_required"}, nil
	}

	sender := s.MailSender
	if sender == nil {
		sender = DefaultMailSender{}
	}

	if err := sender.Send(ctx, *config, recipientEmail, "Slimming Assistant test email", "This is a test email from Slimming Assistant."); err != nil {
		message := fmt.Sprintf("Test email failed: %s", err.Error())
		if saveErr := s.saveSmtpTestStatus(ctx, userID, "failure", message); saveErr != nil {
			return nil, nil, saveErr
		}
		return nil, &ValidationFailure{Form: message}, nil
	}

	message := "Test email sent"
	if err := s.saveSmtpTestStatus(ctx, userID, "success", message); err != nil {
		return nil, nil, err
	}
	return &TestEmailResult{Message: message}, nil, nil
}

func (s Service) getSmtpSecretConfig(ctx context.Context, userID string) (*SmtpSecretConfig, error) {
	setting, err := s.Repository.GetSetting(ctx, userID, smtpType, smtpConfigKey)
	if err != nil {
		return nil, err
	}
	if setting == nil {
		return defaultSmtpSecretConfig(), nil
	}

	return normalizeSmtpSecretConfig(setting.ValueJSON), nil
}

func (s Service) GetSmtpSecretConfig(ctx context.Context, userID string) (*SmtpSecretConfig, error) {
	return s.getSmtpSecretConfig(ctx, userID)
}

func (s Service) saveSmtpTestStatus(ctx context.Context, userID string, status string, message string) error {
	payload := map[string]string{
		"status":      status,
		"message":     message,
		"testedAtIso": s.now().UTC().Format(time.RFC3339),
	}
	valueJSON, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	_, err = s.Repository.SaveSetting(ctx, SaveSettingInput{
		UserID:    userID,
		Type:      smtpType,
		Key:       smtpLastTestKey,
		ValueJSON: string(valueJSON),
		Now:       s.now().UTC(),
	})
	return err
}

func parseSmtpConfigInput(input SmtpConfigInput) (*SmtpSecretConfig, *ValidationFailure) {
	fieldErrors := map[string]string{}
	host := strings.TrimSpace(input.Host)
	port, err := strconv.Atoi(strings.TrimSpace(input.Port))
	username := strings.TrimSpace(input.Username)
	password := input.Password
	fromEmail := strings.TrimSpace(input.FromEmail)
	secureMode := SmtpSecureMode(strings.TrimSpace(input.SecureMode))

	if host == "" {
		fieldErrors["host"] = "required"
	}
	if err != nil || port < 1 || port > 65535 {
		fieldErrors["port"] = "range"
	}
	if fromEmail == "" || !emailPattern.MatchString(fromEmail) {
		fieldErrors["fromEmail"] = "invalid_email"
	}
	if secureMode != SmtpSecureNone && secureMode != SmtpSecureSSL && secureMode != SmtpSecureStartTLS {
		fieldErrors["secureMode"] = "invalid_secure_mode"
	}
	if len(fieldErrors) > 0 {
		return nil, &ValidationFailure{FieldErrors: fieldErrors}
	}

	return &SmtpSecretConfig{
		SmtpConfig: SmtpConfig{
			Host:       host,
			Port:       port,
			Username:   username,
			FromEmail:  fromEmail,
			SecureMode: secureMode,
		},
		Password: password,
	}, nil
}

func normalizeSmtpSecretConfig(valueJSON string) *SmtpSecretConfig {
	var config SmtpSecretConfig
	if err := json.Unmarshal([]byte(valueJSON), &config); err != nil {
		return defaultSmtpSecretConfig()
	}
	if config.Port < 1 || config.Port > 65535 {
		config.Port = 465
	}
	if config.SecureMode != SmtpSecureNone && config.SecureMode != SmtpSecureSSL && config.SecureMode != SmtpSecureStartTLS {
		config.SecureMode = SmtpSecureSSL
	}
	config.PasswordConfigured = config.Password != ""
	return &config
}

func defaultSmtpSecretConfig() *SmtpSecretConfig {
	return &SmtpSecretConfig{
		SmtpConfig: SmtpConfig{
			Port:       465,
			SecureMode: SmtpSecureSSL,
		},
	}
}

func publicSmtpConfig(secret *SmtpSecretConfig) *SmtpConfig {
	if secret == nil {
		return &defaultSmtpSecretConfig().SmtpConfig
	}

	config := secret.SmtpConfig
	config.PasswordConfigured = secret.Password != ""
	return &config
}

func (DefaultMailSender) Send(ctx context.Context, config SmtpSecretConfig, recipientEmail string, subject string, text string) error {
	if strings.ContainsAny(config.FromEmail+recipientEmail, "\r\n") {
		return errors.New("invalid email header")
	}
	if strings.ContainsAny(subject, "\r\n") {
		return errors.New("invalid email subject")
	}

	address := net.JoinHostPort(config.Host, strconv.Itoa(config.Port))
	var conn net.Conn
	var err error
	if config.SecureMode == SmtpSecureSSL {
		dialer := tls.Dialer{Config: &tls.Config{ServerName: config.Host, MinVersion: tls.VersionTLS12}}
		conn, err = dialer.DialContext(ctx, "tcp", address)
	} else {
		dialer := net.Dialer{}
		conn, err = dialer.DialContext(ctx, "tcp", address)
	}
	if err != nil {
		return err
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, config.Host)
	if err != nil {
		return err
	}
	defer client.Close()

	if config.SecureMode == SmtpSecureStartTLS {
		if err := client.StartTLS(&tls.Config{ServerName: config.Host, MinVersion: tls.VersionTLS12}); err != nil {
			return err
		}
	}

	if config.Username != "" || config.Password != "" {
		if err := client.Auth(smtp.PlainAuth("", config.Username, config.Password, config.Host)); err != nil {
			return err
		}
	}

	if err := client.Mail(config.FromEmail); err != nil {
		return err
	}
	if err := client.Rcpt(recipientEmail); err != nil {
		return err
	}

	writer, err := client.Data()
	if err != nil {
		return err
	}
	message := strings.Join([]string{
		"From: " + config.FromEmail,
		"To: " + recipientEmail,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"",
		text,
	}, "\r\n")
	if _, err := writer.Write([]byte(message)); err != nil {
		_ = writer.Close()
		return err
	}
	if err := writer.Close(); err != nil {
		return err
	}

	return client.Quit()
}
