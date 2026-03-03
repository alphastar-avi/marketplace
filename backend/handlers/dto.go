package handlers

import (
	"encoding/json"
	"marketplace-backend/models"
	"time"

	"github.com/google/uuid"
)

// ProductDTO for API requests/responses with proper array handling
type ProductDTO struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Price       float64    `json:"price"`
	Description string     `json:"description"`
	Images      []string   `json:"images"`
	Condition   string     `json:"condition"`
	Category    string     `json:"category"`
	Tags        []string   `json:"tags"`
	Status      string     `json:"status"`
	SellerID    string     `json:"sellerId"`
	PostedAt    string     `json:"postedAt"`
	Seller      *SellerDTO `json:"seller,omitempty"`
}

func sellerDTOFromUser(user *models.User) *SellerDTO {
	if user == nil || user.ID == uuid.Nil {
		return nil
	}
	return &SellerDTO{
		ID:         user.ID.String(),
		Name:       user.Name,
		Email:      user.Email,
		Year:       user.Year,
		Department: user.Department,
		Avatar:     user.Avatar,
	}
}

// CarpoolRideDTOFromModel converts a ride model into API DTO
func CarpoolRideDTOFromModel(ride *models.CarpoolRide) *CarpoolRideDTO {
	participants := []*SellerDTO{}
	for _, participant := range ride.Participants {
		p := participant // copy
		participants = append(participants, sellerDTOFromUser(&p))
	}

	joinRequests := []*CarpoolJoinRequestDTO{}
	for _, jr := range ride.JoinRequests {
		jrCopy := jr
		joinRequests = append(joinRequests, CarpoolJoinRequestDTOFromModel(&jrCopy))
	}

	var chatID string
	if ride.ChatID != nil {
		chatID = ride.ChatID.String()
	}

	return &CarpoolRideDTO{
		ID:             ride.ID.String(),
		Destination:    ride.Destination,
		PickupPoint:    ride.PickupPoint,
		Capacity:       ride.Capacity,
		SeatsAvailable: ride.SeatsAvailable,
		DepartureDate:  ride.DepartureDate.Format("2006-01-02"),
		DepartureTime:  ride.DepartureTime,
		Direction:      ride.Direction,
		Description:    ride.Description,
		Owner:          sellerDTOFromUser(&ride.Owner),
		Participants:   participants,
		ChatID:         chatID,
		JoinRequests:   joinRequests,
		CreatedAt:      ride.CreatedAt.Format(time.RFC3339),
	}
}

// CarpoolJoinRequestDTOFromModel converts join request model
func CarpoolJoinRequestDTOFromModel(req *models.CarpoolJoinRequest) *CarpoolJoinRequestDTO {
	return &CarpoolJoinRequestDTO{
		ID:        req.ID.String(),
		RideID:    req.RideID.String(),
		Requester: sellerDTOFromUser(&req.Requester),
		Status:    req.Status,
		CreatedAt: req.CreatedAt.Format(time.RFC3339),
	}
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

// CarpoolRideDTO represents a ride payload for API responses
type CarpoolRideDTO struct {
	ID             string                   `json:"id"`
	Destination    string                   `json:"destination"`
	PickupPoint    string                   `json:"pickupPoint"`
	Capacity       int                      `json:"capacity"`
	SeatsAvailable int                      `json:"seatsAvailable"`
	DepartureDate  string                   `json:"departureDate"`
	DepartureTime  string                   `json:"departureTime"`
	Direction      string                   `json:"direction"`
	Description    string                   `json:"description"`
	Owner          *SellerDTO               `json:"owner"`
	Participants   []*SellerDTO             `json:"participants"`
	ChatID         string                   `json:"chatId,omitempty"`
	JoinRequests   []*CarpoolJoinRequestDTO `json:"joinRequests,omitempty"`
	CreatedAt      string                   `json:"createdAt"`
}

// CarpoolJoinRequestDTO represents join request payloads
type CarpoolJoinRequestDTO struct {
	ID        string     `json:"id"`
	RideID    string     `json:"rideId"`
	Requester *SellerDTO `json:"requester"`
	Status    string     `json:"status"`
	CreatedAt string     `json:"createdAt"`
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
	images := []string{}
	tags := []string{}

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
