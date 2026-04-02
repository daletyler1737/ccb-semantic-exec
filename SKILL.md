---
name: ccb-semantic-exec
description: |
  CCB-style semantic command classification for bash commands.
  Classifies commands as: search | read | list | write | destructive | silent | neutral
  Use when: enhancing exec tool security, categorizing command output for display,
  or building permission systems. Triggers: "classify command", "is this read-only",
  "dangerous command", "exec security", "command category".
---

# Semantic Command Classifier

Inspired by Claude Code Best's `commandSemantics.ts`.

## Command Categories

| Category | Examples | Behavior |
|----------|----------|----------|
| `search` | grep, rg, ag, find, locate | Collapsible in UI |
| `read` | cat, head, tail, less, wc | Collapsible in UI |
| `list` | ls, tree, du | Collapsible in UI |
| `write` | echo, tee, sed -i | May need confirmation |
| `destructive` | rm, dd, mkfs | Requires extra confirmation |
| `silent` | cd, export, chmod, mv, cp | Success = no output |
| `neutral` | echo, printf, true, false | No semantic weight |

## Usage

```bash
# Classify a command
node classify.ts "grep -r 'TODO' src/"
# Output: { type: "search", isRead: true, isSearch: true, ... }

# Check if destructive
node is-destructive.ts "rm -rf /"
# Output: true

# Check if safe to auto-run
node is-safe.ts "git status"
# Output: true
```

## API

```typescript
import { classify, isSearch, isRead, isDestructive, isSilent, isWrite } from './classify.js'

const result = classify('grep -r "TODO" src/')
// result: { type: 'search', isSearch: true, isRead: true, isList: false, isWrite: false, isDestructive: false, isSilent: false }
```

## Security Model

```
Command → classify() → category → policy
                              ├─ destructive → "CONFIRM_REQUIRED"
                              ├─ write → "WARN_UNLESS_READONLY"
                              ├─ search/read/list → "AUTO_ALLOW"
                              └─ silent/neutral → "SILENT_ALLOW"
```

## Integration with exec

Wrap any exec call:
```bash
RESULT=$(node is-safe.ts "git push")
if [ "$RESULT" = "true" ]; then
  # safe to run
else
  echo "WARNING: potentially unsafe command"
fi
```
