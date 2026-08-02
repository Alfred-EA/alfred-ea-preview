(() => {
  const PROJECT_URL = 'https://lstjmanxzpsnuxonspfc.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_ltaNA7nnVozoSCOcZIjg';
  const sb = window.supabase.createClient(PROJECT_URL, PUBLISHABLE_KEY);
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const layout = document.querySelector('.layout');
  const notice = document.querySelector('.demo-notice');
  notice.innerHTML = '<strong>Connexion sécurisée.</strong> Vos informations sont protégées et chaque client peut uniquement consulter son propre dossier.';

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
    <div class="dashboard-grid">
      <article class="dashboard-card"><span>ABONNEMENT</span><strong id="membershipPlan">Chargement…</strong><p id="membershipStatus">—</p></article>
      <article class="dashboard-card"><span>FACTURES</span><strong id="invoiceCount">0</strong><p>Documents disponibles</p></article>
      <article class="dashboard-card"><span>DOCUMENTS</span><strong id="documentCount">0</strong><p>Fichiers privés</p></article>
    </div>
    <div class="dashboard-columns">
      <article class="dashboard-panel"><h2>Messages privés</h2><div class="message-list" id="messageList"><p>Aucun message.</p></div><form id="messageForm" class="message-form"><textarea id="messageBody" maxlength="5000" placeholder="Écrire un message à Alfred-EA" required></textarea><button class="submit" type="submit">Envoyer</button></form></article>
      <article class="dashboard-panel"><h2>Mes factures</h2><div id="invoiceList"><p>Aucune facture disponible.</p></div><h2 class="section-space">Mes documents</h2><div id="documentList"><p>Aucun document disponible.</p></div></article>
    </div>`;
  document.querySelector('.page').appendChild(dashboard);

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

  async function loadDashboard(user) {
    layout.hidden = true;
    dashboard.hidden = false;
    const [profileResult, membershipResult, messagesResult, invoicesResult, documentsResult] = await Promise.all([
      sb.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
      sb.from('memberships').select('plan_name,status,renews_on').eq('user_id', user.id).maybeSingle(),
      sb.from('messages').select('body,created_at,sender_id').eq('client_id', user.id).order('created_at', { ascending: true }),
      sb.from('invoices').select('invoice_number,description,amount_cents,currency,status,issued_on').eq('client_id', user.id).order('created_at', { ascending: false }),
      sb.from('documents').select('display_name,category,created_at').eq('client_id', user.id).order('created_at', { ascending: false })
    ]);
    document.getElementById('welcomeName').textContent = `Bonjour, ${profileResult.data?.full_name || user.email}`;
    document.getElementById('membershipPlan').textContent = membershipResult.data?.plan_name || 'À confirmer';
    document.getElementById('membershipStatus').textContent = membershipResult.data?.status || 'En attente';
    document.getElementById('invoiceCount').textContent = String(invoicesResult.data?.length || 0);
    document.getElementById('documentCount').textContent = String(documentsResult.data?.length || 0);
    const messageList = document.getElementById('messageList');
    messageList.replaceChildren();
    (messagesResult.data || []).forEach(message => addTextRow(messageList, message.body, new Date(message.created_at).toLocaleString('fr-CA')));
    if (!messagesResult.data?.length) messageList.innerHTML = '<p>Aucun message.</p>';
    const invoiceList = document.getElementById('invoiceList');
    invoiceList.replaceChildren();
    (invoicesResult.data || []).forEach(invoice => addTextRow(invoiceList, invoice.invoice_number, `${(invoice.amount_cents / 100).toLocaleString('fr-CA', { style: 'currency', currency: invoice.currency })} · ${invoice.status}`));
    if (!invoicesResult.data?.length) invoiceList.innerHTML = '<p>Aucune facture disponible.</p>';
    const documentList = document.getElementById('documentList');
    documentList.replaceChildren();
    (documentsResult.data || []).forEach(document => addTextRow(documentList, document.display_name, document.category));
    if (!documentsResult.data?.length) documentList.innerHTML = '<p>Aucun document disponible.</p>';
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const { error } = await sb.auth.signInWithPassword({ email: document.getElementById('loginEmail').value, password: document.getElementById('loginPassword').value });
    if (error) status('loginStatus', error.message, true);
  });

  signupForm.addEventListener('submit', async event => {
    event.preventDefault();
    const { error } = await sb.auth.signUp({ email: document.getElementById('signupEmail').value, password: document.getElementById('signupPassword').value, options: { data: { full_name: document.getElementById('signupName').value.trim() } } });
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
    if (event.target.id !== 'messageForm') return;
    event.preventDefault();
    const { data: { user } } = await sb.auth.getUser();
    const body = document.getElementById('messageBody').value.trim();
    if (!user || !body) return;
    const { error } = await sb.from('messages').insert({ client_id: user.id, sender_id: user.id, body });
    if (!error) { document.getElementById('messageBody').value = ''; await loadDashboard(user); }
  });
  document.getElementById('logoutButton').addEventListener('click', () => sb.auth.signOut());
  sb.auth.onAuthStateChange((_event, session) => session?.user ? loadDashboard(session.user) : (dashboard.hidden = true, layout.hidden = false));
  sb.auth.getSession().then(({ data }) => data.session?.user && loadDashboard(data.session.user));
})();
