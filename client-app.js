(() => {
  const PROJECT_URL = 'https://lstjmanxzpsnuxonspfc.supabase.co';
  const PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdGptYW54enBzbnV4b25zcGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NzAxNjMsImV4cCI6MjEwMTI0NjE2M30.BVjCyTVWsODT6cpRKCSak5PI5a_4uhxifHP5z_ScqO8';
  const sb = window.supabase.createClient(PROJECT_URL, PUBLISHABLE_KEY);
  const params = new URLSearchParams(location.search);
  const authHash = new URLSearchParams(location.hash.slice(1));
  let emailChangeReturn = authHash.get('type') === 'email_change' || params.get('type') === 'email_change';
  const requestedReturn = params.get('return');
  const safeReturn = ['broker-account.html', 'subscription.html'].includes(requestedReturn) ? requestedReturn : null;
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const layout = document.querySelector('.layout');
  let recoveryMode = location.hash.includes('type=recovery') || params.get('type') === 'recovery';
  const notice = document.querySelector('.demo-notice');
  notice.innerHTML = '<strong>Connexion sécurisée.</strong> Vos informations sont protégées et chaque client peut uniquement consulter son propre dossier.';
  let demoMode = false;

  const status = (id, message, error = false) => {
    const element = document.getElementById(id);
    element.hidden = false;
    element.textContent = message;
    element.style.color = error ? '#ff9f9f' : 'var(--gold2)';
  };
  const invoiceLogoSource = fetch('index.html').then(response => response.text()).then(html => html.match(/<img class="hat" src="([^"]+)"/)?.[1] || null).catch(() => null);

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
      <article class="dashboard-panel"><h2>Discussion avec Alfred-EA</h2><p class="chat-note">Vos messages restent dans votre dossier privé et sont visibles par l’équipe administratrice.</p><div class="message-list chat-list" id="messageList"><p>Aucun message.</p></div><form id="messageForm" class="message-form"><textarea id="messageBody" maxlength="5000" placeholder="Écrire un message privé à Alfred-EA"></textarea><label class="message-image-picker">Ajouter une image privée (JPG, PNG ou WebP · 10 Mo max.)<input id="messageImage" type="file" accept="image/jpeg,image/png,image/webp"></label><button class="submit" type="submit">Envoyer le message</button><p id="messageStatus" class="document-upload-status"></p></form></article>
      <article class="dashboard-panel"><h2>Mes factures</h2><div id="invoiceList"><p>Aucune facture disponible.</p></div><div class="subscription-manage-panel"><p>Gérez votre paiement ou votre abonnement directement dans le portail Stripe sécurisé.</p><button class="subscription-payment" id="paymentMethodButton" type="button">Enregistrer ou modifier mon mode de paiement</button><button class="subscription-cancel" id="cancelSubscriptionButton" type="button">Gérer ou annuler mon abonnement</button><a class="subscription-link" id="subscriptionLevelsLink" href="subscription.html" hidden>Choisir un abonnement</a><p id="subscriptionEligibilityMessage">Ajoutez d’abord un compte courtier actif pour choisir un abonnement.</p><p id="subscriptionManageStatus">Stripe confirme immédiatement les modifications effectuées.</p></div><h2 class="section-space">Mes documents</h2><div id="documentList"><p>Aucun document disponible.</p></div></article>
    </div>
    <div class="secure-sections">
      <article class="dashboard-panel"><h2>Mes comptes MT5</h2><p class="security-note">Enregistrez jusqu’à cinq comptes. Le mot de passe est chiffré et chaque consultation exige une nouvelle authentification administrateur.</p><form id="mt5Form" class="secure-form"><div id="mt5Rows"></div><button class="submit" type="submit">Enregistrer et transmettre</button><p class="form-feedback" id="mt5Status" role="status"></p></form></article>
      <article class="dashboard-panel"><h2>Permis de conduire</h2><p class="security-note">Téléversement privé — JPG, PNG, WebP ou PDF, maximum 10 Mo par fichier.</p><form id="licenseForm" class="secure-form"><div class="upload-grid"><div class="upload-box"><label for="licenseFront">Recto du permis</label><input id="licenseFront" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required></div><div class="upload-box"><label for="licenseBack">Verso du permis</label><input id="licenseBack" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required></div></div><button class="submit" type="submit">Enregistrer mon permis</button><p class="form-feedback" id="licenseStatus" role="status"></p></form></article>
      <article class="dashboard-panel account-settings-panel"><h2>Paramètres de connexion</h2><p class="security-note">Confirmez votre mot de passe actuel avant de modifier votre adresse courriel ou votre mot de passe.</p><form id="accountSettingsForm" class="secure-form"><div class="settings-grid"><div class="compact-field"><label for="settingsEmail">Nouvelle adresse courriel</label><input id="settingsEmail" type="email" autocomplete="email"></div><div class="compact-field"><label for="settingsCurrentPassword">Mot de passe actuel</label><input id="settingsCurrentPassword" type="password" autocomplete="current-password" required></div><div class="compact-field"><label for="settingsNewPassword">Nouveau mot de passe</label><input id="settingsNewPassword" type="password" autocomplete="new-password" minlength="10" placeholder="Laisser vide pour conserver"></div><div class="compact-field"><label for="settingsConfirmPassword">Confirmer le nouveau mot de passe</label><input id="settingsConfirmPassword" type="password" autocomplete="new-password" minlength="10"></div></div><button class="submit" type="submit">Enregistrer mes changements</button><p class="form-feedback" id="accountSettingsStatus" role="status"></p></form></article>
    </div>`;
  document.querySelector('.page').appendChild(dashboard);
  const setupMobilePanels = () => {
    dashboard.querySelectorAll('.dashboard-columns > .dashboard-panel, .secure-sections > .dashboard-panel').forEach((panel, index) => {
      const heading = panel.querySelector(':scope > h2');
      if (!heading || panel.classList.contains('mobile-collapsible')) return;
      const content = document.createElement('div');
      content.className = 'mobile-panel-content';
      while (heading.nextSibling) content.appendChild(heading.nextSibling);
      const toggle = document.createElement('button');
      toggle.className = 'mobile-panel-toggle';
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', `mobilePanel${index}`);
      toggle.innerHTML = `<span>${heading.textContent}</span>`;
      content.id = `mobilePanel${index}`;
      content.hidden = true;
      heading.replaceWith(toggle);
      panel.appendChild(content);
      panel.classList.add('mobile-collapsible');
      toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(open));
        content.hidden = !open;
      });
    });
    const syncPanels = () => {
      const mobile = matchMedia('(max-width:700px)').matches;
      dashboard.querySelectorAll('.mobile-collapsible').forEach(panel => {
        const toggle = panel.querySelector(':scope > .mobile-panel-toggle');
        const content = panel.querySelector(':scope > .mobile-panel-content');
        if (!mobile) content.hidden = false;
        else content.hidden = toggle.getAttribute('aria-expanded') !== 'true';
      });
    };
    syncPanels();
    addEventListener('resize', syncPanels);
  };
  setupMobilePanels();

  const recoveryPanel = document.createElement('section');
  recoveryPanel.className = 'auth-card password-recovery-panel';
  recoveryPanel.hidden = true;
  recoveryPanel.innerHTML = `<div class="eyebrow">RÉCUPÉRATION DU COMPTE</div><h1>Choisir un nouveau mot de passe</h1><p>Entrez un nouveau mot de passe sécurisé pour votre compte Alfred-EA.</p><form id="recoveryForm" class="form"><div class="field"><label for="recoveryPassword">Nouveau mot de passe</label><input id="recoveryPassword" type="password" autocomplete="new-password" minlength="12" required></div><div class="field"><label for="recoveryPasswordConfirm">Confirmer le nouveau mot de passe</label><input id="recoveryPasswordConfirm" type="password" autocomplete="new-password" minlength="12" required></div><button class="submit" type="submit">Enregistrer le nouveau mot de passe</button><p class="status" id="recoveryStatus" hidden></p></form>`;
  document.querySelector('.page').appendChild(recoveryPanel);

  const showRecoveryPanel = () => {
    recoveryMode = true;
    layout.hidden = true;
    dashboard.hidden = true;
    recoveryPanel.hidden = false;
    document.getElementById('recoveryPassword').focus();
  };

  document.getElementById('recoveryForm').addEventListener('submit', async event => {
    event.preventDefault();
    const password = document.getElementById('recoveryPassword').value;
    const confirmation = document.getElementById('recoveryPasswordConfirm').value;
    const feedback = document.getElementById('recoveryStatus');
    feedback.hidden = false;
    if (password.length < 12 || password !== confirmation) {
      feedback.textContent = 'Le mot de passe doit contenir au moins 12 caractères et les deux champs doivent correspondre.';
      feedback.style.color = '#ff9f9f';
      return;
    }
    const submit = event.currentTarget.querySelector('button[type="submit"]');
    submit.disabled = true;
    feedback.textContent = 'Enregistrement sécurisé…';
    feedback.style.color = 'var(--gold2)';
    const { error } = await sb.auth.updateUser({ password });
    if (error) {
      submit.disabled = false;
      feedback.textContent = error.message;
      feedback.style.color = '#ff9f9f';
      return;
    }
    feedback.textContent = 'Mot de passe modifié. Vous pouvez maintenant vous reconnecter.';
    await sb.auth.signOut();
    setTimeout(() => location.replace('client-space.html'), 1000);
  });

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

  const brokers = ['Choisir un courtier', 'STARTRADER', 'Vantage Markets (USA only)', 'PU Prime', 'Axi', 'VT Markets'];
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

  const addInvoiceCard = (container, invoice, collapsed = false) => {
    const card = document.createElement('article');
    card.className = 'invoice-card';
    const header = document.createElement('div');
    header.className = 'invoice-card-head';
    const brand = document.createElement('span');
    brand.className = 'invoice-brand';
    const logo = document.createElement('img');
    logo.alt = 'Logo Alfred-EA';
    brand.appendChild(logo);
    invoiceLogoSource.then(source => {
      if (source) logo.src = source;
      else { logo.remove(); brand.textContent = 'AE'; }
    });
    const identity = document.createElement('div');
    const number = document.createElement('strong');
    number.textContent = invoice.invoice_number;
    const date = document.createElement('small');
    date.textContent = invoice.issued_on ? new Date(`${invoice.issued_on}T12:00:00`).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Date à confirmer';
    identity.append(number, date);
    const status = document.createElement('span');
    status.className = `invoice-status invoice-${invoice.status}`;
    status.textContent = ({ paid: 'Payée', open: 'À payer', overdue: 'En retard', void: 'Annulée', draft: 'Brouillon' })[invoice.status] || invoice.status;
    header.append(brand, identity, status);
    const description = document.createElement('p');
    description.className = 'invoice-description';
    description.textContent = invoice.description || 'Abonnement Alfred-EA';
    const amount = document.createElement('strong');
    amount.className = 'invoice-amount';
    amount.textContent = (invoice.amount_cents / 100).toLocaleString('fr-CA', { style: 'currency', currency: invoice.currency });
    card.append(header, description, amount);
    const stripePdfUrl = invoice.stripe_pdf_url || '';
    const hostedInvoiceUrl = invoice.stripe_hosted_url || '';
    if (hostedInvoiceUrl && ['open', 'overdue'].includes(invoice.status)) {
      const payLink = document.createElement('a');
      payLink.className = 'invoice-pay-link';
      payLink.href = hostedInvoiceUrl;
      payLink.target = '_blank';
      payLink.rel = 'noopener';
      payLink.textContent = 'Payer cette facture';
      card.appendChild(payLink);
    }
    if (invoice.file_path || stripePdfUrl) {
      const actions = document.createElement('div');
      actions.className = 'invoice-pdf-actions';
      const previewButton = document.createElement('button');
      previewButton.type = 'button';
      previewButton.className = 'invoice-preview-button';
      previewButton.textContent = 'Agrandir la facture';
      previewButton.setAttribute('aria-expanded', 'false');
      const pdfLink = document.createElement('a');
      pdfLink.className = 'invoice-pdf-link';
      pdfLink.textContent = 'Ouvrir le PDF';
      pdfLink.target = '_blank';
      pdfLink.rel = 'noopener';
      const preview = document.createElement('div');
      preview.className = 'invoice-pdf-preview';
      preview.hidden = true;
      const frame = document.createElement('iframe');
      frame.title = `Facture ${invoice.invoice_number}`;
      preview.appendChild(frame);
      const setPdfUrl = url => {
        pdfLink.href = url;
        frame.src = url;
        pdfLink.removeAttribute('aria-disabled');
        previewButton.disabled = false;
      };
      previewButton.addEventListener('click', () => {
        preview.hidden = !preview.hidden;
        previewButton.setAttribute('aria-expanded', String(!preview.hidden));
        previewButton.textContent = preview.hidden ? 'Agrandir la facture' : 'Réduire la facture';
      });
      if (stripePdfUrl) {
        setPdfUrl(stripePdfUrl);
      } else if (invoice.file_path.startsWith('data:application/pdf')) {
        setPdfUrl(invoice.file_path);
        pdfLink.download = `${invoice.invoice_number}.pdf`;
      } else {
        pdfLink.href = '#';
        pdfLink.setAttribute('aria-disabled', 'true');
        previewButton.disabled = true;
        sb.storage.from('client-documents').createSignedUrl(invoice.file_path, 600).then(({ data }) => {
          if (data?.signedUrl) setPdfUrl(data.signedUrl);
        });
      }
      actions.append(previewButton, pdfLink);
      card.append(actions, preview);
    }
    if (collapsed) {
      const historyLink = document.createElement('button');
      historyLink.type = 'button';
      historyLink.className = 'invoice-history-link';
      const month = invoice.issued_on
        ? new Date(`${invoice.issued_on}T12:00:00`).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long' })
        : invoice.invoice_number;
      const historyMonth = document.createElement('span');
      historyMonth.textContent = month;
      const historyAction = document.createElement('span');
      historyAction.textContent = 'Voir la facture';
      historyLink.append(historyMonth, document.createTextNode(' — '), historyAction);
      historyLink.setAttribute('aria-expanded', 'false');
      card.hidden = true;
      historyLink.addEventListener('click', () => {
        card.hidden = !card.hidden;
        historyLink.setAttribute('aria-expanded', String(!card.hidden));
        historyAction.textContent = card.hidden ? 'Voir la facture' : 'Masquer la facture';
      });
      container.appendChild(historyLink);
    }
    container.appendChild(card);
  };

  const addMessageBubble = (container, body, meta, own = false, imageUrl = '', imageName = '') => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${own ? 'chat-own' : 'chat-admin'}`;
    if (body) {
      const message = document.createElement('p');
      message.textContent = body;
      bubble.appendChild(message);
    }
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      const image = document.createElement('img');
      image.src = imageUrl;
      image.alt = imageName || 'Image privée';
      image.loading = 'lazy';
      image.style.cssText = 'display:block;max-width:min(100%,520px);max-height:420px;margin:.65rem 0;border-radius:12px;object-fit:contain';
      link.appendChild(image);
      bubble.appendChild(link);
    }
    const small = document.createElement('small');
    small.textContent = meta;
    bubble.appendChild(small);
    container.appendChild(bubble);
  };

  const openStripePortal = async event => {
    const feedback = document.getElementById('subscriptionManageStatus');
    const button = event.currentTarget;
    const originalText = button.textContent;
    button.disabled = true;
    feedback.textContent = 'Ouverture sécurisée du portail Stripe…';
    const { data, error } = await sb.functions.invoke('create-portal-session', { body: {} });
    if (error || !data?.url) {
      button.disabled = false;
      button.textContent = originalText;
      feedback.textContent = data?.error || 'Impossible d’ouvrir le portail Stripe pour le moment.';
      return;
    }
    location.href = data.url;
  };
  document.getElementById('cancelSubscriptionButton').addEventListener('click', openStripePortal);
  document.getElementById('paymentMethodButton').addEventListener('click', openStripePortal);

  async function loadDashboard(user) {
    layout.hidden = true;
    dashboard.hidden = false;
    const [profileResult, membershipResult, messagesResult, invoicesResult, documentsResult, mt5Result] = await Promise.all([
      sb.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
      sb.from('memberships').select('plan_name,status,renews_on').eq('user_id', user.id).maybeSingle(),
      sb.from('messages').select('body,created_at,sender_id,attachment_path,attachment_name,attachment_mime').eq('client_id', user.id).order('created_at', { ascending: true }),
      sb.from('invoices').select('invoice_number,description,amount_cents,currency,status,issued_on,file_path,stripe_hosted_url,stripe_pdf_url').eq('client_id', user.id).order('issued_on', { ascending: false }),
      sb.from('documents').select('id,display_name,category,storage_path,created_at').eq('client_id', user.id).order('created_at', { ascending: false }),
      sb.from('mt5_accounts').select('slot,broker,server_name,account_number').eq('user_id', user.id).order('slot')
    ]);
    document.getElementById('welcomeName').textContent = `Bonjour, ${profileResult.data?.full_name || user.email}`;
    document.getElementById('settingsEmail').value = user.email || '';
    document.getElementById('membershipPlan').textContent = membershipResult.data?.plan_name || 'À confirmer';
    document.getElementById('membershipStatus').textContent = membershipResult.data?.status || 'En attente';
    document.getElementById('invoiceCount').textContent = String(invoicesResult.data?.length || 0);
    document.getElementById('documentCount').textContent = String(documentsResult.data?.length || 0);
    const hasBrokerAccount = (mt5Result.data || []).length > 0;
    document.getElementById('subscriptionLevelsLink').hidden = !hasBrokerAccount;
    document.getElementById('subscriptionEligibilityMessage').hidden = hasBrokerAccount;
    const messageList = document.getElementById('messageList');
    messageList.replaceChildren();
    for (const message of (messagesResult.data || [])) {
      let imageUrl = '';
      if (message.attachment_path) {
        const { data: signedImage } = await sb.storage.from('client-documents').createSignedUrl(message.attachment_path, 600);
        imageUrl = signedImage?.signedUrl || '';
      }
      addMessageBubble(messageList, message.body, `${message.sender_id === user.id ? 'Vous' : 'Alfred-EA'} · ${new Date(message.created_at).toLocaleString('fr-CA')}`, message.sender_id === user.id, imageUrl, message.attachment_name);
    }
    if (!messagesResult.data?.length) messageList.innerHTML = '<p>Aucun message.</p>';
    const invoiceList = document.getElementById('invoiceList');
    invoiceList.replaceChildren();
    (invoicesResult.data || []).forEach((invoice, index) => addInvoiceCard(invoiceList, invoice, index > 0));
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
      const accountInput = document.getElementById(`account${slot}`);
      const passwordInput = document.getElementById(`mt5Password${slot}`);
      accountInput.value = account?.account_number || '';
      accountInput.dataset.saved = account ? 'true' : 'false';
      passwordInput.placeholder = account ? 'Laisser vide pour conserver' : 'Requis pour ce compte';
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

  document.querySelector('[data-password-reset]').addEventListener('click', async event => {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    if (!email) return status('loginStatus', 'Entrez d’abord votre adresse courriel.', true);
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    status('loginStatus', error ? error.message : 'Un courriel de réinitialisation a été envoyé.', !!error);
  });

  dashboard.addEventListener('submit', async event => {
    if (event.target.id === 'accountSettingsForm') {
      event.preventDefault();
      const feedback = document.getElementById('accountSettingsStatus');
      if (demoMode) { feedback.textContent = 'Aperçu : les paramètres ne sont pas modifiés en mode démo.'; return; }
      const { data: { user } } = await sb.auth.getUser();
      if (!user?.email) { feedback.textContent = 'Reconnectez-vous avant de modifier vos paramètres.'; return; }
      const currentPassword = document.getElementById('settingsCurrentPassword').value;
      const newEmail = document.getElementById('settingsEmail').value.trim().toLowerCase();
      const newPassword = document.getElementById('settingsNewPassword').value;
      const confirmation = document.getElementById('settingsConfirmPassword').value;
      if (newEmail === user.email && !newPassword) { feedback.textContent = 'Aucun changement à enregistrer.'; return; }
      if (newPassword && (newPassword.length < 10 || newPassword !== confirmation)) { feedback.textContent = 'Le nouveau mot de passe doit contenir au moins 10 caractères et les deux champs doivent correspondre.'; return; }
      const button = event.target.querySelector('button[type="submit"]');
      button.disabled = true; feedback.textContent = 'Vérification sécurisée…';
      const { error: authError } = await sb.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (authError) { button.disabled = false; feedback.textContent = 'Le mot de passe actuel est incorrect.'; return; }
      const changes = {};
      if (newEmail && newEmail !== user.email) changes.email = newEmail;
      if (newPassword) changes.password = newPassword;
      const { error: updateError } = await sb.auth.updateUser(changes, { emailRedirectTo: `${location.origin}${location.pathname}` });
      button.disabled = false;
      if (updateError) { feedback.textContent = `La modification a échoué : ${updateError.message}`; return; }
      document.getElementById('settingsCurrentPassword').value = '';
      document.getElementById('settingsNewPassword').value = '';
      document.getElementById('settingsConfirmPassword').value = '';
      feedback.textContent = changes.email ? 'Changements enregistrés. Vérifiez votre nouvelle adresse courriel pour confirmer le changement.' : 'Votre mot de passe a été modifié.';
      return;
    }
    if (event.target.id === 'mt5Form') {
      event.preventDefault();
      if (demoMode) return document.getElementById('mt5Status').textContent = 'Aperçu : les informations ne sont pas enregistrées en mode démo.';
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const accounts = [];
      for (let slot = 1; slot <= 5; slot += 1) {
        const broker = document.getElementById(`broker${slot}`).value;
        const server_name = document.getElementById(`server${slot}`).value.trim();
        const accountInput = document.getElementById(`account${slot}`);
        const account_number = accountInput.value.trim();
        const mt5_password = document.getElementById(`mt5Password${slot}`).value;
        if (!broker && !server_name && !account_number) continue;
        if (!broker || !/^[0-9]{3,30}$/.test(account_number)) return document.getElementById('mt5Status').textContent = `Vérifiez le courtier et le numéro du compte ${slot}.`;
        if (accountInput.dataset.saved !== 'true' && mt5_password.length < 4) return document.getElementById('mt5Status').textContent = `Le mot de passe MT5 est requis pour le nouveau compte ${slot}.`;
        accounts.push({ user_id: user.id, slot, broker, server_name: server_name || null, account_number, updated_at: new Date().toISOString() });
      }
      if (!accounts.length) { document.getElementById('mt5Status').textContent = 'Ajoutez au moins un compte courtier.'; return; }
      const { error: saveError } = await sb.from('mt5_accounts').upsert(accounts, { onConflict: 'user_id,slot' });
      if (saveError) { document.getElementById('mt5Status').textContent = 'Impossible d’enregistrer les comptes pour le moment.'; return; }
      for (let slot = 1; slot <= 5; slot += 1) {
        const passwordInput = document.getElementById(`mt5Password${slot}`);
        if (!passwordInput.value) continue;
        const { error: credentialError } = await sb.rpc('submit_mt5_credential', { p_slot: slot, p_password: passwordInput.value });
        passwordInput.value = '';
        if (credentialError) { document.getElementById('mt5Status').textContent = `Comptes enregistrés, mais le mot de passe du compte ${slot} n’a pas été transmis.`; return; }
      }
      accounts.forEach(account => {
        document.getElementById(`account${account.slot}`).dataset.saved = 'true';
        document.getElementById(`mt5Password${account.slot}`).placeholder = 'Laisser vide pour conserver';
      });
      document.getElementById('mt5Status').textContent = `${accounts.length} compte${accounts.length > 1 ? 's' : ''} courtier${accounts.length > 1 ? 's' : ''} enregistré${accounts.length > 1 ? 's' : ''}. Tout mot de passe fourni reste disponible jusqu’à son remplacement.`;
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
    const bodyInput = document.getElementById('messageBody');
    const imageInput = document.getElementById('messageImage');
    const status = document.getElementById('messageStatus');
    const body = bodyInput.value.trim();
    const imageFile = imageInput.files[0];
    if (!body && !imageFile) { status.textContent = 'Écrivez un message ou ajoutez une image.'; return; }
    if (imageFile && (!['image/jpeg','image/png','image/webp'].includes(imageFile.type) || imageFile.size > 10 * 1024 * 1024)) {
      status.textContent = 'Choisissez une image JPG, PNG ou WebP de 10 Mo maximum.'; return;
    }
    if (demoMode) {
      addMessageBubble(document.getElementById('messageList'), body, 'Vous · Démonstration', true, imageFile ? URL.createObjectURL(imageFile) : '', imageFile?.name || '');
      bodyInput.value = ''; imageInput.value = ''; status.textContent = 'Aperçu de démonstration — aucune donnée enregistrée.'; return;
    }
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true; status.textContent = imageFile ? 'Téléversement privé de l’image…' : 'Envoi…';
    let attachment = {};
    if (imageFile) {
      const extension = imageFile.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${user.id}/messages/${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await sb.storage.from('client-documents').upload(path, imageFile, { contentType: imageFile.type });
      if (uploadError) { status.textContent = 'L’image n’a pas pu être téléversée.'; submitButton.disabled = false; return; }
      attachment = { attachment_path: path, attachment_name: imageFile.name, attachment_mime: imageFile.type };
    }
    const { error } = await sb.from('messages').insert({ client_id: user.id, sender_id: user.id, body: body || null, ...attachment });
    if (error) { status.textContent = 'Le message n’a pas pu être envoyé.'; submitButton.disabled = false; return; }
    bodyInput.value = ''; imageInput.value = ''; status.textContent = ''; await loadDashboard(user);
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
    if (recoveryMode) return;
    const {data:admin} = await sb.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
    if (admin) { location.replace('admin.html'); return; }
    if (safeReturn) { location.replace(safeReturn); return; }
    await loadDashboard(user);
    if (emailChangeReturn) {
      const feedback = document.getElementById('accountSettingsStatus');
      feedback.textContent = user.new_email
        ? 'Première confirmation reçue. Confirmez également le lien envoyé à l’autre adresse courriel.'
        : 'Votre nouvelle adresse courriel est confirmée et active.';
      feedback.style.color = 'var(--gold2)';
      emailChangeReturn = false;
      const cleanUrl = new URL(location.href);
      cleanUrl.searchParams.delete('type');
      cleanUrl.hash = '';
      history.replaceState(null, '', `${cleanUrl.pathname}${cleanUrl.search}`);
    }
  }
  if (params.get('mode') === 'signup') document.getElementById('signupTab').click();
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') { showRecoveryPanel(); return; }
    if (session?.user) routeSignedInUser(session.user);
    else if (!recoveryMode) { dashboard.hidden = true; recoveryPanel.hidden = true; layout.hidden = false; }
  });
  if (recoveryMode) showRecoveryPanel();
  sb.auth.getSession().then(({ data }) => data.session?.user && !recoveryMode && routeSignedInUser(data.session.user));
})();
