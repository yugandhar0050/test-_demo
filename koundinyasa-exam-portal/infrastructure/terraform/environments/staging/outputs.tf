output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = [
    aws_subnet.main["public_a"].id,
    aws_subnet.main["public_b"].id
  ]
}

output "app_subnet_ids" {
  value = [
    aws_subnet.main["app_a"].id,
    aws_subnet.main["app_b"].id
  ]
}

output "database_subnet_ids" {
  value = [
    aws_subnet.main["db_a"].id,
    aws_subnet.main["db_b"].id
  ]
}
