#!/bin/bash
# .claude/hooks/session-start.sh: Claude Code SessionStart hook.
set -euo pipefail

# Never under GitHub Actions: claude-code-action restores .claude/ from the
# base branch, but not .agents/ or scripts/, so on a pull request this would
# run the PR head's scripts with the job's token. The workflow provisions its
# own toolchain, so there is nothing to do here.
[ "${GITHUB_ACTIONS:-}" = "true" ] && exit 0

# Local sessions link env files from the primary checkout; Node comes from
# nvm/fnm there.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  "${CLAUDE_PROJECT_DIR:-.}/scripts/setup-worktree.sh"
  exit 0
fi

# bash, not the file mode: a checkout without +x still works.
exec bash "${CLAUDE_PROJECT_DIR:-.}/.agents/setup.sh"
