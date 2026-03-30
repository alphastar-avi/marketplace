package main

import (
	"log"
	"marketplace-backend/config"
	"marketplace-backend/handlers"
	"marketplace-backend/models"
	"marketplace-backend/routes"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Connect to database
	config.ConnectDatabase()

	// Start background cleanup job for archived products
	StartCleanupJob()

	// Create Gin router
	r := gin.Default()

	// Configure CORS - Updated for Azure Static Web Apps
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{
			"http://localhost:5173", 
			"http://localhost:3000",
			"https://green-mud-0476ecf00.1.azurestaticapps.net", // Azure Static Web App
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * 3600, // 12 hours
	}))

	// Debug CORS
	r.Use(func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" {
			log.Printf("🔍 CORS Request - Origin: %s, Method: %s, Path: %s", origin, c.Request.Method, c.Request.URL.Path)
		}
		c.Next()
	})

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "Marketplace API is running",
		})
	})

	// Setup API routes
	routes.SetupRoutes(r)

	// Start server
	port := "8080"
	log.Printf("Server starting on port %s with CORS enabled", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

// StartCleanupJob runs a background go routine that checks once every 24 hours
// for any products that have been archived for more than 30 days and hard deletes them.
func StartCleanupJob() {
	go func() {
		for {
			log.Println("Running background cleanup job for archived products...")
			cleanupArchivedProducts()
			
			// Run once every 24 hours
			time.Sleep(24 * time.Hour)
		}
	}()
}

func cleanupArchivedProducts() {
	// Find all products where is_archived = true and archived_at is older than 30 days
	thirtyDaysAgo := time.Now().Add(-30 * 24 * time.Hour)
	
	var oldArchivedProducts []models.Product
	if err := config.DB.Where("is_archived = ? AND archived_at < ?", true, thirtyDaysAgo).Find(&oldArchivedProducts).Error; err != nil {
		log.Printf("Cleanup Job Error: Failed to fetch archived products: %v\n", err)
		return
	}

	if len(oldArchivedProducts) == 0 {
		return
	}

	log.Printf("Cleanup Job: Found %d products to permanently delete.\n", len(oldArchivedProducts))

	for _, product := range oldArchivedProducts {
		if err := handlers.HardDeleteProduct(config.DB, product.ID); err != nil {
			log.Printf("Cleanup Job Error: Failed to hard delete product %s: %v\n", product.ID, err)
		} else {
			log.Printf("Cleanup Job: Automatically deleted archived product %s\n", product.ID)
		}
	}
}
