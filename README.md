
# Exam Portal — AWS Cloud & DevOps Deployment

A full-stack examination management platform deployed on AWS using containerized micro-infrastructure, automated infrastructure provisioning, CI/CD, monitoring, and performance testing.

This project demonstrates how a React and Node.js application can be deployed using AWS ECS Fargate, Amazon RDS PostgreSQL, Amazon S3, Amazon CloudFront, Terraform, GitHub Actions, and Amazon CloudWatch.

## Live Application

**Website:** https://d2ulirdq336tyh.cloudfront.net

**API Health Check:** https://d2ulirdq336tyh.cloudfront.net/api/health

**Original Application Repository:** https://github.com/yugandhar0050/test-_demo

> The application source belongs to the original repository owner. This portfolio documents the AWS deployment and DevOps implementation.

## Architecture

```text
                    Users / Students
                           |
                           v
                    HTTPS (443)
                           |
                           v
                    Amazon CloudFront
                      /           \
                     /             \
                    v               v
             Amazon S3       CloudFront VPC Origin
            React Frontend           |
                                    v
                             Internal AWS ALB
                                    |
                         +----------+----------+
                         |                     |
                         v                     v
                  ECS Fargate Task 1    ECS Fargate Task 2
                         |                     |
                         +----------+----------+
                                    |
                                    v
                              Amazon RDS
                              PostgreSQL
```

The React frontend is hosted in a private S3 bucket and delivered through CloudFront.

API requests are routed through CloudFront to an internal Application Load Balancer using a VPC origin. The ALB distributes backend requests across two ECS Fargate tasks.

The backend connects to Amazon RDS PostgreSQL. Database credentials and JWT secrets are managed through AWS Secrets Manager.

## Technology Stack

| Category | Technologies |
|----------|--------------|
| Frontend | React, Vite, JavaScript |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Containerization | Docker |
| Container Registry | Amazon ECR |
| Container Orchestration | Amazon ECS Fargate |
| Infrastructure as Code | Terraform |
| Networking | Amazon VPC, Private Subnets, ALB |
| Frontend Hosting | Amazon S3 |
| CDN and HTTPS | Amazon CloudFront |
| Secret Management | AWS Secrets Manager |
| CI/CD | GitHub Actions |
| Monitoring | Amazon CloudWatch, SNS |
| Performance Testing | Grafana k6 |
| Cloud Region | ap-south-1 (Mumbai) |

## AWS Infrastructure

The application is deployed in a dedicated AWS VPC with separate networking layers.

- Public and private subnets across multiple Availability Zones.
- Private ECS application workloads.
- Internal Application Load Balancer.
- Amazon ECR for Docker images.
- Private Amazon RDS PostgreSQL database.
- AWS Secrets Manager for application credentials.
- VPC endpoints for private access to required AWS services.
- Amazon S3 with CloudFront Origin Access Control.
- CloudFront VPC origin for private backend access.

### ECS Configuration

| Resource | Configuration |
|----------|---------------|
| ECS Cluster | exam-portal-staging |
| Backend Service | exam-portal-staging-backend |
| Launch Type | AWS Fargate |
| Running Tasks | 2 |
| CPU per Task | 0.5 vCPU |
| Memory per Task | 1 GB |
| Application Port | 5000 |
| Container Registry | Amazon ECR |

The backend tasks run in private subnets and are accessed through the internal ALB rather than being directly exposed to the internet.

## Application Features

The Exam Portal supports:

- Student registration and authentication.
- Student dashboard.
- Exam access and question management.
- Exam attempts and submissions.
- Student results.
- Administrative functions.
- JWT-based authentication.

## Infrastructure Provisioning with Terraform

Terraform is used to manage the AWS infrastructure.

```bash
cd infrastructure/terraform/environments/staging
```

Initialize Terraform:

```bash
terraform init
```

Validate the configuration:

```bash
terraform validate
```

Preview infrastructure changes:

```bash
terraform plan
```

Apply reviewed changes:

```bash
terraform apply
```

Terraform provides repeatable infrastructure provisioning and allows changes to be reviewed before deployment.

> Infrastructure changes should be reviewed carefully. The environment may incur AWS charges, and the state must be stored securely.

## Backend Deployment

### 1. Build the Docker Image

```bash
docker build -t exam-portal-backend ./backend
```

### 2. Authenticate to Amazon ECR

```bash
aws ecr get-login-password --region ap-south-1 \
  | docker login \
    --username AWS \
    --password-stdin \
    848635215310.dkr.ecr.ap-south-1.amazonaws.com
```

### 3. Tag the Image

```bash
docker tag exam-portal-backend:latest \
  848635215310.dkr.ecr.ap-south-1.amazonaws.com/exam-portal-staging-backend:latest
```

### 4. Push to ECR

```bash
docker push \
  848635215310.dkr.ecr.ap-south-1.amazonaws.com/exam-portal-staging-backend:latest
```

A new backend image is deployed through an ECS task-definition revision followed by an ECS service update.

The ECS service maintains two running backend tasks.

## Frontend Deployment

The React frontend is built using Vite and deployed to a private S3 bucket.

### 1. Install Dependencies

```bash
cd frontend
npm ci
```

### 2. Build React

```bash
VITE_API_URL=/api npm run build
```

Using the relative `/api` path allows API calls to use the same CloudFront HTTPS domain as the frontend.

### 3. Upload to S3

```bash
aws s3 sync dist/ \
  s3://exam-portal-staging-frontend-225c8a4c4482d3e7301164dc90/ \
  --region ap-south-1
```

### 4. Invalidate CloudFront

```bash
aws cloudfront create-invalidation \
  --distribution-id E1ZQA9IX2HJZPW \
  --paths "/" "/index.html"
```

This allows the updated frontend entry point to be refreshed through CloudFront.

## CI/CD with GitHub Actions

The project includes a GitHub Actions deployment workflow.

### CI/CD Pipeline

```text
Developer
    |
    v
GitHub Repository
    |
    v
GitHub Actions
    |
    +--> Checkout Code
    |
    +--> Install Dependencies
    |
    +--> Run Backend Tests
    |
    +--> Build React Frontend
    |
    +--> Authenticate to AWS
    |
    +--> Build Docker Image
    |
    +--> Push Image to Amazon ECR
    |
    +--> Register ECS Task Revision
    |
    +--> Deploy to ECS Fargate
    |
    +--> Upload React Build to S3
    |
    +--> Invalidate CloudFront
    |
    v
Deployment Health Check
```

### GitHub Secrets

The workflow uses the following repository secrets:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

The AWS credentials must belong to an IAM user with restricted deployment permissions.

The deployment workflow supports manual execution using `workflow_dispatch`.

> GitHub Actions deployment is part of the project configuration. A successful workflow run should be verified separately before claiming automated deployment is operational.

## CloudWatch Monitoring

Amazon CloudWatch is used to observe AWS infrastructure health and application availability.

### Monitored Metrics

| AWS Resource | Metrics |
|--------------|---------|
| ECS Fargate | CPU Utilization |
| ECS Fargate | Memory Utilization |
| Application Load Balancer | Healthy Targets |
| Application Load Balancer | HTTP 5xx Errors |
| Amazon RDS | CPU Utilization |
| Amazon RDS | Free Storage Space |

CloudWatch alarms can send notifications through Amazon SNS.

### Monitoring Dashboard

Dashboard name:

```text
ExamPortal-Staging
```

The dashboard helps identify resource saturation, database pressure, unhealthy targets, and backend errors.

## Performance Testing Using k6

A controlled load test was conducted using Grafana k6 with up to 500 virtual users.

### Test Configuration

- Gradual ramp-up to 500 virtual users.
- HTTP requests to the API health endpoint.
- Database health verification.
- Response-time monitoring.
- Failure-rate thresholds.
- CloudWatch observation during testing.

### Actual k6 Results

| Metric | Result |
|--------|--------|
| Maximum Virtual Users | 500 |
| Total HTTP Requests | 5,582 |
| Successful Checks | 11,164 / 11,164 |
| HTTP Failure Rate | 0.00% |
| Average Response Time | 49.19 ms |
| Median Response Time | 44.83 ms |
| p90 Response Time | 57.10 ms |
| p95 Response Time | 76.29 ms |
| Maximum Response Time | 547.17 ms |

### Performance Outcome

The application successfully handled the tested health-check workload with 500 configured virtual users and zero HTTP request failures.

**Note:** This result validates API health-check performance. It does not establish that 500 students can simultaneously complete authenticated examinations. Full exam workflow capacity testing remains a separate requirement.

## Troubleshooting and Problem Solving

### Frontend Unable to Connect to Backend

**Problem:** The React application displayed:

```text
Unable to connect. Check the API and try again.
```

**Root Cause:** The frontend API configuration fell back to:

```javascript
http://localhost:5000/api
```

This caused public website visitors' browsers to attempt connections to their own local machines.

**Solution:** Updated the Axios API base URL:

```javascript
baseURL: import.meta.env.VITE_API_URL || "/api"
```

The frontend was rebuilt, uploaded to S3, and refreshed through CloudFront.

### CloudFront API Connectivity

Verified:

```bash
curl https://d2ulirdq336tyh.cloudfront.net/api/health
```

Successful response:

```json
{
  "status": "ok",
  "database": "connected"
}
```

### Database Connectivity

The backend uses PostgreSQL running on Amazon RDS.

Database credentials are stored in AWS Secrets Manager and passed securely into the ECS application environment.

### GitHub Push Permission Error

**Problem:**

```text
remote: Permission to repository denied
fatal: HTTP 403
```

**Cause:** The GitHub account or Personal Access Token lacked permission to push to the target repository.

**Resolution:** Use an authorized GitHub account with repository write access and the necessary workflow-file permissions.




## Key DevOps Learnings

This project demonstrates practical experience with:

- Designing a private AWS application architecture.
- Provisioning infrastructure using Terraform.
- Containerizing Node.js applications using Docker.
- Deploying applications to Amazon ECS Fargate.
- Managing PostgreSQL databases on Amazon RDS.
- Securing application credentials with Secrets Manager.
- Configuring an internal ALB behind CloudFront.
- Hosting React applications using S3 and CloudFront.
- Implementing GitHub Actions deployment workflows.
- Creating CloudWatch dashboards and operational alarms.
- Running controlled performance tests with Grafana k6.
- Debugging real deployment and API connectivity problems.



