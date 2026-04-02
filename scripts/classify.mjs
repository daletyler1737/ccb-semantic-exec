const SEARCH = new Set(['find','grep','rg','ag','ack','locate','which','whereis','type','command','hash'])
const READ = new Set(['cat','head','tail','less','more','wc','stat','file','strings','jq','awk','cut','sort','uniq','tr','sed','diff','cmp','comm'])
const LIST = new Set(['ls','tree','du','df','free'])
const SILENT = new Set(['mv','cp','rm','mkdir','rmdir','chmod','chown','chgrp','touch','ln','cd','export','unset','wait','true','false','exit','shift','set'])
const NEUTRAL = new Set(['echo','printf','yes','seq','jot'])
const DESTR = new Set(['dd','mkfs','mke2fs','mkfs.ext4','shred','wipefs','badblocks','parted','fdisk','cfdisk','sfdisk'])
const WRITE = new Set(['tee','perl','python','ruby','node','curl','wget'])

function has(cmd, set) {
  return [...set].some(c => cmd.includes(' '+c+' ') || cmd.startsWith(c+' ') || cmd===c)
}

function classify(cmd) {
  if (!cmd?.trim()) return { type:'unknown',isSearch:false,isRead:false,isList:false,isWrite:false,isDestructive:false,isSilent:false,isNeutral:false,command:cmd,baseCommand:'',risk:'none' }
  
  const dangerous = /rm\s+-rf\s+\/|dd\s+.*of=\/(dev\/|sd|nvme)|mkfs|fdisk|parted/.test(cmd)
  const hasSearch = has(cmd, SEARCH)
  const hasRead = has(cmd, READ)
  const hasList = has(cmd, LIST)
  const hasSilent = has(cmd, SILENT)
  const hasNeutral = has(cmd, NEUTRAL)
  const hasWrite = has(cmd, WRITE) || cmd.includes(' -o ') || cmd.includes(' >')
  
  const base = cmd.split(/\s+/)[0].split('/').pop()
  
  let type = 'unknown', risk = 'none'
  if (dangerous) { type='destructive'; risk='critical' }
  else if (hasWrite) { type='write'; risk='high' }
  else if (hasSearch) { type='search'; risk='none' }
  else if (hasRead) { type='read'; risk='none' }
  else if (hasList) { type='list'; risk='none' }
  else if (hasSilent) { type='silent'; risk='low' }
  else if (hasNeutral) { type='neutral'; risk='none' }
  
  return { type, isSearch:hasSearch, isRead:hasRead, isList:hasList, isWrite:hasWrite, isDestructive:dangerous, isSilent:hasSilent, isNeutral:hasNeutral, command:cmd, baseCommand:base, risk }
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/^file:\/\//,''))) {
  const cmd = process.argv.slice(2).join(' ')
  if (!cmd) { console.error('Usage: node classify.mjs "<command>"'); process.exit(1) }
  console.log(JSON.stringify(classify(cmd), null, 2))
}

export { classify, has }
