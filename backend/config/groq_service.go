package config

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	_ "image/gif"
	"image/jpeg"
	_ "image/png"
	"io"
	"log"
	"mime"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"golang.org/x/image/draw"
)

const (
	maxBase64Size = 3 * 1024 * 1024 // 3 MB
	maxRawSize    = 2 * 1024 * 1024 // 2 MB
)

// GroqRequest represents the payload sent to Groq
type GroqRequest struct {
	Model               string        `json:"model"`
	Messages            []GroqMessage `json:"messages"`
	MaxCompletionTokens int           `json:"max_completion_tokens"`
	Temperature         float64       `json:"temperature"`
	TopP                float64       `json:"top_p"`
}

type GroqMessage struct {
	Role    string        `json:"role"`
	Content []interface{} `json:"content"` // Array of GroqTextContent or GroqImageContent
}

type GroqTextContent struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type GroqImageContent struct {
	Type     string       `json:"type"`
	ImageURL GroqImageURL `json:"image_url"`
}

type GroqImageURL struct {
	URL string `json:"url"` // Format: data:image/jpeg;base64,...
}

// GroqResponse represents the payload received from Groq
type GroqResponse struct {
	Choices []GroqChoice `json:"choices"`
}

type GroqChoice struct {
	Message struct {
		Role    string      `json:"role"`
		Content interface{} `json:"content"` // Usually string, can be array of objects
	} `json:"message"`
}

// IsGroqConfigured checks if GROQ_API_KEY is set
func IsGroqConfigured() bool {
	return os.Getenv("GROQ_API_KEY") != ""
}

// IsGeminiConfigured acts as an alias for backward compatibility in handlers
func IsGeminiConfigured() bool {
	return IsGroqConfigured()
}

// GenerateProductDescriptionFromTempFiles generates a description from saved temp files
func GenerateProductDescriptionFromTempFiles(title, category string, tempFilePaths []string) (string, error) {
	if !IsGroqConfigured() {
		return GenerateTemplateDescription(title, category), nil
	}

	content := []interface{}{
		GroqTextContent{
			Type: "text",
			Text: buildPromptFromTemp(title, category), // shorter variant
		},
	}

	var imageCount int
	for _, filePath := range tempFilePaths {
		base64Data, mimeType, err := readTempFileToBase64(filePath)
		if err != nil {
			log.Printf("⚠️  Error processing temp file %s: %v", filePath, err)
			continue
		}

		if imageCount >= 5 { // Groq limit
			break
		}

		content = append(content, GroqImageContent{
			Type: "image_url",
			ImageURL: GroqImageURL{
				URL: fmt.Sprintf("data:%s;base64,%s", mimeType, base64Data),
			},
		})
		imageCount++
	}

	if imageCount == 0 {
		return GenerateTemplateDescription(title, category), nil
	}

	return callGroqAPI(content)
}

// GenerateProductDescription generates a description from image URLs
func GenerateProductDescription(title, category string, imageURLs []string) (string, error) {
	if !IsGroqConfigured() {
		return GenerateTemplateDescription(title, category), nil
	}

	content := []interface{}{
		GroqTextContent{
			Type: "text",
			Text: buildPrompt(title, category),
		},
	}

	var imageCount int
	for _, url := range imageURLs {
		if imageCount >= 5 { // Groq limit
			break
		}

		base64Data, mimeType, err := downloadAndEncodeImage(url)
		if err != nil {
			log.Printf("⚠️ Error downloading/encoding URL %s: %v", url, err)
			continue
		}

		content = append(content, GroqImageContent{
			Type: "image_url",
			ImageURL: GroqImageURL{
				URL: fmt.Sprintf("data:%s;base64,%s", mimeType, base64Data),
			},
		})
		imageCount++
	}

	if imageCount == 0 {
		return GenerateTemplateDescription(title, category), nil
	}

	return callGroqAPI(content)
}

// GenerateProductDescriptionFromFiles generates a description straight from multipart files
func GenerateProductDescriptionFromFiles(title, category string, files []*multipart.FileHeader) (string, error) {
	if !IsGroqConfigured() {
		return GenerateTemplateDescription(title, category), nil
	}

	content := []interface{}{
		GroqTextContent{
			Type: "text",
			Text: buildPrompt(title, category),
		},
	}

	var imageCount int
	for _, file := range files {
		if imageCount >= 5 {
			break
		}

		base64Data, mimeType, err := processUploadedFile(file)
		if err != nil {
			log.Printf("⚠️ Error processing uploaded file %s: %v", file.Filename, err)
			continue
		}

		content = append(content, GroqImageContent{
			Type: "image_url",
			ImageURL: GroqImageURL{
				URL: fmt.Sprintf("data:%s;base64,%s", mimeType, base64Data),
			},
		})
		imageCount++
	}

	if imageCount == 0 {
		return GenerateTemplateDescription(title, category), nil
	}

	return callGroqAPI(content)
}

// callGroqAPI makes the request to Groq OpenAI format
func callGroqAPI(contentArray []interface{}) (string, error) {
	apiKey := os.Getenv("GROQ_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("GROQ_API_KEY not configured")
	}

	url := "https://api.groq.com/openai/v1/chat/completions"

	requestBody := GroqRequest{
		Model: "meta-llama/llama-4-scout-17b-16e-instruct", // or maverick
		Messages: []GroqMessage{
			{
				Role:    "user",
				Content: contentArray,
			},
		},
		MaxCompletionTokens: 1024,
		Temperature:         1.0,
		TopP:                1.0,
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
	req.Header.Set("Authorization", "Bearer "+apiKey)

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
		log.Printf("❌ Groq API HTTP error: status %d, body: %s", resp.StatusCode, string(body))
		return "", fmt.Errorf("Groq API error: status %d", resp.StatusCode)
	}

	var groqResp GroqResponse
	if err := json.Unmarshal(body, &groqResp); err != nil {
		return "", err
	}

	if len(groqResp.Choices) == 0 {
		return "", fmt.Errorf("no content in Groq response")
	}

	// The content could be a string or an array depending on structural parsing
	content := groqResp.Choices[0].Message.Content
	switch v := content.(type) {
	case string:
		return strings.TrimSpace(v), nil
	case []interface{}:
		for _, part := range v {
			if obj, ok := part.(map[string]interface{}); ok {
				if obj["type"] == "text" && obj["text"] != nil {
					return strings.TrimSpace(obj["text"].(string)), nil
				}
			}
		}
	}

	return "", fmt.Errorf("could not extract text from Groq response")
}

// readTempFileToBase64 reads and compresses an image
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

	ext := filepath.Ext(filePath)
	mimeType := mime.TypeByExtension(ext)
	if mimeType == "" {
		mimeType = "image/jpeg"
	}

	compressedData, newMime := compressImage(data, mimeType, maxBase64Size)
	return base64.StdEncoding.EncodeToString(compressedData), newMime, nil
}

// processUploadedFile processes an uploaded multipart file
func processUploadedFile(fileHeader *multipart.FileHeader) (string, string, error) {
	file, err := fileHeader.Open()
	if err != nil {
		return "", "", err
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		return "", "", err
	}

	ext := filepath.Ext(fileHeader.Filename)
	mimeType := mime.TypeByExtension(ext)
	if mimeType == "" {
		mimeType = "image/jpeg"
	}

	compressedData, newMime := compressImage(data, mimeType, maxBase64Size)
	return base64.StdEncoding.EncodeToString(compressedData), newMime, nil
}

// downloadAndEncodeImage downloads and compresses an image from URL
func downloadAndEncodeImage(url string) (string, string, error) {
	client := &http.Client{Timeout: 10 * time.Second}
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
		mimeType = "image/jpeg"
	}

	compressedData, newMime := compressImage(data, mimeType, maxBase64Size)
	return base64.StdEncoding.EncodeToString(compressedData), newMime, nil
}

// compressImage resizes and reduces JPEG quality
func compressImage(imageData []byte, mimeType string, maxSizeBytes int) ([]byte, string) {
	if len(imageData) <= maxSizeBytes {
		return imageData, mimeType
	}

	img, _, err := image.Decode(bytes.NewReader(imageData))
	if err != nil {
		log.Printf("⚠️ Cannot decode image for compression: %v", err)
		return imageData, mimeType // fallback to original
	}

	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()
	maxDim := 1920

	if width > maxDim || height > maxDim {
		var newW, newH int
		if width > height {
			newW = maxDim
			newH = (height * maxDim) / width
		} else {
			newH = maxDim
			newW = (width * maxDim) / height
		}

		dst := image.NewRGBA(image.Rect(0, 0, newW, newH))
		draw.NearestNeighbor.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)
		img = dst
	}

	var buf bytes.Buffer
	qualities := []int{90, 80, 70, 60, 50}

	for _, q := range qualities {
		buf.Reset()
		err = jpeg.Encode(&buf, img, &jpeg.Options{Quality: q})
		if err == nil && buf.Len() <= maxSizeBytes {
			return buf.Bytes(), "image/jpeg"
		}
	}

	// Extreme fallback
	bounds = img.Bounds()
	width = bounds.Dx()
	height = bounds.Dy()
	maxDim = 1280

	var newW, newH int
	if width > height {
		newW = maxDim
		newH = (height * maxDim) / width
	} else {
		newH = maxDim
		newW = (width * maxDim) / height
	}

	dst := image.NewRGBA(image.Rect(0, 0, newW, newH))
	draw.NearestNeighbor.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)

	buf.Reset()
	jpeg.Encode(&buf, dst, &jpeg.Options{Quality: 75})

	return buf.Bytes(), "image/jpeg"
}

// buildPrompt creates the full prompt for Groq
func buildPrompt(title, category string) string {
	return fmt.Sprintf(`Product Information:
- Title: "%s"
- Category: "%s"
- Target Audience: College students buying/selling items

Instructions:
1. Analyze the uploaded images carefully to identify key features, condition, style, and unique selling points
2. Write a short, punchy description (strictly 4-5 sentences maximum, ) that grabs attention and sells the product
3. Do NOT use ANY markdown formatting (no asterisks, no bold text, no bullet points, no headers)
4. Do NOT use introductory phrases like "Here is a description..." or "Get ready for..."
5. Mention specific visible details from the images (condition, quality, features, style)
6. Focus on what makes this item special and worth buying for a college student

Generate the product description:`, title, category)
}

// buildPromptFromTemp allows a shorter variant or identical prompt
func buildPromptFromTemp(title, category string) string {
	return buildPrompt(title, category)
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

	return fmt.Sprintf("%s in good condition. Perfect for college students. Great value and ready to use!", title)
}
