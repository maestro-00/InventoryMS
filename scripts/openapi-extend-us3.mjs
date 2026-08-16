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
  ensurePath(path).get = get;
}

function addPost(path, options = {}) {
  const post = structuredClone(postTemplate);
  post.operationId = operationId("post", path);
  post.parameters = [...headerParams(post), ...(options.params ?? [])];
  ensurePath(path).post = post;
}

function addPut(path, options = {}) {
  const put = structuredClone(postTemplate);
  put.operationId = operationId("put", path);
  delete put.responses["201"];
  put.parameters = [...headerParams(put), ...(options.params ?? [])];
  ensurePath(path).put = put;
}

// StockController
addPost("/api/v1/stock/movements/{id}/correct", { params: pathParams(["id"]) });
addPost("/api/v1/stock/adjustments/{id}/approve", { params: pathParams(["id"]) });
addPost("/api/v1/stock/adjustments/{id}/reject", { params: pathParams(["id"]) });
addGet("/api/v1/stock/adjustment-reasons");
addPost("/api/v1/stock/consumption");

// TransfersController + Cycle 1 inventory.md list/detail (needed to receive by line id)
addGet("/api/v1/transfers", {
  query: queryParams(["status", "page", "pageSize"]),
});
addGet("/api/v1/transfers/{id}", { params: pathParams(["id"]) });
addPost("/api/v1/transfers/{id}/dispatch", { params: pathParams(["id"]) });
addPost("/api/v1/transfers/{id}/receive", { params: pathParams(["id"]) });

// CountsController
addGet("/api/v1/counts/{id}", { params: pathParams(["id"]) });
addPut("/api/v1/counts/{id}/lines", { params: pathParams(["id"]) });
addPost("/api/v1/counts/{id}/submit", { params: pathParams(["id"]) });
addPost("/api/v1/counts/{id}/approve", { params: pathParams(["id"]) });
addPost("/api/v1/counts/{id}/reject", { params: pathParams(["id"]) });

// ReorderController (US3 is read/review only; apply belongs to US7)
addGet("/api/v1/reorder/suggestions", {
  query: queryParams(["locationId"]),
});

writeFileSync(snapshot, `${JSON.stringify(doc, null, 2)}\n`);
console.log(
  "openapi-extend-us3: added US3 operations from InventoryX controllers + inventory.md",
);
