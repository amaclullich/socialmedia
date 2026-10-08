// C07 helpers: paired horizontal bars, solid versus hatched, zero baseline, direct labels.
(function(){
  const NS='http://www.w3.org/2000/svg';
  function el(t,a,p){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e;}
  let n=0;
  window.pairBars=function(target,o){
    const W=o.width||920,BH=o.barH||40,size=o.size||30,rowH=BH+size+30,top=6,max=o.max;
    const H=top+o.rows.length*rowH;
    const svg=el('svg',{viewBox:`0 0 ${W} ${H}`,width:W,height:H});
    const id='hatch'+(n++);
    const d=el('defs',{},svg);const pt=el('pattern',{id,width:14,height:14,patternUnits:'userSpaceOnUse',patternTransform:'rotate(45)'},d);
    el('rect',{width:14,height:14,fill:'#FBFAF6'},pt);el('rect',{width:6,height:14,fill:'#5F6B76'},pt);
    o.rows.forEach((r,i)=>{
      const y=top+i*rowH;
      const t=el('text',{x:4,y:y+size,'font-size':size,'font-weight':600,fill:'#1F2A30','font-family':'Inter'},svg);t.textContent=r.text;
      const w=Math.max((W-8)*r.value/max,3);
      if(r.hatch) el('rect',{x:3,y:y+size+10,width:w,height:BH,fill:`url(#${id})`,stroke:'#5F6B76','stroke-width':3},svg);
      else el('rect',{x:2,y:y+size+10,width:w,height:BH,fill:'#00909A'},svg);
    });
    el('line',{x1:2,y1:top+size+4,x2:2,y2:H-14,stroke:'#5F6B76','stroke-width':2},svg);
    (typeof target==='string'?document.querySelector(target):target).appendChild(svg);
    return svg;
  };
})();
