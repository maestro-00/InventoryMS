/** @type {import('@lhci/cli').Config} */
module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist",
      numberOfRuns: 3,
      settings: {
        // POS surfaces need camera permission policy; Lighthouse still audits the SPA shell.
        chromeFlags: "--no-sandbox --disable-dev-shm-usage",
        onlyCategories: ["performance", "accessibility", "best-practices"],
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 0.98 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "first-contentful-paint": ["warn", { maxNumericValue: 2000 }],
        "largest-contentful-paint": [
          "error",
          { maxNumericValue: 2500, aggregationMethod: "median" },
        ],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["warn", { maxNumericValue: 300 }],
        "interaction-to-next-paint": ["warn", { maxNumericValue: 200 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./.lighthouseci",
    },
  },
};
