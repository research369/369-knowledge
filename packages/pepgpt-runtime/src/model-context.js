function text(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function number(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function safeOrderStatus(value) {
  if (!value || typeof value !== "object") return null;
  const status = {
    found: value.found === true ? true : value.found === false ? false : null,
    orderId: text(value.orderId, 64) || null,
    status: text(value.status, 120) || null,
    orderDate: value.orderDate || null,
    shippedAt: value.shippedAt || null,
    shipmentRecency: value.shipmentRecency === "older" ? "older" : value.shipmentRecency === "current" ? "current" : null,
    ageDays: number(value.ageDays),
  };
  const tracking = value.tracking && typeof value.tracking === "object" ? {
    number: text(value.tracking.number, 160) || null,
    url: text(value.tracking.url, 1000) || null,
    status: text(value.tracking.status, 160) || null,
    detail: text(value.tracking.detail, 500) || null,
    timestamp: value.tracking.timestamp || null,
  } : null;
  return { ...status, tracking };
}

export function contextForModel(context) {
  const source = context && typeof context === "object" ? context : {};
  const authenticated = Boolean(
    text(source?.authenticatedCustomer?.fullName, 1)
    || text(source?.authenticatedCustomer?.phone, 1)
    || text(source.authenticatedCustomerName, 1)
    || text(source.authenticatedCustomerPhone, 1)
  );
  const safe = {
    channel: text(source.channel, 40) || null,
    customerAuthenticated: authenticated,
    verifiedOrderStatus: safeOrderStatus(source.verifiedOrderStatus),
  };
  return Object.fromEntries(Object.entries(safe).filter(([, value]) => value !== null));
}
