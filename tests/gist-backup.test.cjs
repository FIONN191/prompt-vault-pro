const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { createGistBackup } = require('../electron/gist-backup.cjs')
const { mergePayload } = require('../electron/prompt-data.cjs')
const prompt = (id, title, day) => ({ id, title, updatedAt: `2026-10-${day}T00:00:00Z` })
const wrap = prompts => ({ prompts, preferences: { categories: [{ id: 'one', zh: '测试' }] } })
test('merge retains unique records and newest edits without duplicates', () => {
 const local = wrap([prompt('a','new','08'),prompt('b','local','07')])
 const remote = wrap([prompt('a','old','06'),prompt('c','remote','07')])
 const merged = mergePayload(local,remote)
 assert.equal(merged.prompts.length,3)
 assert.equal(merged.prompts.find(p=>p.id==='a').title,'new')
 assert.equal(mergePayload(merged,remote).prompts.length,3)
 assert.throws(()=>mergePayload(local,{prompts:[null]}))
})
test('Gist create, encrypted credential storage, merge upload, pull and public rejection', async () => {
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pvp-gist-'))
 const settingsPath=path.join(dir,'gist.json')
 let gist, publicGist=false
 const calls=[]
 const fetch=async (url,options)=>{
  calls.push({url,method:options.method})
  assert.equal(options.headers.Authorization,'Bearer test-token')
  if(options.method==='POST') { const body=JSON.parse(options.body); assert.equal(body.public,false); gist={id:'abcdef12345',public:false,files:body.files} }
  if(options.method==='PATCH') gist.files={...gist.files,...JSON.parse(options.body).files}
  return {ok:true,json:async()=>({...gist,public:publicGist})}
 }
 const safeStorage={isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from('encrypted:'+s),decryptString:b=>b.toString().slice(10)}
 const service=createGistBackup({settingsPath,safeStorage,fetch})
 await service.configure({token:'test-token',gistId:''})
 assert(!(await fs.readFile(settingsPath,'utf8')).includes('test-token'))
 assert.deepEqual(await service.upload(wrap([prompt('a','first','07')])),{configured:true,gistId:'abcdef12345',count:1})
 gist.files['other.txt']={content:'preserve'}
 await service.upload(wrap([prompt('b','second','08')]))
 assert.equal((await service.pull()).prompts.length,2)
 assert.equal(gist.files['other.txt'].content,'preserve')
 assert.equal(calls.filter(c=>c.method==='POST').length,1)
 publicGist=true
 await assert.rejects(service.upload(wrap([])),/公开/)
 assert(!JSON.stringify(await service.status()).includes('test-token'))
 const restarted=createGistBackup({settingsPath,safeStorage,fetch})
 assert.equal((await restarted.status()).gistId,'abcdef12345')
 await fs.rm(dir,{recursive:true,force:true})
})
test('fails safely without encryption or on remote errors', async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pvp-gist-error-'))
 const service=createGistBackup({settingsPath:path.join(dir,'gist.json'),safeStorage:{isEncryptionAvailable:()=>false},fetch:()=>{throw Error('must not send')}})
 await assert.rejects(service.configure({token:'secret',gistId:''}),/加密/)
 await assert.rejects(service.configure({gistId:'../../bad'}),/Gist ID/)
 await assert.rejects(service.pull(),/Gist ID/)
 await fs.rm(dir,{recursive:true,force:true})
})
test('remote failures and truncated data never trigger a write', async () => {
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pvp-gist-remote-'))
 let mode='unauthorized', writes=0
 const service=createGistBackup({settingsPath:path.join(dir,'gist.json'),safeStorage:{isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from(s),decryptString:b=>b.toString()},fetch:async(url,options)=>{
  if(options.method!=='GET')writes++
  if(mode==='unauthorized')return {ok:false,status:401}
  return {ok:true,json:async()=>({public:false,files:{'prompt-vault-pro.json':{truncated:true,content:'incomplete'}}})}
 }})
 await service.configure({token:'fake',gistId:'abcdef12345'})
 await assert.rejects(service.upload(wrap([])),/401/)
 mode='truncated'
 await assert.rejects(service.upload(wrap([])),/过大/)
 assert.equal(writes,0)
 await fs.rm(dir,{recursive:true,force:true})
})
