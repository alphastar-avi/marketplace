package config

import (
	"fmt"
	"log"
	"os"

	"marketplace-backend/models"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDatabase() {
	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables or defaults")
	}

	// Get database configuration from environment variables (no fallbacks)
	host := os.Getenv("DB_HOST")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")
	port := os.Getenv("DB_PORT")
	sslmode := os.Getenv("DB_SSLMODE")

	// Check if all required environment variables are set
	if host == "" || user == "" || password == "" || dbname == "" || port == "" || sslmode == "" {
		log.Fatal("Database connection error: Missing required environment variables (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, DB_SSLMODE)")
	}

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		host, user, password, dbname, port, sslmode)

	log.Printf("Attempting to connect to database: %s@%s:%s/%s", user, host, port, dbname)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Printf("Failed to connect to database: %v", err)
		log.Println("Please check:")
		log.Println("1. Database server is running")
		log.Println("2. Username and password are correct")
		log.Println("3. Database name exists")
		log.Println("4. Firewall allows connections")
		log.Fatal("Database connection failed")
	}

	log.Println("Database connected successfully!")

	// Auto-migrate the schema
	err = DB.AutoMigrate(
		&models.College{},
		&models.User{},
		&models.Product{},
		&models.Chat{},
		&models.Message{},
		&models.PurchaseRequest{},
		&models.Favorite{},
		&models.CarpoolRide{},
		&models.CarpoolJoinRequest{},
	)

	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database migration completed!")
}
