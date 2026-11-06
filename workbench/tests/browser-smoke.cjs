'use strict';
// Opt-in Edge UI check; no saved browser profile or copied account files.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawn,execFileSync}=require('node:child_process');
const {chromium}=require(process.env.REI_PLAYWRIGHT_MODULE||'playwright');
const {launchCommand}=require('../bridge.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'rei-browser-')),project=path.join(root,'project'),port=Number(process.env.REI_TEST_PORT||43248),origin='http://127.0.0.1:'+port;
const out=process.env.REI_SCREENSHOT_DIR||root;fs.mkdirSync(out,{recursive:true});fs.mkdirSync(project);fs.mkdirSync(path.join(root,'codex-home'));
execFileSync('git',['init'],{cwd:project,stdio:'ignore'});fs.writeFileSync(path.join(project,'sample.txt'),'browser test\n');
const report={date:new Date().toISOString(),pageErrors:[],failedResources:[]};let child,browser;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const market=path.join(root,'market'),plugin=path.join(market,'plugins/rei-ui-test/.codex-plugin');fs.mkdirSync(plugin,{recursive:true});fs.mkdirSync(path.join(market,'.agents/plugins'),{recursive:true});
 fs.writeFileSync(path.join(plugin,'plugin.json'),JSON.stringify({name:'rei-ui-test',version:'1.0.0',description:'Harmless UI test; no tools or hooks.'}));
 fs.writeFileSync(path.join(market,'.agents/plugins/marketplace.json'),JSON.stringify({name:'rei-ui-local',plugins:[{name:'rei-ui-test',source:{source:'local',path:'./plugins/rei-ui-test'},policy:{installation:'AVAILABLE',authentication:'ON_USE'},category:'Productivity'}]}));
 const cmd=launchCommand(process.env.REI_CODEX||'codex.exe');execFileSync(cmd.executable,[...cmd.args,'plugin','marketplace','add',market,'--json'],{env:{...process.env,CODEX_HOME:path.join(root,'codex-home')},cwd:root,stdio:'pipe',windowsHide:true});
 child=spawn(process.execPath,[path.join(__dirname,'../server.cjs')],{env:{...process.env,REI_PORT:String(port),REI_DATA_DIR:path.join(root,'data'),CODEX_HOME:path.join(root,'codex-home')},stdio:'ignore',windowsHide:true});
 for(let i=0;i<100;i++){try{await fetch(origin+'/health');break}catch{await delay(200)}}
 const edge=process.env.REI_EDGE_PATH||path.join(process.env['ProgramFiles(x86)']||'C:\\Program Files (x86)','Microsoft','Edge','Application','msedge.exe');
 browser=await chromium.launch({executablePath:edge,headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:1500,height:950}});page.on('pageerror',e=>report.pageErrors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/api/'))report.failedResources.push(r.url().replace(origin,''))});
 await page.goto(origin+'/?boot=interactive');const frame=page.frameLocator('#animationFrame');await frame.locator('#confirmIdentity').waitFor({state:'visible',timeout:45000});
 const childFrame=page.frames().find(f=>f.url().includes('intro.html'));assert.equal(await childFrame.evaluate(()=>identityStats.time),14);assert(await childFrame.locator('.pilot-avatar').evaluate(e=>e.naturalWidth>0));
 await page.screenshot({path:path.join(out,'confirmation.png')});await frame.locator('#confirmIdentity').click();await page.waitForFunction(()=>!document.getElementById('animationDialog').open,{timeout:15000});report.bootAndConfirm=true;
 await page.evaluate(async project=>{await fetch('/api/project',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:project})})},project);
 await page.locator('#projects button').first().click();await page.locator('#openDevTools').click();await page.getByRole('button',{name:'新建 PowerShell',exact:true}).click();
 await page.locator('.xterm-helper-textarea').fill('');await page.locator('.xterm-helper-textarea').pressSequentially("Write-Output ('REI_'+'BROWSER_OK')",{delay:20});await page.locator('.xterm-helper-textarea').press('Enter');
 await page.waitForFunction(()=>document.querySelector('.xterm-screen')?.textContent.includes('REI_BROWSER_OK'),{timeout:20000});report.terminalInput=true;
 await page.screenshot({path:path.join(out,'terminal.png')});await page.locator('.dev-tabs button').filter({hasText:'Git'}).click();await page.locator('.dev-file-row').first().waitFor();report.gitPanel=true;
 await page.screenshot({path:path.join(out,'git.png')});await page.locator('.dev-tabs button').filter({hasText:'终端'}).click();await page.waitForFunction(()=>document.querySelector('.xterm-screen')?.textContent.includes('REI_BROWSER_OK'));report.switchRestores=true;
 await page.locator('.dev-tabs button').filter({hasText:'插件'}).click();await page.locator('#devPluginSearch').fill('rei-ui-test');await page.locator('.dev-plugin').filter({hasText:'rei-ui-test'}).waitFor();await page.screenshot({path:path.join(out,'plugins.png')});report.pluginSearch=true;
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'安装',exact:true}).click();await page.getByRole('button',{name:'卸载',exact:true}).waitFor({timeout:30000});report.pluginInstall=true;
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'卸载',exact:true}).click();await page.getByRole('button',{name:'安装',exact:true}).waitFor({timeout:30000});report.pluginRemove=true;
 await page.locator('.dev-tabs button').filter({hasText:'终端'}).click();await page.waitForFunction(()=>document.querySelector('.xterm-screen')?.textContent.includes('REI_BROWSER_OK'));
 await page.setViewportSize({width:1050,height:760});await delay(500);await page.locator('.dev-heading button').click();await page.locator('#openDevTools').click();await page.waitForFunction(()=>document.querySelector('.xterm-screen')?.textContent.includes('REI_BROWSER_OK'));report.reopenRestores=true;
 page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'结束所选终端',exact:true}).click();await page.getByText('点击“新建 PowerShell”开始。',{exact:false}).waitFor();report.closeTerminal=true;
 await page.locator('.dev-heading button').click();await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));report.mobile=true;
 assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.failedResources,[]);
 await page.evaluate(async()=>{const post=async(url,input)=>(await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)})).json();const p=(await(await fetch('/api/state')).json()).projects[0];const terminal=await post('/api/dev/terminal-create',{projectId:p.id});await post('/api/dev/terminal-input',{id:terminal.id,data:'Set-Content -LiteralPath ./terminal.pid -Value $PID\r'})});
 for(let i=0;i<100&&!fs.existsSync(path.join(project,'terminal.pid'));i++)await delay(100);
 const terminalPid=Number(fs.readFileSync(path.join(project,'terminal.pid'),'utf8').replace(/\uFEFF/g,'').trim());assert(terminalPid>0);
 await page.request.post(origin+'/api/shutdown',{headers:{origin,'content-type':'application/json'},data:{}});
 let terminalAlive=true;for(let i=0;i<100;i++){try{process.kill(terminalPid,0)}catch{terminalAlive=false;break}await delay(100)}assert(!terminalAlive,'Terminal survived server shutdown');report.serverExitCleansTerminal=true;
}
main().catch(e=>{report.error=e.message;process.exitCode=1}).finally(async()=>{await browser?.close();if(child?.exitCode===null)child.kill();fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))});
