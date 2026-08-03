(() => {
  const PROJECT_URL = 'https://lstjmanxzpsnuxonspfc.supabase.co';
  const PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdGptYW54enBzbnV4b25zcGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NzAxNjMsImV4cCI6MjEwMTI0NjE2M30.BVjCyTVWsODT6cpRKCSak5PI5a_4uhxifHP5z_ScqO8';
  const sb = window.supabase.createClient(PROJECT_URL, PUBLISHABLE_KEY);
  const params = new URLSearchParams(location.search);
  const requestedReturn = params.get('return');
  const safeReturn = requestedReturn === 'broker-account.html' ? requestedReturn : null;
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const layout = document.querySelector('.layout');
  const notice = document.querySelector('.demo-notice');
  notice.innerHTML = '<strong>Connexion sécurisée.</strong> Vos informations sont protégées et chaque client peut uniquement consulter son propre dossier.';
  let demoMode = false;
  const demoButton = document.createElement('button');
  demoButton.type = 'button';
  demoButton.className = 'dashboard-action demo-access';
  demoButton.textContent = 'Voir le tableau de bord démo';
  notice.insertAdjacentElement('afterend', demoButton);

  const status = (id, message, error = false) => {
    const element = document.getElementById(id);
    element.hidden = false;
    element.textContent = message;
    element.style.color = error ? '#ff9f9f' : 'var(--gold2)';
  };

  const dashboard = document.createElement('section');
  dashboard.className = 'client-dashboard';
  dashboard.hidden = true;
  dashboard.innerHTML = `
    <div class="dashboard-head"><div><div class="eyebrow">ESPACE SÉCURISÉ</div><h1 id="welcomeName">Bonjour</h1></div><button class="dashboard-action" id="logoutButton" type="button">Déconnexion</button></div>
    <div class="ea-performance"><div class="performance-title">PERFORMANCE EA LIVE</div><div class="performance-stat"><span>Semaine</span><strong id="clientFxWeek">--</strong></div><div class="performance-stat"><span>Mois</span><strong id="clientFxMonth">--</strong></div><div class="performance-stat"><span>Depuis ouverture</span><strong id="clientFxTotal">--</strong></div></div>
    <div class="dashboard-grid">
      <article class="dashboard-card"><span>ABONNEMENT</span><strong id="membershipPlan">Chargement…</strong><p id="membershipStatus">—</p></article>
      <article class="dashboard-card"><span>FACTURES</span><strong id="invoiceCount">0</strong><p>Documents disponibles</p></article>
      <article class="dashboard-card"><span>DOCUMENTS</span><strong id="documentCount">0</strong><p>Fichiers privés</p></article>
    </div>
    <div class="dashboard-columns">
      <article class="dashboard-panel"><h2>Discussion avec Alfred-EA</h2><p class="chat-note">Vos messages restent dans votre dossier privé et sont visibles par l’équipe administratrice.</p><div class="message-list chat-list" id="messageList"><p>Aucun message.</p></div><form id="messageForm" class="message-form"><textarea id="messageBody" maxlength="5000" placeholder="Écrire un message privé à Alfred-EA" required></textarea><button class="submit" type="submit">Envoyer le message</button></form></article>
      <article class="dashboard-panel"><h2>Mes factures</h2><div id="invoiceList"><p>Aucune facture disponible.</p></div><h2 class="section-space">Mes documents</h2><div id="documentList"><p>Aucun document disponible.</p></div></article>
    </div>
    <div class="secure-sections">
      <article class="dashboard-panel"><h2>Mes comptes MT5</h2><p class="security-note">Enregistrez jusqu’à cinq comptes. Le mot de passe est chiffré, expire après 24 heures et chaque consultation exige une nouvelle authentification administrateur.</p><form id="mt5Form" class="secure-form"><div id="mt5Rows"></div><button class="submit" type="submit">Enregistrer et transmettre</button><p class="form-feedback" id="mt5Status" role="status"></p></form></article>
      <article class="dashboard-panel"><h2>Permis de conduire</h2><p class="security-note">Téléversement privé — JPG, PNG, WebP ou PDF, maximum 10 Mo par fichier.</p><form id="licenseForm" class="secure-form"><div class="upload-grid"><div class="upload-box"><label for="licenseFront">Recto du permis</label><input id="licenseFront" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required></div><div class="upload-box"><label for="licenseBack">Verso du permis</label><input id="licenseBack" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required></div></div><button class="submit" type="submit">Enregistrer mon permis</button><p class="form-feedback" id="licenseStatus" role="status"></p></form></article>
    </div>`;
  document.querySelector('.page').appendChild(dashboard);

  function displayClientFx() {
    const account = (document.MTIntelligenceAccounts || []).find(item => item.userid === 'CQIPKZ');
    if (!account) return;
    const percent = value => `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`;
    document.getElementById('clientFxWeek').textContent = percent(account.weeklyBankedGrowth);
    document.getElementById('clientFxMonth').textContent = percent(account.monthlyBankedGrowth);
    document.getElementById('clientFxTotal').textContent = percent(account.totalBankedGrowth);
  }
  function refreshClientFx() {
    const script = document.createElement('script');
    script.src = `https://www.fxblue.com/users/CQIPKZ/overviewscript?t=${Date.now()}`;
    script.onload = displayClientFx;
    document.head.appendChild(script);
  }
  displayClientFx();
  setTimeout(displayClientFx, 800);
  setInterval(refreshClientFx, 60000);

  const brokers = ['Choisir un courtier', 'STARTRADER', 'Vantage Markets (USA only)', 'PU Prime', 'Axi', 'VT Markets', 'Ultima Markets'];
  const mt5Rows = document.getElementById('mt5Rows');
  for (let slot = 1; slot <= 5; slot += 1) {
    const row = document.createElement('div');
    row.className = 'mt5-row';
    row.innerHTML = `<div class="mt5-slot">Compte ${slot}</div><div class="compact-field"><label for="broker${slot}">Courtier</label><select id="broker${slot}">${brokers.map((broker, index) => `<option value="${index ? broker : ''}">${broker}</option>`).join('')}</select></div><div class="compact-field"><label for="server${slot}">Serveur MT5</label><input id="server${slot}" maxlength="160" placeholder="Ex. Broker-Live01"></div><div class="compact-field"><label for="account${slot}">Numéro de compte</label><input id="account${slot}" inputmode="numeric" pattern="[0-9]{3,30}" maxlength="30" placeholder="Ex. 12345678"></div><div class="compact-field"><label for="mt5Password${slot}">Mot de passe requis (transmission unique)</label><input id="mt5Password${slot}" type="password" autocomplete="off" minlength="4" maxlength="128" placeholder="Requis pour ce compte"></div>`;
    mt5Rows.appendChild(row);
  }

  const addTextRow = (container, primary, secondary) => {
    const row = document.createElement('div');
    row.className = 'data-row';
    const strong = document.createElement('strong');
    strong.textContent = primary;
    const small = document.createElement('small');
    small.textContent = secondary;
    row.append(strong, small);
    container.appendChild(row);
  };

  const addMessageBubble = (container, body, meta, own = false) => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${own ? 'chat-own' : 'chat-admin'}`;
    const message = document.createElement('p');
    message.textContent = body;
    const small = document.createElement('small');
    small.textContent = meta;
    bubble.append(message, small);
    container.appendChild(bubble);
  };

  function showDemoDashboard() {
    demoMode = true;
    layout.hidden = true;
    dashboard.hidden = false;
    dashboard.classList.add('demo-dashboard');
    document.getElementById('welcomeName').textContent = 'Bonjour, Admin 1';
    document.getElementById('membershipPlan').textContent = 'Niveau 3';
    document.getElementById('membershipStatus').textContent = 'Actif · Renouvellement le 15 septembre 2026';
    document.getElementById('invoiceCount').textContent = '2';
    document.getElementById('documentCount').textContent = '3';
    const messageList = document.getElementById('messageList');
    messageList.replaceChildren();
    addMessageBubble(messageList, 'Bienvenue dans votre Espace client Alfred-EA.', 'Équipe Alfred-EA · Aujourd’hui');
    addMessageBubble(messageList, 'Votre abonnement est actif et votre dossier est à jour.', 'Équipe Alfred-EA · Aujourd’hui');
    const invoiceList = document.getElementById('invoiceList');
    invoiceList.replaceChildren();
    addTextRow(invoiceList, 'AE-2026-002', '60,00 $ CA · Payée');
    addTextRow(invoiceList, 'AE-2026-001', '60,00 $ CA · Payée');
    const documentList = document.getElementById('documentList');
    documentList.replaceChildren();
    addTextRow(documentList, 'Convention de service', 'Contrat');
    addTextRow(documentList, 'Confirmation du compte courtier', 'Compte');
    addTextRow(documentList, 'Guide de démarrage', 'Information');
  }
  demoButton.addEventListener('click', showDemoDashboard);

  async function loadDashboard(user) {
    layout.hidden = true;
    dashboard.hidden = false;
    const [profileResult, membershipResult, messagesResult, invoicesResult, documentsResult, mt5Result] = await Promise.all([
      sb.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
      sb.from('memberships').select('plan_name,status,renews_on').eq('user_id', user.id).maybeSingle(),
      sb.from('messages').select('body,created_at,sender_id').eq('client_id', user.id).order('created_at', { ascending: true }),
      sb.from('invoices').select('invoice_number,description,amount_cents,currency,status,issued_on').eq('client_id', user.id).order('created_at', { ascending: false }),
      sb.from('documents').select('id,display_name,category,storage_path,created_at').eq('client_id', user.id).order('created_at', { ascending: false }),
      sb.from('mt5_accounts').select('slot,broker,server_name,account_number').eq('user_id', user.id).order('slot')
    ]);
    document.getElementById('welcomeName').textContent = `Bonjour, ${profileResult.data?.full_name || user.email}`;
    document.getElementById('membershipPlan').textContent = membershipResult.data?.plan_name || 'À confirmer';
    document.getElementById('membershipStatus').textContent = membershipResult.data?.status || 'En attente';
    document.getElementById('invoiceCount').textContent = String(invoicesResult.data?.length || 0);
    document.getElementById('documentCount').textContent = String(documentsResult.data?.length || 0);
    const messageList = document.getElementById('messageList');
    messageList.replaceChildren();
    (messagesResult.data || []).forEach(message => addMessageBubble(messageList, message.body, `${message.sender_id === user.id ? 'Vous' : 'Alfred-EA'} · ${new Date(message.created_at).toLocaleString('fr-CA')}`, message.sender_id === user.id));
    if (!messagesResult.data?.length) messageList.innerHTML = '<p>Aucun message.</p>';
    const invoiceList = document.getElementById('invoiceList');
    invoiceList.replaceChildren();
    (invoicesResult.data || []).forEach(invoice => addTextRow(invoiceList, invoice.invoice_number, `${(invoice.amount_cents / 100).toLocaleString('fr-CA', { style: 'currency', currency: invoice.currency })} · ${invoice.status}`));
    if (!invoicesResult.data?.length) invoiceList.innerHTML = '<p>Aucune facture disponible.</p>';
    const documentList = document.getElementById('documentList');
    documentList.replaceChildren();
    (documentsResult.data || []).forEach(item => {
      addTextRow(documentList, item.display_name, item.category);
      if (item.category.startsWith('drivers_license_')) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'document-delete';
        button.textContent = 'Supprimer';
        button.dataset.documentId = item.id;
        button.dataset.storagePath = item.storage_path;
        documentList.lastElementChild.appendChild(button);
      }
    });
    if (!documentsResult.data?.length) documentList.innerHTML = '<p>Aucun document disponible.</p>';
    for (let slot = 1; slot <= 5; slot += 1) {
      const account = (mt5Result.data || []).find(item => item.slot === slot);
      document.getElementById(`broker${slot}`).value = account?.broker || '';
      document.getElementById(`server${slot}`).value = account?.server_name || '';
      document.getElementById(`account${slot}`).value = account?.account_number || '';
    }
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const { error } = await sb.auth.signInWithPassword({ email: document.getElementById('loginEmail').value, password: document.getElementById('loginPassword').value });
    if (error) status('loginStatus', error.message, true);
  });

  signupForm.addEventListener('submit', async event => {
    event.preventDefault();
    const { error } = await sb.auth.signUp({
      email: document.getElementById('signupEmail').value,
      password: document.getElementById('signupPassword').value,
      options: {
        emailRedirectTo: location.href.split('#')[0],
        data: { full_name: document.getElementById('signupName').value.trim() }
      }
    });
    status('signupStatus', error ? error.message : 'Vérifiez votre courriel pour confirmer votre compte.', !!error);
  });

  document.querySelector('[data-demo]').addEventListener('click', async event => {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    if (!email) return status('loginStatus', 'Entrez d’abord votre adresse courriel.', true);
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    status('loginStatus', error ? error.message : 'Un courriel de réinitialisation a été envoyé.', !!error);
  });

  dashboard.addEventListener('submit', async event => {
    if (event.target.id === 'mt5Form') {
      event.preventDefault();
      if (demoMode) return document.getElementById('mt5Status').textContent = 'Aperçu : les informations ne sont pas enregistrées en mode démo.';
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const accounts = [];
      for (let slot = 1; slot <= 5; slot += 1) {
        const broker = document.getElementById(`broker${slot}`).value;
        const server_name = document.getElementById(`server${slot}`).value.trim();
        const account_number = document.getElementById(`account${slot}`).value.trim();
        const mt5_password = document.getElementById(`mt5Password${slot}`).value;
        if (!broker && !server_name && !account_number) continue;
        if (!broker || !/^[0-9]{3,30}$/.test(account_number)) return document.getElementById('mt5Status').textContent = `Vérifiez le courtier et le numéro du compte ${slot}.`;
        if (mt5_password.length < 4) return document.getElementById('mt5Status').textContent = `Le mot de passe MT5 est requis pour le compte ${slot}.`;
        accounts.push({ user_id: user.id, slot, broker, server_name: server_name || null, account_number, updated_at: new Date().toISOString() });
      }
      const { error: deleteError } = await sb.from('mt5_accounts').delete().eq('user_id', user.id);
      const { error: insertError } = !deleteError && accounts.length ? await sb.from('mt5_accounts').insert(accounts) : { error: null };
      if (deleteError || insertError) { document.getElementById('mt5Status').textContent = 'Impossible d’enregistrer pour le moment.'; return; }
      for (let slot = 1; slot <= 5; slot += 1) {
        const passwordInput = document.getElementById(`mt5Password${slot}`);
        if (!passwordInput.value) continue;
        const { error: credentialError } = await sb.rpc('submit_mt5_credential', { p_slot: slot, p_password: passwordInput.value });
        passwordInput.value = '';
        if (credentialError) { document.getElementById('mt5Status').textContent = `Comptes enregistrés, mais le mot de passe du compte ${slot} n’a pas été transmis.`; return; }
      }
      document.getElementById('mt5Status').textContent = 'Vos comptes sont enregistrés. Tout mot de passe fourni expirera dans 24 heures et chaque consultation administrateur sera vérifiée et journalisée.';
      return;
    }
    if (event.target.id === 'licenseForm') {
      event.preventDefault();
      if (demoMode) return document.getElementById('licenseStatus').textContent = 'Aperçu : aucun document n’est téléversé en mode démo.';
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const files = [['front', document.getElementById('licenseFront').files[0], 'Permis de conduire — recto'], ['back', document.getElementById('licenseBack').files[0], 'Permis de conduire — verso']];
      if (files.some(([, file]) => !file || file.size > 10485760)) return document.getElementById('licenseStatus').textContent = 'Sélectionnez deux fichiers de 10 Mo maximum.';
      document.getElementById('licenseStatus').textContent = 'Téléversement en cours…';
      for (const [side, file, displayName] of files) {
        const extension = (file.name.split('.').pop() || 'bin').toLowerCase();
        const path = `${user.id}/identity/license-${side}-${Date.now()}.${extension}`;
        const { error: uploadError } = await sb.storage.from('client-documents').upload(path, file, { contentType: file.type });
        if (uploadError) return document.getElementById('licenseStatus').textContent = 'Le téléversement a échoué. Réessayez.';
        const { error: recordError } = await sb.from('documents').insert({ client_id: user.id, uploaded_by: user.id, category: `drivers_license_${side}`, display_name: displayName, storage_path: path });
        if (recordError) return document.getElementById('licenseStatus').textContent = 'Le document a été reçu, mais son dossier doit être vérifié.';
      }
      event.target.reset();
      document.getElementById('licenseStatus').textContent = 'Votre permis a été enregistré de façon privée.';
      await loadDashboard(user);
      return;
    }
    if (event.target.id !== 'messageForm') return;
    event.preventDefault();
    const body = document.getElementById('messageBody').value.trim();
    if (demoMode) {
      if (body) addMessageBubble(document.getElementById('messageList'), body, 'Vous · Démonstration', true);
      document.getElementById('messageBody').value = '';
      return;
    }
    const { data: { user } } = await sb.auth.getUser();
    if (!user || !body) return;
    const { error } = await sb.from('messages').insert({ client_id: user.id, sender_id: user.id, body });
    if (!error) { document.getElementById('messageBody').value = ''; await loadDashboard(user); }
  });
  dashboard.addEventListener('click', async event => {
    const button = event.target.closest('.document-delete');
    if (!button || demoMode) return;
    if (!confirm('Supprimer définitivement ce document?')) return;
    button.disabled = true;
    const { error: storageError } = await sb.storage.from('client-documents').remove([button.dataset.storagePath]);
    if (storageError) { button.disabled = false; return alert('La suppression a échoué.'); }
    const { error: recordError } = await sb.from('documents').delete().eq('id', button.dataset.documentId);
    if (recordError) return alert('Le fichier a été supprimé, mais le dossier doit être actualisé.');
    const { data: { user } } = await sb.auth.getUser();
    if (user) await loadDashboard(user);
  });
  document.getElementById('logoutButton').addEventListener('click', () => demoMode ? location.reload() : sb.auth.signOut());
  async function routeSignedInUser(user) {
    const {data:admin} = await sb.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
    if (admin) { location.replace('admin.html'); return; }
    if (safeReturn) { location.replace(safeReturn); return; }
    await loadDashboard(user);
  }
  if (params.get('mode') === 'signup') document.getElementById('signupTab').click();
  sb.auth.onAuthStateChange((_event, session) => session?.user ? routeSignedInUser(session.user) : (dashboard.hidden = true, layout.hidden = false));
  sb.auth.getSession().then(({ data }) => data.session?.user && routeSignedInUser(data.session.user));
})();
