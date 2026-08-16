# Contributing to InventoryMS

First off, thank you for considering contributing to InventoryMS! It's people like you that make InventoryMS such a great tool.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive behavior includes:**

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**

- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

**Bug Report Template:**

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**

- OS: [e.g. Windows, macOS, Linux]
- Browser: [e.g. Chrome, Firefox, Safari]
- Version: [e.g. 1.0.0]

**Additional context**
Add any other context about the problem here.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

**Enhancement Template:**

```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request.
```

### Your First Code Contribution

Unsure where to begin? Look for issues labeled:

- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `bug` - Something isn't working
- `enhancement` - New feature or request

## Development Setup

1. **Fork** and clone the repository.
2. **Enable pnpm 11.20.0** via Corepack (npm/yarn/bun are not supported):

   ```bash
   corepack enable
   corepack prepare pnpm@11.20.0 --activate
   pnpm install --frozen-lockfile
   ```

3. **Environment:**

   ```bash
   cp .env.example .env.local
   ```

   Set `VITE_INVENTORYX_ORIGIN` and optionally `VITE_API_MOCKING=true` for MSW journeys.

4. **Branch and run:**

   ```bash
   git checkout -b feature/your-feature-name
   pnpm dev
   ```

5. **Architecture overview:** see [`docs/architecture.md`](./docs/architecture.md) and
   [`README.md`](./README.md). Feature work follows
   `specs/001-inventory-pos-frontend/`.

## Coding Standards

### TypeScript

- Strict TypeScript for all new files (`noUncheckedIndexedAccess`, no `any`).
- Prefer generated OpenAPI types over hand-written DTOs.
- Money and quantities stay decimal strings from InventoryX — do not recompute totals.

### React and file layout

- Features live under `src/features/<area>/`.
- Shared UI primitives live under `src/shared/ui/` (not a prototype `components/ui` tree).
- Routes are TanStack file routes under `src/routes/`.
- Session tokens stay in memory (`SessionManager`); never write them to `localStorage`.
- Navigate between in-app routes with `<Link>`, never a raw `<a href="/…">`. An anchor
  reloads the document, which discards the in-memory session and lands the user back on
  the sign-in page. Reserve `<a>` for external URLs and downloads.
- Component tests that render a `Link` need `renderWithRouter` from
  `src/shared/test/render-router.tsx`; `renderWithProviders` has no router on purpose.

### API access

- Use the generated OpenAPI client in `src/shared/api/` / feature `*-api.ts` modules.
- Do not add raw `fetch` endpoint maps or revive deleted `src/services/*` layers.
- When the provider contract changes: update `openapi/inventoryx-v1.json`, then
  `pnpm api:generate && pnpm api:check`.

### Quality loop before PR

```bash
pnpm format:check
pnpm lint --max-warnings=0
pnpm typecheck
pnpm test
pnpm api:check
pnpm build
```

Story E2E (Chromium): `pnpm test:e2e:critical`. Responsive: `pnpm test:responsive`.
Performance budgets: `pnpm check:bundle` after build. Validation evidence patterns live
under `specs/001-inventory-pos-frontend/validation/`.

### Offline / browser caveats for contributors

- Offline production claims require the InventoryX P4 readiness gate; MSW tests alone
  are insufficient.
- Prefer Chromium for local Playwright; Firefox/WebKit may be unavailable on some agents.
- Do not invent usability or screen-reader pass percentages for tools you did not run.

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without changing functionality
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates

### Examples

```bash
feat(pos): defer service-worker updates mid-shift

fix(catalogue): preserve decimal strings on product save

docs(readme): document pnpm and validation commands

test(security): assert CSP and Trusted Types headers template
```

## Pull Request Process

1. **Update your fork** with the latest upstream changes:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Ensure your code follows** the coding standards

3. **Test your changes** thoroughly:

   ```bash
   npm run build
   npm run lint
   ```

4. **Commit your changes** following commit guidelines

5. **Push to your fork:**

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub with:
   - Clear title and description
   - Reference to related issues (e.g., "Fixes #123")
   - Screenshots/GIFs for UI changes
   - List of changes made

### Pull Request Template

```markdown
## Description

Brief description of what this PR does.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues

Fixes #(issue number)

## Changes Made

- Change 1
- Change 2
- Change 3

## Screenshots (if applicable)

Add screenshots here

## Testing

Describe how you tested your changes

## Checklist

- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where necessary
- [ ] My changes generate no new warnings
- [ ] I have tested my changes thoroughly
```

## Review Process

- Maintainers will review your PR within 3-5 business days
- Address any requested changes promptly
- Once approved, a maintainer will merge your PR
- Your contribution will be credited in the release notes

## Questions?

Feel free to:

- Open an issue for discussion
- Reach out to maintainers
- Check existing documentation

## Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to InventoryMS! 🎉
