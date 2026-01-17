package handlers

import (
    "errors"
    "marketplace-backend/config"
    "marketplace-backend/models"

    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
)

func getUserIDFromContext(c *gin.Context) (uuid.UUID, error) {
    userVal, exists := c.Get("userID")
    if !exists {
        return uuid.Nil, errors.New("user not authenticated")
    }
    userID, ok := userVal.(uuid.UUID)
    if !ok {
        return uuid.Nil, errors.New("invalid user ID type")
    }
    return userID, nil
}

func getUserFromContext(c *gin.Context) (*models.User, error) {
    userID, err := getUserIDFromContext(c)
    if err != nil {
        return nil, err
    }

    var user models.User
    if err := config.DB.Preload("College").First(&user, userID).Error; err != nil {
        return nil, err
    }
    return &user, nil
}
