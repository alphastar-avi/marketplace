package handlers

import (
	"net/http"

	"marketplace-backend/config"
	"marketplace-backend/models"

	"github.com/gin-gonic/gin"
)

type createComputeGroupRequest struct {
	Title      string `json:"title" binding:"required"`
	PIN        string `json:"pin" binding:"required"`
	URL        string `json:"url" binding:"required"`
	Dataset    string `json:"dataset" binding:"required"`
	WorkerSize int    `json:"worker_size" binding:"required"`
	Epochs     int    `json:"epochs" binding:"required"`
	BatchSize  int    `json:"batch_size" binding:"required"`
}

type validateTitleRequest struct {
	Title string `json:"title" binding:"required"`
}

type verifyPINRequest struct {
	PIN string `json:"pin" binding:"required"`
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
		Title:      req.Title,
		PIN:        req.PIN,
		URL:        req.URL,
		Dataset:    req.Dataset,
		WorkerSize: req.WorkerSize,
		Epochs:     req.Epochs,
		BatchSize:  req.BatchSize,
		OwnerID:    user.ID,
		CollegeID:  user.CollegeID,
	}

	if err := config.DB.Create(&group).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create compute group. Title might not be unique."})
		return
	}

	config.DB.Preload("Owner").First(&group, group.ID)
	c.JSON(http.StatusCreated, group)
}

// VerifyComputeGroupPIN checks the PIN for a group and returns the group details if valid
func VerifyComputeGroupPIN(c *gin.Context) {
	id := c.Param("id")

	var req verifyPINRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var group models.ComputeGroup
	if err := config.DB.Preload("Owner").First(&group, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Compute group not found"})
		return
	}

	if group.PIN != req.PIN {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Incorrect PIN"})
		return
	}

	// Return the full group details (including URL and params) on successful PIN verification
	c.JSON(http.StatusOK, gin.H{
		"id":          group.ID,
		"title":       group.Title,
		"url":         group.URL,
		"dataset":     group.Dataset,
		"worker_size": group.WorkerSize,
		"epochs":      group.Epochs,
		"batch_size":  group.BatchSize,
		"owner":       group.Owner,
		"owner_id":    group.OwnerID,
		"created_at":  group.CreatedAt,
	})
}

// DeleteComputeGroup deletes a compute group owned by the authenticated user
func DeleteComputeGroup(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	id := c.Param("id")

	var group models.ComputeGroup
	if err := config.DB.First(&group, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Compute group not found"})
		return
	}

	if group.OwnerID != user.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You do not own this group"})
		return
	}

	if err := config.DB.Delete(&group).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete compute group"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Compute group deleted"})
}
