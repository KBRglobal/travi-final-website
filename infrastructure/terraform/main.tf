# ============================================
# TRAVI Terraform Main Configuration
# ============================================

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Backend configuration - uncomment for production
  # backend "s3" {
  #   bucket         = "travi-terraform-state"
  #   key            = "infrastructure/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "travi-terraform-locks"
  # }
}

# Provider configuration
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "travi"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Random suffix for unique resource names
resource "random_id" "suffix" {
  byte_length = 4
}

# Local values
locals {
  name_prefix = "travi-${var.environment}"
  common_tags = {
    Project     = "travi"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
