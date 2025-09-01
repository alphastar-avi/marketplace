package config

import (
	"fmt"
	"log"

	"marketplace-backend/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDatabase() {
	// Azure PostgreSQL connection string with correct credentials
	host := "marketplace-test.postgres.database.azure.com"
	user := "myadmin"
	password := "MyStrongPassword123!"
	dbname := "postgres"
	port := "5432"
	sslmode := "require"

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

	// Drop and recreate tables to fix array type issues
	DB.Migrator().DropTable(&models.Product{}, &models.Chat{}, &models.Message{}, &models.PurchaseRequest{}, &models.Favorite{})
	
	// Auto-migrate the schema
	err = DB.AutoMigrate(
		&models.College{},
		&models.User{},
		&models.Product{},
		&models.Chat{},
		&models.Message{},
		&models.PurchaseRequest{},
		&models.Favorite{},
	)

	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database migration completed!")

	// Seed default college if none exists
	seedDefaultCollege()
}

func seedDefaultCollege() {
	var count int64
	DB.Model(&models.College{}).Count(&count)
	
	if count == 0 {
		defaultCollege := models.College{
			Name:   "Default University",
			Domain: "default.edu",
		}
		
		if err := DB.Create(&defaultCollege).Error; err != nil {
			log.Printf("Failed to create default college: %v", err)
		} else {
			log.Println("Default college created successfully!")
		}
	}
}
