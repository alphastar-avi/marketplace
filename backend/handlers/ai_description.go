package handlers

import (
	"fmt"
	"log"
	"marketplace-backend/config"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GenerateDescriptionRequest for JSON endpoint
type GenerateDescriptionRequest struct {
	Title     string   `json:"title" binding:"required"`
	Category  string   `json:"category" binding:"required"`
	ImageURLs []string `json:"image_urls,omitempty"`
}

// GenerateDescriptionResponse for API responses
type GenerateDescriptionResponse struct {
	Description    string `json:"description"`
	Model          string `json:"model"`
	ProcessingTime int64  `json:"processing_time_ms"`
}

// GenerateDescriptionWithFiles handles multipart form uploads with images
func GenerateDescriptionWithFiles(c *gin.Context) {
	startTime := time.Now()

	// Parse multipart form (32MB max)
	err := c.Request.ParseMultipartForm(32 << 20) // 32MB
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse multipart form"})
		return
	}

	// Extract title and category
	title := c.PostForm("title")
	category := c.PostForm("category")

	if title == "" || category == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Title and category are required"})
		return
	}

	// Get uploaded files
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to get multipart form"})
		return
	}

	files := form.File["images"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one image is required"})
		return
	}

	// Create temp directory if it doesn't exist
	// Use /tmp in containers (production), or temp/ai-analysis locally (development)
	tempDir := "/tmp/ai-analysis"
	if os.Getenv("GIN_MODE") != "release" {
		// Use local temp directory for development
		tempDir = "temp/ai-analysis"
	}
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create temp directory"})
		return
	}

	// Save files to temp directory
	tempFilePaths, err := saveFilesToTemp(files, tempDir)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to save files: %v", err)})
		return
	}

	// Clean up temp files after processing
	defer cleanupTempFiles(tempFilePaths)

	// Generate description
	log.Printf("🤖 Generating description for: %s (category: %s, images: %d)", title, category, len(tempFilePaths))
	description, model := generateWithTempFiles(title, category, tempFilePaths)
	log.Printf("✅ Generated description using model: %s (length: %d)", model, len(description))

	processingTime := time.Since(startTime).Milliseconds()

	c.JSON(http.StatusOK, GenerateDescriptionResponse{
		Description:    description,
		Model:          model,
		ProcessingTime: processingTime,
	})
}

// GenerateDescription handles JSON requests with image URLs
func GenerateDescription(c *gin.Context) {
	startTime := time.Now()

	var req GenerateDescriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.ImageURLs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one image URL is required"})
		return
	}

	// Generate description
	description, model := generateWithFallback(req.Title, req.Category, req.ImageURLs)

	processingTime := time.Since(startTime).Milliseconds()

	c.JSON(http.StatusOK, GenerateDescriptionResponse{
		Description:    description,
		Model:          model,
		ProcessingTime: processingTime,
	})
}

func generateWithFallback(title, category string, imageURLs []string) (string, string) {
	description, err := config.GenerateProductDescription(title, category, imageURLs)
	if err != nil {
		log.Printf("⚠️  Groq generation failed, using template fallback: %v", err)
		// Fallback to template
		return config.GenerateTemplateDescription(title, category), "template-fallback"
	}

	return description, "groq-vision"
}

func generateWithTempFiles(title, category string, tempFilePaths []string) (string, string) {
	description, err := config.GenerateProductDescriptionFromTempFiles(title, category, tempFilePaths)
	if err != nil {
		log.Printf("⚠️  Groq generation failed, using template fallback: %v", err)
		// Fallback to template
		return config.GenerateTemplateDescription(title, category), "template-fallback"
	}

	log.Printf("✅ Using Groq-generated description")
	return description, "groq-vision"
}

// saveFilesToTemp saves uploaded files to temp directory
func saveFilesToTemp(files []*multipart.FileHeader, tempDir string) ([]string, error) {
	var tempFilePaths []string

	for i, file := range files {
		log.Printf("🤖 Received image for AI analysis: %s (%d bytes)", file.Filename, file.Size)
		// Validate file type
		ext := strings.ToLower(filepath.Ext(file.Filename))
		allowedExts := []string{".jpg", ".jpeg", ".png", ".webp", ".gif"}
		allowed := false
		for _, allowedExt := range allowedExts {
			if ext == allowedExt {
				allowed = true
				break
			}
		}
		if !allowed {
			log.Printf("⚠️  Skipping file %s: invalid extension '%s'", file.Filename, ext)
			continue // Skip invalid files
		}

		// Generate unique filename
		uniqueID := uuid.New().String()
		tempFileName := fmt.Sprintf("ai_image_%s_%d%s", uniqueID, i, ext)
		tempFilePath := filepath.Join(tempDir, tempFileName)

		// Open uploaded file
		src, err := file.Open()
		if err != nil {
			cleanupTempFiles(tempFilePaths)
			return nil, err
		}

		// Create destination file
		dst, err := os.Create(tempFilePath)
		if err != nil {
			src.Close()
			cleanupTempFiles(tempFilePaths)
			return nil, err
		}

		// Copy file contents
		if _, err = dst.ReadFrom(src); err != nil {
			src.Close()
			dst.Close()
			cleanupTempFiles(tempFilePaths)
			return nil, err
		}

		src.Close()
		dst.Close()
		tempFilePaths = append(tempFilePaths, tempFilePath)
	}

	return tempFilePaths, nil
}

// cleanupTempFiles removes temp files
func cleanupTempFiles(filePaths []string) {
	for _, filePath := range filePaths {
		os.Remove(filePath)
	}
}

// GetAIStatus returns AI service availability
func GetAIStatus(c *gin.Context) {
	isConfigured := config.IsGroqConfigured()

	c.JSON(http.StatusOK, gin.H{
		"groq_configured": isConfigured,
		"status": func() string {
			if isConfigured {
				return "available"
			}
			return "template_only"
		}(),
		"models_available": []string{"groq-vision", "template-fallback"},
	})
}

// TestFileUpload debugging endpoint
func TestFileUpload(c *gin.Context) {
	err := c.Request.ParseMultipartForm(32 << 20) // 32MB
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse multipart form"})
		return
	}

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to get multipart form"})
		return
	}

	files := form.File["images"]

	c.JSON(http.StatusOK, gin.H{
		"files_received": len(files),
		"files": func() []map[string]interface{} {
			result := []map[string]interface{}{}
			for _, file := range files {
				result = append(result, map[string]interface{}{
					"filename": file.Filename,
					"size":     file.Size,
				})
			}
			return result
		}(),
	})
}
