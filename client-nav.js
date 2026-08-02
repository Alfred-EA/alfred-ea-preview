(() => {
  const navigation = document.getElementById('mobileNavigation');
  if (!navigation || navigation.querySelector('a[href="client-space.html"]')) return;
  const link = document.createElement('a');
  link.href = 'client-space.html';
  link.textContent = 'Espace client';
  navigation.appendChild(link);
})();
