# ImparaLingue 🌍

**ImparaLingue** est une application web d'apprentissage des langues (inspirée de LingQ). Elle permet d'importer des textes ou des vidéos YouTube, de lire le contenu, et de cliquer sur des mots pour afficher leur traduction, prendre des notes, et suivre sa progression d'apprentissage (mots connus, en cours d'apprentissage, à réviser).

> **Note :** Ce projet a été **"vibe coded"** 🚀.

> **⚠️ Avertissement de sécurité :** L'objectif principal de ce projet est d'être utilisé **localement** pour le moment. Il n'est **pas sécurisé pour être mis en production** sur un serveur public (absence d'authentification, pas de limitation de requêtes, risques potentiels liés à l'exécution de commandes externes, etc.). 

## 🛠️ Stack Technique

* **Frontend :** React (Vite) + CSS Vanilla (Design System moderne "Glassmorphism" et Dark Mode)
* **Backend :** Go (Golang) avec serveur HTTP natif
* **Base de Données :** SQLite (fichier local `imparalingue.db`)
* **Traductions :** Intégration de l'API officielle de DeepL
* **Traitement Audio/Vidéo :** `yt-dlp` (téléchargement) et `whisper.cpp` (transcription et synchronisation)

## ✨ Fonctionnalités Principales

* **Lecture Interactive :** Importez des textes (.txt, .pdf, .srt, .vtt) et cliquez sur chaque mot pour voir sa traduction.
* **Import YouTube :** Téléchargez l'audio et les sous-titres d'une vidéo YouTube pour l'étudier.
* **Système "Karaoké" :** Surlignage du texte synchronisé avec l'audio en temps réel.
* **Mode Lecture :** Interface style "Livre" (typographie serif, sépia) pour un meilleur confort visuel, avec possibilité d'éditer et corriger le texte en direct.
* **Suivi du Vocabulaire :** Marquez les mots selon leur statut (Connu, En apprentissage, À réviser) et suivez votre progression via des graphiques de statistiques.
* **Dictionnaire et Notes :** Une barre latérale persistante affiche les définitions (DeepL) et permet de prendre des notes personnelles sur chaque mot.
* **Multilingue :** L'interface utilisateur est entièrement traduite en plusieurs langues (Français, Anglais, Portugais Brésilien).

## 🚀 Comment lancer le projet localement

### Prérequis
* [Go](https://go.dev/) (pour le backend)
* [Node.js](https://nodejs.org/) (pour le frontend)
* `yt-dlp` et `whisper.cpp` (si vous souhaitez utiliser la fonctionnalité d'import YouTube)
* Une clé d'API DeepL (`DEEPL_API_KEY` configurée dans un fichier `.env` du backend)

### Démarrer le Backend (Go)
1. Ouvrez un terminal dans le dossier du projet backend.
2. Lancez l'API avec la commande :
   ```bash
   go run main.go
   ```
   Le backend tournera sur `http://localhost:8080`.

### Démarrer le Frontend (React)
1. Ouvrez un autre terminal dans le dossier du projet frontend.
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```
   Ouvrez le lien fourni par Vite dans votre navigateur.
