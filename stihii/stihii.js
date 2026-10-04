// Четыре дома — четыре стихии. У каждой панели своё движение, взятое из самой стихии:
// огонь мерцает и роняет искры вверх, вода колышется и расходится кругами от курсора,
// над «Воздухом» летит снег и дом чуть покачивается, «Земля» неподвижна — по ней плывут горизонтали рельефа.
(() => {
  const EL = {
    ogon: { word: 'Огонь', acc: '#f08a4b', bg: '#1c120c' },
    zemlya: { word: 'Земля', acc: '#b0b97a', bg: '#12150d' },
    voda: { word: 'Вода', acc: '#8fc6da', bg: '#0b161a' },
    vozduh: { word: 'Воздух', acc: '#dde8ee', bg: '#161b1f' },
  };
  const ORDER = ['ogon', 'zemlya', 'voda', 'vozduh'];
  const H = Object.fromEntries(HOUSES.map(h => [h.id, h]));
  const minPrice = id => Math.min(...NIGHTS.map(n => n.p[H[id].type]).filter(v => v != null));
  const DPR = Math.min(2, devicePixelRatio || 1);

  // ---------- шум для мерцания и рельефа ----------
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const sm = t => t * t * (3 - 2 * t);
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    const u = sm(xf), v = sm(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const fbm = (x, y) => noise(x, y) * .6 + noise(x * 2.1, y * 2.1) * .3 + noise(x * 4.3, y * 4.3) * .1;

  // ---------- эффекты ----------
  function fire() {
    const sparks = [];
    return (ctx, w, h, t, dt, s) => {
      ctx.clearRect(0, 0, w, h);
      // тёплый свет «камина» дышит
      const f = .55 + .45 * fbm(t * 1.7, 3.1);
      const g = ctx.createRadialGradient(w * .72, h * .8, 0, w * .72, h * .8, Math.max(w, h) * .75);
      g.addColorStop(0, `rgba(255,140,60,${.20 * f + (s.hot ? .06 : 0)})`);
      g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // искры
      const rate = s.hot ? 34 : 14;
      s.acc = (s.acc || 0) + rate * dt;
      for (; s.acc >= 1; s.acc--) {
        sparks.push({ x: w * (.35 + Math.random() * .6), y: h + 4, vy: -(40 + Math.random() * 90) * DPR, ph: Math.random() * 6.28, life: 0, max: 2.2 + Math.random() * 2.6, r: (0.8 + Math.random() * 1.6) * DPR });
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life += dt;
        p.y += p.vy * dt;
        p.x += Math.sin(t * 2.3 + p.ph) * 18 * dt * DPR + (s.mx != null ? (s.mx - p.x) * .05 * dt : 0);
        const k = p.life / p.max;
        if (k >= 1 || p.y < -10) { sparks.splice(i, 1); continue; }
        const a = (1 - k) * (0.6 + 0.4 * Math.sin(t * 20 + p.ph));
        const rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        rg.addColorStop(0, `rgba(255,214,140,${a})`);
        rg.addColorStop(.25, `rgba(255,140,50,${a * .55})`);
        rg.addColorStop(1, 'rgba(255,90,20,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(p.x - p.r * 5, p.y - p.r * 5, p.r * 10, p.r * 10);
      }
      ctx.globalCompositeOperation = 'source-over';
    };
  }

  function water() {
    const rings = [];
    let last = 0, lastDrop = 0;
    return (ctx, w, h, t, dt, s) => {
      ctx.clearRect(0, 0, w, h);
      if (s.mx != null && t - last > .16 && s.moved) { rings.push({ x: s.mx, y: s.my, r: 2, a: .5 }); last = t; s.moved = false; }
      if (t - lastDrop > 1.6) { rings.push({ x: w * (.2 + Math.random() * .6), y: h * (.55 + Math.random() * .35), r: 1, a: .32 }); lastDrop = t; }
      ctx.lineWidth = 1.2 * DPR;
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.r += 60 * DPR * dt; r.a -= .22 * dt;
        if (r.a <= 0) { rings.splice(i, 1); continue; }
        for (let k = 0; k < 2; k++) {
          ctx.strokeStyle = `rgba(214,238,248,${r.a * (k ? .5 : 1)})`;
          ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r * (1 - k * .35), r.r * .42 * (1 - k * .35), 0, 0, 6.283); ctx.stroke();
        }
      }
    };
  }

  function air(indoor) {
    const flakes = [];
    let wind = 0;
    return (ctx, w, h, t, dt, s, img) => {
      if (!flakes.length || flakes.w !== w) {
        flakes.length = 0; flakes.w = w;
        const n = Math.round(w * h / (5200 * DPR * DPR));
        for (let i = 0; i < n; i++) flakes.push({ x: Math.random() * w, y: Math.random() * h, z: .4 + Math.random() * .9, ph: Math.random() * 6.28 });
      }
      ctx.clearRect(0, 0, w, h);
      if (indoor) { if (img) img.style.translate = `0 ${Math.sin(t * .55) * 6}px`; return; }
      wind += ((s.vx || 0) * .6 - wind) * Math.min(1, dt * 1.5);
      s.vx = (s.vx || 0) * Math.pow(.05, dt);
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      for (const f of flakes) {
        f.y += (16 + 26 * f.z) * DPR * dt;
        f.x += (Math.sin(t * .8 + f.ph) * 9 + 10 + wind) * f.z * DPR * dt;
        if (f.y > h + 4) { f.y = -4; f.x = Math.random() * w; }
        if (f.x > w + 4) f.x = -4; else if (f.x < -4) f.x = w + 4;
        ctx.globalAlpha = .35 + .55 * f.z;
        ctx.beginPath(); ctx.arc(f.x, f.y, (.7 + 1.6 * f.z) * DPR, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // дом «парит»: медленное покачивание по вертикали
      if (img) img.style.translate = `0 ${Math.sin(t * .55) * 7}px`;
    };
  }

  function earth() {
    let acc = 0;
    return (ctx, w, h, t, dt) => {
      acc += dt;
      if (acc < 1 / 24 && ctx.__drawn) return;   // горизонтали двигаются медленно — 24 кадра хватает
      acc = 0; ctx.__drawn = true;
      ctx.clearRect(0, 0, w, h);
      const cell = 12 * DPR, cols = Math.ceil(w / cell) + 1, rows = Math.ceil(h / cell) + 1;
      const sc = .0042 / DPR, drift = t * .018;
      const v = new Float32Array(cols * rows);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) v[j * cols + i] = fbm(i * cell * sc + 3.7, j * cell * sc + drift);
      ctx.lineWidth = 1 * DPR;
      for (let L = .22; L < .9; L += .075) {
        const major = Math.abs(((L - .22) / .075) % 4) < .01;
        ctx.strokeStyle = `rgba(196,206,140,${major ? .42 : .2})`;
        ctx.beginPath();
        for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
          const a = v[j * cols + i], b = v[j * cols + i + 1], c = v[(j + 1) * cols + i + 1], d = v[(j + 1) * cols + i];
          const idx = (a > L) | ((b > L) << 1) | ((c > L) << 2) | ((d > L) << 3);
          if (idx === 0 || idx === 15) continue;
          const x = i * cell, y = j * cell;
          const e = [
            [x + cell * (L - a) / (b - a), y], [x + cell, y + cell * (L - b) / (c - b)],
            [x + cell * (L - d) / (c - d), y + cell], [x, y + cell * (L - a) / (d - a)],
          ];
          const seg = {
            1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]], 5: [[3, 0], [1, 2]], 6: [[0, 2]], 7: [[3, 2]],
            8: [[2, 3]], 9: [[0, 2]], 10: [[0, 1], [2, 3]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[0, 3]],
          }[idx];
          for (const [p, q] of seg) { ctx.moveTo(e[p][0], e[p][1]); ctx.lineTo(e[q][0], e[q][1]); }
        }
        ctx.stroke();
      }
      // рельеф проступает снизу, к верху гаснет
      ctx.globalCompositeOperation = 'destination-in';
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.45, 'rgba(0,0,0,.25)'); g.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    };
  }
  const FX = { ogon: fire, voda: water, vozduh: air, zemlya: earth };

  // ---------- панели ----------
  const box = document.getElementById('elements');
  const layers = [];
  ORDER.forEach(id => {
    const h = H[id], e = EL[id];
    const el = document.createElement('article');
    el.className = 'el'; el.dataset.id = id; el.tabIndex = 0;
    el.style.setProperty('--acc', e.acc);
    el.style.setProperty('--k', { ogon: 3.2, zemlya: 3.45, voda: 2.95, vozduh: 3.6 }[id]);
    el.innerHTML = `
      <img class="el__img" src="../shared/foto/${h.photo}" alt="">
      <canvas></canvas>
      <div class="el__text">
        <div class="el__word">${e.word}</div>
        <div class="el__meta"><span class="m-long">${h.area} м² · ${h.guests} · </span>от ${RUB(minPrice(id))}</div>
        <div class="el__more"><div>
          <p class="el__line">${h.line}</p>
          <span class="el__go">Смотреть дом <span aria-hidden="true">→</span></span>
        </div></div>
      </div>`;
    box.appendChild(el);
    const layer = { id, el, canvas: el.querySelector('canvas'), img: el.querySelector('.el__img'), fx: FX[id](), s: {} };
    layers.push(layer);
    el.addEventListener('pointerenter', () => { box.classList.add('is-hover'); layers.forEach(l => l.el.classList.toggle('is-hot', l === layer)); layer.s.hot = true; });
    el.addEventListener('pointerleave', () => { el.classList.remove('is-hot'); layer.s.hot = false; layer.s.mx = null; });
    el.addEventListener('pointermove', ev => {
      const r = el.getBoundingClientRect();
      const nx = (ev.clientX - r.left) * DPR, ny = (ev.clientY - r.top) * DPR;
      layer.s.vx = layer.s.px != null ? (ev.clientX - layer.s.px) * 4 : 0;
      layer.s.px = ev.clientX;
      layer.s.mx = nx; layer.s.my = ny; layer.s.moved = true;
      // параллакс: земля тяжёлая и почти не двигается
      const k = id === 'zemlya' ? 3 : 10;
      layer.img.style.transform = `translate(${-((ev.clientX - r.left) / r.width - .5) * k}px, ${-((ev.clientY - r.top) / r.height - .5) * k}px)`;
    });
    el.addEventListener('click', () => open(id));
    el.addEventListener('keydown', ev => { if (ev.key === 'Enter') open(id); });
  });
  box.addEventListener('pointerleave', () => box.classList.remove('is-hover'));

  // ---------- дом крупно ----------
  const house = document.getElementById('house');
  const hl = { canvas: house.querySelector('canvas'), img: house.querySelector('.house__media img'), fx: null, s: { hot: true } };
  let current = null, sel = 0;
  function open(id) {
    current = id;
    const h = H[id], e = EL[id];
    house.dataset.id = id;
    house.style.setProperty('--acc', e.acc);
    house.style.setProperty('--hbg', e.bg);
    hl.img.src = '../shared/foto/' + (h.photo2 && innerWidth > 760 ? h.photo2 : h.photo);
    hl.fx = FX[id](id === 'vozduh' && innerWidth > 760); hl.s = { hot: true };
    house.querySelector('.house__word').textContent = e.word;
    house.querySelector('.house__name').textContent = h.full;
    house.querySelector('.house__line').textContent = h.line;
    house.querySelector('.house__facts').innerHTML =
      `<div><dt>Площадь</dt><dd>${h.area} м²</dd></div><div><dt>Гости</dt><dd>${h.guests}</dd></div><div><dt>Заезд и выезд</dt><dd>${h.times}</dd></div>`;
    house.querySelector('.house__perks').innerHTML = h.perks.map(p => `<li>${p}</li>`).join('');
    sel = NIGHTS.slice(0, 7).findIndex(n => n.p[h.type] != null);
    renderWeek();
    house.querySelector('.house__nav').innerHTML = ORDER.map(k => `<button data-k="${k}" aria-current="${k === id}">${EL[k].word}</button>`).join('');
    house.querySelectorAll('.house__nav button').forEach(b => b.onclick = () => open(b.dataset.k));
    house.classList.add('is-open'); house.setAttribute('aria-hidden', 'false');
    history.replaceState(null, '', '#' + id);
  }
  function renderWeek() {
    const h = H[current];
    const wk = house.querySelector('.house__week');
    wk.innerHTML = '';
    NIGHTS.slice(0, 7).forEach((n, i) => {
      const d = DAY(n.d), v = n.p[h.type];
      const b = document.createElement('button');
      b.className = (v == null ? 'busy' : '') + (i === sel ? ' sel' : '');
      b.innerHTML = `<small>${d.wd}</small><b>${d.n}</b><i>${v == null ? 'занят' : (v / 1000).toLocaleString('ru-RU') + ' тыс'}</i>`;
      if (v != null) b.onclick = () => { sel = i; renderWeek(); };
      wk.appendChild(b);
    });
    const cta = house.querySelector('.house__cta');
    if (sel > -1) {
      const n = NIGHTS[sel], d = DAY(n.d);
      const din = new Date(n.d + 'T12:00:00'), dout = new Date(+din + 864e5);
      const fmt = x => `${String(x.getDate()).padStart(2, '0')}-${String(x.getMonth() + 1).padStart(2, '0')}-${x.getFullYear()}`;
      cta.className = 'house__cta';
      cta.innerHTML = `<span>Забронировать ночь с ${d.wd} ${d.n} ${d.month}</span><span>${RUB(n.p[h.type])}</span>`;
      cta.href = `https://litepms.ru/widget/search?id=7475&date_in=${fmt(din)}&date_out=${fmt(dout)}&person=2`;
    } else {
      const next = NIGHTS.findIndex(n => n.p[h.type] != null);
      cta.className = 'house__cta is-off';
      cta.removeAttribute('href');
      cta.innerHTML = next > -1
        ? `<span>На этой неделе занят. Ближайшая свободная ночь — ${DAY(NIGHTS[next].d).wd} ${DAY(NIGHTS[next].d).n} ${DAY(NIGHTS[next].d).month}</span><span>${RUB(NIGHTS[next].p[h.type])}</span>`
        : '<span>Свободных ночей пока нет — позвоните, поставим в лист ожидания</span>';
    }
  }
  function close() {
    house.classList.remove('is-open'); house.setAttribute('aria-hidden', 'true');
    current = null; history.replaceState(null, '', location.pathname + location.search);
  }
  house.querySelector('.house__close').onclick = close;
  addEventListener('keydown', e => { if (e.key === 'Escape' && current) close(); });
  house.querySelector('.house__media').addEventListener('pointermove', ev => {
    const r = ev.currentTarget.getBoundingClientRect();
    hl.s.vx = hl.s.px != null ? (ev.clientX - hl.s.px) * 4 : 0; hl.s.px = ev.clientX;
    hl.s.mx = (ev.clientX - r.left) * DPR; hl.s.my = (ev.clientY - r.top) * DPR; hl.s.moved = true;
  });

  // ---------- кадр ----------
  function size(c) {
    const w = Math.round(c.clientWidth * DPR), h = Math.round(c.clientHeight * DPR);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    return [w, h];
  }
  const turb = document.getElementById('water-noise');
  let t0 = performance.now(), prev = t0;
  function frame(now) {
    const t = (now - t0) / 1000, dt = Math.min(.05, (now - prev) / 1000); prev = now;
    // вода: шум медленно «течёт»
    const k = 1 + (layers[2].s.hot || current === 'voda' ? .35 : 0);
    turb.setAttribute('baseFrequency', `${(.006 + .0012 * Math.sin(t * .35)).toFixed(5)} ${(.022 + .006 * Math.sin(t * .5 * k)).toFixed(5)}`);
    if (!current) {
      layers.forEach(l => { const [w, h] = size(l.canvas); l.fx(l.canvas.getContext('2d'), w, h, t, dt, l.s, l.img); });
    } else if (hl.fx) {
      const [w, h] = size(hl.canvas); hl.fx(hl.canvas.getContext('2d'), w, h, t, dt, hl.s, hl.img);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  const start = location.hash.slice(1) || new URLSearchParams(location.search).get('house');
  if (EL[start]) open(start);
  const hot = new URLSearchParams(location.search).get('hot');
  if (EL[hot]) layers.find(l => l.id === hot).el.dispatchEvent(new PointerEvent('pointerenter'));
})();
