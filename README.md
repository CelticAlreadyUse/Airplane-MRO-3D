# Airplane MRO 3D — Mantiq Demo

**Demo online:** [airplane-mro-3d.vercel.app](https://airplane-mro-3d.vercel.app/)

Demo website MRO untuk **Cessna 208 Caravan**, menggunakan **Nuxt 4, Vue 3, TypeScript, dan Babylon.js**. Aplikasi mencakup eksplorasi komponen 3D, referensi manual PDF, temuan dengan tingkat kekritisan, pekerjaan/perbaikan dan pemeriksaan, request serta pemakaian sparepart, ringkasan pesawat, log penerbangan contoh, jadwal maintenance berulang, panduan presentasi, backup JSON, dan laporan pekerjaan PDF.

## Menjalankan aplikasi

Gunakan Node.js 22 dan npm. Dari root repository:

```sh
npm --prefix mro-web ci
npm --prefix mro-web run dev -- --port 3100
```

Build dan preview:

```sh
npm --prefix mro-web run typecheck
npm --prefix mro-web run build
HOST=127.0.0.1 PORT=3101 npm --prefix mro-web run preview
```

`postinstall` dan `prebuild` menyiapkan resource PDF.js dari dependency yang dikunci di package-lock. Folder resource hasil generate tidak perlu dikomit.

## Deploy ke Vercel

Import repository ini, lalu pilih:

- **Root Directory:** `mro-web`
- **Framework Preset:** Nuxt
- **Node.js:** 22.x
- **Install Command:** `npm ci`
- **Build Command:** `npm run build`
- **Output Directory:** gunakan pengaturan bawaan framework.

Aplikasi saat ini tidak memerlukan environment variable, akun, database server, atau layanan upload. Project Vercel `airplane-mro-3d` sudah terhubung ke repository ini dengan production branch `main`. Perubahan aplikasi pada branch tersebut mengikuti deploy otomatis Vercel.

## Penyimpanan data

Temuan, foto pengguna, transaksi material, kartu perbaikan, pemeriksaan, dan riwayat disimpan di **IndexedDB pada browser pengunjung**, terpisah untuk latihan dan presentasi. Data tersebut tidak diambil dari browser, tidak dimasukkan ke repository, dan tidak disinkronkan antarperangkat. Model 3D, manual, logo, ilustrasi dan data simulasi bawaan merupakan aset aplikasi yang ikut disertakan.

Alamat localhost dan domain Vercel memiliki penyimpanan terpisah. Untuk memindahkan catatan, gunakan **Pekerjaan → Data & backup** di alamat lama, lalu impor pada alamat baru. File backup, PDF laporan hasil ekspor, browser profile, screenshot dan hasil pengujian tidak disertakan di Git.

## Panduan dan verifikasi

- [Panduan demo](mro-web/DEMO.md)
- [Dokumentasi teknis dan provenance aset](mro-web/README.md)
- `tools/`: sumber pemeriksaan otomatis. Hasil pemeriksaan dibuat secara lokal dan diabaikan Git.

Untuk pemeriksaan aturan data:

```sh
node tools/prepare-verification.mjs
node tools/verify_dashboard_rules.mjs
node tools/verify_repair_rules.mjs
node tools/verify_material_rules.mjs
node tools/verify_severity_rules.mjs
node tools/verify_operations_data.mjs
```

Pemeriksaan browser membutuhkan `agent-browser`, Python dan Chromium yang sesuai dengan konfigurasi lingkungan pada script. Fixture backup dibuat dari data sintetis oleh `tools/verify_backup_report_data.mjs`, bukan dari catatan browser pengguna. Tidak diperlukan untuk build/deploy aplikasi.

## Aset dan cakupan demo

Lisensi dan atribusi sumber model dipertahankan di [model-source-licenses](mro-web/model-source-licenses/). Arsip model yang diberikan mengandung dua keterangan lisensi berbeda; repository tidak menyatakan konflik tersebut sudah terselesaikan. Lisensi font laporan juga disertakan. Logo mengikuti aset yang diberikan untuk proyek ini. Metadata manual mencantumkan sumber, revisi dan cakupan dokumen.

Data penerbangan, stok awal, interval maintenance, part number DEMO, serta contoh pekerjaan adalah simulasi. Aplikasi tidak menyatakan hasil inspeksi aktual atau pelepasan pesawat.
