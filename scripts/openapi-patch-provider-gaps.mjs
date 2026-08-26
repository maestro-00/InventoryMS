#!/usr/bin/env node
/**
 * Patches openapi/inventoryx-v1.json when live export is unavailable.
 * Run after copying a base snapshot; then pnpm api:generate && pnpm api:check.
 */
import { readFileSync, writeFileSync } from "node:fs";

const snapshot = "openapi/inventoryx-v1.json";
const doc = JSON.parse(readFileSync(snapshot, "utf8"));

const registerDtoRef =
  "#/components/schemas/InventoryX.Application.DTOs.Selling.RegisterDto";
const updateRegisterBodyRef =
  "#/components/schemas/InventoryX.Presentation.Controllers.v1.RegistersController.UpdateRegisterRequest";

const patchRegistersPath = "/api/v1/registers/{id}";
if (!doc.paths[patchRegistersPath]) {
  doc.paths[patchRegistersPath] = {
    patch: {
      tags: ["Registers"],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      requestBody: {
        content: {
          "application/json": { schema: { $ref: updateRegisterBodyRef } },
          "text/json": { schema: { $ref: updateRegisterBodyRef } },
          "application/*+json": { schema: { $ref: updateRegisterBodyRef } },
        },
      },
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": { schema: { $ref: registerDtoRef } },
            "text/plain": { schema: { $ref: registerDtoRef } },
            "text/json": { schema: { $ref: registerDtoRef } },
          },
        },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Not Found" },
        409: { description: "Conflict" },
      },
      security: [{ oauth2: [] }],
      operationId: "patch_api_v1_registers__id",
    },
  };
}

const schemas = doc.components.schemas;
const updateSchemaKey =
  "InventoryX.Presentation.Controllers.v1.RegistersController.UpdateRegisterRequest";
if (!schemas[updateSchemaKey]) {
  schemas[updateSchemaKey] = {
    type: "object",
    properties: {
      name: { type: "string", nullable: true },
      isActive: { type: "boolean", nullable: true },
    },
    additionalProperties: false,
  };
}

writeFileSync(snapshot, `${JSON.stringify(doc, null, 2)}\n`);
console.log("openapi-patch-provider-gaps: ensured PATCH /api/v1/registers/{id}");
