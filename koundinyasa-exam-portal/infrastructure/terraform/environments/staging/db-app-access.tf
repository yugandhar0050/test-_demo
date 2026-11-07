
data "aws_secretsmanager_secret" "db_app" {
  name = "exam-portal-staging-db-app"
}

resource "aws_iam_role_policy" "ecs_db_app_secret" {
  name = "exam-portal-staging-db-app-access"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Action = [
          "secretsmanager:GetSecretValue"
        ]

        Resource = data.aws_secretsmanager_secret.db_app.arn
      }
    ]
  })
}

output "db_app_secret_arn" {
  value = data.aws_secretsmanager_secret.db_app.arn
}
