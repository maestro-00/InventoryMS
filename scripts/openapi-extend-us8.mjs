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
    schema: format ? { type: "string", format } : { type: "string" },
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
function addDelete(path, options = {}) {
  const del = structuredClone(getTemplate);
  del.operationId = operationId("delete", path);
  del.parameters = [...(options.params ?? [])];
  delete del.requestBody;
  ensurePath(path).delete = del;
}

const reportFilterQuery = queryParams([
  "from",
  "to",
  "locationId",
  "categoryId",
  "staffId",
]);

// DashboardController
addGet("/api/v1/dashboard", { query: queryParams(["asOf"]) });

// ReportsController
for (const report of ["sales", "profit", "stock", "purchasing", "staff", "tax"]) {
  addGet(`/api/v1/reports/${report}`, { query: reportFilterQuery });
}
addGet("/api/v1/reports/schedules", {
  query: queryParams(["page", "pageSize"]),
});
addPost("/api/v1/reports/schedules");
addGet("/api/v1/reports/schedules/{id}", { params: pathParams(["id"]) });
addDelete("/api/v1/reports/schedules/{id}", { params: pathParams(["id"]) });
addGet("/api/v1/reports/{reportType}/export", {
  params: pathParams(["reportType"], ""),
  query: [...reportFilterQuery, ...queryParams(["format"])],
});
addGet("/api/v1/reports/export-jobs/{id}", { params: pathParams(["id"]) });

// ExportController
addGet("/api/v1/export/products", { query: queryParams(["format"]) });
addGet("/api/v1/export/stock", { query: queryParams(["format"]) });

// NotificationsController
addGet("/api/v1/notifications", {
  query: queryParams(["page", "pageSize", "unreadOnly"]),
});
addPost("/api/v1/notifications/{id}/read", { params: pathParams(["id"]) });
addPost("/api/v1/notifications/read-all");
addGet("/api/v1/notification-preferences");
addPut("/api/v1/notification-preferences");

writeFileSync(snapshot, `${JSON.stringify(doc, null, 2)}\n`);
console.log(
  "Extended OpenAPI for US8 reporting/notification routes from InventoryX controllers.",
);
