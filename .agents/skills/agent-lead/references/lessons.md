# Lessons (cross-project, append-only)

One line each: the lesson, then the rule it produced. Newest last. Stack-specific quirks live in the stack
modules; this file is for lessons about running agents.

- An addendum given beside the prompt never reached the agent -> everything goes inside the one prompt block.
- A test count was wrong (48 vs 51): counting helper calls missed inline checks -> count result rows with `scripts/pin.sh`, never estimates.
- File hashes differed on a Windows checkout (CRLF) -> pin and hash with `git show <sha>:<path>`.
- A tool "declined" a write that Postgres would have accepted -> "declined" is a STOP, never a retry; route
  the action to the owner and verify afterwards.
- A handoff said a DB change was needed; the live trigger already allowed it -> verify the state file against
  the live system before planning on it.
- A behaviour test failed on fixture data colliding with a real profile -> fixtures use values live data
  cannot have; fixing the fixture constant is a test fix, not a logic change — report it as such.
- Several agents in parallel created duplicate branches -> name one base branch per milestone; check newest
  origin branches at every session start.
- The owner asked "is this step critical?" about a polish round -> triage before writing polish prompts;
  progress milestones beat polish.
