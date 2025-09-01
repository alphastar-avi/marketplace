package handlers

import (
	"net/http"
	"marketplace-backend/config"
	"marketplace-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetFavorites returns all favorites for a user
func GetFavorites(c *gin.Context) {
	userID := c.Query("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id query parameter required"})
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		// Handle legacy string IDs from frontend - return empty array
		c.JSON(http.StatusOK, []models.Favorite{})
		return
	}

	var favorites []models.Favorite
	result := config.DB.Preload("Product.Seller").Where("user_id = ?", userUUID).Find(&favorites)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch favorites"})
		return
	}

	c.JSON(http.StatusOK, favorites)
}

// CreateFavorite adds a product to user's favorites
func CreateFavorite(c *gin.Context) {
	productID := c.Param("id")
	productUUID, err := uuid.Parse(productID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	var requestData struct {
		UserID uuid.UUID `json:"user_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if already favorited
	var existing models.Favorite
	if config.DB.Where("user_id = ? AND product_id = ?", requestData.UserID, productUUID).First(&existing).Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Product already favorited"})
		return
	}

	favorite := models.Favorite{
		UserID:    requestData.UserID,
		ProductID: productUUID,
	}

	result := config.DB.Create(&favorite)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create favorite"})
		return
	}

	c.JSON(http.StatusCreated, favorite)
}

// DeleteFavorite removes a product from user's favorites
func DeleteFavorite(c *gin.Context) {
	productID := c.Param("id")
	productUUID, err := uuid.Parse(productID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	userID := c.Query("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id query parameter required"})
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	result := config.DB.Where("user_id = ? AND product_id = ?", userUUID, productUUID).Delete(&models.Favorite{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove favorite"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Favorite not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Favorite removed successfully"})
}
