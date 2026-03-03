package handlers

import (
	"marketplace-backend/config"
	"marketplace-backend/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetColleges returns a list of all registered colleges
func GetColleges(c *gin.Context) {
	var colleges []models.College
	if err := config.DB.Find(&colleges).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch colleges"})
		return
	}

	c.JSON(http.StatusOK, colleges)
}
