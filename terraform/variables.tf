variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "East US"
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
