package main

import (
	"database/sql"
)

var db *sql.DB

func initDB(db *sql.DB) error {
	createTextsTable := `
	CREATE TABLE IF NOT EXISTS texts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL,
		language TEXT NOT NULL,
		title TEXT NOT NULL,
		content TEXT NOT NULL,
		status TEXT DEFAULT 'unread',
		add_date DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	createVocabularyTable := `
	CREATE TABLE IF NOT EXISTS vocabulary (
		user_id TEXT NOT NULL,
		language TEXT NOT NULL,
		word TEXT NOT NULL,
		status TEXT NOT NULL,
		update_date DATETIME DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (user_id, language, word)
	);`

	createTranscriptionsTable := `
	CREATE TABLE IF NOT EXISTS transcriptions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		url TEXT NOT NULL,
		audio_path TEXT,
		status TEXT DEFAULT 'pending',
		title TEXT DEFAULT 'Vidéo YouTube',
		add_date DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	createTranslationsTable := `
	CREATE TABLE IF NOT EXISTS translations (
		user_id TEXT NOT NULL,
		language TEXT NOT NULL,
		word TEXT NOT NULL,
		target_lang TEXT NOT NULL,
		translation TEXT DEFAULT '',
		notes TEXT DEFAULT '',
		update_date DATETIME DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (user_id, language, word, target_lang)
	);`

	if _, err := db.Exec(createTextsTable); err != nil {
		return err
	}
	if _, err := db.Exec(createVocabularyTable); err != nil {
		return err
	}
	if _, err := db.Exec(createTranscriptionsTable); err != nil {
		return err
	}
	if _, err := db.Exec(createTranslationsTable); err != nil {
		return err
	}
	
	// Migration rapide pour ajouter l'audio_url sur les textes si la colonne manque
	_, _ = db.Exec("ALTER TABLE texts ADD COLUMN audio_url TEXT DEFAULT ''")
	_, _ = db.Exec("ALTER TABLE texts ADD COLUMN segments_json TEXT DEFAULT ''")

	return nil
}
