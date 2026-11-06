'use strict';
window.ProtocolFX={reconstruct(node){if(!node||matchMedia('(prefers-reduced-motion: reduce)').matches)return;node.animate([{opacity:.6},{opacity:1}],{duration:250})}};
