# Charles CMS - Development Notes

## Prompt Log

### 1. "Please make a git repo out of this and commit/push to Lemali-Consulting/Charles-CMS"

**What was asked:** Initialize the project as a git repository, create the remote on GitHub under the Lemali-Consulting organization, and push the initial code.

**How it was addressed:** The agent:
1. Checked the current directory contents and confirmed no git repo existed yet.
2. Verified the remote repo didn't already exist on GitHub (to avoid conflicts).
3. Initialized git, staged files, created an initial commit on a `main` branch.
4. Used `gh repo create` with `--source=. --push` to create the remote and push in one step.

**Why the prompt matters (agentic engineering perspective):** This prompt is effective because it is *declarative and outcome-oriented* — it states the desired end state ("a git repo pushed to this specific remote") rather than prescribing each step. This gives the agent freedom to determine the right sequence of operations (init, check remote, create repo, push) and handle edge cases (e.g., repo already exists, branch naming). A less effective prompt might have micromanaged each git command, which would be brittle and remove the agent's ability to adapt.

### 2. Client feature request: Introduction tracking and reporting

**What was asked:** The user shared a raw client request: *"I want to know how many introductions I'm making every month between founders and investors/talent/customers. Specifically, I want to be able to leverage that in social media communications and reporting as well as continue to improve that number overtime."*

The user asked: "What are your recommendations?"

**How it was addressed:** Rather than jumping straight into code, the agent:
1. Inspected the current codebase to understand what exists (greenfield — no code yet).
2. Decomposed the client's request into four concrete needs: data capture, monthly aggregation, exportable stats for social/reporting, and trend tracking.
3. Recommended a lean tech stack (Next.js, SQLite/Postgres, Recharts) proportional to the problem size.
4. Proposed a core data model and prioritized feature list.
5. Identified ambiguities in the client request to push back on (auto-posting vs. copy-paste, goal-setting, single-user vs. team).
6. Asked the user whether to start building or refine scope first — avoiding premature implementation.

**Why the prompt matters (agentic engineering perspective):** This prompt is powerful because it is a *delegation of product thinking*, not just coding. By sharing the raw client request and asking "what are your recommendations?", the user treats the agent as a technical consultant, not just a code generator. This forces the agent to:
- **Interpret ambiguous requirements** ("leverage in social media" could mean many things)
- **Make architectural tradeoffs** (SQLite vs. Postgres, what to build first)
- **Push back constructively** (identifying what to clarify before building)

This is a hallmark of effective agentic engineering: giving the agent the *problem* rather than a *solution to implement*. It produces better outcomes because the agent can apply its breadth of knowledge to recommend approaches the user might not have considered, while the user retains decision authority over scope and direction.

### 3. "Yes, start building it out."

**What was asked:** After reviewing the agent's architectural recommendations, the user gave a two-word green light to proceed with implementation.

**How it was addressed:** The agent:
1. Created a structured task list (7 tasks) to track progress through the build.
2. Scaffolded a Next.js project with TypeScript and Tailwind CSS inside an `intro-tracker/` subdirectory.
3. Built a complete SQLite database layer (`src/lib/db.ts`) with typed queries for CRUD, monthly aggregation, and current-month stats.
4. Created REST API routes: `POST/GET /api/introductions` for logging and listing, `GET /api/introductions/stats` for monthly rollups.
5. Built three frontend pages:
   - **Dashboard** (`/`) — stat cards (total, investor, talent, customer counts), stacked bar chart via Recharts, and a "Copy to Clipboard" share button that generates a social-media-ready text snippet.
   - **Log Introduction** (`/log`) — form with date, founder name, contact name, contact type (toggle buttons), and optional notes.
   - **Trends** (`/trends`) — line chart showing month-over-month introduction counts, plus summary stats (total, avg/month, months tracked).
6. Fixed build issues (dependency resolution, TypeScript errors) and verified a clean production build.

**Why the prompt matters (agentic engineering perspective):** This is one of the most powerful prompts in agentic engineering: the *trust-and-go*. The user reviewed the plan, decided it was sound, and gave permission to execute — all in five words. This works because:
- **Prior alignment reduces risk.** The previous prompt established the plan and got buy-in. The agent doesn't need re-instruction.
- **Short directives maximize autonomy.** "Start building it out" delegates the entire execution — scaffolding, architecture, implementation order, error handling — to the agent. Micromanaging at this point would slow both parties down.
- **It creates accountability.** Because the plan was explicitly approved, the agent is now executing against a shared understanding. Deviations from the plan are the agent's responsibility to flag.

The lesson: invest time in the planning prompt, then get out of the way. A short "go" after a thoughtful planning phase produces far better results than a long prompt that tries to plan and execute simultaneously.

### 4. "Make sure you add to CHARLES-NOTES.md"

**What was asked:** A reminder to follow the instruction in CLAUDE.md — to maintain this living document alongside development.

**How it was addressed:** The agent re-read CLAUDE.md to confirm the requirements, checked whether the file already existed, and created it with entries for all prompts so far.

**Why the prompt matters (agentic engineering perspective):** This is a *meta-prompt* — it doesn't ask for a code feature but ensures the agent is following process. It demonstrates an important agentic engineering pattern: **accountability checks**. By keeping the agent honest about its own instructions, the user establishes that CLAUDE.md directives are not optional context but active requirements. Short, directive reminders like this are more effective than re-explaining the full requirement, because they signal trust in the agent's ability to look up and follow the original instruction.

### 5. Client feature request: Contact tracking with tags and multi-type support

**What was asked:** The user shared a second client request: *"I want to be able to track the amount of founders, investors and customers (Businesses purchasing from startups) I'm talking to in a given month. Ideally would be able to tag by industry, company, and university affiliation (if possible). This would eventually be useful in external communications (% of startups in X industry or from Y school)."*

The user asked the agent to plan the implementation, then clarified during planning that contacts should support *multiple types simultaneously* (e.g., someone can be both a founder and a customer).

**How it was addressed:** The agent:
1. Entered plan mode and explored the entire existing codebase to understand current schema, components, and patterns.
2. Identified that the existing `contact_type` (single value) needed to become `contact_types` (JSON array) to support multi-select.
3. Asked a clarifying question about whether "talent" should be replaced by "founder" or kept alongside it — the user chose to keep all four types with multi-select.
4. Designed a 9-step implementation plan covering: database migration (SQLite table rebuild with JSON array column + 3 new tag columns), API updates, a new `/api/introductions/tags` endpoint for autocomplete, form redesign with multi-select toggles and autocomplete inputs, dashboard updates with tag breakdown cards showing percentages, and chart/share component updates for the new founder type.
5. Implemented the plan:
   - **Database layer**: Added migration logic to detect old schema and rebuild the table, converting `contact_type` → `contact_types` (JSON array). Added `industry`, `company`, `university` columns. New queries using `json_each()` for type-based aggregation, plus `getTagBreakdown()` and `getDistinctTags()` functions.
   - **API**: Updated POST validation for arrays, added tag endpoint.
   - **Form**: Multi-select toggle buttons with per-type colors (purple for founders), three autocomplete inputs that suggest previously-used tags.
   - **Dashboard**: 5 stat cards (total + 4 types), industry/university breakdown cards with counts and percentages, updated charts with founder data in purple.
6. Verified the build compiled cleanly.

**Why the prompt matters (agentic engineering perspective):** This prompt demonstrates *iterative delegation with progressive refinement*. The user:
1. **Started with a raw client request** — again delegating interpretation rather than pre-digesting requirements.
2. **Asked for a plan first** ("can you make a plan for this?") — signaling they wanted alignment before execution. This is critical when the feature touches the data model, because schema changes are harder to undo than UI tweaks.
3. **Provided a meaningful correction during planning** — the multi-select requirement wasn't in the original client request but emerged from the agent's clarifying question. This is the highest-value moment in agentic engineering: *the agent asking the right question surfaces a requirement the user hadn't explicitly stated*. Without that question, the system would have been built with single-select and would have needed rework.

The lesson: asking the agent to plan before building creates a structured checkpoint where latent requirements surface. The cost of a planning step is low; the cost of rebuilding a data model after launch is high. Effective agentic engineering front-loads decisions that are expensive to change later.
