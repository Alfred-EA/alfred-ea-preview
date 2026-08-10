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
    }
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
  const brokerLink = navigation?.querySelector('a[href="broker-account.html"]');
  if (brokerLink) brokerLink.textContent = 'Ouvrir un compte courtier';
  if (navigation && !navigation.querySelector('a[href="client-space.html"]')) {
    const link = document.createElement('a');
    link.href = 'client-space.html';
    link.textContent = 'Espace client';
    navigation.appendChild(link);
  }
  const footer = document.querySelector('footer .wrap, footer');
  if (footer) {
    if (!footer.querySelector('a[href="privacy.html"]')) footer.insertAdjacentHTML('beforeend', ' · <a href="privacy.html">Politique de confidentialité</a>');
    if (!footer.querySelector('a[href="disclaimer.html"]')) footer.insertAdjacentHTML('beforeend', ' · <a href="disclaimer.html">Conditions et clauses de non-responsabilité</a>');
  }
})();
