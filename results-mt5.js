(() => {
  const apiUrl = 'https://lstjmanxzpsnuxonspfc.supabase.co';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdGptYW54enBzbnV4b25zcGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NzAxNjMsImV4cCI6MjEwMTI0NjE2M30.BVjCyTVWsODT6cpRKCSak5PI5a_4uhxifHP5z_ScqO8';
  const gallery = document.querySelector('.gallery');
  const legacyImages = [...gallery.querySelectorAll('.shot')].map((link, index) => ({href:link.href,src:link.querySelector('img').src,title:`Capture MT5 ${index + 1}`}));
  const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
  const mondayOf = value => {
    const date = new Date(`${value}T12:00:00`);
    const day = date.getDay() || 7;
    date.setDate(date.getDate() - day + 1);
    return date;
  };
  const isoDate = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const weekLabel = start => {
    const end = new Date(start); end.setDate(end.getDate() + 6);
    const sameMonth = start.getMonth() === end.getMonth();
    const first = start.toLocaleDateString('fr-CA', sameMonth ? {day:'numeric'} : {day:'numeric',month:'long'});
    const last = end.toLocaleDateString('fr-CA', {day:'numeric',month:'long',year:'numeric'});
    return `${first} – ${last}`;
  };
  async function loadPublishedResults() {
    let published = [];
    try {
      const response = await fetch(`${apiUrl}/rest/v1/mt5_results?select=title,description,result_date,image_path&is_published=eq.true&order=result_date.desc,created_at.desc`, {headers:{apikey:anonKey,Authorization:`Bearer ${anonKey}`}});
      if (!response.ok) throw new Error(`MT5 results feed ${response.status}: ${await response.text()}`);
      published = await response.json();
    } catch (error) { console.error(error); }
    const groups = new Map();
    published.forEach(item => { const start = mondayOf(item.result_date); const key = isoDate(start); if (!groups.has(key)) groups.set(key,{start,items:[]}); groups.get(key).items.push(item); });
    const currentWeekKey = isoDate(mondayOf(isoDate(new Date())));
    if (!groups.has(currentWeekKey)) groups.set(currentWeekKey,{start:mondayOf(isoDate(new Date())),items:[]});
    gallery.classList.add('weekly');
    const orderedGroups = [...groups.entries()].sort((a,b) => b[0].localeCompare(a[0]));
    gallery.innerHTML = orderedGroups.map(([key, group], groupIndex) => {
      const isCurrent = key === currentWeekKey;
      const cards = group.items.map((item, index) => {
        const imageUrl = `${apiUrl}/storage/v1/object/public/mt5-results/${item.image_path.split('/').map(encodeURIComponent).join('/')}`;
        const readableDate = new Date(`${item.result_date}T12:00:00`).toLocaleDateString('fr-CA', {year:'numeric',month:'long',day:'numeric'});
        const label = `${item.title} — ${readableDate}${item.description ? ` — ${item.description}` : ''}`;
        return `<article class="result-card"><a class="shot" href="${escapeHtml(imageUrl)}" target="_blank" rel="noopener"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(label)}"${groupIndex > 0 || index > 3 ? ' loading="lazy"' : ''}></a><div class="result-meta"><strong>${escapeHtml(item.title)}</strong><time datetime="${item.result_date}">${escapeHtml(readableDate)}</time>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}</div></article>`;
      }).join('');
      const content = cards || '<p class="lead">Les nouvelles captures de cette semaine apparaîtront ici automatiquement.</p>';
      return `<details class="week-group"${isCurrent ? ' open' : ''}><summary class="week-summary"><span><strong>${isCurrent ? 'Semaine actuelle' : 'Semaine précédente'}</strong><br>${escapeHtml(weekLabel(group.start))}</span><span>${group.items.length} capture${group.items.length > 1 ? 's' : ''}</span></summary><div class="week-grid">${content}</div></details>`;
    }).join('') + `<details class="week-group"><summary class="week-summary"><span><strong>Résultats précédents</strong><br>27 juillet – 2 août 2026</span><span>${legacyImages.length} captures</span></summary><div class="week-grid">${legacyImages.map((item,index) => `<article class="result-card"><a class="shot" href="${escapeHtml(item.href)}" target="_blank" rel="noopener"><img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.title)}" loading="lazy"></a><div class="result-meta"><strong>${escapeHtml(item.title)}</strong><time datetime="2026-07-27">27 juillet 2026</time></div></article>`).join('')}</div></details>`;
    gallery.querySelectorAll('.week-group').forEach(section => section.addEventListener('toggle', () => { if (!section.open) return; gallery.querySelectorAll('.week-group[open]').forEach(other => { if (other !== section) other.open = false; }); }));
  }
  loadPublishedResults();
})();
