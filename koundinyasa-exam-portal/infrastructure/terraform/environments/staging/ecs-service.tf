
resource "aws_ecs_service" "backend" {
  name            = "exam-portal-staging-backend"
  cluster         = aws_ecs_cluster.exam.id
  task_definition = aws_ecs_task_definition.backend.arn

  desired_count = 2
  launch_type   = "FARGATE"

  platform_version = "LATEST"

  health_check_grace_period_seconds = 120

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets = [
      aws_subnet.main["app_a"].id,
      aws_subnet.main["app_b"].id
    ]

    security_groups = [
      aws_security_group.ecs.id
    ]

    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 5000
  }

  depends_on = [
    aws_lb_listener.http,
    aws_iam_role_policy.ecs_db_app_secret,
    aws_iam_role_policy.ecs_jwt_secret,
    aws_iam_role_policy_attachment.ecs_execution
  ]

  tags = {
    Name = "exam-portal-staging-backend"
  }
}

output "backend_service_name" {
  value = aws_ecs_service.backend.name
}
