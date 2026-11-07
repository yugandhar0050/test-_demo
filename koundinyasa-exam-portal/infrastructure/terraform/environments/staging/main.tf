locals {
  name = "exam-portal-staging"

  subnets = {
    public_a = {
      cidr = "10.20.1.0/24"
      az   = "ap-south-1a"
      tier = "public"
    }
    public_b = {
      cidr = "10.20.2.0/24"
      az   = "ap-south-1b"
      tier = "public"
    }
    app_a = {
      cidr = "10.20.11.0/24"
      az   = "ap-south-1a"
      tier = "app"
    }
    app_b = {
      cidr = "10.20.12.0/24"
      az   = "ap-south-1b"
      tier = "app"
    }
    db_a = {
      cidr = "10.20.21.0/24"
      az   = "ap-south-1a"
      tier = "database"
    }
    db_b = {
      cidr = "10.20.22.0/24"
      az   = "ap-south-1b"
      tier = "database"
    }
  }
}

resource "aws_vpc" "main" {
  cidr_block           = "10.20.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${local.name}-vpc"
  }
}

resource "aws_subnet" "main" {
  for_each = local.subnets

  vpc_id                  = aws_vpc.main.id
  cidr_block              = each.value.cidr
  availability_zone       = each.value.az
  map_public_ip_on_launch = each.value.tier == "public"

  tags = {
    Name = "${local.name}-${each.key}"
    Tier = each.value.tier
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${local.name}-igw"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${local.name}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  for_each = {
    for k, v in local.subnets : k => v
    if v.tier == "public"
  }

  subnet_id      = aws_subnet.main[each.key].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "app" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${local.name}-app-rt"
  }
}

resource "aws_route_table_association" "app" {
  for_each = {
    for k, v in local.subnets : k => v
    if v.tier == "app"
  }

  subnet_id      = aws_subnet.main[each.key].id
  route_table_id = aws_route_table.app.id
}

resource "aws_route_table" "database" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${local.name}-db-rt"
  }
}

resource "aws_route_table_association" "database" {
  for_each = {
    for k, v in local.subnets : k => v
    if v.tier == "database"
  }

  subnet_id      = aws_subnet.main[each.key].id
  route_table_id = aws_route_table.database.id
}
