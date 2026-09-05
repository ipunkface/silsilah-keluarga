(() => {
  const $=s=>document.querySelector(s), cfg=window.SUPABASE_CONFIG||{};
  let token=localStorage.getItem('silsilah_access_token')||'', rows=[], spouseRows=[], spouseSchemaReady=true;
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
    if(!res.ok){const err=new Error(data?.msg||data?.message||data?.error_description||data?.error||`HTTP ${res.status}`);err.status=res.status;throw err;}
    return data;
  }

  async function login(email,password){
    return request('/auth/v1/token?grant_type=password',{method:'POST',auth:false,body:{email,password},headers:{Authorization:`Bearer ${cfg.anonKey}`}});
  }
  async function verifyAdmin(){
    const data=await request('/rest/v1/admin_users?select=user_id&limit=1');
    if(!Array.isArray(data)||!data.length) throw new Error('Akun ini belum terdaftar sebagai admin pada tabel admin_users.');
  }
  async function boot(){if(!token)return;try{await verifyAdmin();showAdmin();}catch(e){localStorage.removeItem('silsilah_access_token');token='';}}

  $('#loginBtn').onclick=async()=>{
    const email=$('#email').value.trim(),password=$('#password').value;$('#loginMsg').textContent='Memeriksa...';
    try{const data=await login(email,password);token=data.access_token;localStorage.setItem('silsilah_access_token',token);await verifyAdmin();$('#loginMsg').textContent='';showAdmin();}
    catch(e){localStorage.removeItem('silsilah_access_token');token='';$('#loginMsg').textContent=e.message;}
  };
  $('#logoutBtn').onclick=()=>{localStorage.removeItem('silsilah_access_token');location.reload()};
  async function showAdmin(){$('#loginPanel').classList.add('hidden');$('#adminPanel').classList.remove('hidden');await loadRows();}

  async function loadRows(){
    try{
      rows=await request('/rest/v1/people?select=*&order=tree_key.asc,generation.asc,child_order.asc.nullslast,id.asc');
      try{
        spouseRows=await request('/rest/v1/spouses?select=*&order=person_id.asc,spouse_order.asc,id.asc');
        spouseSchemaReady=true;$('#multiSpouseNotice').classList.add('hidden');
      }catch(e){
        spouseRows=[];spouseSchemaReady=false;
        const n=$('#multiSpouseNotice');n.classList.remove('hidden');n.innerHTML='<strong>Fitur multi-pasangan belum aktif di database.</strong><br>Jalankan file <code>supabase-migration-v2.6-multi-pasangan.sql</code> sekali di Supabase → SQL Editor, lalu refresh halaman ini.';
      }
      renderList();fillParents();renderSpouseEditor(currentRow()?.id||null);fillParentSpouses();
    }catch(e){alert(e.message);}
  }

  const currentRow=()=>rows.find(x=>String(x.id)===String($('#rowId').value));
  const spousesFor=id=>spouseRows.filter(s=>String(s.person_id)===String(id)).sort((a,b)=>(a.spouse_order??999)-(b.spouse_order??999)||a.id-b.id);
  function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
  function attr(s){return esc(s).replace(/'/g,'&#39;')}

  function fillParents(){
    const key=$('#treeKey').value,current=$('#rowId').value;
    $('#parent').innerHTML='<option value="">— Tidak ada / root —</option>'+rows.filter(r=>r.tree_key===key&&String(r.id)!==current).map(r=>{
      const sc=spousesFor(r.id).length;return `<option value="${attr(r.legacy_id||r.id)}">${esc(r.name)}${sc>1?` (${sc} pasangan)`:''}</option>`;
    }).join('');
  }

  function fillParentSpouses(selectedValue){
    const parentLegacy=$('#parent').value;
    const parent=rows.find(r=>r.tree_key===$('#treeKey').value&&String(r.legacy_id||r.id)===String(parentLegacy));
    const list=parent?spousesFor(parent.id):[];
    const sel=$('#parentSpouse');
    sel.innerHTML='<option value="">— Belum ditentukan —</option>'+list.map(s=>`<option value="${s.id}">${esc(s.role_label||('Pasangan ke-'+s.spouse_order))}: ${esc(s.spouse_name)}</option>`).join('');
    sel.disabled=!parent||!list.length||!spouseSchemaReady;
    $('#parentSpouseHelp').textContent=!parent?'Pilih orang tua terlebih dahulu.':!spouseSchemaReady?'Jalankan migrasi V2.6 terlebih dahulu.':list.length>1?'Orang tua ini memiliki beberapa pasangan. Pilih pasangan yang merupakan ibu/ayah kandung anak ini.':list.length===1?'Satu pasangan ditemukan. Anda dapat memilihnya untuk memperjelas jalur keturunan.':'Orang tua ini belum memiliki data pasangan.';
    if(selectedValue!=null) sel.value=String(selectedValue||'');
  }

  function parseLegacySpouses(r){
    if(!r?.spouse)return[];
    return String(r.spouse).split(/\s*•\s*/).filter(Boolean).map((name,i)=>({id:'',spouse_name:name,spouse_order:i+1,role_label:(String(r.spouse).includes('•')?`Pasangan ke-${i+1}`:'Pasangan')}));
  }
  function renderSpouseEditor(personId){
    const box=$('#spouseEditor');
    let list=personId?spousesFor(personId):[];
    if(!list.length&&personId){const r=rows.find(x=>String(x.id)===String(personId));if(r?.spouse)list=parseLegacySpouses(r);}
    box.innerHTML='';
    list.forEach(s=>addSpouseEditorRow(s));
    if(!list.length) box.innerHTML='<div class="spouse-empty">Belum ada pasangan. Klik <b>+ Tambah Pasangan</b> jika diperlukan.</div>';
  }
  function addSpouseEditorRow(s={}){
    const box=$('#spouseEditor');box.querySelector('.spouse-empty')?.remove();
    const existing=[...box.querySelectorAll('.spouse-edit-row')];
    const order=Number(s.spouse_order||existing.length+1);
    const row=document.createElement('div');row.className='spouse-edit-row';row.dataset.spouseId=s.id||'';
    row.innerHTML=`
      <label>Urutan<input class="sp-order" type="number" min="1" value="${order}"></label>
      <label>Sebutan<input class="sp-role" placeholder="Istri ke-${order}" value="${attr(s.role_label||'')}"></label>
      <label class="sp-name-wrap">Nama pasangan<input class="sp-name" placeholder="Nama pasangan" value="${attr(s.spouse_name||'')}"></label>
      <button type="button" class="danger sp-remove" title="Hapus pasangan">×</button>`;
    row.querySelector('.sp-order').addEventListener('input',e=>{const role=row.querySelector('.sp-role');if(!role.value.trim()||/^Pasangan ke-\d+$|^Istri ke-\d+$|^Suami ke-\d+$/i.test(role.value.trim()))role.value=`Pasangan ke-${e.target.value||1}`;});
    row.querySelector('.sp-remove').onclick=()=>{row.remove();if(!box.querySelector('.spouse-edit-row'))box.innerHTML='<div class="spouse-empty">Belum ada pasangan. Klik <b>+ Tambah Pasangan</b> jika diperlukan.</div>';};
    box.appendChild(row);
  }
  $('#addSpouseBtn').onclick=()=>addSpouseEditorRow({});

  function editorSpouses(){
    const out=[...document.querySelectorAll('.spouse-edit-row')].map((el,i)=>({
      id:el.dataset.spouseId||'',
      spouse_order:Number(el.querySelector('.sp-order').value||i+1),
      role_label:el.querySelector('.sp-role').value.trim()||`Pasangan ke-${Number(el.querySelector('.sp-order').value||i+1)}`,
      spouse_name:el.querySelector('.sp-name').value.trim()
    })).filter(x=>x.spouse_name);
    const orders=out.map(x=>x.spouse_order);if(new Set(orders).size!==orders.length)throw new Error('Urutan pasangan tidak boleh sama. Gunakan 1, 2, 3, dan seterusnya.');
    return out.sort((a,b)=>a.spouse_order-b.spouse_order);
  }

  function renderList(){
    const q=$('#adminSearch').value.trim().toLowerCase();
    $('#memberList').innerHTML=rows.filter(r=>{
      const s=spousesFor(r.id).map(x=>x.spouse_name).join(' ');return (r.name+' '+(r.spouse||'')+' '+s).toLowerCase().includes(q);
    }).map(r=>{
      const ss=spousesFor(r.id), parent=rows.find(x=>x.tree_key===r.tree_key&&x.legacy_id===r.parent_legacy_id), parentSs=parent?spousesFor(parent.id):[];
      const via=r.parent_spouse_id?spouseRows.find(s=>String(s.id)===String(r.parent_spouse_id)):null;
      const warning=parentSs.length>1&&!via?' <span class="route-warning">⚠ jalur pasangan belum dipilih</span>':'';
      const spText=ss.length?ss.map(s=>`${s.role_label||'Pasangan'}: ${s.spouse_name}`).join(' • '):(r.spouse||'');
      return `<div class="member-item"><div><strong>${esc(r.name)}</strong><small>${esc(spText)} • ${esc(r.tree_key)} • Gen ${r.generation??0}${via?` • dari ${esc(via.role_label||'pasangan')}: ${esc(via.spouse_name)}`:''}${r.is_public?'':' • PRIVAT'}${warning}</small></div><div class="buttons"><button data-edit="${r.id}">Edit</button><button data-del="${r.id}" class="danger">Hapus</button></div></div>`;
    }).join('');
    document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editRow(b.dataset.edit));
    document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>deleteRow(b.dataset.del));
  }

  function editRow(id){
    const r=rows.find(x=>String(x.id)===String(id));if(!r)return;
    $('#formTitle').textContent='Edit Anggota';$('#rowId').value=r.id;$('#treeKey').value=r.tree_key;$('#name').value=r.name||'';$('#childOrder').value=r.child_order??'';$('#generation').value=r.generation??0;$('#branch').value=r.branch||'';$('#note').value=r.note||'';$('#isPublic').checked=!!r.is_public;
    fillParents();$('#parent').value=r.parent_legacy_id||'';renderSpouseEditor(r.id);fillParentSpouses(r.parent_spouse_id||'');window.scrollTo({top:0,behavior:'smooth'});
  }

  async function deleteRow(id){
    if(!confirm('Hapus anggota ini? Data pasangan miliknya ikut terhapus. Anak yang masih merujuk ke pasangan tersebut akan menjadi “jalur belum ditentukan”.'))return;
    try{await request(`/rest/v1/people?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});await loadRows();resetForm();}catch(e){alert(e.message)}
  }

  async function syncSpouses(personId,tree,desired){
    if(!spouseSchemaReady)return;
    const original=spousesFor(personId),keep=new Set();
    for(const sp of desired){
      const payload={person_id:Number(personId),tree_key:tree,spouse_name:sp.spouse_name,spouse_order:sp.spouse_order,role_label:sp.role_label,is_public:$('#isPublic').checked};
      if(sp.id&&/^\d+$/.test(String(sp.id))){
        keep.add(String(sp.id));await request(`/rest/v1/spouses?id=eq.${encodeURIComponent(sp.id)}`,{method:'PATCH',body:payload,headers:{Prefer:'return=minimal'}});
      }else{
        const created=await request('/rest/v1/spouses',{method:'POST',body:payload,headers:{Prefer:'return=representation'}});if(created?.[0]?.id)keep.add(String(created[0].id));
      }
    }
    for(const old of original){if(!keep.has(String(old.id)))await request(`/rest/v1/spouses?id=eq.${encodeURIComponent(old.id)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});}
  }

  $('#memberForm').onsubmit=async e=>{
    e.preventDefault();
    try{
      const desired=editorSpouses();
      const id=$('#rowId').value,tree=$('#treeKey').value;
      const legacy=id?(rows.find(x=>String(x.id)===String(id))?.legacy_id):('u'+Date.now());
      const payload={tree_key:tree,legacy_id:legacy,name:$('#name').value.trim(),spouse:desired.map(x=>x.spouse_name).join(' • ')||null,parent_legacy_id:$('#parent').value||null,child_order:$('#childOrder').value?Number($('#childOrder').value):null,generation:Number($('#generation').value||0),branch:$('#branch').value.trim()||null,note:$('#note').value.trim()||null,is_public:$('#isPublic').checked};
      if(spouseSchemaReady) payload.parent_spouse_id=$('#parentSpouse').value?Number($('#parentSpouse').value):null;
      let personId=id;
      if(id) await request(`/rest/v1/people?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:payload,headers:{Prefer:'return=minimal'}});
      else {const created=await request('/rest/v1/people',{method:'POST',body:payload,headers:{Prefer:'return=representation'}});personId=created?.[0]?.id;if(!personId)throw new Error('Anggota tersimpan tetapi ID tidak dikembalikan Supabase. Refresh lalu coba edit kembali.');}
      await syncSpouses(personId,tree,desired);
      resetForm();await loadRows();
      alert('Data berhasil disimpan.');
    }catch(e){alert(e.message)}
  };

  function resetForm(){
    $('#memberForm').reset();$('#rowId').value='';$('#formTitle').textContent='Tambah Anggota';$('#isPublic').checked=true;renderSpouseEditor(null);fillParents();fillParentSpouses('');
  }
  $('#cancelBtn').onclick=resetForm;
  $('#treeKey').onchange=()=>{fillParents();fillParentSpouses('')};
  $('#parent').onchange=()=>fillParentSpouses('');
  $('#adminSearch').oninput=renderList;
  boot();
})();
