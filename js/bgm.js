// TOEIC QUEST - BGM player (one shared <audio>, file- or data-URI-backed)
// Plays assets/bgm/<track>.mp3, looped, with a short fade when switching.
// - title/field/town/dungeon resume from where they last stopped
// - battle-type tracks (battle/arena*/midboss/king*/boss/lastboss) restart from 0
// - playAny([..]) plays the first track that actually exists (missing ones skip)
// If a track is missing: silence (no fallback beeps).
//
// One element on purpose. iOS Safari only lets a media element begin playing
// from a user gesture, and that permission sticks to the *element* — so the
// element the player's first tap unlocked is the one that can later start the
// battle theme, which begins on a timer rather than on a tap. For the same
// reason nothing below waits for a load event before calling play(): iOS never
// preloads, so canplaythrough does not fire until playback is asked for, and
// waiting on it left the phone silent forever.
(function () {
  "use strict";

  var TRACKS = ["title", "field", "town", "dungeon",
                "battle", "battle2", "battle_dungeon",
                "arena1", "arena2", "arena3", "arena4", "arena5",
                "midboss", "king1", "king2", "king3", "king4",
                "boss", "lastboss", "ending", "victory", "gameover"];
  var NO_RESUME = { battle: 1, battle2: 1, battle_dungeon: 1,
                    arena1: 1, arena2: 1, arena3: 1, arena4: 1, arena5: 1,
                    midboss: 1, king1: 1, king2: 1, king3: 1, king4: 1,
                    boss: 1, lastboss: 1, ending: 1, gameover: 1 };
  // ここは 1.0 のまま。iOS は <audio> の volume を受け付けないので、
  // 何を入れても実機では 1.0 で鳴る。数字で下げようとしても効かない。
  //
  // 一度は Web Audio の GainNode に繋いで音量を取れるようにしたが、
  // createMediaElementSource に繋いだ要素は src を差し替えても鳴り始めない
  // ことがあり（WebKitの既知のふるまい）、曲ごとに src を入れ替えるBGMでは
  // 「戦闘が始まってもしばらく鳴らない」「鳴らない」が実機で出た。撤去した。
  //
  // 読み上げに対して下げるぶんは、配信する mp3 そのものを小さく書き出して
  // 作る（tools/build_www.js の BGM_GAIN）。ファイル側なら iOS でも確実に効く。
  var VOLUME = 1.0;

  function setVol(v) { if (el) el.volume = v; }   // ブラウザではフェードに効く
  var STEP = 40;        // ms per fade tick (fade-out only — a track always
                        // starts at full volume, or its opening hit is lost)

  var enabled = true;
  try { enabled = localStorage.getItem("tq_bgm") !== "0"; } catch (e) {}

  var el = null;      // the one audio element
  var cur = null;     // track the game asked for
  var loaded = null;  // track currently attached to the element
  var missing = {};   // name -> true once its source failed to load
  var pos = {};       // name -> seconds, for the resumable tracks
  var unlocked = false;
  var starting = false;  // play() を呼んだが、まだ鳴り出していない（読み込み中）
  var onFail = null;  // playAny's "try the next one" continuation
  var ramp = null;
  var rampAt = 0;     // フェードが最後に動いた時刻（止まったままかを見分ける）

  function srcOf(name) {
    return (window.BGM_ART && window.BGM_ART[name]) ||
           (window.ASSET_BASE || "") + "assets/bgm/" + name + ".mp3";
  }

  // inline/standalone builds embed only some tracks, so a miss is known up front
  function exists(name) {
    if (missing[name]) return false;
    if (window.BGM_ART && !window.BGM_ART[name]) { missing[name] = true; return false; }
    return true;
  }

  function audio() {
    if (el) return el;
    el = new Audio();
    el.preload = "auto";
    el.loop = true;
    el.volume = VOLUME;
    el.addEventListener("error", function () {
      var name = loaded;
      if (!name) return;
      missing[name] = true;
      if (cur === name) {
        cur = loaded = null;
        var f = onFail; onFail = null;
        if (f) f();   // fall through to the next candidate
      }
    });
    return el;
  }

  function remember() {
    if (el && loaded && !NO_RESUME[loaded]) { try { pos[loaded] = el.currentTime; } catch (e) {} }
  }

  function fadeOut() {
    if (!el) return;
    clearInterval(ramp);
    var a = el, v = VOLUME;
    rampAt = Date.now();
    ramp = setInterval(function () {
      rampAt = Date.now();
      v -= VOLUME * 0.15;
      if (v <= 0) { clearInterval(ramp); ramp = null; a.pause(); setVol(VOLUME); }
      else setVol(v);
    }, STEP);
  }

  // フェードは 0.85→0.70→0.55→0.40→0.25→0.10 と 40ms ごとに下げていく。
  // この途中でアプリが裏に回る（広告・着信・ホームに戻る）とタイマーが止まり、
  // 下がりかけの音量のまま残る。元に戻すのは次の曲を鳴らすときだけなので、
  // そこまでBGMだけが小さいまま——最悪 1割の音量——で鳴りつづける。
  // 実測：フェード中に時計を止めると 0.7 のまま残り、画面をタップしても戻らない。
  //
  // 表に戻ったときと、次に画面を触ったときに、止まったままのフェードを畳む。
  // 進行中のフェード（1秒以内に動いている）には手を出さない。
  function healVolume() {
    if (!el || !ramp) return;
    if (Date.now() - rampAt < 1000) return;    // ふつうに進んでいる
    clearInterval(ramp); ramp = null;
    setVol(VOLUME);
    // 止めるつもりだったのなら止める。BGMを切っている（enabled=false）ときは
    // cur を残したまま止めるので、そちらも見る
    if (!cur || !enabled) { try { el.pause(); } catch (e) {} }
  }
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) healVolume();
  });
  window.addEventListener("pageshow", healVolume);

  function startTrack(name) {
    if (!enabled || missing[name]) return;
    var a = audio();
    clearInterval(ramp); ramp = null;   // cancel a fade-out still in progress
    setVol(VOLUME);
    if (loaded === name) {
      if (NO_RESUME[name]) { try { a.currentTime = 0; } catch (e) {} }
      else if (!a.paused) return;
    } else {
      remember();
      loaded = name;
      a.src = srcOf(name);
      var want = NO_RESUME[name] ? 0 : (pos[name] || 0);
      if (want) {
        // seeking before the metadata lands is ignored, so wait for just that
        a.addEventListener("loadedmetadata", function once() {
          a.removeEventListener("loadedmetadata", once);
          if (loaded === name) { try { a.currentTime = want; } catch (e) {} }
        });
      }
    }
    // play() を呼んでから実際に鳴り出すまでの間、要素は「停止中」のまま。
    // その間に入ったタップで鳴らし直さないよう、印を立てておく（下の nudge）
    starting = true;
    var p = a.play();
    if (p && p.then) p.then(function () { starting = false; },
                            function () { starting = false; });  // 解禁前などは次のタップで
    else starting = false;
  }

  function play(name) {
    if (TRACKS.indexOf(name) < 0) return;
    onFail = null;   // a direct play() abandons any pending playAny fallback
    if (cur === name && !NO_RESUME[name]) {
      if (enabled && unlocked && el && el.paused) startTrack(name);
      return;
    }
    cur = name;
    if (!enabled) return;
    if (unlocked) startTrack(name);
    // before the first gesture the handler at the bottom starts it
  }

  // Play the first available track in the list (missing ones are skipped).
  function playAny(list) {
    var i = 0;
    (function tryNext() {
      while (i < list.length) {
        var name = list[i++];
        if (TRACKS.indexOf(name) < 0 || !exists(name)) continue;
        play(name);
        onFail = tryNext;   // a hosted file can still 404; error advances the list
        return;
      }
      onFail = null;
    })();
  }

  function stop() {
    onFail = null;
    remember();
    cur = null;
    fadeOut();
  }

  function setEnabled(v) {
    enabled = v;
    try { localStorage.setItem("tq_bgm", v ? "1" : "0"); } catch (e) {}
    if (!v) { var keep = cur; stop(); cur = keep; }  // keep it, so re-enabling resumes
    else if (cur) startTrack(cur);
  }

  // 止まってしまった曲を、続きから鳴らし直す。頭出しはしない。
  //
  // ここで startTrack を呼んではいけない。startTrack は「新しく鳴らし始める」
  // 関数で、戦闘曲のように頭から鳴ると決めてある曲（NO_RESUME）は
  // currentTime = 0 に戻す。ところが play() を呼んでから実際に音が出るまでの
  // 間、要素は「停止中」のままなので、曲が始まる前に画面をタップすると
  // そのたびに頭から鳴り直していた。
  // 実機で「文章を送るために1度タップすると、また登場の音楽が鳴り始める」と
  // 報告された（2026-09-13 Pixel 8）。戦闘に入った直後がちょうどこの窓に入る。
  function nudge() {
    if (!cur || !enabled) return;
    if (!el) { startTrack(cur); return; }              // まだ一度も鳴らしていない
    if (starting) return;                              // 読み込み中。待てば鳴る
    if (loaded !== cur) { startTrack(cur); return; }   // 別の曲が入っている
    if (!el.paused) return;                            // もう鳴っている
    starting = true;
    var q = el.play();                                 // 続きから。巻き戻さない
    if (q && q.then) q.then(function () { starting = false; }, function () { starting = false; });
    else starting = false;
  }

  // browsers require a user gesture before audio can start
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, function () {
      var first = !unlocked;
      unlocked = true;
      healVolume();                       // 途中で止まったフェードを畳む
      // 1回目だけは、まだ要素すら鳴らせていないので startTrack でよい
      if (first) { if (cur && enabled) startTrack(cur); return; }
      nudge();
    }, { passive: true });
  });

  // ── 読み取り専用の覗き窓（2026-09-19 追加）──────────────────
  // サウンドトラック集の再生位置バーのためだけに足した。
  // **鳴り方には一切触れていない。** 値を返すだけ。
  // このファイルは実機で何度も焼かれている場所なので、
  // 再生の流れに手を入れる変更はここに足さないこと。
  function now() {
    if (!el) return null;
    return {
      track: loaded,
      time: el.currentTime || 0,
      duration: isFinite(el.duration) ? el.duration : 0,
      playing: !el.paused
    };
  }

  window.BGM = { play: play, playAny: playAny, stop: stop, setEnabled: setEnabled,
                 isEnabled: function () { return enabled; }, now: now };
})();
