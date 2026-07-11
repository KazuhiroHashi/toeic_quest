// WORD WIZ - app shell: screens, deck, enhance, gacha, save
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function el(html) { var d = document.createElement("div"); d.innerHTML = html; return d.firstElementChild; }

  // ---------- SFX ----------
  var actx = null;
  function beep(f, dur, type, vol, slide) {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(f, actx.currentTime);
      if (slide) o.frequency.linearRampToValueAtTime(slide, actx.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.05, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(); o.stop(actx.currentTime + dur);
    } catch (e) {}
  }
  window.WSFX = {
    play: function (n) {
      switch (n) {
        case "tap": beep(900, 0.05, "sine", 0.04); break;
        case "ok": beep(880, 0.1, "triangle"); beep(1320, 0.14, "triangle"); break;
        case "ex": [880, 1175, 1760].forEach(function (f, i) { setTimeout(function () { beep(f, 0.12, "triangle"); }, i * 60); }); break;
        case "miss": beep(220, 0.3, "sawtooth", 0.05, 110); break;
        case "hit": beep(320, 0.09, "square", 0.05, 180); break;
        case "crit": beep(520, 0.07, "square", 0.06); beep(1040, 0.16, "square", 0.06); break;
        case "die": beep(600, 0.25, "sawtooth", 0.04, 80); break;
        case "edmg": beep(130, 0.3, "sawtooth", 0.08, 60); break;
        case "heal": beep(660, 0.15, "sine", 0.06, 990); break;
        case "ss": beep(440, 0.12, "triangle", 0.07, 880); beep(880, 0.25, "triangle", 0.05, 1320); break;
        case "win": [659, 784, 988, 1319].forEach(function (f, i) { setTimeout(function () { beep(f, 0.16, "triangle"); }, i * 110); }); break;
        case "lose": [400, 350, 300, 250].forEach(function (f, i) { setTimeout(function () { beep(f, 0.2, "sine", 0.06); }, i * 150); }); break;
        case "gacha": [523, 659, 784, 1046, 1319].forEach(function (f, i) { setTimeout(function () { beep(f, 0.13, "triangle"); }, i * 80); }); break;
        case "lvup": [523, 659, 784].forEach(function (f, i) { setTimeout(function () { beep(f, 0.14, "triangle"); }, i * 90); }); break;
      }
    }
  };

  // ---------- state ----------
  var KEY = "wordwiz_save_v1";
  var S = null;

  function newState() {
    return {
      cards: { hinoko: { lv: 1, exp: 0, evo: false }, shizuku: { lv: 1, exp: 0, evo: false }, biriris: { lv: 1, exp: 0, evo: false } },
      deck: ["hinoko", "shizuku", "biriris", null, null],
      mana: 200, gems: 300, stones: 0,
      clear: {}, study: { answered: 0, correct: 0 },
      tutGacha: false
    };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function load() {
    try {
      var s = localStorage.getItem(KEY);
      if (s) { S = JSON.parse(s); return true; }
    } catch (e) {}
    return false;
  }

  function stars(r) { var s = ""; for (var i = 0; i < r; i++) s += "★"; return s; }
  function cardTile(card, st, extraCls) {
    var stat = st ? window.cardStat(card, st) : null;
    return '<div class="ccard r' + card.r + " " + (extraCls || "") + '" data-id="' + card.id + '">' +
      (st ? '<div class="lvb">Lv' + st.lv + (st.evo ? "+" : "") + "</div>" : "") +
      '<div class="eb">' + window.ELEMS[card.elem].icon + "</div>" +
      '<div class="art">' + window.CardArt.svg(card, { evo: st && st.evo }) + "</div>" +
      '<div class="nm">' + card.name + '</div><div class="st">' + stars(card.r) + "</div></div>";
  }

  function refreshHud() {
    $("hud-mana").textContent = S.mana;
    $("hud-gems").textContent = S.gems;
    $("hud-stones").textContent = S.stones;
  }
  function toast(text) {
    var t = $("toast");
    t.textContent = text;
    t.classList.remove("on");
    void t.offsetWidth;
    t.classList.add("on");
  }

  // ---------- screens/tabs ----------
  function show(id) {
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("on"); });
    $(id).classList.add("on");
  }
  function setTab(name) {
    document.querySelectorAll(".tab").forEach(function (t) { t.classList.toggle("on", t.dataset.tab === name); });
    ["quest", "deck", "gacha", "etc"].forEach(function (n) {
      $("tabpane-" + n).style.display = n === name ? "block" : "none";
    });
    if (name === "quest") renderQuests();
    if (name === "deck") renderDeck();
    if (name === "gacha") renderGacha();
    if (name === "etc") renderEtc();
  }

  // ---------- quests ----------
  function questUnlocked(q) {
    var idx = window.QUESTS.indexOf(q);
    if (idx === 0) return true;
    return !!S.clear[window.QUESTS[idx - 1].id];
  }
  function renderQuests() {
    var z = $("tabpane-quest");
    var h = '<div class="h1">クエスト <small>魔法図書館レキシカを浄化しよう</small></div>';
    for (var ch = 0; ch < 6; ch++) {
      var qs = window.QUESTS.filter(function (q) { return q.ch === ch; });
      var anyOpen = qs.some(questUnlocked);
      h += '<div class="chapter"><div class="ct"><div class="cname">第' + (ch + 1) + "章 " + qs[0].chName +
        '</div><div class="clv">TOEIC ' + qs[0].level + "</div></div>";
      qs.forEach(function (q) {
        var open = questUnlocked(q);
        var done = !!S.clear[q.id];
        h += '<div class="qrow' + (open ? "" : " locked") + (q.no === 4 ? " boss" : "") + '" data-q="' + q.id + '">' +
          '<div class="qn">' + q.name + "</div>" +
          '<div class="qmeta">' + (done ? '<span class="done">✔クリア</span>' : "💎" + q.gemsFirst) +
          "<span>▶</span></div></div>";
      });
      h += "</div>";
      if (!anyOpen) { h += ""; }
    }
    z.innerHTML = h;
    z.querySelectorAll(".qrow").forEach(function (r) {
      r.onclick = function () {
        var q = window.QUEST_BY_ID[r.dataset.q];
        if (!questUnlocked(q)) { toast("前のクエストをクリアすると解放！"); return; }
        startQuest(q);
      };
    });
  }

  // ---------- deck ----------
  var selSlot = -1;
  function ownedList() {
    return window.CARDS.filter(function (c) { return S.cards[c.id]; });
  }
  function renderDeck() {
    var z = $("tabpane-deck");
    var h = '<div class="h1">デッキ編成 <small>スロットを選んでカードをタップ</small></div><div class="deck-bar">';
    for (var i = 0; i < 5; i++) {
      var cid = S.deck[i];
      h += '<div class="dslot' + (selSlot === i ? " sel" : "") + '" data-slot="' + i + '">';
      if (cid) {
        var st = S.cards[cid];
        h += window.CardArt.svg(window.CARD_BY_ID[cid], { evo: st.evo }) + '<div class="lvb">Lv' + st.lv + "</div>";
      } else h += "＋";
      h += "</div>";
    }
    h += "</div>";
    var total = deckTeam().reduce(function (a, m) { return a + m.stat.hp; }, 0);
    var atk = deckTeam().reduce(function (a, m) { return a + m.stat.atk; }, 0);
    h += '<div class="stat-row"><span>チームHP</span> ' + total + '　<span>総攻撃</span> ' + atk + "</div>";
    h += '<div class="h1">所持カード <small>' + ownedList().length + " / " + window.CARDS.length + '種</small></div><div class="card-grid" id="coll-grid">';
    window.CARDS.forEach(function (c) {
      var st = S.cards[c.id];
      h += st ? cardTile(c, st) : cardTile(c, null, "dim");
    });
    h += "</div>";
    z.innerHTML = h;
    z.querySelectorAll(".dslot").forEach(function (d) {
      d.onclick = function () {
        var i = +d.dataset.slot;
        if (selSlot === i && S.deck[i]) { S.deck[i] = null; selSlot = -1; save(); renderDeck(); return; }
        selSlot = i;
        renderDeck();
      };
    });
    z.querySelectorAll("#coll-grid .ccard").forEach(function (c) {
      c.onclick = function () {
        var id = c.dataset.id;
        if (!S.cards[id]) { toast("ガチャで手に入れよう！"); return; }
        if (selSlot >= 0) {
          for (var i = 0; i < 5; i++) if (S.deck[i] === id && i !== selSlot) S.deck[i] = null;
          S.deck[selSlot] = id;
          selSlot = -1;
          save();
          renderDeck();
        } else {
          showDetail(id);
        }
      };
    });
  }
  function deckTeam() {
    return S.deck.filter(Boolean).map(function (id) {
      var card = window.CARD_BY_ID[id], st = S.cards[id];
      return { card: card, stat: window.cardStat(card, st), evo: st.evo };
    });
  }

  // ---------- card detail / enhance ----------
  function expNeed(lv) { return 20 + lv * 12; }
  function addExp(id, amount) {
    var st = S.cards[id], card = window.CARD_BY_ID[id];
    var ups = 0;
    st.exp += amount;
    while (st.lv < window.cardMaxLv(card, st) && st.exp >= expNeed(st.lv)) {
      st.exp -= expNeed(st.lv);
      st.lv++; ups++;
    }
    if (st.lv >= window.cardMaxLv(card, st)) st.exp = Math.min(st.exp, expNeed(st.lv) - 1);
    return ups;
  }
  function showDetail(id) {
    var card = window.CARD_BY_ID[id], st = S.cards[id];
    var stat = window.cardStat(card, st);
    var maxLv = window.cardMaxLv(card, st);
    var atMax = st.lv >= maxLv;
    var canEvo = card.r >= 3 && !st.evo && atMax;
    var evoCost = card.r; // stones
    var cost1 = window.lvUpCost(st.lv);
    var need = expNeed(st.lv);
    var m = $("modal");
    m.innerHTML =
      '<div class="detail-top"><div class="detail-art">' + window.CardArt.svg(card, { evo: st.evo }) + "</div>" +
      '<div class="detail-info"><div class="nm">' + card.name + (st.evo ? "＋" : "") + '</div>' +
      '<div class="stars">' + stars(card.r) + '</div>' +
      '<div class="stat-row"><span>属性</span>' + window.ELEMS[card.elem].icon + window.ELEMS[card.elem].name +
      '　<span>Lv</span>' + st.lv + "/" + maxLv + "</div>" +
      '<div class="stat-row"><span>HP</span>' + stat.hp + '　<span>ATK</span>' + stat.atk + "</div>" +
      (atMax ? "" : '<div class="exp-bar"><div style="width:' + Math.min(100, 100 * st.exp / need) + '%"></div></div>') +
      '<div class="skill-box"><b>AS: ' + window.AS_DEFS[card.as].name + "</b>" + window.AS_DEFS[card.as].desc + "</div>" +
      '<div class="skill-box"><b>SS: ' + window.SS_DEFS[card.ss].name + "（正解" + window.SS_DEFS[card.ss].need + "でチャージ）</b>" + window.SS_DEFS[card.ss].desc + "</div>" +
      "</div></div>" +
      '<div class="flavor">' + card.flavor + "</div>" +
      '<div class="modal-btns">' +
      (atMax
        ? (canEvo ? '<button class="mbtn gold" id="btn-evo">進化する（進化石×' + evoCost + "）</button>" : '<button class="mbtn" disabled>レベルMAX</button>')
        : '<button class="mbtn" id="btn-lv1">強化 +1Lv（マナ' + cost1 + "）</button>") +
      '<button class="mbtn ghost" id="btn-close">とじる</button></div>';
    $("modal-layer").classList.add("on");
    $("btn-close").onclick = closeModal;
    var b1 = $("btn-lv1");
    if (b1) b1.onclick = function () {
      if (S.mana < cost1) { toast("マナが足りない！クエストで集めよう"); return; }
      S.mana -= cost1;
      st.lv++;
      st.exp = 0;
      WSFX.play("lvup");
      toast(card.name + " が Lv" + st.lv + " になった！");
      save(); refreshHud(); showDetail(id); renderDeck();
    };
    var be = $("btn-evo");
    if (be) be.onclick = function () {
      if (S.stones < evoCost) { toast("進化石が足りない！ボスクエスト初回クリアで入手"); return; }
      S.stones -= evoCost;
      st.evo = true;
      WSFX.play("gacha");
      toast("✨ " + card.name + " が進化した！");
      save(); refreshHud(); showDetail(id); renderDeck();
    };
  }
  function closeModal() { $("modal-layer").classList.remove("on"); }

  // ---------- gacha ----------
  function renderGacha() {
    var z = $("tabpane-gacha");
    z.innerHTML =
      '<div id="gacha-stage"><div class="h1" style="text-align:center">精霊召喚</div>' +
      '<div id="gacha-crystal">🔮</div>' +
      '<button class="big-btn" id="g1">1回 召喚（💎' + window.GACHA_COST + "）</button>" +
      '<button class="big-btn ghost" id="g10">10連 召喚（💎' + window.GACHA_COST * 10 + "）</button>" +
      '<div class="rate-note">提供割合: ★5 3% / ★4 12% / ★3 30% / ★2 55%<br>ジェムはクエスト初回クリアで手に入るよ</div>' +
      '<div id="gacha-result"></div></div>';
    $("g1").onclick = function () { doGacha(1); };
    $("g10").onclick = function () { doGacha(10); };
  }
  function doGacha(n) {
    var cost = window.GACHA_COST * n;
    if (S.gems < cost) { toast("ジェムが足りない！クエストで集めよう"); return; }
    S.gems -= cost;
    WSFX.play("gacha");
    var out = [];
    for (var i = 0; i < n; i++) {
      var id = window.gachaRoll();
      var isNew = !S.cards[id];
      if (isNew) S.cards[id] = { lv: 1, exp: 0, evo: false };
      else addExp(id, 40 + window.CARD_BY_ID[id].r * 20); // dup -> exp
      out.push({ id: id, isNew: isNew });
    }
    save(); refreshHud();
    var z = $("gacha-result");
    z.innerHTML = "";
    out.forEach(function (o, i) {
      var card = window.CARD_BY_ID[o.id];
      var t = el(cardTile(card, S.cards[o.id]));
      t.style.animationDelay = (i * 0.12) + "s";
      if (o.isNew) t.insertAdjacentHTML("beforeend", '<div class="owned-check">NEW</div>');
      t.onclick = function () { showDetail(o.id); };
      z.appendChild(t);
    });
  }

  // ---------- etc tab ----------
  function renderEtc() {
    var st = S.study || { answered: 0, correct: 0 };
    var rate = st.answered ? Math.round(100 * st.correct / st.answered) : 0;
    var premium = false;
    try { premium = localStorage.getItem("tq_premium") === "1"; } catch (e) {}
    var z = $("tabpane-etc");
    z.innerHTML =
      '<div class="h1">学習きろく</div>' +
      '<div class="chapter"><div class="r-line"><span>こたえた単語</span>' + st.answered + '問</div>' +
      '<div class="r-line"><span>正解率</span>' + rate + '%</div></div>' +
      '<div class="h1">せってい</div>' +
      '<div class="chapter">' +
      '<button class="mbtn ghost" style="width:100%" id="btn-premium">広告除去: ' + (premium ? "ON（購入済み扱い）" : "OFF") + "</button>" +
      '<button class="mbtn ghost" style="width:100%;margin-top:8px" id="btn-title">タイトルへ戻る</button>' +
      '<button class="mbtn ghost" style="width:100%;margin-top:8px;color:#ff8fa3" id="btn-reset">データをリセット</button></div>' +
      '<div class="rate-note">姉妹作「TOEIC QUEST（ドラクエ風）」も同リポジトリで遊べます</div>';
    $("btn-premium").onclick = function () {
      try { localStorage.setItem("tq_premium", premium ? "0" : "1"); } catch (e) {}
      refreshAd(); renderEtc();
    };
    $("btn-title").onclick = function () { show("scr-title"); };
    var armed = false;
    $("btn-reset").onclick = function () {
      if (!armed) { armed = true; $("btn-reset").textContent = "ほんとうにリセットする？（もう一度タップ）"; return; }
      try { localStorage.removeItem(KEY); } catch (e) {}
      location.reload();
    };
  }
  function refreshAd() {
    var premium = false;
    try { premium = localStorage.getItem("tq_premium") === "1"; } catch (e) {}
    $("ad-bar").classList.toggle("hidden", premium);
  }

  // ---------- quest flow ----------
  async function startQuest(q) {
    var team = deckTeam();
    if (!team.length) { toast("デッキにカードをセットしよう！"); setTab("deck"); return; }
    show("scr-battle");
    var res = await window.WBATTLE.start(q, team);
    // result
    var box = $("result-box");
    if (res.win) {
      WSFX.play("win");
      var first = !S.clear[q.id];
      S.clear[q.id] = true;
      S.mana += q.mana;
      var gems = first ? q.gemsFirst : Math.round(q.gemsFirst * 0.1);
      S.gems += gems;
      var stones = first ? q.stoneFirst : 0;
      S.stones += stones;
      var ups = [];
      S.deck.filter(Boolean).forEach(function (id) {
        var u = addExp(id, q.exp);
        if (u) ups.push(window.CARD_BY_ID[id].name + " Lv" + S.cards[id].lv);
      });
      save(); refreshHud();
      box.innerHTML = "<h2>QUEST CLEAR!</h2>" +
        '<div class="r-line"><span>マナ</span>+' + q.mana + "</div>" +
        '<div class="r-line"><span>ジェム</span>+' + gems + (first ? "（初回）" : "") + "</div>" +
        (stones ? '<div class="r-line"><span>進化石</span>+' + stones + "</div>" : "") +
        '<div class="r-line"><span>カードEXP</span>各+' + q.exp + "</div>" +
        (ups.length ? '<div class="lvup-note">LEVEL UP! ' + ups.join(" / ") + "</div>" : "") +
        '<div class="modal-btns"><button class="mbtn" id="r-ok">ホームへ</button></div>';
    } else {
      WSFX.play("lose");
      box.innerHTML = '<h2 class="lose">QUEST FAILED…</h2>' +
        '<div class="rate-note">カードを強化したり、回復SS持ちを入れて再挑戦しよう。<br>まちがえた単語こそ 成長のチャンス！</div>' +
        '<div class="modal-btns"><button class="mbtn" id="r-ok">ホームへ</button></div>';
    }
    $("result-layer").classList.add("on");
    $("r-ok").onclick = function () {
      $("result-layer").classList.remove("on");
      show("scr-home");
      setTab("quest");
    };
  }

  // ---------- boot ----------
  function boot() {
    var has = load();
    if (!S) S = newState();
    refreshHud();
    refreshAd();
    $("title-art").innerHTML = window.CardArt.svg(window.CARD_BY_ID.kuronoa, { evo: true });
    $("btn-start").textContent = has ? "つづきから" : "ぼうけんを はじめる";
    $("btn-start").onclick = function () {
      WSFX.play("tap");
      show("scr-home");
      setTab("quest");
      if (!S.tutGacha) {
        S.tutGacha = true;
        save();
        setTimeout(function () {
          toast("💎300でまず召喚してみよう！（ガチャタブ）");
        }, 800);
      }
    };
    document.querySelectorAll(".tab").forEach(function (t) {
      t.onclick = function () { WSFX.play("tap"); setTab(t.dataset.tab); };
    });
    $("modal-layer").onclick = function (e) { if (e.target === $("modal-layer")) closeModal(); };
    show("scr-title");
  }
  window.addEventListener("DOMContentLoaded", function () {
    window.WSTATE = null;
    boot();
    window.WSTATE = S;
  });
})();
