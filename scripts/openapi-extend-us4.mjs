#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const snapshot = "openapi/inventoryx-v1.json";
const doc = JSON.parse(readFileSync(snapshot, "utf8"));
const getTemplate = structuredClone(doc.paths["/api/v1/sales/{id}/receipt"].get);
const postTemplate = structuredClone(doc.paths["/api/v1/sales"].post);

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

// SyncController readiness surface (US4)
addGet("/api/v1/sync/conflicts");
addPost("/api/v1/sync/conflicts/{saleId}/resolve", { params: pathParams(["saleId"]) });
addGet("/api/v1/sync/rejected");
addPost("/api/v1/sync/rejected/{rejectedSaleId}/resolve", {
  params: pathParams(["rejectedSaleId"]),
});

// Ensure snapshot documents registerId query
const snapshotGet = doc.paths["/api/v1/sync/snapshot"]?.get;
if (snapshotGet) {
  const hasRegister = (snapshotGet.parameters ?? []).some(
    (parameter) => parameter.name === "registerId",
  );
  if (!hasRegister) {
    snapshotGet.parameters = [
      ...(snapshotGet.parameters ?? []),
      {
        name: "registerId",
        in: "query",
        required: true,
        schema: { type: "string", format: "uuid" },
      },
      {
        name: "watermark",
        in: "query",
        required: false,
        schema: { type: "string" },
      },
    ];
  }
}

writeFileSync(snapshot, `${JSON.stringify(doc, null, 2)}\n`);
console.log("Extended OpenAPI snapshot for US4 sync readiness routes.");
