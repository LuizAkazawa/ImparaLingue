package main

import (
	"encoding/json"
	"net/http"
	"time"
)

// Structure des données JSON pour les mots
type WordData struct {
	UserID      string `json:"user_id"`
	Language    string `json:"language"`
	Word        string `json:"word"`
	Status      string `json:"status"`
	Translation string `json:"translation"`
	Notes       string `json:"notes"`
	TargetLang  string `json:"target_lang"`
}

// Handler pour GET et POST sur /api/words
func wordsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// GET : Récupérer tout le vocabulaire
	if r.Method == "GET" {
		userID := r.URL.Query().Get("user_id")
		lang := r.URL.Query().Get("language")
		targetLang := r.URL.Query().Get("target_lang")

		if targetLang == "" {
			targetLang = "fr" // fallback
		}

		query := `
		SELECT v.word, v.status, COALESCE(t.translation, ''), COALESCE(t.notes, '')
		FROM vocabulary v
		LEFT JOIN translations t ON v.user_id = t.user_id AND v.language = t.language AND v.word = t.word AND t.target_lang = ?
		WHERE v.user_id = ? AND v.language = ?
		`

		rows, err := db.Query(query, targetLang, userID, lang)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type WordResponse struct {
			Status      string `json:"status"`
			Translation string `json:"translation"`
			Notes       string `json:"notes"`
		}
		wordMap := make(map[string]WordResponse)

		for rows.Next() {
			var word, status, translation, notes string
			if err := rows.Scan(&word, &status, &translation, &notes); err != nil {
				continue
			}
			wordMap[word] = WordResponse{Status: status, Translation: translation, Notes: notes}
		}

		json.NewEncoder(w).Encode(wordMap)
		return
	}

	// POST : Sauvegarder ou mettre à jour un mot
	if r.Method == "POST" {
		var data WordData
		if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if data.TargetLang == "" {
			data.TargetLang = "fr"
		}

		// Requête "Upsert" pour le statut du mot
		queryVocab := `
		INSERT INTO vocabulary (user_id, language, word, status, update_date) 
		VALUES (?, ?, ?, ?, ?) 
		ON CONFLICT(user_id, language, word) DO UPDATE SET status=excluded.status, update_date=excluded.update_date;
		`
		_, err := db.Exec(queryVocab, data.UserID, data.Language, data.Word, data.Status, time.Now())
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Requête "Upsert" pour la traduction et les notes
		queryTrans := `
		INSERT INTO translations (user_id, language, word, target_lang, translation, notes, update_date) 
		VALUES (?, ?, ?, ?, ?, ?, ?) 
		ON CONFLICT(user_id, language, word, target_lang) DO UPDATE SET translation=excluded.translation, notes=excluded.notes, update_date=excluded.update_date;
		`
		_, err = db.Exec(queryTrans, data.UserID, data.Language, data.Word, data.TargetLang, data.Translation, data.Notes, time.Now())
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "Sauvegardé avec succès"})
		return
	}

	http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
}
