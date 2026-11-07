
#!/usr/bin/env bash
set -euo pipefail

: "${AWS_REGION:?Missing AWS_REGION}"
: "${ECS_CLUSTER:?Missing ECS_CLUSTER}"
: "${ECS_SERVICE:?Missing ECS_SERVICE}"
: "${ALB_DIM:?Missing ALB_DIM}"
: "${TG_DIM:?Missing TG_DIM}"
: "${DB_ID:?Missing DB_ID}"
: "${SNS_ARN:?Missing SNS_ARN}"

create_alarm() {
  aws cloudwatch put-metric-alarm \
    --region "$AWS_REGION" \
    --alarm-actions "$SNS_ARN" \
    "$@"
}

create_alarm \
  --alarm-name exam-staging-ecs-cpu \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions \
    Name=ClusterName,Value="$ECS_CLUSTER" \
    Name=ServiceName,Value="$ECS_SERVICE" \
  --statistic Average \
  --period 60 \
  --evaluation-periods 3 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --treat-missing-data missing

create_alarm \
  --alarm-name exam-staging-ecs-memory \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --dimensions \
    Name=ClusterName,Value="$ECS_CLUSTER" \
    Name=ServiceName,Value="$ECS_SERVICE" \
  --statistic Average \
  --period 60 \
  --evaluation-periods 3 \
  --threshold 85 \
  --comparison-operator GreaterThanThreshold \
  --treat-missing-data missing

create_alarm \
  --alarm-name exam-staging-alb-healthy-targets \
  --namespace AWS/ApplicationELB \
  --metric-name HealthyHostCount \
  --dimensions \
    Name=LoadBalancer,Value="$ALB_DIM" \
    Name=TargetGroup,Value="$TG_DIM" \
  --statistic Minimum \
  --period 60 \
  --evaluation-periods 2 \
  --threshold 2 \
  --comparison-operator LessThanThreshold \
  --treat-missing-data breaching

create_alarm \
  --alarm-name exam-staging-alb-5xx \
  --namespace AWS/ApplicationELB \
  --metric-name HTTPCode_Target_5XX_Count \
  --dimensions \
    Name=LoadBalancer,Value="$ALB_DIM" \
    Name=TargetGroup,Value="$TG_DIM" \
  --statistic Sum \
  --period 60 \
  --evaluation-periods 2 \
  --threshold 5 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching

create_alarm \
  --alarm-name exam-staging-rds-cpu \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions \
    Name=DBInstanceIdentifier,Value="$DB_ID" \
  --statistic Average \
  --period 60 \
  --evaluation-periods 5 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --treat-missing-data missing

create_alarm \
  --alarm-name exam-staging-rds-storage \
  --namespace AWS/RDS \
  --metric-name FreeStorageSpace \
  --dimensions \
    Name=DBInstanceIdentifier,Value="$DB_ID" \
  --statistic Average \
  --period 60 \
  --evaluation-periods 3 \
  --threshold 3221225472 \
  --comparison-operator LessThanThreshold \
  --treat-missing-data missing

echo "CloudWatch alarms created successfully."
