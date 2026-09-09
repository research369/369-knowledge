import assert from "node:assert/strict";
import test from "node:test";
import { customerIdFromWhatsAppPhone } from "../src/customer-id.js";

test("creates a stable pseudonymous identifier for one WhatsApp sender", () => {
  const first = customerIdFromWhatsAppPhone("+49 151 12345678", "test-app-secret");
  const second = customerIdFromWhatsAppPhone("4915112345678", "test-app-secret");

  assert.equal(first, second);
  assert.match(first, /^whatsapp:[a-f0-9]{64}$/);
  assert.doesNotMatch(first, /4915112345678/);
});

test("separates senders and does not create an identifier without a secret", () => {
  assert.notEqual(
    customerIdFromWhatsAppPhone("4915112345678", "test-app-secret"),
    customerIdFromWhatsAppPhone("4915212345678", "test-app-secret")
  );
  assert.equal(customerIdFromWhatsAppPhone("4915112345678", ""), null);
  assert.equal(customerIdFromWhatsAppPhone("", "test-app-secret"), null);
});
