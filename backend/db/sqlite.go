package db

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"matalabs-backend/models"
	_ "modernc.org/sqlite"
)

type DB struct {
	conn *sql.DB
}

// InitDB initializes SQLite with WAL mode enabled and runs migrations
func InitDB(dbPath string) (*DB, error) {
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create db directory: %w", err)
	}

	// modernc.org/sqlite connection string with pragmatic concurrency settings
	dsn := fmt.Sprintf("%s?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_pragma=synchronous(NORMAL)", dbPath)
	conn, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite: %w", err)
	}

	conn.SetMaxOpenConns(1) // SQLite single-writer optimization
	conn.SetMaxIdleConns(1)

	if err := conn.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping sqlite: %w", err)
	}

	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		email TEXT NOT NULL UNIQUE,
		name TEXT NOT NULL,
		picture TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS test_results (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		candidate_name TEXT,
		candidate_contact TEXT,
		target_score REAL NOT NULL,
		overall_score REAL NOT NULL,
		listening_score REAL NOT NULL,
		reading_score REAL NOT NULL,
		writing_score REAL NOT NULL,
		speaking_score REAL NOT NULL,
		weakest_skill TEXT NOT NULL,
		what_to_practise TEXT NOT NULL,
		writing_json TEXT NOT NULL,
		speaking_json TEXT NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);

	CREATE UNIQUE INDEX IF NOT EXISTS idx_test_results_user ON test_results(user_id);
	`

	if _, err := conn.Exec(schema); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	// Ensure idx_test_results_user is strictly UNIQUE (rebuilding if previously created as non-unique)
	uniqueIndexMigration := `
	DELETE FROM test_results WHERE rowid NOT IN (
		SELECT MAX(rowid) FROM test_results GROUP BY user_id
	);
	DROP INDEX IF EXISTS idx_test_results_user;
	CREATE UNIQUE INDEX IF NOT EXISTS idx_test_results_user ON test_results(user_id);
	`
	if _, err := conn.Exec(uniqueIndexMigration); err != nil {
		log.Printf("[DB] Note on unique index migration: %v", err)
	}

	log.Printf("[DB] SQLite database initialized at %s with WAL mode", dbPath)
	return &DB{conn: conn}, nil
}

func (d *DB) Close() error {
	return d.conn.Close()
}

// UpsertUser inserts or updates user from Google profile
func (d *DB) UpsertUser(u *models.User) error {
	query := `
	INSERT INTO users (id, email, name, picture, created_at)
	VALUES (?, ?, ?, ?, ?)
	ON CONFLICT(id) DO UPDATE SET
		name=excluded.name,
		picture=excluded.picture;
	`
	_, err := d.conn.Exec(query, u.ID, u.Email, u.Name, u.Picture, u.CreatedAt)
	return err
}

// GetUser retrieves user by Google ID
func (d *DB) GetUser(id string) (*models.User, error) {
	row := d.conn.QueryRow("SELECT id, email, name, picture, created_at FROM users WHERE id = ?", id)
	var u models.User
	var createdAt time.Time
	if err := row.Scan(&u.ID, &u.Email, &u.Name, &u.Picture, &createdAt); err != nil {
		return nil, err
	}
	u.CreatedAt = createdAt
	return &u, nil
}

// SaveTestResult persists or updates the consolidated result for a candidate
func (d *DB) SaveTestResult(res *models.TestResultResponse, userID, contact string) error {
	wJSON, err := json.Marshal(res.WritingDetails)
	if err != nil {
		return err
	}
	sJSON, err := json.Marshal(res.SpeakingDetails)
	if err != nil {
		return err
	}

	query := `
	INSERT INTO test_results (
		id, user_id, candidate_name, candidate_contact,
		target_score, overall_score, listening_score, reading_score,
		writing_score, speaking_score, weakest_skill, what_to_practise,
		writing_json, speaking_json, created_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	ON CONFLICT(user_id) DO UPDATE SET
		id=excluded.id,
		candidate_name=excluded.candidate_name,
		candidate_contact=excluded.candidate_contact,
		target_score=excluded.target_score,
		overall_score=excluded.overall_score,
		listening_score=excluded.listening_score,
		reading_score=excluded.reading_score,
		writing_score=excluded.writing_score,
		speaking_score=excluded.speaking_score,
		weakest_skill=excluded.weakest_skill,
		what_to_practise=excluded.what_to_practise,
		writing_json=excluded.writing_json,
		speaking_json=excluded.speaking_json,
		created_at=excluded.created_at;
	`
	_, err = d.conn.Exec(query,
		res.ID, userID, res.CandidateName, contact,
		res.TargetScore, res.OverallScore, res.ListeningScore, res.ReadingScore,
		res.WritingScore, res.SpeakingScore, res.WeakestSkill, res.WhatToPractise,
		string(wJSON), string(sJSON), res.CreatedAt,
	)
	return err
}

// GetTestResult retrieves a specific test result by ID
func (d *DB) GetTestResult(id string) (*models.TestResultResponse, error) {
	query := `
	SELECT id, candidate_name, target_score, overall_score,
	       listening_score, reading_score, writing_score, speaking_score,
	       weakest_skill, what_to_practise, writing_json, speaking_json, created_at
	FROM test_results WHERE id = ?;
	`
	row := d.conn.QueryRow(query, id)

	var res models.TestResultResponse
	var wJSON, sJSON string
	var createdAt time.Time

	err := row.Scan(
		&res.ID, &res.CandidateName, &res.TargetScore, &res.OverallScore,
		&res.ListeningScore, &res.ReadingScore, &res.WritingScore, &res.SpeakingScore,
		&res.WeakestSkill, &res.WhatToPractise, &wJSON, &sJSON, &createdAt,
	)
	if err != nil {
		return nil, err
	}

	res.CreatedAt = createdAt
	_ = json.Unmarshal([]byte(wJSON), &res.WritingDetails)
	_ = json.Unmarshal([]byte(sJSON), &res.SpeakingDetails)

	return &res, nil
}
