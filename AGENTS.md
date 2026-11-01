# Agent instructions

- For frontend design, animation, accessibility, or responsive UI work, use the local `impeccable` skill at `.agents/skills/impeccable/SKILL.md` and its relevant reference before editing.
- From Codex, ask for the `impeccable` skill by name (for example, “Use impeccable to animate the checkout dialog”). For the CLI, run `npm run design -- <command> [path/options]` from this project.
- The project launcher stores the Impeccable engine under the ignored `.impeccable-cache/` directory. If the engine is missing, run `npm run design -- engine-probe` once from a terminal with access to the verified release download, then rerun the design command.
- Keep the existing SQLite schema at 10 application tables or fewer.
