package handlers

import (
	"encoding/json"
	"fmt"
	"marketplace-backend/config"
	"marketplace-backend/models"
	"marketplace-backend/storage"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// GetProducts returns all products for a college
func GetProducts(c *gin.Context) {
	var products []models.Product
	// Get authenticated user ID
	userID, exists := c.Get("userID")
	if !exists {
		// Return empty list for unauthenticated viewers
		c.JSON(http.StatusOK, []ProductDTO{})
		return
	}

	// Fetch user's CollegeID
	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	// Filter products strictly by the user's college and exclude archived unless owned by user
	query := config.DB.Where("college_id = ? AND (is_archived = false OR seller_id = ?)", user.CollegeID, user.ID)
	result := query.Preload("Seller").Preload("College").Order("created_at desc").Find(&products)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch products"})
		return
	}

	// Convert to DTOs
	var productDTOs []ProductDTO
	for _, product := range products {
		productDTOs = append(productDTOs, *ProductDTOFromModel(&product))
	}

	// Return empty array instead of null if no products
	if len(productDTOs) == 0 {
		c.JSON(http.StatusOK, []ProductDTO{})
		return
	}

	c.JSON(http.StatusOK, productDTOs)
}

// GetProduct returns a single product by ID
func GetProduct(c *gin.Context) {
	id := c.Param("id")
	productID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	var product models.Product
	result := config.DB.Preload("Seller").Preload("College").First(&product, productID)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	// Convert to DTO to include seller information
	responseDTO := ProductDTOFromModel(&product)
	c.JSON(http.StatusOK, responseDTO)
}

// CreateProduct creates a new product
func CreateProduct(c *gin.Context) {
	// Get authenticated user ID
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Parse the multipart form
	if err := c.Request.ParseMultipartForm(32 << 20); err != nil { // 32 MB max memory
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Failed to parse form data: %v", err)})
		return
	}

	// Get form values
	req := CreateProductRequest{
		Title:       c.PostForm("title"),
		Description: c.PostForm("description"),
		Condition:   c.PostForm("condition"),
		Category:    c.PostForm("category"),
	}

	// Parse price
	priceStr := c.PostForm("price")
	price := 0.0
	if priceStr != "" {
		_, err := fmt.Sscanf(priceStr, "%f", &price)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid price format"})
			return
		}
	}
	req.Price = price

	// Parse tags
	tags := c.PostForm("tags")
	if tags != "" {
		err := json.Unmarshal([]byte(tags), &req.Tags)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tags format"})
			return
		}
	}

	// Get user's college
	var user models.User
	if err := config.DB.Preload("College").First(&user, userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User not found"})
		return
	}

	// Handle file uploads
	form, _ := c.MultipartForm()
	files := form.File["images"]
	imageURLs := []string{}

	if len(files) > 0 {
		// Initialize Azure Blob Storage client
		blobStorage, err := storage.NewAzureBlobStorage()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize storage"})
			return
		}

		// Upload each file
		for _, file := range files {
			fileURL, err := blobStorage.UploadFile(file, "products")
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": fmt.Sprintf("Failed to upload file %s: %v", file.Filename, err),
				})
				return
			}
			imageURLs = append(imageURLs, fileURL)
		}
	}

	// Convert arrays to JSON strings
	imagesJSON, _ := json.Marshal(imageURLs)
	tagsJSON, _ := json.Marshal(req.Tags)

	product := models.Product{
		Title:       req.Title,
		Price:       req.Price,
		Description: req.Description,
		Images:      string(imagesJSON),
		Condition:   req.Condition,
		Category:    req.Category,
		Tags:        string(tagsJSON),
		Status:      "available",
		SellerID:    user.ID,
		CollegeID:   user.CollegeID,
	}

	result := config.DB.Create(&product)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product"})
		return
	}

	// Preload relationships for response
	config.DB.Preload("Seller").Preload("College").First(&product, product.ID)

	responseDTO := ProductDTOFromModel(&product)
	c.JSON(http.StatusCreated, responseDTO)
}

// UpdateProduct updates an existing product
func UpdateProduct(c *gin.Context) {
	// Get authenticated user ID
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	id := c.Param("id")
	productID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	var product models.Product
	result := config.DB.First(&product, productID)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	// Check if user owns this product
	if product.SellerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only update your own products"})
		return
	}

	var updateData models.Product
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update only provided fields
	result = config.DB.Model(&product).Updates(updateData)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product"})
		return
	}

	// Preload relationships for response
	config.DB.Preload("Seller").Preload("College").First(&product, product.ID)

	c.JSON(http.StatusOK, product)
}

// ArchiveProduct soft-deletes a product by setting is_archived to true
func ArchiveProduct(c *gin.Context) {
	// Get authenticated user ID
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	id := c.Param("id")
	productID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	var product models.Product
	result := config.DB.First(&product, productID)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	// Check if user owns this product
	if product.SellerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only archive your own products"})
		return
	}

	if product.IsArchived {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Product is already archived"})
		return
	}

	// Soft delete / archive
	now := time.Now()
	product.IsArchived = true
	product.ArchivedAt = &now
	if err := config.DB.Save(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to archive product"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Product archived successfully"})
}

// HardDeleteProduct completely removes a product and all of its dependencies
func HardDeleteProduct(db *gorm.DB, productID uuid.UUID) error {
	return db.Transaction(func(tx *gorm.DB) error {
		// 1. Get and delete chats + messages associated with the product
		var chats []models.Chat
		if err := tx.Where("product_id = ?", productID).Find(&chats).Error; err != nil {
			return err
		}

		for _, chat := range chats {
			if err := tx.Where("chat_id = ?", chat.ID).Delete(&models.Message{}).Error; err != nil {
				return err
			}
			if err := tx.Model(&chat).Association("Participants").Clear(); err != nil {
				return err
			}
			if err := tx.Delete(&chat).Error; err != nil {
				return err
			}
		}

		// 2. Delete purchase requests and favorites
		if err := tx.Where("product_id = ?", productID).Delete(&models.PurchaseRequest{}).Error; err != nil {
			return err
		}
		if err := tx.Where("product_id = ?", productID).Delete(&models.Favorite{}).Error; err != nil {
			return err
		}

		// 3. Delete the product itself
		if err := tx.Where("id = ?", productID).Delete(&models.Product{}).Error; err != nil {
			return err
		}

		return nil
	})
}
