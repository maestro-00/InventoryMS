#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const snapshot = "openapi/inventoryx-v1.json";
const doc = JSON.parse(readFileSync(snapshot, "utf8"));
const getTemplate = structuredClone(doc.paths["/api/v1/sales/{id}/receipt"].get);
const postTemplate = structuredClone(doc.paths["/api/v1/sales"].post);
const patchTemplate = structuredClone(
  doc.paths["/api/v1/tenant"]?.patch ?? postTemplate,
);

function operationId(method, path) {
  return `${method}${path.replaceAll(/[{}]/g, "").replaceAll("/", "_").replaceAll("-", "_")}`;
}
function pathParams(names) {
  return names.map((name) => ({
    name,
    in: "path",
    required: true,
    schema: { type: "string", format: "uuid" },
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
  ensurePath(path).get = get;
}
function addPost(path, options = {}) {
  const post = structuredClone(postTemplate);
  post.operationId = operationId("post", path);
  post.parameters = [...headerParams(post), ...(options.params ?? [])];
  ensurePath(path).post = post;
}
function addPatch(path, options = {}) {
  const patch = structuredClone(patchTemplate);
  patch.operationId = operationId("patch", path);
  patch.parameters = [...headerParams(patch), ...(options.params ?? [])];
  ensurePath(path).patch = patch;
}
function addPut(path, options = {}) {
  const put = structuredClone(postTemplate);
  put.operationId = operationId("put", path);
  delete put.responses["201"];
  put.parameters = [...headerParams(put), ...(options.params ?? [])];
  ensurePath(path).put = put;
}

// SuppliersController
addPost("/api/v1/suppliers");
addGet("/api/v1/suppliers/{id}/performance", { params: pathParams(["id"]) });
addPut("/api/v1/suppliers/{id}/products", { params: pathParams(["id"]) });

// ReorderController
addPost("/api/v1/reorder/suggestions/apply");

// PurchaseOrdersController
addPatch("/api/v1/purchase-orders/{id}", { params: pathParams(["id"]) });
addPost("/api/v1/purchase-orders/{id}/submit", { params: pathParams(["id"]) });
addPost("/api/v1/purchase-orders/{id}/approve", { params: pathParams(["id"]) });
addPost("/api/v1/purchase-orders/{id}/reject", { params: pathParams(["id"]) });
addPost("/api/v1/purchase-orders/{id}/cancel", { params: pathParams(["id"]) });
addPost("/api/v1/purchase-orders/{id}/send", { params: pathParams(["id"]) });
addGet("/api/v1/purchase-orders/{id}/pdf", { params: pathParams(["id"]) });
addPost("/api/v1/purchase-orders/{id}/receipts", { params: pathParams(["id"]) });
addPost("/api/v1/purchase-orders/{id}/close-short", { params: pathParams(["id"]) });

// SupplierInvoicesController
addPost("/api/v1/goods-receipts/{id}/landed-costs", { params: pathParams(["id"]) });

// Ensure list query params on purchase-orders GET
const poGet = doc.paths["/api/v1/purchase-orders"]?.get;
if (poGet) {
  const names = new Set((poGet.parameters ?? []).map((p) => p.name));
  for (const name of ["status", "supplierId", "overdue", "page", "pageSize"]) {
    if (!names.has(name)) {
      poGet.parameters = [
        ...(poGet.parameters ?? []),
        {
          name,
          in: "query",
          required: false,
          schema: { type: "string" },
        },
      ];
    }
  }
}

writeFileSync(snapshot, `${JSON.stringify(doc, null, 2)}\n`);
console.log("Extended OpenAPI for US7 purchasing routes from InventoryX controllers.");
