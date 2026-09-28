#!/usr/bin/env python3
# SNS 用の「英単語クイズ」ショート動画（1本 約10秒・縦）を作る。
#
#   python3 tools/make_quiz.py          # movie/quiz.json を書いて、全部組み立てる
#   python3 tools/make_quiz.py turnout  # 1本だけ
#   python3 tools/make_quiz.py --images # X に貼る問題の画像だけ（tools/quiz_image.js）
#   python3 tools/make_quiz.py --hard   # 難問セット（HARD）→ movie/out/quiz/H_<番号>_<単語>.*
#   → movie/out/quiz/Q_<番号>_<単語>.mp4 と、問題の画像 Q_<番号>_<単語>.png（答えは載せない）、
#     答えの画像 Q_<番号>_<単語>_answer.png（正解の選択肢が光った画面）
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
    ("inspection",  "boss",      4, "TOEIC®500点レベル", "検査"),      # itinerary は 500点には難しかった
    ("turnout",     "dragon",    5, "TOEIC®600点レベル", "参加者数"),
    ("fair",        "dragon_j3", 4, "中学レベル",         "公平な"),    # apologize は中学には難しかった
    ("unusual",     "b4_j3",     1, "中学レベル",         "珍しい"),
    ("anxious",     "boss_h1",   2, "高校基礎レベル",     "心配して"),
    ("generous",    "boss_h1",   6, "高校基礎レベル",     "寛大な"),
    ("perspective", "b4_h3",     1, "大学入試レベル",     "観点"),
    ("obscure",     "dragon_h3", 2, "難関大レベル",       "不明瞭な"),
]

# 難問セット。ゲームに実際にある難しい単語だけ（TOEIC 800・900点は、出題レベルを固定して録った
# battle_l800 / battle_l900 から。難関大は高校3年の録画から）。上の2行目は「この難問、わかる？」
# ignore は難関大に入っているが簡単すぎるので使わない
HARD = [
    ("mundane",       "battle_l900", 3, "TOEIC®900点レベル", "ありふれた"),
    ("upheaval",      "b3_h3",       2, "難関大レベル",       "激変"),
    ("earmark funds", "battle_l800", 1, "TOEIC®800点レベル", "資金を割り当てる"),
    ("jurisdiction",  "b4_h3",       3, "難関大レベル",       "管轄権"),
    ("foregoing",     "battle_l900", 4, "TOEIC®900点レベル", "上記の"),
    ("underlying",    "boss_h3",     6, "難関大レベル",       "根底にある"),
    ("arbitrator",    "battle_l800", 3, "TOEIC®800点レベル", "仲裁人"),
    ("elaborate",     "boss_h3",     1, "難関大レベル",       "精巧な"),
    ("commence",      "battle_l900", 2, "TOEIC®900点レベル", "開始する"),
    ("counterfeit",   "battle_l800", 5, "TOEIC®800点レベル", "偽造の"),
]

SETS = {  # 名前: (単語の一覧, ファイル名の頭, 設定ファイル, 上の2行目)
    "normal": ("QUIZ", "Q", "movie/quiz.json", "3秒で答えられる？"),
    "hard":   ("HARD", "H", "movie/quiz_hard.json", "この難問、わかる？"),
}

HOOK_Y, COUNT_Y = 250, 1760   # 上の字幕（問題の枠より上）と、数字（十字キーのあたり）


def slug(word):
    """ファイル名・読み上げ音声の名前。空白はハイフンに（assets/voice/earmark-funds.mp3 と同じ）"""
    return word.replace(" ", "-")


def still(clip, n, word, after=-0.08, tag=""):
    """劣化なしの録画から1コマを PNG で抜く。
    after=-0.08 … 答える直前（問題）。after=0.4 … 答えた直後（正解の選択肢が光り、「単語 = 意味」が出ている）"""
    ev = json.load(open(os.path.join(ROOT, "movie/play", clip + ".json")))["events"]
    out = os.path.join(ROOT, "movie/tmp/quiz", slug(word) + tag + ".png")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", "-ss", "%.3f" % (ev["answer%d" % n] + after),
                    "-i", os.path.join(ROOT, "movie/play", clip + ".mkv"), "-frames:v", "1", out], check=True)
    return os.path.relpath(out, ROOT)


def reel(i, word, clip, n, level, meaning, pr, prefix="Q", hook="3秒で答えられる？"):
    png = still(clip, n, word)
    calm = {"zoom": 1.0, "drift": 0.0, "fx": [], "flash": False}
    cuts = [
        # 1 問題が出る（0.35倍。答える前で切れる）
        dict(src="play/" + clip, beats=2, at="quiz%d" % n, shift=-0.05, speed=0.35, **calm,
             sfx=[["cursor", 0, 0.35], ["voice/" + slug(word), 0, 1.5]],
             cap=[level, hook], capBeats=11, capPop=0.35, capY=HOOK_Y, capSize=92),
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
            "out": "movie/out/quiz/%s_%02d_%s.mp4" % (prefix, i + 1, slug(word)),
            "music": {"track": "arena4", "startBeat": 21},
            "theme": theme, "endcard": end, "cuts": cuts}


def main():
    pr = json.load(open(os.path.join(ROOT, "movie/pr.json")))
    images_only = "--images" in sys.argv
    lst, prefix, cfg_path, hook = SETS["hard" if "--hard" in sys.argv else "normal"]
    lst = globals()[lst]
    want = [a for a in sys.argv[1:] if not a.startswith("--")]
    reels, words = {}, []
    for i, q in enumerate(lst):
        if want and q[0] not in want:
            continue
        if not images_only:
            reels["%s_%s" % (prefix.lower(), slug(q[0]))] = reel(i, *q, pr, prefix=prefix, hook=hook)
        name = "movie/out/quiz/%s_%02d_%s" % (prefix, i + 1, slug(q[0]))
        words.append({"word": q[0], "level": q[3], "meaning": q[4], "hook": hook,
                      "still": still(q[1], q[2], q[0]), "out": name + ".png",
                      "answer_still": still(q[1], q[2], q[0], after=0.4, tag="_answer"),
                      "answer_out": name + "_answer.png"})
    os.makedirs(os.path.join(ROOT, "movie/out/quiz"), exist_ok=True)
    if reels:
        cfg = {"defaults": pr["defaults"], "reels": reels}
        with open(os.path.join(ROOT, cfg_path), "w") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=1)
        env = dict(os.environ, PR_CFG=cfg_path)
        subprocess.run(["node", os.path.join(ROOT, "tools/build_pr.js")], env=env, check=True)
    # X に貼る問題の画像と、答えの画像
    with open(os.path.join(ROOT, "movie/tmp/quiz/words.json"), "w") as f:
        json.dump(words, f, ensure_ascii=False)
    subprocess.run(["node", os.path.join(ROOT, "tools/quiz_image.js")], check=True)


if __name__ == "__main__":
    main()
