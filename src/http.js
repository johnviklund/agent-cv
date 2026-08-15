const NO_STORE_JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

export function noStoreJson(body, status = 200, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: { ...NO_STORE_JSON_HEADERS, ...extraHeaders },
  });
}
