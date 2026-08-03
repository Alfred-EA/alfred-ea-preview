(() => {
  const sb = window.supabase.createClient('https://lstjmanxzpsnuxonspfc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdWJhYXNlIiwicmVmIjoibHN0am1hbnh6cHJudXhvbnNwZmMiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4NTY3MDE2MywiZXhwIjoyMTAxMjQ2MTYzfQ.BVjCyTVWsODT6cpRKCSak5PI5a_4uhxifHP5z_ScqO8');
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
    const {data, error} = await sb.from('mt5_results').select('title,description,result_date,image_path').eq('is_published', true).order('result_date', {ascending:false}).order('created_at', {ascending:false});
    const published = error || !data ? [] : data;
    const groups = new Map();
    published.forEach(item => { const start = mondayOf(item.result_date); const key = isoDate(start); if (!groups.has(key)) groups.set(key,{start,items:[]}); groups.get(key).items.push(item); });
    const currentWeekKey = isoDate(mondayOf(isoDate(new Date())));
    if (!groups.has(currentWeekKey)) groups.set(currentWeekKey,{start:mondayOf(isoDate(new Date())),items:[]});
    gallery.classList.add('weekly');
    const orderedGroups = [...groups.entries()].sort((a,b) => b[0].localeCompare(a[0]));
    gallery.innerHTML = orderedGroups.map(([key, group], groupIndex) => {
      const isCurrent = key === currentWeekKey;
      const cards = group.items.map((item, index) => {
        const imageUrl = sb.storage.from('mt5-results').getPublicUrl(item.image_path).data.publicUrl;
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
