import assert from "node:assert/strict";
import test from "node:test";
import { contextForModel } from "../src/model-context.js";

test("only forwards the minimal anonymous order context to the model", () => {
  const result = contextForModel({
    channel: "whatsapp",
    authenticatedCustomerPhone: "+49 151 12345678",
    authenticatedCustomerName: "Lisa Zürcher",
    orderLookup: { orderId: "369-10625", customerName: "Lisa Zürcher" },
    arbitraryInternalValue: "must-not-reach-model",
    verifiedOrderStatus: {
      found: true,
      orderId: "369-10625",
      status: "shipped",
      shipmentRecency: "current",
      ageDays: 1,
      tracking: { number: "003404341", url: "https://tracking.example/003404341" },
    },
  });

  assert.deepEqual(result, {
    channel: "whatsapp",
    customerAuthenticated: true,
    verifiedOrderStatus: {
      found: true,
      orderId: "369-10625",
      status: "shipped",
      orderDate: null,
      shippedAt: null,
      shipmentRecency: "current",
      ageDays: 1,
      tracking: {
        number: "003404341",
        url: "https://tracking.example/003404341",
        status: null,
        detail: null,
        timestamp: null,
      },
    },
  });
  assert.doesNotMatch(JSON.stringify(result), /Lisa|15112345678|must-not-reach-model/);
});

test("does not treat an arbitrary context object as authenticated", () => {
  assert.deepEqual(contextForModel({ arbitraryInternalValue: "x" }), { customerAuthenticated: false });
});
