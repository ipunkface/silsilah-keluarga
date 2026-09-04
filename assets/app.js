(() => {
  const $ = s => document.querySelector(s);
  const viewport=$('#viewport'), world=$('#world'), nodesEl=$('#nodes'), lines=$('#lines');
  let treeKey='keluarga-besar', people=[], collapsed=new Set(), effects=true, introVisible=true;
  let scale=1, tx=110, ty=90, dragging=false, moved=false, sx=0, sy=0, downX=0, downY=0;
  let lastToggleId=null, lastToggleClosing=false;
  const cfg=window.SUPABASE_CONFIG||{};
  const MOTION=980;

  async function supaGetPeople(key){
    if(!cfg.url || !cfg.anonKey) return null;
    const url = `${cfg.url}/rest/v1/people?select=*&tree_key=eq.${encodeURIComponent(key)}&is_public=eq.true&order=generation.asc,child_order.asc.nullslast,id.asc`;
    try{
      const res=await fetch(url,{headers:{apikey:cfg.anonKey,Authorization:`Bearer ${cfg.anonKey}`}});
      if(!res.ok) return null;
      return await res.json();
    }catch(e){ return null; }
  }

  async function loadTree(key){
    treeKey=key;
    let local=(window.SILSILAH_DATA||{})[key];
    people=local?JSON.parse(JSON.stringify(local.people)):[];
    const data=await supaGetPeople(key);
    if(Array.isArray(data) && data.length){
      people=data.map(r=>({id:r.legacy_id||String(r.id),db_id:r.id,name:r.name,spouse:r.spouse||'',parent_id:r.parent_legacy_id||null,order:r.child_order,generation:r.generation||0,branch:r.branch||'',note:r.note||'',source_sheet:r.source_sheet||'',source_row:r.source_row||null}));
    }
    $('#pageTitle').textContent=(window.SILSILAH_DATA?.[key]?.title)||'SILSILAH KELUARGA';
    collapsed.clear(); people.filter(p=>!p.parent_id && childrenOf(p.id).length).forEach(p=>collapsed.add(p.id)); lastToggleId=null; introVisible=true; render(false); showIntro(true); focusRootIntro();
  }

  function childrenOf(id){return people.filter(p=>p.parent_id===id).sort((a,b)=>(a.order??999)-(b.order??999)||a.name.localeCompare(b.name));}
  function visibleSet(){
    const roots=people.filter(p=>!p.parent_id); const out=[];
    const walk=p=>{out.push(p); if(!collapsed.has(p.id)) childrenOf(p.id).forEach(walk)};
    roots.forEach(walk); return out;
  }
  function layout(){
    const vis=visibleSet(); const map=new Map(vis.map(p=>[p.id,p])); const kids=new Map();
    vis.forEach(p=>kids.set(p.id,childrenOf(p.id).filter(c=>map.has(c.id))));
    let nextY=40; const pos=new Map(); const rowH=112, xGap=335;
    function place(p){
      const cs=kids.get(p.id)||[];
      if(!cs.length){pos.set(p.id,{x:70+(p.generation||0)*xGap,y:nextY});nextY+=rowH;return pos.get(p.id).y;}
      const ys=cs.map(place); const y=(ys[0]+ys[ys.length-1])/2; pos.set(p.id,{x:70+(p.generation||0)*xGap,y}); return y;
    }
    vis.filter(p=>!p.parent_id).forEach(place);
    return {vis,pos,width:Math.max(1300,...[...pos.values()].map(v=>v.x+430)),height:Math.max(760,nextY+100)};
  }

  function captureNodeState(){
    const m=new Map();
    nodesEl.querySelectorAll('.tree-node[data-id]').forEach(el=>{
      m.set(el.dataset.id,{x:parseFloat(el.style.left)||0,y:parseFloat(el.style.top)||0,html:el.outerHTML});
    });
    return m;
  }

  function animateGhosts(oldState,newPos,newIds){
    if(!effects) return;
    oldState.forEach((v,id)=>{
      if(newIds.has(id)) return;
      const p=people.find(x=>x.id===id); if(!p) return;
      const ghost=document.createElement('div');
      ghost.className='tree-node node-leave-ghost '+((p.generation||0)===0?'root':'g'+Math.min(p.generation||0,5));
      ghost.style.left=v.x+'px'; ghost.style.top=v.y+'px';
      ghost.innerHTML=`<div class="name">${escapeHtml(p.name)}</div>${p.spouse?`<div class="spouse">${escapeHtml(p.spouse)}</div>`:''}${p.order?`<div class="order">ANAK KE-${p.order}</div>`:''}`;
      let target={x:v.x,y:v.y};
      const parentPos=p.parent_id?newPos.get(p.parent_id):null;
      if(parentPos) target={x:parentPos.x,y:parentPos.y};
      ghost.style.setProperty('--leave-x',(target.x-v.x)+'px');
      ghost.style.setProperty('--leave-y',(target.y-v.y)+'px');
      nodesEl.appendChild(ghost);
      requestAnimationFrame(()=>ghost.classList.add('go'));
      setTimeout(()=>ghost.remove(),MOTION+80);
    });
  }

  function toggleNode(id){
    showIntro(false);
    lastToggleId=id;
    lastToggleClosing=!collapsed.has(id);
    collapsed.has(id)?collapsed.delete(id):collapsed.add(id);
    render(true);
    // Seperti referensi: setiap cabang dibuka/ditutup, kamera ikut mundur/maju
    // dan menengahkan kembali pohon agar komposisinya tetap nyaman dilihat.
    requestAnimationFrame(()=>requestAnimationFrame(()=>smartFrameAfterToggle(lastToggleClosing)));
  }

  function render(animate=true){
    const oldState=captureNodeState();
    const {vis,pos,width,height}=layout();
    const newIds=new Set(vis.map(p=>p.id));
    world.style.width=width+'px';world.style.height=height+'px';lines.setAttribute('width',width);lines.setAttribute('height',height);
    nodesEl.innerHTML='';lines.innerHTML='';
    const visibleIds=newIds;

    vis.forEach(p=>{
      if(p.parent_id&&visibleIds.has(p.parent_id)){
        const a=pos.get(p.parent_id),b=pos.get(p.id); const aw=(people.find(x=>x.id===p.parent_id)?.generation||0)===0?360:265;
        const x1=a.x+aw,y1=a.y+42,x2=b.x,y2=b.y+42,mid=(x1+x2)/2;
        const path=document.createElementNS('http://www.w3.org/2000/svg','path');
        path.setAttribute('d',`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`);path.setAttribute('fill','none');path.setAttribute('stroke','#b8c9df');path.setAttribute('stroke-width','2.2');
        if(animate&&effects){
          const len=path.getTotalLength?.()||450;
          path.style.strokeDasharray=String(len); path.style.strokeDashoffset=String(len);
          path.classList.add('line-enter');
          requestAnimationFrame(()=>{path.style.strokeDasharray=String(len);path.style.strokeDashoffset='0';path.style.transition=`stroke-dashoffset ${MOTION}ms cubic-bezier(.22,.61,.36,1), opacity ${MOTION*.6}ms ease`;path.style.opacity='1';});
        }
        lines.appendChild(path);
      }

      const el=document.createElement('div'); const gen=p.generation||0;
      el.className='tree-node '+(gen===0?'root':'g'+Math.min(gen,5));
      const cur=pos.get(p.id); el.style.left=cur.x+'px';el.style.top=cur.y+'px';el.dataset.id=p.id;
      el.innerHTML=`<div class="name">${escapeHtml(p.name)}</div>${p.spouse?`<div class="spouse">${escapeHtml(p.spouse)}</div>`:''}${p.order?`<div class="order">ANAK KE-${p.order}</div>`:''}`;
      const kids=childrenOf(p.id);
      if(kids.length){
        const t=document.createElement('button'); t.type='button'; t.className='toggle'; t.textContent=collapsed.has(p.id)?'+':'−'; t.title=collapsed.has(p.id)?'Buka keturunan':'Tutup keturunan';
        t.addEventListener('pointerdown',e=>e.stopPropagation());
        t.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggleNode(p.id);});
        el.appendChild(t);
      }
      el.addEventListener('click',e=>{ if(moved) return; if(kids.length) toggleNode(p.id); else showProfile(p); });
      el.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();showProfile(p);});
      nodesEl.appendChild(el);

      if(animate&&effects){
        const prev=oldState.get(p.id);
        el.classList.add('node-motion');
        if(prev){
          const dx=prev.x-cur.x, dy=prev.y-cur.y;
          if(Math.abs(dx)>0.5||Math.abs(dy)>0.5){
            el.style.transition='none';
            el.style.transform=`translate(${dx}px,${dy}px)`;
            requestAnimationFrame(()=>requestAnimationFrame(()=>{el.style.transition='';el.style.transform='translate(0,0)';}));
          }
        }else{
          let origin=cur;
          const parentPos=p.parent_id?pos.get(p.parent_id):null;
          const oldParent=p.parent_id?oldState.get(p.parent_id):null;
          if(oldParent) origin=oldParent; else if(parentPos) origin=parentPos;
          el.style.transition='none';el.style.opacity='0';
          el.style.transform=`translate(${origin.x-cur.x}px,${origin.y-cur.y}px) scale(.92)`;
          requestAnimationFrame(()=>requestAnimationFrame(()=>{el.style.transition='';el.style.opacity='1';el.style.transform='translate(0,0) scale(1)';}));
        }
      }
    });

    if(animate) animateGhosts(oldState,pos,newIds);
  }

  function escapeHtml(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));}
  function transform(immediate=false){
    if(immediate||!effects||dragging){const old=world.style.transition;world.style.transition='none';world.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`;requestAnimationFrame(()=>world.style.transition=old||'');}
    else world.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`;
  }
  function resetView(){fitVisible();}
  function visibleBounds(){
    const {vis,pos}=layout(); if(!vis.length) return null;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    vis.forEach(p=>{
      const q=pos.get(p.id), w=(p.generation||0)===0?360:265, h=88;
      minX=Math.min(minX,q.x); minY=Math.min(minY,q.y);
      maxX=Math.max(maxX,q.x+w); maxY=Math.max(maxY,q.y+h);
    });
    return {minX,minY,maxX,maxY,bw:Math.max(1,maxX-minX),bh:Math.max(1,maxY-minY)};
  }
  function frameBounds(bounds,{pad=70,maxScale=1.12,minScale=.28,neverZoomIn=false}={}){
    if(!bounds) return;
    const vw=viewport.clientWidth, vh=viewport.clientHeight;
    let target=Math.max(minScale,Math.min(maxScale,(vw-pad*2)/bounds.bw,(vh-pad*2)/bounds.bh));
    if(neverZoomIn) target=Math.min(scale,target);
    scale=target;
    tx=(vw-bounds.bw*scale)/2-bounds.minX*scale;
    ty=(vh-bounds.bh*scale)/2-bounds.minY*scale;
    transform();
  }
  function fitVisible(){frameBounds(visibleBounds());}
  function smartFrameAfterToggle(closing){
    const bounds=visibleBounds(); if(!bounds) return;
    const mobile=viewport.clientWidth<=680;
    // Saat membuka, jangan memperbesar kamera: hanya mundur bila perlu lalu center.
    // Saat menutup, kamera boleh maju perlahan tetapi dibatasi agar tidak terlalu dekat.
    frameBounds(bounds,{
      pad:mobile?34:58,
      maxScale:mobile?.92:1.04,
      minScale:.28,
      neverZoomIn:!closing
    });
  }
  function focusRootIntro(){
    const roots=people.filter(p=>!p.parent_id); if(!roots.length) return;
    const {pos}=layout(), q=pos.get(roots[0].id); if(!q) return;
    scale=1; tx=viewport.clientWidth/2-(q.x+180); ty=Math.max(330,viewport.clientHeight*.63)-q.y; transform();
  }
  function showIntro(show){
    introVisible=!!show; const el=$('#introHero'); if(el) el.classList.toggle('show',introVisible);
  }
  function showProfile(p){$('#profileName').textContent=p.name;$('#profileSpouse').textContent=p.spouse?`Pasangan: ${p.spouse}`:'';$('#profileMeta').textContent=`Generasi ${p.generation||0}${p.branch?' • '+p.branch:''}${p.order?' • Anak ke-'+p.order:''}`;$('#profileNote').textContent=p.note||'';$('#profileModal').classList.add('show');}
  function revealAncestors(id){let p=people.find(x=>x.id===id);while(p?.parent_id){collapsed.delete(p.parent_id);p=people.find(x=>x.id===p.parent_id)}}
  function search(){showIntro(false);const q=$('#searchInput').value.trim().toLowerCase();document.querySelectorAll('.tree-node').forEach(n=>n.classList.remove('match'));if(q.length<2)return;const hit=people.find(p=>(p.name+' '+p.spouse).toLowerCase().includes(q));if(!hit)return;revealAncestors(hit.id);render(true);setTimeout(()=>{const el=document.querySelector(`[data-id="${CSS.escape(hit.id)}"]`);if(el){el.classList.add('match');const x=parseFloat(el.style.left),y=parseFloat(el.style.top);scale=1;tx=viewport.clientWidth/2-x-130;ty=viewport.clientHeight/2-y-50;transform();}},80);}

  viewport.addEventListener('wheel',e=>{e.preventDefault();const rect=viewport.getBoundingClientRect(),mx=e.clientX-rect.left,my=e.clientY-rect.top;const old=scale;scale=Math.min(2.2,Math.max(.28,scale*(e.deltaY<0?1.1:.9)));tx=mx-(mx-tx)*(scale/old);ty=my-(my-ty)*(scale/old);transform();},{passive:false});

  // Mobile/desktop pan + pinch zoom. Satu jari menggeser pohon; dua jari memperbesar/memperkecil.
  const pointers=new Map();
  let gesture='none', pinchStartDist=0, pinchStartScale=1, pinchWorldX=0, pinchWorldY=0;
  const localPoint=e=>{const r=viewport.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
  function finishGesture(){
    if(!pointers.size){dragging=false;gesture='none';viewport.classList.remove('dragging');world.style.transition='';setTimeout(()=>moved=false,40);return;}
    if(pointers.size===1){
      const a=[...pointers.values()][0]; gesture='pan'; dragging=true; downX=a.x;downY=a.y;sx=a.x-tx;sy=a.y-ty;
    }
  }
  viewport.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    if(e.target.closest('.toggle,.intro-hero button,input,select,textarea,a'))return;
    const p=localPoint(e); pointers.set(e.pointerId,p);
    try{viewport.setPointerCapture(e.pointerId)}catch(_){}
    dragging=true; viewport.classList.add('dragging'); world.style.transition='none';
    if(pointers.size===1){gesture='pan';moved=false;downX=p.x;downY=p.y;sx=p.x-tx;sy=p.y-ty;}
    else if(pointers.size>=2){
      const [a,b]=[...pointers.values()].slice(0,2),m=mid(a,b); gesture='pinch';moved=true;
      pinchStartDist=Math.max(20,dist(a,b)); pinchStartScale=scale;
      pinchWorldX=(m.x-tx)/scale; pinchWorldY=(m.y-ty)/scale;
    }
  });
  viewport.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;
    const p=localPoint(e); pointers.set(e.pointerId,p);
    if(pointers.size>=2){
      const [a,b]=[...pointers.values()].slice(0,2),m=mid(a,b);
      if(gesture!=='pinch'){gesture='pinch';pinchStartDist=Math.max(20,dist(a,b));pinchStartScale=scale;pinchWorldX=(m.x-tx)/scale;pinchWorldY=(m.y-ty)/scale;}
      const ns=Math.min(2.2,Math.max(.28,pinchStartScale*(dist(a,b)/pinchStartDist)));
      scale=ns;tx=m.x-pinchWorldX*scale;ty=m.y-pinchWorldY*scale;moved=true;transform(true);return;
    }
    if(gesture==='pan'&&dragging){
      if(Math.abs(p.x-downX)>4||Math.abs(p.y-downY)>4)moved=true;
      tx=p.x-sx;ty=p.y-sy;transform(true);
    }
  });
  const pointerEnd=e=>{pointers.delete(e.pointerId);finishGesture()};
  viewport.addEventListener('pointerup',pointerEnd);
  viewport.addEventListener('pointercancel',pointerEnd);
  viewport.addEventListener('lostpointercapture',e=>{if(pointers.has(e.pointerId)){pointers.delete(e.pointerId);finishGesture()}});

  $('#resetBtn').onclick=()=>{
    showIntro(false);
    collapsed.clear();
    lastToggleId=null;
    render(true);
    setTimeout(fitVisible,MOTION+120);
  };
  $('#openAllBtn').onclick=()=>{showIntro(false);collapsed.clear();lastToggleId=null;render(true);setTimeout(fitVisible,MOTION+120)};
  $('#closeAllBtn').onclick=()=>{people.filter(p=>childrenOf(p.id).length).forEach(p=>collapsed.add(p.id));lastToggleId=null;render(true);showIntro(true);setTimeout(focusRootIntro,120)};
  $('#effectBtn').onclick=e=>{effects=!effects;e.target.textContent=`⚡ EFEK: ${effects?'ON':'OFF'}`;document.body.classList.toggle('no-tree-effects',!effects)};
  $('#searchInput').addEventListener('input',search);$('#treeSelect').onchange=e=>loadTree(e.target.value);$('#legendToggle').onclick=()=>{$('#legend').style.display=$('#legend').style.display==='none'?'block':'none'};$('#closeModal').onclick=()=>$('#profileModal').classList.remove('show');$('#profileModal').onclick=e=>{if(e.target.id==='profileModal')e.currentTarget.classList.remove('show')};

  const startTree=()=>{showIntro(false);const roots=people.filter(p=>!p.parent_id);roots.forEach(r=>collapsed.delete(r.id));render(true);setTimeout(()=>{const root=roots[0];if(root){const el=document.querySelector(`[data-id="${CSS.escape(root.id)}"]`);if(el){const x=parseFloat(el.style.left),y=parseFloat(el.style.top);scale=.88;tx=viewport.clientWidth*.28-x*scale;ty=viewport.clientHeight/2-y*scale;transform();}}},MOTION*.35)};
  $('#introPhotoBtn')?.addEventListener('click',startTree); $('#introTap')?.addEventListener('click',startTree);

  const chatModal=$('#chatModal'), aboutModal=$('#aboutModal');
  const openM=m=>m?.classList.add('show'), closeM=m=>m?.classList.remove('show');
  $('#chatToggle')?.addEventListener('click',()=>{renderChat();openM(chatModal)}); $('#aboutToggle')?.addEventListener('click',()=>openM(aboutModal));
  $('#closeChat')?.addEventListener('click',()=>closeM(chatModal)); $('#closeAbout')?.addEventListener('click',()=>closeM(aboutModal));
  chatModal?.addEventListener('click',e=>{if(e.target===chatModal)closeM(chatModal)}); aboutModal?.addEventListener('click',e=>{if(e.target===aboutModal)closeM(aboutModal)});
  function getChat(){try{return JSON.parse(localStorage.getItem('silsilah_chat')||'[]')}catch{return[]}}
  function renderChat(){const list=$('#chatList');if(!list)return;const msgs=getChat();list.innerHTML=msgs.length?msgs.slice(-20).reverse().map(m=>`<div class="chat-msg"><strong>${escapeHtml(m.name)}</strong><small>${escapeHtml(m.time)}</small><p>${escapeHtml(m.text)}</p></div>`).join(''):'<div class="chat-empty">Belum ada pesan di perangkat ini.</div>';}
  $('#chatForm')?.addEventListener('submit',e=>{e.preventDefault();const name=$('#chatName').value.trim(),text=$('#chatMessage').value.trim();if(!name||!text)return;const msgs=getChat();msgs.push({name,text,time:new Date().toLocaleString('id-ID')});localStorage.setItem('silsilah_chat',JSON.stringify(msgs.slice(-50)));$('#chatMessage').value='';renderChat();});
  loadTree(treeKey);
})();
