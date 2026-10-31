# Panduan demo MRO Visual

Buka `http://127.0.0.1:3101/` dan refresh bila masih melihat versi sebelumnya.

## Menyiapkan presentasi

1. Buka tab **Ringkasan** dan tunggu indikator model siap.
2. Tekan **Demo terarah** di atas.
3. Tekan **Mulai presentasi**. Aplikasi menyiapkan tiga temuan contoh dan ilustrasi dari model 3D.

Mode presentasi mempunyai ruang penyimpanan tersendiri. Catatan latihan yang sebelumnya dibuat tetap tersimpan.

## Alur presentasi

Mulai dari **Ringkasan**: tekan angka temuan aktif, kekritisan, pemeriksaan, atau material untuk membuka daftar dengan filter yang sesuai. Jadwal dan utilisasi tetap merupakan data contoh pada 31 Oktober 2026.

Panduan enam langkah tetap tersedia ketika berpindah tab. Pilih satu **Pekerjaan panduan**; roda kiri menjadi pilihan awal. Pada tablet dan ponsel, tekan **Buka panduan** untuk memperluasnya dan **Ringkas** agar ruang kerja lebih luas.

| Langkah | Tindakan | Yang ditunjukkan |
|---|---|---|
| 1. Pilih komponen | Tekan **Lihat lokasi 3D** | Lokasi roda, fokus kamera, dan identitas sumber |
| 2. Catat temuan | **Buka temuan**, atau **Catat baru** untuk pengamatan sendiri | Catatan baru otomatis menjadi pekerjaan panduan |
| 3. Request sparepart | **Ajukan sparepart**, isi part/jumlah/catatan; lalu **Kelola sparepart** | Siapkan → serahkan → catat pemakaian / pengembalian sisa |
| 4. Catat perbaikan | Selesaikan material, lalu **Mulai tindak lanjut** bila masih terbuka; ubah ke Ditindaklanjuti | Isi teknisi, waktu, tindakan, rujukan, serta foto sebelum/sesudah pada kartu pengerjaan |
| 5. Periksa hasil | Tekan **Periksa hasil**, isi nama pemeriksa berbeda dan seluruh tinjauan | Diterima menutup pekerjaan; pengerjaan ulang mempertahankan kartu lama |
| 6. Unduh laporan | **Buka unduhan PDF**, lalu **Unduh laporan PDF** pada detail | Laporan dari catatan tersimpan, foto, material, dan riwayat pemeriksaan |

Centang berarti syarat pada catatan/sesi saat ini terpenuhi. Berpindah langkah tidak menyelesaikan pekerjaan. Langkah material memerlukan penyerahan dan pencatatan seluruh pemakaian/pengembalian. Centang PDF muncul setelah unduhan dimulai untuk revisi saat ini; reload menghapus progres unduhan sesi, tanpa menghapus pekerjaan. Gambar ilustrasi boleh dipakai untuk demonstrasi, dengan keterangan bahwa gambar bukan bukti pengerjaan aktual.

Tiga contoh awal meliputi roda kiri (Terbuka), pintu depan kiri (Ditindaklanjuti), dan propeller (Ditutup). Gambar yang disediakan adalah ilustrasi model, bukan bukti kerusakan pesawat aktual. Setiap catatan contoh diberi label **Data contoh**.

## Mengulang

Tekan **Ulangi demo**, lalu **Mulai ulang demo**. Skenario presentasi kembali menjadi tiga catatan awal dan panduan kembali ke langkah pertama. Perubahan serta catatan tambahan di mode presentasi akan diganti. Catatan latihan tetap tersimpan di ruang terpisah.

Untuk membuka kembali catatan latihan, tekan **Ulangi demo**, lalu **Kembali ke latihan**.

Reload halaman mempertahankan mode dan data saat ini; gunakan tombol ulang bila ingin kembali ke kondisi awal.

## Tampilan model

Caravan menggunakan tekstur dari aset sumber: garis merah, roda, interior, dan instrumen. Ini bukan livery atau konfigurasi unit AMA yang diverifikasi. Tombol Isolasi menampilkan objek yang dipilih. Model roda sumber masih berupa objek utuh; internal rem dan exploded view teknis belum tersedia pada aset ini.

## Membaca fungsi komponen dari manual

1. Pilih komponen di **Struktur pesawat** atau pada model 3D. Ikon buku menandai komponen yang memiliki referensi POH.
2. Panel **Dari buku manual** menampilkan ringkasan bahasa Indonesia mengenai fungsi, konstruksi, atau cara kerja yang dijelaskan sumber.
3. Tekan salah satu rujukan, misalnya **Landing gear system — Buku 7-23 · PDF 393** atau **Brake system — Buku 7-68 · PDF 438**. Tab Manual membuka halaman PDF yang sesuai.
4. Gunakan zoom atau **Halaman penuh / Sesuai lebar** untuk membaca teks sumber. Konteks komponen dan nomor halaman buku/PDF tampil di atas pembaca.
5. Tekan **Kembali ke komponen** untuk melanjutkan pada pilihan yang sama. Posisi kamera dipertahankan.

Daftar kini memuat 12 kelompok dengan keluarga instrumen yang dapat dibuka/tutup. Dari 434 objek sumber, 373 sudah terpilah dan 61 masih perlu verifikasi. Sebanyak 365 objek berbagi rujukan pada 27 halaman PDF: 108 dengan penjelasan fungsi, 43 dengan konteks sistem/area, dan 214 dengan rujukan lokasi/identifikasi saja. Angka ini menghitung objek grafis, bukan jumlah komponen pesawat independen.

Coba cari **altimeter**, buka kelompoknya, pilih jarum atau kaca, lalu buka halaman 7-92 / PDF 462. Coba **kursi** untuk halaman 7-24–25 atau keluarga **KI227** untuk suplemen ADF S3-3 / PDF 571 yang berlaku bersyarat. Setiap kartu menjelaskan cakupan rujukannya. Perangkat avionik yang tipenya belum cocok diberi rujukan lokasi panel saja. Panel pintu B/H, kontrol roda lipat bawaan sumber, Mixture, serta objek ambigu tetap menampilkan status **belum dicocokkan**. Identitas sumber dan temuan/foto lama tetap terhubung melalui ID aset yang sama.

Pencarian komponen juga mencakup ringkasan manual. Misalnya, cari **semimonocoque**, **hidraulik**, atau **tangki** untuk menemukan komponen terkait. Ringkasan diberi label arsip pelatihan dan nomor halaman mengikuti PDF lokal yang digunakan demo.

## Tema dan manual pesawat

- Tekan ikon bulan/matahari di kanan atas untuk mengganti tema. Pilihan disimpan di browser; sebelum memilih, tema mengikuti sistem.
- Tab **Model 3D** mempertahankan pilihan komponen dan kamera ketika beralih ke **Manual pesawat**.
- Di tab Manual, pilih **Pilot’s Operating Handbook** atau **Type Acceptance Report**. Cari dokumen melalui judul, jenis, atau penerbit.
- PDF dibuka langsung di aplikasi. Gunakan nomor halaman, panah, zoom, dan tombol **Halaman penuh / Sesuai lebar**. **Halaman judul** kembali ke awal buku utama; **Awal berkas** membuka halaman pertama berkas, termasuk halaman revisi pada POH.
- **Buka PDF** membuka berkas asli di tab baru; ikon unduh menyimpan salinan. **Teks halaman** menyediakan hasil ekstraksi teks halaman yang sedang dibaca.
- Buka detail revisi untuk melihat cakupan, serial, penerbit, dan sumber. POH adalah arsip bertanda *For Training Purposes Only*; laporan CAA adalah referensi sertifikasi. Keduanya tidak menggantikan AMM terkini yang sesuai unit pesawat. Tautan **Textron 1View** tersedia untuk publikasi resmi.

PDF sudah disimpan lokal; arsip POH sekitar 63,7 MB dan berisi 1.112 halaman. Halaman judul berada di halaman berkas 79. Pembaca menampilkan satu halaman pada satu waktu. Untuk presentasi, coba buka manual sekali sebelum sesi agar dokumen masuk cache browser.

Field temuan memakai latar berwarna tipis, batas lebih jelas, label wajib, dan panduan jumlah karakter. Contoh pengamatan hanya berupa placeholder; teknisi tetap mengisi kondisi yang diamati sendiri.

## Modul operasional demo

Pilihan **Pesawat aktif** saat ini berisi satu opsi: **Cessna 208 Caravan · Demo**, yang menjadi pilihan default untuk semua tab.

- **Pekerjaan** menampilkan satu entri untuk setiap temuan di ruang data yang sedang aktif. Filter status atau cari komponen, lalu buka **Detail & tindak lanjut** untuk memperbarui catatan. Status dan riwayat berasal dari temuan yang sama. **Lokasi 3D** kembali ke komponennya. Jika belum ada catatan, gunakan model untuk mencatat atau aktifkan Demo terarah.
- **Sparepart** berisi delapan item contoh. Kolom tersedia adalah stok fisik dikurangi alokasi. Cari nama/part number, filter kategori atau status stok, lalu buka detail. Ikon target menampilkan area terkait pada model jika sudah dipetakan. Daftar ini belum melakukan transaksi gudang.
- **Penerbangan** berisi delapan log sintetis, dengan total **2.000 km**, **7 jam 40 menit**, dan **8 siklus**. Cari rute/awak atau pilih periode; jumlah dan jarak pada daftar mengikuti filter, sedangkan ringkasan atas tetap menunjukkan akumulasi seluruh contoh. Detail memperlihatkan waktu WIT, rute, awak, dan durasi. Ini bukan data penerbangan aktual atau hasil GPS.
- **Jadwal maintenance** menampilkan empat aturan berulang contoh berdasarkan kalender, jam terbang, atau siklus. Status ditentukan oleh batas yang tercapai lebih dulu, menggunakan snapshot **31 Oktober 2026** dan utilisasi dari log contoh. Detail memperlihatkan tiga tanggal pada pola kalender serta batas jam/siklus. Interval belum berasal dari program perawatan resmi; daftar belum mencatat pelaksanaan pekerjaan.

Inventori, log penerbangan, dan jadwal adalah data contoh tetap. Catatan pekerjaan mengikuti temuan yang disimpan lokal; pergantian mode latihan/presentasi juga mengganti daftar pekerjaan sesuai ruang datanya. Pengulangan demo mempertahankan catatan latihan.

## Menilai tingkat kritis temuan

Saat membuat temuan, pilih **Tingkat kritis kerusakan**. Pilih **Belum dinilai** jika penilaian belum tersedia. Nilai ini terpisah dari **Prioritas pencatatan** dan diisi pengguna, tanpa klasifikasi otomatis dari foto atau model 3D.

Untuk memperbarui penilaian, buka detail temuan dari komponen atau tab **Pekerjaan**, pilih tingkat kritis baru, isi alasan pada **Catatan tindak lanjut**, lalu **Simpan tindak lanjut**. Status tidak perlu diubah. Perubahan menambah revisi dan riwayat; pemeriksaan konflik versi tetap berlaku. Foto dan identitas temuan dipertahankan.

Badge kekritisan tersedia pada kartu komponen, daftar temuan, detail dan pekerjaan. Filter **Kekritisan** pada daftar pekerjaan/temuan memilih tingkat yang diinginkan. Buka **Warna kekritisan** di viewer untuk melihat legenda. Temuan lama tanpa penilaian tetap tersimpan dan tampil sebagai **Belum dinilai**, tanpa menyimpulkan tingkat kerusakan dari prioritas lama.

## Logo, sorotan, dan tablet

Logo asli yang diberikan digunakan dalam dua varian sesuai tema. Komponen dengan temuan **Terbuka** atau **Ditindaklanjuti** memiliki border dan sorotan menurut tingkat kritis: **Rendah** kuning, **Sedang** oranye, **Tinggi** merah, **Kritis** merah tua. **Belum dinilai** memakai abu-abu. Warna mengikuti tingkat tertinggi yang telah dinilai dari temuan aktif pada komponen tersebut, termasuk ketika dipilih. Temuan aktif yang belum dinilai tetap ditandai pada label/legenda. Menutup semua temuan aktif pada komponen menghapus border. Komponen tanpa temuan yang dipilih tetap menggunakan sorotan teal.

Tablet landscape menampilkan model dan panel detail berdampingan; struktur komponen dibuka lewat tombol **Komponen**. Tablet portrait menampilkan model yang lebih lebar dengan informasi komponen di bawahnya. Tombol utama memiliki target sentuh minimal 44 px dan field memakai teks 16 px. Geser tab untuk mencapai modul lain; tabel dapat digeser di dalam area tabel. Petunjuk ruang 3D mencantumkan seret, cubit, dan ketuk.

## Menjalankan kembali

Dari folder `mro-web`:

```sh
HOST=127.0.0.1 PORT=3101 npm run preview
```

Jika hasil build belum tersedia, jalankan `npm ci` dan `npm run build` terlebih dahulu. Demo berjalan di browser lokal. Gunakan alamat dan browser yang sama agar catatan tersimpan yang sama dapat dibuka.

## Meminta sparepart untuk pekerjaan

1. Buka **Pekerjaan**, lalu pilih **Request sparepart** pada pekerjaan yang masih terbuka/ditindaklanjuti. Pilih part, jumlah, dan alasan kebutuhan.
2. Buka **Sparepart**. Permintaan muncul pada **Permintaan dari pekerjaan** dengan status **Diajukan**. Pengajuan tidak langsung mengurangi stok; stok kosong tetap dapat diminta.
3. Pilih **Siapkan part** dan isi catatan. Part dialokasikan bila stok mencukupi.
4. Pilih **Serahkan part** dan isi catatan. Stok fisik berkurang, alokasi dilepas, dan penyerahan dicatat di riwayat pekerjaan.
5. Selesaikan tindak lanjut melalui detail pekerjaan. Setelah penyerahan, catat jumlah yang dipakai atau dikembalikan. Pekerjaan ditutup setelah kartu pengerjaan diterima pada pemeriksaan demo.

Permintaan sebelum penyerahan dapat dibatalkan dengan catatan; alokasi yang telah disiapkan akan dilepas. Filter **Semua permintaan** menampilkan permintaan yang sudah diserahkan/dibatalkan. Permintaan dan stok mengikuti mode latihan/presentasi masing-masing dan tersimpan di browser yang sama dengan temuan serta foto. Item tetap merupakan katalog DEMO, belum terhubung ke gudang operator.

## Menyelesaikan pengerjaan dan pemeriksaan

1. Di **Sparepart**, gunakan **Catat dipakai** atau **Kembalikan sisa** pada part yang sudah diserahkan. Isi jumlah, pelaksana, catatan, serta seri/lot jika tersedia. Jumlah yang dikembalikan menambah stok; pemakaian tidak mengurangi stok dua kali.
2. Buka **Pekerjaan → Kartu pengerjaan**. Lengkapi teknisi, waktu mulai/selesai, tindakan dan dokumen rujukan. Tambahkan 1–3 foto sebelum serta sesudah; foto temuan awal dapat digunakan sebagai foto sebelum.
3. Tekan **Simpan & ajukan pemeriksaan**. Status berubah menjadi **Menunggu pemeriksaan** dan material dikunci sementara.
4. Pilih **Periksa hasil**. Pemeriksa demo membaca kartu, bukti foto, dan catatan material. Isi nama yang berbeda dari teknisi, keputusan, dan catatan hasil.
5. **Perlu pengerjaan ulang** mengembalikan pekerjaan untuk kartu baru tanpa menghapus bukti lama. **Diterima** memerlukan semua tinjauan kelengkapan dan menutup pekerjaan.

Detail pekerjaan menyimpan seluruh siklus kartu, catatan pemeriksa dan riwayat. Nama serta keputusan merupakan simulasi tanpa akun/tanda tangan resmi. Contoh propeller pada Demo terarah sudah memiliki kartu yang diterima; ilustrasi sebelum/sesudah bukan foto pengerjaan aktual.

## Backup dan laporan pekerjaan

- Buka **Pekerjaan → Data & backup**. Pilih mode latihan/presentasi, lalu **Unduh backup**. Foto dan seluruh kartu/riwayat ikut masuk dalam satu file JSON.
- Untuk memulihkan, pilih file backup. Periksa mode tujuan, jumlah pekerjaan, foto, kartu dan permintaan part. Pilihan **Unduh data saat ini dulu** tersedia sebelum konfirmasi penggantian.
- Centang konfirmasi lalu **Ganti data mode ...**. Isi mode tujuan diganti secara utuh; mode lainnya tetap tersimpan. Mode hasil pemulihan langsung aktif. Bila data berubah sejak pratinjau, pilih file lagi untuk memvalidasi ulang.
- Buka detail pekerjaan dan pilih **Unduh laporan PDF**. Laporan mencakup catatan tersimpan, bukti foto, rujukan, material, semua siklus pengerjaan/pemeriksaan dan riwayat. Simpan draf tindak lanjut terlebih dahulu bila ingin memasukkannya ke laporan.

File backup maksimal 64 MB. Laporan dan backup merupakan data demo yang diproses pada perangkat; belum ada penyimpanan bersama antar pengguna.
