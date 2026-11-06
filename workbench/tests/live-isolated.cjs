'use strict';
// Opt-in real model usage. New disposable project/state; existing official login is used in place.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'rei-live-')),projectRoot=path.join(root,'project'),data=path.join(root,'data');fs.mkdirSync(projectRoot);
fs.writeFileSync(path.join(projectRoot,'sum.cjs'),'exports.sum=(a,b)=>a-b;\n');
fs.writeFileSync(path.join(projectRoot,'sum.test.cjs'),"const {sum}=require('./sum.cjs');require('node:assert/strict').equal(sum(2,3),5);console.log('REI_TEST_OK');\n");
const port=Number(process.env.REI_TEST_PORT||43247),origin='http://127.0.0.1:'+port,report={date:new Date().toISOString()},delay=ms=>new Promise(r=>setTimeout(r,ms));let child,cookie;
async function api(route,input){const r=await fetch(origin+route,{method:input===undefined?'GET':'POST',headers:{cookie,origin,'content-type':'application/json'},body:input===undefined?undefined:JSON.stringify(input)});const v=await r.json();if(!r.ok)throw Error(v.error);return v}
async function start(){
 child=spawn(process.execPath,[path.join(__dirname,'../server.cjs')],{env:{...process.env,REI_PORT:String(port),REI_DATA_DIR:data},stdio:['ignore','ignore','ignore'],windowsHide:true});
 for(let i=0;i<150;i++){try{const r=await fetch(origin);cookie=r.headers.get('set-cookie').split(';')[0];const s=await api('/api/state');if(s.connection==='connected')return s;if(s.connection==='disconnected')throw Error(s.connectionError)}catch(e){if(child.exitCode!==null)throw Error('Test server exited');if(i===149)throw e}await delay(200)}throw Error('Initialize timeout');
}
async function stop(){if(!child||child.exitCode!==null)return;await api('/api/shutdown',{});for(let i=0;i<100&&child.exitCode===null;i++)await delay(50);assert.notEqual(child.exitCode,null,'Server did not exit')}
async function settle(id){for(let i=0;i<600;i++){const s=await api('/api/state');if(s.approvals.length){report.permissionRequest='Needs user decision; never auto-approved';throw Error(report.permissionRequest)}const t=s.threads.find(t=>t.id===id);if(t.status!=='inProgress'){assert.equal(t.status,'completed',t.error);return t}await delay(500)}throw Error('Real task timed out')}
async function main(){
 let s=await start();assert(s.account.signedIn,'Official login required');report.initialize=true;report.signedIn=true;report.models=s.models.length;
 const p=await api('/api/project',{path:projectRoot}),model=s.models.find(x=>x.isDefault)||s.models[0];assert(model);
 const t=await api('/api/thread',{projectId:p.id,mode:'workspace-write',model:model.id,effort:''});
 await api('/api/send',{threadId:t.id,text:'这是隔离验收。记住 REI_RESUME_BLUE_1105，仅回复 READY_BLUE。不要使用工具。'});let result=await settle(t.id);assert(result.messages.at(-1).text.includes('READY_BLUE'));report.realChat=true;
 await api('/api/thread/rename',{threadId:t.id,title:'隔离验收'});await api('/api/thread/archive',{threadId:t.id,archived:true});await api('/api/thread/archive',{threadId:t.id,archived:false});report.renameArchive=true;
 await stop();s=await start();assert(s.threads.some(x=>x.id===t.id&&x.title==='隔离验收'));
 await api('/api/send',{threadId:t.id,text:'上一轮记住的标记是什么？仅回复标记，不用工具。'});result=await settle(t.id);assert(result.messages.at(-1).text.includes('REI_RESUME_BLUE_1105'));report.fullServerRestartResume=true;
 await api('/api/send',{threadId:t.id,text:'当前项目是隔离测试。请读取 sum.cjs 和 sum.test.cjs，仅使用编辑工具修复 sum.cjs 的求和错误，然后执行 node --test sum.test.cjs。不要修改其他文件，不要申请额外权限。简要报告测试结果。'});result=await settle(t.id);
 assert(/a\s*\+\s*b/.test(fs.readFileSync(path.join(projectRoot,'sum.cjs'),'utf8')));assert(result.tools.some(x=>x.type==='commandExecution'&&x.aggregatedOutput?.includes('REI_TEST_OK')));assert(result.diff.includes('sum.cjs')||result.tools.some(x=>x.type==='fileChange'&&x.changes?.some(c=>c.path.endsWith('sum.cjs'))));report.readEditRunTestDiff=true;
 if(model.inputModalities.includes('image')){
  const png=fs.readFileSync(path.join(__dirname,'fixtures/shapes.png'));const a=await api('/api/attachment',{name:'shapes.png',dataUrl:'data:image/png;base64,'+png.toString('base64')});
  await api('/api/send',{threadId:t.id,text:'只看图片，中文说明两个形状与颜色。不使用工具。',attachments:[a.id]});result=await settle(t.id);assert(/圆/.test(result.messages.at(-1).text));report.imageInput=true;
 }
 await api('/api/send',{threadId:t.id,text:'请写很长的十种排序算法中文说明，至少10000字。不用工具。'});
 let streamed=false;for(let i=0;i<300;i++){s=await api('/api/state');const x=s.threads.find(x=>x.id===t.id);if(x.activeTurn&&x.messages.at(-1)?.role==='assistant'&&x.messages.at(-1)?.text){streamed=true;break}if(s.approvals.length)throw Error('Needs user decision');await delay(200)}assert(streamed);await api('/api/cancel',{threadId:t.id});
 for(let i=0;i<100;i++){s=await api('/api/state');if(s.threads.find(x=>x.id===t.id).status==='interrupted')break;await delay(200)}assert.equal(s.threads.find(x=>x.id===t.id).status,'interrupted');report.streamCancel=true;
 assert.equal((await fetch(origin+'/api/state')).status,403);report.cookieProtection=true;
}
main().catch(e=>{report.error=e.message;process.exitCode=1}).finally(async()=>{try{await stop()}catch{child?.kill()}const out=process.env.REI_TEST_REPORT||path.join(root,'report.json');fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))});
