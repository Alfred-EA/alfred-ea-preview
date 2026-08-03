(() => {
  const PROJECT_URL = 'https://lstjmanxzpsnuxonspfc.supabase.co';
  const PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdGptYW54enBzbnV4b25zcGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NzAxNjMsImV4cCI6MjEwMTI0NjE2M30.BVjCyTVWsODT6cpRKCSak5PI5a_4uhxifHP5z_ScqO8';
  const sb = window.supabase.createClient(PROJECT_URL, PUBLISHABLE_KEY);
  const shell = document.querySelector('.shell');
  shell.hidden = true;

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
  gate.innerHTML = `<div class="gate-icon">✓</div><div class="eyebrow">ÉTAPE REQUISE</div><h1>Compte Alfred-EA requis</h1><p>Pour continuer l’ouverture de votre compte courtier, créez votre Espace client Alfred-EA. Vous pourrez ensuite revenir automatiquement à cette demande.</p><div class="gate-actions"><a class="gate-create" href="client-space.html?return=broker-account.html&mode=signup">Créer mon compte</a><a class="gate-login" href="client-space.html?return=broker-account.html&mode=login">J’ai déjà un compte</a></div>`;
  document.querySelector('.site-header').insertAdjacentElement('afterend', gate);

  sb.auth.getSession().then(({ data, error }) => {
    const signedIn = !error && !!data.session?.user;
    shell.hidden = !signedIn;
    gate.hidden = signedIn;
  });
})();
