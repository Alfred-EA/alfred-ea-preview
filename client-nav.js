(() => {
  const style = document.createElement('style');
  style.textContent = `
    .site-brand,body>header .brand{display:flex!important;align-items:center!important;gap:10px!important}
    .site-brand img,body>header .brand img{display:block!important;width:48px!important;height:42px!important;object-fit:contain!important;flex:0 0 auto!important}
    @media (min-width:821px){
      .site-header,body>header{height:auto!important;min-height:142px!important;padding:0!important;border-bottom:1px solid rgba(219,180,83,.62)!important;box-shadow:0 8px 24px rgba(219,180,83,.055)!important}
      .site-nav,body>header nav,body>header .nav{height:auto!important;min-height:142px!important;flex-direction:column!important;justify-content:center!important;gap:8px!important;padding:13px 0 11px!important}
      .site-brand,body>header .brand{justify-content:center!important;margin:0 auto!important}
      .site-brand img,body>header .brand img{display:block!important;width:60px!important;height:52px!important;object-fit:contain!important;margin:0 auto!important}
      .menu-links,.links,body>header nav{justify-content:center!important;width:100%!important}
    }
    @media (max-width:820px){
      .site-brand,body>header .brand{max-width:calc(100% - 58px)!important;margin:0!important;font-size:16px!important;letter-spacing:.055em!important;white-space:nowrap!important}
      .site-brand img,body>header .brand img{width:42px!important;height:37px!important}
      .global-current-week{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;width:100%!important;min-height:52px!important;gap:3px 10px!important;padding:8px 14px!important;font-size:10px!important;text-align:left!important}
      .global-current-week strong{font-size:15px!important;text-align:right!important;white-space:nowrap!important}
      .global-current-week .live{grid-column:1/-1!important;justify-self:start!important;white-space:nowrap!important}
      .top-performance .stats{grid-template-columns:1fr!important}
      .top-performance .stat{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important;gap:8px!important;padding:11px 8px!important;border-left:0!important;text-align:left!important}
      .top-performance .stat+.stat{border-top:1px solid var(--line)!important}
      .top-performance .stat strong{margin:0!important;text-align:right!important;white-space:nowrap!important;font-size:22px!important}
      .top-performance .stat span{font-size:9px!important}
      .top-performance .live-pill{grid-column:1/-1!important;justify-self:start!important;margin:0!important}
    }
    .global-current-week{display:flex;align-items:center;justify-content:center;gap:10px;min-height:42px;padding:8px 16px;border-bottom:1px solid rgba(219,180,83,.22);background:linear-gradient(90deg,#05080d,rgba(219,180,83,.08),#05080d);color:#969590;font-size:11px;letter-spacing:.06em;text-align:center}
    .global-current-week strong{color:#f2d47d;font-size:16px;letter-spacing:0}
    .global-current-week .live{padding:3px 7px;border:1px solid rgba(219,180,83,.45);border-radius:999px;color:#dbb453;font-size:8px;font-weight:800;letter-spacing:.12em}
  `;
  document.head.appendChild(style);
  const brand = document.querySelector('.site-brand, body>header .brand');
  if (brand && !brand.querySelector('img')) {
    fetch('broker-account.html').then(response => response.text()).then(html => {
      const source = html.match(/class="site-brand"[\s\S]*?<img src="([^"]+)"/);
      if (!source) return;
      const image = document.createElement('img');
      image.src = source[1];
      image.alt = 'Logo Alfred-EA';
      brand.prepend(image);
    }).catch(() => {});
  }
  const navigation = document.getElementById('mobileNavigation');
  if (navigation && !navigation.querySelector('a[href="subscription.html"]')) {
    const subscriptionLink = document.createElement('a');
    subscriptionLink.href = 'subscription.html';
    subscriptionLink.textContent = 'Abonnement';
    const accountLink = navigation.querySelector('a[href="broker-account.html"]');
    navigation.insertBefore(subscriptionLink, accountLink || null);
  }
  const brokerLink = navigation?.querySelector('a[href="broker-account.html"]');
  if (brokerLink) brokerLink.textContent = 'Ouvrir un compte courtier';
  if (navigation && !navigation.querySelector('a[href="client-space.html"]')) {
    const link = document.createElement('a');
    link.href = 'client-space.html';
    link.textContent = 'Espace client';
    navigation.appendChild(link);
  }
  if (!document.getElementById('fxCurrentWeek') && !document.querySelector('.global-current-week')) {
    const header = document.querySelector('.site-header, body > header');
    if (header) {
      const weekBar = document.createElement('div');
      weekBar.className = 'global-current-week';
      weekBar.innerHTML = '<span>Semaine en cours</span><strong>--</strong><span class="live">LIVE</span>';
      header.insertAdjacentElement('afterend', weekBar);
      const value = weekBar.querySelector('strong');
      const endpoint = 'https://lstjmanxzpsnuxonspfc.supabase.co/functions/v1/fxblue-current-week';
      const publishableKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdGptYW54enBzbnV4b25zcGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NzAxNjMsImV4cCI6MjEwMTI0NjE2M30.BVjCyTVWsODT6cpRKCSak5PI5a_4uhxifHP5z_ScqO8';
      const refreshWeek = async () => {
        try {
          const response = await fetch(`${endpoint}?t=${Date.now()}`, {cache:'no-store', headers:{Authorization:`Bearer ${publishableKey}`, apikey:publishableKey}});
          if (!response.ok) throw new Error('Weekly performance unavailable');
          const data = await response.json();
          const number = Number(data.currentWeekGrowth);
          value.textContent = Number.isFinite(number) ? `${number >= 0 ? '+' : ''}${number.toFixed(2)}%` : '--';
        } catch (_) { value.textContent = '--'; }
      };
      refreshWeek();
      setInterval(refreshWeek, 60000);
    }
  }
  const footer = document.querySelector('footer .wrap, footer');
  if (footer) {
    if (!footer.querySelector('a[href="privacy.html"]')) footer.insertAdjacentHTML('beforeend', ' · <a href="privacy.html">Politique de confidentialité</a>');
    if (!footer.querySelector('a[href="cancellation-refund.html"]')) footer.insertAdjacentHTML('beforeend', ' · <a href="cancellation-refund.html">Annulation et remboursements</a>');
    if (!footer.querySelector('a[href="disclaimer.html"]')) footer.insertAdjacentHTML('beforeend', ' · <a href="disclaimer.html">Conditions et clauses de non-responsabilité</a>');
  }
})();
