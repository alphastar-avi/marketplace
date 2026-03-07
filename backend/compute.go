package handlers

import (
	"net/http"

	"marketplace-backend/config"
	"marketplace-backend/models"

	"github.com/gin-gonic/gin"
)

type createComputeGroupRequest struct {
	Title string `json:"title" binding:"required"`
}

type validateTitleRequest struct {
	Title string `json:"title" binding:"required"`
}

// GetComputeGroups fetches all groups for the authenticated user's college
func GetComputeGroups(c *gin.Context) {
	var groups []models.ComputeGroup

	query := config.DB.Preload("Owner").Order("created_at DESC")

	if userID, exists := c.Get("userID"); exists {
		var user models.User
		if err := config.DB.First(&user, userID).Error; err == nil {
			query = query.Where("college_id = ?", user.CollegeID)
		}
	}

	if err := query.Find(&groups).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch compute groups"})
		return
	}

	c.JSON(http.StatusOK, groups)
}

// ValidateComputeTitle checks if a compute group title is unique
func ValidateComputeTitle(c *gin.Context) {
	var req validateTitleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var count int64
	config.DB.Model(&models.ComputeGroup{}).Where("title = ?", req.Title).Count(&count)

	c.JSON(http.StatusOK, gin.H{
		"available": count == 0,
	})
}

// CreateComputeGroup creates a new compute group
func CreateComputeGroup(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req createComputeGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	group := models.ComputeGroup{
		Title:     req.Title,
		OwnerID:   user.ID,
		CollegeID: user.CollegeID,
	}

	if err := config.DB.Create(&group).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create compute group. Title might not be unique."})
		return
q	}

	config.DB.Preload("Owner").First(&group, group.ID)
	c.JSON(http.StatusCreated, group)
}
