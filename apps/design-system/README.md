# Tektone

Design guidance for AI coding agents. 1 skill, 23 commands, live browser iteration, and 41 deterministic detector rules for AI-generated frontend design.

> **Quick start:** From your project root, run `npx tektone skills install`, then run `/tektone init` inside your AI coding tool. Full docs: [tektone.design](https://tektone.design).

## Why Tektone?

Anthropic's [frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) was the first widely-used design skill for Claude. Tektone started from there.

Every model trained on the same SaaS templates. Skip the guidance and you get the same handful of tells on every project: Inter for everything, purple-to-blue gradients, cards nested in cards, gray text on colored backgrounds, the rounded-square icon tile above every heading.

Tektone adds:
- **One setup flow.** `/tektone init` writes `PRODUCT.md` and offers `DESIGN.md`, so later commands know the audience, brand/product lane, voice, anti-references, colors, type, and components.
- **23 commands.** A shared design vocabulary with your AI: `polish`, `audit`, `critique`, `distill`, `animate`, `bolder`, `quieter`, and more.
- **41 deterministic detector rules** plus LLM-only critique checks. The CLI and browser extension run the deterministic rules with no LLM and no API key.

## What's Included

### The Skill: tektone

The skill installs as one command:

```bash
/tektone <command> <target>
```

Start every new project with:

```bash
/tektone init
```

`init` asks whether the surface is brand (marketing, landing, portfolio) or product (app UI, dashboard, tool), then writes project context that every later command reads.

### 23 Commands

All commands are accessed through `/tektone`:

| Command | What it does |
|---------|--------------|
| `/tektone craft` | Full shape-then-build flow with visual iteration |
| `/tektone init` | One-time setup: gather design context, write PRODUCT.md and DESIGN.md, configure live mode, recommend next steps |
| `/tektone document` | Generate root DESIGN.md from existing project code |
| `/tektone extract` | Pull reusable components and tokens into the design system |
| `/tektone shape` | Plan UX/UI before writing code |
| `/tektone critique` | UX design review: hierarchy, clarity, emotional resonance |
| `/tektone audit` | Run technical quality checks (a11y, performance, responsive) |
| `/tektone polish` | Final pass, design system alignment, and shipping readiness |
| `/tektone bolder` | Amplify boring designs |
| `/tektone quieter` | Tone down overly bold designs |
| `/tektone distill` | Strip to essence |
| `/tektone harden` | Error handling, i18n, text overflow, edge cases |
| `/tektone onboard` | First-run flows, empty states, activation paths |
| `/tektone animate` | Add purposeful motion |
| `/tektone colorize` | Introduce strategic color |
| `/tektone typeset` | Fix font choices, hierarchy, sizing |
| `/tektone layout` | Fix layout, spacing, visual rhythm |
| `/tektone delight` | Add moments of joy |
| `/tektone overdrive` | Add technically extraordinary effects |
| `/tektone clarify` | Improve unclear UX copy |
| `/tektone adapt` | Adapt for different devices |
| `/tektone optimize` | Performance improvements |
| `/tektone live` | Visual variant mode: iterate on elements in the browser |

Use `/tektone pin <command>` to create standalone shortcuts (e.g., `pin audit` creates `/audit`).

#### Usage Examples

```
/tektone audit blog           # Audit blog hub + post pages
/tektone critique landing     # UX design review
/tektone polish settings      # Final pass before shipping
/tektone harden checkout      # Add error handling + edge cases
```

Or use `/tektone` directly with a description:
```
/tektone redo this hero section
```

### Anti-Patterns

The skill includes explicit guidance on what to avoid:

- Don't use overused fonts (Arial, Inter, system defaults)
- Don't use gray text on colored backgrounds
- Don't use pure black/gray (always tint)
- Don't wrap everything in cards or nest cards inside cards
- Don't use bounce/elastic easing (feels dated)

## See It In Action

Visit [tektone.design](https://tektone.design#casestudies) to see before/after case studies of real projects transformed with Tektone commands.

## Installation

### Option 1: CLI installer (Recommended)

From the root of your project, run:

```bash
npx tektone skills install
```

This auto-detects your harness and writes the build compiled for it to the right location (`.claude/skills/`, `.cursor/skills/`, etc.). Works with Cursor, Claude Code, Gemini CLI, Codex CLI, and every other supported tool. Reload your harness afterward.

Claude Code users can alternatively install the plugin with `/plugin marketplace add pbakaus/tektone`. The general-purpose `npx skills add pbakaus/tektone` also works, though it installs one shared build for all harnesses rather than the one compiled for yours.

### Option 2: Git Submodule

For teams that want to keep Tektone vendored and updated through Git, add this repo as a submodule and link the compiled provider build into your harness folders:

```bash
git submodule add https://github.com/pbakaus/tektone .tektone
npx tektone skills link --source=.tektone --providers=claude,cursor
git add .gitmodules .tektone .claude .cursor
git commit -m "Add Tektone skills"
```

Use the providers your project needs, for example `claude`, `cursor`, `gemini`, `codex`, `github`, `opencode`, `pi`, `qoder`, `trae`, `trae-cn`, or `rovo-dev`. The command links individual skill folders from `.tektone/dist/universal/` and leaves existing real skill directories untouched unless you pass `--force`.

To update later:

```bash
git submodule update --remote .tektone
npx tektone skills link --source=.tektone --providers=claude,cursor
```

### Option 3: Download from Website

Visit [tektone.design](https://tektone.design), download the ZIP for your tool, and extract to your project.

### Option 4: Copy from Repository

**Cursor:**
```bash
cp -r dist/cursor/.cursor your-project/
```

> **Note:** Cursor skills require setup:
> 1. Switch to Nightly channel in Cursor Settings → Beta
> 2. Enable Agent Skills in Cursor Settings → Rules
>
> [Learn more about Cursor skills](https://cursor.com/docs/context/skills)

**Claude Code:**
```bash
# Project-specific
cp -r dist/claude-code/.claude your-project/

# Or global (applies to all projects)
cp -r dist/claude-code/.claude/* ~/.claude/
```

**OpenCode:**
```bash
cp -r dist/opencode/.opencode your-project/
```

**Pi:**
```bash
cp -r dist/pi/.pi your-project/
```

**Gemini CLI:**
```bash
cp -r dist/gemini/.gemini your-project/
```

> **Note:** Gemini CLI skills require setup:
> 1. Install preview version: `npm i -g @google/gemini-cli@preview`
> 2. Run `/settings` and enable "Skills"
> 3. Run `/skills list` to verify installation
>
> [Learn more about Gemini CLI skills](https://geminicli.com/docs/cli/skills/)

**Codex CLI:**
```bash
# Project-local
cp -r dist/agents/.agents your-project/

# Or user-wide
mkdir -p ~/.agents/skills
cp -r dist/agents/.agents/skills/* ~/.agents/skills/
```

> The asset-producer subagent ships nested inside the skill's own `agents/` folder, which Codex auto-discovers. No separate `.codex/agents/` copy is needed.

**GitHub Copilot:**
```bash
cp -r dist/github/.github your-project/
```

**Trae:**
```bash
# Trae China (domestic version)
cp -r dist/trae/.trae-cn/skills/* ~/.trae-cn/skills/

# Trae International
cp -r dist/trae/.trae/skills/* ~/.trae/skills/
```

> **Note:** Trae has two versions with different config directories:
> - **Trae China**: `~/.trae-cn/skills/`
> - **Trae International**: `~/.trae/skills/`
>
> After copying, restart Trae IDE to activate the skills.

**Rovo Dev:**
```bash
# Project-specific
cp -r dist/rovo-dev/.rovodev your-project/

# Or global (applies to all projects)
cp -r dist/rovo-dev/.rovodev/skills/* ~/.rovodev/skills/
```

**Qoder:**
```bash
# Project-specific
cp -r dist/qoder/.qoder your-project/

# Or global (applies to all projects)
cp -r dist/qoder/.qoder/skills/* ~/.qoder/skills/
```

## Usage

Once installed, every command runs through the single `/tektone` skill:

```
/tektone audit        # Find issues
/tektone polish       # Final cleanup
/tektone distill      # Remove complexity
/tektone critique     # Full design review
```

Type `/tektone` alone to see the full command list.

Most commands accept an optional argument to focus on a specific area:

```
/tektone audit the header
/tektone polish the checkout form
```

If you reach for one command often, pin it with `/tektone pin audit` to get `/audit` as a standalone shortcut.

**Note:** Codex uses skills here, not `/prompts:` commands. Open `/skills` or type `$tektone`. Repo-local installs live in `.agents/skills/`; user-wide installs live in `~/.agents/skills/`. GitHub Copilot uses `.github/skills/`. Restart the tool if a newly installed skill does not appear.

## CLI

Tektone includes a standalone CLI for detecting anti-patterns without an AI harness:

```bash
npx tektone detect src/                   # scan a directory
npx tektone detect index.html             # scan an HTML file
npx tektone detect https://example.com    # scan a URL (Puppeteer)
npx tektone detect --fast --json .        # regex-only, JSON output
```

The detector catches 41 deterministic issues across AI slop (side-tab borders, purple gradients, bounce easing, dark glows) and general design quality (line length, cramped padding, small touch targets, skipped headings, and more).

## Supported Tools

- [Cursor](https://cursor.com)
- [Claude Code](https://claude.ai/code)
- [OpenCode](https://opencode.ai)
- [Pi](https://pi.dev)
- [Gemini CLI](https://github.com/google-gemini/gemini-cli)
- [Codex CLI](https://github.com/openai/codex)
- [VS Code Copilot](https://code.visualstudio.com)
- [Kiro](https://kiro.dev)
- [Trae](https://trae.ai)
- [Rovo Dev](https://www.atlassian.com/software/rovo)
- [Qoder](https://qoder.com)

## Community & Ecosystem

Join the community and ecosystem conversations:

- GitHub Discussions: file bugs, request features, and help newcomers.
- [Tektone on npm](https://www.npmjs.com/package/tektone): grab the CLI, follow releases, and star the package.
- Follow @pbakaus on Twitter for release notes, sample lint reports, and video highlights of new rules.

## Contributing

See [DEVELOP.md](DEVELOP.md) for contributor guidelines and build instructions.

## License

Apache 2.0. See [LICENSE](LICENSE).

The tektone skill builds on [Anthropic's original frontend-design skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design). See [NOTICE.md](NOTICE.md) for attribution.

---

Created by [Paul Bakaus](https://www.paulbakaus.com)
