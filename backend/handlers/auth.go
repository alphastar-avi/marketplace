package handlers

import (
	"encoding/base64"
	"encoding/json"
	"io"
	"log"
	"marketplace-backend/config"
	"marketplace-backend/models"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Name       string `json:"name" binding:"required"`
	Email      string `json:"email" binding:"required,email"`
	Password   string `json:"password" binding:"required,min=6"`
	Year       string `json:"year"`
	Department string `json:"department"`
	College    string `json:"college" binding:"required"`
}

type AuthResponse struct {
	Token string      `json:"token"`
	User  models.User `json:"user"`
}

// Register creates a new user account
func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user already exists
	var existingUser models.User
	if err := config.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User with this email already exists"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Extract domain from email
	domain := ""
	parts := strings.Split(req.Email, "@")
	if len(parts) == 2 {
		domain = parts[1]
	} else {
		domain = "unknown"
	}

	// Find College
	var college models.College
	if err := config.DB.Where("LOWER(name) = LOWER(?)", req.College).First(&college).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid college selected."})
		return
	}

	// Verify email domain matches the selected college's domain
	if strings.ToLower(domain) != strings.ToLower(college.Domain) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email doesn't belong to " + college.Name})
		return
	}

	// Create user
	user := models.User{
		Name:       req.Name,
		Email:      req.Email,
		Password:   string(hashedPassword),
		Year:       req.Year,
		Department: req.Department,
		CollegeID:  college.ID,
	}

	if err := config.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Generate JWT token
	token, err := generateJWT(user.ID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Load user with college
	config.DB.Preload("College").First(&user, user.ID)

	c.JSON(http.StatusCreated, AuthResponse{
		Token: token,
		User:  user,
	})
}

// Login authenticates a user
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find user by email
	var user models.User
	if err := config.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Check if user has a password (for legacy users)
	if user.Password == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Please use the signup flow to set a password for your account"})
		return
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Generate JWT token
	token, err := generateJWT(user.ID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Load user with college
	config.DB.Preload("College").First(&user, user.ID)

	c.JSON(http.StatusOK, AuthResponse{
		Token: token,
		User:  user,
	})
}

// GetMe returns current user info
func GetMe(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var user models.User
	if err := config.DB.Preload("College").First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// generateJWT creates a JWT token for a user
func generateJWT(userID string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(time.Hour * 24 * 7).Unix(), // 7 days
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}

// ---------- GOOGLE OAUTH FLOW ----------

var googleOauthConfig = &oauth2.Config{
	RedirectURL:  os.Getenv("GOOGLE_CALLBACK_URL"),
	ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
	ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
	Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
	Endpoint:     google.Endpoint,
}

const oauthStateString = "randomized-secret-key-for-state"

// GoogleAuthLogin instantly redirects the user to the Google Consent Screen
func GoogleAuthLogin(c *gin.Context) {
	googleOauthConfig.ClientID = os.Getenv("GOOGLE_CLIENT_ID")
	googleOauthConfig.ClientSecret = os.Getenv("GOOGLE_CLIENT_SECRET")
	googleOauthConfig.RedirectURL = os.Getenv("GOOGLE_CALLBACK_URL")

	url := googleOauthConfig.AuthCodeURL(oauthStateString)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

// GoogleAuthCallback is the temporary testing endpoint that fetches Google User Data and prints it
func GoogleAuthCallback(c *gin.Context) {
	state := c.Query("state")
	if state != oauthStateString {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid oauth state"})
		return
	}

	code := c.Query("code")
	token, err := googleOauthConfig.Exchange(c, code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "code exchange failed: " + err.Error()})
		return
	}

	response, err := http.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + token.AccessToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed getting user info: " + err.Error()})
		return
	}
	defer response.Body.Close()

	contents, err := io.ReadAll(response.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed reading response body: " + err.Error()})
		return
	}

	// Dump the raw JSON bytes from Google straight to the backend terminal
	var userInfo map[string]interface{}
	json.Unmarshal(contents, &userInfo)

	log.Printf("Google Login Successful! Data: %v\n", userInfo)

	// Extract email and name
	email, _ := userInfo["email"].(string)
	name, _ := userInfo["name"].(string)

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173" // Default for local dev
	}

	if email == "" {
		c.Redirect(http.StatusTemporaryRedirect, frontendURL+"/signup?error=Could not extract email from Google")
		return
	}

	// Extract Domain from Google Workspace (hd)
	hd, ok := userInfo["hd"].(string)
	if !ok || hd == "" {
		c.SetCookie("oauth_error", base64.StdEncoding.EncodeToString([]byte("Please sign in with your official college email, not a personal account.")), 60, "/", "", false, false)
		c.Redirect(http.StatusTemporaryRedirect, frontendURL+"/login")
		return
	}

	domain := hd

	// Lookup College to verify domain authorization
	var college models.College
	if err := config.DB.Where("domain = ?", domain).First(&college).Error; err != nil {
		c.SetCookie("oauth_error", base64.StdEncoding.EncodeToString([]byte("Oops! It looks like your college isn't registered in the College Marketplace yet. Reach out to newcolleges@marketplace.com to get your campus added!")), 60, "/", "", false, false)
		c.Redirect(http.StatusTemporaryRedirect, frontendURL+"/login")
		return
	}

	// Check if this Google user already exists in our database
	var existingUser models.User
	if err := config.DB.Where("email = ?", email).First(&existingUser).Error; err == nil {
		// User exists! Generate JWT and log them in
		tokenString, errStr := generateJWT(existingUser.ID.String())
		if errStr != nil {
			c.SetCookie("oauth_error", base64.StdEncoding.EncodeToString([]byte("Failed to generate token")), 60, "/", "", false, false)
			c.Redirect(http.StatusTemporaryRedirect, frontendURL+"/login")
			return
		}

		// Redirect to frontend login listener with the token
		redirectURL := frontendURL + "/login?token=" + tokenString
		c.Redirect(http.StatusTemporaryRedirect, redirectURL)
		return
	}

	// Domain recognized! Redirect user to signup and autofill UI form fields via URL query strings
	escapedEmail := url.QueryEscape(email)
	escapedName := url.QueryEscape(name)
	escapedCollege := url.QueryEscape(college.Name)

	redirectURL := frontendURL + "/signup?email=" + escapedEmail + "&name=" + escapedName + "&college=" + escapedCollege
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}
