
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_vpc_security_group_ingress_rule" "alb_from_cloudfront" {
  security_group_id = aws_security_group.alb.id
  prefix_list_id    = data.aws_ec2_managed_prefix_list.cloudfront.id
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "exam-portal-staging-s3-oac"
  description                       = "Private Exam Portal frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_vpc_origin" "backend" {
  vpc_origin_endpoint_config {
    name                   = "exam-portal-staging-api-origin"
    arn                    = aws_lb.backend.arn
    http_port              = 80
    https_port             = 443
    origin_protocol_policy = "http-only"

    origin_ssl_protocols {
      items    = ["TLSv1.2"]
      quantity = 1
    }
  }

  depends_on = [
    aws_vpc_security_group_ingress_rule.alb_from_cloudfront
  ]
}

resource "aws_cloudfront_function" "spa" {
  name    = "exam-portal-staging-spa"
  runtime = "cloudfront-js-1.0"
  comment = "React SPA route fallback"
  publish = true

  code = <<-JS
    function handler(event) {
      var request = event.request;
      var uri = request.uri;

      if (uri === "/api" || uri.indexOf("/api/") === 0) {
        return request;
      }

      if (uri === "/" || !uri.split("/").pop().includes(".")) {
        request.uri = "/index.html";
      }

      return request;
    }
  JS
}

resource "aws_cloudfront_distribution" "exam" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Exam Portal staging"
  default_root_object = "index.html"
  price_class         = "PriceClass_200"

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "frontend-s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id

    s3_origin_config {
      origin_access_identity = ""
    }
  }

  origin {
    domain_name = aws_lb.backend.dns_name
    origin_id   = "backend-vpc"

    vpc_origin_config {
      vpc_origin_id = aws_cloudfront_vpc_origin.backend.id
    }
  }

  default_cache_behavior {
    target_origin_id       = "frontend-s3"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD"]

    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa.arn
    }

    compress = true
  }

  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "backend-vpc"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = [
      "GET",
      "HEAD",
      "OPTIONS",
      "PUT",
      "POST",
      "PATCH",
      "DELETE"
    ]

    cached_methods = ["GET", "HEAD"]

    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac"

    compress = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "exam-portal-staging"
    Environment = "staging"
  }
}

data "aws_iam_policy_document" "frontend_cloudfront" {
  statement {
    sid    = "AllowCloudFrontRead"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions = [
      "s3:GetObject"
    ]

    resources = [
      "${aws_s3_bucket.frontend.arn}/*"
    ]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.exam.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.frontend_cloudfront.json

  depends_on = [
    aws_s3_bucket_public_access_block.frontend
  ]
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.exam.id
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.exam.domain_name
}

output "cloudfront_url" {
  value = "https://${aws_cloudfront_distribution.exam.domain_name}"
}
