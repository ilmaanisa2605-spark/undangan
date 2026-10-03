/* ============================================================
   Klik Hadir — engine/loader.js
   ES module. Membaca config Halaman, memuat tema dari CDN,
   mengisi placeholder, gating fitur per paket, lalu menyerahkan
   ke theme.js. Tidak mengekspor apa pun; jalan otomatis.
   ============================================================ */

'use strict';

var REPO = 'ilmaanisa2605-spark/undangan';
var VERSI_BAWAN = '1.0.0';
var PERINGKAT_PAKET = { basic: 0, premium: 1, exclusive: 2 };
var NAMA_PAKET = { basic: 'Basic', premium: 'Premium', exclusive: 'Exclusive' };

/* ---------- util dasar ---------- */

function $(sel, el) { return (el || document).querySelector(sel); }
function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Ambil nilai dari object lewat path "mempelai.0.panggilan" */
function ambilNilai(obj, path) {
  if (path === '.') return obj;
  var bagian = String(path).split('.');
  var cur = obj;
  for (var i = 0; i < bagian.length; i++) {
    if (cur == null) return undefined;
    cur = cur[bagian[i]];
  }
  return cur;
}

/* Isi semua {{...}} dalam sebuah string memakai konteks ctx */
function isiTeks(str, ctx) {
  return String(str).replace(/\{\{\s*([\w.\[\]"]+)\s*\}\}/g, function (cocok, path) {
    var nilai = ambilNilai(ctx, path);
    if (nilai == null) return '';
    if (typeof nilai === 'object') return '';
    return escapeHtml(nilai);
  });
}

/* ---------- pesan error ramah ---------- */

function tampilkanError(pesan, detail) {
  var app = document.getElementById('app');
  if (!app) return;
  var box = document.createElement('div');
  box.className = 'kh-error';
  var judul = document.createElement('strong');
  judul.textContent = 'Ups, undangannya belum bisa ditampilkan.';
  var isi = document.createElement('p');
  isi.style.margin = '0';
  isi.textContent = pesan;
  box.appendChild(judul);
  box.appendChild(isi);
  if (detail) {
    var kecil = document.createElement('p');
    kecil.style.cssText = 'margin:8px 0 0;font-size:13px;opacity:.75';
    kecil.textContent = detail;
    box.appendChild(kecil);
  }
  app.innerHTML = '';
  app.appendChild(box);
}

/* ---------- pemuatan aset ---------- */

function muatCss(href) {
  var l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = href;
  document.head.appendChild(l);
}

function muatScript(src) {
  return new Promise(function (selesai, gagal) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = function () { selesai(); };
    s.onerror = function () { gagal(new Error('gagal memuat ' + src)); };
    document.head.appendChild(s);
  });
}

function ambilJson(url, label) {
  return fetch(url).then(function (r) {
    if (!r.ok) throw new Error(label + ' tidak ditemukan (kode ' + r.status + ').');
    return r.json();
  });
}

function ambilTeks(url, label) {
  return fetch(url).then(function (r) {
    if (!r.ok) throw new Error(label + ' tidak ditemukan (kode ' + r.status + ').');
    return r.text();
  });
}

/* ---------- ekspansi data-ulang ---------- */

function kembangkanUlang(akar, cfg) {
  $$('[data-ulang]', akar).forEach(function (wadah) {
    var path = wadah.getAttribute('data-ulang');
    var daftar = ambilNilai(cfg, path);
    var contoh = wadah.querySelector('.kh-repeat');

    if (!contoh) return;

    if (!Array.isArray(daftar) || daftar.length === 0) {
      contoh.remove();
      return;
    }

    daftar.forEach(function (item) {
      var salinan = contoh.cloneNode(true);
      /* Isi placeholder di dalam salinan: {{.}} untuk string, {{field}} untuk object */
      $$('*', salinan).forEach(function (el) {
        el.childNodes.forEach(function (node) {
          if (node.nodeType === 3) {
            node.nodeValue = String(node.nodeValue).replace(/\{\{\s*([\w.\[\]"]+)\s*\}\}/g, function (m, p) {
              var nilai;
              if (p === '.') {
                nilai = (typeof item === 'string') ? item : '';
              } else {
                nilai = (item && typeof item === 'object') ? ambilNilai(item, p) : undefined;
              }
              return (nilai == null || typeof nilai === 'object') ? '' : escapeHtml(nilai);
            });
          }
        });
        /* atribut data-src / data-href di dalam item */
        ['data-src', 'data-href'].forEach(function (at) {
          var v = el.getAttribute(at);
          if (v && v.indexOf('{{') !== -1) {
            var terisi = String(v).replace(/\{\{\s*([\w.\[\]"]+)\s*\}\}/g, function (m, p) {
              var nilai = (p === '.') ? item : (item && typeof item === 'object' ? ambilNilai(item, p) : undefined);
              return (nilai == null || typeof nilai === 'object') ? '' : String(nilai);
            });
            el.setAttribute(at, terisi);
          }
        });
        if (el.hasAttribute('data-salin')) {
          var ds = el.getAttribute('data-salin');
          if (ds && ds.indexOf('{{') !== -1) {
            el.setAttribute('data-salin', String(ds).replace(/\{\{\s*([\w.\[\]"]+)\s*\}\}/g, function (m, p) {
              var nilai = (p === '.') ? item : (item && typeof item === 'object' ? ambilNilai(item, p) : undefined);
              return (nilai == null || typeof nilai === 'object') ? '' : String(nilai);
            }));
          }
        }
      });
      wadah.appendChild(salinan);
    });
    contoh.remove();
  });
}

/* Isi placeholder teks di seluruh subtree (setelah ekspansi) */
function isiPlaceholderDom(akar, cfg) {
  var walker = document.createTreeWalker(akar, NodeFilter.SHOW_TEXT, null);
  var nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(function (node) {
    if (node.nodeValue && node.nodeValue.indexOf('{{') !== -1) {
      var tmp = document.createElement('span');
      tmp.innerHTML = isiTeks(node.nodeValue, cfg);
      node.parentNode.replaceChild(tmp, node);
      /* ratakan: pindahkan isi span ke parent */
      while (tmp.firstChild) tmp.parentNode.insertBefore(tmp.firstChild, tmp);
      tmp.remove();
    }
  });
}

/* Terapkan data-src -> src, data-href -> href */
function terapkanAtribut(akar, cfg) {
  $$('[data-src]', akar).forEach(function (el) {
    var v = el.getAttribute('data-src');
    var terisi = String(v).replace(/\{\{\s*([\w.\[\]"]+)\s*\}\}/g, function (m, p) {
      var nilai = ambilNilai(cfg, p);
      return (nilai == null || typeof nilai === 'object') ? '' : String(nilai);
    });
    if (terisi) el.setAttribute('src', terisi);
    el.removeAttribute('data-src');
  });
  $$('[data-href]', akar).forEach(function (el) {
    var v = el.getAttribute('data-href');
    var terisi = String(v).replace(/\{\{\s*([\w.\[\]"]+)\s*\}\}/g, function (m, p) {
      var nilai = ambilNilai(cfg, p);
      return (nilai == null || typeof nilai === 'object') ? '' : String(nilai);
    });
    if (terisi) el.setAttribute('href', terisi);
    el.removeAttribute('data-href');
  });
}

/* Isi nama tamu dari ?to= */
function isiNamaTamu(akar) {
  var to = null;
  try { to = new URLSearchParams(window.location.search).get('to'); } catch (e) { to = null; }
  if (!to) return;
  to = to.trim().slice(0, 80);
  if (!to) return;
  $$('[data-nama-tamu]', akar).forEach(function (el) {
    el.textContent = to;
  });
}

/* Ganti placeholder {{...}} di atribut alt (tidak terjangkau TreeWalker teks) */
function isiAlt(akar, cfg) {
  $$('[alt]', akar).forEach(function (el) {
    var v = el.getAttribute('alt');
    if (v && v.indexOf('{{') !== -1) {
      el.setAttribute('alt', isiTeks(v, cfg));
    }
  });
}

/* Countdown: isi [data-cd-d/h/m/s] dari cfg.acara.tanggal, update tiap detik */
function jalankanCountdown(akar, cfg) {
  var wadah = akar.querySelector('[data-countdown]');
  if (!wadah) return;
  var target = cfg && cfg.acara && cfg.acara.tanggal;
  if (!target) return;
  var t = Date.parse(target);
  if (isNaN(t)) return;
  var elD = wadah.querySelector('[data-cd-d]');
  var elH = wadah.querySelector('[data-cd-h]');
  var elM = wadah.querySelector('[data-cd-m]');
  var elS = wadah.querySelector('[data-cd-s]');
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var sisa = Math.max(0, t - Date.now());
    var d = Math.floor(sisa / 86400000);
    var h = Math.floor(sisa % 86400000 / 3600000);
    var m = Math.floor(sisa % 3600000 / 60000);
    var s = Math.floor(sisa % 60000 / 1000);
    if (elD) elD.textContent = d;
    if (elH) elH.textContent = pad(h);
    if (elM) elM.textContent = pad(m);
    if (elS) elS.textContent = pad(s);
  }
  tick();
  setInterval(tick, 1000);
}

/* ---------- gating & penyembunyian section kosong ---------- */

function adaIsi(v) {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'string') return v.trim() !== '';
  return true;
}

var SYARAT_DATA_FITUR = {
  countdown: function (c) { return !!(c.acara && c.acara.tanggal); },
  kisah: function (c) { return adaIsi(c.kisah); },
  galeri: function (c) { return adaIsi(c.galeri); },
  rundown: function (c) { return adaIsi(c.rundown); },
  livestream: function (c) { return adaIsi(c.livestream); },
  musik: function (c) { return adaIsi(c.musik); },
  hadiah: function (c) { return adaIsi(c.rekening); },
  info: function (c) { return adaIsi(c.info); },
  rsvp: function (c) { return !!c.rsvpUrl || c.demo === true; },
  ucapan: function (c) { return !!c.rsvpUrl || c.demo === true || adaIsi(c.ucapanContoh); },
  acara: function (c) { return !!c.acara; },
  qr: function (c) { return adaIsi(c.qr); }
};

function terapkanGating(akar, cfg, paketAktif) {
  $$('[data-fitur]', akar).forEach(function (el) {
    var fitur = el.getAttribute('data-fitur');
    if (paketAktif.indexOf(fitur) === -1) { el.remove(); return; }
    var syarat = SYARAT_DATA_FITUR[fitur];
    if (syarat && !syarat(cfg)) el.remove();
  });
}

/* ---------- mode demo ---------- */

function terapkanModeDemo(cfg, infoTema) {
  document.body.classList.add('kh-demo');

  var pita = document.createElement('div');
  pita.className = 'kh-demo-ribbon';
  pita.textContent = 'DEMO';
  document.body.appendChild(pita);

  var namaTema = (infoTema && infoTema.nama) || cfg.tema || 'tema ini';
  var teks = 'Halo, saya tertarik memesan tema ' + namaTema + ' untuk undangan digital.';
  var tombol = document.createElement('a');
  tombol.className = 'kh-order-float';
  tombol.href = 'https://wa.me/6280000000000?text=' + encodeURIComponent(teks);
  tombol.target = '_blank';
  tombol.rel = 'noopener';
  tombol.textContent = 'Pesan tema ini';
  document.body.appendChild(tombol);

  /* Halaman demo sebaiknya tidak diindeks mesin pencari */
  var meta = document.createElement('meta');
  meta.name = 'robots';
  meta.content = 'noindex,nofollow';
  document.head.appendChild(meta);
}

/* ---------- alur utama ---------- */

function bacaConfig() {
  var el = document.getElementById('config');
  if (!el) return { error: 'Blok config tidak ditemukan di Halaman ini. Pastikan Halaman memakai mode HTML dan berisi blok <script id="config">.' };
  var teks = el.textContent || el.innerText || '';
  teks = teks.trim();
  if (!teks) return { error: 'Blok config masih kosong. Tempel config JSON satu baris ke dalam Halaman ini (mode HTML).' };
  try {
    return { cfg: JSON.parse(teks) };
  } catch (e) {
    return { error: 'Blok config bukan JSON yang valid. Periksa kembali: harus satu baris, tanda kutip ganda, tanpa koma berlebih.' };
  }
}

async function mulai() {
  var hasil = bacaConfig();
  if (hasil.error) { tampilkanError(hasil.error); return; }
  var cfg = hasil.cfg;

  if (!cfg.tema) { tampilkanError('Config belum berisi nama tema ("tema").'); return; }

  var v = cfg.v || VERSI_BAWAN;
  var BASE = (window.__KH_BASE && window.__KH_BASE.indexOf('@') !== -1)
    ? window.__KH_BASE
    : ('https://cdn.jsdelivr.net/gh/' + REPO + '@' + v);
  window.__KH_BASE = BASE;

  var paketKlien = PERINGKAT_PAKET[cfg.paket] != null ? cfg.paket : 'basic';

  var paketJson, temaHtml, daftarTema;
  try {
    var hasilFetch = await Promise.all([
      ambilJson(BASE + '/engine/packages.json', 'packages.json'),
      ambilTeks(BASE + '/themes/' + cfg.tema + '/theme.html', 'theme.html tema "' + cfg.tema + '"'),
      ambilJson(BASE + '/themes/index.json', 'themes/index.json')
    ]);
    paketJson = hasilFetch[0];
    temaHtml = hasilFetch[1];
    daftarTema = hasilFetch[2];
  } catch (e) {
    tampilkanError('Gagal mengambil file tema dari internet.', e.message + ' Periksa koneksi lalu muat ulang halaman.');
    return;
  }

  /* Validasi paket tema vs paket klien */
  var infoTema = null;
  if (Array.isArray(daftarTema)) {
    infoTema = daftarTema.find(function (t) { return t && t.id === cfg.tema; }) || null;
  }
  var paketMinimal = (infoTema && infoTema.paket) || 'basic';
  if ((PERINGKAT_PAKET[paketKlien] || 0) < (PERINGKAT_PAKET[paketMinimal] || 0)) {
    tampilkanError('Tema "' + ((infoTema && infoTema.nama) || cfg.tema) + '" membutuhkan paket ' +
      (NAMA_PAKET[paketMinimal] || paketMinimal) + '.',
      'Paket undangan ini: ' + (NAMA_PAKET[paketKlien] || paketKlien) + '.');
    return;
  }

  var paketAktif = paketJson[paketKlien] || paketJson.basic || [];

  /* Pasang markup tema */
  var app = document.getElementById('app');
  if (!app) { tampilkanError('Wadah #app tidak ditemukan di template.'); return; }
  app.innerHTML = temaHtml;

  kembangkanUlang(app, cfg);
  isiPlaceholderDom(app, cfg);
  terapkanAtribut(app, cfg);
  isiAlt(app, cfg);
  isiNamaTamu(app);
  terapkanGating(app, cfg, paketAktif);
  jalankanCountdown(app, cfg);

  /* Judul + meta */
  if (cfg.judul) {
    document.title = cfg.judul;
    var desc = (cfg.salam && cfg.salam.kutipan) ? String(cfg.salam.kutipan).slice(0, 160) : cfg.judul;
    var metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = desc;
    if (cfg.cover) {
      var ogImg = document.createElement('meta');
      ogImg.setAttribute('property', 'og:image');
      ogImg.content = cfg.cover;
      document.head.appendChild(ogImg);
    }
  }

  /* Mode demo */
  var demo = cfg.demo === true;
  if (demo) terapkanModeDemo(cfg, infoTema);

  /* Normalisasi path musik relatif terhadap BASE */
  if (cfg.musik && !/^https?:\/\//i.test(cfg.musik) && cfg.musik.charAt(0) !== '/') {
    cfg.musik = BASE + '/' + cfg.musik;
  }

  /* Muat CSS + JS engine */
  muatCss(BASE + '/engine/core.css');
  muatCss(BASE + '/themes/' + cfg.tema + '/theme.css');
  try {
    await muatScript(BASE + '/engine/features.js');
    await muatScript(BASE + '/engine/client-rsvp.js');
  } catch (e) {
    tampilkanError('Gagal memuat fitur engine.', 'Periksa koneksi lalu muat ulang halaman.');
    return;
  }

  /* Terapkan link kalender otomatis bila KH tersedia */
  try {
    if (window.KH && typeof window.KH.kalenderUrl === 'function') {
      var urlKal = window.KH.kalenderUrl(cfg);
      $$('[data-kalender]', app).forEach(function (a) { a.href = urlKal; });
    }
    if (window.KH_RSVP && typeof window.KH_RSVP.init === 'function') {
      await window.KH_RSVP.init(cfg);
    }
  } catch (e) {
    tampilkanError('Terjadi kesalahan saat menyiapkan fitur undangan.', e.message);
    return;
  }

  /* Terakhir: jalankan animasi khas tema */
  try {
    var tema = await import(BASE + '/themes/' + cfg.tema + '/theme.js');
    var helpers = {
      qs: $, qsa: $$,
      on: function (el, ev, fn) { if (el) el.addEventListener(ev, fn); },
      formatTanggal: function (iso) {
        try {
          return new Date(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) { return iso; }
      },
      salinTeks: function (teks) {
        if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(teks);
        return new Promise(function (ok, no) {
          var ta = document.createElement('textarea');
          ta.value = teks;
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); ok(); } catch (e) { no(e); }
          ta.remove();
        });
      }
    };
    if (tema && typeof tema.init === 'function') {
      tema.init({ cfg: cfg, aktif: paketAktif, root: app, helpers: helpers });
    }
  } catch (e) {
    /* theme.js opsional: undangan tetap tampil tanpa animasi khas tema */
    if (window.console) console.warn('theme.js tidak dapat dimuat:', e);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () { mulai().catch(function (e) {
    tampilkanError('Terjadi kesalahan tak terduga.', e.message);
  }); });
} else {
  mulai().catch(function (e) {
    tampilkanError('Terjadi kesalahan tak terduga.', e.message);
  });
}
