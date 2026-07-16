package main

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/joho/godotenv"
	_ "github.com/mattn/go-sqlite3"
)

func main() {
	// Charger le fichier .env s'il existe
	_ = godotenv.Load()

	var err error
	// Connexion à la base de données
	db, err = sql.Open("sqlite3", "./imparalingue.db")
	if err != nil {
		log.Fatal("Erreur de connexion à la base de données:", err)
	}
	defer db.Close()

	if err := initDB(db); err != nil {
		log.Fatal("Erreur d'initialisation des tables:", err)
	}

	// Routes de notre API
	http.HandleFunc("/api/words", enableCORS(wordsHandler))
	http.HandleFunc("/api/texts", enableCORS(textsHandler))
	http.HandleFunc("/api/texts/status", enableCORS(textStatusHandler))
	http.HandleFunc("/api/extract", enableCORS(extractHandler))
	http.HandleFunc("/api/stats", enableCORS(statsHandler))
	http.HandleFunc("/api/audio", enableCORS(audioHandler))
	http.HandleFunc("/api/youtube/download", enableCORS(youtubeDownloadHandler))
	http.HandleFunc("/api/youtube/status", enableCORS(youtubeStatusHandler))
	http.HandleFunc("/api/translate", enableCORS(translateHandler))

	// Servir le dossier downloads pour que le frontend puisse lire les fichiers audio
	fs := http.FileServer(http.Dir("./downloads"))
	http.HandleFunc("/downloads/", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		http.StripPrefix("/downloads/", fs).ServeHTTP(w, r)
	}))

	// Lancement du serveur sur le port 8080
	port := ":8080"
	log.Println("✅ Le serveur Backend tourne sur http://localhost" + port)
	log.Fatal(http.ListenAndServe(port, nil))
}

// Middleware pour autoriser React (localhost:5173) à communiquer avec Go (localhost:8080)
func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE, PUT")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}
