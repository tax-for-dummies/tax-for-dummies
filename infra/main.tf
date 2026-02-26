terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "eu-west-2" # London
}

# ─── DNS ─────────────────────────────────────────────────────────────────────

resource "aws_route53_zone" "main" {
  name    = var.domain
  comment = "HostedZone created by Route53 Registrar"
}

# ─── GitHub Pages ─────────────────────────────────────────────────────────────

# Apex domain → GitHub Pages
resource "aws_route53_record" "github_pages_a" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain
  type    = "A"
  ttl     = 300

  records = [
    "185.199.108.153",
    "185.199.109.153",
    "185.199.110.153",
    "185.199.111.153",
  ]
}

# www → GitHub Pages
resource "aws_route53_record" "github_pages_www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain}"
  type    = "CNAME"
  ttl     = 300

  records = ["tax-for-dummies.github.io"]
}

# ─── Google ───────────────────────────────────────────────────────────────────

# Google site verification
resource "aws_route53_record" "google_verification" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain
  type    = "TXT"
  ttl     = 300

  records = [
    "google-site-verification=75tk9SALpgpp2SLRYIjic61ueVrms6y1tqfQOyXZNrU"
  ]
}

# Google site verification (CNAME alternative)
resource "aws_route53_record" "google_verification_cname" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "ab5egiwe3eeg.${var.domain}"
  type    = "CNAME"
  ttl     = 300

  records = ["gv-m7k3evcr3db7jl.dv.googlehosted.com"]
}

# Google Workspace MX
resource "aws_route53_record" "google_mx" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain
  type    = "MX"
  ttl     = 300

  records = ["1 SMTP.GOOGLE.COM"]
}

# Google Workspace DKIM
resource "aws_route53_record" "google_dkim" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "google._domainkey.${var.domain}"
  type    = "TXT"
  ttl     = 300

  records = ["v=DKIM1;k=rsa;p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCqbt0FUocm1/EYwiUf27gwow1vbrGV7UFoQytgvAdRXx6RnNWR2pgsVrNYX4MaMdUAL5c75ojHHFAUdV+ltCAZ/TWJCeLqecMU/wqBvRL/zJCPb32hsN7zNyOY9jfn9DzmcL3KpQF8LdEgtzf84YIgTVzMCNrofFuqhWmmWtQMiQIDAQAB"]
}
