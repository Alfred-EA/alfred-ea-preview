(() => {
  const projectUrl = 'https://lstjmanxzpsnuxonspfc.supabase.co';
  const publishableKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdGptYW54enBzbnV4b25zcGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NzAxNjMsImV4cCI6MjEwMTI0NjE2M30.BVjCyTVWsODT6cpRKCSak5PI5a_4uhxifHP5z_ScqO8';
  const sb = window.alfredSupabaseClient || window.supabase.createClient(projectUrl, publishableKey);
  window.alfredSupabaseClient = sb;

  window.submitBrokerApplicationSecurely = async application => {
    const { data: { session }, error: sessionError } = await sb.auth.getSession();
    if (sessionError || !session?.access_token) throw new Error('Connexion Alfred-EA requise.');
    const body = new FormData();
    body.append('full_name', application.fullName);
    body.append('email', application.email);
    body.append('referred_by', application.referredBy || '');
    body.append('has_existing_account', String(Boolean(application.hasExistingAccount)));
    body.append('existing_brokers', JSON.stringify(application.existingBrokers || []));
    body.append('preferred_brokers', JSON.stringify(application.preferredBrokers || []));
    body.append('account_value_usd', String(application.accountValueUsd));
    body.append('subscription_level', application.subscriptionLevel);
    body.append('license_front', application.licenseFront);
    body.append('license_back', application.licenseBack);
    const response = await fetch(`${projectUrl}/functions/v1/submit-broker-application`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, apikey: publishableKey },
      body,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'La demande n’a pas pu être enregistrée.');
    return result;
  };
})();
