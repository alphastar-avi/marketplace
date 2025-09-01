# Marketplace Backend API

Go backend for the campus marketplace application using Gin, GORM, and PostgreSQL.

## Tech Stack
- **Go** with Gin framework
- **GORM** for database ORM
- **PostgreSQL** (Azure Flexible Server)
- **UUID** for primary keys

## Database Models
- **College**: University/college registry
- **User**: Marketplace users linked to colleges
- **Product**: Items for sale with college scoping
- **Chat**: Conversations between users
- **Message**: Chat messages
- **PurchaseRequest**: Buy/sell workflow
- **Favorite**: User favorited products

## API Endpoints

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create new product
- `GET /api/products/:id` - Get product by ID
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user

### Chats
- `GET /api/chats` - Get all chats
- `POST /api/chats` - Create new chat
- `GET /api/chats/:id` - Get chat by ID
- `GET /api/chats/:id/messages` - Get chat messages
- `POST /api/chats/:id/messages` - Send message

### Purchase Requests
- `GET /api/requests` - Get all purchase requests
- `POST /api/requests` - Create purchase request
- `PUT /api/requests/:id` - Update request status

### Favorites
- `GET /api/favorites?user_id=<uuid>` - Get user favorites
- `POST /api/favorites/:id` - Add to favorites
- `DELETE /api/favorites/:id?user_id=<uuid>` - Remove from favorites

## Setup

1. Install dependencies:
```bash
go mod tidy
```

2. Configure database connection in `config/database.go`

3. Run the server:
```bash
go run main.go
```

The API will be available at `http://localhost:8080`

## Database Connection
Connected to Azure PostgreSQL Flexible Server:
- Host: `myreminderdb.postgres.database.azure.com`
- Database: `marketplace`
- SSL: Required
