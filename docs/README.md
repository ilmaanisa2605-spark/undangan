# Undangan Digital di Blogger

Satu blog Blogger + satu template tipis ("engine") untuk banyak tema undangan.
Tema, engine, dan aset disimpan di repo ini dan disajikan lewat jsDelivr.

## Arsitektur

```
Blogger (1 blog, 1 template engine.xml)
├── Beranda (/): katalog tema dari themes/index.json (catalog.js)
└── /p/<slug>.html: satu Halaman per undangan, berisi SATU BARIS config JSON
    → loader.js membaca config → fetch theme.html/css/js dari jsDelivr
    → isi placeholder {{...}} → gating fitur sesuai paket → animasi (theme.js)

jsDelivr: https://cdn.jsdelivr.net/gh/ilmaanisa2605-spark/undangan@1.0.0/...

Google Apps Script + Sheets: RSVP, ucapan, daftar tamu, check-in (apps-script/Code.gs)
```

Field `v` di config mengunci versi engine+tema untuk undangan itu — undangan lama
tidak berubah saat versi baru dirilis.

## Cara membuat undangan klien

1. Klien memilih tema dari katalog Beranda.
2. Kumpulkan data klien (nama, foto, tanggal, lokasi, rekening) lewat form brief.
3. Buka `builder/builder.html` di browser → isi form → **Hasilkan Config** → **Salin**.
4. Blogger → Halaman → Halaman baru → **mode HTML** → tempel config → permalink
   kustom (mis. `budi-sinta`) → Terbitkan.
5. Di Google Sheets: tambah tamu dengan `id_undangan` = `budi-sinta` → menu
   **Undangan → Buat link tamu & link WhatsApp**.
6. Uji di HP (`/p/budi-sinta.html?to=Nama+Tamu`), uji preview WhatsApp, kirim link.

## Cara menambah tema baru

1. Salin `themes/simple-white/` menjadi `themes/<id-tema>/`.
2. Isi `theme.json` (`id`, `nama`, `paket`, `deskripsi`, `preview: "preview.webp"`).
3. Tulis `theme.html` memakai hook wajib dari CONTRACT §3:
   placeholder `{{...}}`, `data-ulang`, `data-fitur`, `data-src`/`data-href`,
   `#btn-buka`, `#rsvp-form`, `data-countdown`, `data-musik`, `data-nama-tamu`.
4. Tulis `theme.css` (tanpa framework) dan `theme.js` (ES module, ekspor `init(ctx)`).
5. Daftarkan di `themes/index.json`. Buat `preview.webp` terpisah.
6. Buat Halaman demo (`demo-<id>.html`) dan cek di katalog.
7. Cek checklist rilis tema (plan bagian 10): layout 360–430px & desktop,
   gating paket, `prefers-reduced-motion`, Chrome Android, Safari iOS.
8. Rilis sebagai **versi baru** (lihat bawah), bukan menimpa tag lama.

## Cara rilis versi baru

1. Pastikan semua perubahan sudah di-commit ke `main`.
2. Buat tag baru (naikkan semver): `git tag 1.1.0 && git push origin 1.1.0`.
3. Perbarui BASE di CONTRACT/engine bila versi default berubah.
4. Undangan baru memakai `v` baru di config; undangan lama tetap di `v` lama.
5. Jangan pernah menimpa/menghapus tag lama — jsDelivr bisa menyimpan cache tag lama.

## Jebakan Blogger (dari pengalaman)

1. **XML error karena `&` / `<` di script inline** → script inline dibungkus `//<![CDATA[ ... //]]>`.
2. **Config harus satu baris** → Blogger bisa mengubah baris baru jadi `<br>` dan merusak JSON. Selalu minify.
3. **`&` di teks config** (mis. "Bpk. A & Ibu B") bisa diubah Blogger jadi entitas HTML → uji, atau tulis `\u0026`.
4. **Pakai editor mode HTML** untuk Halaman, jangan Compose.
5. **Kunci versi jsDelivr** (`@1.0.0`), jangan `@latest`.
6. **Cache jsDelivr** → perubahan di tag yang sama bisa tertahan; selalu naikkan versi.
7. **Matikan template seluler** di Pengaturan agar tampilan sama di HP dan `?m=1` tidak mengganggu.
8. **Autoplay musik diblokir browser** → mulai dari klik tombol buka.
9. **Navbar/atribusi** disembunyikan via CSS; widget atribusi tetap dibiarkan di XML agar template tidak error.
10. **Jangan simpan rahasia di JS publik** → honeypot + throttle + validasi (sudah di `Code.gs`).
11. **Beranda vs Halaman** → gunakan `data:blog.pageType` agar katalog hanya di Beranda, engine hanya di Halaman.
12. **Batas ukuran template & Halaman** → jaga template tipis dan config ringkas; aset besar di GitHub.

## Struktur repo

```
undangan/
├── blogger/engine.xml            # template Blogger (satu-satunya)
├── engine/                       # loader.js, core.css, features.js, client-rsvp.js, catalog.js, packages.json
├── themes/                       # index.json + folder per tema
├── demo/                         # demo-romeo-juliet.config.json + .page.html (siap tempel)
├── apps-script/Code.gs           # backend RSVP/ucapan/check-in
├── builder/builder.html          # generator config (satu file, tanpa build)
└── docs/README.md                # file ini
```
