package config

import "testing"

func TestLoadUsesDefaults(t *testing.T) {
	t.Setenv("API_ADDR", "")
	t.Setenv("DATA_DIR", "")
	t.Setenv("SQLITE_PATH", "")

	cfg := Load()

	if cfg.Addr != "127.0.0.1:8080" {
		t.Fatalf("unexpected default addr %q", cfg.Addr)
	}
	if cfg.DataDir != "./data" {
		t.Fatalf("unexpected default data dir %q", cfg.DataDir)
	}
	if cfg.DBPath != "./data/app.sqlite" {
		t.Fatalf("unexpected default db path %q", cfg.DBPath)
	}
}

func TestLoadReadsEnvironment(t *testing.T) {
	t.Setenv("API_ADDR", "127.0.0.1:18080")
	t.Setenv("DATA_DIR", "D:/data")
	t.Setenv("SQLITE_PATH", "D:/data/custom.sqlite")

	cfg := Load()

	if cfg.Addr != "127.0.0.1:18080" {
		t.Fatalf("unexpected env addr %q", cfg.Addr)
	}
	if cfg.DataDir != "D:/data" {
		t.Fatalf("unexpected env data dir %q", cfg.DataDir)
	}
	if cfg.DBPath != "D:/data/custom.sqlite" {
		t.Fatalf("unexpected env db path %q", cfg.DBPath)
	}
}
