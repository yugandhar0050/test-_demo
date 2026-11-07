resource "aws_ecs_cluster" "exam" {
  name = "exam-portal-staging"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "exam-portal-staging"
  }
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/exam-portal-staging/backend"
  retention_in_days = 14

  tags = {
    Name = "exam-portal-staging-backend-logs"
  }
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.exam.name
}

output "backend_log_group" {
  value = aws_cloudwatch_log_group.backend.name
}
