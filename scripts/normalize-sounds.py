"""
DOSYA AMACI: public/sounds içindeki oyun efektlerini tek bir loudness (-16 LUFS)
hedefine normalize eder, baş/son sessizliği kırpar ve kısa bir fade-out ekler.
Böylece registry.ts'deki `volume` çarpanları gerçek bir dengeyi ifade eder;
kaynak dosyaların kendi iç ses seviyesi artık dengesizliğin sebebi olmaz.

Kullanım:
    python scripts/normalize-sounds.py            # public/sounds/*.mp3, üstüne yazar
    python scripts/normalize-sounds.py --dry-run   # sadece mevcut/hedef LUFS'u yazdırır

Her dosyanın normalize edilmeden önceki hali `public/sounds/_backup_original/`
altına kopyalanır (zaten yoksa).
"""

import argparse
import shutil
import sys
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
import lameenc

TARGET_LUFS = -16.0
TRUE_PEAK_DB = -1.5
FADE_OUT_MS = 40
SILENCE_THRESHOLD_DB = -50.0

SOUND_FILES = [
    "move.mp3",
    "teleport.mp3",
    "ice.mp3",
    "conveyor.mp3",
    "box_push.mp3",
    "win.mp3",
    "lose.mp3",
]


def trim_silence(
    data: np.ndarray,
    sr: int,
    threshold_db: float = SILENCE_THRESHOLD_DB,
    max_gap_ms: float = 150.0,
    frame_ms: float = 10.0,
) -> np.ndarray:
    """Baştaki sessizliği ve gerçek sesin bittiği yerden sonrasını kırpar.

    Kare bazlı (frame) RMS ile çalışır: ilk aktif kareden başlar, aralarında
    `max_gap_ms`'den kısa boşluklar varsa (doğal decay/nefes payı) devam eder;
    daha uzun bir sessizlik görünce -mp3 kodlama artığı gibi geç kalıntıları
    yok sayarak- orada keser.
    """
    mono = data if data.ndim == 1 else np.mean(data, axis=1)
    frame_len = max(1, int(sr * frame_ms / 1000))
    n_frames = int(np.ceil(len(mono) / frame_len))
    threshold = 10 ** (threshold_db / 20)

    active = np.zeros(n_frames, dtype=bool)
    for i in range(n_frames):
        seg = mono[i * frame_len:(i + 1) * frame_len]
        if seg.size == 0:
            continue
        rms = np.sqrt(np.mean(seg.astype(np.float64) ** 2))
        active[i] = rms > threshold

    active_idx = np.where(active)[0]
    if active_idx.size == 0:
        return data

    max_gap_frames = max(1, int(max_gap_ms / frame_ms))
    start_frame = active_idx[0]
    end_frame = start_frame
    last_active = start_frame
    for i in active_idx[1:]:
        if i - last_active > max_gap_frames:
            break
        end_frame = i
        last_active = i

    start = start_frame * frame_len
    end = min(len(mono), (end_frame + 1) * frame_len)
    return data[start:end] if data.ndim == 1 else data[start:end, :]


def apply_fade_out(data: np.ndarray, sr: int, fade_ms: int = FADE_OUT_MS) -> np.ndarray:
    fade_len = min(int(sr * fade_ms / 1000), len(data))
    if fade_len <= 1:
        return data
    fade_curve = np.linspace(1.0, 0.0, fade_len)
    out = data.copy()
    if out.ndim == 1:
        out[-fade_len:] *= fade_curve
    else:
        out[-fade_len:, :] *= fade_curve[:, None]
    return out


def normalize_loudness(data: np.ndarray, sr: int, target_lufs: float = TARGET_LUFS) -> np.ndarray:
    meter = pyln.Meter(sr)

    # pyloudnorm en az ~0.4s'lik blok ister (block_size). Çok kısa efektler
    # (tek bir vuruş) için sıfır dolgulu bir kopya üzerinden ölçüyoruz — dolgu
    # sessizliği zaten gate ile ölçüme katılmıyor, gerçek sesin loudness'ını
    # etkilemiyor, sadece pencereyi yeterli uzunluğa getiriyor.
    min_len = int(meter.block_size * sr) + 1
    measure_data = data
    if len(data) < min_len:
        pad_shape = (min_len - len(data),) if data.ndim == 1 else (min_len - len(data), data.shape[1])
        measure_data = np.concatenate([data, np.zeros(pad_shape, dtype=data.dtype)], axis=0)

    loudness = meter.integrated_loudness(measure_data)
    if loudness == float("-inf"):
        return data, loudness, loudness

    gain_db = target_lufs - loudness
    gained = data * (10 ** (gain_db / 20))

    # True-peak koruması: normalize sonrası tepe TRUE_PEAK_DB'yi aşarsa geri kıs.
    peak = np.max(np.abs(gained))
    peak_db = 20 * np.log10(peak) if peak > 0 else -np.inf
    if peak_db > TRUE_PEAK_DB:
        reduce_db = peak_db - TRUE_PEAK_DB
        gained = gained * (10 ** (-reduce_db / 20))

    measure_gained = gained
    if len(gained) < min_len:
        pad_shape = (min_len - len(gained),) if gained.ndim == 1 else (min_len - len(gained), gained.shape[1])
        measure_gained = np.concatenate([gained, np.zeros(pad_shape, dtype=gained.dtype)], axis=0)
    new_loudness = meter.integrated_loudness(measure_gained)
    return gained, loudness, new_loudness


def write_mp3(path: Path, data: np.ndarray, sr: int):
    if data.ndim == 1:
        channels = 1
        interleaved = data
    else:
        channels = data.shape[1]
        interleaved = data.reshape(-1)

    pcm16 = np.clip(interleaved, -1.0, 1.0)
    pcm16 = (pcm16 * 32767.0).astype(np.int16)

    encoder = lameenc.Encoder()
    encoder.set_bit_rate(160)
    encoder.set_in_sample_rate(sr)
    encoder.set_channels(channels)
    encoder.set_quality(2)  # 2 = yüksek kalite
    mp3_data = encoder.encode(pcm16.tobytes())
    mp3_data += encoder.flush()

    path.write_bytes(mp3_data)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dir", default="public/sounds", help="Ses dosyalarının klasörü")
    parser.add_argument("--dry-run", action="store_true", help="Sadece ölçüm yap, dosyaya yazma")
    parser.add_argument("--target", type=float, default=TARGET_LUFS, help="Hedef integrated LUFS")
    args = parser.parse_args()

    sounds_dir = Path(args.dir)
    backup_dir = sounds_dir / "_backup_original"
    if not args.dry_run:
        backup_dir.mkdir(exist_ok=True)

    print(f"Hedef: {args.target} LUFS, true-peak <= {TRUE_PEAK_DB} dB\n")
    print(f"{'Dosya':<16} {'Önce (LUFS)':>12} {'Sonra (LUFS)':>13}")
    print("-" * 44)

    for name in SOUND_FILES:
        path = sounds_dir / name
        if not path.exists():
            print(f"{name:<16} -- dosya yok, atlandı --")
            continue

        data, sr = sf.read(path)
        original_len = len(data)

        trimmed = trim_silence(data, sr)
        gained, before_lufs, after_lufs = normalize_loudness(trimmed, sr, args.target)
        faded = apply_fade_out(gained, sr)

        print(f"{name:<16} {before_lufs:>12.1f} {after_lufs:>13.1f}"
              f"  ({original_len} -> {len(faded)} örnek)")

        if not args.dry_run:
            backup_path = backup_dir / name
            if not backup_path.exists():
                shutil.copy2(path, backup_path)
            write_mp3(path, faded, sr)

    if args.dry_run:
        print("\n(--dry-run: dosyalara yazılmadı)")
    else:
        print(f"\nTamamlandı. Orijinal dosyalar '{backup_dir}' içine yedeklendi.")


if __name__ == "__main__":
    sys.exit(main())
