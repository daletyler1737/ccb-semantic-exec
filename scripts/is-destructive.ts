import { classify } from './classify.js'

const cmd = process.argv.slice(2).join(' ')
if (!cmd) {
  console.error('Usage: node is-destructive.ts "<command>"')
  process.exit(1)
}

const result = classify(cmd)
console.log(result.isDestructive ? 'true' : 'false')
