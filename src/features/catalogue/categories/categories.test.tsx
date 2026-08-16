import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../../shared/test/msw/server";
import { renderWithProviders } from "../../../shared/test/render";
import { CategoryMaintenance } from "./category-maintenance";
import { descendantIds, wouldCreateCycle } from "./category-tree";
import {
  categoryTree,
  CATEGORY_ID,
  CHILD_CATEGORY_ID,
} from "../../../../tests/fixtures/provider/us1";

const GRANDCHILD_ID = "79777777-7777-4777-8777-777777777777";

const deepTree = [
  {
    id: CATEGORY_ID,
    name: "Groceries",
    parentId: null,
    children: [
      {
        id: CHILD_CATEGORY_ID,
        name: "Dry goods",
        parentId: CATEGORY_ID,
        children: [
          {
            id: GRANDCHILD_ID,
            name: "Grains",
            parentId: CHILD_CATEGORY_ID,
            children: [],
          },
        ],
      },
    ],
  },
];

describe("category tree guards", () => {
  it("collects every descendant of a category", () => {
    expect(descendantIds(deepTree, CATEGORY_ID)).toEqual([
      CHILD_CATEGORY_ID,
      GRANDCHILD_ID,
    ]);
  });

  it("rejects a category as its own parent", () => {
    expect(wouldCreateCycle(deepTree, CATEGORY_ID, CATEGORY_ID)).toBe(true);
  });

  it("rejects a descendant as the new parent", () => {
    expect(wouldCreateCycle(deepTree, CATEGORY_ID, GRANDCHILD_ID)).toBe(true);
  });

  it("allows an unrelated parent", () => {
    expect(wouldCreateCycle(deepTree, GRANDCHILD_ID, CATEGORY_ID)).toBe(false);
  });
});

describe("category maintenance", () => {
  function listHandler(tree: object = categoryTree) {
    return http.get("*/api/v1/categories", () => HttpResponse.json(tree));
  }

  it("lists the category hierarchy", async () => {
    server.use(listHandler());

    renderWithProviders(<CategoryMaintenance />);

    expect(
      await screen.findByRole("listitem", { name: "Groceries" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "Dry goods" })).toBeInTheDocument();
  });

  it("explains an empty hierarchy with one primary action", async () => {
    server.use(listHandler([]));

    renderWithProviders(<CategoryMaintenance />);

    expect(
      await screen.findByRole("button", { name: /create your first category/i }),
    ).toBeInTheDocument();
  });

  it("creates a child category under the selected parent", async () => {
    const user = userEvent.setup();
    let sent: Record<string, unknown> | null = null;
    server.use(
      listHandler(),
      http.post("*/api/v1/categories", async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          id: GRANDCHILD_ID,
          name: "Grains",
          parentId: CHILD_CATEGORY_ID,
          children: [],
        });
      }),
    );

    renderWithProviders(<CategoryMaintenance />);

    await screen.findByRole("listitem", { name: "Groceries" });
    await user.type(screen.getByLabelText(/new category name/i), "Grains");
    await user.selectOptions(
      screen.getByLabelText(/parent category/i),
      CHILD_CATEGORY_ID,
    );
    await user.click(screen.getByRole("button", { name: /add category/i }));

    await waitFor(() => {
      expect(sent).toEqual({ name: "Grains", parentId: CHILD_CATEGORY_ID });
    });
  });

  it("renames a category", async () => {
    const user = userEvent.setup();
    let sent: Record<string, unknown> | null = null;
    server.use(
      listHandler(),
      http.patch(`*/api/v1/categories/${CHILD_CATEGORY_ID}`, async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          id: CHILD_CATEGORY_ID,
          name: "Dry provisions",
          parentId: CATEGORY_ID,
          children: [],
        });
      }),
    );

    renderWithProviders(<CategoryMaintenance />);

    const row = await screen.findByRole("listitem", { name: /dry goods/i });
    await user.click(within(row).getByRole("button", { name: /edit/i }));

    const name = screen.getByLabelText(/^category name/i);
    await user.clear(name);
    await user.type(name, "Dry provisions");
    await user.click(screen.getByRole("button", { name: /save category/i }));

    await waitFor(() => {
      expect(sent).toMatchObject({ name: "Dry provisions" });
    });
  });

  it("blocks reparenting a category under its own descendant", async () => {
    const user = userEvent.setup();
    let patched = false;
    server.use(
      listHandler(deepTree),
      http.patch(`*/api/v1/categories/${CATEGORY_ID}`, () => {
        patched = true;
        return HttpResponse.json(deepTree[0]);
      }),
    );

    renderWithProviders(<CategoryMaintenance />);

    const row = await screen.findByRole("listitem", { name: /^groceries/i });
    await user.click(within(row).getByRole("button", { name: /edit/i }));

    const parent = screen.getByLabelText(/move under/i);
    expect(
      within(parent).queryByRole("option", { name: /grains/i }),
    ).not.toBeInTheDocument();
    expect(
      within(parent).queryByRole("option", { name: /^groceries$/i }),
    ).not.toBeInTheDocument();
    expect(patched).toBe(false);
  });

  it("requires confirmation before deactivating a category", async () => {
    const user = userEvent.setup();
    let deactivated = false;
    server.use(
      listHandler(),
      http.delete(`*/api/v1/categories/${CHILD_CATEGORY_ID}`, () => {
        deactivated = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithProviders(<CategoryMaintenance />);

    const row = await screen.findByRole("listitem", { name: /dry goods/i });
    await user.click(within(row).getByRole("button", { name: /deactivate/i }));

    expect(deactivated).toBe(false);
    expect(screen.getByText(/products keep their history/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /yes, deactivate/i }));
    await waitFor(() => {
      expect(deactivated).toBe(true);
    });
  });

  it("surfaces a provider conflict without losing the draft name", async () => {
    const user = userEvent.setup();
    server.use(
      listHandler(),
      http.post("*/api/v1/categories", () =>
        HttpResponse.json(
          {
            title: "Category 'Groceries' already exists at this level.",
            status: 409,
            traceId: "trace-409",
          },
          { status: 409, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );

    renderWithProviders(<CategoryMaintenance />);

    await screen.findByRole("listitem", { name: "Groceries" });
    await user.type(screen.getByLabelText(/new category name/i), "Groceries");
    await user.click(screen.getByRole("button", { name: /add category/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/already exists at this level/i);
    expect(screen.getByLabelText(/new category name/i)).toHaveValue("Groceries");
  });
});
