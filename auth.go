package main

import (
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var jwtSecret = []byte(env("JWT_SECRET", "dev-secret-change-me"))

// Claims is the JWT payload: Subject holds the user id, plus their role.
type Claims struct {
	Role string `json:"role"`
	jwt.RegisteredClaims
}

func makeToken(id, role string) (string, error) {
	c := Claims{role, jwt.RegisteredClaims{
		Subject:   id,
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
	}}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, c).SignedString(jwtSecret)
}

// admin wraps a handler so only authenticated admins may call it.
func admin(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cl, ok := requireAuth(w, r)
		if !ok {
			return
		}
		if cl.Role != "admin" {
			fail(w, http.StatusForbidden, "admin only")
			return
		}
		h(w, r)
	}
}

// requireAuth parses the Bearer token; writes 401 and returns false if missing/invalid.
func requireAuth(w http.ResponseWriter, r *http.Request) (*Claims, bool) {
	tok := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	c := &Claims{}
	t, err := jwt.ParseWithClaims(tok, c, func(*jwt.Token) (any, error) { return jwtSecret, nil })
	if err != nil || !t.Valid {
		fail(w, http.StatusUnauthorized, "unauthorized")
		return nil, false
	}
	return c, true
}
