(() => {
  const sb = window.supabase.createClient('https://lstjmanxzpsnuxonspfc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdGptYW54enBzbnV4b25zcGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NzAxNjMsImV4cCI6MjEwMTI0NjE2M30.BVjCyTVWsODT6cpRKCSak5PI5a_4uhxifHP5z_ScqO8');
  const status = document.getElementById('status');
  const grid = document.getElementById('adminGrid');
  const clients = document.getElementById('clients');
  const details = document.getElementById('clientDetails');
  let selectedClient = null;
  const mt5Publisher = document.getElementById('mt5Publisher');
  const mt5Form = document.getElementById('mt5ResultForm');
  const mt5DropZone = document.getElementById('mt5DropZone');
  const mt5Image = document.getElementById('mt5Image');
  const mt5Preview = document.getElementById('mt5Preview');
  const mt5Status = document.getElementById('mt5FormStatus');
  const mt5List = document.getElementById('mt5ResultsList');
  let selectedMt5File = null;

  const row = (title, subtitle, actions = '') => `<div class="row"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(subtitle || '')}</small>${actions}</div>`;
  const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));

  function selectMt5File(file) {
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 10485760) {
      mt5Status.textContent = 'Choisissez une image JPG, PNG ou WebP de moins de 10 Mo.';
      return;
    }
    selectedMt5File = file;
    mt5Preview.src = URL.createObjectURL(file);
    mt5Preview.hidden = false;
    mt5DropZone.classList.add('has-image');
    if (!document.getElementById('mt5Title').value) document.getElementById('mt5Title').value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
    mt5Status.textContent = '';
  }

  async function loadMt5Results() {
    const {data, error} = await sb.from('mt5_results').select('id,title,result_date,image_path,is_published,created_at').order('result_date', {ascending:false}).order('created_at', {ascending:false});
    if (error) { mt5List.innerHTML = '<p class="muted">La section doit d’abord être activée dans Supabase.</p>'; return; }
    if (!data.length) { mt5List.innerHTML = '<p class="muted">Aucune capture enregistrée.</p>'; return; }
    mt5List.innerHTML = data.map(item => {
      const url = sb.storage.from('mt5-results').getPublicUrl(item.image_path).data.publicUrl;
      return `<article class="result-admin-row" data-id="${item.id}" data-path="${escapeHtml(item.image_path)}"><img src="${escapeHtml(url)}" alt=""><div><strong>${escapeHtml(item.title)}</strong><small>${new Date(`${item.result_date}T12:00:00`).toLocaleDateString('fr-CA')} · ${item.is_published ? 'Publié' : 'Masqué'}</small></div><div class="result-admin-actions"><button class="button toggle-result" data-published="${item.is_published}">${item.is_published ? 'Masquer' : 'Publier'}</button><button class="button danger delete-result">Supprimer</button></div></article>`;
    }).join('');
  }

  mt5Image.addEventListener('change', () => selectMt5File(mt5Image.files[0]));
  ['dragenter','dragover'].forEach(name => mt5DropZone.addEventListener(name, event => { event.preventDefault(); mt5DropZone.classList.add('dragging'); }));
  ['dragleave','drop'].forEach(name => mt5DropZone.addEventListener(name, event => { event.preventDefault(); mt5DropZone.classList.remove('dragging'); }));
  mt5DropZone.addEventListener('drop', event => selectMt5File(event.dataTransfer.files[0]));
  mt5DropZone.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); mt5Image.click(); } });
  mt5Form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!selectedMt5File) { mt5Status.textContent = 'Ajoutez d’abord une capture MT5.'; return; }
    const submit = mt5Form.querySelector('button[type="submit"]'); submit.disabled = true; mt5Status.textContent = 'Téléversement et publication…';
    const extension = selectedMt5File.name.split('.').pop().toLowerCase();
    const path = `${crypto.randomUUID()}.${extension}`;
    const {error: uploadError} = await sb.storage.from('mt5-results').upload(path, selectedMt5File, {contentType:selectedMt5File.type, upsert:false});
    if (uploadError) { mt5Status.textContent = 'La capture n’a pas pu être téléversée.'; submit.disabled = false; return; }
    const record = {title:document.getElementById('mt5Title').value.trim(),description:document.getElementById('mt5Description').value.trim() || null,result_date:document.getElementById('mt5Date').value,image_path:path,is_published:document.getElementById('mt5Published').checked};
    const {error} = await sb.from('mt5_results').insert(record);
    if (error) { await sb.storage.from('mt5-results').remove([path]); mt5Status.textContent = 'La publication n’a pas pu être enregistrée.'; submit.disabled = false; return; }
    mt5Form.reset(); document.getElementById('mt5Date').valueAsDate = new Date(); selectedMt5File = null; mt5Preview.hidden = true; mt5Preview.removeAttribute('src'); mt5DropZone.classList.remove('has-image'); submit.disabled = false; mt5Status.textContent = record.is_published ? 'Capture publiée sur la page Résultats MT5.' : 'Capture enregistrée comme masquée.'; await loadMt5Results();
  });
  mt5List.addEventListener('click', async event => {
    const article = event.target.closest('.result-admin-row'); if (!article) return;
    if (event.target.closest('.toggle-result')) { const next = event.target.dataset.published !== 'true'; const {error} = await sb.from('mt5_results').update({is_published:next}).eq('id', article.dataset.id); if (!error) await loadMt5Results(); }
    if (event.target.closest('.delete-result')) { if (!confirm('Supprimer définitivement cette capture?')) return; const {error} = await sb.from('mt5_results').delete().eq('id', article.dataset.id); if (!error) { await sb.storage.from('mt5-results').remove([article.dataset.path]); await loadMt5Results(); } }
  });

  function loadDemoClient() {
    selectedClient = {id:'demo', full_name:'Client Démo'};
    document.getElementById('clientTitle').textContent = 'Client Démo';
    details.innerHTML = `
      <p class="muted">DOSSIER DE DÉMONSTRATION · AUCUNE DONNÉE RÉELLE</p>
      <div class="section"><h2>Abonnement</h2>
        ${row('Niveau 3 · Actif', 'Membre depuis le 2 août 2026')}
        ${row('60,00 $ CA', 'Dernière facturation : 2 août 2026')}
        ${row('Prochain renouvellement', '15 septembre 2026')}
      </div>
      <div class="section"><h2>Comptes MT5</h2>
        ${row('Compte 1 · STARTRADER', '12345678 · STARTRADER-Live', '<div class="actions"><button class="button demo-reveal">Simuler l’accès administrateur</button></div>')}
        ${row('Compte 2 · Vantage Markets (USA only)', '87654321 · VantageInternational-Live', '<small>Aucun mot de passe temporaire disponible</small>')}
      </div>
      <div class="section"><h2>Documents privés</h2>
        ${row('Permis de conduire — recto', 'drivers_license_front', '<small>Document fictif</small>')}
        ${row('Permis de conduire — verso', 'drivers_license_back', '<small>Document fictif</small>')}
      </div>
      <div class="section"><h2>Conversation privée</h2><div class="admin-conversation"><div class="message client-message"><strong>Client Démo</strong><p>Bonjour, mon compte MT5 est maintenant prêt.</p><small>Aujourd’hui · 09:15</small></div><div class="message admin-message"><strong>Alfred-EA</strong><p>Merci. Nous allons vérifier votre dossier et vous confirmer l’activation.</p><small>Aujourd’hui · 09:22</small></div></div><form class="admin-message-form"><textarea maxlength="5000" placeholder="Écrire un message privé au client" required></textarea><button class="button" type="submit">Envoyer au client</button><p class="muted message-status"></p></form></div>`;
  }

  async function loadClient(client) {
    selectedClient = client;
    document.getElementById('clientTitle').textContent = client.full_name || 'Client';
    details.innerHTML = '<p class="muted">Chargement…</p>';
    const [accounts, documents, credentials, membership, latestInvoice, messages] = await Promise.all([
      sb.from('mt5_accounts').select('slot,broker,server_name,account_number').eq('user_id', client.id).order('slot'),
      sb.from('documents').select('id,display_name,category,storage_path').eq('client_id', client.id).order('created_at', {ascending:false}),
      sb.from('mt5_credentials').select('id,slot,expires_at,created_at').eq('user_id', client.id).order('slot'),
      sb.from('memberships').select('plan_name,status,starts_on,renews_on,updated_at').eq('user_id', client.id).maybeSingle(),
      sb.from('invoices').select('amount_cents,currency,issued_on,status').eq('client_id', client.id).order('issued_on', {ascending:false}).limit(1).maybeSingle(),
      sb.from('messages').select('body,created_at,sender_id').eq('client_id', client.id).order('created_at', {ascending:true})
    ]);
    const memberSince = membership.data?.starts_on || client.created_at;
    const memberSinceText = memberSince ? new Date(memberSince).toLocaleDateString('fr-CA', {year:'numeric',month:'long',day:'numeric'}) : 'À confirmer';
    const invoiceAmount = latestInvoice.data ? (latestInvoice.data.amount_cents / 100).toLocaleString('fr-CA', {style:'currency',currency:latestInvoice.data.currency}) : 'Aucune facturation';
    const billingDate = latestInvoice.data?.issued_on ? new Date(`${latestInvoice.data.issued_on}T12:00:00`).toLocaleDateString('fr-CA', {year:'numeric',month:'long',day:'numeric'}) : '—';
    const renewalDate = membership.data?.renews_on ? new Date(`${membership.data.renews_on}T12:00:00`).toLocaleDateString('fr-CA', {year:'numeric',month:'long',day:'numeric'}) : 'À confirmer';
    let html = `<p class="muted">Dossier ${escapeHtml(client.id)}</p><div class="section"><h2>Abonnement</h2>${row(`${membership.data?.plan_name || 'À confirmer'} · ${membership.data?.status || 'En attente'}`, `Membre depuis le ${memberSinceText}`)}${row(invoiceAmount, `Dernière facturation : ${billingDate}`)}${row('Prochain renouvellement', renewalDate)}</div><div class="section"><h2>Comptes MT5</h2>`;
    html += (accounts.data || []).map(account => {
      const credential = (credentials.data || []).find(item => item.slot === account.slot);
      const action = credential ? `<div class="actions"><button class="button reveal" data-id="${credential.id}">Accéder avec mon mot de passe administrateur · expire ${new Date(credential.expires_at).toLocaleString('fr-CA')}</button></div>` : '<small>Aucun mot de passe temporaire disponible</small>';
      return row(`Compte ${account.slot} · ${account.broker}`, `${account.account_number} · ${account.server_name || 'Serveur non indiqué'}`, action);
    }).join('') || '<p class="muted">Aucun compte enregistré.</p>';
    html += '</div><div class="section"><h2>Documents privés</h2>';
    html += (documents.data || []).map(document => row(document.display_name, document.category, `<div class="actions"><button class="button open-document" data-path="${escapeHtml(document.storage_path)}">Ouvrir</button></div>`)).join('') || '<p class="muted">Aucun document.</p>';
    html += '</div><div class="section"><h2>Conversation privée</h2><div class="admin-conversation">';
    html += (messages.data || []).map(message => `<div class="message ${message.sender_id === client.id ? 'client-message' : 'admin-message'}"><strong>${message.sender_id === client.id ? escapeHtml(client.full_name || 'Client') : 'Alfred-EA'}</strong><p>${escapeHtml(message.body)}</p><small>${new Date(message.created_at).toLocaleString('fr-CA')}</small></div>`).join('') || '<p class="muted">Aucun message pour ce client.</p>';
    html += '</div><form class="admin-message-form"><textarea maxlength="5000" placeholder="Écrire un message privé au client" required></textarea><button class="button" type="submit">Envoyer au client</button><p class="muted message-status"></p></form></div>';
    details.innerHTML = html;
  }

  async function init() {
    const {data:{session}} = await sb.auth.getSession();
    if (!session) { location.href = 'client-space.html'; return; }
    const {data:admin} = await sb.from('admin_users').select('user_id').eq('user_id', session.user.id).maybeSingle();
    if (!admin) { status.textContent = 'Accès refusé. Ce compte n’est pas administrateur.'; return; }
    const [{data:profiles, error},{data:memberships, error:membershipError}] = await Promise.all([
      sb.from('profiles').select('id,full_name,created_at').order('created_at', {ascending:false}),
      sb.from('memberships').select('user_id,plan_name,status,starts_on,renews_on,updated_at')
    ]);
    if (error) { status.textContent = 'Impossible de charger les dossiers.'; return; }
    if (membershipError) { status.textContent = 'Impossible de charger les abonnements.'; return; }
    status.hidden = true; grid.hidden = false; mt5Publisher.hidden = false; clients.replaceChildren();
    document.getElementById('mt5Date').valueAsDate = new Date();
    loadMt5Results();
    const demoButton=document.createElement('button'); demoButton.className='client demo-client'; demoButton.innerHTML='Client Démo<small>Aperçu administrateur · aucune donnée réelle</small>'; demoButton.addEventListener('click',loadDemoClient); clients.appendChild(demoButton);
    const membershipsByUser = new Map((memberships || []).map(membership => [membership.user_id, membership]));
    const groups = [
      {key:'new',title:'Nouveaux membres',items:[]},
      {key:'active',title:'Abonnements actifs',items:[]},
      {key:'unpaid',title:'Non payés',items:[]},
      {key:'inactive',title:'Inactifs',items:[]}
    ];
    profiles.forEach(profile => {
      const membership = membershipsByUser.get(profile.id);
      const statusKey = membership?.status === 'active' ? 'active' : membership?.status === 'paused' ? 'unpaid' : ['cancelled','expired'].includes(membership?.status) ? 'inactive' : 'new';
      groups.find(group => group.key === statusKey).items.push({profile,membership});
    });
    groups.forEach(group => {
      const section = document.createElement('details'); section.className=`client-group client-group-${group.key}`; section.open = true;
      section.innerHTML=`<summary class="client-group-title"><strong>${group.title}</strong><span class="client-count">${group.items.length}</span></summary>`;
      if (!group.items.length) section.insertAdjacentHTML('beforeend','<p class="client-group-empty">Aucun client</p>');
      group.items.forEach(({profile,membership}) => {
        const button=document.createElement('button'); button.className='client';
        const detail = group.key === 'inactive' ? 'Abonnement inactif' : group.key === 'active' ? membership.plan_name : group.key === 'unpaid' ? 'Paiement en attente' : 'Nouveau membre';
        button.innerHTML=`${escapeHtml(profile.full_name || 'Client')}<small class="client-status">${escapeHtml(detail)}</small>`; button.addEventListener('click',()=>loadClient(profile)); section.appendChild(button);
      });
      clients.appendChild(section);
    });
    loadDemoClient();
  }

  details.addEventListener('click', async event => {
    const demoReveal = event.target.closest('.demo-reveal');
    if (demoReveal) {
      const accountRow=demoReveal.closest('.row');
      demoReveal.closest('.actions').innerHTML='<div class="account-secret"><strong>Compte 1 · Mot de passe MT5</strong><input type="text" value="DEMO-ONLY-NOT-A-REAL-PASSWORD" readonly><small>Démonstration seulement · attaché au Compte 1</small></div>';
      setTimeout(()=>{const secret=accountRow.querySelector('.account-secret');if(secret)secret.remove();},120000); return;
    }
    const reveal = event.target.closest('.reveal');
    if (reveal) {
      const actions=reveal.closest('.actions');
      actions.innerHTML=`<form class="credential-gate" data-id="${reveal.dataset.id}"><label>Mot de passe de votre compte administrateur</label><input type="password" autocomplete="current-password" required><button class="button" type="submit">Vérifier et afficher pour ce compte</button><p class="muted gate-status"></p></form>`;
    }
    const open = event.target.closest('.open-document');
    if (open) { const {data,error}=await sb.storage.from('client-documents').createSignedUrl(open.dataset.path,300); if(error) alert('Document inaccessible.'); else window.open(data.signedUrl,'_blank','noopener'); }
  });
  details.addEventListener('submit', async event => {
    const messageForm=event.target.closest('.admin-message-form');
    if(messageForm){
      event.preventDefault();
      const textarea=messageForm.querySelector('textarea'); const feedback=messageForm.querySelector('.message-status'); const body=textarea.value.trim();
      if(!body||!selectedClient) return;
      if(selectedClient.id==='demo'){
        const conversation=messageForm.previousElementSibling;
        conversation.insertAdjacentHTML('beforeend',`<div class="message admin-message"><strong>Alfred-EA</strong><p>${escapeHtml(body)}</p><small>À l’instant · démonstration</small></div>`);
        textarea.value=''; feedback.textContent='Message de démonstration — aucune donnée enregistrée.'; return;
      }
      const submitButton=messageForm.querySelector('button'); submitButton.disabled=true; feedback.textContent='Envoi…';
      const {data:{user}}=await sb.auth.getUser();
      const {error}=await sb.from('messages').insert({client_id:selectedClient.id,sender_id:user.id,body});
      if(error){feedback.textContent='Le message n’a pas pu être envoyé.';submitButton.disabled=false;return;}
      await loadClient(selectedClient); return;
    }
    const gate=event.target.closest('.credential-gate');
    if(!gate) return;
    event.preventDefault();
    const submit=gate.querySelector('button'); const feedback=gate.querySelector('.gate-status'); const password=gate.querySelector('input').value;
    submit.disabled=true; feedback.textContent='Vérification…';
    const {data:{user}}=await sb.auth.getUser();
    const {error:authError}=await sb.auth.signInWithPassword({email:user.email,password});
    if(authError){feedback.textContent='Mot de passe administrateur incorrect.';submit.disabled=false;return;}
    const {data,error}=await sb.rpc('reveal_mt5_credential',{p_credential_id:gate.dataset.id});
    if(error){feedback.textContent='Ce mot de passe MT5 est indisponible ou expiré.';submit.disabled=false;return;}
    gate.innerHTML=`<div class="account-secret"><strong>Mot de passe MT5 de ce compte</strong><input type="text" value="${escapeHtml(data)}" readonly><button class="button copy-account-secret" type="button">Copier</button><small>Consultation journalisée · effacement de l’écran dans deux minutes</small></div>`;
    const accountSecret=gate.querySelector('.account-secret'); setTimeout(()=>{if(accountSecret)accountSecret.remove();},120000);
  });
  details.addEventListener('click',event=>{const copy=event.target.closest('.copy-account-secret');if(copy)navigator.clipboard.writeText(copy.closest('.account-secret').querySelector('input').value);});
  document.getElementById('logout').addEventListener('click',async()=>{await sb.auth.signOut();location.href='client-space.html';});
  init();
})();
