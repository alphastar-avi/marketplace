package handlers

import (
	"encoding/json"
	"net/http"
	"marketplace-backend/config"
	"marketplace-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetProducts returns all products for a college
func GetProducts(c *gin.Context) {
	var products []models.Product
	
	// For now, get all products (later filter by college)
	result := config.DB.Preload("Seller").Preload("College").Find(&products)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch products"})
		return
	}

	// Convert to DTOs
	var productDTOs []ProductDTO
	for _, product := range products {
		productDTOs = append(productDTOs, *ProductDTOFromModel(&product))
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

	c.JSON(http.StatusOK, product)
}

// CreateProduct creates a new product
func CreateProduct(c *gin.Context) {
	var req CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sellerID, err := uuid.Parse(req.SellerID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid seller ID"})
		return
	}

	// Convert arrays to JSON strings
	imagesJSON, _ := json.Marshal(req.Images)
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
		SellerID:    sellerID,
	}

	// Set default college for now (later get from user context)
	var defaultCollege models.College
	config.DB.First(&defaultCollege)
	product.CollegeID = defaultCollege.ID

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

// DeleteProduct deletes a product
func DeleteProduct(c *gin.Context) {
	id := c.Param("id")
	productID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	result := config.DB.Delete(&models.Product{}, productID)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete product"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Product deleted successfully"})
}
