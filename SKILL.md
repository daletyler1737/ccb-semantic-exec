---
name: ccb-semantic-exec
description: |
  Semantic command classification / 命令语义分类器
  Classifies bash commands as: search | read | list | write | destructive | silent | neutral
  用途：自动识别命令类型，用于 exec 工具安全增强、权限系统、输出显示优化。
  触发词 / Triggers: "classify command", "is this read-only", "dangerous command", "命令安全吗"
---

# Semantic Command Classifier / 命令语义分类器

CCB-style semantic command classification for bash commands.
为 bash 命令赋予语义标签，用于安全策略和 UI 显示。

## 命令分类 / Command Categories

| 分类 Category | 示例 Examples | 行为 Behavior |
|---------------|----------------|---------------|
| `search` | grep, rg, ag, find | UI 可折叠 / Collapsible in UI |
| `read` | cat, head, tail, less, wc | UI 可折叠 / Collapsible in UI |
| `list` | ls, tree, du | UI 可折叠 / Collapsible in UI |
| `write` | echo, tee, sed -i | 可能需确认 / May need confirmation |
| `destructive` | rm, dd, mkfs | 需额外确认 / Requires extra confirmation |
| `silent` | cd, export, chmod, mv, cp | 成功=无输出 / Success = no output |
| `neutral` | echo, printf, true, false | 无语义权重 / No semantic weight |

## 使用方法 / Usage

```bash
# 分类命令 / Classify a command
node classify.ts "grep -r 'TODO' src/"
# Output: { type: "search", isRead: true, isSearch: true, ... }

# 检查是否危险 / Check if destructive
node is-destructive.ts "rm -rf /"
# Output: true

# 检查是否安全可自动运行 / Check if safe to auto-run
node is-safe.ts "git status"
# Output: true
```

## API / 编程接口

```typescript
import { classify, isSearch, isRead, isDestructive, isSilent, isWrite } from './classify.js'

const result = classify('grep -r "TODO" src/')
// result: { type: 'search', isSearch: true, isRead: true, ... }
```

## 安全策略 / Security Policy

```
Command → classify() → category → policy
                              ├─ destructive → "CONFIRM_REQUIRED" / 需确认
                              ├─ write → "WARN_UNLESS_READONLY" / 警告
                              ├─ search/read/list → "AUTO_ALLOW" / 自动允许
                              └─ silent/neutral → "SILENT_ALLOW" / 静默允许
```

## 应用场景 / Use Cases

- **exec 工具安全增强** / Enhance exec tool security
- **命令输出显示优化** / Optimize command output display
- **权限系统构建** / Build permission systems
- **危险命令拦截** / Block dangerous commands
