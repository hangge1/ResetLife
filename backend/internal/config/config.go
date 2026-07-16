package config

import "os"

type Config struct {
	Addr                  string
	DataDir               string
	DBPath                string
	StaticDir             string
	InternalReminderToken string
}

func Load() Config {
	dataDir := readEnv("DATA_DIR", "./data")

	return Config{
		Addr:                  readEnv("API_ADDR", "127.0.0.1:8080"),
		DataDir:               dataDir,
		DBPath:                readEnv("SQLITE_PATH", dataDir+"/app.sqlite"),
		StaticDir:             os.Getenv("STATIC_DIR"),
		InternalReminderToken: os.Getenv("INTERNAL_REMINDER_TOKEN"),
	}
}

func readEnv(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	return value
}
