import { classify } from './classify.mjs'
const cmd = process.argv.slice(2).join(' ')
if (!cmd) { console.error('Usage: node is-safe.mjs "<command>"'); process.exit(1) }
const r = classify(cmd)
console.log(!r.isDestructive && (r.isSearch || r.isRead || r.isList || r.type==='silent' || r.type==='neutral') ? 'true' : 'false')
