(() => {
  const style = document.createElement('style');
  style.textContent = `
    @media (min-width:821px){
      .site-header,body>header{height:auto!important;min-height:142px!important;padding:0!important}
      .site-nav,body>header nav,body>header .nav{height:auto!important;min-height:142px!important;flex-direction:column!important;justify-content:center!important;gap:8px!important;padding:13px 0 11px!important}
      .site-brand,body>header .brand{justify-content:center!important;margin:0 auto!important}
      .site-brand img,body>header .brand img{display:block!important;width:60px!important;height:52px!important;object-fit:contain!important;margin:0 auto!important}
      .menu-links,.links,body>header nav{justify-content:center!important;width:100%!important}
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
  if (navigation && !navigation.querySelector('a[href="client-space.html"]')) {
    const link = document.createElement('a');
    link.href = 'client-space.html';
    link.textContent = 'Espace client';
    navigation.appendChild(link);
  }
})();
