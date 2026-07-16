package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"path/filepath"
	"regexp"
	"strings"
	"os"

	"github.com/ledongthuc/pdf"
)

type TextData struct {
	ID       int    `json:"id,omitempty"`
	UserID   string `json:"user_id"`
	Language string `json:"language"`
	Title    string `json:"title"`
	Content  string `json:"content"`
	Status       string `json:"status"`
	AudioURL     string `json:"audio_url"`
	SegmentsJSON string `json:"segments_json"`
}

func textsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method == "GET" {
		userID := r.URL.Query().Get("user_id")
		lang := r.URL.Query().Get("language")

		rows, err := db.Query("SELECT id, title, content, status, audio_url, segments_json FROM texts WHERE user_id = ? AND language = ? ORDER BY add_date DESC", userID, lang)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var texts []TextData
		for rows.Next() {
			var t TextData
			if err := rows.Scan(&t.ID, &t.Title, &t.Content, &t.Status, &t.AudioURL, &t.SegmentsJSON); err == nil {
				texts = append(texts, t)
			}
		}
		if texts == nil {
			texts = []TextData{}
		}
		json.NewEncoder(w).Encode(texts)
		return
	}

	if r.Method == "POST" {
		var data TextData
		if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if data.Title == "" || data.Content == "" {
			http.Error(w, "Le titre et le contenu sont requis", http.StatusBadRequest)
			return
		}

		status := "unread"
		if data.Status != "" {
			status = data.Status
		}

		result, err := db.Exec("INSERT INTO texts (user_id, language, title, content, status, audio_url, segments_json) VALUES (?, ?, ?, ?, ?, ?, ?)", data.UserID, data.Language, data.Title, data.Content, status, data.AudioURL, data.SegmentsJSON)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		id, _ := result.LastInsertId()
		data.ID = int(id)

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(data)
		return
	}

	if r.Method == "DELETE" {
		id := r.URL.Query().Get("id")
		if id == "" {
			http.Error(w, "ID requis", http.StatusBadRequest)
			return
		}

		// Récupérer l'audio_url pour supprimer le fichier si c'est un fichier local
		var audioURL string
		err := db.QueryRow("SELECT audio_url FROM texts WHERE id = ?", id).Scan(&audioURL)
		if err == nil && audioURL != "" {
			// Si c'est un fichier dans /downloads/, on le supprime (et le json aussi)
			if strings.HasPrefix(audioURL, "http://localhost:8080/downloads/") {
				fileName := strings.TrimPrefix(audioURL, "http://localhost:8080/downloads/")
				audioPath := filepath.Join(".", "downloads", fileName)
				os.Remove(audioPath)
				os.Remove(audioPath + ".json")
			}
		}

		_, err = db.Exec("DELETE FROM texts WHERE id = ?", id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method == "PUT" {
		var data TextData
		if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if data.ID == 0 || data.Title == "" {
			http.Error(w, "L'ID et le titre sont requis", http.StatusBadRequest)
			return
		}

		var err error
		if data.Content != "" {
			_, err = db.Exec("UPDATE texts SET title = ?, content = ?, segments_json = ? WHERE id = ?", data.Title, data.Content, data.SegmentsJSON, data.ID)
		} else {
			_, err = db.Exec("UPDATE texts SET title = ? WHERE id = ?", data.Title, data.ID)
		}

		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		return
	}

	http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
}

type TextStatusUpdate struct {
	ID       int    `json:"id"`
	UserID   string `json:"user_id"`
	Language string `json:"language"`
	Status   string `json:"status"`
}

func textStatusHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}
	var data TextStatusUpdate
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	_, err := db.Exec("UPDATE texts SET status = ? WHERE id = ? AND user_id = ? AND language = ?", data.Status, data.ID, data.UserID, data.Language)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func extractHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	r.ParseMultipartForm(10 << 20)

	file, handler, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Fichier manquant ou invalide", http.StatusBadRequest)
		return
	}
	defer file.Close()

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Erreur de lecture du fichier", http.StatusInternalServerError)
		return
	}

	ext := strings.ToLower(filepath.Ext(handler.Filename))
	var text string

	if ext == ".pdf" {
		text, err = readPdfText(fileBytes)
		if err != nil {
			http.Error(w, "Erreur lors de la lecture du PDF", http.StatusInternalServerError)
			return
		}
		text = cleanPDFText(text)
	} else if ext == ".srt" || ext == ".vtt" || ext == ".txt" {
		text = string(fileBytes)
		if ext == ".srt" || ext == ".vtt" {
			text = cleanSubtitles(text)
		}
	} else {
		http.Error(w, "Format non supporté. Utilisez .pdf, .txt, .srt ou .vtt", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"text":  text,
		"title": strings.TrimSuffix(handler.Filename, ext),
	})
}

func readPdfText(data []byte) (string, error) {
	reader, err := pdf.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", err
	}
	b, err := reader.GetPlainText()
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	buf.ReadFrom(b)
	return buf.String(), nil
}

func cleanPDFText(text string) string {
	text = strings.ReplaceAll(text, "\r\n", "\n")
	lines := strings.Split(text, "\n")
	var result strings.Builder

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			result.WriteString("\n\n")
			continue
		}
		if strings.HasSuffix(line, "-") {
			result.WriteString(strings.TrimSuffix(line, "-"))
		} else {
			result.WriteString(line + " ")
		}
	}

	finalText := result.String()
	re := regexp.MustCompile(`[ \t]+`)
	finalText = re.ReplaceAllString(finalText, " ")

	reLines := regexp.MustCompile(`\n{3,}`)
	finalText = reLines.ReplaceAllString(finalText, "\n\n")

	return strings.TrimSpace(finalText)
}

func cleanSubtitles(content string) string {
	lines := strings.Split(content, "\n")
	var result []string

	reTime := regexp.MustCompile(`-->`)
	reNum := regexp.MustCompile(`^\s*\d+\s*$`)

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		if reTime.MatchString(line) {
			continue
		}
		if reNum.MatchString(line) {
			continue
		}
		if strings.HasPrefix(line, "WEBVTT") {
			continue
		}
		result = append(result, line)
	}
	return strings.Join(result, "\n")
}
