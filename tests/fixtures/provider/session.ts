import { authSessionFixture, permissionMatrixFixture } from "../domain";

export const ownerSession = {
  ...authSessionFixture,
  permissions: [...permissionMatrixFixture.Owner],
};

export const cashierSession = {
  ...authSessionFixture,
  role: "Cashier" as const,
  permissions: [...permissionMatrixFixture.Cashier],
};

export const pagedEmpty = {
  items: [],
  page: 1,
  pageSize: 50,
  totalCount: 0,
};
