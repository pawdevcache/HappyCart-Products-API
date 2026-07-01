package main

import (
	"encoding/json"
	"net/http"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

// User account. Password is stored hashed and never returned (omitempty + cleared).
type User struct {
	ID       primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	Username string             `json:"username" bson:"username"`
	Email    string             `json:"email" bson:"email"`
	Password string             `json:"password,omitempty" bson:"password"`
	Role     string             `json:"role" bson:"role"`
}

var users *mongo.Collection

// owner returns true if the caller is admin or the same user as id.
func owner(cl *Claims, id primitive.ObjectID) bool {
	return cl.Role == "admin" || cl.Subject == id.Hex()
}

// POST /users — public registration (always creates a normal "user")
func createUser(w http.ResponseWriter, r *http.Request) {
	var u User
	if json.NewDecoder(r.Body).Decode(&u) != nil || u.Username == "" || u.Password == "" {
		fail(w, http.StatusBadRequest, "username and password required")
		return
	}
	h, _ := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
	u.Password, u.Role = string(h), "user"
	c, cancel := ctx()
	defer cancel()
	res, err := users.InsertOne(c, u)
	if err != nil {
		fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	u.ID, u.Password = res.InsertedID.(primitive.ObjectID), ""
	writeJSON(w, http.StatusCreated, u)
}

// POST /login — verify credentials, return a JWT
func login(w http.ResponseWriter, r *http.Request) {
	var body User
	json.NewDecoder(r.Body).Decode(&body)
	c, cancel := ctx()
	defer cancel()
	var u User
	if users.FindOne(c, bson.M{"username": body.Username}).Decode(&u) != nil ||
		bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(body.Password)) != nil {
		fail(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	tok, _ := makeToken(u.ID.Hex(), u.Role)
	writeJSON(w, http.StatusOK, map[string]string{"token": tok})
}

// GET /users — admin only
func getAllUsers(w http.ResponseWriter, r *http.Request) {
	cl, ok := requireAuth(w, r)
	if !ok {
		return
	}
	if cl.Role != "admin" {
		fail(w, http.StatusForbidden, "admin only")
		return
	}
	c, cancel := ctx()
	defer cancel()
	cur, err := users.Find(c, bson.M{})
	if err != nil {
		fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	out := []User{}
	if err := cur.All(c, &out); err != nil {
		fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	for i := range out {
		out[i].Password = ""
	}
	writeJSON(w, http.StatusOK, out)
}

// PUT /users/{id} — admin or the user themselves
func updateUser(w http.ResponseWriter, r *http.Request) {
	cl, ok := requireAuth(w, r)
	if !ok {
		return
	}
	id, ok := objID(w, r)
	if !ok {
		return
	}
	if !owner(cl, id) {
		fail(w, http.StatusForbidden, "not allowed")
		return
	}
	var u User
	if json.NewDecoder(r.Body).Decode(&u) != nil {
		fail(w, http.StatusBadRequest, "invalid body")
		return
	}
	set := bson.M{}
	if u.Username != "" {
		set["username"] = u.Username
	}
	if u.Email != "" {
		set["email"] = u.Email
	}
	if u.Password != "" {
		h, _ := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
		set["password"] = string(h)
	}
	if cl.Role == "admin" && u.Role != "" { // only admins may change roles
		set["role"] = u.Role
	}
	c, cancel := ctx()
	defer cancel()
	res, err := users.UpdateOne(c, bson.M{"_id": id}, bson.M{"$set": set})
	if err != nil {
		fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	if res.MatchedCount == 0 {
		fail(w, http.StatusNotFound, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "user updated"})
}

// DELETE /users/{id} — admin or the user themselves
func removeUser(w http.ResponseWriter, r *http.Request) {
	cl, ok := requireAuth(w, r)
	if !ok {
		return
	}
	id, ok := objID(w, r)
	if !ok {
		return
	}
	if !owner(cl, id) {
		fail(w, http.StatusForbidden, "not allowed")
		return
	}
	c, cancel := ctx()
	defer cancel()
	res, err := users.DeleteOne(c, bson.M{"_id": id})
	if err != nil {
		fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	if res.DeletedCount == 0 {
		fail(w, http.StatusNotFound, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "user deleted"})
}
