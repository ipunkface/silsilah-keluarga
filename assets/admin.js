(() => {
  const $=s=>document.querySelector(s), cfg=window.SUPABASE_CONFIG||{};
  let token=localStorage.getItem('silsilah_access_token')||'', rows=[];
  const ready=!!(cfg.url&&cfg.anonKey);
  if(ready) $('#setupNotice').classList.add('hidden');
  else {$('#loginBtn').disabled=true;$('#loginMsg').textContent='Konfigurasi Supabase terlebih dahulu.';return;}

  async function request(path,{method='GET',body=null,auth=true,headers={}}={}){
    const h={apikey:cfg.anonKey,...headers};
    if(auth) h.Authorization=`Bearer ${token||cfg.anonKey}`;
    if(body!==null) h['Content-Type']='application/json';
    let res;
    try{res=await fetch(cfg.url+path,{method,headers:h,body:body!==null?JSON.stringify(body):undefined});}
    catch(e){throw new Error('Tidak dapat terhubung ke Supabase. Periksa internet dan Project URL.');}
    const text=await res.text(); let data=null;
    if(text){try{data=JSON.parse(text)}catch(e){throw new Error(`Supabase mengembalikan respons bukan JSON (HTTP ${res.status}). Periksa Project URL / key.`)}}
    if(!res.ok){throw new Error(data?.msg||data?.message||data?.error_description||data?.error||`HTTP ${res.status}`)}
    return data;
  }

  async function login(email,password){
    return request('/auth/v1/token?grant_type=password',{method:'POST',auth:false,body:{email,password},headers:{Authorization:`Bearer ${cfg.anonKey}`}});
  }
  async function verifyAdmin(){
    const data=await request('/rest/v1/admin_users?select=user_id&limit=1');
    if(!Array.isArray(data)||!data.length) throw new Error('Akun ini belum terdaftar sebagai admin pada tabel admin_users.');
  }
  async function boot(){
    if(!token) return;
    try{await verifyAdmin();showAdmin();}catch(e){localStorage.removeItem('silsilah_access_token');token='';}
  }
  $('#loginBtn').onclick=async()=>{
    const email=$('#email').value.trim(),password=$('#password').value;$('#loginMsg').textContent='Memeriksa...';
    try{const data=await login(email,password);token=data.access_token;localStorage.setItem('silsilah_access_token',token);await verifyAdmin();$('#loginMsg').textContent='';showAdmin();}
    catch(e){localStorage.removeItem('silsilah_access_token');token='';$('#loginMsg').textContent=e.message;}
  };
  $('#logoutBtn').onclick=()=>{localStorage.removeItem('silsilah_access_token');location.reload()};
  async function showAdmin(){$('#loginPanel').classList.add('hidden');$('#adminPanel').classList.remove('hidden');await loadRows();}
  async function loadRows(){
    try{rows=await request('/rest/v1/people?select=*&order=tree_key.asc,generation.asc,child_order.asc.nullslast,id.asc');renderList();fillParents();}
    catch(e){alert(e.message);}
  }
  function fillParents(){const key=$('#treeKey').value, current=$('#rowId').value;$('#parent').innerHTML='<option value="">— Tidak ada / root —</option>'+rows.filter(r=>r.tree_key===key&&String(r.id)!==current).map(r=>`<option value="${attr(r.legacy_id||r.id)}">${esc(r.name)}${r.spouse?' & '+esc(r.spouse):''}</option>`).join('')}
  function renderList(){const q=$('#adminSearch').value.trim().toLowerCase();$('#memberList').innerHTML=rows.filter(r=>(r.name+' '+(r.spouse||'')).toLowerCase().includes(q)).map(r=>`<div class="member-item"><div><strong>${esc(r.name)}</strong><small>${esc(r.spouse||'')} • ${esc(r.tree_key)} • Gen ${r.generation??0}${r.is_public?'':' • PRIVAT'}</small></div><div class="buttons"><button data-edit="${r.id}">Edit</button><button data-del="${r.id}" class="danger">Hapus</button></div></div>`).join('');document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editRow(b.dataset.edit));document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>deleteRow(b.dataset.del));}
  function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
  function attr(s){return esc(s).replace(/'/g,'&#39;')}
  function editRow(id){const r=rows.find(x=>String(x.id)===String(id));if(!r)return;$('#formTitle').textContent='Edit Anggota';$('#rowId').value=r.id;$('#treeKey').value=r.tree_key;$('#name').value=r.name||'';$('#spouse').value=r.spouse||'';$('#childOrder').value=r.child_order??'';$('#generation').value=r.generation??0;$('#branch').value=r.branch||'';$('#note').value=r.note||'';$('#isPublic').checked=!!r.is_public;fillParents();$('#parent').value=r.parent_legacy_id||'';window.scrollTo({top:0,behavior:'smooth'});}
  async function deleteRow(id){if(!confirm('Hapus anggota ini? Data anak yang masih merujuk ke anggota ini harus diperbaiki terlebih dahulu.'))return;try{await request(`/rest/v1/people?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});await loadRows();}catch(e){alert(e.message)}}
  $('#memberForm').onsubmit=async e=>{e.preventDefault();const id=$('#rowId').value;const tree=$('#treeKey').value;const legacy=id?(rows.find(x=>String(x.id)===String(id))?.legacy_id):('u'+Date.now());const payload={tree_key:tree,legacy_id:legacy,name:$('#name').value.trim(),spouse:$('#spouse').value.trim()||null,parent_legacy_id:$('#parent').value||null,child_order:$('#childOrder').value?Number($('#childOrder').value):null,generation:Number($('#generation').value||0),branch:$('#branch').value.trim()||null,note:$('#note').value.trim()||null,is_public:$('#isPublic').checked};try{if(id)await request(`/rest/v1/people?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:payload,headers:{Prefer:'return=minimal'}});else await request('/rest/v1/people',{method:'POST',body:payload,headers:{Prefer:'return=minimal'}});resetForm();await loadRows();}catch(e){alert(e.message)}};
  function resetForm(){$('#memberForm').reset();$('#rowId').value='';$('#formTitle').textContent='Tambah Anggota';$('#isPublic').checked=true;fillParents()}
  $('#cancelBtn').onclick=resetForm;$('#treeKey').onchange=fillParents;$('#adminSearch').oninput=renderList;
  boot();
})();
