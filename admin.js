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
  const adminPinPanel = document.getElementById('adminPinPanel');
  const adminPinForm = document.getElementById('adminPinForm');
  const adminPinStatus = document.getElementById('adminPinStatus');
  const monthlySummary = document.getElementById('monthlySummary');
  const summaryMonth = document.getElementById('summaryMonth');
  const monthlyIncome = document.getElementById('monthlyIncome');
  const monthlySubscriptions = document.getElementById('monthlySubscriptions');
  const monthlySummaryStatus = document.getElementById('monthlySummaryStatus');
  const mfaGate = document.getElementById('mfaGate');
  const mfaSetup = document.getElementById('mfaSetup');
  const mfaForm = document.getElementById('mfaForm');
  const mfaCode = document.getElementById('mfaCode');
  const mfaStatus = document.getElementById('mfaStatus');
  let mfaFactorId = null;
  let selectedMt5File = null;

  const row = (title, subtitle, actions = '') => `<div class="row"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(subtitle || '')}</small>${actions}</div>`;
  const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));

  async function loadMonthlySummary(monthValue) {
    if (!/^\d{4}-\d{2}$/.test(monthValue || '')) return;
    const [year, month] = monthValue.split('-').map(Number);
    const start = `${year}-${String(month).padStart(2,'0')}-01`;
    const next = new Date(Date.UTC(year, month, 1)).toISOString().slice(0,10);
    monthlyIncome.textContent = '…'; monthlySubscriptions.textContent = '…'; monthlySummaryStatus.textContent = '';
    const [invoices, memberships] = await Promise.all([
      sb.from('invoices').select('amount_cents,currency').eq('status','paid').gte('issued_on',start).lt('issued_on',next),
      sb.from('memberships').select('user_id').gte('starts_on',start).lt('starts_on',next)
    ]);
    if (invoices.error || memberships.error) { monthlyIncome.textContent='—'; monthlySubscriptions.textContent='—'; monthlySummaryStatus.textContent='Impossible de charger les statistiques mensuelles.'; return; }
    const totals = (invoices.data || []).reduce((map, invoice) => map.set(invoice.currency,(map.get(invoice.currency)||0)+invoice.amount_cents), new Map());
    monthlyIncome.textContent = totals.size ? [...totals].map(([currency,cents]) => (cents/100).toLocaleString('fr-CA',{style:'currency',currency})).join(' + ') : '0,00 $';
    monthlySubscriptions.textContent = String(new Set((memberships.data || []).map(item => item.user_id)).size);
    const invoiceCount=(invoices.data || []).length; document.getElementById('monthlyIncomeHelp').textContent = `${invoiceCount} facture${invoiceCount === 1 ? '' : 's'} payée${invoiceCount === 1 ? '' : 's'}`;
  }

  async function requireAdministratorMfa() {
    const [{data:aal,error:aalError},{data:factors,error:factorsError}] = await Promise.all([sb.auth.mfa.getAuthenticatorAssuranceLevel(),sb.auth.mfa.listFactors()]);
    if (aalError || factorsError) { status.textContent='Impossible de vérifier la double authentification.'; return false; }
    if (aal.currentLevel === 'aal2') return true;
    const verified = (factors.totp || []).find(factor => factor.status === 'verified');
    mfaGate.hidden=false; status.hidden=true; mfaForm.hidden=false;
    if (verified) {
      mfaFactorId=verified.id; document.getElementById('mfaTitle').textContent='Code d’authentification requis'; document.getElementById('mfaHelp').textContent='Entrez le code actuel de votre application d’authentification pour ouvrir Administration.';
      return false;
    }
    mfaForm.hidden=true; document.getElementById('mfaHelp').textContent='La double authentification est obligatoire. Configurez Google Authenticator, Microsoft Authenticator, Authy ou une application compatible TOTP.';
    mfaSetup.innerHTML='<button class="button" id="startMfaEnrollment" type="button">Configurer mon application d’authentification</button>';
    return false;
  }

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
    const publishPin=document.getElementById('mt5PublishPin').value.trim();
    if(!/^\d{4}$/.test(publishPin)){mt5Status.textContent='Entrez votre PIN administrateur de 4 chiffres.';return;}
    const submit = mt5Form.querySelector('button[type="submit"]'); submit.disabled = true; mt5Status.textContent = 'Vérification du PIN…';
    const {error:pinError}=await sb.rpc('verify_admin_pin',{p_pin:publishPin});
    if(pinError){mt5Status.textContent='PIN incorrect, verrouillé ou non configuré. La capture n’a pas été envoyée.';submit.disabled=false;return;}
    mt5Status.textContent = 'Téléversement et publication…';
    const extension = selectedMt5File.name.split('.').pop().toLowerCase();
    const path = `${crypto.randomUUID()}.${extension}`;
    const {error: uploadError} = await sb.storage.from('mt5-results').upload(path, selectedMt5File, {contentType:selectedMt5File.type, upsert:false});
    if (uploadError) { mt5Status.textContent = 'La capture n’a pas pu être téléversée.'; submit.disabled = false; return; }
    const record = {title:document.getElementById('mt5Title').value.trim(),description:document.getElementById('mt5Description').value.trim() || '',result_date:document.getElementById('mt5Date').value,image_path:path,is_published:document.getElementById('mt5Published').checked};
    const {error} = await sb.rpc('admin_create_mt5_result',{p_title:record.title,p_description:record.description,p_result_date:record.result_date,p_image_path:path,p_is_published:record.is_published,p_pin:publishPin});
    if (error) { await sb.storage.from('mt5-results').remove([path]); mt5Status.textContent = 'La publication n’a pas pu être enregistrée.'; submit.disabled = false; return; }
    mt5Form.reset(); document.getElementById('mt5Date').valueAsDate = new Date(); selectedMt5File = null; mt5Preview.hidden = true; mt5Preview.removeAttribute('src'); mt5DropZone.classList.remove('has-image'); submit.disabled = false; mt5Status.textContent = record.is_published ? 'Capture publiée sur la page Résultats MT5.' : 'Capture enregistrée comme masquée.'; await loadMt5Results();
  });
  mt5List.addEventListener('click', async event => {
    const article = event.target.closest('.result-admin-row'); if (!article) return;
    if (event.target.closest('.toggle-result')) { const next = event.target.dataset.published !== 'true'; const pin=prompt(`Entrez votre PIN administrateur à 4 chiffres pour ${next ? 'publier' : 'masquer'} cette capture :`); if(!pin)return; const {error}=await sb.rpc('admin_set_mt5_result_visibility',{p_result_id:article.dataset.id,p_is_published:next,p_pin:pin}); if(error){alert('Action refusée : PIN incorrect ou session MFA requise.');return;} await loadMt5Results(); }
    if (event.target.closest('.delete-result')) { if (!confirm('Supprimer définitivement cette capture?')) return; const pin=prompt('Entrez votre PIN administrateur à 4 chiffres pour supprimer cette capture :'); if(!pin)return; const {data:path,error}=await sb.rpc('admin_delete_mt5_result',{p_result_id:article.dataset.id,p_pin:pin}); if(error){alert('Suppression refusée : PIN incorrect ou session MFA requise.');return;} await sb.storage.from('mt5-results').remove([path]); await loadMt5Results(); }
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
        ${row('Compte 1 — STARTRADER', '12345678 · STARTRADER-Live', '<div class="actions"><button class="button demo-reveal">Simuler l’accès administrateur</button></div>')}
        ${row('Compte 2 — Vantage Markets (USA only)', '87654321 · VantageInternational-Live', '<small>Aucun mot de passe temporaire disponible</small>')}
      </div>
      <div class="section"><h2>Documents privés</h2>
        ${row('Permis de conduire — recto', 'drivers_license_front', '<small>Document fictif</small>')}
        ${row('Permis de conduire — verso', 'drivers_license_back', '<small>Document fictif</small>')}
      </div>
      <div class="section"><h2>Conversation privée</h2><div class="admin-conversation"><div class="message client-message"><strong>Client Démo</strong><p>Bonjour, mon compte MT5 est maintenant prêt.</p><small>Aujourd’hui · 09:15</small></div><div class="message admin-message"><strong>Alfred-EA</strong><p>Merci. Nous allons vérifier votre dossier et vous confirmer l’activation.</p><small>Aujourd’hui · 09:22</small></div></div><form class="admin-message-form"><textarea maxlength="5000" placeholder="Écrire un message privé au client"></textarea><label class="message-image-label">Image privée (JPG, PNG ou WebP, 10 Mo max)<input class="admin-message-image" type="file" accept="image/jpeg,image/png,image/webp"></label><button class="button" type="submit">Envoyer au client</button><p class="muted message-status"></p></form></div>`;
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
      sb.from('messages').select('body,created_at,sender_id,attachment_path,attachment_name,attachment_mime').eq('client_id', client.id).order('created_at', {ascending:true})
    ]);
    const renderedMessages = await Promise.all((messages.data || []).map(async message => {
      let attachmentHtml = '';
      if (message.attachment_path) {
        const { data: signedImage } = await sb.storage.from('client-documents').createSignedUrl(message.attachment_path, 600);
        if (signedImage?.signedUrl) attachmentHtml = `<a href="${escapeHtml(signedImage.signedUrl)}" target="_blank" rel="noopener"><img src="${escapeHtml(signedImage.signedUrl)}" alt="${escapeHtml(message.attachment_name || 'Image privée')}" loading="lazy" style="display:block;max-width:min(100%,520px);max-height:420px;margin:.65rem 0;border-radius:12px;object-fit:contain"></a>`;
      }
      return `<div class="message ${message.sender_id === client.id ? 'client-message' : 'admin-message'}"><strong>${message.sender_id === client.id ? escapeHtml(client.full_name || 'Client') : 'Alfred-EA'}</strong>${message.body ? `<p>${escapeHtml(message.body)}</p>` : ''}${attachmentHtml}<small>${new Date(message.created_at).toLocaleString('fr-CA')}</small></div>`;
    }));
    const messagesHtml = renderedMessages.join('') || '<p class="muted">Aucun message pour ce client.</p>';
    const memberSince = membership.data?.starts_on || client.created_at;
    const memberSinceText = memberSince ? new Date(memberSince).toLocaleDateString('fr-CA', {year:'numeric',month:'long',day:'numeric'}) : 'À confirmer';
    const invoiceAmount = latestInvoice.data ? (latestInvoice.data.amount_cents / 100).toLocaleString('fr-CA', {style:'currency',currency:latestInvoice.data.currency}) : 'Aucune facturation';
    const billingDate = latestInvoice.data?.issued_on ? new Date(`${latestInvoice.data.issued_on}T12:00:00`).toLocaleDateString('fr-CA', {year:'numeric',month:'long',day:'numeric'}) : '—';
    const renewalDate = membership.data?.renews_on ? new Date(`${membership.data.renews_on}T12:00:00`).toLocaleDateString('fr-CA', {year:'numeric',month:'long',day:'numeric'}) : 'À confirmer';
    const awaitingApproval = client.admin_group === 'new' || !membership.data || membership.data.status === 'pending';
    const approvalAction = awaitingApproval ? '<div class="actions"><button class="button approve-member" type="button">Approuver et activer le membre</button><small class="approval-status">Réservé aux administrateurs · confirmez le paiement avant l’approbation.</small></div>' : '';
    const group = client.admin_group || 'new';
    const management = `<section class="client-management"><h2>Gestion du client</h2><p class="muted">Déplacez ce client dans une autre section ou supprimez définitivement son compte.</p><form class="client-management-form" data-user-id="${escapeHtml(client.id)}"><label>Section du client<select name="target_status"><option value="new"${group === 'new' ? ' selected' : ''}>Nouveaux membres</option><option value="active"${group === 'active' ? ' selected' : ''}>Abonnements actifs</option><option value="unpaid"${group === 'unpaid' ? ' selected' : ''}>Non payés</option><option value="inactive"${group === 'inactive' ? ' selected' : ''}>Inactifs</option></select></label><label>PIN administrateur<input name="admin_pin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="one-time-code" required></label><button class="button move-client" data-action="move" type="submit">Déplacer le client</button><button class="button danger delete-client" data-action="delete" type="submit">Supprimer définitivement le client</button><p class="muted management-status">Le PIN est exigé pour chaque modification.</p></form></section>`;
    let html = `<p class="muted">Dossier ${escapeHtml(client.id)}</p>${management}<div class="section"><h2>Abonnement</h2>${row(`${membership.data?.plan_name || 'À confirmer'} · ${membership.data?.status || 'En attente'}`, `Membre depuis le ${memberSinceText}`, approvalAction)}${row(invoiceAmount, `Dernière facturation : ${billingDate}`)}${row('Prochain renouvellement', renewalDate)}</div><div class="section"><h2>Comptes MT5</h2>`;
    html += (accounts.data || []).map(account => {
      const credential = (credentials.data || []).find(item => item.slot === account.slot);
      const action = credential ? `<div class="actions"><button class="button reveal" data-id="${credential.id}">Accéder avec mon PIN administrateur</button></div>` : '<small>Aucun mot de passe disponible</small>';
      return row(`Compte ${account.slot} — ${account.broker}`, `${account.account_number} · ${account.server_name || 'Serveur non indiqué'}`, action);
    }).join('') || '<p class="muted">Aucun compte enregistré.</p>';
    html += '</div><div class="section"><h2>Documents privés</h2>';
    html += (documents.data || []).map(document => {
      const isLicense = ['drivers_license_front','drivers_license_back'].includes(document.category);
      const action = isLicense
        ? `<div class="actions"><button class="button open-license" data-id="${document.id}" type="button">Ouvrir avec le PIN administrateur</button><small>Chaque accès est inscrit au journal de sécurité.</small></div>`
        : `<div class="actions"><button class="button open-document" data-path="${escapeHtml(document.storage_path)}" type="button">Ouvrir</button></div>`;
      return row(document.display_name, document.category, action);
    }).join('') || '<p class="muted">Aucun document.</p>';
    html += '</div><div class="section"><h2>Conversation privée</h2><div class="admin-conversation">';
    html += messagesHtml;
    html += '</div><form class="admin-message-form"><textarea maxlength="5000" placeholder="Écrire un message privé au client"></textarea><label>Ajouter une image privée (JPG, PNG ou WebP · 10 Mo max.)<input class="admin-message-image" type="file" accept="image/jpeg,image/png,image/webp"></label><button class="button" type="submit">Envoyer au client</button><p class="muted message-status"></p></form></div>';
    details.innerHTML = html;
  }

  async function init() {
    const {data:{session}} = await sb.auth.getSession();
    if (!session) { location.href = 'client-space.html'; return; }
    const {data:admin} = await sb.from('admin_users').select('user_id').eq('user_id', session.user.id).maybeSingle();
    if (!admin) { status.textContent = 'Accès refusé. Ce compte n’est pas administrateur.'; return; }
    if (!await requireAdministratorMfa()) return;
    const [{data:profiles, error},{data:memberships, error:membershipError}] = await Promise.all([
      sb.from('profiles').select('id,full_name,created_at').order('created_at', {ascending:false}),
      sb.from('memberships').select('user_id,plan_name,status,starts_on,renews_on,updated_at')
    ]);
    if (error) { status.textContent = 'Impossible de charger les dossiers.'; return; }
    if (membershipError) { status.textContent = 'Impossible de charger les abonnements.'; return; }
    const {data:hasPin} = await sb.rpc('has_admin_pin');
    status.hidden = true; monthlySummary.hidden = false; grid.hidden = false; mt5Publisher.hidden = false; adminPinPanel.hidden = false; clients.replaceChildren();
    const today = new Date(); summaryMonth.value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`; loadMonthlySummary(summaryMonth.value);
    document.getElementById('adminPinHelp').textContent = hasPin ? 'Entrez votre PIN actuel avant de choisir un nouveau PIN.' : 'Créez votre PIN de 4 chiffres avant d’approuver un membre ou d’afficher un mot de passe MT5.';
    document.getElementById('currentPinField').hidden = !hasPin;
    document.getElementById('adminCurrentPinInput').required = Boolean(hasPin);
    document.getElementById('mt5Date').valueAsDate = new Date();
    loadMt5Results();
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
        const detail = group.key === 'inactive' ? 'Abonnement inactif' : group.key === 'active' ? membership.plan_name : group.key === 'unpaid' ? 'Paiement en attente' : '';
        button.innerHTML=`${escapeHtml(profile.full_name || 'Client')}${detail ? `<small class="client-status">${escapeHtml(detail)}</small>` : ''}`; button.addEventListener('click',()=>loadClient({...profile,admin_group:group.key})); section.appendChild(button);
      });
      clients.appendChild(section);
    });
  }

  details.addEventListener('click', async event => {
    const approve = event.target.closest('.approve-member');
    if (approve) {
      if (!selectedClient || selectedClient.id === 'demo') return;
      approve.closest('.actions').innerHTML=`<form class="member-approval-gate" data-user-id="${selectedClient.id}"><label>Confirmez le paiement et entrez votre PIN administrateur à 4 chiffres</label><input type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="one-time-code" required><button class="button" type="submit">Confirmer et activer le membre</button><button class="button cancel-member-approval" type="button">Annuler</button><p class="muted approval-status">Cette action déplacera le client vers Abonnements actifs.</p></form>`;
      return;
    }
    const demoReveal = event.target.closest('.demo-reveal');
    if (demoReveal) {
      demoReveal.closest('.actions').innerHTML='<form class="credential-gate" data-demo="true"><label>PIN administrateur à 4 chiffres</label><input type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="one-time-code" required><button class="button" type="submit">Vérifier et afficher le mot de passe démo</button><p class="muted gate-status"></p></form>'; return;
    }
    const reveal = event.target.closest('.reveal');
    if (reveal) {
      const actions=reveal.closest('.actions');
      actions.innerHTML=`<form class="credential-gate" data-id="${reveal.dataset.id}"><label>PIN administrateur à 4 chiffres</label><input type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="one-time-code" required><button class="button" type="submit">Vérifier et afficher pour ce compte</button><p class="muted gate-status"></p></form>`;
    }
    const openLicense = event.target.closest('.open-license');
    if (openLicense) {
      const actions = openLicense.closest('.actions');
      actions.innerHTML = `<form class="license-gate" data-id="${openLicense.dataset.id}"><label>PIN administrateur à 4 chiffres</label><input type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="one-time-code" required><button class="button" type="submit">Vérifier et ouvrir la licence</button><p class="muted license-status"></p></form>`;
    }
    const open = event.target.closest('.open-document');
    if (open) { const {data,error}=await sb.storage.from('client-documents').createSignedUrl(open.dataset.path,300); if(error) alert('Document inaccessible.'); else window.open(data.signedUrl,'_blank','noopener'); }
  });
  details.addEventListener('submit', async event => {
    const managementForm=event.target.closest('.client-management-form');
    if(managementForm){
      event.preventDefault();
      const action=event.submitter?.dataset.action; const pin=managementForm.elements.admin_pin.value.trim(); const feedback=managementForm.querySelector('.management-status');
      if(!/^\d{4}$/.test(pin)){feedback.textContent='Entrez un PIN de exactement 4 chiffres.';return;}
      if(action==='delete'){
        if(!confirm('Supprimer définitivement ce client, son accès, ses comptes MT5, ses documents, ses messages et ses factures? Cette action est irréversible.')){managementForm.elements.admin_pin.value='';return;}
        event.submitter.disabled=true; feedback.textContent='Vérification du PIN et suppression définitive…';
        const {error}=await sb.rpc('admin_delete_client',{p_user_id:managementForm.dataset.userId,p_pin:pin});
        if(error){feedback.textContent='Suppression refusée : PIN incorrect, compte administrateur ou erreur serveur.';event.submitter.disabled=false;return;}
        selectedClient=null; details.innerHTML='<p class="status">Client supprimé définitivement.</p>'; setTimeout(()=>location.reload(),700); return;
      }
      const target=managementForm.elements.target_status.value; event.submitter.disabled=true; feedback.textContent='Vérification du PIN et déplacement…';
      const {error}=await sb.rpc('admin_set_client_status',{p_user_id:managementForm.dataset.userId,p_status:target,p_pin:pin});
      if(error){feedback.textContent='Déplacement refusé : vérifiez le PIN et réessayez.';event.submitter.disabled=false;return;}
      feedback.textContent='Client déplacé avec succès.'; setTimeout(()=>location.reload(),600); return;
    }
    const licenseGate=event.target.closest('.license-gate');
    if(licenseGate){
      event.preventDefault();
      const pin=licenseGate.querySelector('input').value.trim(); const feedback=licenseGate.querySelector('.license-status'); const submitButton=licenseGate.querySelector('button');
      if(!/^\d{4}$/.test(pin)){feedback.textContent='Entrez un PIN de exactement 4 chiffres.';return;}
      submitButton.disabled=true; feedback.textContent='Vérification du PIN…';
      const {data:path,error}=await sb.rpc('authorize_license_view',{p_document_id:licenseGate.dataset.id,p_pin:pin});
      licenseGate.querySelector('input').value='';
      if(error){feedback.textContent='PIN incorrect, verrouillé ou document indisponible.';submitButton.disabled=false;return;}
      const {data:signed,error:signError}=await sb.storage.from('client-documents').createSignedUrl(path,300);
      if(signError){feedback.textContent='Licence inaccessible.';submitButton.disabled=false;return;}
      feedback.textContent='Accès autorisé et inscrit au journal de sécurité.'; window.open(signed.signedUrl,'_blank','noopener'); submitButton.disabled=false; return;
    }
    const approvalGate=event.target.closest('.member-approval-gate');
    if(approvalGate){
      event.preventDefault();
      const pin=approvalGate.querySelector('input').value.trim(); const feedback=approvalGate.querySelector('.approval-status'); const submitButton=approvalGate.querySelector('button[type="submit"]');
      if(!/^\d{4}$/.test(pin)){feedback.textContent='Entrez un PIN de exactement 4 chiffres.';return;}
      submitButton.disabled=true; feedback.textContent='Vérification du PIN et activation…';
      const {error}=await sb.rpc('approve_member',{p_user_id:approvalGate.dataset.userId,p_pin:pin});
      if(error){feedback.textContent='PIN incorrect, verrouillé ou non configuré. Le membre n’a pas été activé.';submitButton.disabled=false;return;}
      feedback.textContent='Membre approuvé et abonnement activé.'; setTimeout(()=>location.reload(),700); return;
    }
    const messageForm=event.target.closest('.admin-message-form');
    if(messageForm){
      event.preventDefault();
      const textarea=messageForm.querySelector('textarea'); const imageInput=messageForm.querySelector('.admin-message-image'); const feedback=messageForm.querySelector('.message-status'); const body=textarea.value.trim(); const imageFile=imageInput.files[0];
      if((!body&&!imageFile)||!selectedClient){feedback.textContent='Écrivez un message ou ajoutez une image.';return;}
      if(imageFile&&(!['image/jpeg','image/png','image/webp'].includes(imageFile.type)||imageFile.size>10*1024*1024)){feedback.textContent='Choisissez une image JPG, PNG ou WebP de 10 Mo maximum.';return;}
      if(selectedClient.id==='demo'){
        const conversation=messageForm.previousElementSibling; const preview=imageFile?`<img src="${URL.createObjectURL(imageFile)}" alt="Aperçu" style="display:block;max-width:min(100%,520px);max-height:420px;margin:.65rem 0;border-radius:12px;object-fit:contain">`:'';
        conversation.insertAdjacentHTML('beforeend',`<div class="message admin-message"><strong>Alfred-EA</strong>${body?`<p>${escapeHtml(body)}</p>`:''}${preview}<small>À l’instant · démonstration</small></div>`);
        textarea.value=''; imageInput.value=''; feedback.textContent='Message de démonstration — aucune donnée enregistrée.'; return;
      }
      const submitButton=messageForm.querySelector('button'); submitButton.disabled=true; feedback.textContent=imageFile?'Téléversement privé de l’image…':'Envoi…';
      const {data:{user}}=await sb.auth.getUser(); let attachment={};
      if(imageFile){const extension=imageFile.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg'; const path=`${selectedClient.id}/messages/admin-${Date.now()}-${crypto.randomUUID()}.${extension}`; const {error:uploadError}=await sb.storage.from('client-documents').upload(path,imageFile,{contentType:imageFile.type}); if(uploadError){feedback.textContent='L’image n’a pas pu être téléversée.';submitButton.disabled=false;return;} attachment={attachment_path:path,attachment_name:imageFile.name,attachment_mime:imageFile.type};}
      const {error}=await sb.from('messages').insert({client_id:selectedClient.id,sender_id:user.id,body:body||null,...attachment});
      if(error){feedback.textContent='Le message n’a pas pu être envoyé.';submitButton.disabled=false;return;}
      await loadClient(selectedClient); return;
    }
    const gate=event.target.closest('.credential-gate');
    if(!gate) return;
    event.preventDefault();
    const submit=gate.querySelector('button'); const feedback=gate.querySelector('.gate-status'); const pin=gate.querySelector('input').value;
    submit.disabled=true; feedback.textContent='Vérification…';
    if(gate.dataset.demo==='true'){
      const {error}=await sb.rpc('verify_admin_pin',{p_pin:pin});
      if(error){feedback.textContent='PIN incorrect, verrouillé ou non configuré.';submit.disabled=false;return;}
      gate.innerHTML='<div class="account-secret"><strong>Compte 1 · Mot de passe MT5</strong><input type="text" value="DEMO-ONLY-NOT-A-REAL-PASSWORD" readonly><button class="button copy-account-secret" type="button">Copier</button><button class="button hide-account-secret" type="button">Masquer le mot de passe</button><small>Démonstration seulement · le PIN sera requis pour l’afficher de nouveau</small></div>';
      return;
    }
    const {data,error}=await sb.rpc('reveal_mt5_credential',{p_credential_id:gate.dataset.id,p_pin:pin});
    if(error){feedback.textContent='PIN incorrect, verrouillé, ou mot de passe MT5 indisponible.';submit.disabled=false;return;}
    gate.innerHTML=`<div class="account-secret"><strong>Mot de passe MT5 de ce compte</strong><input type="text" value="${escapeHtml(data)}" readonly><button class="button copy-account-secret" type="button">Copier</button><button class="button hide-account-secret" type="button">Masquer le mot de passe</button><small>Consultation journalisée · le PIN sera requis pour l’afficher de nouveau</small></div>`;
  });
  details.addEventListener('click',event=>{
    const cancelApproval=event.target.closest('.cancel-member-approval');
    if(cancelApproval){loadClient(selectedClient);return;}
    const copy=event.target.closest('.copy-account-secret');
    if(copy){navigator.clipboard.writeText(copy.closest('.account-secret').querySelector('input').value);return;}
    const hide=event.target.closest('.hide-account-secret');
    if(!hide)return;
    const gate=hide.closest('.credential-gate');
    const actions=gate.closest('.actions');
    actions.innerHTML=gate.dataset.demo==='true'
      ? '<button class="button demo-reveal">Simuler l’accès administrateur</button>'
      : `<button class="button reveal" data-id="${gate.dataset.id}">Accéder avec mon PIN administrateur</button>`;
  });
  adminPinForm.addEventListener('submit',async event=>{event.preventDefault();const currentInput=document.getElementById('adminCurrentPinInput');const input=document.getElementById('adminPinInput');const currentPin=currentInput.value.trim();const pin=input.value.trim();if(!/^\d{4}$/.test(pin)||(!document.getElementById('currentPinField').hidden&&!/^\d{4}$/.test(currentPin))){adminPinStatus.textContent='Chaque PIN doit contenir exactement 4 chiffres.';return;}const button=adminPinForm.querySelector('button');button.disabled=true;adminPinStatus.textContent='Vérification et enregistrement…';const {error}=await sb.rpc('set_admin_pin',{p_current_pin:currentPin||null,p_new_pin:pin});button.disabled=false;if(error){adminPinStatus.textContent='PIN actuel incorrect, verrouillé ou nouveau PIN invalide.';return;}currentInput.value='';input.value='';document.getElementById('currentPinField').hidden=false;currentInput.required=true;adminPinStatus.textContent='Nouveau PIN administrateur enregistré.';document.getElementById('adminPinHelp').textContent='Entrez votre PIN actuel avant de choisir un nouveau PIN.';});
  mfaGate.addEventListener('click',async event=>{
    const start=event.target.closest('#startMfaEnrollment'); if(!start)return;
    start.disabled=true; mfaSetup.insertAdjacentHTML('beforeend','<p class="status">Création sécurisée du facteur…</p>');
    const {data,error}=await sb.auth.mfa.enroll({factorType:'totp',friendlyName:'Administration Alfred-EA'});
    if(error){mfaSetup.innerHTML='<p class="status">Impossible de commencer la configuration. Déconnectez-vous, reconnectez-vous et réessayez.</p>';return;}
    mfaFactorId=data.id; mfaSetup.replaceChildren();
    const image=document.createElement('img'); image.className='mfa-qr'; image.alt='Code QR pour l’application d’authentification'; image.src=data.totp.qr_code;
    const instruction=document.createElement('p'); instruction.className='muted'; instruction.textContent='Scannez ce code QR, puis entrez le code à 6 chiffres affiché par votre application.';
    const secret=document.createElement('code'); secret.className='mfa-secret'; secret.textContent=`Clé manuelle : ${data.totp.secret}`;
    mfaSetup.append(image,instruction,secret); mfaForm.hidden=false; mfaCode.focus();
  });
  mfaForm.addEventListener('submit',async event=>{
    event.preventDefault(); const code=mfaCode.value.trim(); if(!/^\d{6}$/.test(code)||!mfaFactorId){mfaStatus.textContent='Entrez le code actuel de 6 chiffres.';return;}
    const button=mfaForm.querySelector('button'); button.disabled=true; mfaStatus.textContent='Vérification de la double authentification…';
    const {error}=await sb.auth.mfa.challengeAndVerify({factorId:mfaFactorId,code});
    if(error){mfaStatus.textContent='Code incorrect ou expiré. Attendez le prochain code et réessayez.';button.disabled=false;return;}
    mfaStatus.textContent='Double authentification confirmée. Ouverture…'; location.reload();
  });
  document.getElementById('logout').addEventListener('click',async()=>{await sb.auth.signOut();location.href='client-space.html';});
  summaryMonth.addEventListener('change',()=>loadMonthlySummary(summaryMonth.value));
  init();
})();
