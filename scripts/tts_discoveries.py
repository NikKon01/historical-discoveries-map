# -*- coding: utf-8 -*-
"""
Озвучка описаний открытий через Silero TTS (локально).
Читает scripts/_discoveries.json, создаёт audio/disc-<i>.mp3 и js/audio.js (карта key -> файл).

Запуск:  python scripts/tts_discoveries.py [голос]
         голоса: baya | kseniya | xenia | aidar | eugene
"""
import json
import os
import sys
import ssl
import subprocess
import tempfile

import torch

# У хостинга моделей Silero просрочен SSL-сертификат — отключаем проверку
# только для разовой загрузки весов (файл кэшируется локально).
ssl._create_default_https_context = ssl._create_unverified_context

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "scripts", "_discoveries.json")
AUDIO_DIR = os.path.join(ROOT, "audio")
JS_OUT = os.path.join(ROOT, "js", "audio.js")
SPEAKER = sys.argv[1] if len(sys.argv) > 1 else "baya"
SAMPLE_RATE = 48000

os.makedirs(AUDIO_DIR, exist_ok=True)


def to_mp3(wav_path, mp3_path):
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", wav_path,
         "-ac", "1", "-b:a", "96k", mp3_path],
        check=True,
    )


def main():
    print(f"Голос: {SPEAKER}")
    torch.set_num_threads(max(1, os.cpu_count() or 1))

    print("Загрузка модели Silero (v4_ru)…")
    model, _ = torch.hub.load(
        repo_or_dir="snakers4/silero-models",
        model="silero_tts", language="ru", speaker="v4_ru",
    )
    model.to(torch.device("cpu"))

    with open(SRC, "r", encoding="utf-8") as f:
        items = json.load(f)

    audio_map = {}
    ok = 0
    for it in items:
        text = (it.get("description") or "").strip()
        rel = f"audio/disc-{it['i']}.mp3"
        if not text:
            continue
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                wav_path = tmp.name
            model.save_wav(text=text, speaker=SPEAKER,
                           audio_path=wav_path, sample_rate=SAMPLE_RATE)
            to_mp3(wav_path, os.path.join(ROOT, "audio", f"disc-{it['i']}.mp3"))
            os.remove(wav_path)
            audio_map[it["key"]] = rel
            ok += 1
            print(f"  OK  [{it['i']:>2}] {it['explorer'][:22]:22s} {it['title'][:30]}")
        except Exception as e:
            print(f"  FAIL [{it['i']}] {it['title']}: {e}")

    # Записываем JS-карту, которую подключает страница
    with open(JS_OUT, "w", encoding="utf-8") as f:
        f.write("// Автогенерация (scripts/tts_discoveries.py). Карта: \"год|название\" -> mp3.\n")
        f.write("const audioFiles = ")
        json.dump(audio_map, f, ensure_ascii=False, indent=2)
        f.write(";\n")

    print(f"\nГотово: {ok}/{len(items)} озвучено. Карта: {JS_OUT}")


if __name__ == "__main__":
    main()
