package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"matalabs-backend/models"

	"github.com/golang-jwt/jwt/v5"
)

type TokenVerifier struct {
	GoogleClientID string
	JWTSecret      []byte
}

func NewTokenVerifier(clientID, secret string) *TokenVerifier {
	return &TokenVerifier{
		GoogleClientID: clientID,
		JWTSecret:      []byte(secret),
	}
}

// VerifyGoogleIDToken verifies the Google JWT ID token using Google's tokeninfo API
func (v *TokenVerifier) VerifyGoogleIDToken(idToken string) (*models.GoogleTokenClaims, error) {
	if strings.TrimSpace(idToken) == "" {
		return nil, errors.New("empty google id token")
	}

	url := fmt.Sprintf("https://oauth2.googleapis.com/tokeninfo?id_token=%s", idToken)
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to contact google tokeninfo endpoint: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errResp struct {
			Error            string `json:"error"`
			ErrorDescription string `json:"error_description"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&errResp)
		return nil, fmt.Errorf("google token rejected: %s (%s)", errResp.Error, errResp.ErrorDescription)
	}

	var rawClaims struct {
		Aud           string `json:"aud"`
		Sub           string `json:"sub"`
		Email         string `json:"email"`
		EmailVerified string `json:"email_verified"`
		Name          string `json:"name"`
		Picture       string `json:"picture"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&rawClaims); err != nil {
		return nil, fmt.Errorf("failed to parse google token response: %w", err)
	}

	// Validate Audience matches our Google Client ID
	if v.GoogleClientID != "" && rawClaims.Aud != v.GoogleClientID {
		return nil, fmt.Errorf("token audience mismatch: expected %s, got %s", v.GoogleClientID, rawClaims.Aud)
	}

	return &models.GoogleTokenClaims{
		Sub:           rawClaims.Sub,
		Email:         rawClaims.Email,
		EmailVerified: rawClaims.EmailVerified == "true",
		Name:          rawClaims.Name,
		Picture:       rawClaims.Picture,
	}, nil
}

// IssueSessionJWT creates an HMAC-signed session token for the user
func (v *TokenVerifier) IssueSessionJWT(user *models.User) (string, error) {
	claims := jwt.MapClaims{
		"sub":   user.ID,
		"email": user.Email,
		"name":  user.Name,
		"exp":   time.Now().Add(7 * 24 * time.Hour).Unix(),
		"iat":   time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(v.JWTSecret)
}

type contextKey string

const UserContextKey contextKey = "user_claims"

// AuthMiddleware protects routes requiring Google authenticated session
func (v *TokenVerifier) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, `{"error":"unauthorized: google sign-in required"}`, http.StatusUnauthorized)
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return v.JWTSecret, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, `{"error":"unauthorized: invalid or expired session"}`, http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, `{"error":"unauthorized: malformed token claims"}`, http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), UserContextKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
