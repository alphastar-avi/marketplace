# Marketplace Backend Development Log

## Project Overview
A college marketplace application with Go backend (Gin framework) and React frontend. Backend connects to Azure PostgreSQL database with GORM ORM.

## Problems Encountered & Solutions

### 1. Foreign Key Constraint Violation
**Problem:** Database migration failed with error:
```
ERROR: insert or update on table "chat_participants" violates foreign key constraint "fk_chat_participants_chat"
```

**Root Cause:** The many-to-many junction table `chat_participants` had orphaned data that violated foreign key constraints when trying to recreate the `chats` table.

**Solution:** Added explicit cleanup of junction table in database migration:
```go
// Drop and recreate tables to fix array type issues and foreign key constraints
DB.Migrator().DropTable(&models.Product{}, &models.Chat{}, &models.Message{}, &models.PurchaseRequest{}, &models.Favorite{})
// Also drop the many-to-many junction table
DB.Migrator().DropTable("chat_participants")
```

### 2. Missing Default Data
**Problem:** Products table was empty after migration, API returned `null`.

**Root Cause:** No seeding mechanism for default products.

**Solution:** Added `seedDefaultProducts()` function that creates:
- Default college ("Default University")
- Default user (John Doe)
- 3 sample products (MacBook, Textbook, Mini Fridge)

### 3. Duplicate User Creation Error
**Problem:** Seeding failed with:
```
Failed to create default user: ERROR: duplicate key value violates unique constraint "users_email_key"
```

**Root Cause:** Seeding function tried to create user every time without checking if it already exists.

**Solution:** Modified seeding to check for existing user first:
```go
var defaultUser models.User
err := DB.Where("email = ?", "john.doe@default.edu").First(&defaultUser).Error
if err != nil {
    // User doesn't exist, create it
    defaultUser = models.User{...}
    DB.Create(&defaultUser)
}
```

### 4. API Returning null Instead of Empty Array
**Problem:** When no products found, API returned `null` instead of empty array `[]`.

**Root Cause:** Go's JSON marshaling returns `null` for nil slices.

**Solution:** Explicitly return empty array when no products found:
```go
if len(productDTOs) == 0 {
    c.JSON(http.StatusOK, []ProductDTO{})
    return
}
```

### 5. User Creation Endpoint 500 Error
**Problem:** Frontend product creation failed with "Failed to create user" 500 error.

**Root Cause:** User creation handler had multiple issues:
- No validation for default college existence
- No handling of duplicate email constraint violations
- Poor error reporting

**Solution:** Enhanced user creation handler:
```go
// Check if default college exists
var defaultCollege models.College
result := config.DB.First(&defaultCollege)
if result.Error != nil {
    c.JSON(http.StatusInternalServerError, gin.H{"error": "Default college not found"})
    return
}

// Handle existing users gracefully
var existingUser models.User
if err := config.DB.Where("email = ?", user.Email).First(&existingUser).Error; err == nil {
    // Return existing user instead of error
    config.DB.Preload("College").First(&existingUser, existingUser.ID)
    c.JSON(http.StatusOK, existingUser)
    return
}
```

## Architecture & Structure

### Backend Structure
```
backend/
├── main.go              # Entry point, server setup
├── config/
│   └── database.go      # DB connection, migration, seeding
├── models/
│   └── models.go        # GORM models (College, User, Product, Chat, etc.)
├── handlers/
│   ├── products.go      # Product CRUD operations
│   ├── chats.go         # Chat functionality
│   ├── favorites.go     # Favorites management
│   ├── purchase_requests.go # Purchase request handling
│   └── dto.go           # Data Transfer Objects
└── routes/
    └── routes.go        # Route definitions
```

### Database Models
- **College:** University/college entity
- **User:** Student users with college association
- **Product:** Marketplace items with seller, college relationships
- **Chat:** Conversations between users about products
- **Message:** Individual chat messages
- **PurchaseRequest:** Buy requests for products
- **Favorite:** User's favorited products

### Key Relationships
- Users belong to Colleges (foreign key)
- Products belong to Users (seller) and Colleges
- Chats have many-to-many relationship with Users (participants)
- Messages belong to Chats and Users (sender)

## Common Pitfalls & Best Practices

### Database Management
1. **Always drop junction tables** when recreating related tables
2. **Check for existing data** before seeding to avoid constraint violations
3. **Use proper foreign key relationships** in GORM models
4. **Handle slow database connections** gracefully (Azure PostgreSQL can be slow)

### API Design
1. **Return empty arrays, not null** for empty collections
2. **Use DTOs** to control API response format
3. **Preload relationships** to avoid N+1 queries
4. **Handle UUID parsing errors** properly

### Go/Gin Specific
1. **Use CORS middleware** for frontend integration
2. **Set proper JSON tags** on structs
3. **Handle port conflicts** when restarting servers
4. **Use structured logging** for debugging

### Development Workflow
1. **Kill processes properly** when restarting: `lsof -i :8080 | xargs kill -9`
2. **Check server logs** for seeding and migration status
3. **Test API endpoints** after changes to verify functionality
4. **Use environment variables** for configuration

## Current Status
- ✅ Backend running on port 8080
- ✅ Database connected to Azure PostgreSQL
- ✅ 3 default products seeded
- ✅ All API endpoints functional
- ✅ CORS configured for frontend integration

## Next Steps
- Frontend integration testing
- User authentication implementation
- Image upload functionality
- Real-time chat features
- Search and filtering capabilities
