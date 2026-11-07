
resource "aws_ecs_task_definition" "backend" {
  family                   = "exam-portal-staging-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"

  cpu    = "512"
  memory = "1024"

  execution_role_arn = aws_iam_role.ecs_execution.arn
  task_role_arn      = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${aws_ecr_repository.backend.repository_url}@sha256:f9218c610e8359e874f0a6107a20d74f49849523b7a45ecda784c7b708a4edf1"
      essential = true

      portMappings = [
        {
          containerPort = 5000
          hostPort      = 5000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = "5000"
        },
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
          name  = "DB_USER"
          value = "examapp"
        },
        {
          name  = "DB_SSL"
          value = "true"
        },
        {
          name  = "DB_SSL_CA_PATH"
          value = "/app/certs/global-bundle.pem"
        },
        {
          name  = "CLIENT_URL"
          value = "https://d2ulirdq336tyh.cloudfront.net"
        }
      ]

      secrets = [
        {
          name      = "DB_PASSWORD"
          valueFrom = data.aws_secretsmanager_secret.db_app.arn
        },
        {
          name      = "JWT_SECRET"
          valueFrom = data.aws_secretsmanager_secret.jwt.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"

        options = {
          awslogs-group         = aws_cloudwatch_log_group.backend.name
          awslogs-region        = "ap-south-1"
          awslogs-stream-prefix = "backend"
        }
      }

      stopTimeout = 30
    }
  ])

  tags = {
    Name = "exam-portal-staging-backend"
  }
}

output "backend_task_definition_arn" {
  value = aws_ecs_task_definition.backend.arn
}
