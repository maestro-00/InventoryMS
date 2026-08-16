#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const snapshot = "openapi/inventoryx-v1.json";
const doc = JSON.parse(readFileSync(snapshot, "utf8"));
const getTemplate = structuredClone(doc.paths["/api/v1/sales/{id}/receipt"].get);
const postTemplate = structuredClone(doc.paths["/api/v1/sales"].post);

function operationId(method, path) {
  return `${method}${path.replaceAll(/[{}]/g, "").replaceAll("/", "_").replaceAll("-", "_")}`;
}

function pathParams(names, format = "uuid") {
  return names.map((name) => ({
    name,
    in: "path",
    required: true,
    schema: format === "uuid" ? { type: "string", format: "uuid" } : { type: "string" },
  }));
}

function queryParams(names) {
  return names.map((name) => ({
    name,
    in: "query",
    required: false,
    schema: { type: "string" },
  }));
}

function headerParams(operation) {
  return (operation.parameters ?? []).filter((parameter) => parameter.in === "header");
}

function ensurePath(path) {
  if (!doc.paths[path]) doc.paths[path] = {};
  return doc.paths[path];
}

function addGet(path, options = {}) {
  const get = structuredClone(getTemplate);
  get.operationId = operationId("get", path);
  get.parameters = [...(options.params ?? []), ...(options.query ?? [])];
  if (options.liveOnly) {
    get["x-inventoryx-live-only"] = true;
    get["x-inventoryx-live-only-reason"] = options.reason;
  }
  ensurePath(path).get = get;
}

function addPost(path, options = {}) {
  const post = structuredClone(postTemplate);
  post.operationId = operationId("post", path);
  post.parameters = [...headerParams(post), ...(options.params ?? [])];
  if (options.liveOnly) {
    post["x-inventoryx-live-only"] = true;
    post["x-inventoryx-live-only-reason"] = options.reason;
  }
  ensurePath(path).post = post;
}

function addPut(path, options = {}) {
  const put = structuredClone(postTemplate);
  put.operationId = operationId("put", path);
  delete put.responses["201"];
  put.parameters = [...headerParams(put), ...(options.params ?? [])];
  ensurePath(path).put = put;
}

addGet("/api/v1/products/barcode/{barcode}", {
  params: pathParams(["barcode"], "string"),
});
addGet("/api/v1/products/{id}/availability", {
  params: pathParams(["id"]),
  query: queryParams(["variantId", "locationId"]),
  liveOnly: true,
  reason:
    "Availability outside the cached register snapshot requires a live stock query.",
});
addGet("/api/v1/registers/{registerId}/favourites", {
  params: pathParams(["registerId"]),
});
addPut("/api/v1/registers/{registerId}/favourites", {
  params: pathParams(["registerId"]),
});
addGet("/api/v1/sales/held");
addGet("/api/v1/sales/held/{id}", { params: pathParams(["id"]) });
addPost("/api/v1/sales/{id}/complete", { params: pathParams(["id"]) });
addGet("/api/v1/sales/lookup", {
  query: queryParams(["receiptNumber", "search"]),
});
addPost("/api/v1/sales/{id}/void", { params: pathParams(["id"]) });
addPost("/api/v1/sales/{id}/receipt/deliver", {
  params: pathParams(["id"]),
  liveOnly: true,
  reason: "Email and SMS receipt delivery requires connectivity.",
});
addPost("/api/v1/returns/exchange", {
  liveOnly: true,
  reason: "Returns and exchanges require live validation against the original sale.",
});

writeFileSync(snapshot, `${JSON.stringify(doc, null, 2)}\n`);
console.log("openapi-extend-us2: added US2 operations from InventoryX controllers");
