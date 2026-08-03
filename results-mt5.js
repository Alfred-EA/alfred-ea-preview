(() => {
  const sb = window.supabase.createClient('https://lstjmanxzpsnuxonspfc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdWJhYXNlIiwicmVmIjoibHN0am1hbnh6cHJudXhvbnNwZmMiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4NTY3MDE2MywiZXhwIjoyMTAxMjQ2MTYzfQ.BVjCyTVWsODT6cpRKCSak5PI5a_4uhxifHP5z_ScqO8');
  const gallery = document.querySelector('.gallery');
  const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
  async function loadPublishedResults() {
    const {data, error} = await sb.from('mt5_results').select('title,description,result_date,image_path').eq('is_published', true).order('result_date', {ascending:false}).order('created_at', {ascending:false});
    if (error || !data || !data.length) return;
    gallery.innerHTML = data.map((item, index) => {
      const imageUrl = sb.storage.from('mt5-results').getPublicUrl(item.image_path).data.publicUrl;
      const date = new Date(`${item.result_date}T12:00:00`).toLocaleDateString('fr-CA', {year:'numeric',month:'long',day:'numeric'});
      const label = `${item.title} — ${date}${item.description ? ` — ${item.description}` : ''}`;
      return `<a class="shot" href="${escapeHtml(imageUrl)}" target="_blank" rel="noopener" title="${escapeHtml(label)}"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(label)}"${index > 3 ? ' loading="lazy"' : ''}></a>`;
    }).join('');
  }
  loadPublishedResults();
})();
