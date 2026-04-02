/**
 * Semantic command classifier
 * Inspired by Claude Code Best's commandSemantics.ts
 */

const SEARCH_COMMANDS = new Set([
  'find', 'grep', 'rg', 'ag', 'ack', 'locate', 'which', 'whereis', 'type', 'command', 'hash'
])

const READ_COMMANDS = new Set([
  'cat', 'head', 'tail', 'less', 'more', 'wc', 'stat', 'file', 'strings',
  'jq', 'awk', 'cut', 'sort', 'uniq', 'tr', 'sed', 'column', 'paste',
  'xargs', 'shuf', 'rev', 'od', 'hexdump', 'base64', 'md5sum', 'sha1sum', 'sha256sum',
  'diff', 'cmp', 'comm'
])

const LIST_COMMANDS = new Set(['ls', 'tree', 'du', 'df', 'free'])

const SILENT_COMMANDS = new Set([
  'mv', 'cp', 'rm', 'mkdir', 'rmdir', 'chmod', 'chown', 'chgrp', 'touch', 'ln',
  'cd', 'export', 'unset', 'wait', 'true', 'false', 'exit', 'shift', 'set',
  'builtin', 'declare', 'local', 'readonly', 'return', 'source'
])

const NEUTRAL_COMMANDS = new Set(['echo', 'printf', 'yes', 'seq', 'jot', 'seq'])

const DESTRUCTIVE_COMMANDS = new Set([
  'dd', 'mkfs', 'mke2fs', 'mkfs.ext4', 'shred', 'wipefs', 'badblocks',
  'parted', 'fdisk', 'cfdisk', 'sfdisk', 'partprobe'
])

const WRITE_COMMANDS = new Set([
  'tee', 'sed', 'awk', ' perl', 'python', 'ruby', 'node',
  'dd', 'pv', 'base64', 'tr', 'cut', 'paste'
])

export interface SemanticResult {
  type: 'search' | 'read' | 'list' | 'write' | 'destructive' | 'silent' | 'neutral' | 'unknown'
  isSearch: boolean
  isRead: boolean
  isList: boolean
  isWrite: boolean
  isDestructive: boolean
  isSilent: boolean
  isNeutral: boolean
  command: string
  baseCommand: string
  risk: 'none' | 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Split command by shell operators (keeping operators)
 */
function splitWithOperators(cmd: string): string[] {
  // Split but keep &&, ||, |, ;, >, <, >>, 2>, 2>>, etc.
  const parts: string[] = []
  let current = ''
  let inQuote: string | null = null
  let escaped = false

  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i]

    if (escaped) {
      current += c
      escaped = false
      continue
    }

    if (c === '\\') {
      escaped = true
      current += c
      continue
    }

    if (inQuote) {
      if (c === inQuote) inQuote = null
      current += c
      continue
    }

    if (c === '"' || c === "'") {
      inQuote = c
      current += c
      continue
    }

    // Operators
    if (c === '&' && cmd[i + 1] === '&') {
      if (current.trim()) parts.push(current.trim())
      parts.push('&&')
      current = ''
      i++
      continue
    }

    if (c === '|' && cmd[i + 1] !== '|') {
      if (current.trim()) parts.push(current.trim())
      parts.push('|')
      current = ''
      i++
      continue
    }

    if (c === ';') {
      if (current.trim()) parts.push(current.trim())
      parts.push(';')
      current = ''
      continue
    }

    if (c === '>' || c === '<') {
      if (current.trim()) parts.push(current.trim())
      parts.push(c)
      current = ''
      continue
    }

    current += c
  }

  if (current.trim()) parts.push(current.trim())
  return parts.filter(p => p && !p.match(/^\s*$/))
}

/**
 * Get base command from a command part
 */
function getBaseCommand(part: string): string {
  const trimmed = part.trim()
  // Remove redirects and flags
  const parts = trimmed.split(/\s+/)
  return parts[0] || ''
}

/**
 * Classify a bash command
 */
export function classify(command: string): SemanticResult {
  if (!command.trim()) {
    return { type: 'unknown', isSearch: false, isRead: false, isList: false,
             isWrite: false, isDestructive: false, isSilent: false, isNeutral: false,
             command, baseCommand: '', risk: 'none' }
  }

  const parts = splitWithOperators(command)

  let hasSearch = false
  let hasRead = false
  let hasList = false
  let hasWrite = false
  let hasDestructive = false
  let hasSilent = false
  let hasNeutral = false
  let risk: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none'

  for (const part of parts) {
    if (['&&', '||', '|', ';', '>', '<'].includes(part)) continue

    const base = getBaseCommand(part).toLowerCase()
    const baseWithoutPath = base.split('/').pop() || base

    if (SEARCH_COMMANDS.has(baseWithoutPath)) hasSearch = true
    if (READ_COMMANDS.has(baseWithoutPath)) hasRead = true
    if (LIST_COMMANDS.has(baseWithoutPath)) hasList = true
    if (WRITE_COMMANDS.has(baseWithoutPath)) hasWrite = true
    if (DESTRUCTIVE_COMMANDS.has(baseWithoutPath)) hasDestructive = true
    if (SILENT_COMMANDS.has(baseWithoutPath)) hasSilent = true
    if (NEUTRAL_COMMANDS.has(baseWithoutPath)) hasNeutral = true

    // Danger detection for common patterns
    if (baseWithoutPath === 'rm' && part.includes('-rf')) hasDestructive = true
    if (baseWithoutPath === 'sudo' && part.includes('rm')) hasDestructive = true
    if (baseWithoutPath === 'dd' && part.includes('of=')) hasDestructive = true
    if (baseWithoutPath === 'chmod' && (part.includes('777') || part.includes('000'))) hasDestructive = true
    if (baseWithoutPath === 'curl' || baseWithoutPath === 'wget') {
      if (part.includes('-O') || part.includes('--output')) hasWrite = true
    }
  }

  // Determine type priority
  let type: SemanticResult['type'] = 'unknown'
  let isSearch = false, isRead = false, isList = false, isWrite = false
  let isDestructive = false, isSilent = false, isNeutral = false

  if (hasDestructive) {
    type = 'destructive'
    isDestructive = true
    risk = 'critical'
  } else if (hasWrite) {
    type = 'write'
    isWrite = true
    risk = 'high'
  } else if (hasSearch) {
    type = 'search'
    isSearch = true
    risk = 'none'
  } else if (hasRead) {
    type = 'read'
    isRead = true
    risk = 'none'
  } else if (hasList) {
    type = 'list'
    isList = true
    risk = 'none'
  } else if (hasSilent) {
    type = 'silent'
    isSilent = true
    risk = 'low'
  } else if (hasNeutral) {
    type = 'neutral'
    isNeutral = true
    risk = 'none'
  }

  return {
    type,
    isSearch, isRead, isList, isWrite, isDestructive, isSilent, isNeutral,
    command,
    baseCommand: getBaseCommand(parts[0] || ''),
    risk
  }
}

// CLI entry point
if (import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ''))) {
  const cmd = process.argv.slice(2).join(' ')
  if (!cmd) {
    console.error('Usage: node classify.ts "<command>"')
    process.exit(1)
  }
  const result = classify(cmd)
  console.log(JSON.stringify(result, null, 2))
}

export { isSearch, isRead, isDestructive, isSilent, isWrite } from './classify.js'
