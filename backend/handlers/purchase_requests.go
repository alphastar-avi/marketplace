package handlers

import (
	"fmt"
	"net/http"
	"marketplace-backend/config"
	"marketplace-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetPurchaseRequests returns all purchase requests scoped to the authenticated user
func GetPurchaseRequests(c *gin.Context) {
	userID, exists := userFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var requests []models.PurchaseRequest
	result := config.DB.
		Preload("Product").
		Preload("Buyer").
		Preload("Seller").
		Where("buyer_id = ? OR seller_id = ?", userID, userID).
		Order("created_at DESC").
		Find(&requests)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch purchase requests"})
		return
	}

	c.JSON(http.StatusOK, requests)
}

// CreatePurchaseRequest creates a new purchase request and wires up the chat context
func CreatePurchaseRequest(c *gin.Context) {
	userID, exists := userFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var payload struct {
		ProductID uuid.UUID `json:"product_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var product models.Product
	if err := config.DB.Preload("Seller").First(&product, payload.ProductID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	if product.SellerID == userID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You cannot request your own product"})
		return
	}

	var buyer models.User
	if err := config.DB.First(&buyer, userID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Your account could not be found. Please login again."})
		return
	}

	var seller models.User
	if err := config.DB.First(&seller, product.SellerID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Seller not found"})
		return
	}

	collegeID := product.CollegeID
	if collegeID == uuid.Nil {
		collegeID = buyer.CollegeID
		if collegeID == uuid.Nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Unable to determine college for this request"})
			return
		}
	}

	// Reuse existing pending request if one already exists for this buyer/product
	var existing models.PurchaseRequest
	if err := config.DB.
		Where("product_id = ? AND buyer_id = ? AND status = ?", product.ID, userID, "pending").
		Preload("Product").
		Preload("Buyer").
		Preload("Seller").
		First(&existing).Error; err == nil {
		chat, _, chatErr := ensureChatForProduct(product, []uuid.UUID{existing.BuyerID, existing.SellerID})
		var chatID *uuid.UUID
		if chatErr == nil && chat != nil {
			chatID = &chat.ID
		}

		c.JSON(http.StatusOK, gin.H{
			"request": existing,
			"chat_id": chatID,
		})
		return
	}

	request := models.PurchaseRequest{
		ProductID: product.ID,
		BuyerID:   buyer.ID,
		SellerID:  seller.ID,
		CollegeID: collegeID,
		Status:    "pending",
	}

	if err := config.DB.Create(&request).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create purchase request"})
		return
	}

	config.DB.Preload("Product").Preload("Buyer").Preload("Seller").First(&request, request.ID)

	chat, _, err := ensureChatForProduct(product, []uuid.UUID{request.BuyerID, request.SellerID})
	var chatID *uuid.UUID
	if err == nil && chat != nil {
		chatID = &chat.ID
		buyerName := request.Buyer.Name
		if buyerName == "" {
			buyerName = "Buyer"
		}
		messageText := fmt.Sprintf("📩 %s requested \"%s\" for ₹%.2f", buyerName, product.Title, product.Price)
		config.DB.Create(&models.Message{
			ChatID: chat.ID,
			FromID: request.BuyerID,
			Text:   messageText,
		})
	}

	c.JSON(http.StatusCreated, gin.H{
		"request": request,
		"chat_id": chatID,
	})
}

// UpdatePurchaseRequest updates the status of a purchase request
func UpdatePurchaseRequest(c *gin.Context) {
	userID, exists := userFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	id := c.Param("id")
	requestID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	var request models.PurchaseRequest
	result := config.DB.Preload("Product").First(&request, requestID)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Purchase request not found"})
		return
	}

	if request.SellerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the seller can update this request"})
		return
	}

	var updateData struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if updateData.Status != "accepted" && updateData.Status != "declined" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status must be accepted or declined"})
		return
	}

	request.Status = updateData.Status

	if err := config.DB.Save(&request).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update purchase request"})
		return
	}

	// If accepted, update product status to sold
	if updateData.Status == "accepted" {
		config.DB.Model(&models.Product{}).Where("id = ?", request.ProductID).Update("status", "sold")
	}

	config.DB.Preload("Product").Preload("Buyer").Preload("Seller").First(&request, request.ID)

	chat, _, err := ensureChatForProduct(request.Product, []uuid.UUID{request.BuyerID, request.SellerID})
	if err == nil && chat != nil {
		statusText := "declined"
		if updateData.Status == "accepted" {
			statusText = "accepted"
		}
		messageText := fmt.Sprintf("📣 Seller %s the request for \"%s\".", statusText, request.Product.Title)
		config.DB.Create(&models.Message{
			ChatID: chat.ID,
			FromID: userID,
			Text:   messageText,
		})
	}

	c.JSON(http.StatusOK, request)
}
