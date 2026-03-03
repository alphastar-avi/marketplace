package handlers

import (
	"errors"
	"net/http"
	"time"

	"marketplace-backend/config"
	"marketplace-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type createCarpoolRideRequest struct {
	Title         string `json:"title" binding:"required"`
	Destination   string `json:"destination" binding:"required"`
	PickupPoint   string `json:"pickupPoint" binding:"required"`
	Capacity      int    `json:"capacity" binding:"required,min=1"`
	DepartureDate string `json:"departureDate" binding:"required"`
	DepartureTime string `json:"departureTime" binding:"required"`
	Direction     string `json:"direction" binding:"required,oneof=to_college from_college"`
	Description   string `json:"description"`
}

type updateJoinRequestStatus struct {
	Status string `json:"status" binding:"required,oneof=accepted declined"`
}

// GetCarpoolRides lists rides - filters by college if authenticated, returns all if not
func GetCarpoolRides(c *gin.Context) {
	var rides []models.CarpoolRide

	query := config.DB.
		Preload("Owner").
		Preload("Participants").
		Preload("JoinRequests.Requester").
		Order("created_at DESC")

	// If authenticated, filter to user's college only
	if userID, exists := c.Get("userID"); exists {
		var user models.User
		if err := config.DB.First(&user, userID).Error; err == nil {
			query = query.Where("college_id = ?", user.CollegeID)
		}
	}

	if err := query.Find(&rides).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch rides"})
		return
	}

	dtos := make([]*CarpoolRideDTO, 0, len(rides))
	for idx := range rides {
		dtos = append(dtos, CarpoolRideDTOFromModel(&rides[idx]))
	}

	c.JSON(http.StatusOK, dtos)
}

// GetCarpoolRide returns a single ride
func GetCarpoolRide(c *gin.Context) {
	rideID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ride ID"})
		return
	}

	var ride models.CarpoolRide
	if err := config.DB.
		Preload("Owner").
		Preload("Participants").
		Preload("JoinRequests.Requester").
		First(&ride, rideID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ride not found"})
		return
	}

	c.JSON(http.StatusOK, CarpoolRideDTOFromModel(&ride))
}

// CreateCarpoolRide creates a new ride offering
func CreateCarpoolRide(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req createCarpoolRideRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	departureDate, err := time.Parse("2006-01-02", req.DepartureDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid departure date"})
		return
	}

	ride := models.CarpoolRide{
		Title:          req.Title,
		Destination:    req.Destination,
		PickupPoint:    req.PickupPoint,
		Capacity:       req.Capacity,
		SeatsAvailable: req.Capacity,
		DepartureDate:  departureDate,
		DepartureTime:  req.DepartureTime,
		Direction:      req.Direction,
		Description:    req.Description,
		OwnerID:        user.ID,
		CollegeID:      user.CollegeID,
	}

	err = config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&ride).Error; err != nil {
			return err
		}

		chat := models.Chat{
			CarpoolRideID: &ride.ID,
			CollegeID:     user.CollegeID,
		}
		if err := tx.Create(&chat).Error; err != nil {
			return err
		}

		if err := tx.Model(&chat).Association("Participants").Append(user); err != nil {
			return err
		}

		ride.ChatID = &chat.ID
		if err := tx.Save(&ride).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create ride"})
		return
	}

	config.DB.Preload("Owner").Preload("Participants").Preload("JoinRequests.Requester").First(&ride, ride.ID)
	c.JSON(http.StatusCreated, CarpoolRideDTOFromModel(&ride))
}

// CreateCarpoolJoinRequest lets a user request to join a ride
func CreateCarpoolJoinRequest(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	rideID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ride ID"})
		return
	}

	var ride models.CarpoolRide
	if err := config.DB.Preload("JoinRequests").First(&ride, rideID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ride not found"})
		return
	}

	if ride.OwnerID == user.ID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You cannot join your own ride"})
		return
	}

	for _, req := range ride.JoinRequests {
		if req.RequesterID == user.ID && req.Status == "pending" {
			c.JSON(http.StatusConflict, gin.H{"error": "Request already pending"})
			return
		}
	}

	if ride.SeatsAvailable <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ride is full"})
		return
	}

	joinReq := models.CarpoolJoinRequest{
		RideID:      ride.ID,
		RequesterID: user.ID,
		Status:      "pending",
	}

	if err := config.DB.Create(&joinReq).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	config.DB.Preload("Requester").First(&joinReq, joinReq.ID)
	c.JSON(http.StatusCreated, CarpoolJoinRequestDTOFromModel(&joinReq))
}

// UpdateCarpoolJoinRequest updates a request's status (owner only)
func UpdateCarpoolJoinRequest(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	reqID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	var input updateJoinRequestStatus
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var joinReq models.CarpoolJoinRequest
	if err := config.DB.Preload("Ride").Preload("Requester").First(&joinReq, reqID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found"})
		return
	}

	if joinReq.Ride.OwnerID != user.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only ride owner can update requests"})
		return
	}

	if joinReq.Status == input.Status {
		c.JSON(http.StatusOK, CarpoolJoinRequestDTOFromModel(&joinReq))
		return
	}

	err = config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&joinReq).Update("status", input.Status).Error; err != nil {
			return err
		}

		if input.Status == "accepted" {
			if joinReq.Ride.SeatsAvailable <= 0 {
				return errors.New("no seats available")
			}

			if err := tx.Model(&joinReq.Ride).UpdateColumn("seats_available", gorm.Expr("seats_available - 1")).Error; err != nil {
				return err
			}

			if err := tx.Model(&joinReq.Ride).Association("Participants").Append(&joinReq.Requester); err != nil {
				return err
			}

			// ensure chat exists
			if joinReq.Ride.ChatID == nil {
				chat := models.Chat{
					CarpoolRideID: &joinReq.Ride.ID,
					CollegeID:     joinReq.Ride.CollegeID,
				}
				if err := tx.Create(&chat).Error; err != nil {
					return err
				}
				if err := tx.Model(&chat).Association("Participants").Append(&joinReq.Ride.Owner, &joinReq.Requester); err != nil {
					return err
				}
				joinReq.Ride.ChatID = &chat.ID
				if err := tx.Save(&joinReq.Ride).Error; err != nil {
					return err
				}
			} else {
				if err := tx.Model(&models.Chat{ID: *joinReq.Ride.ChatID}).Association("Participants").Append(&joinReq.Requester); err != nil {
					return err
				}
			}
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DB.Preload("Requester").First(&joinReq, joinReq.ID)
	c.JSON(http.StatusOK, CarpoolJoinRequestDTOFromModel(&joinReq))
}
