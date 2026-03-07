package handlers

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
)

// severityThreshold — 0=safe, 2=low, 4=medium, 6=high
// We reject anything >= 2 (low severity and above)
const severityThreshold = 2

type contentSafetyRequest struct {
	Text       string   `json:"text"`
	Categories []string `json:"categories"`
}

type contentSafetyResult struct {
	Category string `json:"category"`
	Severity int    `json:"severity"`
}

type contentSafetyResponse struct {
	CategoriesAnalysis []contentSafetyResult `json:"categoriesAnalysis"`
}

// ModerateText calls Azure AI Content Safety to check text.
// Returns an error with a human-readable reason if content is flagged.
// Returns nil if content is safe or if the service is not configured (fail-open).
func ModerateText(text string) error {
	endpoint := os.Getenv("AZURE_CONTENT_SAFETY_ENDPOINT")
	key := os.Getenv("AZURE_CONTENT_SAFETY_KEY")

	// Fail-open: if not configured, skip moderation
	if endpoint == "" || key == "" {
		return nil
	}

	endpoint = strings.TrimRight(endpoint, "/")
	url := fmt.Sprintf("%s/contentsafety/text:analyze?api-version=2023-10-01", endpoint)

	payload := contentSafetyRequest{
		Text:       text,
		Categories: []string{"Hate", "Violence", "Sexual", "SelfHarm"},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil // fail-open on marshalling error
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return nil // fail-open
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Ocp-Apim-Subscription-Key", key)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil // fail-open on network error
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil // fail-open on unexpected API error
	}

	var result contentSafetyResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil // fail-open
	}

	for _, cat := range result.CategoriesAnalysis {
		if cat.Severity >= severityThreshold {
			return fmt.Errorf("content flagged: %s content detected", strings.ToLower(cat.Category))
		}
	}

	return nil
}

type imageSafetyRequest struct {
	Image      imagePayload `json:"image"`
	Categories []string     `json:"categories"`
}

type imagePayload struct {
	Content string `json:"content"` // base64-encoded image
}

// ModerateImage calls Azure AI Content Safety to check image bytes.
// Returns an error with a human-readable reason if content is flagged.
// Returns nil if safe or if the service is not configured (fail-open).
func ModerateImage(imageBytes []byte) error {
	endpoint := os.Getenv("AZURE_CONTENT_SAFETY_ENDPOINT")
	key := os.Getenv("AZURE_CONTENT_SAFETY_KEY")

	// Fail-open: if not configured, skip moderation
	if endpoint == "" || key == "" {
		return nil
	}

	endpoint = strings.TrimRight(endpoint, "/")
	url := fmt.Sprintf("%s/contentsafety/image:analyze?api-version=2023-10-01", endpoint)

	payload := imageSafetyRequest{
		Image:      imagePayload{Content: base64.StdEncoding.EncodeToString(imageBytes)},
		Categories: []string{"Hate", "Violence", "Sexual", "SelfHarm"},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil // fail-open
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return nil // fail-open
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Ocp-Apim-Subscription-Key", key)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil // fail-open on network error
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil // fail-open on unexpected API error
	}

	var result contentSafetyResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil // fail-open
	}

	for _, cat := range result.CategoriesAnalysis {
		if cat.Severity >= severityThreshold {
			return fmt.Errorf("image flagged: %s content detected", strings.ToLower(cat.Category))
		}
	}

	return nil
}
