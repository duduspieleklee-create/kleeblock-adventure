Understood. The **“more people share work” / multi-developer workload-splitting section is removed for now**. The workflow will stay focused on task tracking, milestone completion, resuming work, and a solo-developer or small-team process.



## Streamlined CI/CD pipeline

The deployment flow remains:

**Local development → feature branch → pull request to `main` → CI validation → merge to `main` → automatic staging deployment → QA verification → manual production approval → production deployment**

1. **Local development**
   - Work locally.
   - Run the development server with `npm run dev`.
   - Create a feature branch.
   - Open a pull request into `main`.

2. **Pull request validation**
   - GitHub Actions runs linting, tests, and the production build.
   - Pull requests should validate code only; they should not deploy to production.

3. **Merge to `main`**
   - Protect `main` from direct pushes.
   - Require pull requests and successful CI checks.
   - A merge to `main` triggers the deployment pipeline.

4. **Staging deployment**
   - Build the application once.
   - Upload the resulting artifact.
   - Automatically deploy that artifact to the `staging` environment.

5. **Production promotion**
   - Verify the application in staging.
   - Manually approve the `production` environment.
   - Deploy the exact same artifact that was tested in staging.

The important principle is: **build once, then promote the same immutable artifact**. Do not rebuild separately for production, because that can create differences between what was tested and what is ultimately deployed.

## GitHub configuration

Create two GitHub Environments:

- `staging`
- `production`

Configure them as follows:

- Store staging credentials only in the `staging` environment.
- Store production credentials only in the `production` environment.
- Require reviewers for the `production` environment.
- Prevent self-approval where supported.
- Protect `main`.
- Require CI checks to pass before merging.
- Prevent direct pushes to `main`.

A suitable initial repository structure is:

```text
.github/
  workflows/
    ci-cd.yml
  ISSUE_TEMPLATE/
  pull_request_template.md

docs/
  revised-consolidated-development-plan.md
```

## Draft `.github/workflows/ci-cd.yml`

```yaml
name: CI/CD Pipeline

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run lint
        run: npm run lint

      - name: Run tests
        run: npm run test

      - name: Build application
        run: npm run build

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: build-artifact
          path: dist/
          retention-days: 7

  deploy-staging:
    needs: ci
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - name: Download build artifact
        uses: actions/download-artifact@v4
        with:
          name: build-artifact
          path: dist/

      - name: Deploy to staging
        run: echo "Insert your staging deployment command here"

  deploy-production:
    needs: deploy-staging
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest

    environment:
      name: production
      url: https://www.example.com

    steps:
      - name: Download build artifact
        uses: actions/download-artifact@v4
        with:
          name: build-artifact
          path: dist/

      - name: Deploy to production
        run: echo "Insert your production deployment command here"
```

The deployment commands are placeholders and should be replaced with the commands for the selected hosting provider. The overall structure is now intentionally limited to the core development, tracking, testing, staging, and production flow; guidance for distributing work among additional developers is deferred until it becomes necessary.
