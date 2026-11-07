
resource "aws_ecs_task_definition" "migration" {
  family                   = "exam-portal-staging-migration"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"

  cpu    = "256"
  memory = "512"

  execution_role_arn = aws_iam_role.ecs_execution.arn
  task_role_arn      = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "migration"
      image     = "${aws_ecr_repository.backend.repository_url}:rds-ready-45f686b-20261107094135"
      essential = true

      command = ["npm", "run", "migrate"]

      environment = [
        {
          name  = "DB_HOST"
          value = aws_db_instance.exam.address
        },
        {
          name  = "DB_PORT"
          value = "5432"
        },
        {
          name  = "DB_NAME"
          value = "examportal"
        },
        {
          name  = "DB_SSL"
          value = "true"
        },
        {
          name  = "DB_SSL_CA_PATH"
          value = "/app/certs/global-bundle.pem"
        }
      ]

      secrets = [
        {
          name      = "DB_USER"
          valueFrom = "${aws_db_instance.exam.master_user_secret[0].secret_arn}:username::"
        },
        {
          name      = "DB_PASSWORD"
          valueFrom = "${aws_db_instance.exam.master_user_secret[0].secret_arn}:password::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.backend.name
          awslogs-region        = "ap-south-1"
          awslogs-stream-prefix = "migration"
        }
      }
    }
  ])

  tags = {
    Name = "exam-portal-staging-migration"
  }
}

output "migration_task_definition_arn" {
  value = aws_ecs_task_definition.migration.arn
}

