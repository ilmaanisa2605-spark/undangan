/* ============================================================
   Klik Hadir — engine/features.js
   Kumpulan fitur interaktif undangan. Mengekspos window.KH:
   countdown, initMusik, initTamu, initSalin, kalenderUrl,
   initNav, reveal. Dipanggil loader.js & theme.js.
   ============================================================ */

(function () {
  'use strict';

  function qs(sel, el) { return (el || document).querySelector(sel); }
  function qsa(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }

  function duaDigit(n) {
    n = Math.max(0, Math.floor(n));
    return (n < 10 ? '0' : '') + n;
  }

  /* ---------- countdown ---------- */
  function countdown(el, iso) {
    if (!el || !iso) return;
    var target = new Date(iso).getTime();
    if (isNaN(target)) return;

    var elD = qs('[data-cd-d]', el);
    var elH = qs('[data-cd-h]', el);
    var elM = qs('[data-cd-m]', el);
    var elS = qs('[data-cd-s]', el);

    function tulis(d, h, m, s) {
      if (elD) elD.textContent = duaDigit(d);
      if (elH) elH.textContent = duaDigit(h);
      if (elM) elM.textContent = duaDigit(m);
      if (elS) elS.textContent = duaDigit(s);
    }

    function perbarui() {
      var selisih = target - Date.now();
      if (selisih <= 0) {
        tulis(0, 0, 0, 0);
        clearInterval(timer);
        return;
      }
      var detik = Math.floor(selisih / 1000);
      tulis(
        Math.floor(detik / 86400),
        Math.floor(detik / 3600) % 24,
        Math.floor(detik / 60) % 60,
        detik % 60
      );
    }

    perbarui();
    var timer = setInterval(perbarui, 1000);
  }

  /* ---------- musik ---------- */
  function initMusik() {
    var audio = qs('audio[data-musik]');
    if (!audio) return;

    var btnBuka = document.getElementById('btn-buka');
    var btnMusik = document.getElementById('btn-musik');

    function putar() {
      var janji = audio.play();
      if (janji && janji.catch) janji.catch(function () { /* autoplay ditolak, biarkan */ });
      document.body.classList.add('kh-musik-nyala');
      if (btnMusik) btnMusik.classList.remove('kh-mati');
    }
    function jeda() {
      audio.pause();
      document.body.classList.remove('kh-musik-nyala');
      if (btnMusik) btnMusik.classList.add('kh-mati');
    }

    if (btnBuka) {
      btnBuka.addEventListener('click', function () {
        var cover = qs('[data-fitur="cover"]');
        if (cover) cover.classList.add('kh-cover-terbuka');
        document.body.classList.add('kh-terbuka');
        putar();
      });
    }

    if (btnMusik) {
      btnMusik.addEventListener('click', function () {
        if (audio.paused) putar(); else jeda();
      });
    }
  }

  /* ---------- nama tamu ---------- */
  function initTamu() {
    var to = null;
    try { to = new URLSearchParams(window.location.search).get('to'); } catch (e) { to = null; }
    if (!to) return;
    to = to.trim().slice(0, 80);
    if (!to) return;
    qsa('[data-nama-tamu]').forEach(function (el) { el.textContent = to; });
  }

  /* ---------- salin teks (rekening dsb) ---------- */
  function salinKeClipboard(teks) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(teks);
    }
    return new Promise(function (ok, gagal) {
      var ta = document.createElement('textarea');
      ta.value = teks;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        ok();
      } catch (e) { gagal(e); }
      ta.remove();
    });
  }

  function initSalin(scope) {
    var akar = scope || document;
    qsa('[data-salin]', akar).forEach(function (btn) {
      if (btn.__khSalinTerpasang) return;
      btn.__khSalinTerpasang = true;
      btn.addEventListener('click', function () {
        var teks = btn.getAttribute('data-salin') || btn.textContent || '';
        teks = teks.trim();
        if (!teks) return;
        salinKeClipboard(teks).then(function () {
          var asli = btn.innerHTML;
          btn.innerHTML = 'Tersalin!';
          btn.classList.add('kh-tersalin');
          setTimeout(function () {
            btn.innerHTML = asli;
            btn.classList.remove('kh-tersalin');
          }, 2000);
        }).catch(function () {
          alert('Gagal menyalin. Salin manual: ' + teks);
        });
      });
    });
  }

  /* ---------- link Google Calendar ---------- */
  function formatKalender(iso) {
    /* "2026-12-12T08:00:00+07:00" -> "20261212T080000" */
    var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return null;
    return m[1] + m[2] + m[3] + 'T' + m[4] + m[5] + '00';
  }

  function kalenderUrl(cfg) {
    var mulai = (cfg.acara && cfg.acara.tanggal) ? formatKalender(cfg.acara.tanggal) : null;
    var acaraPertama = (cfg.acara && cfg.acara.daftar && cfg.acara.daftar[0]) || {};
    var judul = (cfg.judul || 'Undangan Pernikahan') + (acaraPertama.nama ? ' - ' + acaraPertama.nama : '');
    var lokasi = cfg.lokasi ? [cfg.lokasi.nama, cfg.lokasi.alamat].filter(Boolean).join(', ') : '';
    var detail = acaraPertama.jam ? ('Waktu: ' + acaraPertama.jam) : '';

    var akhir = null;
    if (mulai) {
      /* +2 jam dari waktu mulai */
      var m = mulai.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
      var jam = parseInt(m[4], 10) + 2;
      var hari = m[3], bulan = m[2], tahun = m[1];
      if (jam >= 24) { jam -= 24; hari = String(parseInt(hari, 10) + 1).padStart(2, '0'); }
      akhir = tahun + bulan + hari + 'T' + String(jam).padStart(2, '0') + m[5] + m[6];
    }

    var url = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(judul) +
      (mulai ? '&dates=' + mulai + '/' + (akhir || mulai) : '') +
      (detail ? '&details=' + encodeURIComponent(detail) : '') +
      (lokasi ? '&location=' + encodeURIComponent(lokasi) : '');
    return url;
  }

  /* ---------- navigasi halus ---------- */
  function initNav() {
    qsa('[data-nav]').forEach(function (tautan) {
      if (tautan.__khNavTerpasang) return;
      tautan.__khNavTerpasang = true;
      tautan.addEventListener('click', function (e) {
        var href = tautan.getAttribute('href') || '';
        if (href.charAt(0) !== '#') return;
        var tujuan = document.getElementById(href.slice(1));
        if (!tujuan) return;
        e.preventDefault();
        try {
          tujuan.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) {
          tujuan.scrollIntoView();
        }
      });
    });
  }

  /* ---------- reveal saat scroll ---------- */
  function reveal(scope) {
    var akar = scope || document;
    var target = qsa('[data-reveal]', akar).filter(function (el) {
      return !el.classList.contains('kh-visible');
    });
    if (!target.length) return;
    if (!('IntersectionObserver' in window)) {
      target.forEach(function (el) { el.classList.add('kh-visible'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('kh-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    target.forEach(function (el) { observer.observe(el); });
  }

  window.KH = {
    countdown: countdown,
    initMusik: initMusik,
    initTamu: initTamu,
    initSalin: initSalin,
    kalenderUrl: kalenderUrl,
    initNav: initNav,
    reveal: reveal
  };
})();
