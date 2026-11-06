const path=require('node:path'),fs=require('node:fs'),os=require('node:os'),http=require('node:http'),{execFile,spawn}=require('node:child_process'),{promisify}=require('node:util'),assert=require('node:assert/strict');
const exec=promisify(execFile),data=fs.mkdtempSync(path.join(os.tmpdir(),'rei-launch-')),port=43251,origin='http://127.0.0.1:'+port;
const script=path.join(__dirname,'../start.ps1'),args=['-NoProfile','-ExecutionPolicy','Bypass','-File',script,'-NoBrowser','-Port',String(port),'-DataDirectory',data],report={date:new Date().toISOString()};
let fake;
const launch=()=>new Promise((resolve,reject)=>{const p=spawn('powershell.exe',args,{stdio:'ignore',windowsHide:true});p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(Error('Launcher exited '+code)))});
(async()=>{fake=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({app:'EVA-UNIT00',instance:'different-directory'}))});await new Promise(r=>fake.listen(port,'127.0.0.1',r));await assert.rejects(()=>exec('powershell.exe',args),/occupied/);report.rejectOtherDirectory=true;await new Promise(r=>fake.close(r));fake=null;
await launch();const health=await(await fetch(origin+'/health')).json();assert(health.instance);report.isolatedStart=true;
await launch();report.reuseMatchingInstance=true;
const home=await fetch(origin);const cookie=home.headers.get('set-cookie').split(';')[0];await fetch(origin+'/api/shutdown',{method:'POST',headers:{cookie,origin,'content-type':'application/json'},body:'{}'});report.shutdown=true;
})().catch(e=>{report.error=e.message;process.exitCode=1}).finally(()=>{fake?.close();fs.writeFileSync(process.env.REI_TEST_REPORT||path.join(data,'launcher-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))});

