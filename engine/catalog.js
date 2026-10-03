/* ============================================================
   Klik Hadir — engine/catalog.js
   Mode Beranda: membaca themes/index.json dari CDN lalu
   menampilkan kartu katalog tema ke dalam #katalog.
   Tidak mengekspor apa pun; jalan otomatis.
   ============================================================ */

(function () {
  'use strict';

  var WA_NOMOR = '6280000000000'; /* placeholder, pemilik mengganti sendiri */
  var LABEL_PAKET = { basic: 'Basic', premium: 'Premium', exclusive: 'Exclusive' };

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pesanError(wadah, pesan) {
    wadah.innerHTML = '';
    var box = document.createElement('div');
    box.className = 'kh-error';
    var judul = document.createElement('strong');
    judul.textContent = 'Katalog belum bisa dimuat.';
    var isi = document.createElement('span');
    isi.textContent = pesan;
    box.appendChild(judul);
    box.appendChild(isi);
    wadah.appendChild(box);
  }

  function buatKartu(tema, BASE) {
    var id = tema.id || '';
    var nama = tema.nama || id;
    var paket = tema.paket || 'basic';
    var preview = BASE + '/themes/' + id + '/' + (tema.preview || 'preview.webp');

    var kartu = document.createElement('article');
    kartu.className = 'kh-kartu-tema';

    var gambar = document.createElement('img');
    gambar.className = 'kh-kartu-preview';
    gambar.src = preview;
    gambar.alt = 'Pratinjau tema ' + nama;
    gambar.loading = 'lazy';

    var badan = document.createElement('div');
    badan.className = 'kh-kartu-badan';

    var judul = document.createElement('h3');
    judul.className = 'kh-kartu-nama';
    judul.textContent = nama;

    var label = document.createElement('span');
    label.className = 'kh-kartu-paket kh-paket-' + paket;
    label.textContent = 'Paket ' + (LABEL_PAKET[paket] || paket);

    var deskripsi = document.createElement('p');
    deskripsi.className = 'kh-kartu-deskripsi';
    deskripsi.textContent = tema.deskripsi || '';

    var aksi = document.createElement('div');
    aksi.className = 'kh-kartu-aksi';

    var demo = document.createElement('a');
    demo.className = 'kh-btn kh-btn-garis';
    demo.href = '/p/demo-' + id + '.html';
    demo.textContent = 'Lihat Demo';

    var pesan = document.createElement('a');
    pesan.className = 'kh-btn kh-btn-utama';
    pesan.target = '_blank';
    pesan.rel = 'noopener';
    pesan.href = 'https://wa.me/' + WA_NOMOR + '?text=' +
      encodeURIComponent('Halo, saya ingin memesan tema ' + nama + ' (' + id + ') untuk undangan digital.');
    pesan.textContent = 'Pesan tema ini';

    aksi.appendChild(demo);
    aksi.appendChild(pesan);

    badan.appendChild(judul);
    badan.appendChild(label);
    if (tema.deskripsi) badan.appendChild(deskripsi);
    badan.appendChild(aksi);

    kartu.appendChild(gambar);
    kartu.appendChild(badan);
    return kartu;
  }

  function mulai() {
    var wadah = document.getElementById('katalog');
    if (!wadah) return;

    var BASE = window.__KH_BASE ||
      'https://cdn.jsdelivr.net/gh/ilmaanisa2605-spark/undangan@1.0.0';
    window.__KH_BASE = BASE;

    var judul = document.createElement('h2');
    judul.className = 'kh-katalog-judul';
    judul.textContent = 'Pilih Tema Undangan';
    var sub = document.createElement('p');
    sub.className = 'kh-katalog-sub';
    sub.textContent = 'Lihat demonya dulu, kalau cocok langsung pesan lewat WhatsApp.';
    var grid = document.createElement('div');
    grid.className = 'kh-katalog-grid';

    wadah.innerHTML = '';
    wadah.appendChild(judul);
    wadah.appendChild(sub);
    wadah.appendChild(grid);

    var memuat = document.createElement('p');
    memuat.className = 'kh-katalog-memuat';
    memuat.textContent = 'Memuat katalog tema...';
    grid.appendChild(memuat);

    fetch(BASE + '/themes/index.json')
      .then(function (r) {
        if (!r.ok) throw new Error('kode ' + r.status);
        return r.json();
      })
      .then(function (daftar) {
        grid.innerHTML = '';
        if (!Array.isArray(daftar) || !daftar.length) {
          pesanError(grid, 'Belum ada tema yang terdaftar.');
          return;
        }
        daftar.forEach(function (tema) {
          if (tema && tema.id) grid.appendChild(buatKartu(tema, BASE));
        });
      })
      .catch(function () {
        pesanError(grid, 'Gagal mengambil daftar tema. Periksa koneksi internet lalu muat ulang halaman.');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mulai);
  } else {
    mulai();
  }
})();
