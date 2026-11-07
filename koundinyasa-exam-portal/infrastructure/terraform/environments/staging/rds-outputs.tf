
output "rds_endpoint" {
  description = "Private RDS PostgreSQL hostname"
  value       = aws_db_instance.exam.address
}

output "rds_port" {
  description = "PostgreSQL connection port"
  value       = aws_db_instance.exam.port
}

output "rds_master_secret_arn" {
  description = "ARN of the RDS-managed master password"
  value       = aws_db_instance.exam.master_user_secret[0].secret_arn
}

output "ecs_security_group_id" {
  description = "Security group assigned to ECS application tasks"
  value       = aws_security_group.ecs.id
}
