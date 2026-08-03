(() => {
  const PROJECT_URL = 'https://lstjmanxzpsnuxonspfc.supabase.co';
  const PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdGptYW54enBzbnV4b25zcGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NzAxNjMsImV4cCI6MjEwMTI0NjE2M30.BVjCyTVWsODT6cpRKCSak5PI5a_4uhxifHP5z_ScqO8';
  const sb = window.supabase.createClient(PROJECT_URL, PUBLISHABLE_KEY);
  const shell = document.querySelector('.shell');
  const APPLICATION_KEY = 'alfredBrokerApplication';
  const APPLICATION_TTL = 24 * 60 * 60 * 1000;

  const style = document.createElement('style');
  style.textContent = `
    .account-gate{width:min(620px,calc(100% - 30px));margin:54px auto;padding:38px;text-align:center;background:linear-gradient(145deg,rgba(12,18,29,.98),rgba(6,10,17,.99));border:1px solid rgba(219,180,83,.38);border-radius:24px;box-shadow:0 35px 90px rgba(0,0,0,.5)}
    .account-gate .gate-icon{width:52px;height:52px;margin:0 auto 18px;display:grid;place-items:center;border-radius:50%;background:rgba(219,180,83,.12);color:#f2d47d;font-size:23px}
    .account-gate h1{margin:8px 0 12px}.account-gate p{color:#969590;max-width:500px;margin:0 auto 25px}.gate-actions{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}.gate-actions a{min-width:190px;padding:13px 20px;border-radius:999px;font-weight:800}.gate-create{background:linear-gradient(135deg,#a77924,#efcf72,#b5852b);color:#171108}.gate-login{border:1px solid rgba(219,180,83,.5);color:#f2d47d}
  `;
  document.head.appendChild(style);

  const gate = document.createElement('main');
  gate.className = 'account-gate';
  gate.hidden = true;
  gate.innerHTML = `<div class="gate-icon">✓</div><div class="eyebrow">DERNIÈRE ÉTAPE</div><h1>Avez-vous déjà un compte Alfred-EA?</h1><p>Vos choix et votre estimation d’abonnement sont prêts. Choisissez votre situation pour compléter l’inscription.</p><div class="gate-actions"><a class="gate-login" href="client-space.html?return=broker-account.html&mode=login"><strong>Oui</strong> — Se connecter</a><a class="gate-create" href="client-space.html?return=broker-account.html&mode=signup"><strong>Non</strong> — Créer un compte</a></div>`;
  document.querySelector('.site-header').insertAdjacentElement('afterend', gate);

  const sessionReady = sb.auth.getSession();
  window.requireBrokerAccount = async state => {
    const { data, error } = await sessionReady;
    if (!error && data.session?.user) return true;
    localStorage.setItem(APPLICATION_KEY, JSON.stringify({ state, savedAt: Date.now() }));
    shell.hidden = true;
    gate.hidden = false;
    scrollTo({ top: 0, behavior: 'smooth' });
    return false;
  };

  sessionReady.then(({ data, error }) => {
    if (error || !data.session?.user) return;
    const saved = localStorage.getItem(APPLICATION_KEY);
    if (!saved || !window.resumeBrokerApplication) return;
    localStorage.removeItem(APPLICATION_KEY);
    try {
      const application = JSON.parse(saved);
      if (!application?.state || Date.now() - Number(application.savedAt) > APPLICATION_TTL) return;
      window.resumeBrokerApplication(application.state);
    } catch (restoreError) { console.error('Reprise impossible', restoreError); }
  });
})();
