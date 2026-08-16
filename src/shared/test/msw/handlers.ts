import { http, HttpResponse } from "msw";
import {
  authSessionFixture,
  productFixture,
  rfc7807Problem,
  stockFixture,
} from "../../../../tests/fixtures/domain";
import { ownerSession } from "../../../../tests/fixtures/provider/session";

const origin = "*" as const;

export const handlers = [
  http.post(`${origin}/api/v1/auth/login`, () =>
    HttpResponse.json({
      requiresTwoFactor: false,
      accessToken: "test-access",
      refreshToken: "test-refresh",
      accessTokenExpiresAt: authSessionFixture.expiresAt,
    }),
  ),
  http.post(`${origin}/api/v1/auth/refresh`, () =>
    HttpResponse.json({
      accessToken: "test-access-next",
      refreshToken: "test-refresh-next",
      accessTokenExpiresAt: authSessionFixture.expiresAt,
    }),
  ),
  http.get(`${origin}/api/v1/products`, () =>
    HttpResponse.json({
      items: [productFixture],
      page: 1,
      pageSize: 50,
      totalCount: 1,
    }),
  ),
  http.get(`${origin}/api/v1/stock`, () =>
    HttpResponse.json({
      items: [stockFixture],
      page: 1,
      pageSize: 50,
      totalCount: 1,
    }),
  ),
  http.post(`${origin}/api/v1/products`, () =>
    HttpResponse.json(rfc7807Problem, {
      status: 400,
      headers: { "Content-Type": "application/problem+json" },
    }),
  ),
  http.get(`${origin}/api/v1/tenant`, () => HttpResponse.json(ownerSession)),
  http.get(`${origin}/api/v1/registers/:registerId/favourites`, () =>
    HttpResponse.json({
      registerId: "88888888-8888-4888-8888-888888888888",
      layoutJson: "{}",
    }),
  ),
  http.get(`${origin}/api/v1/sales/held`, () => HttpResponse.json([])),
];
