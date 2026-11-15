# Repository automation

## Checks and protected main

`main` requires the GitHub Actions checks `quality`, `Analyze (javascript-typescript)` and `Analyze (actions)`, an up-to-date branch, one approval, and resolved conversations. Stale approvals are dismissed. Force pushes and branch deletion are disabled. As with the sibling packages, repository administrators retain their normal bypass; automation uses ordinary protected-branch merges.

Repository auto-merge is enabled. Actions default to read-only permissions; only the trusted auto-merge job receives the narrowly scoped contents and pull-request write rights it needs. The repository allows Actions to approve pull requests, so verified Dependabot updates can satisfy the review rule.

CI verifies root and playground types, lint, formatting, tests, packaging, a separately installed consumer, and Chromium/Firefox/WebKit behavior. React compatibility jobs check 19.0.0 and 19.3.1. CodeQL analyzes JavaScript/TypeScript and Actions. Gitleaks scans with redaction. Root and playground dependency audits run on main pushes and daily using the resolved Bun lockfiles.

## Dependabot policy

Dependabot checks Bun at `/` and `/playground`, plus GitHub Actions, daily at 03:00 Europe/Berlin. Each ecosystem has a one-day version-update cooldown. Minor/patch version updates are grouped; major updates stay separate. The `dependencies`, `bun`, `github-actions`, `major`, `minor`, `patch`, `security` and `ci` labels are provisioned. Dependabot alerts and automated security fixes are enabled; actual coverage depends on GitHub's ecosystem and dependency-graph support, while scheduled Bun audits check the installed dependency graph.

The metadata workflow runs trusted base automation. The privileged follow-up runs trusted main automation and verifies the successful run and attempt, workflow identity and unchanged definition, exact current PR head, bot identity, exclusively verified bot commits, and one digest-bearing minor/patch eligibility marker. It rechecks provenance before approving that exact commit and before enabling guarded squash auto-merge. The protected branch's required checks remain the merge gate. Major updates, human changes, forks and unverifiable metadata do not qualify.

Ordinary Dependabot auto-merge uses `GITHUB_TOKEN` and needs no personal token. GitHub's [Dependabot automation guide](https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/automate-dependabot-with-actions) explains the relationship between automatic approval, auto-merge and required branch checks. The optional extra rebase workflow stays disabled. It can be enabled with repository variable `ENABLE_DEPENDABOT_REBASE=true` only after configuring the dedicated `DEPENDABOT_REBASE_TOKEN` secret: a fine-grained personal token limited to this repository with Contents read and Pull requests write. Do not reuse a broad token. The script rejects app identities and deduplicates rebase requests. Native Dependabot updating and ordinary auto-merge work independently of this optional workflow.

## Stable npm releases

The npm package has not been published yet. Repository setup does not create an npm Trusted Publisher. Complete the first publication under the RentnerKev scope, then configure npm Trusted Publisher with:

- GitHub owner: `RentnerKev`
- Repository: `RentnerTable`
- Workflow filename: `npm-publish.yml`

Publishing a stable GitHub release named `vMAJOR.MINOR.PATCH` triggers the publishing workflow. It validates repository and package identity, a stable release event, the exact tag commit and main ancestry. Trusted automation runs from main; builds run against the validated tag. The prepared build receives its version from the tag without rewriting committed source. Frozen installs, the complete verification suite, package inventory and SHA-512 integrity checks precede publication. Releases use short-lived OIDC credentials with provenance, without a stored npm token. A push or tag alone does not publish.

The notes workflow generates Conventional Commit release notes, preserves authored notes outside its managed markers and uploads the [project release banner](./assets/release-banners/new-release-banner.png). The [README banner](../assets/readme/banner.png) uses the same artwork; the [saved ImageGen prompt](../assets/readme/banner.prompt.txt) records its RentnerMenu reference and intended edits. Existing assets are reused only when their SHA-256 digest matches. Existing npm versions are checked for exact integrity; collisions and channel rollback fail rather than overwriting published artifacts.

Recovery for an existing published stable release uses `gh workflow run npm-publish.yml --ref main -f tag=vMAJOR.MINOR.PATCH`, replacing the tag with the intended existing release. It keeps exact-source, ancestry, checks, integrity, stable-channel and provenance validation.
