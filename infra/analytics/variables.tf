variable "zone_id" {
  description = "Route 53 hosted zone for nextgendentalaustintx.com"
  type        = string
  default     = "Z0521096EYJDRL5ITYES"
}

variable "alert_email" {
  description = "Email for CloudWatch alarm notifications"
  type        = string
  default     = "ratik.nanda@gmail.com"
}

variable "bootstrap_secret_placeholder" {
  description = "Placeholder written at create time; REAL secret values are set out-of-band (console/CLI) and ignored by lifecycle. Never put real secrets here."
  type        = string
  default     = "CHANGE-ME-AFTER-APPLY"
}
