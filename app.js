(function(){
  const STORAGE_KEY = 'shiftDataV1';
  const CAPACITY = 10;
  // Remote read/write configuration
  // 1) Everyone reads from the raw URL (public)
  // 2) Writes use GitHub Contents API and require a Personal Access Token (prompted once in browser)
  // Fill these with your values:
  const REMOTE_READ_URL = 'https://raw.githubusercontent.com/kennedyrocha/escalaorgandata/refs/heads/main/data2.json';
  const GITHUB_OWNER = 'kennedyrocha';
  const GITHUB_REPO = 'escalaorgandata';
  const GITHUB_BRANCH = 'main';
  const DATA_PATH = 'data2.json'; // e.g., 'data.json' or 'data/data.json'
  // WARNING: This exposes your token to everyone who can view source.
  // Use a fine-grained token limited to only this repo, with minimal permissions.
  const GITHUB_TOKEN = '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';
  const DEFAULT_SHIFTS = [
    { id: 'shift-1', label: 'Escala 22-Jan-2026 à 22-mar-2026' },
    { id: 'shift-2', label: 'Escala 22-mar-2026 à 22-mai-2026' },
    { id: 'shift-3', label: 'Escala 22-mai-2026 à 22-jul-2026' },
    { id: 'shift-4', label: 'Escala 22-Jul-2026 à 22-set-2026' },
    { id: 'shift-5', label: 'Escala 22-set-2026 à 22-nov-2026' },
    { id: 'shift-6', label: 'Escala 22-nov-2026 à 22-jan-2027' }
  ];

  const $form = document.getElementById('registrationForm');
  const $name = document.getElementById('name');
  const $shift = document.getElementById('shift');
  const $msg = document.getElementById('formMessage');
  const $grid = document.getElementById('shiftsGrid');

  const $modal = document.getElementById('participantsModal');
  const $modalTitle = document.getElementById('modalTitle');
  const $participantsList = document.getElementById('participantsList');

  // Data layer
  function loadData(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw){
        const init = {
          capacity: CAPACITY,
          shifts: DEFAULT_SHIFTS.reduce((acc,s)=>{acc[s.id] = { id: s.id, label: s.label, participants: [] }; return acc;}, {})
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
        return init;
      }
      const parsed = JSON.parse(raw);
      // Basic migration/validation
      if(!parsed.capacity) parsed.capacity = CAPACITY;
      if(!parsed.shifts){
        parsed.shifts = DEFAULT_SHIFTS.reduce((acc,s)=>{acc[s.id] = { id: s.id, label: s.label, participants: [] }; return acc;}, {});
      } else {
        // Ensure all default shifts exist
        DEFAULT_SHIFTS.forEach(s=>{
          if(!parsed.shifts[s.id]) parsed.shifts[s.id] = { id: s.id, label: s.label, participants: [] };
          if(!parsed.shifts[s.id].label) parsed.shifts[s.id].label = s.label;
          if(!Array.isArray(parsed.shifts[s.id].participants)) parsed.shifts[s.id].participants = [];
        });
      }
      return parsed;
    }catch(e){
      console.error('Failed to load data, resetting', e);
      localStorage.removeItem(STORAGE_KEY);
      return loadData();
    }
  }
  function saveData(data){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  let state = loadData();

  // UI rendering
  function renderShiftSelect(){
    $shift.innerHTML = '';
    Object.values(state.shifts).forEach(s=>{
      const count = s.participants.length;
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.label} (${count}/${state.capacity})`;
      if(count >= state.capacity){ opt.disabled = true; opt.textContent += ' - Full'; }
      $shift.appendChild(opt);
    });
  }

  function renderGrid(){
    $grid.innerHTML = '';
    Object.values(state.shifts).forEach(s=>{
      const count = s.participants.length;
      const card = document.createElement('div');
      card.className = 'shift-card';
      card.innerHTML = `
        <h3>${escapeHtml(s.label)}</h3>
        <div class="shift-meta">
          <span class="badge">Capacidade ${count}/${state.capacity}</span>
          <span>${count >= state.capacity ? 'Full' : 'Open'}</span>
        </div>
        <div class="shift-actions">
          <button class="btn" data-view="${s.id}">Ver participantes</button>
        </div>
      `;
      $grid.appendChild(card);
    });
  }

  // Helpers
  function escapeHtml(str){
    return String(str).replace(/[&<>"] /g, s=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',' ':' '
    })[s] || s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function showMessage(text, type){
    $msg.textContent = text;
    $msg.className = 'form-message ' + (type || '');
  }

  function openModal(shiftId){
    const s = state.shifts[shiftId];
    if(!s) return;
    $modalTitle.textContent = `${s.label} — Participants (${s.participants.length}/${state.capacity})`;
    $participantsList.innerHTML = '';
    if(s.participants.length === 0){
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'No participants yet';
      $participantsList.appendChild(li);
    } else {
      s.participants.forEach(p=>{
        const li = document.createElement('li');
        li.textContent = p.name;
        $participantsList.appendChild(li);
      });
    }
    $modal.setAttribute('aria-hidden', 'false');
  }
  function closeModal(){
    $modal.setAttribute('aria-hidden', 'true');
  }

  // Events
  $grid.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-view]');
    if(btn){
      const id = btn.getAttribute('data-view');
      openModal(id);
    }
  });
  $modal.addEventListener('click', (e)=>{
    if(e.target.hasAttribute('data-close')) closeModal();
  });
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape') closeModal();
  });

  $form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = ($name.value || '').trim();
    const shiftId = $shift.value;

    if(name.length < 2){
      showMessage('Please enter a valid name (at least 2 characters).', 'error');
      return;
    }
    const s = state.shifts[shiftId];
    if(!s){
      showMessage('Please choose a valid shift.', 'error');
      return;
    }
    if(s.participants.length >= state.capacity){
      showMessage('This shift is already full. Please choose another.', 'error');
      renderShiftSelect();
      renderGrid();
      return;
    }
    // prevent duplicate names in the same shift (case-insensitive)
    const exists = s.participants.some(p => p.name.toLowerCase() === name.toLowerCase());
    if(exists){
      showMessage('This name is already registered in this shift.', 'error');
      return;
    }

    s.participants.push({ name, ts: Date.now() });
    saveData(state);

    // UI updates
    renderShiftSelect();
    renderGrid();
    $form.reset();
    showMessage('Registered successfully!', 'success');

    // Sync to GitHub
    await afterRegisterSync();
  });

  // Initial render
  renderShiftSelect();
  renderGrid();

  // Remote read (GitHub raw)
  async function fetchRemoteAndApply(){
    if(!REMOTE_READ_URL) return;
    try{
      let url = REMOTE_READ_URL;
      url += (url.includes('?') ? '&' : '?') + 't=' + Date.now();
      const res = await fetch(url, { cache: 'no-store' });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const remote = await res.json();
      if(!validateImported(remote)) throw new Error('Invalid remote JSON schema');
      state = remote;
      saveData(state);
      renderShiftSelect();
      renderGrid();
      showMessage('Synced latest data from GitHub.', 'success');
    } catch(err){
      console.warn('Remote sync failed (read). Falling back to local data.', err);
    }
  }

  function validateImported(obj){
    if(!obj || typeof obj !== 'object') return false;
    if(typeof obj.capacity !== 'number') return false;
    if(!obj.shifts || typeof obj.shifts !== 'object') return false;
    for(const [id, s] of Object.entries(obj.shifts)){
      if(!s || typeof s !== 'object') return false;
      if(s.id !== id) return false;
      if(!Array.isArray(s.participants)) return false;
      for(const p of s.participants){
        if(!p || typeof p !== 'object') return false;
        if(typeof p.name !== 'string') return false;
      }
    }
    return true;
  }

  async function getFileSha(token){
    const url = `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/${encodeURIComponent(DATA_PATH)}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } });
    if(res.status === 404) return null;
    if(!res.ok) throw new Error(`GET contents failed ${res.status}`);
    const json = await res.json();
    return json.sha || null;
  }

  async function putFile(token, contentJson, sha){
    const url = `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/${encodeURIComponent(DATA_PATH)}`;
    const message = 'Update shift data via site';
    const body = {
      message,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(contentJson, null, 2)))),
      branch: GITHUB_BRANCH,
      sha: sha || undefined
    };
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if(!res.ok) throw new Error(`PUT contents failed ${res.status}`);
    return res.json();
  }

  async function writeRemote(){
    if(!GITHUB_OWNER || !GITHUB_REPO || !GITHUB_BRANCH || !DATA_PATH) return;
    const token = GITHUB_TOKEN;
    if(!token) { showMessage('GITHUB_TOKEN is empty. Fill it in app.js to enable saving.', 'error'); return; }
    try{
      const sha = await getFileSha(token);
      await putFile(token, state, sha);
      showMessage('Changes saved to GitHub.', 'success');
    }catch(err){
      console.error('Write to GitHub failed', err);
      showMessage('Failed to save to GitHub.', 'error');
    }
  }

  // Auto-load from remote if configured
  if(REMOTE_READ_URL){
    fetchRemoteAndApply();
  }

  // After registration, write to GitHub
  async function afterRegisterSync(){
    await writeRemote();
  }
})();
