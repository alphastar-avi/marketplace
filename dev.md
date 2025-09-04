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

### 6. Product Deletion Issue - Items Reappearing After Refresh
**Problem:** Products would reappear in marketplace after deletion and page refresh.

**Root Causes Identified:**
1. Frontend was creating dummy/sample products when products array was empty
2. Delete button only showed for admin users instead of product owners
3. Frontend delete function wasn't calling backend API properly

**Solutions Applied:**
```javascript
// 1. Removed dummy product creation that interfered with real data
// useEffect(() => {
//   if (!products || products.length === 0) {
//     const sample: Product[] = Array.from({ length: 6 }).map(...)
//     setProducts(sample)  // This was causing products to reappear
//   }
// }, [products?.length, setProducts])

// 2. Fixed delete button visibility - show for product owners
onDeleteProduct={user && p.sellerId === user.id ? () => handleDeleteProduct(p.id) : undefined}

// 3. Updated delete function to call backend API
const deleteProduct = async (productId: string) => {
  try {
    await productsAPI.delete(productId)
    setProducts((s) => s.filter((p) => p.id !== productId))
  } catch (error) {
    console.error('Failed to delete product:', error)
  }
}
```

### 7. Authentication & Authorization Implementation
**Added Features:**
- JWT-based authentication system
- User registration and login endpoints
- Protected routes with middleware
- Ownership validation for product operations

**Backend Auth Structure:**
```go
// middleware/auth.go - JWT validation middleware
// handlers/auth.go - Login, register, get user endpoints
// Ownership checks in product delete: product.SellerID != userID
```

### 8. Profile "My Listings" Separation
**Problem:** Users could see their own products in marketplace, causing confusion.

**Solution:** Implemented proper separation:
- **Profile → My Listings:** Shows only user's own products
- **Explore Marketplace:** Shows only other users' products (filtered out own)
- **Clickable navigation:** Product cards navigate to detail pages
- **Consistent delete functionality:** Both profile and marketplace use same backend API

```javascript
// Filter out user's own products from marketplace
const otherUsersProducts = products?.filter((p: Product) => p.sellerId !== user?.id) || []
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
│   ├── auth.go          # Authentication (login, register, JWT)
│   ├── products.go      # Product CRUD operations
│   ├── chats.go         # Chat functionality
│   ├── favorites.go     # Favorites management
│   ├── purchase_requests.go # Purchase request handling
│   └── dto.go           # Data Transfer Objects
├── middleware/
│   └── auth.go          # JWT authentication middleware
└── routes/
    └── routes.go        # Route definitions with auth protection
```

### Frontend Structure
```
frontend/src/
├── components/
│   ├── marketplace/     # Product browsing (others' products only)
│   ├── profile/         # User profile with "My Listings"
│   ├── product/         # Product detail pages
│   └── auth/           # Login/signup components
├── routes/             # Page routing
├── state/              # Context for global state management
└── api/               # Backend API integration
```

## Current Status
- ✅ Backend running on port 8080 with JWT authentication
- ✅ Database connected to Azure PostgreSQL
- ✅ User registration and login system
- ✅ Product CRUD with ownership validation
- ✅ Delete functionality working properly (permanent database deletion)
- ✅ Profile "My Listings" separated from marketplace
- ✅ Frontend-backend integration complete
- ✅ CORS configured for frontend integration

## Next Steps
- Real-time chat features
- Image upload functionality for products
- Search and filtering enhancements
- Purchase request workflow improvements
- Email notifications for transactions
