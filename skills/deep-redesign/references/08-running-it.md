# Running it with agents

A redesign like this is weeks of work. These habits keep it affordable and keep later sessions from losing what earlier ones learned.

## Files over chat

- Keep one **handoff page** (for example `HANDOFF.md`): where things live, the checks, the owner's rules, what shipped, what is next. Under one screen. Every new session reads it first.
- Keep one **progress log** (`PROGRESS.md`), newest entry last. New sessions read the last entry only.
- Research and synthesis live in numbered files. Grep for a term and read the matching lines; do not read whole folders.
- When a session ends, it updates the handoff page in one line and writes one progress entry.

## Sessions

- **A fresh session per round.** Every message in a conversation rereads the whole conversation from cache. A run that keeps most of the work in one long chat can spend about a third of its cost on those rereads. Starting each round fresh from the handoff page cuts that.
- **Parallel sessions for independent items.** Items that touch different files can run at once, each in its own git worktree on its own branch. Items that touch the same files run one after the other. Merge on the owner's word, then run the gates on the merged result: two branches that each pass can still clash.
- **Subagents for wide reading.** Research tracks, simulated readers and long searches suit subagents that return a short answer (a file path and five findings). The main session keeps a small context.
- **Cheaper models for mechanical work.** Running checks, renaming, reformatting and reading logs do not need the strongest model.

## Questions and reports

- One question round at intake. After that, options on branches, not questions.
- One report per round. Lead with what changed, then links, then check output in the checks' own words, then questions with their choices.
- When a check fails, say so with the output. When a step was skipped, say so. When something was verified, say how.

## Safety

- Never push the production branch without the owner's word. Push review branches for previews.
- Never force-push a branch other systems pull from.
- Ask before deleting anything that is not clearly scratch. Move to the trash instead of deleting where possible.
- Do not read or print secrets. Name the variable and what breaks without it.
- New cloud resources (buckets, databases, paid services) need the owner's yes.
