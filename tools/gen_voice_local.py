#!/usr/bin/env python3
# WORD QUEST - リスニング音声をローカルで作る（Kokoro-82M / Apache-2.0）
#
#   python3 tools/gen_voice_local.py                  # build/voice_plan.json の全語
#   python3 tools/gen_voice_local.py --limit 30       # 先に30語だけ試す
#   python3 tools/gen_voice_local.py --words budget invoice
#   python3 tools/gen_voice_local.py --female af_nova --male bm_george
#
# なぜローカルか
# - 1語ずつ生成できるので、40語まとめ生成で起きていた「語尾が疑問形に上がる」問題が出ない
# - まとめ生成しないので無音での切り分けも不要。ずれる事故がなくなる
# - 無料。作り直しも気軽にできる
#
# 準備（Mac、初回だけ）
#   pip install kokoro-onnx soundfile
#   curl -L -o build/kokoro-v1.0.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
#   curl -L -o build/voices-v1.0.bin  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
#   （mp3変換に ffmpeg を使う。無ければ pip install imageio-ffmpeg でも可）
#   （音が出ない・語が飛ぶときは brew install espeak-ng）
import argparse, json, os, subprocess, sys, time, wave, struct, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL  = os.path.join(ROOT, "build", "kokoro-v1.0.onnx")
VOICES = os.path.join(ROOT, "build", "voices-v1.0.bin")
OUTDIR = os.path.join(ROOT, "assets", "voice")

# 22人に12語ずつ読ませて選んだ声。どちらも一度も語尾が上がらなかった（0/12）。
# TOEIC本番が米英まざるので、女性=米・男性=英にしてある。
FEMALE = "af_kore"     # 語尾リフト 中央値 -4.7半音、最悪でも -0.7半音。ピーク -2.5dBFS
MALE   = "am_fenrir"   # 語尾リフト 中央値 -5.5半音、最悪 -1.8半音。0/11。2026-08-22 確定
PEAK   = 0.89          # 正規化のねらい（-1.0dBFS。歪ませず、BGMに埋もれない）
BITRATE = "32k"
SR = 24000


def trim_and_normalize(samples, sr, th_db=-45.0, pad=0.04):
    """前後の無音を落として、ピークを揃える。1語ずつ作るので切り分けは不要"""
    hop = int(sr * 0.005)
    on = []
    for i in range(0, len(samples) - hop, hop):
        s = samples[i:i + hop]
        r = math.sqrt(sum(x * x for x in s) / len(s)) or 1e-9
        if 20 * math.log10(r) > th_db:
            on.append(i)
    if not on:
        return None
    a = max(0, on[0] - int(sr * pad))
    b = min(len(samples), on[-1] + hop + int(sr * pad))
    seg = samples[a:b]
    peak = max(abs(x) for x in seg) or 1e-9
    g = PEAK / peak
    return [x * g for x in seg]


def find_ffmpeg():
    """PATH になければ pip の imageio-ffmpeg が持っているものを使う（brew 不要）"""
    r = subprocess.run(["which", "ffmpeg"], capture_output=True, text=True)
    if r.returncode == 0:
        return r.stdout.strip()
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--female", default=FEMALE)
    ap.add_argument("--male", default=MALE)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--words", nargs="*")
    ap.add_argument("--out", default=OUTDIR)
    ap.add_argument("--wav", action="store_true", help="mp3にせずwavのまま置く")
    ap.add_argument("--force", action="store_true", help="既にあるファイルも作り直す")
    a = ap.parse_args()

    for f in (MODEL, VOICES):
        if not os.path.exists(f):
            sys.exit("モデルがありません: %s\n  ファイル冒頭の curl 2行を実行してください。" % f)

    ffmpeg = find_ffmpeg()
    if not a.wav and not ffmpeg:
        sys.exit("ffmpeg が見つかりません。brew install ffmpeg するか\n"
                 "pip install imageio-ffmpeg するか、--wav を付けてください。")

    plan = json.load(open(os.path.join(ROOT, "build", "voice_plan.json")))
    assign = plan["assign"]
    words = a.words if a.words else sorted(assign.keys())
    if a.limit:
        words = words[:a.limit]

    from kokoro_onnx import Kokoro
    import soundfile as sf
    k = Kokoro(MODEL, VOICES)
    os.makedirs(a.out, exist_ok=True)

    t0 = time.time()
    made = skipped = failed = 0
    short, long_ = [], []
    for i, w in enumerate(words):
        e = assign.get(w)
        if not e:
            continue
        dst = os.path.join(a.out, e["f"][:-4] + (".wav" if a.wav else ".mp3"))
        if os.path.exists(dst) and not a.force:
            skipped += 1
            continue
        voice = a.female if e["v"] == "f" else a.male
        lang = "en-gb" if voice.startswith("b") else "en-us"
        try:
            s, sr = k.create(w, voice=voice, speed=1.0, lang=lang)
        except Exception as ex:
            print("  ! %s: %s" % (w, ex))
            failed += 1
            continue
        s = trim_and_normalize(list(s), sr)
        if s is None:
            print("  ! %s: 音が出ませんでした" % w)
            failed += 1
            continue
        dur = len(s) / sr
        if dur < 0.20: short.append((w, dur))
        if dur > 2.00: long_.append((w, dur))
        tmp = dst if a.wav else dst[:-4] + ".tmp.wav"
        sf.write(tmp, s, sr)
        if not a.wav:
            r = subprocess.run([ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
                                "-i", tmp, "-ac", "1", "-ar", str(SR), "-b:a", BITRATE, dst],
                               capture_output=True)
            os.remove(tmp)
            if r.returncode != 0:
                print("  ! %s: mp3変換に失敗 %s" % (w, r.stderr.decode()[:120]))
                failed += 1
                continue
        made += 1
        if made % 200 == 0:
            el = time.time() - t0
            print("  %d語 / %.0f秒（残り約%.0f分）" % (made, el, el / made * (len(words) - i) / 60), flush=True)

    print("\n作成 %d / 既存 %d / 失敗 %d   %.0f秒" % (made, skipped, failed, time.time() - t0))
    print("声       女性 %s ／ 男性 %s" % (a.female, a.male))
    print("置き場所 %s" % a.out)
    if short: print("! 短すぎる（0.2秒未満）%d語: %s" % (len(short), ", ".join(w for w, _ in short[:8])))
    if long_: print("! 長すぎる（2.0秒超）%d語: %s" % (len(long_), ", ".join(w for w, _ in long_[:8])))
    if failed: sys.exit(1)


if __name__ == "__main__":
    main()
