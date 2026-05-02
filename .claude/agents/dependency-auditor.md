---
description: Audits npm/pub dependencies for vulnerabilities, outdated majors, unused packages
model: sonnet
tools:
  - Bash
  - Read
  - Grep
---

# Dependency Auditor

Run a security + freshness audit on the project's package manifests.

## Process

1. **Vulnerability scan** (npm)
   ```bash
   cd backend && npm audit --production --json
   cd .. && npm audit --production --json
   ```
   Report only `high` and `critical` findings with the upgrade path.

2. **Outdated majors**
   ```bash
   cd backend && npm outdated --json
   cd .. && npm outdated --json
   ```
   List packages where `current` and `latest` differ in major version.

3. **Unused dependencies**
   For each entry in `dependencies`, `Grep` the codebase for `import` of the package name. Packages with zero hits are reported as candidates for removal.

4. **Flutter** (if `mobile/pubspec.yaml` exists)
   ```bash
   cd mobile && flutter pub outdated --no-dev-dependencies
   ```

## Output

A markdown report with sections: **Vulnerabilities**, **Outdated majors**, **Unused**, **Flutter**.

For each item: package, current version, recommended version, breaking-change risk (low/med/high), one-line action.

End with an executive summary: how many BLOCKERS need immediate action vs how many can wait.
