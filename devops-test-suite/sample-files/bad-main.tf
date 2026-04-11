# BAD Terraform — intentionally has many security issues for testing
# Upload this to the Terraform scanner to see findings
# Expected findings: AVD-AZU-0002, AVD-AZU-0016, CKV_AZURE_1, CKV_AZURE_2

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

# BAD: NSG allows all inbound traffic from the entire internet
resource "azurerm_network_security_group" "bad" {
  name                = "bad-nsg"
  location            = "East US"
  resource_group_name = "my-rg"

  security_rule {
    name                       = "allow-all-inbound"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "0.0.0.0/0"   # entire internet!
    destination_address_prefix = "*"
  }
}

# BAD: Storage account does not enforce HTTPS — data sent in plaintext
resource "azurerm_storage_account" "bad" {
  name                     = "mybadstorage"
  resource_group_name      = "my-rg"
  location                 = "East US"
  account_tier             = "Standard"
  account_replication_type = "LRS"
  enable_https_traffic_only = false   # allows HTTP!
  # min_tls_version not set
}

# BAD: Managed disk with no encryption
resource "azurerm_managed_disk" "bad" {
  name                 = "bad-disk"
  location             = "East US"
  resource_group_name  = "my-rg"
  storage_account_type = "Standard_LRS"
  create_option        = "Empty"
  disk_size_gb         = 10
  # No encryption_settings block
}
