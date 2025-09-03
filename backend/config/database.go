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

	// Drop and recreate tables to fix array type issues and foreign key constraints
	DB.Migrator().DropTable(&models.Product{}, &models.Chat{}, &models.Message{}, &models.PurchaseRequest{}, &models.Favorite{})
	// Also drop the many-to-many junction table
	DB.Migrator().DropTable("chat_participants")
	
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
	
	// Seed default products if none exist
	seedDefaultProducts()
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

func seedDefaultProducts() {
	var count int64
	DB.Model(&models.Product{}).Count(&count)
	
	if count == 0 {
		// Get the default college ID
		var defaultCollege models.College
		if err := DB.Where("domain = ?", "default.edu").First(&defaultCollege).Error; err != nil {
			log.Printf("Failed to find default college for seeding products: %v", err)
			return
		}

		// Get or create a default user as seller
		var defaultUser models.User
		err := DB.Where("email = ?", "john.doe@default.edu").First(&defaultUser).Error
		if err != nil {
			// User doesn't exist, create it
			defaultUser = models.User{
				Name:       "John Doe",
				Email:      "john.doe@default.edu",
				Avatar:     "",
				Year:       "Senior",
				Department: "Computer Science",
				CollegeID:  defaultCollege.ID,
			}
			
			if err := DB.Create(&defaultUser).Error; err != nil {
				log.Printf("Failed to create default user: %v", err)
				return
			}
			log.Println("Default user created successfully!")
		}

		defaultProducts := []models.Product{
			{
				Title:       "MacBook Pro 13-inch",
				Price:       800.00,
				Description: "Lightly used MacBook Pro 13-inch from 2021. Perfect for students. Includes charger and original box.",
				Images:      `["https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500"]`,
				Condition:   "Like New",
				Category:    "Electronics",
				Tags:        `["laptop", "apple", "macbook", "computer"]`,
				Status:      "available",
				SellerID:    defaultUser.ID,
				CollegeID:   defaultCollege.ID,
			},
			{
				Title:       "Calculus Textbook - Stewart 8th Edition",
				Price:       45.00,
				Description: "Essential calculus textbook in excellent condition. No highlighting or writing inside. Perfect for MATH 101/102.",
				Images:      `["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500"]`,
				Condition:   "Good",
				Category:    "Books",
				Tags:        `["textbook", "calculus", "math", "stewart"]`,
				Status:      "available",
				SellerID:    defaultUser.ID,
				CollegeID:   defaultCollege.ID,
			},
			{
				Title:       "Dorm Room Mini Fridge",
				Price:       120.00,
				Description: "Compact mini fridge perfect for dorm rooms. Energy efficient and quiet. Moving out sale!",
				Images:      `["https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=500"]`,
				Condition:   "Good",
				Category:    "Appliances",
				Tags:        `["fridge", "dorm", "appliance", "mini"]`,
				Status:      "available",
				SellerID:    defaultUser.ID,
				CollegeID:   defaultCollege.ID,
			},
		}

		for _, product := range defaultProducts {
			if err := DB.Create(&product).Error; err != nil {
				log.Printf("Failed to create default product %s: %v", product.Title, err)
			}
		}

		log.Printf("Successfully seeded %d default products!", len(defaultProducts))
	}
}
