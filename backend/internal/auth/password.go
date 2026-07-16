package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"

	"golang.org/x/crypto/scrypt"
)

const (
	scryptN   = 16384
	scryptR   = 8
	scryptP   = 1
	keyBytes  = 64
	saltBytes = 16
)

func HashAccessPassword(password string) (string, error) {
	salt := make([]byte, saltBytes)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	digest, err := scrypt.Key([]byte(password), salt, scryptN, scryptR, scryptP, keyBytes)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf(
		"scrypt:v1:%d:%d:%d:%s:%s",
		scryptN,
		scryptR,
		scryptP,
		base64.RawURLEncoding.EncodeToString(salt),
		base64.RawURLEncoding.EncodeToString(digest),
	), nil
}

func VerifyAccessPassword(password string, storedHash string) bool {
	parts := strings.Split(storedHash, ":")
	if len(parts) != 7 {
		return false
	}

	algorithm, version := parts[0], parts[1]
	if algorithm != "scrypt" || version != "v1" || parts[5] == "" || parts[6] == "" {
		return false
	}

	n, err := strconv.Atoi(parts[2])
	if err != nil || n <= 1 {
		return false
	}
	r, err := strconv.Atoi(parts[3])
	if err != nil || r <= 0 {
		return false
	}
	p, err := strconv.Atoi(parts[4])
	if err != nil || p <= 0 {
		return false
	}

	salt, err := base64.RawURLEncoding.DecodeString(parts[5])
	if err != nil {
		return false
	}
	expected, err := base64.RawURLEncoding.DecodeString(parts[6])
	if err != nil || len(expected) == 0 {
		return false
	}

	actual, err := scrypt.Key([]byte(password), salt, n, r, p, len(expected))
	if err != nil {
		return false
	}

	return subtle.ConstantTimeCompare(actual, expected) == 1
}
