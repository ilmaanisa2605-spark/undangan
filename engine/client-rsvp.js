/* ============================================================
   Klik Hadir — engine/client-rsvp.js
   Menghubungkan form RSVP & daftar ucapan ke Google Apps Script.
   Mode demo: tidak ada data yang dikirim, semua hanya di layar.
   Mengekspos window.KH_RSVP = { init(cfg) }.
   ============================================================ */

(function () {
  'use strict';

  var BATAS_KIRIM_MS = 10 * 1000; /* 1 kirim per 10 detik per browser */

  function qs(sel, el) { return (el || document).querySelector(sel); }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------- daftar ucapan ---------- */

  function buatKartuUcapan(data) {
    var kartu = document.createElement('div');
    kartu.className = 'kh-ucapan-item';

    var kepala = document.createElement('div');
    kepala.className = 'kh-ucapan-kepala';

    var nama = document.createElement('strong');
    nama.textContent = data.nama || 'Tamu';

    var status = document.createElement('span');
    status.className = 'kh-ucapan-status';
    status.textContent = data.status || '';

    kepala.appendChild(nama);
    kepala.appendChild(status);

    var isi = document.createElement('p');
    isi.className = 'kh-ucapan-isi';
    isi.textContent = data.ucapan || '';

    kartu.appendChild(kepala);
    kartu.appendChild(isi);
    return kartu;
  }

  function tampilkanDaftar(daftarEl, list) {
    if (!daftarEl) return;
    daftarEl.innerHTML = '';
    if (!list || !list.length) {
      var kosong = document.createElement('p');
      kosong.className = 'kh-ucapan-kosong';
      kosong.textContent = 'Belum ada ucapan. Jadilah yang pertama menulis ucapan!';
      daftarEl.appendChild(kosong);
      return;
    }
    list.forEach(function (u) { daftarEl.appendChild(buatKartuUcapan(u)); });
  }

  function pesanForm(form, teks, tipe) {
    var wadah = form.querySelector('[data-rsvp-pesan]');
    if (!wadah) {
      wadah = document.createElement('p');
      wadah.setAttribute('data-rsvp-pesan', '');
      wadah.className = 'kh-rsvp-pesan';
      form.appendChild(wadah);
    }
    wadah.textContent = teks;
    wadah.className = 'kh-rsvp-pesan' + (tipe ? ' kh-rsvp-' + tipe : '');
  }

  /* ---------- init utama ---------- */

  async function init(cfg) {
    cfg = cfg || {};
    var demo = cfg.demo === true;
    var form = document.getElementById('rsvp-form');
    var daftarEl = qs('[data-daftar-ucapan]');

    if (!form && !daftarEl) return;

    var daftarLokal = [];

    /* --- muat daftar ucapan awal --- */
    if (demo) {
      daftarLokal = Array.isArray(cfg.ucapanContoh) ? cfg.ucapanContoh.slice() : [];
      tampilkanDaftar(daftarEl, daftarLokal);
    } else if (cfg.rsvpUrl && daftarEl) {
      try {
        var res = await fetch(cfg.rsvpUrl + '?action=list&id=' + encodeURIComponent(cfg.id || ''));
        var data = await res.json();
        var list = Array.isArray(data) ? data : (data.ucapan || data.list || []);
        tampilkanDaftar(daftarEl, list);
      } catch (e) {
        var gagal = document.createElement('p');
        gagal.className = 'kh-ucapan-kosong';
        gagal.textContent = 'Daftar ucapan belum bisa dimuat. Coba muat ulang halaman.';
        daftarEl.innerHTML = '';
        daftarEl.appendChild(gagal);
      }
    }

    if (!form) return;

    /* --- submit form --- */
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      var namaEl = form.querySelector('[name="nama"]');
      var statusEl = form.querySelector('[name="status"]');
      var ucapanEl = form.querySelector('[name="ucapan"]');
      var maduEl = form.querySelector('[name="website"]'); /* honeypot */

      /* Honeypot terisi = bot: batal diam-diam */
      if (maduEl && maduEl.value) return;

      var nama = namaEl ? namaEl.value.trim().slice(0, 100) : '';
      var status = statusEl ? statusEl.value : '';
      var ucapan = ucapanEl ? ucapanEl.value.trim().slice(0, 500) : '';

      if (!nama) { pesanForm(form, 'Mohon isi nama Anda dulu ya.', 'error'); return; }
      if (['Hadir', 'Tidak', 'Ragu'].indexOf(status) === -1) {
        pesanForm(form, 'Mohon pilih konfirmasi kehadiran.', 'error');
        return;
      }

      /* --- mode demo: hanya di layar --- */
      if (demo) {
        daftarLokal.unshift({ nama: nama, status: status, ucapan: ucapan });
        tampilkanDaftar(daftarEl, daftarLokal);
        form.reset();
        pesanForm(form, 'Ini hanya demo, data tidak disimpan.', 'info');
        return;
      }

      if (!cfg.rsvpUrl) {
        pesanForm(form, 'Maaf, formulir belum terhubung. Coba lagi nanti.', 'error');
        return;
      }

      /* --- throttle 10 detik --- */
      var kunci = 'kh_rsvp_terakhir_' + (cfg.id || 'umum');
      var terakhir = 0;
      try { terakhir = parseInt(window.localStorage.getItem(kunci) || '0', 10); } catch (err) { terakhir = 0; }
      if (Date.now() - terakhir < BATAS_KIRIM_MS) {
        pesanForm(form, 'Tunggu beberapa detik sebelum mengirim lagi ya.', 'info');
        return;
      }

      var tombol = form.querySelector('[type="submit"]');
      var teksTombol = tombol ? tombol.textContent : '';
      if (tombol) { tombol.disabled = true; tombol.textContent = 'Mengirim...'; }

      try {
        var kirim = await fetch(cfg.rsvpUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'rsvp',
            id: cfg.id || '',
            nama: nama,
            status: status,
            ucapan: ucapan,
            website: ''
          })
        });
        var hasil = await kirim.json().catch(function () { return {}; });
        if (hasil && hasil.ok === false) throw new Error(hasil.error || 'gagal');

        try { window.localStorage.setItem(kunci, String(Date.now())); } catch (err) { /* abaikan */ }
        form.reset();
        pesanForm(form, 'Terima kasih! Konfirmasi dan ucapan Anda sudah terkirim.', 'ok');

        /* segarkan daftar ucapan */
        if (daftarEl) {
          try {
            var res2 = await fetch(cfg.rsvpUrl + '?action=list&id=' + encodeURIComponent(cfg.id || ''));
            var data2 = await res2.json();
            tampilkanDaftar(daftarEl, Array.isArray(data2) ? data2 : (data2.ucapan || data2.list || []));
          } catch (err2) { /* daftar lama tetap tampil */ }
        }
      } catch (err) {
        pesanForm(form, 'Maaf, pengiriman gagal. Periksa koneksi lalu coba lagi.', 'error');
      } finally {
        if (tombol) { tombol.disabled = false; tombol.textContent = teksTombol; }
      }
    });
  }

  window.KH_RSVP = { init: init };
})();
