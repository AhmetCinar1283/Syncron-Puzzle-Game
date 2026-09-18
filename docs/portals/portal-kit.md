# Portal Başvuru Kiti (Portal Submission Kit)

CrazyGames ve GameDistribution platformlarına yükleme yaparken geliştirici panelinin istediği tüm görsel ve metinsel meta materyaller.

Görseller, oyunun orijinal HTML/CSS/SVG teması kullanılarak Electron/Chromium ekran yakalama yöntemiyle üretilmiştir ve [`docs/portals/assets/`](./assets/README.md) altında hazır bulunmaktadır.

---

## 1. Görsel Varlıklar (Assets)

Tüm görseller üretilmiş olup aşağıdaki konumlarda hazırdır:

| Platform | Varlık Türü | Boyut | Dosya Yolu | Paneldeki Yeri |
|---|---|---|---|---|
| **CrazyGames** | Oyun Kapağı (Banner) | 1200×675 (16:9) | [`assets/crazygames/cover-1200x675.png`](./assets/crazygames/cover-1200x675.png) | Game Media / Cover Image |
| **CrazyGames** | Oyun İkonu | 512×512 | [`assets/crazygames/icon-512x512.png`](./assets/crazygames/icon-512x512.png) | Game Media / Icon |
| **GameDistribution** | Standart Kapak | 720×480 (3:2) | [`assets/gamedistribution/cover-720x480.png`](./assets/gamedistribution/cover-720x480.png) | Assets / Thumbnail (512x384 veya 720x480) |
| **GameDistribution** | Geniş Kapak | 1280×720 (16:9) | [`assets/gamedistribution/cover-1280x720.png`](./assets/gamedistribution/cover-1280x720.png) | Assets / Cover Image |
| **GameDistribution** | Oyun İkonu | 512×512 | [`assets/gamedistribution/icon-512x512.png`](./assets/gamedistribution/icon-512x512.png) | Assets / Icon |
| **Kaynak / Master** | Master İkon (Koyu) | 1024×1024 | [`assets/source/master-icon-1024x1024.png`](./assets/source/master-icon-1024x1024.png) | Master kaynak / Masaüstü |
| **Kaynak / Master** | Master İkon (Şeffaf) | 1024×1024 | [`assets/source/master-icon-transparent-1024x1024.png`](./assets/source/master-icon-transparent-1024x1024.png) | Android Adaptive / Splash |
| **Kaynak / Master** | Master Kapak | 1920×1080 (16:9) | [`assets/source/master-cover-1920x1080.png`](./assets/source/master-cover-1920x1080.png) | HD Vitrin |

> [!TIP]
> Görselleri yeniden üretmek veya değiştirmek için: `npm run generate:assets`

---

## 2. Açıklama Metinleri (Description)

### Türkçe (TR)
> **Kısa Açıklama (Short Description):**
> İki nesneyi AYNI ANDA neon bir ızgarada hedeflerine senkronize et!
>
> **Detaylı Açıklama (Full Description):**
> Syncron — fütüristik bir neon ızgara üzerinde iki nesneyi aynı anda kontrol ettiğin benzersiz bir zeka ve mantık bulmacasıdır. Her yön tuşunda iki karakter de birlikte hareket eder. Buz zeminlerde kaymaları hesapla, kuantum ışınlanma kapılarını kullan, bant taşıyıcıları ve elektrikli güç düğümlerini aşarak her iki nesneyi de aynı anda hedeflerine ulaştır.
> 
> **Öne Çıkan Özellikler:**
> - Tek hamleyle iki nesneyi senkronize yönetme mekaniği
> - 40'tan fazla özenle tasarlanmış bulmaca seviyesi
> - Buz, ışınlanma, itilebilir kutular ve yön değiştiriciler
> - Göz alıcı neon siberpunk görsel tasarım ve atmosferik ses efektleri
> - Klavye, dokunmatik ekran veya oyun kolu desteği

### İngilizce (EN)
> **Short Description:**
> Control two objects at once across a futuristic neon grid to sync them to their targets!
>
> **Full Description:**
> Syncron is an inventive dual-entity logic puzzle game set on a high-tech neon grid. Every keystroke moves both characters simultaneously. Navigate slippery ice slides, quantum teleporters, push electrified boxes, and trigger power switches to guide both objects into their designated targets at the exact same time.
>
> **Key Features:**
> - Innovative dual-control synchronization puzzle mechanic
> - 40+ handcrafted brain-teasing levels
> - Dynamic elements: Ice tiles, portals, movable crates, and directional deflectors
> - Sleek neon cyberpunk aesthetic with ambient responsive sound design
> - Full support for keyboard, touch controls, and gamepads

---

## 3. Kontroller Metni (Controls)

- **Türkçe (TR):**
  - Hareket: **Ok Tuşları** veya **W, A, S, D**
  - Yeniden Başlat: **R**
  - Menü / Geri: **Esc**
  - Dokunmatik: Ekranda kaydırma (Swipe)
- **İngilizce (EN):**
  - Movement: **Arrow Keys** or **W, A, S, D**
  - Restart Level: **R**
  - Menu / Back: **Esc**
  - Mobile / Touch: Swipe on screen

---

## 4. Kategori ve Etiketler (Categories & Tags)

### CrazyGames Panelinde Seçilecekler:
- **Primary Category:** `Puzzle`
- **Secondary Category:** `Logic` / `Brain`
- **Tags (Etiketler):**
  - `Brain`
  - `Grid`
  - `Logic`
  - `Minimalist`
  - `2-Player Mechanics` (veya `Co-op Feel / Singleplayer`)
  - `Cyberpunk / Neon`

### GameDistribution Panelinde Seçilecekler:
- **Category:** `Puzzle`
- **Subcategory:** `Brain` / `Skill`
- **Tags:**
  - `puzzle`
  - `brain`
  - `logic`
  - `grid`
  - `hypercasual` / `arcade`
  - `cyberpunk`
