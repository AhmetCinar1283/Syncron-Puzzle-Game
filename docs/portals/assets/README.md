# Syncron — Portal & Platform Görsel Varlıkları (Assets)

Bu dizin, **Syncron** oyununun CrazyGames, GameDistribution ve diğer platformlarda (Android, Electron, Web) yayınlanabilmesi için gereken yüksek çözünürlüklü görsel materyalleri içerir.

> [!NOTE]
> Bu klasör `docs/` altında yer aldığı için `package-portal.mjs` paketleme betiğine ve web/portal build çıktılarına (`out/`, `.zip`) **dahil edilmez**. Sadece portal panellerine elle yüklenecek veya uygulama paketleme aşamasında kullanılacak dosyaları tek merkezde tutar.

---

## Dizin Yapısı ve Dosya Listesi

```
docs/portals/assets/
├── source/                          ← Ham master görseller
│   ├── master-icon-1024x1024.png             (Koyu temalı master ikon)
│   ├── master-icon-transparent-1024x1024.png (Şeffaf zeminli ikon - Android/Electron için)
│   └── master-cover-1920x1080.png            (16:9 tam boy master kapak)
│
├── crazygames/                      ← CrazyGames geliştirici paneli için
│   ├── cover-1200x675.png                    (16:9 vitrin kartı ve oyun başlığı)
│   └── icon-512x512.png                      (Kare küçük oyun ikonu)
│
├── gamedistribution/                ← GameDistribution geliştirici paneli için
│   ├── cover-1280x720.png                    (Geniş 16:9 vitrin görseli)
│   ├── cover-720x480.png                     (Standart 3:2 vitrin görseli)
│   └── icon-512x512.png                      (Kare oyun ikonu)
│
└── templates/                       ← HTML/CSS ekran yakalama şablonları
    ├── icon-template.html                    (Master ikon şablonu)
    ├── icon-transparent-template.html        (Şeffaf ikon şablonu)
    └── cover-template.html                   (Master kapak şablonu)
```

---

## Hangi Dosya Nereye Yüklenir?

### 1. CrazyGames Developer Portal (`developer.crazygames.com`)
- **Game Icon:** `crazygames/icon-512x512.png` (512×512)
- **Game Cover / Banner:** `crazygames/cover-1200x675.png` (1200×675, 16:9)

### 2. GameDistribution Developer Portal (`gamedistribution.com/developer`)
- **Game Icon:** `gamedistribution/icon-512x512.png` (512×512)
- **Game Thumbnail (Medium / Standard):** `gamedistribution/cover-720x480.png` (720×480, 3:2)
- **Game Thumbnail (Large / Wide):** `gamedistribution/cover-1280x720.png` (1280×720, 16:9)

### 3. Android & Electron (İleriki Dağıtımlar İçin)
- **Android Adaptive Icon / Splash:** `source/master-icon-transparent-1024x1024.png`
- **Electron (Windows .ico / Linux .png):** `source/master-icon-1024x1024.png`

---

## Yeniden Üretim (Automated Asset Generation)

Görseller, oyunun orijinal `globals.css`, `PlayerGraphic.tsx`, `TargetCellRenderer.tsx` ve neon renk paleti (`#00ff88`, `#00c4ff`, `#030712`) temel alınarak tasarlanan HTML şablonlarının Electron/Chromium offscreen motoruyla ekran görüntüsü alınmasıyla üretilir.

Şablonlarda veya renklerde bir değişiklik yaptığınızda tüm varlıkları tek komutla yeniden oluşturabilirsiniz:

```bash
npm run generate:assets
```

veya:

```bash
node scripts/portal/generate-assets.mjs
```
