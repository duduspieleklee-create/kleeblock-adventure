## Recommended GitHub-centered workflow

- **Revised Consolidated Development Plan**: long-term roadmap and architecture
- **GitHub Issues**: individual TODOs and concrete work items
- **GitHub Projects**: live progress board
- **Pull Requests and automated tests**: evidence that work is complete

### Issue structure

Each issue should clearly state:

- What needs to be built
- Why it matters
- Where the work should happen
- Acceptance criteria
- What counts as done
- The current progress
- Where work stopped
- The next step
- Any blockers

A useful rule is:

- One issue = one concrete task
- One feature branch = one issue
- One pull request = one issue

Use issue checklists, acceptance criteria, linked pull requests, and CI results to verify milestone completion. A milestone is complete only when its child issues are closed and the required integration tests pass.

A GitHub Project can use these columns:

- Backlog
- Ready
- In Progress
- Review
- Done

Useful labels include:

- `blocked`
- `backend`
- `ui`
- `testing`
