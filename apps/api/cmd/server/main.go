package main

import (
	"errors"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"path"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// staticHandler serves the built SPA from fsys, falling back to index.html for client-side
// routes. It goes through fs.FS, whose path validation rules out traversal outside the root.
// The SEO shell (ADR-0005) replaces the plain index.html fallback in PLAN-03.
func staticHandler(fsys fs.FS) http.Handler {
	fileServer := http.FileServerFS(fsys)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
		if name != "" {
			if info, err := fs.Stat(fsys, name); err == nil && !info.IsDir() {
				fileServer.ServeHTTP(w, r)
				return
			}
		}
		http.ServeFileFS(w, r, fsys, "index.html")
	})
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	// .env lives at the repo root; the API runs from apps/api. Errors are ignored:
	// in the container, env is injected via env_file.
	_ = godotenv.Load("../../.env")
	_ = godotenv.Load(".env")

	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"success":true,"message":"ok","data":null}`))
	})

	// http.ServeMux matches the most specific pattern, so /api/v1/... still wins over /.
	// Static serving is skipped (dev case: Vite serves the frontend) unless PUBLIC_DIR holds a
	// built SPA with an index.html.
	if publicDir := os.Getenv("PUBLIC_DIR"); publicDir != "" {
		publicFS := os.DirFS(publicDir)
		if _, err := fs.Stat(publicFS, "index.html"); err == nil {
			mux.Handle("GET /", staticHandler(publicFS))
		}
	}

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       60 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	logger.Info("api listening", slog.String("addr", srv.Addr))
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("server stopped", slog.String("error", err.Error()))
		os.Exit(1)
	}
}
