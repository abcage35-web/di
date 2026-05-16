# Project rules

- The user works in parallel with another agent (codex). On every session start the SessionStart hook pulls latest commits from the current branch; trust that state and check `git log` if unsure.
- Always commit and push edits immediately after making them — no need to ask. Use clear commit messages. Push to the current branch.
- Default working branch for new work is `main` (GitHub Pages is served from it).
