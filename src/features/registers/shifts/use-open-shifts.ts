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
 * Tenant open shifts from InventoryX plus all registers for display names.
 * Does not filter by active location — the API already scopes by permission.
 */
export function useOpenShifts(options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
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
    return (openShifts.data ?? []).map((shift) => {
      const register = registerById.get(normalizeId(shift.registerId));
      return {
        shift,
        register,
        registerName: register?.name ?? "Register",
      };
    });
  }, [openShifts.data, registers.data]);

  return {
    openShifts,
    registers,
    entries,
    isPending: openShifts.isPending || registers.isPending,
    isError: openShifts.isError,
    error: openShifts.error,
  };
}
