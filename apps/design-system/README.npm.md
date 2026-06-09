# Tektone CLI

Detect UI anti-patterns and design quality issues from the command line. Scans HTML, CSS, JSX, TSX, Vue, and Svelte files for 41 deterministic rules, including AI-generated UI tells, accessibility violations, and general design quality problems.

## Quick Start

```bash
# Install skills into your AI harness (Claude, Cursor, Gemini, etc.)
npx tektone skills install

# First command to run inside your AI harness
/tektone init

# Update skills to the latest version
npx tektone skills update

# Link skills from a Git submodule checkout
npx tektone skills link --source=.tektone --providers=claude,cursor

# List all available commands
npx tektone skills help

# Scan files or directories for anti-patterns
npx tektone detect src/

# Scan a live URL (requires Puppeteer)
npx tektone detect https://example.com

# JSON output for CI/tooling
npx tektone detect --json src/

# Deprecated compatibility flag; full scan still runs
npx tektone detect --fast src/
```

## What It Detects

**AI Slop Tells**: patterns that scream "AI generated this":
- Side-tab accent borders, gradient text on headings
- Purple/violet gradients and cyan-on-dark palettes
- Dark mode with glowing accents, border + border-radius clashes

**Typography Issues**: overused fonts (Inter, Roboto), flat type hierarchy, single font families

**Color & Contrast**: WCAG AA violations, gray text on colored backgrounds, pure black/white

**Layout & Composition**: nested cards, monotonous spacing, everything-centered layouts

**Motion**: bounce/elastic easing, layout property transitions

**Quality**: tiny body text, cramped padding, long line lengths, small touch targets

41 deterministic detector rules in total. See the full catalog at [tektone.design/slop](https://tektone.design/slop).

## Exit Codes

- `0`: no issues found
- `2`: anti-patterns detected

## Options

```
tektone detect [options] [file-or-dir-or-url...]

  --fast    Regex-only mode (skip jsdom, faster but less accurate)
  --json    Output findings as JSON
  --help    Show help
```

## Requirements

- Node.js 24+
- `jsdom` (included as dependency, used for HTML scanning)
- `puppeteer` (optional, only needed for URL scanning)

## Part of Tektone

This CLI is part of [Tektone](https://tektone.design), a cross-provider design skill pack for AI-powered development tools. The full suite includes 23 commands for Claude, Cursor, Gemini, Codex, and more.

## License

[Apache 2.0](https://github.com/pbakaus/tektone/blob/main/LICENSE)
