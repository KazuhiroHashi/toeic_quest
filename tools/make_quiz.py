#!/usr/bin/env python3
# SNS 用の「英単語クイズ」ショート動画（1本 約10秒・縦）を作る。
#
#   python3 tools/make_quiz.py          # movie/quiz.json を書いて、全部組み立てる
#   python3 tools/make_quiz.py turnout  # 1本だけ
#   python3 tools/make_quiz.py --images # X に貼る問題の画像だけ（tools/quiz_image.js）
#   → movie/out/quiz/Q_<番号>_<単語>.mp4 と、問題の画像 Q_<番号>_<単語>.png（答えは載せない）
#
# 流れ（曲は arena4、1拍 約0.4秒）
#   1. 問題が出る（2拍）……… ゲームの読み上げ音声で単語を読む。上に「〇〇レベル／3秒で答えられる？」
#   2. 3・2・1（各3拍）……… 答える直前の画面で止めて、下に大きく数字
#   3. 答えた瞬間（4拍）…… 上に「正解は／「〇〇」」。ゲームの画面にも「単語 = 意味」が出る
#   4. 攻撃が当たる（3拍）
#   5. 白地にキャッチとロゴ（6拍）
#
# 録画（movie/play/*.mkv）は、プレイヤーが問題が出てから 0.46秒ほどで答えている。
# そのままでは考える間がないので、答える直前のコマを静止画（movie/tmp/quiz/）にして、
# そこで3秒数える。1の「問題が出る」も 0.35倍の速さにして、答える前で切る。
#
# 単語を足すときは QUIZ に1行足す：(単語, 録画, 何問目, 上の1行目, 正解の意味)
# 単語と選択肢は録画を見て選ぶ（中身は tools/record_play.js が録るたびに変わる）。
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FF = os.environ.get("FFMPEG", "ffmpeg")

QUIZ = [
    ("itinerary",   "b4",        1, "TOEIC®500点レベル", "旅程表"),
    ("turnout",     "dragon",    5, "TOEIC®600点レベル", "参加者数"),
    ("apologize",   "dragon_j3", 1, "中学レベル",         "謝る"),
    ("unusual",     "b4_j3",     1, "中学レベル",         "珍しい"),
    ("anxious",     "boss_h1",   2, "高校基礎レベル",     "心配して"),
    ("generous",    "boss_h1",   6, "高校基礎レベル",     "寛大な"),
    ("perspective", "b4_h3",     1, "大学入試レベル",     "観点"),
    ("obscure",     "dragon_h3", 2, "難関大レベル",       "不明瞭な"),
]

HOOK_Y, COUNT_Y = 250, 1760   # 上の字幕（問題の枠より上）と、数字（十字キーのあたり）


def still(clip, n, word):
    """答える直前（0.08秒前）のコマを、劣化なしの録画から PNG で抜く"""
    ev = json.load(open(os.path.join(ROOT, "movie/play", clip + ".json")))["events"]
    out = os.path.join(ROOT, "movie/tmp/quiz", word + ".png")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", "-ss", "%.3f" % (ev["answer%d" % n] - 0.08),
                    "-i", os.path.join(ROOT, "movie/play", clip + ".mkv"), "-frames:v", "1", out], check=True)
    return os.path.relpath(out, ROOT)


def reel(i, word, clip, n, level, meaning, pr):
    png = still(clip, n, word)
    calm = {"zoom": 1.0, "drift": 0.0, "fx": [], "flash": False}
    cuts = [
        # 1 問題が出る（0.35倍。答える前で切れる）
        dict(src="play/" + clip, beats=2, at="quiz%d" % n, shift=-0.05, speed=0.35, **calm,
             sfx=[["cursor", 0, 0.35], ["voice/" + word, 0, 1.5]],
             cap=[level, "3秒で答えられる？"], capBeats=11, capPop=0.35, capY=HOOK_Y, capSize=92),
        # 2 3・2・1
        *[dict(src=png, beats=3, **calm, pulse=0.012, sfx=[["cursor", 0, 0.5]],
               cap=[str(k)], capBeats=3, capPop=0.5, capY=COUNT_Y, capSize=240) for k in (3, 2, 1)],
        # 3 答えた瞬間（1拍目で答える）
        dict(src="play/" + clip, beats=4, sync={"event": "answer%d" % n, "beat": 1}, zoom=1.0, drift=0.0,
             fx=["punch"], flash=True, sfx=[["ok", 1, 0.6]],
             cap=["正解は", "「%s」" % meaning], capIn=1, capBeats=7, capPop=0.35, capY=HOOK_Y),
        # 4 攻撃が当たる
        dict(src="play/" + clip, beats=3, at="answer%d" % n, shift=0.75 if clip.split("_")[0] in ("boss", "dragon") else 0.7,
             fx=["punch", "shake"], sfx=[["crit", 0, 0.55]]),
    ]
    theme = dict(pr["reels"]["main"]["theme"])
    end = dict(pr["reels"]["main"]["endcard"], beats=6, slamBeat=6)
    return {"title": "英単語クイズ：%s（%s）" % (word, level),
            "out": "movie/out/quiz/Q_%02d_%s.mp4" % (i + 1, word),
            "music": {"track": "arena4", "startBeat": 21},
            "theme": theme, "endcard": end, "cuts": cuts}


def main():
    pr = json.load(open(os.path.join(ROOT, "movie/pr.json")))
    images_only = "--images" in sys.argv
    want = [a for a in sys.argv[1:] if not a.startswith("--")]
    reels, words = {}, []
    for i, q in enumerate(QUIZ):
        if want and q[0] not in want:
            continue
        if not images_only:
            reels["q_" + q[0]] = reel(i, *q, pr)
        words.append({"word": q[0], "level": q[3], "still": still(q[1], q[2], q[0]),
                      "out": "movie/out/quiz/Q_%02d_%s.png" % (i + 1, q[0])})
    os.makedirs(os.path.join(ROOT, "movie/out/quiz"), exist_ok=True)
    if reels:
        cfg = {"defaults": pr["defaults"], "reels": reels}
        with open(os.path.join(ROOT, "movie/quiz.json"), "w") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=1)
        env = dict(os.environ, PR_CFG="movie/quiz.json")
        subprocess.run(["node", os.path.join(ROOT, "tools/build_pr.js")], env=env, check=True)
    # X に貼る問題の画像
    with open(os.path.join(ROOT, "movie/tmp/quiz/words.json"), "w") as f:
        json.dump(words, f, ensure_ascii=False)
    subprocess.run(["node", os.path.join(ROOT, "tools/quiz_image.js")], check=True)


if __name__ == "__main__":
    main()
