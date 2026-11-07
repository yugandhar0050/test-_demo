resource "aws_security_group" "ecs" {
  name_prefix = "exam-staging-ecs-"
  description = "Security group for Exam Portal ECS tasks"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "exam-staging-ecs-sg"
  }
}

resource "aws_security_group" "rds" {
  name_prefix = "exam-staging-rds-"
  description = "PostgreSQL access from ECS only"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "exam-staging-rds-sg"
  }
}

resource "aws_vpc_security_group_ingress_rule" "postgres" {
  security_group_id            = aws_security_group.rds.id
  referenced_security_group_id = aws_security_group.ecs.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  description                  = "PostgreSQL from ECS"
}
