package handlers

import (
	"marketplace-backend/config"
	"marketplace-backend/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetChats returns all chats for a user (college-filtered)
func GetChats(c *gin.Context) {
	// Extract user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized user"})
		return
	}

	var chats []models.Chat

	// Fetch chats where the user is a participant
	result := config.DB.Joins("JOIN chat_participants ON chat_participants.chat_id = chats.id").
		Where("chat_participants.user_id = ?", userID).
		Preload("Product").
		Preload("Product.Seller").
		Preload("CarpoolRide").
		Preload("Participants").
		Preload("Messages.From").
		Find(&chats)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch chats"})
		return
	}

	c.JSON(http.StatusOK, chats)
}

// GetChat returns a specific chat with messages
func GetChat(c *gin.Context) {
	id := c.Param("id")
	chatID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	var chat models.Chat
	result := config.DB.Preload("Product").Preload("Product.Seller").Preload("CarpoolRide").Preload("Participants").Preload("Messages.From").First(&chat, chatID)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	c.JSON(http.StatusOK, chat)
}

// CreateProductChat creates a new 1-on-1 chat for a product
func CreateProductChat(c *gin.Context) {
	id := c.Param("id")
	productID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	var requestData struct {
		Participants []uuid.UUID `json:"participants" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get product to determine college
	var product models.Product
	if err := config.DB.First(&product, productID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	// Get participants
	var participants []models.User
	if err := config.DB.Find(&participants, requestData.Participants).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid participants"})
		return
	}

	chat := models.Chat{
		Type:      "product",
		ProductID: &productID,
		CollegeID: product.CollegeID,
	}

	result := config.DB.Create(&chat)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create chat"})
		return
	}

	// Add participants to chat
	if err := config.DB.Model(&chat).Association("Participants").Append(participants); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add participants"})
		return
	}

	// Preload relationships for response
	config.DB.Preload("Product").Preload("Participants").Preload("Messages.From").First(&chat, chat.ID)

	c.JSON(http.StatusCreated, chat)
}

// CreateCarpoolChat creates a new group chat for a carpool ride
func CreateCarpoolChat(c *gin.Context) {
	id := c.Param("id")
	carpoolID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid carpool ID"})
		return
	}

	var requestData struct {
		Name         string      `json:"name" binding:"required"`
		Participants []uuid.UUID `json:"participants" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get carpool to determine college (using owner's college for now since CarpoolRide might not have CollegeID directly)
	var carpool models.CarpoolRide
	if err := config.DB.Preload("Owner").First(&carpool, carpoolID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Carpool ride not found"})
		return
	}

	// Get participants
	var participants []models.User
	if err := config.DB.Find(&participants, requestData.Participants).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid participants"})
		return
	}

	chat := models.Chat{
		Type:          "carpool",
		Name:          requestData.Name,
		CarpoolRideID: &carpoolID,
		CollegeID:     carpool.Owner.CollegeID, // Inherit college from the ride owner
	}

	result := config.DB.Create(&chat)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create chat"})
		return
	}

	// Add participants to chat
	if err := config.DB.Model(&chat).Association("Participants").Append(participants); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add participants"})
		return
	}

	// Preload relationships for response
	config.DB.Preload("CarpoolRide").Preload("Participants").Preload("Messages.From").First(&chat, chat.ID)

	c.JSON(http.StatusCreated, chat)
}

// GetChatMessages returns messages for a specific chat
func GetChatMessages(c *gin.Context) {
	id := c.Param("id")
	chatID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	var messages []models.Message
	result := config.DB.Preload("From").Where("chat_id = ?", chatID).Order("created_at ASC").Find(&messages)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
		return
	}

	c.JSON(http.StatusOK, messages)
}

// CreateMessage creates a new message in a chat
func CreateMessage(c *gin.Context) {
	id := c.Param("id")
	chatID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	var message models.Message
	if err := c.ShouldBindJSON(&message); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	message.ChatID = chatID

	result := config.DB.Create(&message)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create message"})
		return
	}

	// Preload relationships for response
	config.DB.Preload("From").First(&message, message.ID)

	c.JSON(http.StatusCreated, message)
}
