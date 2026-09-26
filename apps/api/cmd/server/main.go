package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

// staticHandler serves publicDir, falling back to index.html for SPA client-side routes.
func staticHandler(dir string) http.Handler {
	fileServer := http.FileServer(http.Dir(dir))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := filepath.Join(dir, filepath.Clean(r.URL.Path))
		if info, err := os.Stat(p); err == nil && !info.IsDir() {
			fileServer.ServeHTTP(w, r)
			return
		}
		http.ServeFile(w, r, filepath.Join(dir, "index.html"))
	})
}

func main() {
	// .env lives at the repo root; the API runs from apps/api. Errors are ignored:
	// in the container, env is injected via env_file.
	_ = godotenv.Load("../../.env")
	_ = godotenv.Load(".env")

	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "8080"
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"success":true,"message":"ok","data":null}`))
	})

	// http.ServeMux matches the longest pattern, so /api/v1/... still wins over /.
	if publicDir := os.Getenv("PUBLIC_DIR"); publicDir != "" {
		if _, err := os.Stat(publicDir); err == nil {
			mux.Handle("/", staticHandler(publicDir))
		}
	}

	log.Printf("api listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
