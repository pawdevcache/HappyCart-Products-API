package main

import (
	"encoding/json"
	"net/http"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// Cart matches the FakeStore API cart shape.
type Cart struct {
	ID       primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	UserID   int                `json:"userId" bson:"userId"`
	Date     string             `json:"date" bson:"date"`
	Products []struct {
		ProductID int `json:"productId" bson:"productId"`
		Quantity  int `json:"quantity" bson:"quantity"`
	} `json:"products" bson:"products"`
}

var carts *mongo.Collection

// GET /carts — list all carts
func getAllCarts(w http.ResponseWriter, r *http.Request) {
	c, cancel := ctx()
	defer cancel()
	cur, err := carts.Find(c, bson.M{})
	if err != nil {
		fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	out := []Cart{}
	if err := cur.All(c, &out); err != nil {
		fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, out)
}

// POST /carts — add a new cart
func createCart(w http.ResponseWriter, r *http.Request) {
	var ct Cart
	if json.NewDecoder(r.Body).Decode(&ct) != nil {
		fail(w, http.StatusBadRequest, "invalid body")
		return
	}
	c, cancel := ctx()
	defer cancel()
	res, err := carts.InsertOne(c, ct)
	if err != nil {
		fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	ct.ID = res.InsertedID.(primitive.ObjectID)
	writeJSON(w, http.StatusCreated, ct)
}

// GET /carts/{id} — get a single cart
func getOneCart(w http.ResponseWriter, r *http.Request) {
	id, ok := objID(w, r)
	if !ok {
		return
	}
	c, cancel := ctx()
	defer cancel()
	var ct Cart
	if carts.FindOne(c, bson.M{"_id": id}).Decode(&ct) != nil {
		fail(w, http.StatusNotFound, "cart not found")
		return
	}
	writeJSON(w, http.StatusOK, ct)
}

// PUT /carts/{id} — update a cart
func updateCart(w http.ResponseWriter, r *http.Request) {
	id, ok := objID(w, r)
	if !ok {
		return
	}
	var ct Cart
	if json.NewDecoder(r.Body).Decode(&ct) != nil {
		fail(w, http.StatusBadRequest, "invalid body")
		return
	}
	ct.ID = id
	c, cancel := ctx()
	defer cancel()
	if _, err := carts.ReplaceOne(c, bson.M{"_id": id}, ct); err != nil {
		fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, ct)
}

// DELETE /carts/{id} — delete a cart
func removeCart(w http.ResponseWriter, r *http.Request) {
	id, ok := objID(w, r)
	if !ok {
		return
	}
	c, cancel := ctx()
	defer cancel()
	res, err := carts.DeleteOne(c, bson.M{"_id": id})
	if err != nil {
		fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	if res.DeletedCount == 0 {
		fail(w, http.StatusNotFound, "cart not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "cart deleted"})
}
