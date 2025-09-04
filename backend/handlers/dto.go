package handlers

import (
	"encoding/json"
	"marketplace-backend/models"
	"github.com/google/uuid"
)

// ProductDTO for API requests/responses with proper array handling
type ProductDTO struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Price       float64  `json:"price"`
	Description string   `json:"description"`
	Images      []string `json:"images"`
	Condition   string   `json:"condition"`
	Category    string   `json:"category"`
	Tags        []string `json:"tags"`
	Status      string   `json:"status"`
	SellerID    string   `json:"sellerId"`
	PostedAt    string   `json:"postedAt"`
	Seller      *SellerDTO `json:"seller,omitempty"`
}

// SellerDTO for seller information in product responses
type SellerDTO struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Email      string `json:"email"`
	Year       string `json:"year"`
	Department string `json:"department"`
	Avatar     string `json:"avatar"`
}

// CreateProductRequest for handling product creation
type CreateProductRequest struct {
	Title       string   `json:"title" binding:"required"`
	Price       float64  `json:"price" binding:"required"`
	Description string   `json:"description"`
	Images      []string `json:"images"`
	Condition   string   `json:"condition" binding:"required"`
	Category    string   `json:"category" binding:"required"`
	Tags        []string `json:"tags"`
}

// ToModel converts ProductDTO to database model
func (dto *ProductDTO) ToModel() (*models.Product, error) {
	imagesJSON, _ := json.Marshal(dto.Images)
	tagsJSON, _ := json.Marshal(dto.Tags)
	
	sellerID, err := uuid.Parse(dto.SellerID)
	if err != nil {
		return nil, err
	}

	return &models.Product{
		Title:       dto.Title,
		Price:       dto.Price,
		Description: dto.Description,
		Images:      string(imagesJSON),
		Condition:   dto.Condition,
		Category:    dto.Category,
		Tags:        string(tagsJSON),
		Status:      dto.Status,
		SellerID:    sellerID,
	}, nil
}

// FromModel converts database model to ProductDTO
func ProductDTOFromModel(product *models.Product) *ProductDTO {
	var images []string
	var tags []string
	
	json.Unmarshal([]byte(product.Images), &images)
	json.Unmarshal([]byte(product.Tags), &tags)
	
	dto := &ProductDTO{
		ID:          product.ID.String(),
		Title:       product.Title,
		Price:       product.Price,
		Description: product.Description,
		Images:      images,
		Condition:   product.Condition,
		Category:    product.Category,
		Tags:        tags,
		Status:      product.Status,
		SellerID:    product.SellerID.String(),
		PostedAt:    product.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
	}
	
	// Include seller information if available
	if product.Seller.ID != uuid.Nil {
		dto.Seller = &SellerDTO{
			ID:         product.Seller.ID.String(),
			Name:       product.Seller.Name,
			Email:      product.Seller.Email,
			Year:       product.Seller.Year,
			Department: product.Seller.Department,
			Avatar:     product.Seller.Avatar,
		}
	}
	
	return dto
}
