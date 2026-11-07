# Storybook visual test

A component library workflow that combines **Storybook** and **Playwright** to catch unintended UI changes automatically.

Every UI component is developed and documented in isolation as a Storybook story. Playwright then screenshots each story and compares it against an approved baseline image. Any visual difference fails the test and produces a report with expected, actual, and diff images, so reviewers can see exactly what changed before it reaches production.

## Goals

- Develop and document components in isolation, with every state and variant in one place
- Detect visual regressions (layout shifts, style changes, broken fonts) on every pull request
- Speed up UI review with side-by-side diffs instead of manual inspection
- Keep results reproducible by running tests in the official Playwright Docker image

## Tech stack

- React + TypeScript + Vite (swap for your framework)
- Storybook for component development and documentation
- Playwright Test for browser automation and screenshot comparison
- Docker and GitHub Actions for reproducible local and CI runs

## Quick start (Docker)

The only requirement is [Docker](https://docs.docker.com/get-docker/). Browsers, fonts, and Node are all included in the image.

> The image tag must match the `@playwright/test` version in `package.json`. Check it with `npx playwright --version` and adjust `v1.65.0` below if needed.

### 1. Open a shell in the container

From the project root:

```bash
 docker run --rm -it --ipc=host -p 6006:6006 -v ./:/app -w /app mcr.microsoft.com/playwright:v1.65.0-noble bash
```

### 2. Install dependencies

```bash
npm ci
```

### 3. Create baseline screenshots

```bash
npm run test:update
```

### 4. Run the visual tests

```bash
npm run test
```

Baselines are saved to `tests/__screenshots__/` on your machine (the project folder is mounted). Commit them to Git.

### 5. View the report

Open `playwright-report/index.html` from your host, or start the report server inside the container (add `-p 9323:9323` to the `docker run` command first):

```bash
npx playwright show-report --host 0.0.0.0
```

Then visit http://localhost:9323.

### One-liner

Run the whole test suite without opening a shell:

```bash
 docker run --rm -it --ipc=host -p 6006:6006 -v ./:/app -w /app mcr.microsoft.com/playwright:v1.65.0-noble bash -c "npm ci && npm run test:visual"  
```

## Local development (without Docker)

```bash
npm install
npm run storybook        # http://localhost:6006
```

Avoid generating baselines outside Docker. Fonts and rendering differ between macOS, Windows, and Linux, which causes false diffs.

## Scripts

| Command | Purpose |
|---|---|
| `npm run storybook` | Develop components locally on port 6006 |
| `npm run build-storybook` | Build the static Storybook into `storybook-static/` |
| `npm run serve-storybook` | Serve the static build on port 6006 |
| `npm run test:visual` | Run visual regression tests |
| `npm run test:visual:update` | Regenerate baseline screenshots |

## How it works

1. A developer writes or updates a component and its stories.
2. Storybook builds a static site where each story has its own URL.
3. Playwright reads `index.json`, loads every story, waits for it to render, and takes a screenshot.
4. Screenshots are compared with the committed baselines. Differences fail the run and generate an HTML report.
5. If a change is intentional, run `npm run test:visual:update` and commit the new baselines for review.

## Project structure

```
├── .storybook/            # Storybook config
├── src/components/        # Components and *.stories.tsx files
├── tests/
│   ├── visual.spec.ts     # Story screenshot tests
│   └── __screenshots__/   # Approved baselines (commit these)
├── playwright.config.ts
└── package.json
```