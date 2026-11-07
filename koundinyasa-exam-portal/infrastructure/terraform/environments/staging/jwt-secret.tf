
data "aws_secretsmanager_secret" "jwt" {
  name = "exam-portal-staging-jwt"
}

resource "aws_iam_role_policy" "ecs_jwt_secret" {
  name = "exam-portal-staging-jwt-access"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Action = [
          "secretsmanager:GetSecretValue"
        ]

        Resource = data.aws_secretsmanager_secret.jwt.arn
      }
    ]
  })
}

output "jwt_secret_arn" {
  value = data.aws_secretsmanager_secret.jwt.arn
}
