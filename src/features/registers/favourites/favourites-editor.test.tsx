import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../../shared/test/msw/server";
import { renderWithProviders } from "../../../shared/test/render";
import * as us1 from "../../../../tests/fixtures/provider/us1";
import * as us2 from "../../../../tests/fixtures/provider/us2";
import { FavouritesEditor } from "./favourites-editor";

describe("favourites editor", () => {
  it("loads and saves the register layout JSON", async () => {
    const user = userEvent.setup();
    let saved: string | undefined;
    server.use(
      http.get(`*/api/v1/registers/${us1.REGISTER_ID}/favourites`, () =>
        HttpResponse.json(us2.favouritesLayout),
      ),
      http.put(
        `*/api/v1/registers/${us1.REGISTER_ID}/favourites`,
        async ({ request }) => {
          const body = (await request.json()) as { layoutJson: string };
          saved = body.layoutJson;
          return HttpResponse.json({
            registerId: us1.REGISTER_ID,
            layoutJson: body.layoutJson,
          });
        },
      ),
    );

    renderWithProviders(<FavouritesEditor registerId={us1.REGISTER_ID} />);
    await user.click(screen.getByRole("button", { name: /load layout/i }));
    const field = await screen.findByLabelText(/layout json/i);
    await waitFor(() => {
      expect((field as HTMLInputElement).value).toContain("page-1");
    });

    const next = {
      pages: [
        {
          id: "page-1",
          name: "Grocery",
          productIds: [us1.PRODUCT_ID],
        },
      ],
    };
    fireEvent.change(field, { target: { value: JSON.stringify(next) } });
    await user.click(screen.getByRole("button", { name: /save layout/i }));
    expect(await screen.findByText(/favourites layout saved/i)).toBeInTheDocument();
    expect(saved).toContain(us1.PRODUCT_ID);
  });

  it("treats unparseable saved JSON as an empty layout", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`*/api/v1/registers/${us1.REGISTER_ID}/favourites`, () =>
        HttpResponse.json({
          registerId: us1.REGISTER_ID,
          layoutJson: "not-json",
        }),
      ),
    );

    renderWithProviders(<FavouritesEditor registerId={us1.REGISTER_ID} />);
    await user.click(screen.getByRole("button", { name: /load layout/i }));
    const field = await screen.findByLabelText(/layout json/i);
    await waitFor(() => {
      expect((field as HTMLInputElement).value).toContain('"pages"');
    });
  });
});
