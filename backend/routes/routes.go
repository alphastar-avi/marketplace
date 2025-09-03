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
			chats.GET("", handlers.GetChats)
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

		// Favorites routes
		favorites := api.Group("/favorites")
		{
			favorites.GET("", handlers.GetFavorites)
			favorites.POST("/:id", handlers.CreateFavorite)
			favorites.DELETE("/:id", handlers.DeleteFavorite)
		}
	}
}
