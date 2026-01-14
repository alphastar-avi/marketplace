package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// userFromContext extracts the authenticated user ID stored by the auth middleware.
func userFromContext(c *gin.Context) (uuid.UUID, bool) {
	userIDValue, exists := c.Get("userID")
	if !exists {
		return uuid.Nil, false
	}

	userID, ok := userIDValue.(uuid.UUID)
	if !ok {
		return uuid.Nil, false
	}

	return userID, true
}
