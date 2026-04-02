import { classify } from './classify.js'

const cmd = process.argv.slice(2).join(' ')
if (!cmd) {
  console.error('Usage: node is-safe.ts "<command>"')
  process.exit(1)
}

const result = classify(cmd)
// Safe = not destructive, not write, or read/list/search
const safe = !result.isDestructive && (result.isSearch || result.isRead || result.isList || result.type === 'silent' || result.type === 'neutral')
console.log(safe ? 'true' : 'false')
