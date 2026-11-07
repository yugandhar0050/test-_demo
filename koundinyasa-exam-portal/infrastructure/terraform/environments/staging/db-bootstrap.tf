
resource "aws_ecs_task_definition" "db_bootstrap" {
  family                   = "exam-portal-staging-db-bootstrap"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"

  cpu    = "256"
  memory = "512"

  execution_role_arn = aws_iam_role.ecs_execution.arn
  task_role_arn      = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "db-bootstrap"
      image     = "${aws_ecr_repository.backend.repository_url}:rds-ready-45f686b-20261107094135"
      essential = true

      command = [
        "node",
        "-e",
        <<-JS
          const { Client } = require("pg");
          const fs = require("fs");

          async function main() {
            const client = new Client({
              host: process.env.DB_HOST,
              port: 5432,
              database: "examportal",
              user: process.env.DB_USER,
              password: process.env.DB_PASSWORD,
              ssl: {
                ca: fs.readFileSync("/app/certs/global-bundle.pem", "utf8"),
                rejectUnauthorized: true
              }
            });

            await client.connect();

            try {
              await client.query("BEGIN");

              const existing = await client.query(
                "SELECT 1 FROM pg_roles WHERE rolname = 'examapp'"
              );

              const statement = existing.rowCount > 0
                ? "ALTER ROLE examapp LOGIN PASSWORD %L"
                : "CREATE ROLE examapp LOGIN PASSWORD %L";

              const formatted = await client.query(
                "SELECT format($1::text, $2::text) AS sql",
                [statement, process.env.APP_PASSWORD]
              );

              await client.query(formatted.rows[0].sql);

              await client.query(
                "GRANT CONNECT ON DATABASE examportal TO examapp"
              );

              await client.query(
                "GRANT USAGE ON SCHEMA public TO examapp"
              );

              await client.query(
                "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO examapp"
              );

              await client.query(
                "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO examapp"
              );

              await client.query(
                "ALTER DEFAULT PRIVILEGES FOR ROLE examadmin IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO examapp"
              );

              await client.query(
                "ALTER DEFAULT PRIVILEGES FOR ROLE examadmin IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO examapp"
              );

              await client.query("COMMIT");

              console.log("Application database user and permissions configured successfully");
            } catch (error) {
              await client.query("ROLLBACK");
              throw error;
            } finally {
              await client.end();
            }
          }

          main().catch(error => {
            console.error("Database bootstrap failed:", error.message);
            process.exit(1);
          });
        JS
      ]

      environment = [
        {
          name  = "DB_HOST"
          value = aws_db_instance.exam.address
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
        },
        {
          name      = "APP_PASSWORD"
          valueFrom = data.aws_secretsmanager_secret.db_app.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"

        options = {
          awslogs-group         = aws_cloudwatch_log_group.backend.name
          awslogs-region        = "ap-south-1"
          awslogs-stream-prefix = "bootstrap"
        }
      }
    }
  ])

  depends_on = [
    aws_iam_role_policy.ecs_db_app_secret
  ]

  tags = {
    Name = "exam-portal-staging-db-bootstrap"
  }
}

output "db_bootstrap_task_definition_arn" {
  value = aws_ecs_task_definition.db_bootstrap.arn
}
