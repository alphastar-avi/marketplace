package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// College represents a college/university
type College struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name      string    `json:"name" gorm:"not null"`
	Domain    string    `json:"domain" gorm:"unique;not null"` // e.g., "stanford.edu"
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// User represents a marketplace user
type User struct {
	ID         uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name       string    `json:"name" gorm:"not null"`
	Email      string    `json:"email" gorm:"unique"`
	Password   string    `json:"-"` // Hidden from JSON responses
	Avatar     string    `json:"avatar"`
	Year       string    `json:"year"`
	Department string    `json:"department"`
	IsAdmin    bool      `json:"is_admin" gorm:"default:false"`
	CollegeID  uuid.UUID `json:"college_id" gorm:"type:uuid;not null"`
	College    College   `json:"college" gorm:"foreignKey:CollegeID"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// Product represents a marketplace item
type Product struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Title       string    `json:"title" gorm:"not null"`
	Price       float64   `json:"price" gorm:"not null"`
	Description string    `json:"description"`
	Images      string    `json:"images" gorm:"type:text"`   // JSON string for now
	Condition   string    `json:"condition" gorm:"not null"` // New, Like New, Good, Fair, For Parts
	Category    string    `json:"category" gorm:"not null"`
	Tags        string    `json:"tags" gorm:"type:text"`             // JSON string for now
	Status      string    `json:"status" gorm:"default:'available'"` // available, requested, sold
	SellerID    uuid.UUID `json:"seller_id" gorm:"type:uuid;not null"`
	Seller      User      `json:"seller" gorm:"foreignKey:SellerID"`
	CollegeID   uuid.UUID `json:"college_id" gorm:"type:uuid;not null"`
	College     College   `json:"college" gorm:"foreignKey:CollegeID"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Chat represents a conversation between users
type Chat struct {
	ID            uuid.UUID    `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name          string       `json:"name"`
	Type          string       `json:"type" gorm:"not null;default:'product'"`
	ProductID     *uuid.UUID   `json:"product_id" gorm:"type:uuid"`
	Product       *Product     `json:"product" gorm:"foreignKey:ProductID"`
	CarpoolRideID *uuid.UUID   `json:"carpool_ride_id" gorm:"type:uuid"`
	CarpoolRide   *CarpoolRide `json:"carpool_ride" gorm:"foreignKey:CarpoolRideID"`
	Participants  []User       `json:"participants" gorm:"many2many:chat_participants;"`
	Messages      []Message    `json:"messages" gorm:"foreignKey:ChatID"`
	CollegeID     uuid.UUID    `json:"college_id" gorm:"type:uuid;not null"`
	College       College      `json:"college" gorm:"foreignKey:CollegeID"`
	CreatedAt     time.Time    `json:"created_at"`
	UpdatedAt     time.Time    `json:"updated_at"`
}

// Message represents a chat message
type Message struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	ChatID    uuid.UUID `json:"chat_id" gorm:"type:uuid;not null"`
	Chat      Chat      `json:"chat" gorm:"foreignKey:ChatID"`
	FromID    uuid.UUID `json:"from_id" gorm:"type:uuid;not null"`
	From      User      `json:"from" gorm:"foreignKey:FromID"`
	Text      string    `json:"text" gorm:"not null"`
	CreatedAt time.Time `json:"created_at"`
}

// PurchaseRequest represents a buy request
type PurchaseRequest struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	ProductID uuid.UUID `json:"product_id" gorm:"type:uuid;not null"`
	Product   Product   `json:"product" gorm:"foreignKey:ProductID"`
	BuyerID   uuid.UUID `json:"buyer_id" gorm:"type:uuid;not null"`
	Buyer     User      `json:"buyer" gorm:"foreignKey:BuyerID"`
	SellerID  uuid.UUID `json:"seller_id" gorm:"type:uuid;not null"`
	Seller    User      `json:"seller" gorm:"foreignKey:SellerID"`
	Status    string    `json:"status" gorm:"default:'pending'"` // pending, accepted, declined
	CollegeID uuid.UUID `json:"college_id" gorm:"type:uuid;not null"`
	College   College   `json:"college" gorm:"foreignKey:CollegeID"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Favorite represents a user's favorited product
type Favorite struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID    uuid.UUID `json:"user_id" gorm:"type:uuid;not null"`
	User      User      `json:"user" gorm:"foreignKey:UserID"`
	ProductID uuid.UUID `json:"product_id" gorm:"type:uuid;not null"`
	Product   Product   `json:"product" gorm:"foreignKey:ProductID"`
	CreatedAt time.Time `json:"created_at"`
}

// CarpoolRide represents a ride offer created by a user
type CarpoolRide struct {
	ID             uuid.UUID            `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Title          string               `json:"title" gorm:"not null"`
	Destination    string               `json:"destination" gorm:"not null"`
	PickupPoint    string               `json:"pickup_point" gorm:"not null"`
	Capacity       int                  `json:"capacity" gorm:"not null"`
	SeatsAvailable int                  `json:"seats_available" gorm:"not null"`
	DepartureDate  time.Time            `json:"departure_date" gorm:"not null"`
	DepartureTime  string               `json:"departure_time" gorm:"not null"`
	Direction      string               `json:"direction" gorm:"not null;default:'to_college'"`
	Description    string               `json:"description" gorm:"type:text"`
	OwnerID        uuid.UUID            `json:"owner_id" gorm:"type:uuid;not null"`
	Owner          User                 `json:"owner" gorm:"foreignKey:OwnerID"`
	CollegeID      uuid.UUID            `json:"college_id" gorm:"type:uuid;not null"`
	College        College              `json:"college" gorm:"foreignKey:CollegeID"`
	ChatID         *uuid.UUID           `json:"chat_id" gorm:"type:uuid"`
	Chat           *Chat                `json:"chat" gorm:"foreignKey:ChatID"`
	Participants   []User               `json:"participants" gorm:"many2many:carpool_participants;"`
	JoinRequests   []CarpoolJoinRequest `json:"join_requests" gorm:"foreignKey:RideID"`
	CreatedAt      time.Time            `json:"created_at"`
	UpdatedAt      time.Time            `json:"updated_at"`
}

// CarpoolJoinRequest represents a user's request to join a ride
type CarpoolJoinRequest struct {
	ID          uuid.UUID   `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	RideID      uuid.UUID   `json:"ride_id" gorm:"type:uuid;not null"`
	Ride        CarpoolRide `json:"ride" gorm:"foreignKey:RideID"`
	RequesterID uuid.UUID   `json:"requester_id" gorm:"type:uuid;not null"`
	Requester   User        `json:"requester" gorm:"foreignKey:RequesterID"`
	Status      string      `json:"status" gorm:"default:'pending'"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

// ComputeGroup represents a shared computing resource or group
type ComputeGroup struct {
	ID         uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Title      string    `json:"title" gorm:"unique;not null"`
	PIN        string    `json:"-" gorm:"not null"` // Hidden from public responses
	URL        string    `json:"url" gorm:"not null"`
	WorkerSize int       `json:"worker_size" gorm:"not null;default:1"`
	Epochs     int       `json:"epochs" gorm:"not null;default:10"`
	BatchSize  int       `json:"batch_size" gorm:"not null;default:32"`
	OwnerID    uuid.UUID `json:"owner_id" gorm:"type:uuid;not null"`
	Owner      User      `json:"owner" gorm:"foreignKey:OwnerID"`
	CollegeID  uuid.UUID `json:"college_id" gorm:"type:uuid;not null"`
	College    College   `json:"college" gorm:"foreignKey:CollegeID"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (c *ComputeGroup) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

// BeforeCreate hooks for UUID generation
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

func (p *Product) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

func (c *Chat) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

func (m *Message) BeforeCreate(tx *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return nil
}

func (pr *PurchaseRequest) BeforeCreate(tx *gorm.DB) error {
	if pr.ID == uuid.Nil {
		pr.ID = uuid.New()
	}
	return nil
}

func (f *Favorite) BeforeCreate(tx *gorm.DB) error {
	if f.ID == uuid.Nil {
		f.ID = uuid.New()
	}
	return nil
}

func (r *CarpoolRide) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	if r.SeatsAvailable == 0 {
		r.SeatsAvailable = r.Capacity
	}
	return nil
}

func (cr *CarpoolJoinRequest) BeforeCreate(tx *gorm.DB) error {
	if cr.ID == uuid.Nil {
		cr.ID = uuid.New()
	}
	return nil
}

func (c *College) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}
