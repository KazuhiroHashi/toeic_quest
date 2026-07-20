// WORD QUEST II - party battle engine
// PBATTLE.start(encounter) -> Promise<{result:"win"|"lose"|"flee", exp}>
// encounter: { enemies:[{base,name,lv,hp,atk,def,agi,exp,boss,phases,skills,mag}], bg, intro }
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  // heal amounts wobble +/-3 around the listed value
  function healJitter(p) { return Math.max(1, p + rnd(7) - 3); }

  // ================= SFX =================
  var sfxCache = {};
  function sfx(name) {
    try {
      var src = (window.SFX_ART && window.SFX_ART[name]) || "../assets/sfx/" + name + ".mp3";
      var a = sfxCache[name];
      if (!a) { a = sfxCache[name] = new Audio(src); a.volume = 0.7; }
      a.currentTime = 0;
      var p = a.play(); if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  // element-aware spell sound: play magic_<elem> if it exists, else the generic magic sfx
  function sfxEl(elem) {
    var name = elem ? "magic_" + elem : "magic";
    if (window.SFX_ART) { sfx(window.SFX_ART[name] ? name : "magic"); return; } // inline build
    try { // file build: try the element file, fall back to generic on 404
      var a = sfxCache[name] || (sfxCache[name] = new Audio("../assets/sfx/" + name + ".mp3"));
      a.volume = 0.7; a.onerror = function () { sfx("magic"); };
      a.currentTime = 0;
      var p = a.play(); if (p && p.catch) p.catch(function () { sfx("magic"); });
    } catch (e) { sfx("magic"); }
  }

  // one-shot victory fanfare (assets/bgm/victory.mp3); falls back to the win SFX
  var victoryAudio = null;
  function victoryJingle() {
    var src = (window.BGM_ART && window.BGM_ART.victory) || "../assets/bgm/victory.mp3";
    try {
      if (!victoryAudio) victoryAudio = new Audio(src);
      victoryAudio.currentTime = 0; victoryAudio.volume = 0.7;
      var p = victoryAudio.play();
      if (p && p.catch) p.catch(function () { sfx("win"); });
    } catch (e) { sfx("win"); }
  }

  // ================= input + UI =================
  var INPUT = { stack: [] };
  INPUT.top = function () { return this.stack[this.stack.length - 1] || null; };
  window.addEventListener("keydown", function (e) {
    if (!battleVisible()) return;
    var t = INPUT.top(); if (!t) return;
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") { if (t.onDir) t.onDir("up"); }
    else if (e.key === "ArrowDown" || e.key === "ArrowRight") { if (t.onDir) t.onDir("down"); }
    else if (e.key === "Enter" || e.key === " " || e.key === "z") { if (t.onA) t.onA(); }
    else if (e.key === "Escape" || e.key === "x") { if (t.onB) t.onB(); }
  });
  function battleVisible() {
    var el = $("pbattle-screen");
    return el && el.style.display === "block";
  }

  function say(text) {
    var el = $("pbattle-msg");
    return new Promise(function (resolve) {
      el.style.display = "block";
      el.innerHTML = '<span class="body"></span><span class="arrow">▼</span>';
      var body = el.querySelector(".body");
      var i = 0, typing = true;
      var iv = setInterval(function () {
        if (i >= text.length) { clearInterval(iv); typing = false; return; }
        body.textContent = text.slice(0, ++i);
      }, 16);
      INPUT.stack.push({ onA: adv, onB: adv });
      el.onpointerdown = function (e) { e.preventDefault(); adv(); };
      function adv() {
        if (typing) { clearInterval(iv); body.textContent = text; typing = false; return; }
        INPUT.stack.pop();
        el.onpointerdown = null;
        resolve();
      }
    });
  }

  function menu(el, items, title) {
    return new Promise(function (resolve) {
      var sel = 0;
      while (items[sel] && items[sel].disabled) sel++;
      function render() {
        var h = title ? '<div class="menu-title">' + title + "</div>" : "";
        items.forEach(function (it, i) {
          h += '<div class="menu-item' + (i === sel ? " sel" : "") + (it.disabled ? " disabled" : "") + '" data-i="' + i + '">' + it.label + "</div>";
        });
        el.innerHTML = h;
        el.querySelectorAll(".menu-item").forEach(function (n) {
          n.onpointerdown = function (e) {
            e.preventDefault();
            var i = +n.getAttribute("data-i");
            if (items[i].disabled) return;
            close(i);
          };
        });
      }
      function close(v) { INPUT.stack.pop(); el.style.display = "none"; resolve(v); }
      INPUT.stack.push({
        onA: function () { if (!items[sel].disabled) { sfx("cursor"); close(sel); } },
        onB: function () { close(-1); },
        onDir: function (d) {
          var n = items.length;
          for (var k = 0; k < n; k++) {
            sel = d === "up" ? (sel + n - 1) % n : (sel + 1) % n;
            if (!items[sel].disabled) break;
          }
          sfx("cursor"); render();
        }
      });
      el.style.display = "block";
      render();
    });
  }

  // ================= spell / character registry =================
  // quizLv = the QUESTION difficulty this spell asks (fixed per spell, NOT the enemy's level).
  var SPELLS = {
    heal:      { name: "ヒール",        mp: 4,  type: "heal",  power: 40, quizLv: 400, desc: "味方1人のHPを40前後 回復する" },
    healmore:  { name: "ヒールモア",     mp: 8,  type: "heal",  power: 85, quizLv: 600, desc: "味方1人のHPを85前後 回復する" },
    fullheal:  { name: "フルヒール",     mp: 14, type: "heal",  power: 9999, full: true, quizLv: 700, desc: "味方1人のHPを全回復する" },
    partyheal: { name: "パーティヒール",  mp: 14, type: "heal",  power: 50, all: true, quizLv: 600, desc: "味方全員のHPを50ほど回復する" },
    sanctuary: { name: "サンクチュアリ",  mp: 26, type: "heal",  power: 90, all: true, quizLv: 800, desc: "味方全員のHPを90ほど回復する" },
    revive:    { name: "そせい",         mp: 18, type: "raise", power: 0.6, quizLv: 700, desc: "戦闘不能の味方をＨＰ6割で復活させる" },
    spark:     { name: "スパーク",       mp: 4,  type: "atk",   power: 26, elem: "thunder", quizLv: 400, desc: "敵1体に雷のダメージ" },
    fire:      { name: "フレイム",       mp: 4,  type: "atk",   power: 30, elem: "fire", quizLv: 400, desc: "敵1体に炎のダメージ" },
    frost:     { name: "フロスト",       mp: 5,  type: "atk",   power: 34, elem: "ice", quizLv: 450, desc: "敵1体に氷のダメージ" },
    fireball:  { name: "ヒートランス",    mp: 7,  type: "atk",   power: 44, elem: "fire", quizLv: 600, desc: "敵1体に強い炎のダメージ" },
    holy:      { name: "セイクリッド",    mp: 8,  type: "atk",   power: 54, elem: "holy", quizLv: 600, desc: "敵1体に聖なるダメージ（不死・悪魔に特効）" },
    fira:      { name: "フレイムバースト", mp: 9,  type: "atk",   power: 40, elem: "fire", all: true, quizLv: 600, desc: "敵全体に炎のダメージ" },
    thunder:   { name: "ボルトストーム",  mp: 13, type: "atk",   power: 46, elem: "thunder", all: true, quizLv: 700, desc: "敵全体に雷のダメージ" },
    frostnova: { name: "フロストノヴァ",  mp: 14, type: "atk",   power: 48, elem: "ice", all: true, quizLv: 750, desc: "敵全体に氷のダメージ" },
    inferno:   { name: "インフェルノ",    mp: 20, type: "atk",   power: 72, elem: "fire", all: true, quizLv: 900, desc: "敵全体に灼熱の大ダメージ" },
    plasma:    { name: "プラズマストーム", mp: 24, type: "atk",   power: 80, elem: "thunder", all: true, quizLv: 900, desc: "敵全体に雷の特大ダメージ（リナの奥義）" }
  };

  // learn: { level: spellId | [spellId,...] } — casters gain more spells as they level up
  var CHARS = {
    yu:   { name: "ユウ", role: "ゆうしゃ", quizOff: 0,
            base: { hp: 36, mp: 10, atk: 12, def: 9, agi: 9 },
            grow: { hp: 9,  mp: 3,  atk: 3,  def: 2, agi: 2 },
            learn: { 3: "heal", 6: "spark", 10: "fireball", 14: "healmore", 20: "partyheal", 22: "fullheal", 26: "inferno" } },
    gai:  { name: "ガイ", role: "せんし", quizOff: -100,
            base: { hp: 48, mp: 0,  atk: 16, def: 12, agi: 6 },
            grow: { hp: 12, mp: 0,  atk: 4,  def: 3,  agi: 1 },
            learn: {} },
    rina: { name: "リナ", role: "まほうつかい", quizOff: 100,
            base: { hp: 26, mp: 18, atk: 7,  def: 6, agi: 8 },
            grow: { hp: 6,  mp: 6,  atk: 2,  def: 1, agi: 2 },
            learn: { 1: ["fire", "frost"], 6: "fira", 11: "thunder", 16: "frostnova", 20: "inferno", 25: "plasma" } },
    mia:  { name: "ミア", role: "そうりょ", quizOff: 0,
            base: { hp: 32, mp: 16, atk: 8,  def: 8, agi: 8 },
            grow: { hp: 7,  mp: 6,  atk: 2,  def: 2, agi: 2 },
            learn: { 1: "heal", 5: "partyheal", 9: "holy", 12: "revive", 16: "fullheal", 20: "sanctuary" } }
  };

  // cumulative EXP needed to REACH level n (index = level)
  var EXP_FOR = [0, 0];
  for (var _lv = 2; _lv <= 50; _lv++) EXP_FOR[_lv] = EXP_FOR[_lv - 1] + Math.round(7 * Math.pow(_lv, 1.75));

  function spellsAt(id, lv) {
    var learn = CHARS[id].learn, out = [];
    for (var L in learn) {
      if (+L <= lv) {
        var v = learn[L];
        (Array.isArray(v) ? v : [v]).forEach(function (sid) { if (out.indexOf(sid) < 0) out.push(sid); });
      }
    }
    return out;
  }
  function statAt(id, lv) {
    var c = CHARS[id], s = {};
    ["hp", "mp", "atk", "def", "agi"].forEach(function (k) {
      s[k] = Math.round(c.base[k] + c.grow[k] * (lv - 1));
    });
    return s;
  }
  function makeMember(id, lv) {
    lv = lv || 1;
    var c = CHARS[id], s = statAt(id, lv);
    return {
      id: id, name: c.name, role: c.role, quizOff: c.quizOff,
      lv: lv, exp: EXP_FOR[lv] || 0,
      hp: s.hp, maxhp: s.hp, mp: s.mp, maxmp: s.mp,
      atk: s.atk, def: s.def, agi: s.agi,
      gearAtk: 0, gearDef: 0, weapon: null, armor: null,
      bag: [], // per-member item ids, max 8
      spellIds: spellsAt(id, lv)
    };
  }
  function memberSpells(m) {
    return m.spellIds.map(function (sid) { return Object.assign({ id: sid }, SPELLS[sid]); });
  }
  function atkOf(m) { return m.atk + (m.gearAtk || 0); }
  function defOf(m) { return m.def + (m.gearDef || 0); }
  // magic attack power — like atk, it scales with level so spells don't fall off.
  // mages scale hardest; warriors barely cast anyway.
  function magOf(m) {
    var per = m.role === "まほうつかい" ? 3.6 : m.role === "そうりょ" ? 2.2 : m.role === "ゆうしゃ" ? 2.0 : 1.6;
    return Math.round(m.lv * per);
  }

  // grant exp to one member, return {gained, ups:[{lv, learned:[names]}]}
  function gainExp(m, amount) {
    m.exp += amount;
    var ups = [];
    while (m.lv < 50 && m.exp >= EXP_FOR[m.lv + 1]) {
      m.lv++;
      var before = { hp: m.maxhp, mp: m.maxmp, atk: m.atk, def: m.def };
      var s = statAt(m.id, m.lv);
      m.maxhp = s.hp; m.maxmp = s.mp; m.atk = s.atk; m.def = s.def; m.agi = s.agi;
      m.hp = Math.min(m.maxhp, m.hp + (m.maxhp - before.hp)); // level heals the gained HP
      m.mp = Math.min(m.maxmp, m.mp + (m.maxmp - before.mp));
      var learnedNames = [];
      var newSpells = spellsAt(m.id, m.lv);
      newSpells.forEach(function (sid) {
        if (m.spellIds.indexOf(sid) < 0) { m.spellIds.push(sid); learnedNames.push(SPELLS[sid].name); }
      });
      ups.push({ lv: m.lv, learned: learnedNames });
    }
    return { gained: amount, ups: ups };
  }

  var items = { herb: 6, elixir: 2 };

  // ================= state =================
  var party, foes, chain, screenEl, battleQuizLv = 500;

  // normal attacks: base difficulty of THIS battle + the member's role offset
  function atkQuizLv(member) { return clamp(battleQuizLv + (member.quizOff || 0), 400, 900); }
  // spells: the spell decides its own question difficulty (independent of the enemy)
  function spellQuizLv(sp) { return clamp(sp.quizLv || 500, 400, 900); }
  function enemyImg(id) {
    return (window.ENEMY_ART && window.ENEMY_ART[id]) || "../assets/enemies/" + id + ".png";
  }

  function renderEnemies() {
    var row = $("penemy-row");
    row.innerHTML = "";
    foes.forEach(function (f, i) {
      var d = document.createElement("div");
      d.className = "penemy" + (f.hp <= 0 ? " dead" : "");
      d.id = "penemy-" + i;
      var w = f.boss ? 46 : clamp(40 - foes.length * 4, 22, 40);
      d.style.width = w + "%";
      d.innerHTML =
        '<div class="ptag">' + f.name + "</div>" +
        '<img src="' + enemyImg(f.base) + '" alt="">' +
        '<div class="phpbar"><div style="width:' + Math.max(0, 100 * f.hp / f.maxhp) + '%"></div></div>';
      row.appendChild(d);
    });
  }
  function updateEnemyHp(i) {
    var f = foes[i], el = $("penemy-" + i);
    if (!el) return;
    el.querySelector(".phpbar > div").style.width = Math.max(0, 100 * f.hp / f.maxhp) + "%";
    if (f.hp <= 0) el.classList.add("dead");
  }

  function renderParty(activeIdx) {
    var strip = $("pparty-strip");
    strip.innerHTML = "";
    party.forEach(function (p, i) {
      var d = document.createElement("div");
      var cls = "pmember";
      if (p.hp <= 0) cls += " dead";
      else if (p.hp <= p.maxhp * 0.25) cls += " danger";
      else if (p.hp <= p.maxhp * 0.5) cls += " low";
      if (i === activeIdx) cls += " active";
      if (p.guard) cls += " guarding";
      d.className = cls;
      d.id = "pmember-" + i;
      d.innerHTML =
        '<div class="pname">' + p.name + '<span class="plv">L' + p.lv + "</span></div>" +
        '<div class="phv">HP <b>' + Math.max(0, p.hp) + "</b>/" + p.maxhp + "</div>" +
        '<div class="pmv">MP ' + p.mp + "/" + p.maxmp + "</div>" +
        '<div class="php"><div style="width:' + Math.max(0, 100 * p.hp / p.maxhp) + '%"></div></div>';
      strip.appendChild(d);
    });
  }

  function chainBadge() {
    var b = $("pchain-badge");
    if (chain >= 2) {
      b.textContent = "チェイン ×" + chain + "（ダメージ+" + Math.round((chainMult() - 1) * 100) + "%）";
      b.className = "on";
    } else b.className = "";
  }
  function chainMult() { return 1 + Math.min((chain - 1) * 0.05, 0.15); } // gentle: max +15%

  function bpop(text, cls, anchorEl) {
    var d = document.createElement("div");
    d.className = "battle-pop " + (cls || "");
    d.textContent = text;
    var r = anchorEl ? anchorEl.getBoundingClientRect() : null;
    var s = screenEl.getBoundingClientRect();
    if (r) {
      d.style.left = (r.left - s.left + r.width * 0.3 + rnd(20)) + "px";
      d.style.top = (r.top - s.top + r.height * 0.35) + "px";
    } else { d.style.left = "40%"; d.style.top = "40%"; }
    screenEl.appendChild(d);
    setTimeout(function () { d.remove(); }, 900);
  }
  function slashFx(color) {
    var d = document.createElement("div");
    d.className = "slash-fx";
    if (color) d.style.background = "linear-gradient(105deg, transparent 38%, " + color + " 50%, transparent 62%)";
    screenEl.appendChild(d);
    setTimeout(function () { d.remove(); }, 320);
  }

  function hitEnemy(i, dmg, crit, fxColor, silent) {
    var f = foes[i], el = $("penemy-" + i);
    f.hp = Math.max(0, f.hp - dmg);
    if (el) { el.classList.add("hit"); setTimeout(function () { el.classList.remove("hit"); }, 200); }
    slashFx(fxColor);
    bpop(String(dmg), crit ? "crit" : "", el);
    if (!silent) sfx(crit ? "crit" : "slash"); // spells play their own "magic" sfx once
    updateEnemyHp(i);
  }
  function hitMember(i, dmg) {
    var p = party[i];
    p.hp = Math.max(0, p.hp - dmg);
    var el = $("pmember-" + i);
    if (el) { el.classList.add("hitflash"); setTimeout(function () { el.classList.remove("hitflash"); }, 320); }
    sfx("hit");
    renderParty(-1);
  }

  function aliveFoes() { return foes.filter(function (f) { return f.hp > 0; }); }
  function aliveMembers() { return party.filter(function (p) { return p.hp > 0; }); }
  function firstAliveFoe() { for (var i = 0; i < foes.length; i++) if (foes[i].hp > 0) return i; return -1; }
  function anyBoss() { return foes.some(function (f) { return f.boss; }); }

  // ================= command phase =================
  async function pickCommands() {
    var acts = [];
    var i = 0;
    while (i < party.length) {
      var p = party[i];
      if (p.hp <= 0) { i++; continue; }
      renderParty(i);
      var spells = memberSpells(p);
      var c = await menu($("pbattle-cmd"), [
        { label: "こうげき" },
        { label: "まほう", disabled: !spells.length },
        { label: "ぼうぎょ" },
        { label: "どうぐ" },
        { label: "にげる" }
      ], p.name + "（Ｌｖ" + p.lv + "）");
      if (c === -1) {
        if (i === 0) continue;
        i--; acts.pop();
        while (i > 0 && party[i].hp <= 0) { i--; acts.pop(); }
        continue;
      }
      if (c === 4) { return { flee: true }; }
      if (c === 0) {
        var t = await pickTarget();
        if (t === -1) continue;
        acts.push({ who: i, kind: "atk", target: t });
      } else if (c === 1) {
        var opts = spells.map(function (s) {
          return { label: s.name + "　ＭＰ" + s.mp, disabled: p.mp < s.mp };
        });
        var si = await menu($("pbattle-sub"), opts, "まほう");
        if (si === -1) continue;
        var sp = spells[si];
        var tgt = -1;
        if (sp.type === "atk" && !sp.all) { tgt = await pickTarget(); if (tgt === -1) continue; }
        if (sp.type === "heal" && !sp.all) { tgt = await pickAlly(false); if (tgt === -1) continue; }
        if (sp.type === "raise") { tgt = await pickAlly(true); if (tgt === -1) continue; }
        acts.push({ who: i, kind: "spell", spell: sp, target: tgt });
      } else if (c === 2) {
        acts.push({ who: i, kind: "guard" });
      } else {
        var counts = {};
        p.bag.forEach(function (k) { if (k === "herb" || k === "elixir" || k === "espresso") counts[k] = (counts[k] || 0) + 1; });
        var inv = [];
        if (counts.herb) inv.push({ key: "herb", label: "ハーブティー ×" + counts.herb });
        if (counts.elixir) inv.push({ key: "elixir", label: "エナジーコーヒー ×" + counts.elixir });
        if (counts.espresso) inv.push({ key: "espresso", label: "エスプレッソ ×" + counts.espresso });
        if (!inv.length) { await say(p.name + "は 使える道具を持っていない！"); continue; }
        var ii = await menu($("pbattle-sub"), inv, p.name + "の どうぐ");
        if (ii === -1) continue;
        var at = await pickAlly(false);
        if (at === -1) continue;
        acts.push({ who: i, kind: "item", item: inv[ii].key, target: at });
      }
      i++;
    }
    renderParty(-1);
    return { acts: acts };
  }

  function pickTarget() {
    var alive = [];
    foes.forEach(function (f, i) { if (f.hp > 0) alive.push(i); });
    if (alive.length === 1) return Promise.resolve(alive[0]);
    var opts = alive.map(function (i) { return { label: foes[i].name, fi: i }; });
    return menu($("pbattle-sub"), opts, "どの敵？").then(function (v) {
      return v === -1 ? -1 : opts[v].fi;
    });
  }
  function pickAlly(deadOnly) {
    var opts = [];
    party.forEach(function (p, i) {
      var ok = deadOnly ? p.hp <= 0 : p.hp > 0;
      if (ok) opts.push({ label: p.name + "　ＨＰ" + Math.max(0, p.hp) + "/" + p.maxhp, pi: i });
    });
    if (!opts.length) return Promise.resolve(-1);
    return menu($("pbattle-sub"), opts, "だれに？").then(function (v) {
      return v === -1 ? -1 : opts[v].pi;
    });
  }

  // ================= member actions =================
  async function execMemberAction(a) {
    var p = party[a.who];
    if (p.hp <= 0) return;
    if (a.kind === "guard") {
      p.guard = true; renderParty(-1);
      await say(p.name + "は 身を守っている。");
      return;
    }
    if (a.kind === "item") {
      var t = party[a.target];
      var bi = p.bag.indexOf(a.item);
      if (bi < 0) { await say("道具が見つからない…"); return; }
      p.bag.splice(bi, 1); // consume from the acting member's bag
      if (a.item === "herb") { t.hp = Math.min(t.maxhp, t.hp + 40); await say(p.name + "は ハーブティーを使った！\n" + t.name + "のＨＰが 40 回復！"); }
      else if (a.item === "espresso") { t.mp = Math.min(t.maxmp, t.mp + 80); await say(p.name + "は エスプレッソを使った！\n" + t.name + "のＭＰが 80 回復！"); }
      else { t.mp = Math.min(t.maxmp, t.mp + 30); await say(p.name + "は エナジーコーヒーを使った！\n" + t.name + "のＭＰが 30 回復！"); }
      sfx("heal"); renderParty(-1);
      return;
    }
    if (a.kind === "atk") {
      var ti = foes[a.target] && foes[a.target].hp > 0 ? a.target : firstAliveFoe();
      if (ti < 0) return;
      var f = foes[ti];
      await say(p.name + "の こうげき！");
      var q = await window.QUIZ.ask(atkQuizLv(p), { time: f.hasty ? 3.5 : 5 });
      if (q.correct) {
        chain++; chainBadge();
        var crit = q.elapsed <= 2;
        var dmg = Math.max(1, Math.round((atkOf(p) - defOf2(f) / 2 + rnd(6)) * chainMult()));
        if (crit) dmg *= 2;
        if (f.base === "metal" && !crit) dmg = 1;
        hitEnemy(ti, dmg, crit);
        if (crit) await say("クリティカルヒット！！\n" + f.name + "に " + dmg + " のダメージ！");
        else await say(f.name + "に " + dmg + " のダメージ！" + (chain >= 2 ? "（チェイン×" + chain + "）" : ""));
        await checkFoeDown(ti);
      } else {
        chain = 0; chainBadge();
        await say(p.name + "の こうげきは 空振り！\n（チェインが途切れた）");
      }
      return;
    }
    if (a.kind === "spell") {
      var sp = a.spell;
      if (p.mp < sp.mp) { await say("ＭＰが足りない！"); return; }
      p.mp -= sp.mp; renderParty(-1);
      await say(p.name + "は 魔法『" + sp.name + "』を となえた！");
      var qs = await window.QUIZ.ask(spellQuizLv(sp), { time: 5, noCrit: true });
      if (!qs.correct) {
        chain = 0; chainBadge();
        await say("魔法は 不発に終わった…！\n（チェインが途切れた）");
        return;
      }
      chain++; chainBadge();
      if (sp.type === "heal") {
        sfx("heal");
        if (sp.all) {
          var amt = healJitter(sp.power);
          aliveMembers().forEach(function (m) { m.hp = Math.min(m.maxhp, m.hp + amt); });
          renderParty(-1);
          await say("優しい光が降りそそぐ！\nみんなのＨＰが " + amt + " 回復！");
        } else {
          var tm = party[a.target];
          var before = tm.hp;
          tm.hp = sp.full ? tm.maxhp : Math.min(tm.maxhp, tm.hp + healJitter(sp.power));
          renderParty(-1);
          await say(sp.full ? tm.name + "のＨＰが 全回復した！" : tm.name + "のＨＰが " + (tm.hp - before) + " 回復した！");
        }
        return;
      }
      if (sp.type === "raise") {
        var rm = party[a.target];
        if (rm.hp > 0) { await say("しかし 何も起こらなかった。\n（そせいは 戦闘不能の味方にだけ）"); return; }
        rm.hp = Math.max(1, Math.round(rm.maxhp * sp.power));
        sfx("heal"); renderParty(-1);
        await say(rm.name + "が 生き返った！");
        return;
      }
      var fxc = sp.elem === "fire" ? "rgba(255,150,60,.9)" : sp.elem === "thunder" ? "rgba(255,230,90,.9)" : sp.elem === "ice" ? "rgba(150,220,255,.9)" : sp.elem === "holy" ? "rgba(255,250,200,.95)" : "rgba(200,160,255,.9)";
      var targets = sp.all ? foes.map(function (f, i) { return i; }).filter(function (i) { return foes[i].hp > 0; })
                           : [foes[a.target] && foes[a.target].hp > 0 ? a.target : firstAliveFoe()];
      sfxEl(sp.elem); // element-aware spell sound (magic_fire/ice/thunder/holy, else magic)
      var lines = [], anyWeak = false;
      for (var k = 0; k < targets.length; k++) {
        var fi = targets[k], foe = foes[fi];
        if (fi < 0 || foe.hp <= 0) continue;
        var sd = Math.round((sp.power + magOf(p)) * (0.85 + Math.random() * 0.3) * chainMult());
        if (qs.elapsed <= 2) sd = Math.round(sd * 1.3);
        var weak = sp.elem && window.WEAK && window.WEAK[foe.base] === sp.elem;
        if (weak) { sd = Math.round(sd * 1.5); anyWeak = true; bpop("ばつぐん！", "weak", $("penemy-" + fi)); }
        hitEnemy(fi, sd, false, fxc, true);
        lines.push(foe.name + "に " + sd);
      }
      // one message listing each target's damage
      await say(lines.join("\n") + " のダメージ！" + (anyWeak ? "\n弱点を つらぬいた！" : ""));
      for (var d2 = 0; d2 < targets.length; d2++) { if (foes[targets[d2]] && foes[targets[d2]].hp <= 0) await say(foes[targets[d2]].name + "を たおした！"); }
      if (aliveFoes().length) { var bossF = foes.filter(function (f) { return f.boss && f.hp > 0; })[0]; if (bossF && bossF.phases) await checkPhase(bossF); }
    }
  }
  function defOf2(f) { return f.def; }

  async function checkFoeDown(i) {
    var f = foes[i];
    if (f.hp > 0) { if (f.boss && f.phases) await checkPhase(f); return; }
    await say(f.name + "を たおした！");
  }
  async function checkPhase(f) {
    var ratio = f.hp / f.maxhp;
    var next = f.phases[f.phase + 1];
    if (next && ratio <= next.at) {
      f.phase++;
      screenEl.classList.remove("phase-flash");
      void screenEl.offsetWidth;
      screenEl.classList.add("phase-flash");
      sfx("boss");
      for (var i = 0; i < next.msg.length; i++) await say(next.msg[i]);
    }
  }

  // ================= enemy actions =================
  function magDmg(f, m, mult, guard) {
    var base = (f.mag || Math.round(f.atk * 0.9)) * mult;
    return Math.max(1, Math.round((base + rnd(6)) * (guard ? 0.6 : 1)));
  }
  async function execFoeAction(fi) {
    var f = foes[fi];
    if (f.hp <= 0) return;
    var el = $("penemy-" + fi);
    if (el) { el.classList.add("lunge"); setTimeout(function () { el.classList.remove("lunge"); }, 400); }
    var phase = f.boss ? f.phases[f.phase] : null;

    // resolve a charged mega attack (magic casters unleash a big spell instead of a body blow)
    if (f.charging) {
      f.charging = false;
      if (f.magicCharge) {
        await say(f.name + "の ためた魔力が はじけた！！\n" + (f.chargeCry || "強大な魔法が 炸裂する！"));
        sfx("ng");
      } else {
        await say(f.name + "の ためていた力が 解き放たれた！！");
      }
      var cl = [];
      for (var i = 0; i < party.length; i++) {
        var mm = party[i]; if (mm.hp <= 0) continue;
        // magic charge scales off mag and ignores defence (like other spells); guard still softens it
        var dm = f.magicCharge
          ? Math.max(1, Math.round(((f.mag || Math.round(f.atk * 0.9)) * 1.25 + rnd(8)) * (mm.guard ? 0.45 : 1)))
          : Math.max(1, Math.round((f.atk * 1.5 - defOf(mm) / 2 + rnd(8)) * (mm.guard ? 0.45 : 1)));
        hitMember(i, dm);
        cl.push(mm.name + "に " + dm);
      }
      await say(cl.join("\n") + " のダメージ！");
      return;
    }
    // boss charge windup
    if (phase && phase.charge && Math.random() < phase.charge) {
      f.charging = true;
      await say(f.magicCharge
        ? f.name + "は 魔力を ためはじめた…！\n（強力な魔法が くる！防御を！）"
        : f.name + "は 力をためはじめた…！\n（防御でしのげ！）");
      return;
    }

    var acts = phase ? phase.acts : 1;
    var struck = {}; // spread multi-hits: prefer members not already hit this turn
    function pickLiving(living) {
      var fresh = living.filter(function (i) { return !struck[i]; });
      var pool = fresh.length ? fresh : living;
      var idx = pool[rnd(pool.length)];
      struck[idx] = true;
      return idx;
    }
    for (var n = 0; n < acts; n++) {
      var living = [];
      party.forEach(function (m, i) { if (m.hp > 0) living.push(i); });
      if (!living.length) return;

      // enemy spell / breath (from skills table) or boss AoE
      var useSkill = f.skills && f.skills.length && Math.random() < (f.skillRate || 0.4);
      var bossAoe = phase && phase.aoe && Math.random() < phase.aoe;
      if (bossAoe && (!f.skills || Math.random() < 0.5)) {
        await say(f.name + "は「" + (f.aoeCry || "静まれ") + "！」と" + (f.aoeVerb || "叫んだ") + "！\n言葉の嵐が吹き荒れる！");
        var al = [];
        for (var j = 0; j < living.length; j++) {
          var mi = living[j], mm2 = party[mi];
          var ad = Math.max(1, Math.round((f.atk * 0.8 - defOf(mm2) / 2 + rnd(6)) * (mm2.guard ? 0.5 : 1)));
          hitMember(mi, ad);
          al.push(mm2.name + "に " + ad);
        }
        await say(al.join("\n") + " のダメージ！");
        continue;
      }
      if (useSkill) {
        var sk = f.skills[rnd(f.skills.length)];
        await say(f.name + "は『" + sk.name + "』を放った！");
        sfx("ng");
        if (sk.all) {
          var sl = [];
          for (var a2 = 0; a2 < living.length; a2++) {
            var mi2 = living[a2], mt = party[mi2];
            var sd2 = magDmg(f, mt, sk.power, mt.guard);
            hitMember(mi2, sd2);
            sl.push(mt.name + "に " + sd2);
          }
          await say(sl.join("\n") + " のダメージ！");
          for (var dz = 0; dz < living.length; dz++) { if (party[living[dz]].hp <= 0) await say(party[living[dz]].name + "は 倒れてしまった！"); }
        } else {
          var ti2 = pickLiving(living), tg = party[ti2];
          var d2 = magDmg(f, tg, sk.power, tg.guard);
          hitMember(ti2, d2);
          await say(tg.name + "に " + d2 + " のダメージ！");
          if (tg.hp <= 0) await say(tg.name + "は 倒れてしまった！");
        }
        continue;
      }

      // plain attack
      var ti = pickLiving(living);
      var t = party[ti];
      var dmg = Math.max(1, Math.round((f.atk - defOf(t) / 2 + rnd(6)) * (t.guard ? 0.5 : 1)));
      hitMember(ti, dmg);
      await say(f.name + "の こうげき！\n" + t.name + "に " + dmg + " のダメージ！" + (t.guard ? "（防御で半減）" : ""));
      if (t.hp <= 0) await say(t.name + "は 倒れてしまった！");
    }
  }

  // ================= main loop =================
  async function start(encounter) {
    party = window.PBATTLE.getParty();
    foes = encounter.enemies.map(function (e) {
      var f = Object.assign({ phase: 0, charging: false, maxhp: e.hp }, e);
      if (window.WQ2_EASY) { // やさしいモード: 敵の攻撃とHPを控えめに
        f.atk = Math.round(f.atk * 0.72);
        f.hp = Math.round(f.hp * 0.78); f.maxhp = f.hp;
        if (f.mag) f.mag = Math.round(f.mag * 0.72);
      }
      return f;
    });
    // base difficulty of normal attacks this battle (spells set their own)
    battleQuizLv = encounter.quizLv || (foes[0] ? foes[0].lv : 500);
    chain = 0;
    screenEl = $("pbattle-screen");
    screenEl.style.display = "block";
    var bgEl = $("pbattle-bg");
    if (encounter.bg) {
      var bgSrc = (window.BG_ART && window.BG_ART[encounter.bg]) || "../assets/bg/" + encounter.bg + ".png";
      bgEl.style.backgroundImage = "url('" + bgSrc + "')";
    } else bgEl.style.backgroundImage = "";

    renderEnemies(); renderParty(-1); chainBadge();

    var isBoss = anyBoss();
    if (window.BGM) {
      BGM.stop();
      setTimeout(function () {
        if (screenEl.style.display === "none") return;
        if (encounter.bgm) BGM.playAny([encounter.bgm, "boss", "midboss"]); // missing files fall through
        else if (isBoss) BGM.playAny(["midboss", "boss"]);
        else BGM.playAny(Math.random() < 0.5 ? ["battle", "battle2"] : ["battle2", "battle"]);
      }, 1000);
    }
    sfx(isBoss ? "boss" : "encounter");
    await say(foes.map(function (f) { return f.name; }).join("と ") + "が あらわれた！");
    if (encounter.intro) for (var ii = 0; ii < encounter.intro.length; ii++) await say(encounter.intro[ii]);

    var result = null;
    while (!result) {
      party.forEach(function (p) { p.guard = false; });
      renderParty(-1);

      var cmd = await pickCommands();

      // flee attempt (party level)
      if (cmd.flee) {
        if (isBoss) { await say("ボスからは 逃げられない！"); continue; }
        var pAgi = aliveMembers().reduce(function (s, m) { return s + m.agi; }, 0) / Math.max(1, aliveMembers().length);
        var fAgi = aliveFoes().reduce(function (s, f) { return s + f.agi; }, 0) / Math.max(1, aliveFoes().length);
        if (Math.random() < clamp(0.5 + (pAgi - fAgi) * 0.015, 0.4, 0.62)) {
          await say("うまく 逃げ切った！");
          result = "flee"; break;
        } else {
          await say("しかし 逃げ切れなかった！");
          // enemies still act this turn
          var foeq = [];
          foes.forEach(function (f, i) { if (f.hp > 0) foeq.push(i); });
          for (var fq = 0; fq < foeq.length; fq++) {
            await execFoeAction(foeq[fq]);
            if (!aliveMembers().length) { result = "lose"; break; }
          }
          continue;
        }
      }

      var acts = cmd.acts;
      var queue = acts.map(function (a) { return { m: true, a: a, agi: party[a.who].agi + rnd(8) }; });
      foes.forEach(function (f, i) { if (f.hp > 0) queue.push({ m: false, fi: i, agi: f.agi + rnd(8) }); });
      queue.sort(function (x, y) { return y.agi - x.agi; });

      for (var qi = 0; qi < queue.length; qi++) {
        var q = queue[qi];
        if (q.m) await execMemberAction(q.a);
        else await execFoeAction(q.fi);
        if (firstAliveFoe() < 0) { result = "win"; break; }
        if (!aliveMembers().length) { result = "lose"; break; }
      }
    }

    var totalExp = 0;
    if (result === "win") {
      if (window.BGM) BGM.stop();
      victoryJingle(); // 専用ファンファーレ victory.mp3（無ければ win.mp3 にフォールバック）
      await say("たたかいに 勝った！");
      totalExp = foes.reduce(function (s, f) { return s + (f.exp || 0); }, 0);
      if (totalExp > 0) {
        await say("パーティは " + totalExp + " の 経験値を得た！");
        // each surviving member earns the full exp, DQ-style
        for (var pi = 0; pi < party.length; pi++) {
          var m = party[pi];
          if (m.hp <= 0) continue;
          var res = gainExp(m, totalExp);
          for (var u = 0; u < res.ups.length; u++) {
            sfx("level");
            await say(m.name + "は レベル " + res.ups[u].lv + " に上がった！");
            if (res.ups[u].learned.length) {
              await say(m.name + "は 魔法『" + res.ups[u].learned.join("』『") + "』を おぼえた！");
            }
          }
        }
      }
    } else if (result === "lose") {
      if (window.BGM) { BGM.stop(); BGM.playAny(["gameover"]); } // 全滅曲（無ければ無音）
      await say("全滅してしまった…");
    }
    screenEl.style.display = "none";
    return { result: result, exp: totalExp };
  }

  // ================= public API =================
  window.PBATTLE = {
    start: start,
    _party: null,
    makeMember: makeMember,
    resetParty: function () {
      var yu = makeMember("yu", 1);
      yu.bag = ["herb", "herb", "herb", "elixir", "wing"];
      window.PBATTLE._party = [yu];
      return window.PBATTLE._party;
    },
    demoParty: function (lv) {
      lv = lv || 6;
      window.PBATTLE._party = ["yu", "gai", "rina", "mia"].map(function (id) {
        var m = makeMember(id, lv);
        m.bag = ["herb", "herb", "elixir"];
        return m;
      });
      return window.PBATTLE._party;
    },
    getParty: function () { return window.PBATTLE._party || window.PBATTLE.resetParty(); },
    setParty: function (p) { window.PBATTLE._party = p; },
    hasMember: function (id) { return (window.PBATTLE._party || []).some(function (m) { return m.id === id; }); },
    addMember: function (id, lv) {
      var p = window.PBATTLE.getParty();
      if (p.some(function (m) { return m.id === id; })) return null;
      var m = makeMember(id, lv || 1);
      p.push(m);
      return m;
    },
    getItems: function () { return items; },
    setItems: function (o) { items = o; },
    // ---- gauntlet helpers ----
    fullHeal: function () { (window.PBATTLE._party || []).forEach(function (m) { m.hp = m.maxhp; m.mp = m.maxmp; }); },
    levelEveryone: function (n) {
      var msgs = [];
      (window.PBATTLE._party || []).forEach(function (m) {
        for (var i = 0; i < (n || 1) && m.lv < 50; i++) {
          var need = (EXP_FOR[m.lv + 1] || 0) - m.exp + 1;
          var res = gainExp(m, Math.max(1, need));
          res.ups.forEach(function (u) { msgs.push({ name: m.name, lv: u.lv, learned: u.learned }); });
        }
      });
      return msgs;
    },
    giveItemToParty: function (key) {
      var p = window.PBATTLE._party || [];
      for (var i = 0; i < p.length; i++) { if (p[i].bag.length < 8) { p[i].bag.push(key); return p[i].name; } }
      return null;
    },
    // exp remaining to the member's next level (0 if maxed)
    expToNext: function (m) { return m.lv >= 50 ? 0 : Math.max(0, (EXP_FOR[m.lv + 1] || 0) - m.exp); },
    // learned spells with descriptions, for the inspect command
    spellInfo: function (m) { return (m.spellIds || []).map(function (sid) { return { name: SPELLS[sid].name, mp: SPELLS[sid].mp, desc: SPELLS[sid].desc }; }); },
    SPELLS: SPELLS,
    pressA: function () { var t = INPUT.top(); if (t && t.onA) t.onA(); },
    pressB: function () { var t = INPUT.top(); if (t && t.onB) t.onB(); },
    pressDir: function (d) { var t = INPUT.top(); if (t && t.onDir) t.onDir(d === "left" ? "up" : d === "right" ? "down" : d); }
  };
})();
