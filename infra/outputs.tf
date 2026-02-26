output "nameservers" {
  value       = aws_route53_zone.main.name_servers
  description = "Set these as nameservers at your domain registrar"
}

output "zone_id" {
  value       = aws_route53_zone.main.zone_id
  description = "Route 53 hosted zone ID"
}
