
import json
import os
import subprocess

region = os.environ["AWS_REGION"]
cluster = os.environ["ECS_CLUSTER"]
service = os.environ["ECS_SERVICE"]
alb = os.environ["ALB_DIM"]
target = os.environ["TG_DIM"]
database = os.environ["DB_ID"]

def widget(title, namespace, metric, dimensions, x, y, stat="Average"):
    metric_data = [namespace, metric]
    for name, value in dimensions.items():
        metric_data.extend([name, value])

    return {
        "type": "metric",
        "x": x,
        "y": y,
        "width": 12,
        "height": 6,
        "properties": {
            "title": title,
            "region": region,
            "period": 60,
            "stat": stat,
            "metrics": [metric_data],
            "view": "timeSeries"
        }
    }

ecs = {
    "ClusterName": cluster,
    "ServiceName": service
}

alb_dims = {
    "LoadBalancer": alb,
    "TargetGroup": target
}

rds = {
    "DBInstanceIdentifier": database
}

dashboard = {
    "widgets": [
        widget("ECS CPU", "AWS/ECS",
               "CPUUtilization", ecs, 0, 0),
        widget("ECS Memory", "AWS/ECS",
               "MemoryUtilization", ecs, 12, 0),
        widget("ALB Healthy Targets", "AWS/ApplicationELB",
               "HealthyHostCount", alb_dims, 0, 6),
        widget("ALB 5xx Errors", "AWS/ApplicationELB",
               "HTTPCode_Target_5XX_Count", alb_dims, 12, 6, "Sum"),
        widget("RDS CPU", "AWS/RDS",
               "CPUUtilization", rds, 0, 12),
        widget("RDS Free Storage", "AWS/RDS",
               "FreeStorageSpace", rds, 12, 12)
    ]
}

with open("monitoring/dashboard.json", "w") as file:
    json.dump(dashboard, file, indent=2)

subprocess.run([
    "aws", "cloudwatch", "put-dashboard",
    "--dashboard-name", "ExamPortal-Staging",
    "--dashboard-body", "file://monitoring/dashboard.json",
    "--region", region
], check=True)

print("Dashboard created: ExamPortal-Staging")
