package routes

import (
	"marketplace-backend/handlers"
	"marketplace-backend/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	// API group
	api := r.Group("/api")
	{
		// Auth routes (public)
		auth := api.Group("/auth")
		{
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
			auth.GET("/me", middleware.AuthMiddleware(), handlers.GetMe)
		}

		// Products routes
		products := api.Group("/products")
		{
			products.GET("", middleware.OptionalAuthMiddleware(), handlers.GetProducts)
			products.POST("", middleware.AuthMiddleware(), handlers.CreateProduct)
			products.GET("/:id", middleware.OptionalAuthMiddleware(), handlers.GetProduct)
			products.PUT("/:id", middleware.AuthMiddleware(), handlers.UpdateProduct)
			products.DELETE("/:id", middleware.AuthMiddleware(), handlers.DeleteProduct)
			// AI description generation endpoints
			products.POST("/generate-description", middleware.AuthMiddleware(), handlers.GenerateDescription)
			products.POST("/generate-description-with-files", middleware.AuthMiddleware(), handlers.GenerateDescriptionWithFiles)
		}

		// AI routes
		ai := api.Group("/ai")
		{
			ai.GET("/status", handlers.GetAIStatus)
			ai.POST("/test-upload", handlers.TestFileUpload)
		}

		// Users routes
		users := api.Group("/users")
		{
			users.GET("/:id", handlers.GetUser)
			users.POST("", handlers.CreateUser)
			users.PUT("/:id", middleware.AuthMiddleware(), handlers.UpdateUser)
		}

		// Chats routes
		chats := api.Group("/chats")
		{
			chats.GET("", middleware.AuthMiddleware(), handlers.GetChats)
			chats.POST("", handlers.CreateChat)
			chats.GET("/:id", handlers.GetChat)
			chats.GET("/:id/messages", handlers.GetChatMessages)
			chats.POST("/:id/messages", handlers.CreateMessage)
		}

		// Purchase requests routes
		requests := api.Group("/requests")
		{
			requests.GET("", handlers.GetPurchaseRequests)
			requests.POST("", handlers.CreatePurchaseRequest)
			requests.PUT("/:id", handlers.UpdatePurchaseRequest)
		}

		// Carpool routes
		carpools := api.Group("/carpools")
		{
			carpools.GET("", middleware.AuthMiddleware(), handlers.GetCarpoolRides)
			carpools.POST("", middleware.AuthMiddleware(), handlers.CreateCarpoolRide)
			carpools.GET("/:id", middleware.AuthMiddleware(), handlers.GetCarpoolRide)
			carpools.POST("/:id/requests", middleware.AuthMiddleware(), handlers.CreateCarpoolJoinRequest)
			carpools.PUT("/requests/:id", middleware.AuthMiddleware(), handlers.UpdateCarpoolJoinRequest)
		}

		// Favorites routes
		favorites := api.Group("/favorites")
		{
			favorites.GET("", handlers.GetFavorites)
			favorites.POST("/:id", handlers.CreateFavorite)
			favorites.DELETE("/:id", handlers.DeleteFavorite)
		}
	}
}
