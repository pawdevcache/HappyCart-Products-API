package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Product matches the FakeStore API product shape.
type Product struct {
	ID          primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	Title       string             `json:"title" bson:"title"`
	Price       float64            `json:"price" bson:"price"`
	Description string             `json:"description" bson:"description"`
	Category    string             `json:"category" bson:"category"`
	Image       string             `json:"image" bson:"image"`
	Rating      struct {
		Rate  float64 `json:"rate" bson:"rate"`
		Count int     `json:"count" bson:"count"`
	} `json:"rating" bson:"rating"`
}

var products *mongo.Collection

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

func fail(w http.ResponseWriter, code int, msg string) {
	writeJSON(w, code, map[string]string{"error": msg})
}

func ctx() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

func objID(w http.ResponseWriter, r *http.Request) (primitive.ObjectID, bool) {
	id, err := primitive.ObjectIDFromHex(r.PathValue("id"))
	if err != nil {
		fail(w, http.StatusBadRequest, "invalid product id")
		return id, false
	}
	return id, true
}

// GET /products — list all products
func getAll(w http.ResponseWriter, r *http.Request) {
	c, cancel := ctx()
	defer cancel()
	cur, err := products.Find(c, bson.M{})
	if err != nil {
		fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	out := []Product{}
	if err := cur.All(c, &out); err != nil {
		fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, out)
}

// POST /products — add a new product
func create(w http.ResponseWriter, r *http.Request) {
	var p Product
	if json.NewDecoder(r.Body).Decode(&p) != nil {
		fail(w, http.StatusBadRequest, "invalid body")
		return
	}
	c, cancel := ctx()
	defer cancel()
	res, err := products.InsertOne(c, p)
	if err != nil {
		fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	p.ID = res.InsertedID.(primitive.ObjectID)
	writeJSON(w, http.StatusCreated, p)
}

// GET /products/{id} — get a single product
func getOne(w http.ResponseWriter, r *http.Request) {
	id, ok := objID(w, r)
	if !ok {
		return
	}
	c, cancel := ctx()
	defer cancel()
	var p Product
	if products.FindOne(c, bson.M{"_id": id}).Decode(&p) != nil {
		fail(w, http.StatusNotFound, "product not found")
		return
	}
	writeJSON(w, http.StatusOK, p)
}

// PUT /products/{id} — update a product
func update(w http.ResponseWriter, r *http.Request) {
	id, ok := objID(w, r)
	if !ok {
		return
	}
	var p Product
	if json.NewDecoder(r.Body).Decode(&p) != nil {
		fail(w, http.StatusBadRequest, "invalid body")
		return
	}
	p.ID = id
	c, cancel := ctx()
	defer cancel()
	if _, err := products.ReplaceOne(c, bson.M{"_id": id}, p); err != nil {
		fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, p)
}

// DELETE /products/{id} — delete a product
func remove(w http.ResponseWriter, r *http.Request) {
	id, ok := objID(w, r)
	if !ok {
		return
	}
	c, cancel := ctx()
	defer cancel()
	res, err := products.DeleteOne(c, bson.M{"_id": id})
	if err != nil {
		fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	if res.DeletedCount == 0 {
		fail(w, http.StatusNotFound, "product not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "product deleted"})
}

func main() {
	c, cancel := ctx()
	defer cancel()
	client, err := mongo.Connect(c, options.Client().ApplyURI(env("MONGODB_URI", "mongodb://localhost:27017")))
	if err != nil {
		log.Fatal(err)
	}
	db := client.Database(env("DB_NAME", "happycart"))
	products = db.Collection("products")
	carts = db.Collection("carts")
	users = db.Collection("users")
	seedAdmin()

	// All API routes live under /api so the same paths work in dev (Vite proxy)
	// and in production (this binary also serves the built frontend).
	api := http.NewServeMux()
	api.HandleFunc("GET /products", getAll)
	api.HandleFunc("POST /products", admin(create))
	api.HandleFunc("GET /products/{id}", getOne)
	api.HandleFunc("PUT /products/{id}", admin(update))
	api.HandleFunc("DELETE /products/{id}", admin(remove))

	api.HandleFunc("GET /carts", getAllCarts)
	api.HandleFunc("POST /carts", createCart)
	api.HandleFunc("GET /carts/{id}", getOneCart)
	api.HandleFunc("PUT /carts/{id}", updateCart)
	api.HandleFunc("DELETE /carts/{id}", removeCart)

	api.HandleFunc("POST /auth/login", login) // FakeStore-style auth endpoint
	api.HandleFunc("POST /users", createUser)     // public registration
	api.HandleFunc("GET /users", getAllUsers)     // admin only
	api.HandleFunc("PUT /users/{id}", updateUser) // admin or owner
	api.HandleFunc("DELETE /users/{id}", removeUser)

	mux := http.NewServeMux()
	mux.Handle("/api/", http.StripPrefix("/api", api))
	mux.HandleFunc("/", serveStatic) // built React app + SPA fallback

	addr := ":" + env("PORT", "8080")
	log.Println("HappyCart running on", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

// serveStatic serves the built frontend (web/dist). Any path that isn't a real
// file falls back to index.html so client-side routes (e.g. /admin) still load.
func serveStatic(w http.ResponseWriter, r *http.Request) {
	dir := env("STATIC_DIR", "web/dist")
	index := filepath.Join(dir, "index.html")
	// Clean the request path and resolve it inside the static dir.
	p := filepath.Join(dir, filepath.Clean("/"+r.URL.Path))
	if info, err := os.Stat(p); err != nil || info.IsDir() {
		http.ServeFile(w, r, index) // unknown path → let React Router handle it
		return
	}
	http.ServeFile(w, r, p)
}
