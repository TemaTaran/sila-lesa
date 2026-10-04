// Гирлянда над костровищем — это календарь. Лампочка = ночь, яркость = сколько домов свободно.
// Лампочки висят на проводе и качаются маятником, если провести рядом курсором или пальцем.
(() => {
  const DPR = Math.min(2, devicePixelRatio || 1);
  const garland = document.getElementById('garland');
  const track = document.getElementById('track');
  const canvas = document.getElementById('bulbs');
  const ctx = canvas.getContext('2d');
  const daysBox = document.getElementById('days');
  const free = n => HOUSES.filter(h => n.p[h.type] != null).length;
  const isPhone = () => innerWidth <= 760;

  const bulbs = NIGHTS.map((n, i) => {
    const f = free(n);
    return {
      i, n, f,
      b: f === 0 ? 0 : .1 + .9 * Math.pow(f / 9, 1.25),  // яркость: одна свободная — едва тлеет, девять — горит в полную силу
      th: 0, om: 0, on: 0, ph: Math.random() * 6.28,
    };
  });
  let sel = Math.max(0, bulbs.findIndex(b => b.f > 0));

  // ---------- геометрия провода ----------
  let W = 0, H = 0, spacing = 0, pad = 0, spans = [];
  const LEAD = 15, R = 9.5;
  function wireY(x) {
    const s = spans.find(s => x >= s.a && x <= s.b) || spans[spans.length - 1];
    const c = (s.a + s.b) / 2, half = (s.b - s.a) / 2;
    const u = (x - c) / half;
    return s.y + s.sag * (1 - u * u);
  }
  function layout() {
    const phone = isPhone();
    const vw = innerWidth;
    H = garland.clientHeight;
    pad = phone ? 34 : 64;
    spacing = phone ? 54 : (vw - pad * 2) / (bulbs.length - 1);
    W = phone ? pad * 2 + spacing * (bulbs.length - 1) : vw;
    track.style.width = W + 'px';
    canvas.width = W * DPR; canvas.height = H * DPR;
    // три пролёта между «столбами», как над их костровищем
    const top = phone ? 64 : 74, sag = phone ? 36 : 58;
    const cuts = [-60, W * .34, W * .68, W + 60];
    spans = cuts.slice(1).map((b, k) => ({ a: cuts[k], b, y: top + (k % 2 ? 6 : 0), sag }));
    bulbs.forEach(b => { b.x = pad + b.i * spacing; b.y = wireY(b.x); });
    // подписи-кнопки
    daysBox.innerHTML = '';
    bulbs.forEach(b => {
      const d = DAY(b.n.d);
      const btn = document.createElement('button');
      btn.className = 'day' + (d.weekend ? ' is-weekend' : '') + (b.f === 0 ? ' is-off' : '');
      btn.style.left = b.x + 'px';
      btn.style.top = (b.y - 8) + 'px';
      btn.style.height = (LEAD + R * 2 + 62) + 'px';
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', b.i === sel);
      btn.setAttribute('aria-label', `${d.wdLong}, ${d.n} ${d.month}: свободно ${b.f} из 10`);
      btn.innerHTML = `<small>${d.wd}</small><b>${d.n}</b>`;
      btn.onmouseenter = () => { b.om += 2.2 * (Math.random() > .5 ? 1 : -1); };
      btn.onclick = () => choose(b.i);
      daysBox.appendChild(btn);
      b.btn = btn;
    });
  }

  // ---------- ветер от курсора ----------
  let px = null;
  garland.addEventListener('pointermove', e => {
    const r = track.getBoundingClientRect();
    const x = e.clientX - r.left;
    if (px != null) {
      const vx = x - px;
      bulbs.forEach(b => {
        const d = Math.abs(b.x - x);
        if (d < 90) b.om += vx * .035 * (1 - d / 90);
      });
    }
    px = x;
  });
  garland.addEventListener('pointerleave', () => (px = null));

  // ---------- кадр ----------
  const t0 = performance.now();
  let prev = t0;
  function frame(now) {
    const t = (now - t0) / 1000, dt = Math.min(.05, (now - prev) / 1000); prev = now;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // физика маятников и включение по очереди слева направо
    bulbs.forEach(b => {
      const breeze = Math.sin(t * .7 + b.ph) * .25 + Math.sin(t * 1.9 + b.ph * 2) * .1;
      b.om += (-34 * Math.sin(b.th) - 1.3 * b.om + breeze) * dt;
      b.th += b.om * dt;
      const target = t > .4 + b.i * .07 ? 1 : 0;
      b.on += (target - b.on) * Math.min(1, dt * 7);
      b.cx = b.x + Math.sin(b.th) * (LEAD + R);
      b.cy = b.y + Math.cos(b.th) * (LEAD + R);
    });

    // свечение
    ctx.globalCompositeOperation = 'lighter';
    bulbs.forEach(b => {
      if (!b.b) return;
      const fl = .93 + .07 * Math.sin(t * 9 + b.ph) * Math.sin(t * 3.1 + b.ph * 1.7);
      const k = b.b * b.on * fl * (b.i === sel ? 1.18 : 1);
      const rr = 18 + 120 * b.b;
      const g = ctx.createRadialGradient(b.cx, b.cy, 0, b.cx, b.cy, rr);
      g.addColorStop(0, `rgba(255,214,150,${.75 * k})`);
      g.addColorStop(.18, `rgba(255,180,95,${.32 * k})`);
      g.addColorStop(.5, `rgba(255,150,60,${.09 * k})`);
      g.addColorStop(1, 'rgba(255,140,50,0)');
      ctx.fillStyle = g;
      ctx.fillRect(b.cx - rr, b.cy - rr, rr * 2, rr * 2);
    });
    ctx.globalCompositeOperation = 'source-over';

    // провод
    ctx.strokeStyle = 'rgba(255,232,196,.26)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let x = -10; x <= W + 10; x += 6) { const y = wireY(x); x === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();

    // лампочки
    bulbs.forEach(b => {
      const s = Math.sin(b.th), c = Math.cos(b.th);
      const capX = b.x + s * LEAD, capY = b.y + c * LEAD;
      ctx.strokeStyle = 'rgba(255,232,196,.3)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(capX, capY); ctx.stroke();
      ctx.save();
      ctx.translate(capX, capY); ctx.rotate(-b.th);
      ctx.fillStyle = '#2a2622';
      ctx.fillRect(-4.5, -3, 9, 7);
      ctx.restore();
      const k = b.b * b.on * (b.i === sel ? 1.15 : 1);
      if (k > .01) {
        const g = ctx.createRadialGradient(b.cx - 2, b.cy - 2, 0, b.cx, b.cy, R);
        // тусклая — тёмный янтарь, яркая — почти белая
        const mix = (a, b) => Math.round(a + (b - a) * Math.min(1, k));
        g.addColorStop(0, `rgba(${mix(190, 255)},${mix(110, 250)},${mix(50, 236)},1)`);
        g.addColorStop(.5, `rgba(${mix(150, 255)},${mix(78, 210)},${mix(30, 130)},${.75 + .25 * k})`);
        g.addColorStop(1, `rgba(${mix(110, 255)},${mix(55, 150)},${mix(25, 60)},${.6 + .3 * k})`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(b.cx, b.cy, R, 0, 6.283); ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(210,220,225,.07)';
        ctx.strokeStyle = 'rgba(230,236,240,.32)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(b.cx, b.cy, R, 0, 6.283); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath(); ctx.arc(b.cx, b.cy, R - 3.5, 3.6, 4.4); ctx.stroke();
      }
    });
    requestAnimationFrame(frame);
  }

  // ---------- выбранная ночь ----------
  const box = document.getElementById('night');
  function choose(i) {
    sel = i;
    bulbs.forEach(b => b.btn && b.btn.setAttribute('aria-selected', b.i === sel));
    bulbs[i].om += 1.6;
    const n = NIGHTS[i], d = DAY(n.d), dn = DAY(NIGHTS[i + 1] ? NIGHTS[i + 1].d : n.d);
    box.querySelector('.night__title').innerHTML = `${d.wdLong[0].toUpperCase() + d.wdLong.slice(1)}, ${d.n} ${d.month} <em>→ ${dn.wd} ${dn.n}</em>`;
    const fr = HOUSES.filter(h => n.p[h.type] != null).sort((a, b) => n.p[a.type] - n.p[b.type]);
    const busy = HOUSES.filter(h => n.p[h.type] == null);
    box.querySelector('.night__count').innerHTML = fr.length ? `свободно <b>${fr.length}</b> из 10 домов` : 'всё занято';
    const din = new Date(n.d + 'T12:00:00'), dout = new Date(+din + 864e5);
    const fmt = x => `${String(x.getDate()).padStart(2, '0')}-${String(x.getMonth() + 1).padStart(2, '0')}-${x.getFullYear()}`;
    const href = `https://litepms.ru/widget/search?id=7475&date_in=${fmt(din)}&date_out=${fmt(dout)}&person=2`;
    const list = box.querySelector('.night__list');
    list.innerHTML = fr.length ? fr.map((h, k) => `
      <li style="animation-delay:${k * 45}ms">
        <img src="../shared/foto/${h.photo}" alt="">
        <div><div class="nm">${h.full}</div><div class="fx">${h.area} м² · ${h.guests}${h.pets ? ' · можно с собакой' : ''}</div></div>
        <div class="pr">${RUB(n.p[h.type])}</div>
        <a class="go" href="${href}" target="_blank" rel="noopener" aria-label="Забронировать ${h.full}">→</a>
      </li>`).join('')
      : `<li class="night__empty">В эту ночь всё занято. <a href="tel:+73433833600">Позвоните</a>&nbsp;— поставим в лист ожидания.</li>`;
    box.querySelector('.night__busy').textContent = busy.length ? 'Заняты: ' + busy.map(h => h.full).join(', ') + '.' : '';
  }

  addEventListener('resize', () => { layout(); });
  layout();
  const q = new URLSearchParams(location.search);
  choose(q.get('night') != null ? +q.get('night') : sel);
  if (isPhone() && q.get('night')) garland.scrollLeft = bulbs[+q.get('night')].x - innerWidth / 2;
  requestAnimationFrame(frame);
})();
