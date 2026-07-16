package main

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
)

func audioHandler(w http.ResponseWriter, r *http.Request) {
	word := r.URL.Query().Get("word")
	lang := r.URL.Query().Get("lang")

	if word == "" || lang == "" {
		http.Error(w, "word and lang are required", http.StatusBadRequest)
		return
	}

	googleURL := fmt.Sprintf("https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=%s&q=%s", lang, url.QueryEscape(word))
	
	resp, err := http.Get(googleURL)
	if err != nil {
		http.Error(w, "Error fetching audio", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "audio/mpeg")
	io.Copy(w, resp.Body)
}
