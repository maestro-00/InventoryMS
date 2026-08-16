import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Button } from "../../../shared/ui/button";
import { SelectField, TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { LOCATION_STEP } from "../../onboarding/completion";
import { useMarkOnboardingStep } from "../../onboarding/mark-onboarding-step";
import {
  createLocation,
  locationInputSchema,
  updateLocation,
  LOCATION_KINDS,
  type LocationInput,
  type LocationRecord,
} from "./api/locations-api";
import { useLocationsQueryKey } from "./api/location-queries";

const KIND_OPTIONS = LOCATION_KINDS.map((kind) => ({ value: kind, label: kind }));

export function LocationForm({
  onSaved,
  location,
  etag,
}: {
  onSaved: (location: LocationRecord) => void;
  location?: LocationRecord;
  etag?: string;
}) {
  const [name, setName] = useState(location?.name ?? "");
  const [address, setAddress] = useState(location?.address ?? "");
  const [kind, setKind] = useState<string>(location?.kind ?? "Shop");
  const [clientErrors, setClientErrors] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const locationsQueryKey = useLocationsQueryKey();
  const markOnboardingStep = useMarkOnboardingStep();
  const isCreate = !location;

  const mutation = useMutation({
    mutationFn: (input: LocationInput) =>
      location ? updateLocation(location.id, input, etag) : createLocation(input),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: locationsQueryKey });
      if (isCreate) markOnboardingStep(LOCATION_STEP);
      onSaved(saved);
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    const parsed = locationInputSchema.safeParse({
      name,
      address: address || undefined,
      kind,
    });
    if (!parsed.success) {
      setClientErrors(parsed.error.issues.map((issue) => issue.message));
      return;
    }
    setClientErrors([]);
    mutation.mutate(parsed.data);
  }

  const problem = toProblem(mutation.error);

  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      {clientErrors.length > 0 ? (
        <ProblemSummary
          key={clientErrors.join("|")}
          messages={clientErrors}
          title="Check the highlighted fields"
        />
      ) : null}
      {problem ? <ProblemSummary problem={problem} /> : null}

      <TextField
        label="Location name"
        required
        value={name}
        error={problem?.fieldErrors["name"]?.join(" ")}
        onChange={(event) => {
          setName(event.target.value);
        }}
      />
      <TextField
        label="Address"
        value={address}
        onChange={(event) => {
          setAddress(event.target.value);
        }}
      />
      <SelectField
        label="Location kind"
        options={KIND_OPTIONS}
        value={kind}
        onChange={(event) => {
          setKind(event.target.value);
        }}
      />

      <Button
        type="submit"
        disabled={mutation.isPending}
        aria-busy={mutation.isPending}
      >
        {mutation.isPending ? "Saving location…" : "Save location"}
      </Button>
    </form>
  );
}
