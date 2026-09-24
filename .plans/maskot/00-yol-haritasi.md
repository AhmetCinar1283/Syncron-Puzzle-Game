# Maskot ifade sistemi — yol haritası (GEÇİCİ not)

Amaç: oyuncu varlığı maskot/oyun karakteri gibi davransın (göz kırpma, şaşırma,
sevinme…). Aynı karakter oyunda, menüde, portal görsellerinde ve tanıtım videosunda
kullanılacak. **Yüz TEK yerde tanımlı ve TEK yerde çizilir, kod tekrarı yok.**

## Durum
- [x] **1. Çekirdek + canvas çizici + `dev-mascot` + PlayerGraphic bağlantısı** (2026-09-24)
- [x] 2. Oyun olaylarına tetikleyiciler + cell tepkileri (2026-09-24)
  - [x] Varlık tepkileri (2026-09-24): `mascot/reactions.ts` (saf eşleme, testli) +
    `render/useMascotReactions.ts` (BoardCanvas içinde; kare karşılaştırır). Yeni tur = seviye adı/varlık kümesi değişti veya ölüm/zaferden sonra; `tickNumber` ÖLÇÜT DEĞİL (her hamlede sıfırlanır).
    duvar→ouch, kutu itilemedi→nervous, çarpışma→confused, hedefe varış→happy, mod değişimi→surprised,
    zafer→celebrate, ölüm→dizzy (ikisi force). Gerçek oyunda gözle DOĞRULANMADI.
  - [x] Yaşam yöneticisi `mascot/life.ts` (LIFE sabitleri ayarlanır): kimi oyuncu uyuyarak başlar, kısa/rastgele
    sürede uykuya dalar, eşzamanlı uyuyan sayısı sınırlı (`maxSleepers`), uyanınca `happy`, uyumayanlar ağırlıklı
    rastgele ifade + hedefe bakış (`targetGlance`). `lite` kademesinde kapalı.
  - [x] Zafer yüzü: `victoryState.ts` `happy` yüzünü kullanır, kilit ikonu yerine (locked:false).
  - [x] Hedef hücresi sevinci: `cells/activity.ts` (`TARGET_CHEER_MS`) + `target.ts` ambient (`isActive`). Legacy'de yok.
  - Gerçek oyunda gözle DOĞRULANMADI; ayar gerekirse `LIFE` sabitlerine bak.
- [x] 3. Portal şablonları aynı çiziciyi kullanıyor (2026-09-24): `src/game-engine/embed/mascotEmbed.ts` →
  `scripts/portal/build-mascot-bundle.mjs` (rolldown IIFE, global `Mascot`) → `templates/mascot.bundle.js`
  (`generate:assets` önce bunu derler). Şablonda `<canvas data-mascot data-player data-emote data-ms data-size>`;
  `size` = jeton kenarı px. Kapak/splash/ikon (2) yenilendi. Elle `.player-eye` kalmadı.
  - Sadeleştirilmiş ikon (yalnızca 2 maskot + piksel süsler, `?transparent` ile şeffaf; ayrı şeffaf şablon yok),
    ortak `templates/brand.css`, yeni kapaklar `cover-portrait-template.html` (800×1200) ve `cover-square-template.html`
    (800×800) → `docs/portals/assets/crazygames/cover-800x1200.png`, `cover-800x800.png`.
  - Runner Electron'u `force-device-scale-factor=1` ile çalıştırır (yoksa %125 ekranda PNG'ler büyük çıkıyordu).
- [ ] 4. Remotion ile tanıtım videosu (`video/` klasörü) — iskelet + kurgu sistemi KURULDU (2026-09-24)
  - Ayrı paket (`video/package.json`, kendi node_modules), oyun kodunu `@` → `../src` ile içe aktarır; kök tsc/eslint `video/`u dışlar.
  - Sahne kataloğu `video/src/scenes/index.ts`; KURGULAR `video/src/cuts.ts` (tek düzenleme yeri). Kurgu = hedef süre + sahne listesi;
    süresi yazılmayan sahneler kalanı paylaşır, geçiş bindirmesi hesaplanır → süre TAM. Sahne anları `useBeat` ile orantılı sıkışır.
  - Her kurgu × {landscape 1920×1080, portrait 1080×1920}. Dil `--props='{"lang":"tr"}'` (`lib/copy.ts`). `npm run render -- promo15 tr`.
  - Sahneler: `welcome` ("WELCOME TO SYNCRON" / "SYNCRON'A HOŞ GELDİN!"), `play`, `duo`, `outro`. Kullanıcı geri bildirimi: intro/outro iyi;
    30 sn'lik emoji spamı gibi oldu, ORTA KISIM oyun tanıtımı olmalı (level tasarımları, hücre çeşitleri, tuzak uyarısı, teleport/kayma).
    15 sn'ye odaklan; 30 sn'yi boşver.
  - OYNANIŞ SAHNESİ GERÇEK MOTORLA: `video/src/board/` = `level.ts` (ASCII → StoredLevel → `convertToGame2State`), `simulate.ts`
    (`solver.transition` + yeni `onTick` geri çağrısı → tick filmi), `timeline.ts`, `Board.tsx` (oyunun `drawStaticLayer/AmbientLayer/ActorsLayer`'ı
    tek tuvale; izleyiciler her karede yeniden kurulur = deterministik), `levels.ts` (senaryolar), `check.ts` (`npx jiti` ile sonuç doğrulama).
  - FAZ 2 YAPILDI: kullanıcı "mantık anlatma, görsel olarak ilgi çek; sade görseller; ekranı böl" dedi.
    promo15 = welcome 3.8 + `portal` (tahtasız animasyon: iki arkadaş portala dalar → ışık → gerçek portal leveli)
    + `montage` (bölünmüş ekran: yatay 2×2, dikey 4 satır; buz, konveyör, kutu, tuzak + cızırtı + "TUZAKLARA DİKKAT!")
    + outro 3.3. Vitrin levelleri adsız (oda başlığı yok), `npm run check:levels` ile doğrulanır.
    `play` (ok + başlık, fazla anlatımcı) promo15'ten çıktı, yalnızca promo30'da.
  - Play Store videoyu YouTube linki olarak alır (16:9 önerilir); dikey sosyal medya/portal için.

## Yeni temel konsept (kullanıcı onaylı, 2026-09-24)
- Oyuncu blokları uygulamanın MASKOTU: cana yakın, dostane, eğlenceli, samimi. Birincil tasarım konsepti.
- Marka teması SABİT: **Retro Arcade 8-Bit** (`theme: 'arcade'`). Diğer temalar yalnızca ekran görüntülerinde;
  kullanıcı "ekle" demedikçe marka görsellerinde başka tema kullanma (katı değil, varsayılan).
- Ana karakterler: **0 = yeşil, 1 = mavi**. Kalabalık/aile (diğer renkler) tasarım ihtiyacına göre serbest, her üretimde karar.
- Karakter her görselde öne çıkar; her statik görselde bir duygu var (nötr yüz yok): `happy`, `wink`, `love`,
  `celebrate`, `surprised`. `sad`/`dizzy` komik ve sevimli kalmalı. Ton: kısa sıcak metin, arcade tipografisi.
- Sıradaki işler (adım 4 dışı): ana sayfa/menüde karşılama yüzü (girişte `wink`, boştayken `sleepy`).

## Mimari (1. adımda kuruldu, bozma)
- `src/game-engine/mascot/` → saf, tuvale dokunmaz, zamanı dışarıdan alır (deterministik)
  - `pose.ts`: `FacePose` (sprite'a pişer, `quantizeFace`/`faceKey` ile sınırlı basamak),
    `BodyPose` (blit anında ctx dönüşümü), `MascotFx` (gövde dışı süs)
  - `timeline.ts`: anahtar kare → poz. Sayısal alanlar ara değerlenir, ayrık alanlar (şekil/ağız)
    kare anında değişir. `step` eğrisi = atlama (ör. 2π→0)
  - `emotes.ts`: katalog, SADECE veri. Yeni ifade = buraya bir kayıt. Son kare `'neutral'` olmalı (test kilitli)
  - `idle.ts`: boşta kırpma (eski `playerBlink` zamanlaması birebir) + seyrek bakınma (tohum = entity.id)
  - `controller.ts`: `createMascotController()` → `trigger(id, ad, now)`, öncelik kuralı, `subscribe`
- Çizim: `render/entities/player.ts` (sprite, `input.face`) + `playerFace.ts` (göz/ağız şekilleri)
  + `mascot.ts` (`paintMascot`, `applyBodyPose`, `mascotPoseAt`) + `mascotFx.ts` (glif sprite'ları)
- DOM: `components/entities/MascotView.tsx` (aynı çiziciyi küçük bir canvas'a çağırır; `ref.emote()`,
  `controller`+`id`, `time`, `pose` prop'ları) + `mascotTicker.ts` (tek paylaşılan saat)
- `PlayerGraphic.tsx` artık yalnızca Entity → MascotView köprüsü
- `BoardCanvas` opsiyonel `mascots?: MascotController` prop'u alıyor; tetikleme `actors`'ı uyandırır

## Kurallar / tuzaklar
- **Mod bilgisi kuralı:** ağızdaki ▲/▼ normal/ters mod bilgisi. Dinlenme hâli daima `mouth: 'arrow'`;
  diğer ağızlar yalnızca kısa ifadelerde.
- Kare döngüsünde `shadowBlur`/`filter` YASAK (render/README.md). Parlama yalnızca sprite rasterında.
- Yüz anahtar sayısı sınırlı kalmalı (testte < 120). Yeni sürekli alan eklersen nicemle.
- Boştaki yüz yalnızca `ambientMode === 'on'` iken; hamle sırasında nötr.
- `render/idle.ts` imzası ile `drawActorsLayer` aynı kaynaktan (`idleFaceAt(theme, entity.id, now)`) okur.
- Elektron ile ekran görüntüsü alırken `ELECTRON_RUN_AS_NODE` ortam değişkenini kaldır (VS Code terminali set ediyor).
- `globals.css` ve `animationStyles.ts` içindeki eski `playerBlink`/`playerPulse` keyframe'leri artık
  kullanılmıyor; kullanıcı o dosyaları başka iş için düzenlerken dokunulmadı, sonra temizlenebilir.

## 2. adım — yapılacaklar
- Oyun olayları → ifade eşlemesi. Önerilen: duvara çarpma → `ouch`, ters moda geçiş → `surprised`,
  hedefe varma/kazanma → `happy`/`celebrate`, ölüm/kaybetme → `sad`/`dizzy`, uzun süre boşta → `sleepy`
  (hamlede `stop`), hedefe yakınken → `lookX/lookY` hedefe doğru. Film/tick olayları nereden geliyor önce bul
  (`useFilmPlayback`, `entityMotion` efekt izleri, ses tetikleri `onPlaySound` iyi ipucu).
- Tetiklemeyi BoardCanvas'ın `mascots` prop'u üzerinden yap (play screen bir controller kurup verir).
- Zafer koreografisi (`victorySprites.ts`) şu an nötr yüz kullanıyor; `celebrate` yüzü eklenebilir.
- Cell tepkileri: aynı desen (`reactAt(cellState, now)` saf + sprite anahtarında nicemli faz).
  `cells/activity.ts` zaten geçici "çalışıyor" hâli tutuyor, oradan başla.
- DOM yedeği (`GameBoard`) ifade oynatmıyor, gerekirse PlayerGraphic'e controller geçir.

## 3. adım — şablonlar (YAPILDI; aşağısı eski plan)
- esbuild ile `mascot` + `render/entities` çizicisini tek bir IIFE `mascot.bundle.js` yap.
  Şablonlar `<canvas>` + `drawMascot({theme, playerIndex, emote, ms})` çağırsın; elle kopyalanmış
  `.player-eye` div'lerini kaldır. `scripts/portal/generate-assets*.{mjs,cjs}` capture akışı aynı kalır.
- Poz seçmek için `/dev-mascot` sayfasının "3. Zaman" bölümü kullanılabilir.

## 4. adım — video
- Remotion (React, kare bazlı, MP4). Lisans: bireyler/≤3 kişilik şirketler için ücretsiz.
- Maskot `pose={sampleEmote(compiledEmote(ad), frameMs)}` ile deterministik çizilir.
- Sahneler: gülen maskota zoom, hızlı kamera kaydırma, ekran geçişleri; 30 sn Play Store,
  15 sn portal, dikey versiyon.
