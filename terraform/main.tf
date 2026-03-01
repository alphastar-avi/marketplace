terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~>3.5"
    }
  }
}

provider "azurerm" {
  features {}
}

# Resource Group - Use existing one created by Static Web App
data "azurerm_resource_group" "marketplace" {
  name = "rg-marketplace-${var.environment}"
}

# Container Apps Environment - Import existing one
import {
  to = azurerm_container_app_environment.marketplace
  id = "/subscriptions/0fb50fc5-dd1a-4137-9b95-4f5ef7502a10/resourceGroups/rg-marketplace-dev/providers/Microsoft.App/managedEnvironments/cae-marketplace-dev"
}

resource "azurerm_container_app_environment" "marketplace" {
  name                = "cae-marketplace-${var.environment}"
  location            = data.azurerm_resource_group.marketplace.location
  resource_group_name = data.azurerm_resource_group.marketplace.name
}

# PostgreSQL Flexible Server - Use existing one
data "azurerm_postgresql_flexible_server" "marketplace" {
  name                = "psql-marketplace-dev-xgarri"  # Use the latest existing one
  resource_group_name = data.azurerm_resource_group.marketplace.name
}

# Existing Storage Account and Container (do not create)
data "azurerm_storage_account" "marketplace" {
  name                = var.storage_account_name
  resource_group_name = data.azurerm_resource_group.marketplace.name
}

data "azurerm_storage_container" "products" {
  name                  = var.storage_container_name
  storage_account_name  = data.azurerm_storage_account.marketplace.name
}

# PostgreSQL Database - Import existing one
import {
  to = azurerm_postgresql_flexible_server_database.marketplace
  id = "/subscriptions/0fb50fc5-dd1a-4137-9b95-4f5ef7502a10/resourceGroups/rg-marketplace-dev/providers/Microsoft.DBforPostgreSQL/flexibleServers/psql-marketplace-dev-xgarri/databases/marketplace"
}

resource "azurerm_postgresql_flexible_server_database" "marketplace" {
  name      = var.db_name
  server_id = data.azurerm_postgresql_flexible_server.marketplace.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# PostgreSQL Firewall Rule - Import existing one
import {
  to = azurerm_postgresql_flexible_server_firewall_rule.azure_services
  id = "/subscriptions/0fb50fc5-dd1a-4137-9b95-4f5ef7502a10/resourceGroups/rg-marketplace-dev/providers/Microsoft.DBforPostgreSQL/flexibleServers/psql-marketplace-dev-xgarri/firewallRules/AllowAzureServices"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "azure_services" {
  name             = "AllowAzureServices"
  server_id        = data.azurerm_postgresql_flexible_server.marketplace.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# Container App - Import existing one
import {
  to = azurerm_container_app.marketplace_backend
  id = "/subscriptions/0fb50fc5-dd1a-4137-9b95-4f5ef7502a10/resourceGroups/rg-marketplace-dev/providers/Microsoft.App/containerApps/ca-marketplace-backend-dev"
}

resource "azurerm_container_app" "marketplace_backend" {
  name                         = "ca-marketplace-backend-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.marketplace.id
  resource_group_name          = data.azurerm_resource_group.marketplace.name
  revision_mode                = "Single"

  template {
    container {
      name   = "marketplace-backend"
      image  = "alphastar59/marketplace-backend-alpine-amd64:${var.container_image_tag}"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "DB_HOST"
        value = data.azurerm_postgresql_flexible_server.marketplace.fqdn
      }

      env {
        name  = "DB_PORT"
        value = "5432"
      }

      env {
        name  = "DB_NAME"
        value = var.db_name
      }

      env {
        name  = "DB_USER"
        value = var.db_admin_username
      }

      env {
        name        = "DB_PASSWORD"
        secret_name = "db-password"
      }

      env {
        name  = "PORT"
        value = "8080"
      }

      env {
        name  = "GIN_MODE"
        value = "release"
      }

      env {
        name  = "DB_SSLMODE"
        value = "require"
      }

      env {
        name        = "GROQ_API_KEY"
        secret_name = "groq-api-key"
      }

      # Azure Blob Storage env
      env {
        name  = "AZURE_STORAGE_ACCOUNT_NAME"
        value = data.azurerm_storage_account.marketplace.name
      }

      env {
        name        = "AZURE_STORAGE_CONNECTION_STRING"
        secret_name = "azure-blob-conn"
      }

      env {
        name  = "AZURE_STORAGE_CONTAINER"
        value = data.azurerm_storage_container.products.name
      }
    }

    min_replicas = 0
    max_replicas = 10
  }

  secret {
    name  = "db-password"
    value = var.db_admin_password
  }

  secret {
    name  = "groq-api-key"
    value = var.groq_api_key
  }

  # Storage connection string secret (read from existing storage account)
  secret {
    name  = "azure-blob-conn"
    value = data.azurerm_storage_account.marketplace.primary_connection_string
  }

  ingress {
    allow_insecure_connections = false
    external_enabled           = true
    target_port                = 8080

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }
}
