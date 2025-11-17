package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/blob"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/blockblob"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/container"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/bloberror"
	"github.com/google/uuid"
)

type AzureBlobStorage struct {
	client     *azblob.Client
	container  string
	accountURL string
}

func NewAzureBlobStorage() (*AzureBlobStorage, error) {
	accountName := os.Getenv("AZURE_STORAGE_ACCOUNT_NAME")
	connString := os.Getenv("AZURE_STORAGE_CONNECTION_STRING")
	containerName := os.Getenv("AZURE_STORAGE_CONTAINER")

	if accountName == "" || connString == "" || containerName == "" {
		return nil, fmt.Errorf("missing required Azure Storage configuration")
	}

	// Create a new blob client
	client, err := azblob.NewClientFromConnectionString(connString, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create blob client: %v", err)
	}

	// Create container if it doesn't exist
	ctx := context.Background()
	_, err = client.CreateContainer(ctx, containerName, nil)
	if err != nil {
		// Check if the error is because the container already exists
		var respErr *azcore.ResponseError
		if errors.As(err, &respErr) && !strings.Contains(err.Error(), "ContainerAlreadyExists") && !bloberror.HasCode(err, bloberror.ContainerAlreadyExists) {
			return nil, fmt.Errorf("failed to create container: %v", err)
		}
		// If the container already exists, we can continue
	}

	// Set container to public access
	_, err = client.ServiceClient().NewContainerClient(containerName).SetAccessPolicy(ctx, &container.SetAccessPolicyOptions{
		Access: to.Ptr(container.PublicAccessTypeBlob),
	})
	if err != nil {
		log.Printf("Warning: Failed to set container access policy: %v", err)
	}

	return &AzureBlobStorage{
		client:     client,
		container:  containerName,
		accountURL: fmt.Sprintf("https://%s.blob.core.windows.net", accountName),
	}, nil
}

// UploadFile uploads a file to Azure Blob Storage and returns the public URL
func (s *AzureBlobStorage) UploadFile(file *multipart.FileHeader, prefix string) (string, error) {
	// Open the uploaded file
	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("failed to open file: %v", err)
	}
	defer src.Close()

	// Generate a unique filename
	ext := filepath.Ext(file.Filename)
	blobName := fmt.Sprintf("%s/%s%s", prefix, uuid.New().String(), ext)

	// Create a new block blob client
	blobClient := s.client.ServiceClient().NewContainerClient(s.container).NewBlockBlobClient(blobName)

	// Set content type from file header or detect it
	contentType := file.Header.Get("Content-Type")
	if contentType == "" {
		contentType = http.DetectContentType([]byte(file.Filename))
	}

	// Read the file content
	fileContent, err := io.ReadAll(src)
	if err != nil {
		return "", fmt.Errorf("failed to read file content: %v", err)
	}

	// Upload the file content with content type header
	_, err = blobClient.UploadBuffer(
		context.Background(),
		fileContent,
		&blockblob.UploadBufferOptions{
			HTTPHeaders: &blob.HTTPHeaders{
				BlobContentType: to.Ptr(contentType),
			},
		},
	)
	if err != nil {
		return "", fmt.Errorf("failed to upload file: %v", err)
	}

	// Return the public URL
	return fmt.Sprintf("%s/%s/%s", s.accountURL, s.container, url.PathEscape(blobName)), nil
}

// DeleteFile deletes a file from Azure Blob Storage
func (s *AzureBlobStorage) DeleteFile(blobURL string) error {
	// Extract blob name from URL
	u, err := url.Parse(blobURL)
	if err != nil {
		return fmt.Errorf("invalid blob URL: %v", err)
	}

	// Remove the leading slash and container name from the path
	blobName := u.Path[1:] // Remove leading slash
	containerPrefix := s.container + "/"
	if len(blobName) > len(containerPrefix) && blobName[:len(containerPrefix)] == containerPrefix {
		blobName = blobName[len(containerPrefix):]
	}

	_, err = s.client.DeleteBlob(context.Background(), s.container, blobName, nil)
	return err
}

