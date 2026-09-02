/**
 * Netlify serves `require-trusted-types-for 'script'` via public/_headers. React and Radix
 * assign HTML through the DOM; without a policy those assignments throw and the route
 * error boundary renders. Load this classic script before the module bundle.
 */
(function bootstrapTrustedTypes() {
  if (typeof window === "undefined" || !window.trustedTypes?.createPolicy) {
    return;
  }

  const policy = {
    createHTML: (string) => string,
    createScript: (string) => string,
    createScriptURL: (string) => string,
  };

  for (const name of ["default", "inventoryms"]) {
    try {
      window.trustedTypes.createPolicy(name, policy);
    } catch {
      // Hot reload or a prior bootstrap may have already registered the policy.
    }
  }
})();
