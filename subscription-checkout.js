(() => {
  const PROJECT_URL = 'https://lstjmanxzpsnuxonspfc.supabase.co';
  const PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdGptYW54enBzbnV4b25zcGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NzAxNjMsImV4cCI6MjEwMTI0NjE2M30.BVjCyTVWsODT6cpRKCSak5PI5a_4uhxifHP5z_ScqO8';
  const sb = window.supabase.createClient(PROJECT_URL, PUBLISHABLE_KEY);
  const checkoutButton = document.getElementById('checkoutButton');
  const checkoutStatus = document.getElementById('checkoutStatus');
  const params = new URLSearchParams(location.search);
  let selectedLevel = Number(params.get('level')) || Number(sessionStorage.getItem('alfredCheckoutLevel')) || 3;
  let hasBrokerAccount = false;
  let selectedIsCustom = false;

  const updateCheckoutLabel = () => {
    const name = document.querySelector('.plan.active .level')?.textContent || '';
    const match = name.match(/(\d+)/);
    if (match) selectedLevel = Number(match[1]);
    selectedIsCustom = name.includes('X');
    checkoutButton.disabled = selectedIsCustom;
    checkoutButton.textContent = selectedIsCustom ? 'Communiquer avec Alfred-EA' : hasBrokerAccount ? `Choisir le Niveau ${selectedLevel}` : 'Ouvrir un compte courtier';
  };

  const refreshEligibility = async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { hasBrokerAccount = false; updateCheckoutLabel(); return; }
    const { data } = await sb.from('mt5_accounts').select('id').eq('user_id', session.user.id).limit(1);
    hasBrokerAccount = Boolean(data?.length);
    updateCheckoutLabel();
  };

  document.querySelectorAll('.plan').forEach(card => card.addEventListener('click', () => {
    updateCheckoutLabel();
    checkoutStatus.textContent = '';
  }));
  document.getElementById('accountValue').addEventListener('input', updateCheckoutLabel);

  checkoutButton.addEventListener('click', async () => {
    if (!hasBrokerAccount) {
      location.href = 'broker-account.html';
      return;
    }
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      sessionStorage.setItem('alfredCheckoutLevel', String(selectedLevel));
      location.href = 'client-space.html?return=subscription.html&mode=login';
      return;
    }
    checkoutButton.disabled = true;
    checkoutStatus.textContent = 'Ouverture sécurisée de Stripe Checkout…';
    const { data, error } = await sb.functions.invoke('create-checkout-session', { body: { level: selectedLevel } });
    if (error || !data?.url) {
      checkoutButton.disabled = false;
      let message = data?.error || '';
      if (!message && error?.context) {
        try { message = (await error.context.clone().json())?.error || ''; } catch (_) {}
      }
      checkoutStatus.textContent = message || error?.message || 'Impossible de démarrer le paiement pour le moment.';
      return;
    }
    sessionStorage.removeItem('alfredCheckoutLevel');
    location.href = data.url;
  });

  if (params.get('checkout') === 'cancelled') checkoutStatus.textContent = 'Paiement annulé — aucun montant n’a été prélevé.';
  updateCheckoutLabel();
  refreshEligibility();
})();
