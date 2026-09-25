#!/usr/bin/env python3
# PR動画の「音ハメ」用に、BGM の拍の位置を書き出す。
#
#   pip install librosa
#   python3 tools/beat_grid.py boss field title   # assets/bgm/<名前>.mp3
#   python3 tools/beat_grid.py battle2 --double   # 拍が半分の速さで取れる曲
#   → movie/beats/<名前>.json
#
# --double は、拍と拍の間にもう1つ拍を足す。battle2 は実際は 1分に約167拍だが、
# 解析では強い拍（1拍目と3拍目）だけが取れて 83拍になる。そのままだと
# カットが間延びするので、倍にしてから小節の頭を探し直す。
#
# 中身は { tempo, beats: [秒...], down: [小節頭の拍の番号...], energy: [拍ごとの強さ] }。
# tools/build_pr.js はこの表だけを見てカットの長さを決める（librosa は要らない）。
# 曲を差し替えたときだけ、これを走らせ直せばいい。
#
# 小節の頭（ダウンビート）は、4拍ごとのどこに一番強い低音が来るかで決める。
# 厳密な拍子解析ではないが、ゲームのBGMは 4/4 でキックが頭に来るので外れにくい。
import json, os, sys
import numpy as np
import librosa

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "movie", "beats")


def grid(name, seconds=150, double=False):
    path = os.path.join(ROOT, "assets", "bgm", name + ".mp3")
    y, sr = librosa.load(path, sr=22050, mono=True, duration=seconds)
    # 打楽器成分だけでオンセットを取ると、メロディに引っぱられにくい
    _, perc = librosa.effects.hpss(y)
    env = librosa.onset.onset_strength(y=perc, sr=sr, aggregate=np.median)
    tempo, frames = librosa.beat.beat_track(onset_envelope=env, sr=sr, tightness=120)
    beats = librosa.frames_to_time(frames, sr=sr)
    if double:
        mids = (beats[:-1] + beats[1:]) / 2
        beats = np.sort(np.concatenate([beats, mids]))
        tempo = np.atleast_1d(tempo)[0] * 2

    # 低音（〜150Hz）の立ち上がりで小節の頭を探す
    S = np.abs(librosa.stft(perc, n_fft=2048, hop_length=512))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
    low = S[freqs < 150].sum(axis=0)
    low = np.maximum(0, np.diff(low, prepend=low[0]))
    lowt = librosa.frames_to_time(np.arange(len(low)), sr=sr, hop_length=512)
    strength = np.array([low[np.argmin(np.abs(lowt - b))] for b in beats])
    phase = int(np.argmax([strength[p::4].mean() for p in range(4)]))
    down = list(range(phase, len(beats), 4))

    # 拍ごとの音の大きさ（盛り上がっている所から始めるため）
    rms = librosa.feature.rms(y=y)[0]
    rt = librosa.times_like(rms, sr=sr)
    energy = [float(rms[(rt >= beats[i]) & (rt < (beats[i + 1] if i + 1 < len(beats) else beats[i] + 0.5))].mean())
              for i in range(len(beats))]

    t = float(np.atleast_1d(tempo)[0])
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name + ".json"), "w") as f:
        json.dump({"file": "assets/bgm/%s.mp3" % name, "tempo": round(t, 2),
                   "beats": [round(float(b), 4) for b in beats], "down": down,
                   "energy": [round(e, 5) for e in energy]}, f)
    print("  %-10s %6.1f BPM  %3d拍  小節頭=%d拍目から" % (name, t, len(beats), phase))


if __name__ == "__main__":
    double = "--double" in sys.argv
    names = [a for a in sys.argv[1:] if not a.startswith("--")] or ["boss"]
    for n in names:
        grid(n, double=double)
