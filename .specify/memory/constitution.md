<!--
Sync Impact Report
- Version change: template (unratified) -> 1.0.0
- Modified principles:
  - Template Principle 1 -> I. Test-First Delivery (NON-NEGOTIABLE)
  - Template Principle 2 -> II. User-Centered Simplicity
  - Template Principle 3 -> III. Mobile-First and Accessible by Default
  - Template Principle 4 -> IV. Modern, Supported Technology
  - Template Principle 5 -> V. Production Quality
- Added sections:
  - Frontend Standards
  - Development Workflow and Quality Gates
- Removed sections: none (template placeholders were resolved)
- Templates:
  - updated: .specify/templates/plan-template.md
  - updated: .specify/templates/spec-template.md
  - updated: .specify/templates/tasks-template.md
  - reviewed, no change required: .specify/templates/checklist-template.md
  - reviewed, no command templates present: .specify/templates/commands/*.md
  - updated: README.md
- Deferred items: none
-->

# InventoryMS Constitution

## Core Principles

### I. Test-First Delivery (NON-NEGOTIABLE)

Every behavior change MUST begin with an automated test that expresses the intended
outcome and is observed failing for the expected reason before production code is
written. Work MUST follow the red-green-refactor cycle. Pure logic requires unit
tests, rendered behavior requires component tests, integration boundaries require
integration or contract tests, and every critical user journey requires an end-to-end
test. A regression fix MUST include a test that reproduces the defect. Test code is
production code: it MUST be deterministic, readable, isolated from uncontrolled
services, and maintained with the behavior it protects.

Rationale: fast, trustworthy feedback permits continuous change without transferring
risk to users.

### II. User-Centered Simplicity

Each feature MUST solve a documented user need through an independently testable user
journey. Primary inventory workflows MUST minimize unnecessary choices, steps, and
context switching; labels and feedback MUST use the user's domain language. Interfaces
MUST expose clear loading, empty, success, validation, and recoverable error states.
New abstractions, dependencies, settings, and navigation levels MUST have a current,
demonstrable need. Existing design-system components and application patterns MUST be
reused when they satisfy the requirement.

Rationale: an inventory system is an operational tool; speed, predictability, and
clarity are more valuable than novelty or decorative complexity.

### III. Mobile-First and Accessible by Default

Every user-facing flow MUST be designed from the smallest supported viewport upward
and MUST remain usable without horizontal page scrolling at 320 CSS pixels. Layouts
MUST be verified at representative mobile, tablet, and desktop widths. Interactive
controls MUST be keyboard operable, expose accessible names and visible focus, and
preserve logical focus order. Semantic HTML MUST be preferred over custom interaction
roles. Text and meaningful controls MUST meet WCAG 2.2 Level AA contrast requirements,
and content MUST remain usable at 200% browser zoom. Automated accessibility checks
and manual keyboard checks MUST cover all new or materially changed journeys.

Rationale: inventory work occurs across phones, tablets, and desktops, and access to
core workflows cannot depend on a particular device or input method.

### IV. Modern, Supported Technology

New technical plans MUST evaluate the current stable releases of the frontend
framework, TypeScript, build tooling, test tooling, and design-system dependencies.
The selected versions MUST be actively supported, mutually compatible, and pinned by
the lockfile. "Latest" means the newest stable release that passes compatibility,
migration, security, and browser-support checks; pre-release software MUST NOT be used
without an approved, documented exception. Dependencies MUST be justified by concrete
value, and custom platform logic MUST NOT replace a mature, maintained library without
evidence that the library is unsuitable. Upgrades MUST include migration notes and
automated verification for affected behavior.

Rationale: deliberate currency captures platform improvements while avoiding
novelty-driven churn and unreviewed supply-chain risk.

### V. Production Quality

TypeScript code MUST preserve type safety and MUST NOT introduce unchecked `any`,
ignored compiler errors, or disabled quality rules without a documented exception.
All inputs and API data MUST be validated at trust boundaries; credentials and secrets
MUST never be exposed to browser code or logs. User-visible failures MUST be actionable
without leaking sensitive details. Plans MUST define measurable performance targets for
affected journeys, and implementation MUST verify them with repeatable evidence.
Changes MUST pass formatting, linting, type checking, the production build, and the
complete automated test suite before merge. Unused code, unexplained duplication, and
speculative abstractions MUST be removed.

Rationale: correctness includes security, performance, maintainability, and reliable
operation, not only a visually successful happy path.

## Frontend Standards

- The application MUST remain a typed, component-based web application with a coherent
  design system. A stack replacement requires an approved plan showing user or
  maintenance value and a migration path.
- Feature specifications MUST define supported viewports, accessibility outcomes,
  failure states, and measurable user-facing success criteria.
- Plans MUST record framework and tool versions, supported browsers, test layers,
  performance budgets, and any dependency or constitutional exceptions.
- Responsive behavior MUST be expressed through content-driven breakpoints and stable
  layout constraints rather than device-specific forks.
- Client state MUST have a clear owner. Remote server state, transient UI state, and
  persisted user preferences MUST not be conflated.
- API access MUST use documented contracts, explicit loading and failure handling, and
  cancellation or stale-response protection where concurrent requests can race.

## Development Workflow and Quality Gates

1. Specify prioritized, independently testable user journeys and measurable outcomes.
2. Plan the smallest coherent implementation, document technology decisions, and pass
   the Constitution Check before design work proceeds.
3. Write the appropriate automated tests, run them, and confirm that they fail for the
   intended missing behavior.
4. Implement only enough code to pass the tests, then refactor while keeping all tests
   green.
5. Verify responsive layouts, keyboard operation, accessibility, error states, and
   performance targets for each changed journey.
6. Run linting, type checking, all tests, and the production build. A failing gate MUST
   block merge unless a time-bounded exception is documented and approved.
7. Reviewers MUST trace the implementation to the specification and tests, and MUST
   reject unexplained constitutional violations or unnecessary complexity.

## Governance

This constitution is the highest-priority engineering policy for InventoryMS and
supersedes conflicting local conventions, plans, and templates. Amendments require a
documented proposal stating the motivation, affected artifacts, compatibility or
migration impact, and approval by the project maintainer. Approved amendments MUST
update dependent Spec Kit templates and runtime guidance in the same change.

Constitution versions follow semantic versioning: MAJOR for incompatible principle or
governance changes, MINOR for new principles or materially expanded obligations, and
PATCH for clarifications that do not change obligations. Every feature plan MUST pass
the Constitution Check before research and again after design. Every pull request MUST
include evidence for applicable tests and quality gates. Exceptions MUST identify the
violated rule, justification, risk controls, owner, and expiry date; expired exceptions
block further work in the affected area.

**Version**: 1.0.0 | **Ratified**: 2026-08-09 | **Last Amended**: 2026-08-09
