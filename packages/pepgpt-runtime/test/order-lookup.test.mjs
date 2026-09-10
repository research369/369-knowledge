import assert from "node:assert/strict";
import test from "node:test";
import { extractOrderLookupFromMessage } from "../src/order-lookup.js";

test("recognizes an order number and customer name in either order", () => {
  assert.deepEqual(extractOrderLookupFromMessage("Lisa Zürcher · Mahlberg 369-10625"), {
    orderId: "369-10625",
    customerName: "Lisa Zürcher",
  });
  assert.deepEqual(extractOrderLookupFromMessage("369-10035 Ugur Kara"), {
    orderId: "369-10035",
    customerName: "Ugur Kara",
  });
});

test("keeps labelled names and rejects messages without an order number", () => {
  assert.deepEqual(extractOrderLookupFromMessage("369 10625, Name: Lisa Zürcher"), {
    orderId: "36910625",
    customerName: "Lisa Zürcher",
  });
  assert.equal(extractOrderLookupFromMessage("Mein Paket ist noch nicht da"), null);
});
