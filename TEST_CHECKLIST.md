# Kuran Uygulaması — Manuel Test Kontrol Listesi

Her deploy öncesi aşağıdaki senaryolar elle test edilmeli.
✅ = Geçti  ❌ = Başarısız  ⚠️ = Kısmi

---

## 1. İlk Yükleme

- [ ] Sayfa açılıyor, Fatiha suresi yükleniyor
- [ ] Daha önce yer imi varsa o sure açılıyor
- [ ] Dark mode tercihi korunuyor (yenile → aynı tema)
- [ ] Font boyutu tercihi korunuyor
- [ ] Oynatma hızı tercihi korunuyor
- [ ] Tekrar modu tercihi korunuyor
- [ ] Sıralama tipi (mushaf/iniş) tercihi korunuyor

---

## 2. Sure Navigasyonu

- [ ] Sidebar'dan sure tıklanınca yükleniyor
- [ ] Mobile select dropdown ile sure değiştiriliyor
- [ ] Sayfa yenilenince (hash ile) aynı surede kalıyor
- [ ] Sure yüklenemeyince toast gösteriliyor (ağı kes, dene)

---

## 3. Arama

- [ ] Kelime araması çalışıyor (örn: "namaz")
- [ ] Sure adıyla navigasyon (örn: "Yasin") → sureye gidiyor
- [ ] Sure + ayet navigasyonu (örn: "Bakara 255") → doğru ayete gidiyor
- [ ] Sure + ayet navigasyonu (örn: "Ali İmran 94") → play çalışıyor
- [ ] Sure scope araması (örn: "Bakara namaz") → sadece Bakara sonuçları
- [ ] Geçersiz sure adı + sayı (örn: "xyz 10") → text arama yapıyor
- [ ] Boş arama → reader'a dönüyor, sonuçlar temizleniyor
- [ ] X butonu → arama temizleniyor, reader'a dönüyor

---

## 4. Ses Oynatma

- [ ] "Dinle" butonu → ses başlıyor
- [ ] Aktif ayet vurgulanıyor
- [ ] Otomatik sonraki ayete geçiyor
- [ ] Son ayette sonraki sureye geçiyor
- [ ] Önceki/Sonraki butonları çalışıyor
- [ ] Klavye: Space oynat/duraklat, → sonraki, ← önceki
- [ ] 1.5x hız ayarlanıp ayet geçince hız korunuyor
- [ ] Jump navigasyon sonrası (örn: "Ali İmran 94") ilk play çalışıyor
- [ ] Tekrar modu: tek ayet (1) → ayet bittikten sonra tekrar başlıyor
- [ ] Tekrar modu: tümü (∞) → liste bittikten sonra başa dönüyor
- [ ] Player bar progress çubuğu tıklanınca seek ediyor
- [ ] Player bar "X" → çalar kapanıyor

---

## 5. Listeler (Playlist)

- [ ] Ayete tıkla → "Listeye Ekle" → mini modal açılıyor
- [ ] Modal dışına tıkla → kapanıyor
- [ ] Yeni liste oluşturuluyor
- [ ] Mevcut listeye ekleniyor
- [ ] Zaten ekliyse "Zaten listede" toastı gösteriliyor
- [ ] Birden fazla ayet seçilip toplu ekleniyor
- [ ] Bulk add modalda Enter tuşu çalışıyor
- [ ] Playlist_view → ayet "Dinle" → sırayla çalıyor
- [ ] Playlist_view → çöp ikonuyla ayet siliniyor
- [ ] Liste TXT olarak dışa aktarılıyor
- [ ] Listeler JSON olarak dışa/içe aktarılıyor

---

## 6. Notlar

- [ ] Ayet not butonu → textarea açılıyor
- [ ] Not yazılıp kaydediliyor (yenile → not orada)
- [ ] "Notu Sil" butonu çalışıyor
- [ ] Notlar JSON olarak dışa aktarılıyor
- [ ] Dışa aktarılan JSON geri yüklenebiliyor

---

## 7. Yer İmi (Bookmark)

- [ ] Ayet oynatılınca yer imi kaydediliyor
- [ ] Sayfa yenilenince "Devam Et" banner'ı çıkıyor
- [ ] "Devam Et" → doğru sureye gidiyor
- [ ] Yer imi ayeti "Kaldığın yer" badge'i gösteriyor

---

## 8. Tefsir / Meal

- [ ] Ayet kartı açılınca Diyanet, Yazır, Ateş mealleri görünüyor
- [ ] "Tefsir ve Diğer Mealleri Gör" → Öztürk, Yıldırım, Yüksel görünüyor
- [ ] "Tefsir Metnini Getir" → Diyanet tefsiri yükleniyor
- [ ] Dipnot işaretine tıklanınca tefsir açılıyor
- [ ] "Orijinal Kaynak" linki yeni sekmede açılıyor

---

## 9. PWA / Offline

- [ ] Manifest yükleniyor (Chrome DevTools → Application)
- [ ] "Ana Ekrana Ekle" çalışıyor (mobil)
- [ ] Güncelleme banner'ı görünüyor (yeni SW deploy sonrası)
- [ ] Servis worker aktif (DevTools → Service Workers)

---

## 10. Erişilebilirlik

- [ ] Tab tuşuyla tüm butonlara ulaşılıyor
- [ ] Screen reader (VoiceOver/TalkBack) player bar butonlarını doğru okuyor
- [ ] Aktif sure sidebar'da `aria-current` var
- [ ] Dark mode toggle `aria-pressed` doğru değer gösteriyor

---

## Regresyon Notları

| Tarih | Versiyon | Bulunan Sorun | Durum |
|-------|----------|---------------|-------|
| 2026-05-14 | abfde56 | Jump nav sonrası play çalışmıyor | ✅ Düzeltildi |
| 2026-05-14 | 56c9a3b | audio.load() glitch + playbackRate sıfırlanma | ✅ Düzeltildi |
| 2026-05-14 | 77b8cee | navRegex false positive, fontSize persist yok | ✅ Düzeltildi |
