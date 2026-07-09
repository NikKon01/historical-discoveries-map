# -*- coding: utf-8 -*-
"""
Генерация озвучки описаний через Silero TTS (локально, без интернета после первой загрузки модели).
Читает data/explorers.json, создаёт data/audio/<id>.mp3, дописывает поле "audio" в JSON.

Запуск:  python scripts/tts_silero.py            (голос по умолчанию)
         python scripts/tts_silero.py xenia      (другой голос: aidar|baya|kseniya|xenia|eugene)
"""
import json
import os
import sys
import ssl
import subprocess
import tempfile

import torch

# У хостинга моделей Silero просрочен SSL-сертификат — отключаем проверку
# только для разовой загрузки весов модели (файл затем кэшируется локально).
ssl._create_default_https_context = ssl._create_unverified_context

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "explorers.json")
AUDIO_DIR = os.path.join(ROOT, "data", "audio")
SPEAKER = sys.argv[1] if len(sys.argv) > 1 else "baya"  # baya — мягкий женский голос
SAMPLE_RATE = 48000

os.makedirs(AUDIO_DIR, exist_ok=True)


def to_mp3(wav_path, mp3_path):
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", wav_path,
         "-ac", "1", "-b:a", "96k", mp3_path],
        check=True,
    )


def main():
    print(f"Голос: {SPEAKER}, частота: {SAMPLE_RATE} Гц")
    device = torch.device("cpu")
    torch.set_num_threads(max(1, os.cpu_count() or 1))

    print("Загрузка модели Silero (v4_ru)…")
    model, _ = torch.hub.load(
        repo_or_dir="snakers4/silero-models",
        model="silero_tts",
        language="ru",
        speaker="v4_ru",
    )
    model.to(device)

    with open(DATA, "r", encoding="utf-8") as f:
        items = json.load(f)

    ok = 0
    for it in items:
        text = (it.get("description") or "").strip()
        if not text:
            it["audio"] = None
            print(f"  пропуск (нет текста): {it['id']}")
            continue
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                wav_path = tmp.name
            model.save_wav(text=text, speaker=SPEAKER,
                           audio_path=wav_path, sample_rate=SAMPLE_RATE)
            mp3_rel = f"data/audio/{it['id']}.mp3"
            to_mp3(wav_path, os.path.join(ROOT, "data", "audio", f"{it['id']}.mp3"))
            os.remove(wav_path)
            it["audio"] = mp3_rel
            ok += 1
            print(f"  OK  {it['explorer']:24s} -> {mp3_rel}")
        except Exception as e:
            it["audio"] = None
            print(f"  FAIL {it['explorer']}: {e}")

    with open(DATA, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

    print(f"\nГотово: {ok}/{len(items)} озвучено. Поле audio записано в {DATA}")


if __name__ == "__main__":
    main()
