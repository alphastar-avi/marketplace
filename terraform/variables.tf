variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "East Asia"
}

variable "db_admin_username" {
  description = "PostgreSQL administrator username"
  type        = string
  default     = "marketplace_admin"
}

variable "db_admin_password" {
  description = "PostgreSQL administrator password"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "marketplace"
}

variable "container_image_tag" {
  description = "Docker image tag for the container"
  type        = string
  default     = "latest"
}

variable "groq_api_key" {
  description = "Groq API key for AI description generation (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

# Existing Azure Storage resources (required when using data sources)
variable "storage_account_name" {
  description = "Name of the existing Azure Storage Account that will store product images"
  type        = string
}

variable "storage_container_name" {
  description = "Name of the existing Blob container (e.g., 'products')"
  type        = string
}

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
}

variable "google_callback_url" {
  description = "Google OAuth Callback URL"
  type        = string
}

variable "frontend_url" {
  description = "Frontend URL for redirects"
  type        = string
}
