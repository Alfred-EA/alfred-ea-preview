(() => {
  const sb = window.supabase.createClient('https://lstjmanxzpsnuxonspfc.supabase.co', 'sb_publishable_ltaNA7nnVozoSCOcZIjg');
  const status = document.getElementById('status');
  const grid = document.getElementById('adminGrid');
  const clients = document.getElementById('clients');
  const details = document.getElementById('clientDetails');
  let clearTimer;

  const row = (title, subtitle, actions = '') => `<div class="row"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(subtitle || '')}</small>${actions}</div>`;
  const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));

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
      const action = credential ? `<div class="actions"><button class="button reveal" data-id="${credential.id}">Révéler une fois · expire ${new Date(credential.expires_at).toLocaleString('fr-CA')}</button></div>` : '<small>Aucun mot de passe temporaire disponible</small>';
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
    profiles.forEach(profile => { const button=document.createElement('button'); button.className='client'; button.innerHTML=`${escapeHtml(profile.full_name || 'Client')}<small>${escapeHtml(profile.id)}</small>`; button.addEventListener('click',()=>loadClient(profile)); clients.appendChild(button); });
  }

  details.addEventListener('click', async event => {
    const reveal = event.target.closest('.reveal');
    if (reveal) {
      if (!confirm('Ce mot de passe sera supprimé du serveur immédiatement et ne pourra plus être révélé. Continuer?')) return;
      reveal.disabled = true;
      const {data, error} = await sb.rpc('claim_mt5_credential', {p_credential_id: reveal.dataset.id});
      if (error) { alert('Ce mot de passe est expiré ou déjà consulté.'); return; }
      const box=document.getElementById('secretBox'); document.getElementById('revealedSecret').value=data; box.hidden=false;
      clearTimeout(clearTimer); clearTimer=setTimeout(clearSecret,120000); reveal.remove();
    }
    const open = event.target.closest('.open-document');
    if (open) { const {data,error}=await sb.storage.from('client-documents').createSignedUrl(open.dataset.path,300); if(error) alert('Document inaccessible.'); else window.open(data.signedUrl,'_blank','noopener'); }
  });
  function clearSecret(){document.getElementById('revealedSecret').value='';document.getElementById('secretBox').hidden=true;}
  document.getElementById('copySecret').addEventListener('click',()=>navigator.clipboard.writeText(document.getElementById('revealedSecret').value));
  document.getElementById('clearSecret').addEventListener('click',clearSecret);
  document.getElementById('logout').addEventListener('click',async()=>{await sb.auth.signOut();location.href='client-space.html';});
  init();
})();
