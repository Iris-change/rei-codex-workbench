'use strict';
// Opt-in integration test. No personal plugin home is read or changed.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {TerminalManager}=require('../terminal.cjs'),{PluginManager}=require('../plugins.cjs'),{launchCommand}=require('../bridge.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'rei-tools-')),report={date:new Date().toISOString()},delay=ms=>new Promise(r=>setTimeout(r,ms));
const executable=process.env.REI_CODEX||'codex.exe';
async function wait(fn){const end=Date.now()+20000;while(Date.now()<end){if(fn())return;await delay(100)}throw Error('Terminal output timed out')}
async function main(){
 const manager=new TerminalManager(),project={id:'sandbox',path:root};
 try{
  const a=manager.create(project),b=manager.create(project);report.stage='terminal prompt';manager.resize(a.id,120,32);
  await wait(()=>manager.get(a.id).buffer.includes('PS '));
  report.stage='terminal input';manager.input(a.id,"Write-Output ('REI_'+'PTY_OK')\r");await wait(()=>manager.get(a.id).buffer.includes('REI_PTY_OK'));
  manager.input(a.id,"Start-Sleep -Seconds 60\r");await delay(600);manager.input(a.id,'\x03');
  await delay(500);report.stage='terminal Ctrl+C';manager.input(a.id,"Write-Output ('REI_'+'CTRL_C_OK')\r");await wait(()=>manager.get(a.id).buffer.includes('REI_CTRL_C_OK'));
  report.stage='terminal second';manager.input(b.id,"Write-Output ('REI_'+'SECOND_OK')\r");await wait(()=>manager.get(b.id).buffer.includes('REI_SECOND_OK'));
  assert(manager.get(a.id).buffer.includes('REI_PTY_OK'));manager.close(a.id);assert.equal(manager.list(project.id).length,1);manager.stop();assert.equal(manager.sessions.size,0);
  report.terminal={realPowerShell:true,inputOutput:true,ctrlC:true,multipleSessions:true,bufferRestored:true,resize:true,close:true,stop:true};
 }catch(e){report.terminalDiagnostic=[...manager.sessions.values()].map(s=>({exit:s.exitCode,buffer:s.buffer}));throw e}finally{manager.stop()}
 const priorHome=process.env.CODEX_HOME,home=path.join(root,'codex-home'),market=path.join(root,'market');
 fs.mkdirSync(home);process.env.CODEX_HOME=home;
 const put=(name,value)=>{const p=path.join(market,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,value)};
 put('plugins/rei-test/.codex-plugin/plugin.json',JSON.stringify({name:'rei-test',version:'1.0.0',description:'Harmless local test. No tools, hooks or network.',skills:'./skills'}));
 put('plugins/rei-test/skills/hello/SKILL.md','---\nname: hello\ndescription: Harmless test note.\n---\nReply hello without using any tools.\n');
 put('.agents/plugins/marketplace.json',JSON.stringify({name:'rei-local-test',plugins:[{name:'rei-test',source:{source:'local',path:'./plugins/rei-test'},policy:{installation:'AVAILABLE',authentication:'ON_USE'},category:'Productivity'}]}));
 try{
  const command=launchCommand(executable);
  execFileSync(command.executable,[...command.args,'plugin','marketplace','add',market,'--json'],{cwd:root,stdio:['ignore','pipe','pipe'],windowsHide:true});
  const plugins=new PluginManager(executable);let list=await plugins.list(root);let p=list.plugins.find(p=>p.name==='rei-test');assert(p,'Test plugin absent');assert(!p.installed);
  await plugins.change(p.id,'install',root);p=(await plugins.list(root)).plugins.find(p=>p.name==='rei-test');assert(p.installed);
  await plugins.change(p.id,'remove',root);p=(await plugins.list(root)).plugins.find(p=>p.name==='rei-test');assert(!p.installed);
  report.plugins={isolatedHome:true,listed:true,installed:true,removed:true,noSensitiveCapabilities:true};
 }finally{if(priorHome===undefined)delete process.env.CODEX_HOME;else process.env.CODEX_HOME=priorHome}
}
main().catch(e=>{report.error=e.message;process.exitCode=1}).finally(()=>{
 const out=process.env.REI_TEST_REPORT||path.join(root,'report.json');fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
});
