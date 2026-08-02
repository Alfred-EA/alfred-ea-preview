(() => {
  const sb = window.supabase.createClient('https://lstjmanxzpsnuxonspfc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdGptYW54enBzbnV4b25zcGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NzAxNjMsImV4cCI6MjEwMTI0NjE2M30.BVjCyTVWsODT6cpRKCSak5PI5a_4uhxifHP5z_ScqO8');
  const status = document.getElementById('status');
  const grid = document.getElementById('adminGrid');
  const clients = document.getElementById('clients');
  const details = document.getElementById('clientDetails');

  const row = (title, subtitle, actions = '') => `<div class="row"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(subtitle || '')}</small>${actions}</div>`;
  const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));

  function loadDemoClient() {
    document.getElementById('clientTitle').textContent = 'Client Démo';
    details.innerHTML = `
      <p class="muted">DOSSIER DE DÉMONSTRATION · AUCUNE DONNÉE RÉELLE</p>
      <div class="section"><h2>Abonnement</h2>${row('Niveau 3', 'Actif · Renouvellement le 15 septembre 2026')}</div>
      <div class="section"><h2>Comptes MT5</h2>
        ${row('Compte 1 · STARTRADER', '12345678 · STARTRADER-Live', '<div class="actions"><button class="button demo-reveal">Simuler l’accès administrateur</button></div>')}
        ${row('Compte 2 · Vantage Markets (USA only)', '87654321 · VantageInternational-Live', '<small>Aucun mot de passe temporaire disponible</small>')}
      </div>
      <div class="section"><h2>Documents privés</h2>
        ${row('Permis de conduire — recto', 'drivers_license_front', '<small>Document fictif</small>')}
        ${row('Permis de conduire — verso', 'drivers_license_back', '<small>Document fictif</small>')}
      </div>`;
  }

  async function loadClient(client) {
    document.getElementById('clientTitle').textContent = client.full_name || 'Client';
    details.innerHTML = '<p class="muted">Chargement…</p>';
    const [accounts, documents, credentials, membership] = await Promise.all([
      sb.from('mt5_accounts').select('slot,broker,server_name,account_number').eq('user_id', client.id).order('slot'),
      sb.from('documents').select('id,display_name,category,storage_path').eq('client_id', client.id).order('created_at', {ascending:false}),
      sb.from('mt5_credentials').select('id,slot,expires_at,created_at').eq('user_id', client.id).order('slot'),
      sb.from('memberships').select('plan_name,status,renews_on').eq('user_id', client.id).maybeSingle()
    ]);
    let html = `<p class="muted">Dossier ${escapeHtml(client.id)}</p><div class="section"><h2>Abonnement</h2>${row(membership.data?.plan_name || 'À confirmer', membership.data?.status || 'En attente')}</div><div class="section"><h2>Comptes MT5</h2>`;
    html += (accounts.data || []).map(account => {
      const credential = (credentials.data || []).find(item => item.slot === account.slot);
      const action = credential ? `<div class="actions"><button class="button reveal" data-id="${credential.id}">Accéder avec mon mot de passe administrateur · expire ${new Date(credential.expires_at).toLocaleString('fr-CA')}</button></div>` : '<small>Aucun mot de passe temporaire disponible</small>';
      return row(`Compte ${account.slot} · ${account.broker}`, `${account.account_number} · ${account.server_name || 'Serveur non indiqué'}`, action);
    }).join('') || '<p class="muted">Aucun compte enregistré.</p>';
    html += '</div><div class="section"><h2>Documents privés</h2>';
    html += (documents.data || []).map(document => row(document.display_name, document.category, `<div class="actions"><button class="button open-document" data-path="${escapeHtml(document.storage_path)}">Ouvrir</button></div>`)).join('') || '<p class="muted">Aucun document.</p>';
    details.innerHTML = html + '</div>';
  }

  async function init() {
    const {data:{session}} = await sb.auth.getSession();
    if (!session) { location.href = 'client-space.html'; return; }
    const {data:admin} = await sb.from('admin_users').select('user_id').eq('user_id', session.user.id).maybeSingle();
    if (!admin) { status.textContent = 'Accès refusé. Ce compte n’est pas administrateur.'; return; }
    const {data:profiles, error} = await sb.from('profiles').select('id,full_name,created_at').order('created_at', {ascending:false});
    if (error) { status.textContent = 'Impossible de charger les dossiers.'; return; }
    status.hidden = true; grid.hidden = false; clients.replaceChildren();
    const demoButton=document.createElement('button'); demoButton.className='client demo-client'; demoButton.innerHTML='Client Démo<small>Aperçu administrateur · aucune donnée réelle</small>'; demoButton.addEventListener('click',loadDemoClient); clients.appendChild(demoButton);
    profiles.forEach(profile => { const button=document.createElement('button'); button.className='client'; button.innerHTML=`${escapeHtml(profile.full_name || 'Client')}<small>${escapeHtml(profile.id)}</small>`; button.addEventListener('click',()=>loadClient(profile)); clients.appendChild(button); });
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
