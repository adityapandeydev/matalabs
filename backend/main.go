package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"matalabs-backend/ai"
	"matalabs-backend/auth"
	"matalabs-backend/db"
	"matalabs-backend/handlers"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env if present
	if err := godotenv.Load(); err != nil {
		log.Println("[Config] No .env file found; reading from environment")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	googleClientID := os.Getenv("GOOGLE_CLIENT_ID")
	geminiKey := os.Getenv("GEMINI_API_KEY")
	groqKey := os.Getenv("GROQ_API_KEY")
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "default_secure_secret_fallback_key_2026"
	}

	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		dbPath = "./data/english_test.db"
	}

	log.Printf("[Config] Starting server on port %s", port)
	log.Printf("[Config] Google Client ID set: %t", googleClientID != "")
	log.Printf("[Config] Gemini API Key set: %t", geminiKey != "")
	log.Printf("[Config] Groq API Key set: %t", groqKey != "")

	// 1. Initialize SQLite
	database, err := db.InitDB(dbPath)
	if err != nil {
		log.Fatalf("[Fatal] Database initialization failed: %v", err)
	}
	defer database.Close()

	// 2. Initialize Services & Handlers
	tokenVerifier := auth.NewTokenVerifier(googleClientID, jwtSecret)
	aiService := ai.NewAIService(geminiKey, groqKey)

	authHandler := handlers.NewAuthHandler(database, tokenVerifier)
	submissionHandler := handlers.NewSubmissionHandler(database, aiService)

	// 3. Router Setup
	r := chi.NewRouter()

	// Essential Middlewares
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// CORS Configuration (supports Netlify, localhost, and custom frontend domains)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3000", "https://*.netlify.app", "*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// Public Health Check
	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(fmt.Sprintf(`{"status":"healthy","time":"%s"}`, time.Now().Format(time.RFC3339))))
	})

	// Public Routes
	r.Get("/api/audio/sample-listening.mp3", handlers.ServeAudioHandler)
	r.Get("/api/test/content", handlers.GetTestContentHandler)
	r.Post("/api/auth/google", authHandler.GoogleAuthHandler)

	// Protected Routes (Strictly Require Google Auth Session)
	r.Group(func(protected chi.Router) {
		protected.Use(tokenVerifier.AuthMiddleware)
		protected.Post("/api/test/submit", submissionHandler.EvaluateAndSubmitHandler)
		protected.Get("/api/test/result", submissionHandler.GetResultHandler)
	})

	serverAddr := ":" + port
	log.Printf("[Server] Matalabs 4-Skill English Test Backend listening on %s", serverAddr)
	if err := http.ListenAndServe(serverAddr, r); err != nil {
		log.Fatalf("[Fatal] Server terminated: %v", err)
	}
}
