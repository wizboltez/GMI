const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2, '0');
const key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmt = k => k.split('-').reverse().join('/'); // yyyy-mm-dd -> dd/mm/yyyy
const esc = s => s.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
let S = { habits: [], log: {} }, sel = key(new Date()), view = new Date();
view.setDate(1);

const save = () => { chrome.storage.local.set(S); render(); };
const done = (k, id) => (S.log[k] || []).includes(id);
const active = k => S.habits.some(h => done(k, h.id));

// Consecutive active days, ending today (or yesterday if nothing is done yet today)
function streak() {
  const d = new Date();
  if (!active(key(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (active(key(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function render() {
  const y = view.getFullYear(), m = view.getMonth(), grid = $('#grid'), today = key(new Date());
  $('#month').textContent = view.toLocaleString('default', { month: 'long', year: 'numeric' });
  $('#sel').textContent = `${new Date(sel + 'T00:00').toLocaleString('default', { weekday: 'long' })}, ${fmt(sel)}`;
  const days = new Date(y, m + 1, 0).getDate(), st = streak();
  $('#stats').textContent = `${st} day streak`;
  grid.innerHTML = '';
  for (let i = 0; i < view.getDay(); i++) grid.append(document.createElement('span'));
  for (let d = 1; d <= days; d++) {
    const k = `${y}-${pad(m + 1)}-${pad(d)}`, n = S.habits.filter(h => done(k, h.id)).length, c = document.createElement('button');
    c.className = 'day' + (k === sel ? ' sel' : '') + (k === today ? ' today' : '');
    c.title = `${fmt(k)}: ${n}/${S.habits.length} habits`;
    // Darker to brighter green as more of the listed habits are done
    if (n) c.style.background = `color-mix(in srgb, #39d353 ${25 + 75 * n / S.habits.length}%, #161b22)`;
    c.onclick = () => { sel = k; render(); };
    grid.append(c);
  }
  const list = $('#habits'), editable = sel === today;
  $('#plus').hidden = !editable;
  if (!editable) $('#add').hidden = true;
  list.innerHTML = '';
  if (!S.habits.length) list.innerHTML = '<li class="empty">No habits yet. Click + to add one.</li>';
  else if (!editable && !S.habits.some(h => done(sel, h.id))) list.innerHTML = '<li class="empty">No activity on this day.</li>';
  else S.habits.forEach(h => {
    const li = document.createElement('li');
    li.innerHTML = `<label><input type="checkbox" ${done(sel, h.id) ? 'checked' : ''} ${editable ? '' : 'disabled'}>${esc(h.name)}</label><button title="Delete">×</button>`;
    li.querySelector('input').onchange = e => {
      if (sel !== key(new Date())) return render(); // only today is editable
      const l = (S.log[sel] || []).filter(x => x !== h.id);
      if (e.target.checked) l.push(h.id);
      S.log[sel] = l;
      save();
    };
    li.querySelector('button').onclick = () => { if (confirm(`Delete "${h.name}"?`)) { S.habits = S.habits.filter(x => x !== h); save(); } };
    list.append(li);
  });
}

$('#prev').onclick = () => { view.setMonth(view.getMonth() - 1); render(); };
$('#next').onclick = () => { view.setMonth(view.getMonth() + 1); render(); };
$('#plus').onclick = () => { $('#add').hidden = !$('#add').hidden; $('#name').focus(); };
$('#name').onkeydown = e => { if (e.key === 'Escape') $('#add').hidden = true; };
$('#add').onsubmit = e => {
  e.preventDefault();
  S.habits.unshift({ id: Date.now(), name: $('#name').value.trim() }); // newest on top
  $('#name').value = '';
  $('#add').hidden = true;
  save();
};

chrome.storage.local.get(S, d => { S = d; render(); });
