#!/usr/bin/env python3
"""
Syncron — Multi-Platform Asset Generator and Synchronizer
=========================================================
Bu betik, `Syncron/assets` klasöründeki master görselleri (icon.png, cover.png vb.)
okuyarak Android, Web, CrazyGames ve GameDistribution için gereken tüm boyutlardaki
görselleri otomatik olarak üretir ve doğru konumlara yerleştirir.

Gereksinim: Python 3.8+ ve Pillow (PIL)
Kullanım:
    python scripts/sync_assets.py
    python scripts/sync_assets.py --assets-dir path/to/assets
"""

import os
import sys
import argparse
from pathlib import Path
from PIL import Image, ImageDraw

# Windows konsolunda UTF-8 çıktı desteği (cp1254 hatasını önlemek için)
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Renk Paleti (Syncron Retro Arcade 8-Bit Teması)
THEME_BG = (5, 5, 5, 255)       # #050505
THEME_BG_RGB = (5, 5, 5)        # #050505

def find_assets_dir(custom_path=None):
    if custom_path and os.path.isdir(custom_path):
        return Path(custom_path).resolve()
    
    script_dir = Path(__file__).resolve().parent
    root_dir = script_dir.parent  # know-and-conquer
    parent_dir = root_dir.parent  # Syncron

    candidates = [
        parent_dir / "assets",
        root_dir / "assets",
        root_dir / "docs" / "portals" / "assets" / "source",
    ]
    for c in candidates:
        if c.is_dir():
            return c.resolve()
    
    return (parent_dir / "assets").resolve()

def find_file(directory: Path, base_names):
    for name in base_names:
        for ext in [".png", ".jpg", ".jpeg", ".webp"]:
            p = directory / f"{name}{ext}"
            if p.is_file():
                return p
    return None

def crop_and_resize(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Merkez odaklı akıllı kırpma (center-crop) ve orantılı LANCZOS ölçekleme."""
    orig_w, orig_h = img.size
    target_ratio = target_w / target_h
    orig_ratio = orig_w / orig_h

    if orig_ratio > target_ratio:
        # Orijinal daha geniş -> yanlardan kırp
        new_w = int(orig_h * target_ratio)
        offset_x = (orig_w - new_w) // 2
        cropped = img.crop((offset_x, 0, offset_x + new_w, orig_h))
    else:
        # Orijinal daha yüksek -> üstten ve alttan kırp
        new_h = int(orig_w / target_ratio)
        offset_y = (orig_h - new_h) // 2
        cropped = img.crop((0, offset_y, orig_w, offset_y + new_h))

    return cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)

def make_round_icon(img: Image.Image) -> Image.Image:
    """Kare ikonu pürüzsüz dairesel maskeyle yuvarlak ikona dönüştürür."""
    size = img.size
    mask = Image.new('L', (size[0] * 4, size[1] * 4), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size[0] * 4, size[1] * 4), fill=255)
    mask = mask.resize(size, Image.Resampling.LANCZOS)

    output = Image.new('RGBA', size, (0, 0, 0, 0))
    img_rgba = img.convert('RGBA')
    output.paste(img_rgba, (0, 0), mask=mask)
    return output

def make_adaptive_foreground(img: Image.Image, target_w: int, target_h: int, safe_scale: float = 0.66) -> Image.Image:
    """Android 108dp adaptive foreground için safe-zone içine ortalar."""
    canvas = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
    img_rgba = img.convert('RGBA')

    scale_size = int(min(target_w, target_h) * safe_scale)
    w, h = img_rgba.size
    ratio = min(scale_size / w, scale_size / h)
    new_w, new_h = max(1, int(w * ratio)), max(1, int(h * ratio))

    resized_icon = img_rgba.resize((new_w, new_h), Image.Resampling.LANCZOS)
    pos_x = (target_w - new_w) // 2
    pos_y = (target_h - new_h) // 2

    canvas.paste(resized_icon, (pos_x, pos_y), mask=resized_icon)
    return canvas

def make_portrait_splash(icon_img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Dikey telefonlar için koyu arka plan üzerinde merkezlenmiş profesyonel splash."""
    canvas = Image.new('RGBA', (target_w, target_h), THEME_BG)

    target_icon_w = int(min(target_w * 0.42, target_h * 0.28))
    w, h = icon_img.size
    ratio = target_icon_w / max(w, h)
    new_w, new_h = max(1, int(w * ratio)), max(1, int(h * ratio))

    resized_icon = icon_img.convert('RGBA').resize((new_w, new_h), Image.Resampling.LANCZOS)
    pos_x = (target_w - new_w) // 2
    pos_y = (target_h - new_h) // 2

    canvas.paste(resized_icon, (pos_x, pos_y), mask=resized_icon)
    return canvas

def save_ico(img: Image.Image, output_path: Path, sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    img_rgba = img.convert('RGBA')
    img_rgba.save(str(output_path), format='ICO', sizes=sizes)

def main():
    parser = argparse.ArgumentParser(description="Syncron Multi-Platform Asset Synchronizer")
    parser.add_argument("--assets-dir", help="Master varlıklar dizini yolu")
    args = parser.parse_args()

    print("=" * 60)
    print("⚡ SYNCRON ASSET SYNCHRONIZER")
    print("=" * 60)

    assets_dir = find_assets_dir(args.assets_dir)
    print(f"[INFO] Master Assets Dizini: {assets_dir}")

    if not assets_dir.exists():
        print(f"[HATA] Master assets dizini bulunamadı: {assets_dir}")
        sys.exit(1)

    # 1. Master Dosyaları Bul
    icon_path = find_file(assets_dir, ["icon", "master-icon", "master-icon-1024x1024", "logo"])
    icon_trans_path = find_file(assets_dir, ["icon-transparent", "master-icon-transparent", "master-icon-transparent-1024x1024"])
    cover_path = find_file(assets_dir, ["cover", "master-cover", "master-cover-1920x1080", "banner"])
    splash_path = find_file(assets_dir, ["splash", "splash-screen"])

    if not icon_path:
        print("[HATA] Master ikon bulunamadı! (Beklenen: icon.png)")
        sys.exit(1)
    if not cover_path:
        print("[HATA] Master kapak bulunamadı! (Beklenen: cover.png)")
        sys.exit(1)

    print(f"  ✓ Master İkon: {icon_path.name}")
    if icon_trans_path:
        print(f"  ✓ Şeffaf İkon: {icon_trans_path.name}")
    else:
        print("  ! Şeffaf ikon bulunamadı, master icon kullanılacak.")
    print(f"  ✓ Master Kapak: {cover_path.name}")
    if splash_path:
        print(f"  ✓ Özel Splash: {splash_path.name}")

    # Resimleri Yükle
    master_icon = Image.open(icon_path)
    master_icon_trans = Image.open(icon_trans_path) if icon_trans_path else master_icon
    master_cover = Image.open(cover_path)
    custom_splash = Image.open(splash_path) if splash_path else None

    # Proje Kök Dizinleri
    root_dir = Path(__file__).resolve().parent.parent
    android_res = root_dir / "android" / "app" / "src" / "main" / "res"
    public_dir = root_dir / "public"
    app_dir = root_dir / "src" / "app"
    docs_portals = root_dir / "docs" / "portals" / "assets"

    stats = {"created": 0}

    def save_image(img: Image.Image, dest_path: Path, format='PNG'):
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        if format.upper() == 'PNG':
            img.save(str(dest_path), format='PNG', optimize=True)
        elif format.upper() == 'ICO':
            save_ico(img, dest_path)
        else:
            img.save(str(dest_path), format=format)
        stats["created"] += 1
        try:
            rel = dest_path.relative_to(root_dir)
        except ValueError:
            rel = dest_path
        print(f"  → {rel} ({img.size[0]}x{img.size[1]})")

    # -------------------------------------------------------------
    # 1. CRAZYGAMES ASSETS
    # -------------------------------------------------------------
    print("\n[1/5] CrazyGames Varlıkları Üretiliyor...")
    cg_dir = docs_portals / "crazygames"
    save_image(crop_and_resize(master_icon, 512, 512), cg_dir / "icon-512x512.png")
    save_image(crop_and_resize(master_cover, 1200, 675), cg_dir / "cover-1200x675.png")

    # -------------------------------------------------------------
    # 2. GAMEDISTRIBUTION ASSETS
    # -------------------------------------------------------------
    print("\n[2/5] GameDistribution Varlıkları Üretiliyor...")
    gd_dir = docs_portals / "gamedistribution"
    save_image(crop_and_resize(master_icon, 512, 512), gd_dir / "icon-512x512.png")
    save_image(crop_and_resize(master_cover, 1280, 720), gd_dir / "cover-1280x720.png")
    save_image(crop_and_resize(master_cover, 720, 480), gd_dir / "cover-720x480.png")

    # -------------------------------------------------------------
    # 3. DOCS SOURCE SYNC
    # -------------------------------------------------------------
    print("\n[3/5] Docs/Portals/Source Varlıkları Senkronize Ediliyor...")
    src_dir = docs_portals / "source"
    save_image(crop_and_resize(master_icon, 1024, 1024), src_dir / "master-icon-1024x1024.png")
    save_image(crop_and_resize(master_icon_trans, 1024, 1024), src_dir / "master-icon-transparent-1024x1024.png")
    save_image(crop_and_resize(master_cover, 1920, 1080), src_dir / "master-cover-1920x1080.png")

    # -------------------------------------------------------------
    # 4. WEB (NEXT.JS PUBLIC & APP) ASSETS
    # -------------------------------------------------------------
    print("\n[4/5] Web (Next.js) Varlıkları Üretiliyor...")
    # Faviconlar (ICO - 16, 32, 48)
    save_ico(master_icon, public_dir / "favicon.ico", [(16, 16), (32, 32), (48, 48)])
    save_ico(master_icon, app_dir / "favicon.ico", [(16, 16), (32, 32), (48, 48)])
    save_ico(master_icon, public_dir / "icon.ico", [(16, 16), (32, 32), (48, 48), (64, 64)])
    stats["created"] += 3
    print(f"  → public/favicon.ico (Multi-size ICO)")
    print(f"  → src/app/favicon.ico (Multi-size ICO)")
    print(f"  → public/icon.ico (Multi-size ICO)")

    # Web İkonları (PNG)
    save_image(crop_and_resize(master_icon, 512, 512), public_dir / "icon.png")
    save_image(crop_and_resize(master_icon, 192, 192), public_dir / "icon-192.png")
    save_image(crop_and_resize(master_icon, 512, 512), public_dir / "icon-512.png")
    save_image(crop_and_resize(master_icon, 180, 180), public_dir / "apple-touch-icon.png")
    # Sosyal Medya & SEO (og-image.png: 1200x630)
    save_image(crop_and_resize(master_cover, 1200, 630), public_dir / "og-image.png")

    # -------------------------------------------------------------
    # 5. ANDROID (CAPACITOR RES) ASSETS
    # -------------------------------------------------------------
    print("\n[5/5] Android (Capacitor) Varlıkları Üretiliyor...")
    
    # 5.1 Android Launcher İkonları
    android_icon_densities = [
        ("mdpi", 48, 108),
        ("hdpi", 72, 162),
        ("xhdpi", 96, 216),
        ("xxhdpi", 144, 324),
        ("xxxhdpi", 192, 432),
    ]

    for density, icon_size, fg_size in android_icon_densities:
        folder = android_res / f"mipmap-{density}"
        # Standart kare launcher ikonu
        save_image(crop_and_resize(master_icon, icon_size, icon_size), folder / "ic_launcher.png")
        # Yuvarlak launcher ikonu
        round_icon = make_round_icon(crop_and_resize(master_icon, icon_size, icon_size))
        save_image(round_icon, folder / "ic_launcher_round.png")
        # Adaptive icon foreground (safe-zone ortalanmış şeffaf PNG)
        foreground = make_adaptive_foreground(master_icon_trans, fg_size, fg_size, safe_scale=0.66)
        save_image(foreground, folder / "ic_launcher_foreground.png")

    # 5.2 Android Splash Ekranları
    # Landscape Çözünürlükleri
    land_splashes = [
        ("drawable", 480, 320),
        ("drawable-land-mdpi", 480, 320),
        ("drawable-land-hdpi", 800, 480),
        ("drawable-land-xhdpi", 1280, 720),
        ("drawable-land-xxhdpi", 1600, 960),
        ("drawable-land-xxxhdpi", 1920, 1280),
    ]

    import re

    for folder_name, w, h in land_splashes:
        folder = android_res / folder_name
        if custom_splash and custom_splash.size[0] > custom_splash.size[1]:
            splash_img = crop_and_resize(custom_splash, w, h)
        else:
            splash_img = crop_and_resize(master_cover, w, h)
        save_image(splash_img, folder / "splash.png")

    # Portrait Çözünürlükleri
    port_splashes = [
        ("drawable-port-mdpi", 320, 480),
        ("drawable-port-hdpi", 480, 800),
        ("drawable-port-xhdpi", 720, 1280),
        ("drawable-port-xxhdpi", 960, 1600),
        ("drawable-port-xxxhdpi", 1280, 1920),
    ]

    for folder_name, w, h in port_splashes:
        folder = android_res / folder_name
        if custom_splash and custom_splash.size[1] >= custom_splash.size[0]:
            splash_img = crop_and_resize(custom_splash, w, h)
        elif custom_splash:
            splash_img = crop_and_resize(custom_splash, w, h)
        else:
            splash_img = make_portrait_splash(master_icon_trans, w, h)
        save_image(splash_img, folder / "splash.png")

    # 5.3 Android Arka Plan Rengini Retro Arcade Tema (#050505) İle Senkronize Et
    bg_color_xml = android_res / "values" / "ic_launcher_background.xml"
    if bg_color_xml.is_file():
        content = bg_color_xml.read_text(encoding="utf-8")
        new_content = re.sub(r'#[0-9a-fA-F]{6}', '#050505', content)
        bg_color_xml.write_text(new_content, encoding="utf-8")
        print("  ✓ Android adaptive background rengi retro arcade tema (#050505) ile senkronize edildi.")

    print("\n" + "=" * 60)
    print(f"🎉 BAŞARILI: Toplam {stats['created']} adet görsel varlığı üretildi ve dağıtıldı!")
    print("=" * 60)

if __name__ == "__main__":
    main()
