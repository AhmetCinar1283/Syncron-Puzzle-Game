# features/settings/

Kullanıcı tercihleri ve ayarlarının (dil, tema, ses açma/kapama ve ses seviyesi) React bileşen ağacına sunulduğu, yönetildiği ve arayüzünün sağlandığı özellik (feature) katmanıdır.

## Sorumluluklar
- **Global Context (`context/SettingsContext.tsx`):** `services/settings` servisindeki tekil durumu dinler ve React state'i olarak sunar.
- **Ergonomik Hook (`hooks/useSettings.ts`):** Her sayfadan `const { settings, setLanguage, setTheme, setSoundMuted, setSoundVolume, openSettings } = useSettings();` şeklinde tek satırda erişim sağlar.
- **Global Modal (`components/SettingsModal.tsx`):** RootLayout seviyesinde açılıp kapanabilen, neon temalı ayarlar penceresi.
- **Kısayol Butonu (`components/SettingsButton.tsx`):** Herhangi bir başlık veya HUD çubuğuna yerleştirilmeye hazır ayarlar butonu.
- **Tek Sorumluluklu Alt Bölümler:** `SoundSection`, `LanguageSection`, `ThemeSection` bileşenleri birbirinden bağımsız geliştirilmiştir.

## Kullanım Örnekleri

### 1. Herhangi bir sayfadan ayarlara erişmek veya güncellemek:
```tsx
import { useSettings } from '@/features/settings';

export function ExamplePage() {
  const { settings, setSoundVolume, openSettings } = useSettings();

  return (
    <div>
      <p>Aktif Dil: {settings.language}</p>
      <p>Ses Seviyesi: %{settings.sound.volume}</p>
      <button onClick={openSettings}>Ayarları Aç</button>
    </div>
  );
}
```

### 2. Sayfaya ayarlar butonu eklemek:
```tsx
import { SettingsButton } from '@/features/settings';

export function Header() {
  return (
    <header>
      <SettingsButton isCompact={false} />
    </header>
  );
}
```

## Dışa Açılan API (`index.ts`)
- `SettingsProvider`: Uygulama kök sağlayıcısı.
- `useSettings()`: Ayar okuma ve güncelleme kancası.
- `SettingsModal`: Ayarlar modalı.
- `SettingsButton`: Ayarlar açma butonu.
- `SoundSection`, `LanguageSection`, `ThemeSection`: Ayar alt bileşenleri.
