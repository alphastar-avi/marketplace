package handlers

import (
	"errors"
	"net/http"
	"marketplace-backend/config"
	"marketplace-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func preloadChatRelations(db *gorm.DB) *gorm.DB {
	return db.Preload("Product").
		Preload("Product.Seller").``
		Preload("Participants").
		Preload("Messages", func(tx *gorm.DB) *gorm.DB {
			return tx.Preload("From").Order("created_at ASC")
		})
}

func userInChat(chat *models.Chat, userID uuid.UUID) bool {
	for _, participant := range chat.Participants {
		if participant.ID == userID {
			return true
		}
	}
	return false
}

func participantsMatch(participants []models.User, participantIDs []uuid.UUID) bool {
	if len(participants) != len(participantIDs) {
		return false
	}

	idSet := make(map[uuid.UUID]int, len(participantIDs))
	for _, id := range participantIDs {
		idSet[id]++
	}

	for _, participant := range participants {
		count, ok := idSet[participant.ID]
		if !ok || count == 0 {
			return false
		}
		idSet[participant.ID]--
		if idSet[participant.ID] == 0 {
			delete(idSet, participant.ID)
		}
	}

	return len(idSet) == 0
}

func findChatByParticipants(productID uuid.UUID, participantIDs []uuid.UUID) (*models.Chat, error) {
	var chats []models.Chat
	if err := config.DB.Preload("Participants").
		Where("product_id = ?", productID).
		Find(&chats).Error; err != nil {
		return nil, err
	}

	for _, chat := range chats {
		if participantsMatch(chat.Participants, participantIDs) {
			preloadChatRelations(config.DB).First(&chat, chat.ID)
			return &chat, nil
		}
	}

	return nil, nil
}

func ensureChatForProduct(product models.Product, participantIDs []uuid.UUID) (*models.Chat, bool, error) {
	existing, err := findChatByParticipants(product.ID, participantIDs)
	if err != nil {
		return nil, false, err
	}
	if existing != nil {
		return existing, false, nil
	}

	var participants []models.User
	if err := config.DB.Find(&participants, participantIDs).Error; err != nil {
		return nil, false, err
	}
	if len(participants) != len(participantIDs) {
		return nil, false, errors.New("invalid participants")
	}

	chat := models.Chat{
		ProductID: product.ID,
		CollegeID: product.CollegeID,
	}

	if err := config.DB.Create(&chat).Error; err != nil {
		return nil, false, err
	}

	if err := config.DB.Model(&chat).Association("Participants").Append(participants); err != nil {
		return nil, false, err
	}

	preloadChatRelations(config.DB).First(&chat, chat.ID)
	return &chat, true, nil
}

// GetChats returns all chats for a user (college-filtered)
func GetChats(c *gin.Context) {
	userID, exists := userFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var chats []models.Chat
	result := preloadChatRelations(config.DB).
		Joins("JOIN chat_participants cp ON cp.chat_id = chats.id").
		Distinct("chats.id").
		Where("cp.user_id = ?", userID).
		Find(&chats)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch chats"})
		return
	}

	c.JSON(http.StatusOK, chats)
}

// GetChat returns a specific chat with messages
func GetChat(c *gin.Context) {
	userID, exists := userFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	id := c.Param("id")
	chatID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	var chat models.Chat
	result := preloadChatRelations(config.DB).First(&chat, chatID)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	if !userInChat(&chat, userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not a participant in this chat"})
		return
	}

	c.JSON(http.StatusOK, chat)
}

// CreateChat creates a new chat
func CreateChat(c *gin.Context) {
	userID, exists := userFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

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

	// Ensure caller is part of the chat
	isParticipant := false
	for _, pid := range requestData.Participants {
		if pid == userID {
			isParticipant = true
			break
		}
	}
	if !isParticipant {
		c.JSON(http.StatusForbidden, gin.H{"error": "You must be a participant in the chat"})
		return
	}

	chat, created, err := ensureChatForProduct(product, requestData.Participants)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create chat"})
		return
	}

	if created {
		c.JSON(http.StatusCreated, chat)
		return
	}

	c.JSON(http.StatusOK, chat)
}

// GetChatMessages returns messages for a specific chat
func GetChatMessages(c *gin.Context) {
	userID, exists := userFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	id := c.Param("id")
	chatID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	var chat models.Chat
	if err := config.DB.Preload("Participants").First(&chat, chatID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	if !userInChat(&chat, userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not a participant in this chat"})
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
	userID, exists := userFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	id := c.Param("id")
	chatID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	var chat models.Chat
	if err := config.DB.Preload("Participants").First(&chat, chatID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	if !userInChat(&chat, userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not a participant in this chat"})
		return
	}

	var payload struct {
		Text string `json:"text" binding:"required"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if payload.Text == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Message text is required"})
		return
	}

	message := models.Message{
		ChatID: chatID,
		FromID: userID,
		Text:   payload.Text,
	}

	result := config.DB.Create(&message)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create message"})
		return
	}

	// Preload relationships for response
	config.DB.Preload("From").First(&message, message.ID)

	c.JSON(http.StatusCreated, message)
}
