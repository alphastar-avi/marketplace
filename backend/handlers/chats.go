package handlers

import (
	"net/http"
	"marketplace-backend/config"
	"marketplace-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetChats returns all chats for a user (college-filtered)
func GetChats(c *gin.Context) {
	var chats []models.Chat
	
	// For now, get all chats (later filter by user's college)
	result := config.DB.Preload("Product").Preload("Participants").Preload("Messages.From").Find(&chats)
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
	result := config.DB.Preload("Product").Preload("Participants").Preload("Messages.From").First(&chat, chatID)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	c.JSON(http.StatusOK, chat)
}

// CreateChat creates a new chat
func CreateChat(c *gin.Context) {
	var requestData struct {
		ProductID    uuid.UUID   `json:"product_id" binding:"required"`
		Participants []uuid.UUID `json:"participants" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get product to determine college
	var product models.Product
	if err := config.DB.First(&product, requestData.ProductID).Error; err != nil {
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
		ProductID: requestData.ProductID,
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
