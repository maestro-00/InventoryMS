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

function ensurePath(path) {
  if (!doc.paths[path]) doc.paths[path] = {};
  return doc.paths[path];
}

function addGet(path, options = {}) {
  const get = structuredClone(getTemplate);
  get.operationId = operationId("get", path);
  get.parameters = [...(options.params ?? [])];
  ensurePath(path).get = get;
}

function addPost(path, options = {}) {
  const post = structuredClone(postTemplate);
  post.operationId = operationId("post", path);
  post.parameters = [
    ...(post.parameters ?? []).filter((parameter) => parameter.in === "header"),
    ...(options.params ?? []),
  ];
  ensurePath(path).post = post;
}

function addPatch(path, options = {}) {
  const patch = structuredClone(patchTemplate);
  patch.operationId = operationId("patch", path);
  patch.parameters = [
    ...(patch.parameters ?? []).filter((parameter) => parameter.in === "header"),
    ...(options.params ?? []),
  ];
  ensurePath(path).patch = patch;
}

// BillingController (US5)
addPost("/api/v1/billing/subscription/upgrade");
addPost("/api/v1/billing/subscription/downgrade");
addPost("/api/v1/billing/subscription/cancel");
addPost("/api/v1/billing/subscription/reactivate");
addPost("/api/v1/billing/payment-method");
addGet("/api/v1/billing/invoices");
addGet("/api/v1/billing/invoices/{id}/pdf", { params: pathParams(["id"]) });
addPatch("/api/v1/billing/contact");

writeFileSync(snapshot, `${JSON.stringify(doc, null, 2)}\n`);
console.log("Extended OpenAPI snapshot for US5 billing routes.");
