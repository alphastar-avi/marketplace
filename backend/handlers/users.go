package handlers

import (
	"marketplace-backend/config"
	"marketplace-backend/models"
	"marketplace-backend/storage"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetUser returns a user by ID
func GetUser(c *gin.Context) {
	id := c.Param("id")
	userID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var user models.User
	result := config.DB.Preload("College").First(&user, userID)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// CreateUser creates a new user
func CreateUser(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set default college for now
	var defaultCollege models.College
	result := config.DB.First(&defaultCollege)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Default college not found"})
		return
	}
	user.CollegeID = defaultCollege.ID

	// Check if user with email already exists
	var existingUser models.User
	if err := config.DB.Where("email = ?", user.Email).First(&existingUser).Error; err == nil {
		// User exists, return the existing user
		config.DB.Preload("College").First(&existingUser, existingUser.ID)
		c.JSON(http.StatusOK, existingUser)
		return
	}

	result = config.DB.Create(&user)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user", "details": result.Error.Error()})
		return
	}

	// Preload relationships for response
	config.DB.Preload("College").First(&user, user.ID)

	c.JSON(http.StatusCreated, user)
}

// UpdateUser updates an existing user
func UpdateUser(c *gin.Context) {
	id := c.Param("id")
	userID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var user models.User
	result := config.DB.First(&user, userID)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Check Content-Type to determine if this is a multipart request
	contentType := c.GetHeader("Content-Type")

	var updateData models.User
	var avatarURL string

	if len(contentType) > 0 && contentType[:9] == "multipart" {
		// Handle multipart/form-data
		if err := c.Request.ParseMultipartForm(10 << 20); err != nil { // 10 MB limit
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form data"})
			return
		}

		// Update text fields
		updateData.Name = c.PostForm("name")
		updateData.Year = c.PostForm("year")
		updateData.Department = c.PostForm("department")

		// Handle file upload
		file, header, err := c.Request.FormFile("avatar")
		if err == nil {
			defer file.Close()

			// Initialize Azure Blob Storage
			blobStorage, err := storage.NewAzureBlobStorage()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize storage"})
				return
			}

			// Upload file
			avatarURL, err = blobStorage.UploadFile(header, "avatars")
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload avatar"})
				return
			}
			updateData.Avatar = avatarURL
		}
	} else {
		// Handle JSON (legacy support or if no image being uploaded, though frontend will switch to FormData)
		if err := c.ShouldBindJSON(&updateData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	updates := map[string]interface{}{}
	if updateData.Name != "" {
		updates["name"] = updateData.Name
	}
	if updateData.Year != "" {
		updates["year"] = updateData.Year
	}
	if updateData.Department != "" {
		updates["department"] = updateData.Department
	}
	if updateData.Avatar != "" {
		updates["avatar"] = updateData.Avatar
	}

	result = config.DB.Model(&user).Updates(updates)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	// Preload relationships for response
	config.DB.Preload("College").First(&user, user.ID)

	c.JSON(http.StatusOK, user)
}
