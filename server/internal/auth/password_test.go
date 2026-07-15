package auth

import "testing"

func TestVerifyAccessPasswordMatchesNodeScryptV1Hash(t *testing.T) {
	t.Parallel()

	hash := "scrypt:v1:16384:8:1:MDEyMzQ1Njc4OWFiY2RlZg:tjK03tRvEjqCcPwmgtddMkgjlXrk8U_b9rIvfeBMKCcxlckVogBtTKwjk3CpCcSQhX0X2CBkh7x8-hWN0EaASQ"

	if !VerifyAccessPassword("correct horse battery staple", hash) {
		t.Fatal("expected password to verify")
	}
	if VerifyAccessPassword("wrong password", hash) {
		t.Fatal("expected wrong password to fail")
	}
}

func TestHashAccessPasswordProducesVerifiableScryptV1Hash(t *testing.T) {
	t.Parallel()

	hash, err := HashAccessPassword("new admin password")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	if !VerifyAccessPassword("new admin password", hash) {
		t.Fatal("expected generated hash to verify")
	}
	if VerifyAccessPassword("wrong password", hash) {
		t.Fatal("expected wrong password to fail")
	}
}

func TestVerifyAccessPasswordRejectsInvalidHashes(t *testing.T) {
	t.Parallel()

	invalidHashes := []string{
		"",
		"scrypt:v1:16384:8:1:salt",
		"argon2:v1:16384:8:1:MDEyMzQ1Njc4OWFiY2RlZg:tjK03tRvEjqCcPwmgtddMkgjlXrk8U_b9rIvfeBMKCcxlckVogBtTKwjk3CpCcSQhX0X2CBkh7x8-hWN0EaASQ",
		"scrypt:v1:0:8:1:MDEyMzQ1Njc4OWFiY2RlZg:tjK03tRvEjqCcPwmgtddMkgjlXrk8U_b9rIvfeBMKCcxlckVogBtTKwjk3CpCcSQhX0X2CBkh7x8-hWN0EaASQ",
		"scrypt:v1:16384:8:1:!bad!:digest",
	}

	for _, hash := range invalidHashes {
		if VerifyAccessPassword("password", hash) {
			t.Fatalf("expected invalid hash %q to fail", hash)
		}
	}
}
