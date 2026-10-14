/* ==================== CARPETAS (cámbialas aquí) ==================== */
const CARPETAS = {
  prod: 'imagenes/',   // carpeta de fotos de las prendas
  data: '',               // carpeta de productos.json (vacío = junto al index)
  php:  ''                // carpeta de los .php (vacío = junto al index; ej: 'php/')
};

/* ============ CONEXIÓN CON LOS ARCHIVOS PHP (MySQL) ============ */
let adminClave = '';   // se llena al entrar al panel de administrador
async function api(archivo, datos) {
  const r = await fetch(CARPETAS.php + archivo, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos)
  });
  const d = await r.json().catch(() => ({ ok: false, error: 'Respuesta inválida del servidor.' }));
  if (!r.ok || !d.ok) { const e = new Error(d.error || 'Error del servidor.'); e.status = r.status; throw e; }
  return d;
}

/* Si una imagen no carga, prueba la otra ruta (recursos/img/ <-> recursos/) */
document.addEventListener('error', function (e) {
  var im = e.target;
  if (!im || im.tagName !== 'IMG' || im.dataset.retry) return;
  var f = im.getAttribute('src') || '';
  if (!f || /^(data:|https?:)/.test(f)) return;
  im.dataset.retry = '1';
  im.src = f.indexOf('recursos/img/') === 0 ? f.replace('recursos/img/', 'recursos/') : f.replace('recursos/', 'recursos/img/');
}, true);

/* ============ CONFIGURACIÓN ============ */
const CFG = {
  whatsapp: '59172317516',      // número que recibe las reservas (cámbialo si es otro)
  moneda: 'Bs',
  horaIni: 10, horaFin: 20,     // horario de entregas (Lun-Sáb)
  lugares: [                    // EDITA estos lugares de entrega
    'Plaza 10 de Febrero (centro)',
    'Terminal de Buses',
    'Mercado Campero',
    'Universidad Técnica de Oruro',
    'Otro lugar (lo coordino por WhatsApp)'
  ]
};

/* ============ "BASE DE DATOS" (guardada en el navegador) ============ */
const DB = {
  get(k, d) { try { const v = localStorage.getItem('raven_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('raven_' + k, JSON.stringify(v)); return true; } catch (e) { alert('No se pudo guardar. Revisa el espacio del navegador.'); return false; } }
};
const PH = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><rect width="600" height="800" fill="#111"/><rect x="24" y="24" width="552" height="752" fill="none" stroke="#a100ff" stroke-width="3"/><text x="300" y="400" fill="#a100ff" font-family="Orbitron,Arial,sans-serif" font-size="56" font-weight="800" text-anchor="middle">RAVEN</text><text x="300" y="450" fill="#888" font-family="Arial,sans-serif" font-size="26" text-anchor="middle">Foto próximamente</text></svg>');
/* ===== FOTOS DE PRENDAS: solo el nombre del archivo (se busca en CARPETAS.prod) ===== */
const IMGS = {
  sudaderaroja:  CARPETAS.prod + 'sudaderaroja.jpg',
  sudaderacafe:  CARPETAS.prod + 'sudaderacafe.jpg',
  chamarraroja:  CARPETAS.prod + 'chamarraroja.jpg',
  chamarraploma: CARPETAS.prod + 'chamarraploma.jpg',
  busoblanco:    CARPETAS.prod + 'busoblanco.jpg',
  busobeigh:     CARPETAS.prod + 'busobeige.jpg'
  // , nueva: CARPETAS.prod + 'nueva.jpg'
};
const imgSrc = v => String(v || '').charAt(0) === '@' ? (IMGS[String(v).slice(1)] || PH) : v;
const SEED_V = 3;
const SEED = [
  { id: 'sudaderaroja', nombre: 'Sudadera roja', precio: 180, stock: 5, tallas: 'S,M,L,XL', img: '@sudaderaroja', desc: 'Tejido grueso con dos líneas azul marino.' },
  { id: 'sudaderacafe', nombre: 'Sudadera café', precio: 220, stock: 5, tallas: 'S,M,L,XL', img: '@sudaderacafe', desc: 'Media cremallera, cuello alto y bolsillos curvos.' },
  { id: 'chamarraroja', nombre: 'Chamarra roja', precio: 300, stock: 5, tallas: 'S,M,L,XL', img: '@chamarraroja', desc: 'Cortaviento guinda y azul con vivos blancos y capucha.' },
  { id: 'chamarraploma', nombre: 'Chamarra plomo', precio: 280, stock: 5, tallas: 'S,M,L,XL', img: '@chamarraploma', desc: 'Cortaviento plomo con franja verde y blanca.' },
  { id: 'busoblanco', nombre: 'Buso blanco', precio: 150, stock: 5, tallas: 'S,M,L,XL', img: '@busoblanco', desc: 'Corte ancho, cintura elástica con cordón.' },
  { id: 'busobeige', nombre: 'Buso beige', precio: 160, stock: 5, tallas: 'S,M,L,XL', img: '@busobeigh', desc: 'Cintura con cordón y franja reflectante en el tobillo.' }
];
let products = DB.get('products', null) || SEED;
if (!DB.get('products', null) && location.protocol !== 'file:') fetch(CARPETAS.data + 'productos.json').then(r => r.ok ? r.json() : null).then(d => { if (Array.isArray(d) && d.length) { products = d; renderGrid(); } }).catch(() => {});
if (DB.get('products', null) && DB.get('seedv', 0) < SEED_V) {
  const viejo = /^p([1-9]|10)$/;   // prendas de ejemplo de versiones anteriores
  products = SEED.concat(products.filter(p => !viejo.test(p.id) && !SEED.some(x => x.id === p.id)));
  DB.set('products', products); DB.set('seedv', SEED_V);
}
let cart = DB.get('cart', []);
let reservas = [];   // ahora vienen de MySQL (listar.php)

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => CFG.moneda + ' ' + (Math.round(n * 100) / 100);

/* ============ CATÁLOGO ============ */
function renderGrid() {
  const list = products;
  $('grid').innerHTML = list.length ? list.map(p => {
    const tallas = (p.tallas || '').split(',').map(t => t.trim()).filter(Boolean);
    const soon = !(p.precio > 0), out = soon || p.stock <= 0;
    return `<div class="rv-slide"><div class="card rv-card" data-id="${esc(p.id)}">
      <img src="${esc(imgSrc(p.img))}" alt="${esc(p.nombre)}" loading="lazy">
      <div class="card-body d-flex flex-column">
        <h6 class="card-title mb-1">${esc(p.nombre)}</h6>
        <p class="small text-secondary mb-2">${esc(p.desc)}</p>
        <div class="rv-price mb-2">${soon ? 'Próximamente' : money(p.precio)}</div>
        ${tallas.length && !out ? `<select class="form-select form-select-sm bg-dark text-white border-purple mb-2" aria-label="Talla">${tallas.map(t => `<option>${esc(t)}</option>`).join('')}</select>` : ''}
        <button class="btn ${out ? 'btn-secondary' : 'btn-outline-purple'} mt-auto" data-act="reservar" ${out ? 'disabled' : ''}>${out ? (soon ? 'Próximamente' : 'Agotado') : 'Reservar'}</button>
      </div></div></div>`;
  }).join('') : '<p class="text-secondary">Aún no hay prendas en el catálogo.</p>';
  arrows();
}
const track = $('grid');
let pausedUntil = 0;
function arrows() { document.querySelectorAll('.rv-nav').forEach(b => b.classList.toggle('d-none', track.scrollWidth - track.clientWidth < 4)); }
function slide(dir) {
  const max = track.scrollWidth - track.clientWidth;
  if (max < 4) return;
  const first = track.firstElementChild;
  const step = first ? first.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 20) : 300;
  if (dir > 0 && track.scrollLeft >= max - 4) track.scrollTo({ left: 0, behavior: 'smooth' });      // del final vuelve al inicio
  else if (dir < 0 && track.scrollLeft <= 4) track.scrollTo({ left: max, behavior: 'smooth' });    // del inicio salta al final
  else track.scrollBy({ left: dir * step, behavior: 'smooth' });
}
document.querySelectorAll('[data-slide]').forEach(b => b.addEventListener('click', () => { pausedUntil = Date.now() + 12000; slide(+b.dataset.slide); }));
['pointerdown', 'mousemove', 'focusin', 'touchstart', 'wheel'].forEach(ev => track.addEventListener(ev, () => { pausedUntil = Date.now() + 12000; }, { passive: true }));
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(() => { if (!document.hidden && Date.now() > pausedUntil) slide(1); }, 4000);
addEventListener('resize', arrows);
$('cLugar').innerHTML += CFG.lugares.map(l => `<option>${esc(l)}</option>`).join('');
(function () {
  let h = '<option value="">Hora</option>';
  for (let m = CFG.horaIni * 60; m < CFG.horaFin * 60; m += 30) h += `<option>${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}</option>`;
  $('cHora').innerHTML = h;
})();
const hoyISO = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
$('cFecha').min = hoyISO();

/* ============ CARRITO ============ */
function saveCart() { DB.set('cart', cart); renderCart(); }
function renderCart() {
  const n = cart.reduce((a, l) => a + l.cant, 0);
  $('cartCount').textContent = n;
  $('cartCount').classList.toggle('d-none', n === 0);
  $('cartItems').innerHTML = cart.length ? cart.map((l, i) => `
    <div class="d-flex gap-2 mb-3 align-items-center">
      <img src="${esc(imgSrc(l.img))}" alt="" class="adm-thumb">
      <div class="flex-grow-1"><div>${esc(l.nombre)}</div><div class="small text-secondary">${l.talla ? 'Talla ' + esc(l.talla) + ' · ' : ''}${money(l.precio)}</div></div>
      <div class="btn-group btn-group-sm"><button class="btn btn-outline-light" data-act="menos" data-i="${i}" aria-label="Quitar uno">−</button><span class="btn btn-dark disabled">${l.cant}</span><button class="btn btn-outline-light" data-act="mas" data-i="${i}" aria-label="Agregar uno">+</button></div>
      <button class="btn btn-sm btn-outline-danger" data-act="quitar" data-i="${i}" aria-label="Eliminar"><i class="bi bi-trash"></i></button>
    </div>`).join('') : '<p class="text-secondary">Tu reserva está vacía. Elige una prenda del catálogo.</p>';
  $('cartTotal').textContent = money(cart.reduce((a, l) => a + l.cant * l.precio, 0));
}
function addToCart(card, btn) {
  const p = products.find(x => x.id === card.dataset.id); if (!p) return;
  const sel = card.querySelector('select'); const talla = sel ? sel.value : '';
  const line = cart.find(l => l.id === p.id && l.talla === talla);
  const enCarrito = cart.filter(l => l.id === p.id).reduce((a, l) => a + l.cant, 0);
  if (enCarrito >= p.stock) { btn.textContent = 'Sin más stock'; setTimeout(() => btn.textContent = 'Reservar', 1200); return; }
  if (line) line.cant++; else cart.push({ id: p.id, nombre: p.nombre, precio: p.precio, img: p.img, talla, cant: 1 });
  saveCart(); btn.textContent = 'Añadido ✓'; setTimeout(() => btn.textContent = 'Reservar', 1000);
}
function checkout() {
  const nombre = $('cName').value.trim(), tel = $('cPhone').value.trim(), msg = $('cartMsg');
  msg.textContent = '';
  if (!cart.length) { msg.textContent = 'Agrega al menos una prenda.'; return; }
  if (nombre.replace(/ /g, '').length < 2) { msg.textContent = 'Escribe tu nombre (solo letras).'; return; }
  if (!/^\d{7,8}$/.test(tel)) { msg.textContent = 'Escribe tu celular con 7 u 8 números.'; return; }
  const lugar = $('cLugar').value, fecha = $('cFecha').value, hora = $('cHora').value;
  if (!lugar) { msg.textContent = 'Elige el lugar de entrega.'; return; }
  if (!fecha || fecha < hoyISO()) { msg.textContent = 'Elige una fecha de entrega válida.'; return; }
  if (new Date(fecha + 'T12:00').getDay() === 0) { msg.textContent = 'Los domingos estamos cerrados. Elige otro día.'; return; }
  if (!hora) { msg.textContent = 'Elige la hora de entrega.'; return; }
  if (fecha === hoyISO()) { const n = new Date(); if (hora <= String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0')) { msg.textContent = 'Esa hora ya pasó. Elige una más tarde.'; return; } }
  const entrega = fecha.split('-').reverse().join('/') + ' ' + hora;
  const total = cart.reduce((a, l) => a + l.cant * l.precio, 0);
  const r = { id: Date.now().toString(36), fecha: new Date().toLocaleString('es-BO'), cliente: nombre, telefono: tel, estado: 'Pendiente', total, lugar, entrega,
    items: cart.map(l => ({ id: l.id, nombre: l.nombre, talla: l.talla, cant: l.cant, precio: l.precio })) };
  api('guardar.php', { cliente: nombre, telefono: tel, lugar, entrega, items: r.items })
    .catch(err => alert('No se pudo guardar la reserva en el sistema (' + err.message + '). Igual se envía tu mensaje por WhatsApp.'));
  const texto = `Hola Raven Store, quiero reservar:\n` + r.items.map(i => `- ${i.cant}x ${i.nombre}${i.talla ? ' (' + i.talla + ')' : ''} - ${money(i.precio * i.cant)}`).join('\n') + `\nTotal: ${money(total)}\nNombre: ${nombre}\nCelular: ${tel}\nEntrega: ${lugar}, ${entrega}`;
  window.open('https://wa.me/' + CFG.whatsapp + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
  cart = []; saveCart(); $('cName').value = ''; $('cPhone').value = ''; $('cLugar').value = ''; $('cFecha').value = ''; $('cHora').value = '';
  bootstrap.Offcanvas.getOrCreateInstance($('cartPanel')).hide();
}
$('checkout').addEventListener('click', checkout);
$('cName').addEventListener('input', e => { e.target.value = e.target.value.replace(/[^\p{L} ]/gu, '').replace(/ {2,}/g, ' '); });
$('cPhone').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8); });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act, i = +b.dataset.i;
  if (act === 'reservar') addToCart(b.closest('.rv-card'), b);
  else if (act === 'mas') { const l = cart[i], p = products.find(x => x.id === l.id); if (p && cart.filter(c => c.id === l.id).reduce((a, c) => a + c.cant, 0) < p.stock) l.cant++; saveCart(); }
  else if (act === 'menos') { if (--cart[i].cant <= 0) cart.splice(i, 1); saveCart(); }
  else if (act === 'quitar') { cart.splice(i, 1); saveCart(); }
  else if (act === 'editP') editProduct(b.dataset.id);
  else if (act === 'delP') { if (confirm('¿Eliminar esta prenda?')) { products = products.filter(p => p.id !== b.dataset.id); DB.set('products', products); renderAdmin(); renderGrid(); } }
  else if (act === 'delR') { if (confirm('¿Eliminar esta reserva?')) { api('eliminar.php', { clave: adminClave, id: +b.dataset.id }).then(cargarReservas).catch(err => alert('No se pudo eliminar: ' + err.message)); } }
});

/* ============ ADMIN ============ */
let isAdmin = false;
$('adminLink').addEventListener('click', e => {
  e.preventDefault();
  $('adLogin').classList.toggle('d-none', isAdmin); $('adPanel').classList.toggle('d-none', !isAdmin);
  if (isAdmin) cargarReservas();
  bootstrap.Modal.getOrCreateInstance($('adminModal')).show();
});
async function cargarReservas() {
  try { const d = await api('listar.php', { clave: adminClave }); reservas = d.reservas; }
  catch (err) {
    reservas = []; renderAdmin();
    $('adRes').innerHTML = '<p class="text-danger">No se pudieron leer las reservas: ' + esc(err.message) + '</p>';
    return;
  }
  renderAdmin();
}
async function enter() {
  const clave = $('adPass').value;
  try {
    await api('listar.php', { clave });
    adminClave = clave; isAdmin = true;
    $('adPass').value = ''; $('adErr').textContent = '';
    $('adLogin').classList.add('d-none'); $('adPanel').classList.remove('d-none');
    cargarReservas();
  } catch (err) {
    $('adErr').textContent = err.status === 401 ? 'Contraseña incorrecta.' : 'No se pudo conectar con el servidor (' + err.message + ').';
  }
}
$('adEnter').addEventListener('click', enter);
$('adPass').addEventListener('keydown', e => { if (e.key === 'Enter') enter(); });

function renderAdmin() {
  $('adProds').innerHTML = products.map(p => `<tr><td><img src="${esc(imgSrc(p.img))}" alt="" class="adm-thumb"></td><td>${esc(p.nombre)}</td><td>${money(p.precio)}</td><td>${p.stock}</td><td>${esc(p.tallas)}</td>
    <td class="text-end text-nowrap"><button class="btn btn-sm btn-outline-light" data-act="editP" data-id="${esc(p.id)}">Editar</button> <button class="btn btn-sm btn-outline-danger" data-act="delP" data-id="${esc(p.id)}">Eliminar</button></td></tr>`).join('');
  const pend = reservas.filter(r => r.estado === 'Pendiente').length;
  $('resCount').textContent = pend || '';
  $('adRes').innerHTML = reservas.length ? reservas.map(r => `
    <div class="card bg-black border-secondary text-white mb-3"><div class="card-body">
      <div class="d-flex flex-wrap justify-content-between gap-2">
        <div><strong>${esc(r.cliente)}</strong> · <a class="text-info" href="tel:${esc(r.telefono)}">${esc(r.telefono)}</a><div class="small text-secondary">${esc(r.fecha)} · #${esc(r.id)}</div></div>
        <div class="d-flex gap-2 align-items-start">
          <select class="form-select form-select-sm bg-dark text-white" data-estado="${esc(r.id)}">${['Pendiente', 'Confirmada', 'Entregada', 'Cancelada'].map(s => `<option ${s === r.estado ? 'selected' : ''}>${s}</option>`).join('')}</select>
          <button class="btn btn-sm btn-outline-danger" data-act="delR" data-id="${esc(r.id)}" aria-label="Eliminar reserva"><i class="bi bi-trash"></i></button>
        </div>
      </div>
      <div class="small mt-2"><i class="bi bi-geo-alt-fill" style="color:#a100ff"></i> ${esc(r.lugar || '—')} · ${esc(r.entrega || '')}</div><ul class="mb-1 mt-1">${r.items.map(i => `<li>${i.cant}x ${esc(i.nombre)}${i.talla ? ' (' + esc(i.talla) + ')' : ''} — ${money(i.precio * i.cant)}</li>`).join('')}</ul>
      <div class="rv-price">Total ${money(r.total)}</div>
    </div></div>`).join('') : '<p class="text-secondary">Todavía no hay reservas.</p>';
}
$('adRes').addEventListener('change', e => {
  const id = e.target.dataset.estado; if (!id) return;
  api('actualizar.php', { clave: adminClave, id: +id, estado: e.target.value }).then(cargarReservas).catch(err => { alert('No se pudo cambiar el estado: ' + err.message); cargarReservas(); });
});
function resetForm() { $('pf').reset(); $('pId').value = ''; }
function editProduct(id) {
  const p = products.find(x => x.id === id); if (!p) return;
  $('pId').value = p.id; $('pNombre').value = p.nombre; $('pPrecio').value = p.precio; $('pStock').value = p.stock; $('pTallas').value = p.tallas; $('pImg').value = p.img.startsWith('data:') ? '' : p.img; $('pDesc').value = p.desc;
  $('pNombre').focus();
}
$('pPrecio').addEventListener('input', e => { const [a, ...b] = e.target.value.replace(/[^\d.]/g, '').split('.'); e.target.value = b.length ? a + '.' + b.join('') : a; });
$('pStock').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); });
$('pTallas').addEventListener('input', e => { e.target.value = e.target.value.replace(/[^A-Za-z0-9,]/g, '').toUpperCase(); });
$('pCancel').addEventListener('click', resetForm);
$('pf').addEventListener('submit', e => {
  e.preventDefault();
  if (!(+$('pPrecio').value > 0)) { alert('Escribe un precio válido, solo números.'); return; }
  const o = { id: $('pId').value || 'p' + Date.now().toString(36), nombre: $('pNombre').value.trim(), precio: +$('pPrecio').value, stock: parseInt($('pStock').value, 10) || 0,
    tallas: $('pTallas').value.trim(), img: $('pImg').value.trim(), desc: $('pDesc').value.trim() };
  const i = products.findIndex(p => p.id === o.id);
  if (i >= 0) products[i] = o; else products.push(o);
  DB.set('products', products); resetForm(); renderAdmin(); renderGrid();
});
function download(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
$('expProd').addEventListener('click', () => download('productos.json', JSON.stringify(products, null, 2), 'application/json'));
$('expJson').addEventListener('click', () => download('raven-respaldo.json', JSON.stringify({ products, reservas }, null, 2), 'application/json'));
$('expCsv').addEventListener('click', () => {
  const q = v => '"' + String(v).replace(/"/g, '""') + '"';
  const rows = [['id', 'fecha', 'cliente', 'telefono', 'estado', 'lugar', 'entrega', 'prendas', 'total']].concat(reservas.map(r => [r.id, r.fecha, r.cliente, r.telefono, r.estado, r.lugar || '', r.entrega || '', r.items.map(i => i.cant + 'x ' + i.nombre + (i.talla ? ' (' + i.talla + ')' : '')).join(' | '), r.total]));
  download('raven-reservas.csv', '\ufeff' + rows.map(r => r.map(q).join(',')).join('\n'), 'text/csv');
});

renderGrid(); renderCart();
