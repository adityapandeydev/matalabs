package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"matalabs-backend/auth"
	"matalabs-backend/db"
	"matalabs-backend/models"
)

type AuthHandler struct {
	DB       *db.DB
	Verifier *auth.TokenVerifier
}

func NewAuthHandler(database *db.DB, verifier *auth.TokenVerifier) *AuthHandler {
	return &AuthHandler{
		DB:       database,
		Verifier: verifier,
	}
}

type GoogleAuthRequest struct {
	Credential string `json:"credential"`
}

type AuthResponse struct {
	Token string       `json:"token"`
	User  *models.User `json:"user"`
}

// GoogleAuthHandler processes Google GIS Sign-In credentials
func (h *AuthHandler) GoogleAuthHandler(w http.ResponseWriter, r *http.Request) {
	var req GoogleAuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	claims, err := h.Verifier.VerifyGoogleIDToken(req.Credential)
	if err != nil {
		log.Printf("[Auth] Google token verification failed: %v", err)
		http.Error(w, `{"error":"invalid google credentials: `+err.Error()+`"}`, http.StatusUnauthorized)
		return
	}

	user := &models.User{
		ID:        claims.Sub,
		Email:     claims.Email,
		Name:      claims.Name,
		Picture:   claims.Picture,
		CreatedAt: time.Now(),
	}

	if err := h.DB.UpsertUser(user); err != nil {
		log.Printf("[Auth] Failed to upsert user: %v", err)
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}

	token, err := h.Verifier.IssueSessionJWT(user)
	if err != nil {
		log.Printf("[Auth] Failed to issue session JWT: %v", err)
		http.Error(w, `{"error":"token issuance error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(AuthResponse{
		Token: token,
		User:  user,
	})
}
