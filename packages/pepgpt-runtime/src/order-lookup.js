const FULL_NAME = /([\p{L}][\p{L}'-]*(?:\s+[\p{L}][\p{L}'-]*){1,3})/u;

export function extractOrderLookupFromMessage(message) {
  if (typeof message !== "string") return null;
  const orderMatch = message.match(/\b(?:369[-\s]?)\d{3,12}\b/i);
  const orderId = orderMatch?.[0]?.replace(/\s/g, "") || "";
  if (!orderId || orderMatch.index === undefined) return null;

  const labelledName = message.match(new RegExp(`(?:vollst[aä]ndiger\\s+name|name)\\s*[:=,-]?\\s*${FULL_NAME.source}`, "iu"))?.[1];
  const beforeOrder = message.slice(0, orderMatch.index);
  const afterOrder = message.slice(orderMatch.index + orderMatch[0].length);
  const leadingName = beforeOrder.match(new RegExp(`^\\s*${FULL_NAME.source}`, "u"))?.[1];
  const trailingName = afterOrder.match(new RegExp(`^[\\s·,;:/-]*${FULL_NAME.source}`, "u"))?.[1];

  return { orderId, customerName: (labelledName || leadingName || trailingName || "").trim() };
}
