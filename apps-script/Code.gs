/**
 * KlikHadir / Undangan Digital — Backend Google Apps Script
 * Menangani: daftar ucapan (GET), check-in tamu (GET), RSVP & ucapan baru (POST).
 *
 * Cara pakai:
 * 1. Buka https://script.google.com > Proyek baru > tempel file ini.
 * 2. Deploy > Deployment baru > jenis "Aplikasi web".
 *    - Jalankan sebagai: Saya (me)
 *    - Siapa yang memiliki akses: Siapa pun (Anyone)
 * 3. Salin URL /exec ke field "rsvpUrl" di config undangan.
 *
 * Sheet yang dipakai (dibuat otomatis bila belum ada):
 * - "Ucapan": id | nama | status | ucapan | waktu
 * - "RSVP":   id | nama | status | ucapan | waktu | userAgent
 * - "Tamu":   id | nama | hadir | waktu
 */

// ---------- Konfigurasi ----------
var SHEET_UCAPAN = 'Ucapan';
var SHEET_RSVP   = 'RSVP';
var SHEET_TAMU   = 'Tamu';
var STATUS_VALID = ['Hadir', 'Tidak', 'Ragu'];
var BATAS_KIRIM_PER_MENIT = 5;

// ---------- Util ----------
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok(data) {
  data = data || {};
  data.ok = true;
  return json(data);
}

function gagal(pesan) {
  return json({ ok: false, error: pesan });
}

function waktuSekarang() {
  return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
}

function dapatSheet(nama, header) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(nama);
  if (!sh) {
    sh = ss.insertSheet(nama);
    sh.appendRow(header);
  }
  return sh;
}

function kunciIP(kunci) {
  // Throttle: maks 5 kirim per menit per kunci (IP/kode tamu).
  var cache = CacheService.getScriptCache();
  var hit = cache.get(kunci);
  var jumlah = hit ? parseInt(hit, 10) : 0;
  if (jumlah >= BATAS_KIRIM_PER_MENIT) {
    return false;
  }
  cache.put(kunci, String(jumlah + 1), 60);
  return true;
}

function namaValid(nama) {
  return nama && nama.length > 0 && nama.length <= 100;
}

function statusValid(status) {
  return STATUS_VALID.indexOf(status) !== -1;
}

// ---------- GET ----------
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    var action = String(p.action || '').toLowerCase();

    if (action === 'list') {
      return daftarUcapan(p.id || '');
    }
    if (action === 'checkin') {
      return tandaiHadir(p.id || '', p.tamu || '');
    }
    return gagal('Aksi tidak dikenal. Gunakan action=list atau action=checkin.');
  } catch (err) {
    return gagal('Kesalahan server: ' + err.message);
  }
}

// GET ?action=list&id=...
function daftarUcapan(id) {
  var sh = dapatSheet(SHEET_UCAPAN, ['id', 'nama', 'status', 'ucapan', 'waktu']);
  var data = sh.getDataRange().getValues();
  var hasil = [];
  for (var i = 1; i < data.length; i++) {
    if (!id || String(data[i][0]) === String(id)) {
      hasil.push({
        nama: data[i][1],
        status: data[i][2],
        ucapan: data[i][3],
        waktu: data[i][4]
      });
    }
  }
  return ok({ data: hasil });
}

// GET ?action=checkin&id=...&tamu=...
function tandaiHadir(id, namaTamu) {
  if (!id || !namaTamu) {
    return gagal('Parameter id dan tamu wajib diisi.');
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = dapatSheet(SHEET_TAMU, ['id', 'nama', 'hadir', 'waktu']);
    var data = sh.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id) &&
          String(data[i][1]).toLowerCase() === String(namaTamu).toLowerCase()) {
        sh.getRange(i + 1, 3).setValue('YA');
        sh.getRange(i + 1, 4).setValue(waktuSekarang());
        return ok({ pesan: 'Kehadiran ' + namaTamu + ' tercatat. Terima kasih!' });
      }
    }
    return gagal('Nama tamu tidak ditemukan di daftar.');
  } finally {
    lock.releaseLock();
  }
}

// ---------- POST ----------
function doPost(e) {
  try {
    var p = (e && e.parameter) || {};

    // Honeypot: bot yang mengisi field tersembunyi "website" diabaikan diam-diam.
    if (p.website && String(p.website).trim() !== '') {
      return ok({ pesan: 'Terima kasih!' });
    }

    var action = String(p.action || '').toLowerCase();
    var kunci = 'kirim_' + (p.k || p.id || 'anon');
    if (!kunciIP(kunci)) {
      return gagal('Terlalu banyak kiriman. Coba lagi sebentar.');
    }

    if (action === 'rsvp') {
      return simpanRSVP(p);
    }
    if (action === 'ucapan') {
      return simpanUcapan(p);
    }
    return gagal('Aksi tidak dikenal. Gunakan action=rsvp atau action=ucapan.');
  } catch (err) {
    return gagal('Kesalahan server: ' + err.message);
  }
}

function simpanRSVP(p) {
  var nama = String(p.nama || '').trim();
  var status = String(p.status || '').trim();
  var ucapan = String(p.ucapan || '').trim().slice(0, 500);
  if (!namaValid(nama)) {
    return gagal('Nama wajib diisi (maksimal 100 karakter).');
  }
  if (!statusValid(status)) {
    return gagal('Status kehadiran tidak valid.');
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = dapatSheet(SHEET_RSVP, ['id', 'nama', 'status', 'ucapan', 'waktu', 'userAgent']);
    sh.appendRow([p.id || '', nama, status, ucapan, waktuSekarang(), p.ua || '']);
  } finally {
    lock.releaseLock();
  }
  return ok({ pesan: 'RSVP tersimpan. Terima kasih, ' + nama + '!' });
}

function simpanUcapan(p) {
  var nama = String(p.nama || '').trim();
  var status = String(p.status || '').trim() || 'Hadir';
  var ucapan = String(p.ucapan || '').trim().slice(0, 500);
  if (!namaValid(nama)) {
    return gagal('Nama wajib diisi (maksimal 100 karakter).');
  }
  if (!statusValid(status)) {
    return gagal('Status kehadiran tidak valid.');
  }
  if (!ucapan) {
    return gagal('Ucapan tidak boleh kosong.');
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = dapatSheet(SHEET_UCAPAN, ['id', 'nama', 'status', 'ucapan', 'waktu']);
    sh.appendRow([p.id || '', nama, status, ucapan, waktuSekarang()]);
  } finally {
    lock.releaseLock();
  }
  return ok({ pesan: 'Ucapan terkirim. Terima kasih, ' + nama + '!' });
}

// Uji cepat dari editor Apps Script (Run > testKoneksi).
function testKoneksi() {
  Logger.log('RSVP sheet: ' + dapatSheet(SHEET_RSVP, ['id', 'nama', 'status', 'ucapan', 'waktu', 'userAgent']).getName());
  Logger.log('Ucapan sheet: ' + dapatSheet(SHEET_UCAPAN, ['id', 'nama', 'status', 'ucapan', 'waktu']).getName());
  Logger.log('Tamu sheet: ' + dapatSheet(SHEET_TAMU, ['id', 'nama', 'hadir', 'waktu']).getName());
}
