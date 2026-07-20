package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type YoutubeRequest struct {
	URL  string `json:"url"`
	Mode string `json:"mode"`
}

type YoutubeResponse struct {
	Message string `json:"message"`
	ID      int64  `json:"id"`
}

func youtubeDownloadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req YoutubeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.URL == "" {
		http.Error(w, "URL is required", http.StatusBadRequest)
		return
	}

	// 1. Enregistrer dans la base de données avec le statut "downloading"
	res, err := db.Exec("INSERT INTO transcriptions (url, status) VALUES (?, 'downloading')", req.URL)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	id, _ := res.LastInsertId()

	// 2. Lancer le traitement en arrière-plan
	go processDownloadAndTranscribe(id, req.URL, req.Mode)

	resp := YoutubeResponse{
		Message: "Téléchargement démarré en arrière-plan",
		ID:      id,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// Fonction exécutée en arrière-plan (goroutine)
func processDownloadAndTranscribe(id int64, videoURL string, mode string) {
	downloadDir := "./downloads"
	os.MkdirAll(downloadDir, os.ModePerm)

	// Utilisation de l'ID de la base de données pour nommer le fichier
	fileName := fmt.Sprintf("audio_%d", id)
	hqOutputPath := filepath.Join(downloadDir, fileName+".%(ext)s")
	finalHQAudioPath := filepath.Join(downloadDir, fileName+".mp3")
	whisperAudioPath := filepath.Join(downloadDir, fileName+"_whisper.wav")

	// Récupérer le titre de la vidéo
	titleCmd := exec.Command("yt-dlp", "--print", "title", videoURL)
	titleBytes, _ := titleCmd.Output()
	title := strings.TrimSpace(string(titleBytes))
	if title != "" {
		db.Exec("UPDATE transcriptions SET title = ? WHERE id = ?", title, id)
	}

	// Supprimer les anciens fichiers s'ils existent
	os.Remove(finalHQAudioPath)
	os.Remove(whisperAudioPath)
	os.Remove(whisperAudioPath + ".json")

	if mode == "cinema" {
		// Mode cinéma : on télécharge uniquement l'audio basse qualité pour Whisper, pas de MP3
		cmd := exec.Command("yt-dlp", "-x", "--audio-format", "wav", "--postprocessor-args", "-ar 16000 -ac 1", "-o", whisperAudioPath, videoURL)
		if err := cmd.Run(); err != nil {
			fmt.Println("Erreur yt-dlp (Cinema):", err)
			db.Exec("UPDATE transcriptions SET status = 'error_download' WHERE id = ?", id)
			return
		}
		db.Exec("UPDATE transcriptions SET status = 'transcribing' WHERE id = ?", id)
	} else {
		// Mode podcast (défaut) : on télécharge le MP3 haute qualité
		cmd := exec.Command("yt-dlp", "-x", "--audio-format", "mp3", "-o", hqOutputPath, videoURL)
		
		if err := cmd.Run(); err != nil {
			fmt.Println("Erreur yt-dlp (HQ):", err)
			db.Exec("UPDATE transcriptions SET status = 'error_download' WHERE id = ?", id)
			return
		}

		// Conversion en WAV mono 16kHz pour Whisper
		ffmpegCmd := exec.Command("ffmpeg", "-y", "-i", finalHQAudioPath, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", whisperAudioPath)
		if err := ffmpegCmd.Run(); err != nil {
			fmt.Println("Erreur ffmpeg conversion Whisper:", err)
			db.Exec("UPDATE transcriptions SET status = 'error_download' WHERE id = ?", id)
			return
		}

		// Mettre à jour la DB avec le chemin de l'audio HQ
		db.Exec("UPDATE transcriptions SET status = 'transcribing', audio_path = ? WHERE id = ?", finalHQAudioPath, id)
	}

	// L'étape 3 : Exécution de Whisper
	cwd, _ := os.Getwd()
	var whisperRoot string
	if _, err := os.Stat(filepath.Join(cwd, "whisper.cpp")); err == nil {
		whisperRoot = filepath.Join(cwd, "whisper.cpp")
	} else {
		whisperRoot = filepath.Join(cwd, "..", "whisper.cpp")
	}
	whisperCLI := filepath.Join(whisperRoot, "build", "bin", "whisper-cli")
	whisperModel := filepath.Join(whisperRoot, "models", "ggml-medium.bin")

	// Lancement de whisper avec -oj pour générer un fichier JSON, et -ml 30 pour des segments de 30 caractères max (~5 mots)
	whisperCmd := exec.Command(whisperCLI, "-m", whisperModel, "-f", whisperAudioPath, "-oj", "-ml", "30", "-sow")
	
	if err := whisperCmd.Run(); err != nil {
		fmt.Println("Erreur Whisper:", err)
		db.Exec("UPDATE transcriptions SET status = 'error_transcription' WHERE id = ?", id)
		return
	}

	// Whisper génère un fichier avec l'extension .json ajoutée au nom original
	jsonPath := whisperAudioPath + ".json"

	// Vérification de la création du fichier
	if _, err := os.Stat(jsonPath); err == nil {
		db.Exec("UPDATE transcriptions SET status = 'completed' WHERE id = ?", id)
		fmt.Println("Transcription terminée pour l'ID", id)
	} else {
		fmt.Println("Erreur : fichier JSON introuvable :", jsonPath)
		db.Exec("UPDATE transcriptions SET status = 'error_json_missing' WHERE id = ?", id)
	}

	// On n'a plus besoin du fichier audio basse qualité pour Whisper, on le supprime pour libérer de l'espace disque !
	os.Remove(whisperAudioPath)
}

type YoutubeStatusResponse struct {
	Status        string          `json:"status"`
	AudioURL      string          `json:"audio_url,omitempty"`
	VideoURL      string          `json:"video_url,omitempty"`
	Transcription json.RawMessage `json:"transcription,omitempty"`
	Title         string          `json:"title,omitempty"`
}

func youtubeStatusHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}

	var status, title, videoURL string
	var audioPath sql.NullString
	
	err := db.QueryRow("SELECT status, audio_path, title, url FROM transcriptions WHERE id = ?", id).Scan(&status, &audioPath, &title, &videoURL)
	if err != nil {
		http.Error(w, "Transcription introuvable", http.StatusNotFound)
		return
	}

	resp := YoutubeStatusResponse{
		Status: status,
		Title:  title,
	}

	// Si c'est terminé, on donne les infos nécessaires
	if status == "completed" {
		if audioPath.Valid {
			resp.AudioURL = fmt.Sprintf("http://localhost:8080/downloads/audio_%s.mp3?t=%d", id, time.Now().UnixNano())
		}
		resp.VideoURL = videoURL
		
		jsonPath := fmt.Sprintf("./downloads/audio_%s_whisper.wav.json", id)
		jsonData, err := os.ReadFile(jsonPath)
		if err == nil {
			resp.Transcription = jsonData
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
