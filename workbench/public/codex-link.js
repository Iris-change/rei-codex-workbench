import {loopTime,breathe} from './motion-v12.js';

export function drawCodexLink(c,logo,{x,y,size=64,alpha=1,progress=1,time=0,connected=true}){
 c.save();c.globalAlpha*=alpha;c.translate(x,y);
 const radius=size*.77,angle=loopTime(time,6)*Math.PI*2,pulse=1+.022*breathe(time,3.8);
 c.strokeStyle=connected?'#7492a4a0':'#7c98a980';c.lineWidth=Math.max(1,size/90);
 c.beginPath();c.arc(0,0,radius*pulse,0,Math.PI*2);c.stroke();
 c.strokeStyle=connected?'#6a8a9d':'#7593a5';c.beginPath();c.arc(0,0,radius+size*.10,angle,angle+Math.PI*2*Math.max(.035,progress)*.7);c.stroke();
 c.strokeStyle='#7290a270';c.beginPath();c.arc(0,0,radius+size*.17,-angle+.3,-angle+.8);c.stroke();
 // The official knot is drawn intact, without rotation, recoloring or distortion.
 c.drawImage(logo,-size/2,-size/2,size,size);c.restore();
}
