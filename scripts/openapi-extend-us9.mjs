#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const snapshot = "openapi/inventoryx-v1.json";
const doc = JSON.parse(readFileSync(snapshot, "utf8"));
const getTemplate = structuredClone(doc.paths["/api/v1/sales/{id}/receipt"].get);
const postTemplate = structuredClone(doc.paths["/api/v1/sales"].post);
const putTemplate = structuredClone(
  doc.paths["/api/v1/notification-preferences"]?.put ?? postTemplate,
);

function operationId(method, path) {
  return `${method}${path.replaceAll(/[{}]/g, "").replaceAll("/", "_").replaceAll("-", "_")}`;
}
function pathParams(names) {
  return names.map((name) => ({
    name,
    in: "path",
    required: true,
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
  const put = structuredClone(putTemplate);
  put.operationId = operationId("put", path);
  put.parameters = [...headerParams(put), ...(options.params ?? [])];
  ensurePath(path).put = put;
}

addPut("/api/v1/users/{userId}/pin", { params: pathParams(["userId"]) });
addPost("/api/v1/auth/2fa/enroll");
addGet("/api/v1/roles");
addGet("/api/v1/audit-log", {
  query: [
    { name: "page", in: "query", required: false, schema: { type: "string" } },
    { name: "pageSize", in: "query", required: false, schema: { type: "string" } },
  ],
});

writeFileSync(snapshot, `${JSON.stringify(doc, null, 2)}\n`);
console.log(
  "Extended OpenAPI for US9 staff routes from InventoryX UsersController/AuthController.",
);
