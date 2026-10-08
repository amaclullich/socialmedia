/* shared helpers for C11 visuals */
window.C11 = {
  // grid of person icons; filled count first. opts: {total, cols, size, gap, colour, width}
  people(target, o) {
    const NS='http://www.w3.org/2000/svg', s=o.size||52, g=o.gap||10, cols=o.cols||10, total=o.total||100, h=s*1.5;
    const rows=Math.ceil(total/cols), W=cols*s+(cols-1)*g, H=rows*h+(rows-1)*g;
    const col=o.colour||'#C24E12', id='hp'+Math.random().toString(36).slice(2,7);
    let m=`<defs><pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="${col}"/><rect width="4" height="10" fill="#FFFFFF" opacity="0.55"/></pattern></defs>`;
    for(let i=0;i<total;i++){
      const r=Math.floor(i/cols), c=i%cols, x=c*(s+g), y=r*(h+g), on=i<o.filled;
      const fill=on?(o.hatch===false?col:`url(#${id})`):'#FFFFFF', st=on?col:'#7C8E8D', sw=on?3:3;
      m+=`<circle cx="${x+s/2}" cy="${y+s*0.28}" r="${s*0.24}" fill="${fill}" stroke="${st}" stroke-width="${sw}"/>`+
      `<path d="M${x+s*0.1},${y+h} V${y+s*0.82} Q${x+s*0.1},${y+s*0.6} ${x+s*0.3},${y+s*0.6} H${x+s*0.7} Q${x+s*0.9},${y+s*0.6} ${x+s*0.9},${y+s*0.82} V${y+h} Z" fill="${fill}" stroke="${st}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    }
    const svg=document.createElementNS(NS,'svg'); svg.setAttribute('viewBox',`0 0 ${W} ${H}`); svg.setAttribute('width',o.width||W); svg.setAttribute('height',(o.width||W)*H/W); svg.innerHTML=m;
    (typeof target==='string'?document.querySelector(target):target).appendChild(svg); return svg;
  }
};
