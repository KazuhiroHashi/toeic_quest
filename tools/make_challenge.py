#!/usr/bin/env python3
# SNS 用の「5問チャレンジ」動画（約20秒・縦）。広告っぽさを抑えて、最後まで見て
# もらう・コメントしてもらう形にしたもの。
#
#   python3 tools/make_challenge.py          # 全部 → movie/out/challenge/C_<名前>.mp4
#   python3 tools/make_challenge.py mix      # 1本だけ
#
# 流れ（曲は arena4、1拍 約0.4秒）
#   1. つかみ（4拍）………… 敵が出る場面に大きく「5問ぜんぶ／わかる？」
#   2. 1問ずつ×5（各8拍）… 答える直前の画面で止めて上に「Q1／中学レベル」（5拍・読み上げ音声つき）
#                            → 答えた瞬間（3拍）に上へ「正解／「〇〇」」。だんだん難しくなる
#   3. 問いかけ（4拍）……… 攻撃の場面に「何問わかった？／コメントで教えて！」
#   4. 締め（6拍）………… 白地にキャッチ・ロゴ・「App Store・Google Play で配信中」を同時に
#
# 画面はどれも実際のゲーム画面（movie/play/*.mkv）。問題は tools/make_quiz.py と同じく、
# 答える直前のコマを静止画にして見せる（録画のプレイヤーは 0.46秒で答えてしまうため）。
import copy, json, os, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_quiz import ROOT, still, slug  # noqa: E402

# (単語, 録画, 何問目, 上に出すレベル, 正解の意味)
SETS = {
    "mix": ("中学からTOEIC 900点まで", [
        ("fair",         "dragon_j3",   4, "中学レベル",         "公平な"),
        ("anxious",      "boss_h1",     2, "高校基礎レベル",     "心配して"),
        ("perspective",  "b4_h3",       1, "大学入試レベル",     "観点"),
        ("jurisdiction", "b4_h3",       3, "難関大レベル",       "管轄権"),
        ("mundane",      "battle_l900", 3, "TOEIC®900点レベル", "ありふれた"),
    ]),
    "toeic": ("TOEIC 500点から900点まで", [
        ("inspection",   "boss",        4, "TOEIC®500点レベル", "検査"),
        ("turnout",      "dragon",      5, "TOEIC®600点レベル", "参加者数"),
        ("transit",      "boss",        6, "TOEIC®700点レベル", "通過"),
        ("arbitrator",   "battle_l800", 3, "TOEIC®800点レベル", "仲裁人"),
        ("foregoing",    "battle_l900", 4, "TOEIC®900点レベル", "上記の"),
    ]),
    # 2回目の4本。最初の2本と単語が重ならないようにした。3つ目は最初の「つかみ」の字幕
    "jhs": ("中学英語", [
        ("advice",       "boss_j3",     3, "中学レベル",         "助言"),
        ("public",       "b3_j3",       2, "中学レベル",         "公共の"),
        ("sudden",       "dragon_j3",   2, "中学レベル",         "突然の"),
        ("range",        "boss_j3",     5, "中学レベル",         "範囲"),
        ("survey",       "dragon_j3",   6, "中学レベル",         "調査"),
    ], ["中学英語5問", "ぜんぶわかる？"]),
    "hs": ("高校基礎から難関大まで", [
        ("scatter",      "dragon_h1",   1, "高校基礎レベル",     "まき散らす"),
        ("retain",       "boss_h1",     3, "高校基礎レベル",     "保持する"),
        ("migration",    "b3_h3",       1, "大学入試レベル",     "移住"),
        ("hostility",    "b3_h3",       4, "大学入試レベル",     "敵意"),
        ("deduce",       "dragon_h3",   5, "難関大レベル",       "推論する"),
    ], ["高校英語5問", "ぜんぶわかる？"]),
    "toeic_basic": ("TOEIC 400点から700点まで", [
        ("hurt",         "b4",          4, "TOEIC®400点レベル", "痛める"),
        ("reply-all",    "b3",          1, "TOEIC®500点レベル", "全員に返信する"),
        ("correspond",   "b3",          2, "TOEIC®600点レベル", "やり取りする"),
        ("consist of",   "b4",          2, "TOEIC®600点レベル", "〜から成る"),
        ("appealing",    "dragon",      1, "TOEIC®700点レベル", "魅力的な"),
    ], ["TOEIC®5問", "ぜんぶわかる？"]),
    "toeic_adv": ("TOEIC 800点・900点", [
        ("set a budget", "battle_l800", 4, "TOEIC®800点レベル", "予算を組む"),
        ("pending",      "battle_l800", 2, "TOEIC®800点レベル", "保留中の"),
        ("counterfeit",  "battle_l800", 5, "TOEIC®800点レベル", "偽造の"),
        ("stockpile",    "battle_l900", 5, "TOEIC®900点レベル", "備蓄"),
        ("niche",        "battle_l900", 1, "TOEIC®900点レベル", "隙間市場"),
    ], ["TOEIC®上級5問", "ぜんぶわかる？"]),
}

TOP_Y = 250          # 上の字幕（問題の枠より上）
CALM = {"zoom": 1.0, "drift": 0.0, "fx": []}


def reel(name, desc, qs, pr, hook=None):
    cuts = [
        # 1 つかみ：敵が出る場面に大きく
        {"src": "play/boss", "beats": 4, "at": 0.8, "pulse": 0.03, "sfx": [["boss", 0, 0.45]],
         "cap": hook or ["5問ぜんぶ", "わかる？"], "lineAt": [0, 0], "capBeats": 4, "capPop": 0.4, "capSize": 120},
    ]
    for i, (word, clip, n, level, meaning) in enumerate(qs):
        cuts += [
            # 2a 問題（答える直前で止める）
            dict(src=still(clip, n, word), beats=5, pulse=0.012, flash=True, **CALM,
                 sfx=[["cursor", 0, 0.45], ["voice/" + slug(word), 0, 1.5]],
                 cap=["Q%d" % (i + 1), level], lineAt=[0, 0], capBeats=5, capPop=0.35, capY=TOP_Y, capSize=92),
            # 2b 答えた瞬間
            dict(src="play/" + clip, beats=3, sync={"event": "answer%d" % n, "beat": 0.3}, fx=["punch"],
                 zoom=1.0, drift=0.0, flash=False, sfx=[["ok", 0.3, 0.6]],
                 cap=["正解", "「%s」" % meaning], lineAt=[0, 0], capBeats=3, capPop=0.35, capY=TOP_Y, capSize=92),
        ]
    # 3 問いかけ
    # ドラゴンの最後の一撃（answer6）だと敵が消えて画面が空になるので、ハウルへの攻撃を使う
    cuts.append({"src": "play/boss", "beats": 4, "at": "answer4", "shift": 0.75, "fx": ["punch", "shake"],
                 "sfx": [["crit", 0, 0.55]], "cap": ["何問わかった？", "コメントで教えて！"],
                 "capBeats": 4, "capPop": 0.35, "flash": True})
    end = copy.deepcopy(pr["reels"]["android"]["endcard"])
    end.update({"beats": 6, "slamBeat": 6})
    return {"title": "5問チャレンジ（%s）" % desc, "out": "movie/out/challenge/C_%s.mp4" % name,
            "music": {"track": "arena4", "startBeat": 21},
            "theme": copy.deepcopy(pr["reels"]["main"]["theme"]), "endcard": end, "cuts": cuts}


def main():
    pr = json.load(open(os.path.join(ROOT, "movie/pr.json")))
    want = sys.argv[1:] or list(SETS)
    reels = {"c_" + n: reel(n, *SETS[n][:2], pr, *SETS[n][2:]) for n in want}
    os.makedirs(os.path.join(ROOT, "movie/out/challenge"), exist_ok=True)
    cfg = "movie/challenge.json"
    with open(os.path.join(ROOT, cfg), "w") as f:
        json.dump({"defaults": pr["defaults"], "reels": reels}, f, ensure_ascii=False, indent=1)
    subprocess.run(["node", os.path.join(ROOT, "tools/build_pr.js")], env=dict(os.environ, PR_CFG=cfg), check=True)


if __name__ == "__main__":
    main()
