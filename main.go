package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
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
	products = client.Database(env("DB_NAME", "happycart")).Collection("products")

	mux := http.NewServeMux()
	mux.HandleFunc("GET /products", getAll)
	mux.HandleFunc("POST /products", create)
	mux.HandleFunc("GET /products/{id}", getOne)
	mux.HandleFunc("PUT /products/{id}", update)
	mux.HandleFunc("DELETE /products/{id}", remove)

	addr := ":" + env("PORT", "8080")
	log.Println("HappyCart API running on", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
