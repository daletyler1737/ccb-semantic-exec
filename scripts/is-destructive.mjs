import { classify } from './classify.mjs'
const cmd = process.argv.slice(2).join(' ')
if (!cmd) { console.error('Usage: node is-destructive.mjs "<command>"'); process.exit(1) }
console.log(classify(cmd).isDestructive ? 'true' : 'false')
