// Карта парка — перерисована по их бумажной схеме (координаты в её системе 1100×780).
// Дорожки — граф; маршрут от парковки до дома ищется по нему и прорисовывается.
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('map');
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  // ---------- дорожки ----------
  const N = {
    P: [815, 612], A: [812, 556], B: [818, 470], C: [834, 392], D: [838, 318], E: [822, 266],
    F: [760, 244], G: [645, 236], H: [530, 240], I: [430, 254], J: [318, 282],
    T1: [300, 176], T2: [420, 146], T3: [520, 122], T4: [592, 84], T5: [682, 66], T6: [792, 76], T7: [895, 118],
    T8: [972, 164], T9: [986, 292], T10: [992, 405], T11: [1064, 432],
    K: [652, 160], V1: [872, 196], W1: [736, 182],
    M0: [328, 318], M1: [434, 304], M2: [528, 330], M3: [596, 366], M4: [655, 374], M5: [728, 368], M6: [786, 366],
    Q1: [436, 388], Q2: [420, 456], Q3: [400, 500],
    R1: [522, 392],
    S1: [692, 522], S2: [602, 502], S3: [512, 490], S4: [456, 504], S5: [656, 604],
    U1: [884, 486], U2: [922, 470],
  };
  const CHAINS = [
    ['P', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11'],
    ['G', 'K', 'T5'],
    ['E', 'V1', 'T7'],
    ['F', 'W1'],
    ['J', 'M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'C'],
    ['M1', 'Q1', 'Q2', 'Q3'],
    ['M2', 'R1'],
    ['A', 'S1', 'S2', 'S3', 'S4'],
    ['S1', 'S5'],
    ['B', 'U1', 'U2'],
  ];

  // дома: номер на схеме, точка входа в граф
  const SPOTS = {
    vozduh: { at: [298, 360], via: 'M0' },
    zemlya: { at: [392, 360], via: 'M1' },
    lesnoy2: { at: [364, 436], via: 'Q1' },
    lesnoy3: { at: [522, 440], via: 'R1' },
    lesnoy1: { at: [362, 532], via: 'Q3' },
    vanna: { at: [500, 538], via: 'S3' },
    ogon: { at: [600, 548], via: 'S2' },
    voda: { at: [614, 654], via: 'S5' },
    solnechny5: { at: [690, 422], via: 'M4' },
    solnechny6: { at: [786, 420], via: 'M6' },
  };

  // граф и поиск пути
  const adj = {};
  const dist = (a, b) => Math.hypot(N[a][0] - N[b][0], N[a][1] - N[b][1]);
  CHAINS.forEach(ch => ch.slice(1).forEach((b, i) => {
    const a = ch[i];
    (adj[a] = adj[a] || []).push(b);
    (adj[b] = adj[b] || []).push(a);
  }));
  function route(to) {
    const d = { P: 0 }, prev = {}, todo = new Set(Object.keys(N));
    while (todo.size) {
      let u = null;
      todo.forEach(k => { if (d[k] !== undefined && (u === null || d[k] < d[u])) u = k; });
      if (u === null || u === to) break;
      todo.delete(u);
      (adj[u] || []).forEach(v => {
        const nd = d[u] + dist(u, v);
        if (d[v] === undefined || nd < d[v]) { d[v] = nd; prev[v] = u; }
      });
    }
    const path = [to];
    while (path[0] !== 'P') path.unshift(prev[path[0]]);
    return path.map(k => N[k]);
  }

  // сглаживание ломаной (Catmull-Rom → кривые Безье)
  function smooth(pts) {
    if (pts.length < 3) return 'M' + pts.map(p => p.join(',')).join('L');
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const t = 0.18 * 3;
      const c1 = [p1[0] + (p2[0] - p0[0]) * t / 3, p1[1] + (p2[1] - p0[1]) * t / 3];
      const c2 = [p2[0] - (p3[0] - p1[0]) * t / 3, p2[1] - (p3[1] - p1[1]) * t / 3];
      d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
    }
    return d;
  }

  // ---------- рисунок ----------
  const defs = el('defs', {}, svg);
  defs.innerHTML = `
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 .37  0 0 0 0 .36  0 0 0 0 .28  0 0 0 .07 0"/>
    </filter>`;
  const world = el('g', {}, svg);
  el('rect', { x: -2000, y: -2000, width: 6000, height: 6000, fill: '#f4f0e6' }, world);
  el('rect', { x: -2000, y: -2000, width: 6000, height: 6000, filter: 'url(#grain)' }, world);

  const gWater = el('g', {}, world);
  const gRoads = el('g', {}, world);
  const gTrees = el('g', {}, world);
  const gIcons = el('g', {}, world);
  const gRoute = el('g', {}, world);
  const gHouses = el('g', {}, world);

  // вода: волны летом, лёд зимой
  const WAVES = [[330, 92], [470, 70], [610, 40], [740, 30], [880, 52], [990, 104], [1030, 214], [1045, 300], [1005, 252]];
  const wavesSummer = el('g', { class: 'summer-only' }, gWater);
  const wavesAnim = el('g', { class: 'waves-anim' }, wavesSummer);
  const wavesWinter = el('g', { class: 'winter-only' }, gWater);
  WAVES.forEach(([x, y]) => {
    for (let r = 0; r < 3; r++) {
      let d = `M${x},${y + r * 10}`;
      for (let k = 0; k < 4; k++) d += ` q7,-6 14,0 t14,0`;
      el('path', { d, class: 'wave' }, wavesAnim);
      el('path', { d, class: 'ice' }, wavesWinter);
    }
  });
  el('text', { x: 742, y: 22, class: 'lbl lbl--sm', 'font-style': 'italic' }, gWater).textContent = 'река Ельничная';

  // дорожки
  CHAINS.forEach(ch => el('path', { d: smooth(ch.map(k => N[k])), class: 'road' }, gRoads));
  el('rect', { x: 790, y: 612, width: 175, height: 108, rx: 2, class: 'road' }, gRoads);

  // иконки объектов — линией, как на их схеме
  const icon = (d, x, y, s = 1) => el('path', { d, class: 'ico', transform: `translate(${x},${y}) scale(${s})` }, gIcons);
  const label = (t, x, y, cls = 'lbl', anchor = 'middle') => {
    const n = el('text', { x, y, class: cls, 'text-anchor': anchor }, gIcons);
    n.textContent = t; return n;
  };
  // зонты и лежаки (летом), каток (зимой)
  const beachSummer = el('g', { class: 'summer-only' }, gIcons);
  const beachWinter = el('g', { class: 'winter-only' }, gIcons);
  [[520, 150], [572, 128]].forEach(([x, y]) => {
    el('path', { d: 'M-14,0 Q0,-12 14,0 Z M0,-6 V16', class: 'ico', transform: `translate(${x},${y})` }, beachSummer);
  });
  [[574, 204], [584, 222]].forEach(([x, y]) => {
    el('path', { d: 'M-18,4 L8,4 L18,-6 M-14,4 V9 M6,4 V9', class: 'ico', transform: `translate(${x},${y})` }, beachSummer);
  });
  el('text', { x: 506, y: 186, class: 'lbl', 'text-anchor': 'middle' }, beachSummer).textContent = 'Пляж';
  el('text', { x: 578, y: 250, class: 'lbl lbl--sm', 'text-anchor': 'middle' }, beachSummer).textContent = 'лаундж-зона';
  el('ellipse', { cx: 548, cy: 168, rx: 46, ry: 22, fill: 'none', stroke: '#b9d9ea', 'stroke-width': 2 }, beachWinter);
  el('path', { d: 'M-8,-14 V-2 H8 Q12,-2 12,2 H-10 Q-12,2 -12,-2 V-14 Z M-14,7 H14 Q16,7 16,5 M-6,2 V7 M6,2 V7', class: 'ico', transform: 'translate(548,170)' }, beachWinter);
  el('text', { x: 548, y: 210, class: 'lbl', 'text-anchor': 'middle' }, beachWinter).textContent = 'Каток и горка';
  // сап на воде летом
  el('path', { d: 'M0,0 q22,-6 44,0 q-22,6 -44,0 M22,-2 v-14', class: 'ico', transform: 'translate(410,96)' }, beachSummer);

  icon('M-6,-12 V12 M-10,-12 V-4 Q-6,0 -2,-4 V-12 M6,12 V-12 Q12,-6 10,2 H6', 612, 136); label('Кафе', 612, 164);
  icon('M-12,8 L12,-2 M-12,-2 L12,8 M0,-16 Q-8,-6 -2,2 Q4,-6 0,-16 Z', 586, 288); label('Костровище', 586, 316);
  icon('M-16,14 V-6 L-8,-16 L0,-6 V14 M0,2 L18,14 M-16,0 H0', 706, 300); label('Детская площадка', 712, 326, 'lbl lbl--sm');
  // беседки с грилем
  [[350, 300], [432, 290], [508, 292]].forEach(([x, y]) => {
    icon('M-15,-4 Q0,-14 15,-4 M-12,-4 V11 M12,-4 V11', x, y, .9);
    icon('M-5,4 Q0,10 5,4 Z M-3,8 L-5,13 M3,8 L5,13', x, y, .9);
  });
  label('барбекю-беседки', 430, 318, 'lbl lbl--sm');
  // санблок и администрация
  icon('M-22,14 V-8 L0,-20 L22,-8 V14 Z M-8,14 V2 H8 V14', 748, 478); label('санблок', 748, 506, 'lbl lbl--sm');
  icon('M-26,14 H26 M-22,14 V-4 M-11,14 V-4 M0,14 V-4 M11,14 V-4 M22,14 V-4 M-26,-4 H26 L0,-18 Z', 738, 588); label('Администрация', 738, 616);
  // бани с чаном
  [[958, 458, 'Малая баня с чаном'], [936, 540, 'Большая баня с чаном']].forEach(([x, y, t]) => {
    icon('M-22,-2 L0,-18 L22,-2 M-18,-4 V14 H18 V-4 M-18,2 H18 M-18,8 H18 M-6,14 V4 H6 V14', x, y);
    icon('M-7,-8 L0,-18 L7,-8 M-9,-8 H9 Q9,4 0,4 Q-9,4 -9,-8', x - 38, y + 4, 0.9);
    label(t, x - 8, y + 34, 'lbl lbl--sm');
  });
  // парковка
  icon('M-22,6 V-2 L-14,-12 H14 L22,-2 V6 Z M-22,6 V12 M22,6 V12 M-14,-2 H14', 878, 664);
  label('Парковка', 878, 696);
  label('въезд', 776, 606, 'lbl lbl--sm');

  // шатры (летом работают, зимой бледные)
  const TENTS = [
    [1, 'fam', 888, 404], [2, 'saf', 888, 356], [3, 'saf', 888, 306], [4, 'fam', 930, 206], [5, 'saf', 872, 152],
    [6, 'saf', 812, 168], [7, 'saf', 766, 132], [8, 'saf', 706, 128], [9, 'bell', 768, 206], [10, 'bell', 708, 208],
  ];
  const tentFill = { fam: '#8b6b4e', saf: '#d7c3a0', bell: '#7c7f4c' };
  const gTents = el('g', {}, gIcons);
  TENTS.forEach(([n, k, x, y]) => {
    const g = el('g', { class: 'tent', transform: `translate(${x},${y})` }, gTents);
    el('path', { d: 'M-12,-4 V12 H12 V-4', class: 'body' }, g);
    el('path', { d: 'M-15,-3 L0,-15 L15,-3 Z', class: 'roof', fill: tentFill[k] }, g);
    el('text', { x: 0, y: 9 }, g).textContent = n;
  });
  const tentNote = el('text', { x: 930, y: 250, class: 'lbl lbl--sm winter-only', 'text-anchor': 'middle' }, gIcons);
  tentNote.textContent = 'шатры — с мая';

  // деревья: ёлочки как в их логотипе, рассыпаны там, где пусто
  const busyPts = [];
  Object.values(SPOTS).forEach(s => { busyPts.push([s.at[0], s.at[1] - 8, 40]); busyPts.push([s.at[0], s.at[1] + 36, 34]); busyPts.push([s.at[0] - 30, s.at[1] + 34, 18]); busyPts.push([s.at[0] + 30, s.at[1] + 34, 18]); });
  TENTS.forEach(t => busyPts.push([t[2], t[3], 26]));
  [[612, 136, 26], [586, 288, 30], [706, 300, 32], [748, 478, 34], [738, 588, 40], [958, 458, 44], [936, 540, 44],
   [878, 664, 110], [430, 292, 70], [548, 160, 70], [580, 214, 30], [410, 96, 30]].forEach(p => busyPts.push(p));
  CHAINS.forEach(ch => ch.forEach(k => busyPts.push([N[k][0], N[k][1], 16])));
  CHAINS.forEach(ch => ch.slice(1).forEach((b, i) => {
    const a = N[ch[i]], c = N[b];
    for (let t = .1; t < 1; t += .1) busyPts.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, 14]);
  }));
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const treeCols = ['#5f6236', '#5f6236', '#8b6b4e', '#cdb891', '#7c7f4c'];
  const TREES = [];
  for (let i = 0; i < 2600 && TREES.length < 150; i++) {
    const x = -260 + rnd() * 1640, y = 120 + rnd() * 700;
    if (y < 150 && x > 300 && x < 1010) continue;
    if (x > 995 && y < 340) continue;
    if (busyPts.some(([bx, by, r]) => Math.hypot(bx - x, by - y) < r + 12)) continue;
    if (TREES.some(([tx, ty]) => Math.hypot(tx - x, ty - y) < 30)) continue;
    TREES.push([x, y, 14 + rnd() * 10, treeCols[Math.floor(rnd() * treeCols.length)]]);
  }
  TREES.sort((a, b) => a[1] - b[1]).forEach(([x, y, h, c]) => {
    const g = el('g', { class: 'tree', transform: `translate(${x.toFixed(1)},${y.toFixed(1)})` }, gTrees);
    let d = `M0,0 V${-h}`;
    const n = h > 19 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const yy = -h + 3 + k * h * 0.24, w = 3.5 + k * 2.3;
      d += ` M${-w},${(yy + w * .9).toFixed(1)} L0,${yy.toFixed(1)} L${w},${(yy + w * .9).toFixed(1)}`;
    }
    el('path', { d, stroke: c }, g);
    el('path', { d: `M-4,${-h + 6} L0,${-h + 1} L4,${-h + 6}`, stroke: '#fff', 'stroke-width': 2.4, class: 'winter-only' }, g);
  });

  // дома
  const houseEls = {};
  HOUSES.forEach(h => {
    const s = SPOTS[h.id];
    const [x, y] = s.at;
    const g = el('g', { class: 'house', transform: `translate(${x},${y})`, 'data-id': h.id, tabindex: 0, role: 'button', 'aria-label': h.full }, gHouses);
    const lift = el('g', { class: 'lift' }, g);
    el('rect', { x: -30, y: -40, width: 60, height: 74, class: 'hit' }, g);
    el('path', { d: 'M-17,-12 V14 H17 V-12', class: 'body' }, lift);
    el('path', { d: 'M-12,-12 V14 M12,-12 V14', class: 'logs' }, lift);
    el('path', { d: 'M-24,-10 L0,-30 L24,-10 Z', class: 'roof' }, lift);
    el('text', { x: 0, y: 7, class: 'num' }, lift).textContent = h.map;
    const short = h.name.replace(/ №\d+$/, '');
    const tag = el('text', { x: 0, y: 30, class: 'tag' }, g);
    tag.textContent = ['ogon', 'zemlya', 'voda', 'vozduh'].includes(h.id) ? `Дом «${h.name}»` : short;
    el('text', { x: 0, y: 44, class: 'price' }, g);
    houseEls[h.id] = g;
  });

  // ---------- вид: вписываем парк в свободную часть экрана ----------
  const PARK = { x: 268, y: 14, w: 818, h: 726 };
  let view = { x: 0, y: 0, w: 1100, h: 780 }, panX = 0;
  const isPhone = () => innerWidth <= 760;
  function fit() {
    const W = innerWidth, H = innerHeight;
    let rx, ry, rw, rh;
    if (isPhone()) {
      const sheet = document.getElementById('legend').offsetHeight;
      rx = 0; ry = 8; rh = H - sheet - 8; rw = W;
      const s = rh / PARK.h;
      const vw = W / s, vh = H / s;
      const maxPan = Math.max(0, PARK.w - vw);
      panX = Math.min(Math.max(panX, 0), maxPan);
      view = { x: PARK.x + panX, y: PARK.y - ry / s, w: vw, h: vh };
    } else {
      const lw = document.getElementById('legend').offsetWidth;
      rx = lw + 10; ry = 70; rw = W - rx - 40; rh = H - ry - 30;
      const s = Math.min(rw / PARK.w, rh / PARK.h);
      const ox = rx + (rw - PARK.w * s) / 2, oy = ry + (rh - PARK.h * s) / 2;
      view = { x: PARK.x - ox / s, y: PARK.y - oy / s, w: W / s, h: H / s };
    }
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
    placeCard();
  }
  addEventListener('resize', fit);

  // перетаскивание карты пальцем на телефоне
  let drag = null;
  svg.addEventListener('pointerdown', e => { if (isPhone()) drag = { x: e.clientX, pan: panX, moved: false }; });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const s = innerWidth / view.w;
    const dx = (e.clientX - drag.x) / s;
    if (Math.abs(dx) > 4) drag.moved = true;
    panX = drag.pan - dx; fit();
  });
  addEventListener('pointerup', () => setTimeout(() => (drag = null), 0));

  // ---------- состояние ----------
  const state = { night: 0, house: null };
  const priceOf = (h, i = state.night) => NIGHTS[i].p[h.type];

  // ночи
  const nightsBox = document.getElementById('nights');
  NIGHTS.forEach((n, i) => {
    const d = DAY(n.d);
    const free = HOUSES.filter(h => n.p[h.type] != null).length;
    const b = document.createElement('button');
    b.className = 'night' + (d.weekend ? ' is-weekend' : '') + (free === 0 ? ' is-full' : '');
    b.setAttribute('role', 'option');
    b.innerHTML = `<small>${d.wd}</small><b>${d.n}</b><i>${free ? free + ' своб.' : 'всё занято'}</i>`;
    b.title = `${d.wdLong}, ${d.n} ${d.month}: свободно ${free} из 10`;
    b.onclick = () => { state.night = i; render(); };
    nightsBox.appendChild(b);
  });

  // список домов
  const list = document.getElementById('houses');
  const ORDER = ['ogon', 'zemlya', 'voda', 'vozduh', 'lesnoy1', 'lesnoy2', 'lesnoy3', 'vanna', 'solnechny5', 'solnechny6'];
  const rows = {};
  ORDER.forEach(id => {
    const h = HOUSES.find(x => x.id === id);
    const li = document.createElement('li');
    li.innerHTML = `<span class="n">${h.map}</span><span class="t">${h.full}</span><span class="p"></span>`;
    li.onmouseenter = () => hot(id, true);
    li.onmouseleave = () => hot(id, false);
    li.onclick = () => select(id);
    list.appendChild(li); rows[id] = li;
  });
  function hot(id, on) {
    houseEls[id].classList.toggle('is-hot', on);
    rows[id].classList.toggle('is-hot', on);
  }
  Object.entries(houseEls).forEach(([id, g]) => {
    g.addEventListener('mouseenter', () => hot(id, true));
    g.addEventListener('mouseleave', () => hot(id, false));
    g.addEventListener('click', () => { if (!drag || !drag.moved) select(id); });
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(id); } });
  });

  // маршрут
  let routePath = null, walker = null, anim = null;
  function drawRoute(id) {
    gRoute.innerHTML = '';
    cancelAnimationFrame(anim);
    if (!id) return;
    const s = SPOTS[id];
    const pts = route(s.via).concat([[s.at[0], s.at[1] + 6]]);
    routePath = el('path', { d: smooth(pts), class: 'route' }, gRoute);
    const L = routePath.getTotalLength();
    routePath.style.strokeDasharray = `${L}`;
    routePath.style.strokeDashoffset = `${L}`;
    walker = el('circle', { r: 6, class: 'walker' }, gRoute);
    const t0 = performance.now(), dur = Math.min(2200, 500 + L * 2.4);
    const step = now => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      routePath.style.strokeDashoffset = `${L * (1 - e)}`;
      const p = routePath.getPointAtLength(L * e);
      walker.setAttribute('cx', p.x); walker.setAttribute('cy', p.y);
      if (k < 1) anim = requestAnimationFrame(step);
      else walker.setAttribute('r', 0);
    };
    anim = requestAnimationFrame(step);
  }

  function select(id) {
    state.house = state.house === id ? null : id;
    drawRoute(state.house);
    if (state.house && isPhone()) {
      // подвинуть карту, чтобы дом был в кадре
      const x = SPOTS[id].at[0];
      panX = x - PARK.x - view.w / 2;
      fit();
    }
    render();
  }

  // карточка
  const card = document.getElementById('card');
  card.querySelector('.card__close').onclick = () => select(state.house);
  addEventListener('keydown', e => { if (e.key === 'Escape' && state.house) select(state.house); });
  function placeCard() {
    if (!state.house || isPhone()) return;
    const [x, y] = SPOTS[state.house].at;
    const s = innerWidth / view.w;
    const sx = (x - view.x) * s, sy = (y - view.y) * s;
    const cw = card.offsetWidth, ch = card.offsetHeight;
    const lw = document.getElementById('legend').offsetWidth;
    const pts = route(SPOTS[state.house].via).slice(-3);
    const fromRight = pts.reduce((a, p) => a + p[0], 0) / pts.length > x;
    const R = sx + 52, Lf = sx - 52 - cw;
    let left = fromRight ? Lf : R;
    if (left < lw + 8) left = R;
    if (left + cw > innerWidth - 16) left = Lf;
    let top = sy - ch / 2;
    top = Math.max(20, Math.min(innerHeight - ch - 20, top));
    card.style.left = left + 'px'; card.style.top = top + 'px';
  }
  function fillCard() {
    const h = HOUSES.find(x => x.id === state.house);
    const p = priceOf(h);
    const d = DAY(NIGHTS[state.night].d);
    card.querySelector('.card__photo img').src = '../shared/foto/' + h.photo;
    card.querySelector('.card__num').textContent = `№ ${h.map} на схеме · ${h.area} м²`;
    card.querySelector('.card__name').textContent = h.full;
    card.querySelector('.card__line').textContent = h.line || h.perks.join(', ') + '.';
    card.querySelector('.card__facts').textContent = `${h.guests} · заезд ${h.times.replace(' / ', ', выезд ')}` + (h.line ? '' : '');
    const strip = card.querySelector('.card__strip');
    strip.innerHTML = '';
    NIGHTS.slice(0, 14).forEach((n, i) => {
      const s = document.createElement('span');
      const v = n.p[h.type];
      s.className = (v != null ? 'free' : 'busy') + (i === state.night ? ' sel' : '');
      s.textContent = DAY(n.d).n;
      s.title = `${DAY(n.d).wd}, ${DAY(n.d).n} ${DAY(n.d).month}: ` + (v != null ? RUB(v) : 'занято');
      s.onclick = () => { state.night = i; render(); };
      strip.appendChild(s);
    });
    const pr = card.querySelector('.card__price');
    const btn = card.querySelector('.card__btn');
    const date = new Date(NIGHTS[state.night].d + 'T12:00:00');
    const out = new Date(+date + 864e5);
    const fmt = x => `${String(x.getDate()).padStart(2, '0')}-${String(x.getMonth() + 1).padStart(2, '0')}-${x.getFullYear()}`;
    if (p != null) {
      pr.className = 'card__price';
      pr.innerHTML = `${RUB(p)}<small>${isPhone() ? `${d.wd} ${d.n} ${d.month.slice(0, 3)}, за ночь` : `ночь с ${d.wd} ${d.n} ${d.month}, на двоих`}</small>`;
      btn.className = 'card__btn';
      btn.textContent = 'Забронировать';
      btn.href = `https://litepms.ru/widget/search?id=7475&date_in=${fmt(date)}&date_out=${fmt(out)}&person=2`;
    } else {
      pr.className = 'card__price is-busy';
      const next = NIGHTS.findIndex((n, i) => i > state.night && n.p[h.type] != null);
      pr.innerHTML = `${d.wd} ${d.n} занят<small>${next > -1 ? 'ближайшая свободная — ' + DAY(NIGHTS[next].d).wd + ' ' + DAY(NIGHTS[next].d).n : 'свободных ночей пока нет'}</small>`;
      btn.className = 'card__btn is-off';
      btn.textContent = next > -1 ? 'На эту ночь' : 'Позвонить';
      btn.removeAttribute('href');
      btn.onclick = next > -1 ? (e => { e.preventDefault(); state.night = next; render(); }) : null;
    }
  }

  function render() {
    [...nightsBox.children].forEach((b, i) => b.setAttribute('aria-selected', i === state.night));
    HOUSES.forEach(h => {
      const p = priceOf(h);
      const g = houseEls[h.id];
      g.classList.toggle('is-busy', p == null);
      g.classList.toggle('is-free', p != null);
      g.classList.toggle('is-on', state.house === h.id);
      g.querySelector('.price').textContent = p != null ? RUB(p) : 'занят';
      const li = rows[h.id];
      li.classList.toggle('is-busy', p == null);
      li.classList.toggle('is-on', state.house === h.id);
      li.querySelector('.p').textContent = p != null ? RUB(p) : 'занят';
    });
    if (state.house) {
      fillCard();
      card.hidden = false;
      requestAnimationFrame(() => { placeCard(); card.classList.add('is-open'); });
    } else {
      card.classList.remove('is-open');
    }
  }

  // сезон
  document.querySelectorAll('.season button').forEach(b => b.onclick = () => {
    document.body.dataset.season = b.dataset.s;
    document.querySelectorAll('.season button').forEach(x => x.setAttribute('aria-pressed', x === b));
  });

  fit();
  render();
  const q = new URLSearchParams(location.search);
  if (q.get('house')) select(q.get('house'));
  if (q.get('season')) document.querySelector(`.season [data-s="${q.get('season')}"]`)?.click();
  if (q.get('night')) { state.night = +q.get('night'); render(); }
})();
