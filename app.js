(() => {
  "use strict";
  const KEY = "meuTorneio.data.v1";
  const $ = (id) => document.getElementById(id);
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const seed = () => {
    const c = {id:uid(),name:"Campeonato Exemplo",season:"2026",groups:[],matches:[]};
    ["Grupo A","Grupo B"].forEach((name, gi) => c.groups.push({id:uid(),name,teams:Array.from({length:4},(_,i)=>({id:uid(),name:`Time ${gi*4+i+1}`,image:""}))}));
    return {championships:[c],selected:c.id};
  };
  let db = load();
  let activeView = "overview";
  let modalAction = null;
  function load(){try{const x=JSON.parse(localStorage.getItem(KEY));if(x&&Array.isArray(x.championships)&&x.championships.length)return x;}catch(e){}return seed();}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(db));}catch(e){toast("Não foi possível salvar. A imagem pode ser grande demais; use uma imagem menor.","error");}}
  function current(){return db.championships.find(c=>c.id===db.selected)||db.championships[0];}
  function allTeams(c=current()){return c.groups.flatMap(g=>g.teams.map(t=>({...t,groupId:g.id,groupName:g.name})));}
  function stats(c=current()){const ms=c.matches.filter(m=>m.played);return {groups:c.groups.length,teams:allTeams(c).length,played:ms.length};}
  function standings(group,c=current()){
    const rows=group.teams.map(t=>({team:t,pts:0,j:0,v:0,e:0,d:0,gp:0,gc:0,sg:0}));
    const map=new Map(rows.map(r=>[r.team.id,r]));
    c.matches.filter(m=>m.played&&m.groupId===group.id).forEach(m=>{
      const h=map.get(m.homeId),a=map.get(m.awayId);if(!h||!a||m.homeId===m.awayId)return;
      const hg=Number(m.homeScore),ag=Number(m.awayScore);
      h.j++;a.j++;h.gp+=hg;h.gc+=ag;a.gp+=ag;a.gc+=hg;
      if(hg>ag){h.v++;h.pts+=3;a.d++;}else if(hg<ag){a.v++;a.pts+=3;h.d++;}else{h.e++;a.e++;h.pts++;a.pts++;}
    });
    rows.forEach(r=>r.sg=r.gp-r.gc);
    return rows.sort((a,b)=>b.pts-a.pts||b.sg-a.sg||b.gp-a.gp||b.v-a.v||a.team.name.localeCompare(b.team.name,"pt-BR"));
  }
  function crest(team){return team.image?`<img class="crest" src="${esc(team.image)}" alt="" onerror="this.outerHTML='&lt;span class=&quot;crest&quot;&gt;⚽&lt;/span&gt;'">`:`<span class="crest">⚽</span>`;}
  function standingsTable(group,c=current(),compact=false){
    const rows=standings(group,c);
    if(!rows.length)return '<div class="empty">Nenhum time neste grupo.</div>';
    return `<div class="table-scroll"><table><thead><tr><th>#</th><th>Time</th><th>PTS</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td><div class="team-cell">${crest(r.team)}<span class="team-name">${esc(r.team.name)}</span></div></td><td class="${i===0?'standings-highlight':''}">${r.pts}</td><td>${r.j}</td><td>${r.v}</td><td>${r.e}</td><td>${r.d}</td><td>${r.gp}</td><td>${r.gc}</td><td>${r.sg>0?"+":""}${r.sg}</td></tr>`).join("")}</tbody></table></div>${compact?`<div class="table-footer"><span>${rows.length} times · ${c.matches.filter(m=>m.played&&m.groupId===group.id).length} jogos concluídos</span><button data-go="standings">Ver classificação →</button></div>`:""}`;
  }
  function groupCard(g,c=current(),manage=false){
    return `<article class="group-card"><div class="group-card-head"><div class="group-title"><span class="group-symbol">♟</span>${esc(g.name)}</div>${manage?`<div class="small-actions"><button class="icon-button" data-action="edit-group" data-id="${g.id}" title="Renomear grupo">✎</button><button class="icon-button danger" data-action="delete-group" data-id="${g.id}" title="Excluir grupo">⌫</button></div>`:""}</div>${standingsTable(g,c,true)}${manage?`<div class="group-manage"><button class="button button-ghost" data-action="add-team" data-id="${g.id}">＋ Adicionar time</button>${g.teams.map(t=>`<button class="icon-button" data-action="edit-team" data-group="${g.id}" data-id="${t.id}" title="Editar ${esc(t.name)}">✎ ${esc(t.name)}</button>`).join("")}</div>`:""}</article>`;
  }
  function matchCard(m,c=current()){
    const teams=allTeams(c),home=teams.find(t=>t.id===m.homeId),away=teams.find(t=>t.id===m.awayId),g=c.groups.find(g=>g.id===m.groupId);
    if(!home||!away)return "";
    return `<article class="match-card"><div class="match-team">${crest(home)}<span>${esc(home.name)}</span></div><div><div class="score">${m.played?`${m.homeScore} – ${m.awayScore}`:"vs"}</div><div class="match-meta">${esc(g?.name||"Grupo")}${m.date?` · ${esc(m.date)}`:""} · ${m.played?"Concluída":"A jogar"}</div></div><div class="match-team">${crest(away)}<span>${esc(away.name)}</span></div><div class="match-actions admin-only"><button class="icon-button" data-action="edit-match" data-id="${m.id}">✎ Placar</button><button class="icon-button danger" data-action="delete-match" data-id="${m.id}">⌫</button></div></article>`;
  }
  function render(){
    const c=current();if(!c)return;
    $("championshipSelect").innerHTML=db.championships.map(x=>`<option value="${x.id}" ${x.id===c.id?"selected":""}>${esc(x.name)}${x.season?` (${esc(x.season)})`:""}</option>`).join("");
    const s=stats(c);$("statChampionships").textContent=db.championships.length;$("statGroups").textContent=s.groups;$("statTeams").textContent=s.teams;$("statPlayed").textContent=s.played;
    $("overviewGroups").innerHTML=c.groups.length?c.groups.map(g=>groupCard(g,c)).join(""):'<div class="panel empty">Nenhum grupo ainda. Ative a administração e crie o primeiro grupo.</div>';
    $("groupsList").innerHTML=c.groups.length?c.groups.map(g=>groupCard(g,c,true)).join(""):'<div class="panel empty">Nenhum grupo cadastrado.</div>';
    $("standingsList").innerHTML=c.groups.length?c.groups.map(g=>groupCard(g,c)).join(""):'<div class="panel empty">Crie um grupo para ver a classificação.</div>';
    const gf=$("matchGroupFilter").value||"all";
    $("matchGroupFilter").innerHTML='<option value="all">Todos os grupos</option>'+c.groups.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join("");
    $("matchGroupFilter").value=c.groups.some(g=>g.id===gf)?gf:"all";
    const sf=$("matchStatusFilter").value||"all";
    const filtered=c.matches.filter(m=>( $("matchGroupFilter").value==="all"||m.groupId===$("matchGroupFilter").value)&&(sf==="all"||(sf==="played"?m.played:!m.played)));
    $("matchesList").innerHTML=filtered.length?filtered.map(m=>matchCard(m,c)).join(""):'<div class="panel empty">Nenhuma partida para mostrar. Crie uma partida para começar.</div>';
    const upcoming=c.matches.filter(m=>!m.played).slice(0,4);
    $("upcomingMatches").innerHTML=upcoming.length?`<div class="match-list" style="padding:10px">${upcoming.map(m=>matchCard(m,c)).join("")}</div>`:'<div class="empty">Nenhuma partida pendente cadastrada.</div>';
    document.querySelectorAll(".admin-only").forEach(el=>el.classList.toggle("hidden",!admin));
    $("adminWarning").classList.toggle("hidden",!admin);
  }
  let admin=false;
  function toast(msg,type=""){const el=$("toast");el.textContent=msg;el.className="toast"+(type?" "+type:"");el.classList.remove("hidden");setTimeout(()=>el.classList.add("hidden"),3500);}
  function go(view){activeView=view;document.querySelectorAll(".view").forEach(v=>v.classList.toggle("hidden",v.id!==`view-${view}`));document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));}
  function field(label,name,value="",type="text",extra=""){return `<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;}
  function selectField(label,name,options,value){return `<label class="field">${label}<select name="${name}" required>${options.map(o=>`<option value="${esc(o.value)}" ${o.value===value?"selected":""}>${esc(o.label)}</option>`).join("")}</select></label>`;}
  function openModal(title,fields,action){modalAction=action;$("modalTitle").textContent=title;$("modalFields").innerHTML=fields;$("modal").showModal();}
  function requireAdmin(){if(!admin){toast("Clique em Administrar para habilitar as edições nesta sessão.","error");return false;}return true;}
  function createChamp(){openModal("Novo campeonato",field("Nome do campeonato","name","","text",'required maxlength="70"')+field("Temporada / ano (opcional)","season",new Date().getFullYear(),"text",'maxlength="20"'),d=>{const c={id:uid(),name:d.get("name").trim(),season:d.get("season").trim(),groups:[],matches:[]};db.championships.push(c);db.selected=c.id;save();render();toast("Campeonato criado.");});}
  function createGroup(){const c=current();openModal("Criar grupo",field("Nome do grupo","name",`Grupo ${String.fromCharCode(65+c.groups.length%26)}`,"text",'required maxlength="60"'),d=>{c.groups.push({id:uid(),name:d.get("name").trim(),teams:[]});save();render();toast("Grupo criado.");});}
  function editGroup(id){const c=current(),g=c.groups.find(x=>x.id===id);if(!g)return;openModal("Renomear grupo",field("Nome do grupo","name",g.name,"text",'required maxlength="60"'),d=>{g.name=d.get("name").trim();save();render();});}
  function addTeam(gid){const c=current(),g=c.groups.find(x=>x.id===gid);if(!g)return;openModal("Adicionar time",field("Nome do time","name","","text",'required maxlength="70"')+field("Imagem / escudo (URL opcional)","image","","url",'placeholder="https://..."')+`<label class="field">Ou envie uma imagem do dispositivo<input name="file" type="file" accept="image/*"><small>Prefira imagem quadrada JPG, PNG ou WebP com menos de 500 KB.</small></label>`,d=>readImage(d.get("file")).then(image=>{g.teams.push({id:uid(),name:d.get("name").trim(),image:image||d.get("image").trim()});save();render();toast("Time adicionado.");}).catch(e=>toast(e.message,"error")));}
  function editTeam(gid,tid){const c=current(),g=c.groups.find(x=>x.id===gid),t=g?.teams.find(x=>x.id===tid);if(!t)return;openModal("Editar time",field("Nome do time","name",t.name,"text",'required maxlength="70"')+field("Imagem / escudo (URL opcional)","image",t.image.startsWith("data:")?"":t.image,"url",'placeholder="https://..."')+`<label class="field">Trocar imagem<input name="file" type="file" accept="image/*"><small>Se enviar um arquivo, ele substitui a URL. Imagens ficam neste navegador e no backup exportado.</small></label><label class="field"><span><input name="clearImage" type="checkbox" style="width:auto"> Remover imagem atual</span></label>`,d=>readImage(d.get("file")).then(image=>{t.name=d.get("name").trim();t.image=d.get("clearImage")?"":image||d.get("image").trim()||t.image;save();render();toast("Time atualizado.");}).catch(e=>toast(e.message,"error")));}
  function readImage(file){return new Promise((resolve,reject)=>{if(!file||!file.size)return resolve("");if(file.size>1_000_000)return reject(new Error("Imagem maior que 1 MB. Reduza o arquivo e tente novamente."));const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error("Não foi possível ler a imagem."));r.readAsDataURL(file);});}
  function createMatch(){const c=current(),teams=allTeams(c);if(c.groups.length===0||teams.length<2){toast("Crie um grupo e cadastre pelo menos dois times antes.","error");return;}const groupOpts=c.groups.map(g=>({value:g.id,label:g.name}));let gid=c.groups[0].id;const teamOpts=()=>allTeams(c).filter(t=>t.groupId===gid).map(t=>({value:t.id,label:t.name}));openModal("Nova partida",selectField("Grupo","groupId",groupOpts,gid)+selectField("Time da casa","homeId",teamOpts(),teamOpts()[0]?.value)+selectField("Time visitante","awayId",teamOpts(),teamOpts()[1]?.value)+field("Data (opcional)","date","","date"),d=>{const group=c.groups.find(g=>g.id===d.get("groupId"));if(d.get("homeId")===d.get("awayId"))throw new Error("Escolha dois times diferentes.");if(!group?.teams.some(t=>t.id===d.get("homeId"))||!group?.teams.some(t=>t.id===d.get("awayId")))throw new Error("Os dois times devem pertencer ao grupo selecionado.");c.matches.push({id:uid(),groupId:d.get("groupId"),homeId:d.get("homeId"),awayId:d.get("awayId"),date:d.get("date"),played:false,homeScore:"",awayScore:""});save();render();toast("Partida cadastrada.");});const groupSelect=$("modalFields").querySelector('[name="groupId"]');groupSelect.addEventListener("change",()=>{const id=groupSelect.value,g=c.groups.find(x=>x.id===id),opts=(g?.teams||[]).map(t=>({value:t.id,label:t.name}));["homeId","awayId"].forEach((n,i)=>{const el=$("modalFields").querySelector(`[name="${n}"]`);el.innerHTML=opts.map((o,j)=>`<option value="${esc(o.value)}" ${j===i?"selected":""}>${esc(o.label)}</option>`).join("");});});}
  function editMatch(id){const c=current(),m=c.matches.find(x=>x.id===id);if(!m)return;openModal("Registrar placar",`<p class="muted">Informe os gols de cada time. A classificação será recalculada automaticamente.</p>${field("Gols do time da casa","homeScore",m.homeScore,"number",'required min="0" max="99" step="1"')}${field("Gols do time visitante","awayScore",m.awayScore,"number",'required min="0" max="99" step="1"')}<label class="field"><span><input name="played" type="checkbox" style="width:auto" ${m.played?"checked":""}> Marcar partida como concluída</span></label>`,d=>{const h=Number(d.get("homeScore")),a=Number(d.get("awayScore"));if(!Number.isInteger(h)||!Number.isInteger(a)||h<0||a<0||h>99||a>99)throw new Error("Informe placares inteiros entre 0 e 99.");m.homeScore=h;m.awayScore=a;m.played=d.get("played")==="on";save();render();toast("Placar salvo e classificação atualizada.");});}
  function deleteGroup(id){const c=current(),g=c.groups.find(x=>x.id===id);if(!g||!confirm(`Excluir "${g.name}", seus times e partidas?`))return;const tids=new Set(g.teams.map(t=>t.id));c.groups=c.groups.filter(x=>x.id!==id);c.matches=c.matches.filter(m=>m.groupId!==id&&!tids.has(m.homeId)&&!tids.has(m.awayId));save();render();}
  function deleteMatch(id){const c=current();if(!confirm("Excluir esta partida?"))return;c.matches=c.matches.filter(m=>m.id!==id);save();render();}
  function exportData(){const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="meu-torneio-backup.json";a.click();URL.revokeObjectURL(url);toast("Backup exportado.");}
  function importData(file){if(!file)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x||!Array.isArray(x.championships)||!x.championships.every(c=>c.id&&c.name&&Array.isArray(c.groups)&&Array.isArray(c.matches)))throw new Error();db=x;if(!current())db.selected=db.championships[0]?.id;save();render();toast("Backup importado.");}catch(e){toast("Arquivo inválido ou incompatível.","error");}};r.readAsText(file);}
  $("adminToggle").addEventListener("click",()=>{admin=!admin;$("adminToggle").textContent=admin?"✓ Sair da administração":"⚙ Administrar";$("modeBadge").textContent=admin?"Edição habilitada":"Modo local";render();toast(admin?"Edição habilitada neste navegador. Isto não é uma proteção por senha.":"Edição desabilitada nesta sessão.");});
  $("championshipSelect").addEventListener("change",e=>{db.selected=e.target.value;render();});
  $("newChampionship").addEventListener("click",()=>requireAdmin()&&createChamp());
  $("newGroup").addEventListener("click",()=>requireAdmin()&&createGroup());
  $("newMatch").addEventListener("click",()=>requireAdmin()&&createMatch());
  $("exportData").addEventListener("click",()=>requireAdmin()&&exportData());
  $("importData").addEventListener("change",e=>{if(requireAdmin())importData(e.target.files[0]);e.target.value="";});
  $("matchGroupFilter").addEventListener("change",render);$("matchStatusFilter").addEventListener("change",render);
  document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>go(b.dataset.view)));
  document.addEventListener("click",e=>{
    const nav=e.target.closest("[data-go]");if(nav){go(nav.dataset.go);return;}
    const b=e.target.closest("[data-action]");if(!b)return;if(!requireAdmin())return;
    const id=b.dataset.id;
    try{switch(b.dataset.action){case"edit-group":editGroup(id);break;case"delete-group":deleteGroup(id);break;case"add-team":addTeam(id);break;case"edit-team":editTeam(b.dataset.group,id);break;case"edit-match":editMatch(id);break;case"delete-match":deleteMatch(id);break;}}catch(err){toast(err.message||"Não foi possível executar a ação.","error");}
  });
  $("modalClose").addEventListener("click",()=>$("modal").close());$("modalCancel").addEventListener("click",()=>$("modal").close());
  $("modalForm").addEventListener("submit",async e=>{e.preventDefault();if(!modalAction)return;const data=new FormData(e.currentTarget);try{await modalAction(data);$("modal").close();}catch(err){toast(err.message||"Confira os campos e tente novamente.","error");}});
  render();go(activeView);
})();