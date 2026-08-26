import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchOpenShifts,
  fetchRegisters,
  openShiftsQueryKey,
  type RegisterRecord,
  type ShiftRecord,
} from "../registers/api/registers-api";

export interface OpenShiftEntry {
  shift: ShiftRecord;
  register: RegisterRecord | undefined;
  registerName: string;
}

function normalizeId(id: string): string {
  return id.toLowerCase();
}

/**
 * Tenant open shifts from InventoryX, optionally filtered to registers at `locationId`.
 * Prefer passing the active location so POS / tills never bind a till from another shop.
 */
export function useOpenShifts(
  options: {
    enabled?: boolean;
    locationId?: string;
  } = {},
) {
  const enabled = options.enabled ?? true;
  const locationId = options.locationId ?? "";
  const openShifts = useQuery({
    queryKey: openShiftsQueryKey,
    queryFn: () => fetchOpenShifts(),
    enabled,
  });
  const registers = useQuery({
    queryKey: ["registers", "all"],
    queryFn: () => fetchRegisters(),
    enabled,
  });

  const entries = useMemo((): OpenShiftEntry[] => {
    const registerById = new Map(
      (registers.data ?? []).map((register) => [normalizeId(register.id), register]),
    );
    return (openShifts.data ?? [])
      .map((shift) => {
        const register = registerById.get(normalizeId(shift.registerId));
        return {
          shift,
          register,
          registerName: register?.name ?? "Register",
        };
      })
      .filter((entry) => {
        if (!locationId) return true;
        return entry.register?.locationId === locationId;
      });
  }, [openShifts.data, registers.data, locationId]);

  return {
    openShifts,
    registers,
    entries,
    isPending: enabled && (openShifts.isPending || registers.isPending),
    isError: openShifts.isError,
    error: openShifts.error,
  };
}
