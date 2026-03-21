---
name: atomic-commits
description: Use when asked to review staged or working-tree changes, split them into focused commits, write conventional commit messages, or execute safe Git commits in this repository. This skill groups changes by functionality, module, and change type while avoiding destructive or unrelated Git operations.
---

# Atomic Commits

## Use this skill when

- You need to analyze the staging area or working tree
- You need to split work into multiple commits
- You need commit messages in `type(scope): subject` format
- You need copy-pasteable Git commands
- You need the commits executed safely in the current branch

## Workflow

1. Start with `git diff --staged`.
2. If the staging area is empty, say so clearly and, only if useful, analyze `git diff`.
3. Group changes by:
   - functionality
   - module or component boundary
   - change type (`feat`, `fix`, `docs`, `refactor`, and so on)
4. Keep unrelated changes in separate commits.
5. Show exact `git add ...` and `git commit ...` commands first.
6. Execute the commits only after the grouping is clear or the user asks to proceed.

## Working rules

- Use standard Git commands only
- Do not rely on GitKraken or interactive consoles
- Prefer non-interactive Git commands
- Never reset or revert unrelated work
- Keep commit titles in English unless the user asks otherwise
- Default to `type(scope): subject` with a concise present-tense subject
- Use the commit body to explain what changed, why, and the impact

## Validation checklist

- No unrelated files mixed into a commit
- Docs, auth, module, and feature changes are separated when needed
- The repo state is clean or remaining changes are explicitly listed
- Any validation result is reported with its real outcome

## Response checklist

- Proposed commit groups
- Exact commands to run
- Commits created, if executed
- Remaining uncommitted files, if any
