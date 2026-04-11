# GOOD Terraform — follows all security best practices
# Upload this to the Terraform scanner to see a high score
# Expected: few or no findings, score close to 100

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# GOOD: NSG restricts inbound to HTTPS only from internal network
resource "azurerm_network_security_group" "good" {
  name                = "good-nsg"
  location            = "East US"
  resource_group_name = "my-rg"

  tags = {
    environment = "production"
    owner       = "devops-team"
    managed_by  = "terraform"
  }

  security_rule {
    name                       = "allow-https-internal"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"           # HTTPS only
    source_address_prefix      = "10.0.0.0/8"   # internal network only
    destination_address_prefix = "*"
  }
}

# GOOD: Storage account enforces HTTPS and modern TLS
resource "azurerm_storage_account" "good" {
  name                     = "mygoodstorage"
  resource_group_name      = "my-rg"
  location                 = "East US"
  account_tier             = "Standard"
  account_replication_type = "LRS"

  enable_https_traffic_only = true    # HTTPS enforced
  min_tls_version           = "TLS1_2"

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}

# GOOD: Managed disk with encryption enabled
resource "azurerm_managed_disk" "good" {
  name                 = "good-disk"
  location             = "East US"
  resource_group_name  = "my-rg"
  storage_account_type = "Premium_LRS"
  create_option        = "Empty"
  disk_size_gb         = 10

  encryption_settings {
    enabled = true
  }

  tags = {
    environment = "production"
  }
}
