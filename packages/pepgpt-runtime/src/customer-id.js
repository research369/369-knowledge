import { createHmac } from "node:crypto";

export function customerIdFromWhatsAppPhone(phone, appSecret) {
  const normalizedPhone = typeof phone === "string" ? phone.replace(/[^0-9]/g, "") : "";
  if (!normalizedPhone || !appSecret) return null;

  // The customer-memory key must remain stable across messages without retaining
  // the sender phone number in the memory table.
  const digest = createHmac("sha256", appSecret).update(normalizedPhone).digest("hex");
  return `whatsapp:${digest}`;
}
