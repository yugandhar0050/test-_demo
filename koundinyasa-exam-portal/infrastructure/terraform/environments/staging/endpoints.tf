
locals {
  private_services = toset([
    "ecr.api",
    "ecr.dkr",
    "logs",
    "secretsmanager"
  ])
}

resource "aws_security_group" "endpoints" {
  name_prefix = "exam-staging-endpoints-"
  description = "Private AWS service endpoints"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "exam-staging-endpoints"
  }
}

resource "aws_vpc_security_group_ingress_rule" "endpoints_https" {
  security_group_id            = aws_security_group.endpoints.id
  referenced_security_group_id = aws_security_group.ecs.id

  ip_protocol = "tcp"
  from_port   = 443
  to_port     = 443
}

resource "aws_vpc_security_group_egress_rule" "ecs_https" {
  security_group_id            = aws_security_group.ecs.id
  referenced_security_group_id = aws_security_group.endpoints.id

  ip_protocol = "tcp"
  from_port   = 443
  to_port     = 443
}

resource "aws_vpc_security_group_egress_rule" "ecs_postgres" {
  security_group_id            = aws_security_group.ecs.id
  referenced_security_group_id = aws_security_group.rds.id

  ip_protocol = "tcp"
  from_port   = 5432
  to_port     = 5432
}

resource "aws_vpc_endpoint" "interface" {
  for_each = local.private_services

  vpc_id = aws_vpc.main.id

  service_name      = "com.amazonaws.ap-south-1.${each.value}"
  vpc_endpoint_type = "Interface"

  subnet_ids = [
    aws_subnet.main["app_a"].id,
    aws_subnet.main["app_b"].id
  ]

  security_group_ids = [
    aws_security_group.endpoints.id
  ]

  private_dns_enabled = true

  tags = {
    Name = "exam-staging-${replace(each.value, ".", "-")}"
  }
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.ap-south-1.s3"
  vpc_endpoint_type = "Gateway"

  route_table_ids = [
    aws_route_table.app.id
  ]

  tags = {
    Name = "exam-staging-s3"
  }
}

data "aws_prefix_list" "s3" {
  name = "com.amazonaws.ap-south-1.s3"
}

resource "aws_vpc_security_group_egress_rule" "ecs_s3" {
  security_group_id = aws_security_group.ecs.id
  prefix_list_id    = data.aws_prefix_list.s3.id

  ip_protocol = "tcp"
  from_port   = 443
  to_port     = 443
}
