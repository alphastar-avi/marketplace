package config

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// GeminiRequest represents the request payload to Gemini API
type GeminiRequest struct {
	Contents []GeminiContent `json:"contents"`
	GenerationConfig GeminiGenerationConfig `json:"generationConfig"`
}

type GeminiContent struct {
	Parts []GeminiPart `json:"parts"`
}

type GeminiPart struct {
	Text string          `json:"text,omitempty"`
	InlineData *GeminiInlineData `json:"inlineData,omitempty"`
}

type GeminiInlineData struct {
	MimeType string `json:"mimeType"`
	Data     string `json:"data"`
}

type GeminiGenerationConfig struct {
	Temperature float64 `json:"temperature"`
	TopK        int     `json:"topK"`
	TopP        float64 `json:"topP"`
	MaxOutputTokens int `json:"maxOutputTokens"`
}

// GeminiResponse represents the response from Gemini API
type GeminiResponse struct {
	Candidates []GeminiCandidate `json:"candidates"`
}

type GeminiCandidate struct {
	Content GeminiContent `json:"content"`
}

// IsGeminiConfigured checks if GEMINI_API_KEY is set
func IsGeminiConfigured() bool {
	return os.Getenv("GEMINI_API_KEY") != ""
}

// GenerateProductDescriptionFromTempFiles processes temp file paths and generates description
func GenerateProductDescriptionFromTempFiles(title, category string, tempFilePaths []string) (string, error) {
	if !IsGeminiConfigured() {
		return GenerateTemplateDescription(title, category), nil
	}

	var parts []GeminiPart
	var imageCount int

	// Process each temp file
	for _, filePath := range tempFilePaths {
		base64Data, mimeType, err := readTempFileToBase64(filePath)
		if err != nil {
			log.Printf("⚠️  Error reading temp file %s: %v", filePath, err)
			continue // Skip invalid files
		}

		if imageCount >= 4 { // Limit to 4 images for API
			break
		}

		parts = append(parts, GeminiPart{
			InlineData: &GeminiInlineData{
				MimeType: mimeType,
				Data:     base64Data,
			},
		})
		imageCount++
	}

	if imageCount == 0 {
		return GenerateTemplateDescription(title, category), nil
	}

	// Build prompt
	prompt := buildPrompt(title, category)
	parts = append([]GeminiPart{{Text: prompt}}, parts...)

	return callGeminiAPI(parts)
}

// GenerateProductDescription processes image URLs and generates description
func GenerateProductDescription(title, category string, imageURLs []string) (string, error) {
	if !IsGeminiConfigured() {
		return GenerateTemplateDescription(title, category), nil
	}

	var parts []GeminiPart
	var imageCount int

	// Process each image URL
	for _, url := range imageURLs {
		if imageCount >= 4 { // Limit to 4 images for API
			break
		}

		base64Data, mimeType, err := downloadAndEncodeImage(url)
		if err != nil {
			continue // Skip invalid URLs
		}

		parts = append(parts, GeminiPart{
			InlineData: &GeminiInlineData{
				MimeType: mimeType,
				Data:     base64Data,
			},
		})
		imageCount++
	}

	if imageCount == 0 {
		return GenerateTemplateDescription(title, category), nil
	}

	// Build prompt
	prompt := buildPrompt(title, category)
	parts = append([]GeminiPart{{Text: prompt}}, parts...)

	return callGeminiAPI(parts)
}

// readTempFileToBase64 reads a temp file and converts to base64
func readTempFileToBase64(filePath string) (string, string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", "", err
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		return "", "", err
	}

	// Determine MIME type from file extension
	ext := filepath.Ext(filePath)
	mimeType := mime.TypeByExtension(ext)
	if mimeType == "" {
		mimeType = "image/jpeg" // Default
	}

	base64Data := base64.StdEncoding.EncodeToString(data)
	return base64Data, mimeType, nil
}

// downloadAndEncodeImage downloads an image from URL and converts to base64
func downloadAndEncodeImage(url string) (string, string, error) {
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Get(url)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("failed to download image: status %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", err
	}

	mimeType := resp.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "image/jpeg" // Default
	}

	base64Data := base64.StdEncoding.EncodeToString(data)
	return base64Data, mimeType, nil
}

// buildPrompt creates the prompt for Gemini
func buildPrompt(title, category string) string {
	return fmt.Sprintf(`Generate a 2-3 sentence product description for a college marketplace listing.

Title: %s
Category: %s

Requirements:
- Write in a friendly, casual tone suitable for college students
- Mention key features visible in the images
- Keep it concise (2-3 sentences)
- Focus on what makes this item great for students
- Include condition notes if visible

Description:`, title, category)
}

// callGeminiAPI makes the actual API call to Gemini
func callGeminiAPI(parts []GeminiPart) (string, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("GEMINI_API_KEY not configured")
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=%s", apiKey)

	requestBody := GeminiRequest{
		Contents: []GeminiContent{
			{
				Parts: parts,
			},
		},
		GenerationConfig: GeminiGenerationConfig{
			Temperature:     0.7,
			TopK:            40,
			TopP:            0.8,
			MaxOutputTokens: 150,
		},
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ Gemini API HTTP error: status %d, body: %s", resp.StatusCode, string(body))
		return "", fmt.Errorf("Gemini API error: status %d, body: %s", resp.StatusCode, string(body))
	}

	var geminiResp GeminiResponse
	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return "", err
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no content in Gemini response")
	}

	description := geminiResp.Candidates[0].Content.Parts[0].Text
	return strings.TrimSpace(description), nil
}

// GenerateTemplateDescription generates a template-based description as fallback
func GenerateTemplateDescription(title, category string) string {
	templates := map[string]string{
		"Electronics": fmt.Sprintf("%s in excellent condition. Perfect for college students looking for reliable tech. Great value at this price!", title),
		"Books":       fmt.Sprintf("%s in good condition. Essential for your studies. Perfect for students who need quality textbooks without breaking the bank!", title),
		"Furniture":   fmt.Sprintf("%s perfect for dorm rooms or apartments. Functional and stylish for student living spaces. Pick up ready!", title),
		"Clothing":    fmt.Sprintf("%s in great condition. Stylish and practical for campus life. Perfect for students building their wardrobe!", title),
		"Sports":      fmt.Sprintf("%s in good working condition. Great for staying active on campus. Perfect for student athletes or fitness enthusiasts!", title),
	}

	if template, exists := templates[category]; exists {
		return template
	}

	// Default template
	return fmt.Sprintf("%s in good condition. Perfect for college students. Great value and ready to use!", title)
}

