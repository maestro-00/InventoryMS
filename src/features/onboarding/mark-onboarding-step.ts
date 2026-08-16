import { useCallback } from "react";
import { useTenant, useUpdateTenant } from "../tenant/api/tenant-queries";
import { checklistAfterStep } from "./completion";

/**
 * Marks an onboarding checklist step complete via a tenant PATCH when it is not
 * already recorded. Safe to call from any successful setup mutation.
 */
export function useMarkOnboardingStep(): (step: string) => void {
  const tenant = useTenant();
  const updateTenant = useUpdateTenant();

  return useCallback(
    (step: string) => {
      const resource = tenant.data;
      if (!resource) return;
      const next = checklistAfterStep(resource.tenant.onboardingChecklist, step);
      if (!next) return;
      updateTenant.mutate({
        update: { onboardingChecklist: next },
        ...(resource.etag ? { etag: resource.etag } : {}),
      });
    },
    [tenant.data, updateTenant],
  );
}
