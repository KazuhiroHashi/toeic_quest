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
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL  = os.path.join(ROOT, "build", "kokoro-v1.0.onnx")
VOICES = os.path.join(ROOT, "build", "voices-v1.0.bin")
OUTDIR = os.path.join(ROOT, "assets", "voice")

# 22人に12語ずつ読ませて選んだ声。どちらも一度も語尾が上がらなかった（0/12）。
# TOEIC本番が米英まざるので、女性=米・男性=英にしてある。
FEMALE = "af_kore"     # 語尾リフト 中央値 -4.7半音、最悪でも -0.7半音。ピーク -2.5dBFS
MALE   = "am_fenrir"   # 語尾リフト 中央値 -5.5半音、最悪 -1.8半音。0/11。2026-08-22 確定
BITRATE = "32k"
SR = 24000

# 音量の揃え方（2026-09-08 に方式を変更）
#
# 元はピーク（波形の最大値）だけを -1.0dBFS に揃えていた。しかしピークは
# 破裂音（p・t・k）で一瞬だけ跳ね上がるので、そこが先に上限に当たってしまい、
# 語の本体は小さいまま残る。実測すると、ピークは全語 -1〜-2dB でそろって
# いるのに、体感音量は -12.2dB〜-21.5dB と9dBも開いていた。
# 「同じ音量で録ったはずなのに語によって小さく聞こえる」のはこれが原因。
#
# そこで、耳が感じる大きさに近い RMS（実効値）で揃える方式にした。
# RMSで揃えると山が上限を超える語が出るので、KNEE から上だけを tanh で
# やわらかく抑える。超えた分を切り落とす（ハードクリップ）と歪んで
# 「ジリッ」と鳴るが、tanh で丸めれば耳につかない。
TARGET_RMS_DB = -14.0   # 体感音量のねらい。実測の平均 -16dB より少し上げる
# 山の上限。mp3は展開すると元の波形より飛び出すので、0dBFSぎりぎりには
# しない。RMSで揃えると山の近くに音が密集するぶん、この飛び出しが大きく
# 出る（実測で最大 +1.0dB）。
#
# 以前はここに、再生側の持ち上げ（js/voice.js の BOOST）のぶんも空けて
# おく必要があった。BOOST を 1.0 にしたのでその制約は無くなり、上限を
# 下げて音を潰さずに済むようになっている。
PEAK_CEIL = 0.85        # -1.4dBFS（展開後でも -0.4dB ほどに収まる）
KNEE = 0.70             # ここから上をやわらかく抑える
TARGET_RMS = 10 ** (TARGET_RMS_DB / 20.0)


def _rms(x):
    return math.sqrt(float(np.mean(x * x)) + 1e-18)


def _soft_limit(x):
    """KNEE から上だけを tanh で丸める。PEAK_CEIL を超えない"""
    y = x.copy()
    a = np.abs(y)
    over = a > KNEE
    if over.any():
        room = PEAK_CEIL - KNEE
        y[over] = np.sign(y[over]) * (KNEE + room * np.tanh((a[over] - KNEE) / room))
    return y


def trim_and_normalize(samples, sr, th_db=-45.0, pad=0.04):
    """前後の無音を落として、体感音量（RMS）を揃える。1語ずつ作るので切り分けは不要"""
    x = np.asarray(samples, dtype=np.float64)
    hop = int(sr * 0.005)
    n = len(x) // hop
    if n < 1:
        return None
    rms = np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1) + 1e-18)
    on = np.nonzero(20 * np.log10(rms) > th_db)[0]
    if len(on) == 0:
        return None
    a = max(0, on[0] * hop - int(sr * pad))
    b = min(len(x), (on[-1] + 1) * hop + int(sr * pad))
    seg = x[a:b]

    r = _rms(seg)
    if r <= 0:
        return None
    # 抑えた分だけRMSが下がるので、ねらいに乗るまで数回だけ寄せる
    g = TARGET_RMS / r
    y = _soft_limit(seg * g)
    for _ in range(4):
        r2 = _rms(y)
        if r2 <= 0 or abs(20 * math.log10(r2 / TARGET_RMS)) < 0.05:
            break
        g *= TARGET_RMS / r2
        y = _soft_limit(seg * g)
    return y


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
    # 全語の作り直しは1プロセスだと45分ほどかかる。onnxruntimeは1語の生成で
    # 1コアしか使い切らないので、語を分割して並列に走らせると台数分だけ速くなる
    ap.add_argument("--shard", help="担当ぶんだけ作る。例 1/4（4分割の1つ目）")
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
    if a.shard:
        i, n = (int(v) for v in a.shard.split("/"))
        words = words[i - 1::n]

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
