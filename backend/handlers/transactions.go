package handlers

import (
	"marketplace-backend/config"
	"marketplace-backend/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CreateTransactionInput struct {
	ProductID string  `json:"product_id" binding:"required"`
	BuyerID   string  `json:"buyer_id" binding:"required"`
	Amount    float64 `json:"amount" binding:"required"`
}

// CreateTransaction creates a new pending transaction
func CreateTransaction(c *gin.Context) {
	var input CreateTransactionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	sellerID := userId.(uuid.UUID)

	productID, err := uuid.Parse(input.ProductID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	buyerID, err := uuid.Parse(input.BuyerID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid buyer ID"})
		return
	}

	// Verify product exists and seller aligns
	var product models.Product
	if err := config.DB.First(&product, "id = ?", productID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	if product.SellerID != sellerID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the seller can request payment"})
		return
	}

	if product.Status == "sold" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Product is already sold"})
		return
	}

	var buyer models.User
	if err := config.DB.First(&buyer, "id = ?", buyerID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Buyer not found"})
		return
	}

	transaction := models.Transaction{
		ProductID: product.ID,
		BuyerID:   buyer.ID,
		SellerID:  sellerID,
		CollegeID: product.CollegeID,
		Amount:    input.Amount,
		Status:    "pending",
	}

	if err := config.DB.Create(&transaction).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create transaction"})
		return
	}

	c.JSON(http.StatusCreated, transaction)
}

// CompleteTransaction marks a transaction as successful and updates the product
func CompleteTransaction(c *gin.Context) {
	id := c.Param("id")

	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	sellerID := userId.(uuid.UUID)

	var transaction models.Transaction
	if err := config.DB.First(&transaction, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	if transaction.SellerID != sellerID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the seller can confirm payment"})
		return
	}

	if transaction.Status == "successful" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Transaction is already completed"})
		return
	}

	// Update transaction
	transaction.Status = "successful"
	if err := config.DB.Save(&transaction).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update transaction"})
		return
	}

	// Update product status
	var product models.Product
	if err := config.DB.First(&product, "id = ?", transaction.ProductID).Error; err == nil {
		product.Status = "sold"
		config.DB.Save(&product)
	}

	c.JSON(http.StatusOK, transaction)
}
