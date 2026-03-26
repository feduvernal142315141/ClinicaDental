---
name: atomic-commits
description: Use when reviewing staged or working-tree changes, splitting them into focused commits, writing conventional commit messages, or executing safe Git commits in this repository.
---

# Atomic Commits

## When to use this skill
- You need to analyze the staging area or working tree.
- You need to split work into multiple focused commits.
- You need commit messages in `type(scope): subject` format.
- You need safe, copy-pasteable Git commands.

## Requirements
- Inspect the real repository state first with non-destructive Git commands.
- Respect unrelated user changes already present in the worktree.

## References
- `git diff --staged`
- `git diff`
- `git status --short`

## Workflow
1. Start with `git diff --staged`.
2. If the staging area is empty, say so clearly and only inspect unstaged changes when useful.
3. Group changes by functionality, module boundary, and change type.
4. Keep unrelated changes in separate commits.
5. Show exact `git add ...` and `git commit ...` commands first.
6. Execute commits only after the grouping is clear or the user asks to proceed.

## Validation
- No unrelated files mixed into a commit
- Remaining uncommitted files are explicitly listed
- Any validation result is reported with its real outcome

## Good example
- Split a docs-only governance change from an auth-flow bugfix so each commit has a clear scope and conventional title.

## What to avoid
- Interactive Git consoles when standard commands are enough
- Resetting or reverting unrelated work
- Mixing docs, feature, and refactor changes into a single commit without a clear reason
