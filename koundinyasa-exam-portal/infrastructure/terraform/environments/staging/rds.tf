
resource "aws_db_subnet_group" "exam" {
  name = "exam-portal-staging-db-subnets"

  subnet_ids = [
    aws_subnet.main["db_a"].id,
    aws_subnet.main["db_b"].id
  ]

  tags = {
    Name        = "exam-portal-staging-db-subnets"
    Environment = "staging"
    Project     = "exam-portal"
  }
}

resource "aws_db_instance" "exam" {
  identifier = "exam-portal-staging-db"

  engine         = "postgres"
  engine_version = "17.11"

  instance_class = var.db_instance_class

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "examportal"
  username = "examadmin"
  port     = 5432

  manage_master_user_password = true

  db_subnet_group_name = aws_db_subnet_group.exam.name

  vpc_security_group_ids = [
    aws_security_group.rds.id
  ]

  publicly_accessible = false
  multi_az            = false

  backup_retention_period = 7
  backup_window           = "18:00-18:30"

  maintenance_window         = "sun:19:00-sun:19:30"
  auto_minor_version_upgrade = false

  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "exam-portal-staging-final"

  copy_tags_to_snapshot = true
  apply_immediately     = false

  tags = {
    Name        = "exam-portal-staging-db"
    Environment = "staging"
    Project     = "exam-portal"
    ManagedBy   = "terraform"
  }
}
