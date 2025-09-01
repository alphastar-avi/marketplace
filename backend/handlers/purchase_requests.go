package handlers

import (
	"net/http"
	"marketplace-backend/config"
	"marketplace-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetPurchaseRequests returns all purchase requests for a user
func GetPurchaseRequests(c *gin.Context) {
	var requests []models.PurchaseRequest
	
	// For now, get all requests (later filter by college/user)
	result := config.DB.Preload("Product").Preload("Buyer").Preload("Seller").Find(&requests)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch purchase requests"})
		return
	}

	c.JSON(http.StatusOK, requests)
}

// CreatePurchaseRequest creates a new purchase request
func CreatePurchaseRequest(c *gin.Context) {
	var request models.PurchaseRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get product to determine college
	var product models.Product
	if err := config.DB.First(&product, request.ProductID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	request.CollegeID = product.CollegeID
	request.Status = "pending"

	result := config.DB.Create(&request)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create purchase request"})
		return
	}

	// Preload relationships for response
	config.DB.Preload("Product").Preload("Buyer").Preload("Seller").First(&request, request.ID)

	c.JSON(http.StatusCreated, request)
}

// UpdatePurchaseRequest updates the status of a purchase request
func UpdatePurchaseRequest(c *gin.Context) {
	id := c.Param("id")
	requestID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	var request models.PurchaseRequest
	result := config.DB.First(&request, requestID)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Purchase request not found"})
		return
	}

	var updateData struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	request.Status = updateData.Status

	result = config.DB.Save(&request)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update purchase request"})
		return
	}

	// If accepted, update product status to sold
	if updateData.Status == "accepted" {
		config.DB.Model(&models.Product{}).Where("id = ?", request.ProductID).Update("status", "sold")
	}

	// Preload relationships for response
	config.DB.Preload("Product").Preload("Buyer").Preload("Seller").First(&request, request.ID)

	c.JSON(http.StatusOK, request)
}
