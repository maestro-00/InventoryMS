import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../../shared/ui/button";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import {
  fetchFavouritesLayout,
  saveFavouritesLayout,
  type FavouritesLayout,
} from "./api/favourites-api";

export function FavouritesEditor({ registerId }: { registerId: string }) {
  const [raw, setRaw] = useState("");
  const [message, setMessage] = useState("");

  const load = useMutation({
    mutationFn: () => fetchFavouritesLayout(registerId),
    onSuccess: (layout) => {
      setRaw(JSON.stringify(layout, null, 2));
    },
  });
  const save = useMutation({
    mutationFn: (layout: FavouritesLayout) => saveFavouritesLayout(registerId, layout),
    onSuccess: () => {
      setMessage("Favourites layout saved.");
    },
  });

  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">Favourites layout</h1>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          load.mutate();
        }}
      >
        Load layout
      </Button>
      <TextField
        label="Layout JSON"
        value={raw}
        onChange={(event) => {
          setRaw(event.target.value);
        }}
      />
      <Button
        type="button"
        onClick={() => {
          save.mutate(JSON.parse(raw) as FavouritesLayout);
        }}
      >
        Save layout
      </Button>
      {message ? <p role="status">{message}</p> : null}
      {toProblem(save.error) ? (
        <ProblemSummary problem={toProblem(save.error)} />
      ) : null}
    </section>
  );
}
