package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type DailyStat struct {
	Date             string `json:"date"`
	KnownCount       int    `json:"knownCount"`
	LearningCount    int    `json:"learningCount"`
	UnknownCount     int    `json:"unknownCount"`
	CumKnownCount    int    `json:"cumKnownCount"`
	CumLearningCount int    `json:"cumLearningCount"`
	CumUnknownCount  int    `json:"cumUnknownCount"`
}

type StatsResponse struct {
	TotalKnown  int         `json:"totalKnown"`
	TodayKnown  int         `json:"todayKnown"`
	PeriodKnown int         `json:"periodKnown"`
	ChartData   []DailyStat `json:"chartData"`
}

func statsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	userID := r.URL.Query().Get("user_id")
	lang := r.URL.Query().Get("language")
	period := r.URL.Query().Get("period")
	if period == "" {
		period = "week"
	}

	var res StatsResponse

	db.QueryRow("SELECT COUNT(*) FROM vocabulary WHERE status = 'known' AND user_id = ? AND language = ?", userID, lang).Scan(&res.TotalKnown)
	db.QueryRow("SELECT COUNT(*) FROM vocabulary WHERE status = 'known' AND date(update_date, 'localtime') = date('now', 'localtime') AND user_id = ? AND language = ?", userID, lang).Scan(&res.TodayKnown)

	var dateModifier string
	var dateFormat string

	switch period {
	case "today":
		dateModifier = "0 days"
		dateFormat = "date(update_date, 'localtime')"
	case "month":
		dateModifier = "-1 month"
		dateFormat = "date(update_date, 'localtime')"
	case "year":
		dateModifier = "-1 year"
		dateFormat = "strftime('%Y-%m', update_date, 'localtime')"
	default: // week
		dateModifier = "-6 days"
		dateFormat = "date(update_date, 'localtime')"
	}

	var baseKnown, baseLearning, baseUnknown int
	queryBase := fmt.Sprintf(`
		SELECT 
			COALESCE(SUM(CASE WHEN status = 'known' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN status = 'learning' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN status = 'unknown' THEN 1 ELSE 0 END), 0)
		FROM vocabulary
		WHERE date(update_date, 'localtime') < date('now', '%s', 'localtime') AND user_id = ? AND language = ?
	`, dateModifier)
	db.QueryRow(queryBase, userID, lang).Scan(&baseKnown, &baseLearning, &baseUnknown)

	queryChart := fmt.Sprintf(`
		SELECT %s as d, 
			COALESCE(SUM(CASE WHEN status = 'known' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN status = 'learning' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN status = 'unknown' THEN 1 ELSE 0 END), 0)
		FROM vocabulary 
		WHERE date(update_date, 'localtime') >= date('now', '%s', 'localtime') AND user_id = ? AND language = ?
		GROUP BY d 
		ORDER BY d ASC
	`, dateFormat, dateModifier)

	rows, err := db.Query(queryChart, userID, lang)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var ds DailyStat
			if err := rows.Scan(&ds.Date, &ds.KnownCount, &ds.LearningCount, &ds.UnknownCount); err == nil {
				baseKnown += ds.KnownCount
				baseLearning += ds.LearningCount
				baseUnknown += ds.UnknownCount

				ds.CumKnownCount = baseKnown
				ds.CumLearningCount = baseLearning
				ds.CumUnknownCount = baseUnknown

				res.ChartData = append(res.ChartData, ds)
			}
		}
	}
	if res.ChartData == nil {
		res.ChartData = []DailyStat{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}
