package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"strings"
)

type TranslateRequest struct {
	Text       string `json:"text"`
	SourceLang string `json:"source_lang"`
	TargetLang string `json:"target_lang"`
}

type DeepLResponse struct {
	Translations []struct {
		Text string `json:"text"`
	} `json:"translations"`
}

func translateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req TranslateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	apiKey := os.Getenv("DEEPL_API_KEY")
	if apiKey == "" {
		/*
		// Fallback to Google Translate
		googleUrl := fmt.Sprintf("https://translate.googleapis.com/translate_a/single?client=gtx&sl=%s&tl=%s&dt=t&q=%s", req.SourceLang, req.TargetLang, url.QueryEscape(req.Text))
		resp, err := http.Get(googleUrl)
		if err == nil && resp.StatusCode == 200 {
			defer resp.Body.Close()
			var data []interface{}
			if err := json.NewDecoder(resp.Body).Decode(&data); err == nil {
				if len(data) > 0 {
					if arr, ok := data[0].([]interface{}); ok && len(arr) > 0 {
						if subArr, ok := arr[0].([]interface{}); ok && len(subArr) > 0 {
							if trans, ok := subArr[0].(string); ok {
								w.Header().Set("Content-Type", "application/json")
								json.NewEncoder(w).Encode(map[string]string{"translation": trans})
								return
							}
						}
					}
				}
			}
		}
		*/
		http.Error(w, "DEEPL_API_KEY not configured or Translation failed", http.StatusInternalServerError)
		return
	}
	sourceLang := strings.ToUpper(req.SourceLang)
	targetLang := strings.ToUpper(req.TargetLang)

	// DeepL exige des codes régionaux pour l'anglais et le portugais en target_lang
	if targetLang == "EN" {
		targetLang = "EN-US"
	}
	if targetLang == "PT" {
		targetLang = "PT-BR"
	}

	// Préparation de la requête pour DeepL
	deeplReqBody, _ := json.Marshal(map[string]interface{}{
		"text":        []string{req.Text},
		"source_lang": sourceLang,
		"target_lang": targetLang,
	})

	// Par défaut, l'URL de l'API gratuite.
	url := "https://api-free.deepl.com/v2/translate"

	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(deeplReqBody))
	if err != nil {
		http.Error(w, "Error creating request", http.StatusInternalServerError)
		return
	}

	httpReq.Header.Set("Authorization", "DeepL-Auth-Key "+apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		http.Error(w, "Error calling DeepL API", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		bodyBytes, _ := ioutil.ReadAll(resp.Body)
		fmt.Printf("DeepL API Error: %s\n", string(bodyBytes))
		http.Error(w, "DeepL API returned error", resp.StatusCode)
		return
	}

	var deeplResp DeepLResponse
	if err := json.NewDecoder(resp.Body).Decode(&deeplResp); err != nil {
		http.Error(w, "Error decoding DeepL response", http.StatusInternalServerError)
		return
	}

	if len(deeplResp.Translations) > 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"translation": deeplResp.Translations[0].Text,
		})
	} else {
		http.Error(w, "No translation returned", http.StatusInternalServerError)
	}
}
