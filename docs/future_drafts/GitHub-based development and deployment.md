# Draft: GitHub-based development and deployment process

The recommended default is:

**Local development → feature branch → pull request into `main` → automated checks → merge to `main` → automatic deployment to staging → manual verification/approval → production deployment**

Avoid deploying directly from a feature branch to production, and generally avoid bypassing `main`. Keeping `main` as the clean, reviewed integration branch gives you:

- Pull-request review before integration
- Automated linting, tests, and build validation
- A clear deployment history
- A stable source for staging and production
- Easier rollback to a known commit or artifact
- Separate protection rules and secrets for each environment

## Proposed development flow

1. The developer runs the application locally, for example:

   ```bash
   npm run dev
   ```

2. The developer creates a feature branch from `main`:

   ```bash
   git checkout main
   git pull
   git checkout -b feature/improved-quest-ui
   ```

3. The developer implements and tests the change locally.

4. The developer pushes the branch and opens a pull request against `main`.

5. The pull-request workflow runs:

   - Dependency installation
   - Linting
   - Automated tests
   - Production build validation

6. After the checks pass and the pull request is approved, it is merged into `main`.

## Proposed deployment flow

### 1. Pull requests: validation only

Pull requests should normally run CI checks but should not deploy to production. Depending on the project, you may later add temporary preview deployments for pull requests, but those should remain isolated from staging and production.

### 2. Merge to `main`: automatic staging deployment

A push to `main`—normally caused by merging a pull request—should:

1. Check out the merged commit.
2. Install dependencies.
3. Run linting, tests, and the build.
4. Upload the resulting build as an artifact.
5. Deploy that artifact to staging.

Staging should represent the version that is a candidate for production. QA or the developer can then test the integrated application there.

### 3. Staging verification: production promotion

After staging has been verified, promote the **same build artifact** to production.

Do not rebuild separately for production if possible. Building once and promoting the exact immutable artifact ensures that production receives the code that was tested in staging, rather than a potentially different build.

Production promotion can be implemented in either of these ways:

- A manual approval on the GitHub `production` environment
- A separate manually triggered `workflow_dispatch` workflow
- A release/tag-based promotion process

For a small team, a protected `production` environment with required reviewers is a good starting point.

The resulting process is:

```text
feature branch
    ↓
pull request
    ↓
CI checks
    ↓
merge into main
    ↓
build once
    ↓
automatic deployment to staging
    ↓
QA/manual verification
    ↓
production approval
    ↓
deployment of the same artifact to production
```

## Important GitHub configuration

### Protect `main`

Configure branch protection or rulesets for `main`:

- Require pull requests
- Require at least one approval
- Require the CI workflow to pass
- Require branches to be up to date before merging, if appropriate
- Prevent direct pushes
- Prevent force pushes
- Optionally require conversation resolution

### Create GitHub Environments

Create two GitHub Environments:

- `staging`
- `production`

Store deployment credentials separately:

- Staging credentials in the `staging` environment
- Production credentials in the `production` environment

Do not store production credentials as ordinary repository-wide secrets if they can be scoped to the production environment.

Configure the `production` environment with:

- Required reviewers
- Deployment protection rules, if needed
- An optional production URL
- No self-approval, where your GitHub plan and configuration support that restriction

You can optionally protect staging with reviewers too, but automatic deployment to staging is usually more convenient.

## Draft workflow for later implementation

Save this later as:

```text
.github/workflows/ci-cd.yml
```

This is intentionally a deployment-template draft. Replace the placeholder deployment commands with the commands for your hosting provider, server, or platform.

```yaml
name: CI/CD Pipeline

on:
  pull_request:
    branches:
      - main

  push:
    branches:
      - main

  workflow_dispatch:

env:
  NODE_VERSION: '20'

jobs:
  ci:
    name: Build and test
    runs-on: ubuntu-latest

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run lint
        run: npm run lint

      - name: Run tests
        run: npm run test

      - name: Build application
        run: npm run build

      - name: Upload build artifact
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: actions/upload-artifact@v4
        with:
          name: build-artifact
          path: dist/
          retention-days: 7

  deploy-staging:
    name: Deploy to staging
    needs: ci
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.example.com

    steps:
      - name: Download build artifact
        uses: actions/download-artifact@v4
        with:
          name: build-artifact
          path: dist/

      - name: Deploy to staging
        env:
          STAGING_DEPLOY_KEY: ${{ secrets.STAGING_DEPLOY_KEY }}
        run: |
          echo "Replace this with the staging deployment command"
          # Example alternatives:
          # - Upload dist/ using an SSH key
          # - Deploy with a hosting provider CLI
          # - Publish to an object-storage bucket
          # - Trigger a server deployment

  deploy-production:
    name: Deploy to production
    needs: deploy-staging
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://www.example.com

    steps:
      - name: Download the staging-tested build artifact
        uses: actions/download-artifact@v4
        with:
          name: build-artifact
          path: dist/

      - name: Deploy to production
        env:
          PROD_DEPLOY_KEY: ${{ secrets.PROD_DEPLOY_KEY }}
        run: |
          echo "Replace this with the production deployment command"
```

The `production` job will wait for approval if the `production` GitHub Environment has required reviewers configured.

## One implementation detail to verify

The example uses `dist/` as the build output directory. Confirm that this matches the project:

- Vite commonly outputs to `dist/`
- Some frameworks use `build/`
- Next.js commonly uses `.next/`
- Other hosting systems may deploy directly through a provider CLI

The deployment steps also depend on where the application is hosted. For example, the final job could use an SSH command, `scp`, a cloud CLI, Vercel, Netlify, GitHub Pages, Docker, or another deployment mechanism.

## Rollback plan

Before implementing this, define how to roll back:

- Keep previous successful deployments available
- Record the deployed commit SHA
- Prefer versioned or immutable artifacts
- Support redeploying the previous successful artifact
- Consider production tags or releases for important versions

A practical initial rule is:

> If production has a problem, redeploy the last known-good artifact rather than rebuilding an old commit manually.

## Final recommended policy

For the initial implementation, use:

- Feature branches for all changes
- Pull requests into `main`
- Required CI checks before merging
- Automatic deployment from `main` to staging
- Manual QA on staging
- Required approval before production
- The same build artifact promoted from staging to production
- Separate staging and production secrets
- A documented rollback to the previous successful deployment

Direct feature-branch-to-production deployment should not be the normal path. If you later need an urgent hotfix, create a dedicated hotfix branch and pull request into `main`; after it passes the same checks, let the normal staging and production process handle it.
