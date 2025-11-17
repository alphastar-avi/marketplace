package handlers

import (
	"fmt"
	"marketplace-backend/storage"
	"net/http"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

// UploadFile handles file uploads to Azure Blob Storage
func UploadFile(c *gin.Context) {
	// Single file
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file is received"})
		return
	}

	// Initialize Azure Blob Storage client
	blobStorage, err := storage.NewAzureBlobStorage()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize storage"})
		return
	}

	// Upload the file
	fileURL, err := blobStorage.UploadFile(file, "products")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to upload file: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "File uploaded successfully",
		"url":      fileURL,
	})
}

// UploadMultiple handles multiple file uploads to Azure Blob Storage
func UploadMultiple(c *gin.Context) {
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid form data"})
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No files received"})
		return
	}

	// Initialize Azure Blob Storage client
	blobStorage, err := storage.NewAzureBlobStorage()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize storage"})
		return
	}

	var fileURLs []string
	for _, file := range files {
		// Upload the file
		fileURL, err := blobStorage.UploadFile(file, "products")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": fmt.Sprintf("Failed to upload file %s: %v", file.Filename, err),
			})
			return
		}
		fileURLs = append(fileURLs, fileURL)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Files uploaded successfully",
		"urls":    fileURLs,
		"count":   len(fileURLs),
	})
}

// DeleteFile handles file deletion from Azure Blob Storage
func DeleteFile(c *gin.Context) {
	// Get file URL from request
	var req struct {
		URL string `json:"url" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Initialize Azure Blob Storage client
	blobStorage, err := storage.NewAzureBlobStorage()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize storage"})
		return
	}

	// Delete the file
	err = blobStorage.DeleteFile(req.URL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to delete file: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "File deleted successfully",
	})
}

// getFileExtension returns the file extension from a filename
func getFileExtension(filename string) string {
	ext := filepath.Ext(filename)
	if ext == "" {
		return ""
	}
	return ext[1:] // Remove the dot
}
