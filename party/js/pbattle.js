// WORD QUEST II - party battle engine (prototype)
// PBATTLE.start(encounter) -> Promise<{result:"win"|"lose"|"flee"}>
// encounter: { enemies: [{base, name, lv, hp, atk, def, agi, boss, phases}], bg, bgm }
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // ---------- tiny SFX (file-based, ../assets/sfx) ----------
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

  // ---------- minimal input + UI (say/menu), tap & keyboard ----------
  var INPUT = { stack: [] };
  INPUT.top = function () { return this.stack[this.stack.length - 1] || null; };
  window.addEventListener("keydown", function (e) {
    var t = INPUT.top(); if (!t) return;
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") { if (t.onDir) t.onDir("up"); }
    else if (e.key === "ArrowDown" || e.key === "ArrowRight") { if (t.onDir) t.onDir("down"); }
    else if (e.key === "Enter" || e.key === " " || e.key === "z") { if (t.onA) t.onA(); }
    else if (e.key === "Escape" || e.key === "x") { if (t.onB) t.onB(); }
  });

  function say(text, el) {
    el = el || $("pbattle-msg");
    return new Promise(function (resolve) {
      el.style.display = "block";
      el.innerHTML = '<span class="body"></span><span class="arrow">▼</span>';
      var body = el.querySelector(".body");
      var i = 0, typing = true;
      var iv = setInterval(function () {
        if (i >= text.length) { clearInterval(iv); typing = false; return; }
        body.textContent = text.slice(0, ++i);
      }, 18);
      INPUT.stack.push({ onA: adv, onB: adv });
      el.onpointerdown = function (e) { e.preventDefault(); adv(); };
      function adv() {
        if (typing) { clearInterval(iv); body.textContent = text; typing = false; return; }
        INPUT.stack.pop();
        el.onpointerdown = null;
        el.style.display = "none";
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
        if (items[sel] && items[sel].onSel) items[sel].onSel();
      }
      function close(v) {
        INPUT.stack.pop();
        el.style.display = "none";
        if (typeof onCloseSel === "function") onCloseSel();
        resolve(v);
      }
      var onCloseSel = items.clearSel;
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

  // ---------- party definition (prototype fixed party) ----------
  function makeParty() {
    return [
      { id: "yu",  name: "ユウ", role: "ゆうしゃ", hp: 130, maxhp: 130, mp: 30, maxmp: 30, atk: 44, def: 30, agi: 30,
        lvOff: 0, spells: [{ id: "fire", name: "ファイア", mp: 5, type: "atk", power: 42, elem: "fire" },
                           { id: "heal", name: "ヒール", mp: 5, type: "heal", power: 40 }] },
      { id: "gai", name: "ガイ", role: "せんし", hp: 170, maxhp: 170, mp: 12, maxmp: 12, atk: 58, def: 40, agi: 20,
        lvOff: -100, spells: [{ id: "smash", name: "かいしんぎり", mp: 6, type: "atk", power: 70, phys: true }] },
      { id: "rina", name: "リナ", role: "まほうつかい", hp: 85, maxhp: 85, mp: 62, maxmp: 62, atk: 20, def: 22, agi: 26,
        lvOff: 100, spells: [{ id: "fira", name: "ファイラ", mp: 6, type: "atk", power: 55, elem: "fire" },
                             { id: "thunder", name: "サンダー", mp: 9, type: "atk", power: 38, elem: "thunder", all: true }] },
      { id: "mia", name: "ミア", role: "そうりょ", hp: 100, maxhp: 100, mp: 58, maxmp: 58, atk: 24, def: 26, agi: 28,
        lvOff: 0, spells: [{ id: "heal2", name: "ヒール", mp: 4, type: "heal", power: 48 },
                           { id: "healall", name: "いやしのは", mp: 10, type: "heal", power: 26, all: true },
                           { id: "raise", name: "リカバー", mp: 12, type: "raise", power: 60 }] }
    ];
  }

  var items = { herb: 4, elixir: 2 };

  // ---------- rendering ----------
  var party, foes, chain, screenEl;

  function quizLvFor(member, foe) {
    var lv = (foe ? foe.lv : 500) + member.lvOff;
    return Math.max(400, Math.min(900, lv));
  }

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
      var w = f.boss ? 46 : Math.max(24, 40 - foes.length * 4);
      d.style.width = w + "%";
      d.innerHTML =
        '<div class="ptag">' + f.name + "（TOEIC" + f.lv + "）</div>" +
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
        '<div class="pname">' + p.name + '<span class="prole">' + p.role + "</span></div>" +
        '<div class="phv">ＨＰ <b>' + Math.max(0, p.hp) + "</b>/" + p.maxhp + "</div>" +
        '<div class="pmv">ＭＰ ' + p.mp + "/" + p.maxmp + "</div>" +
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
  function chainMult() { return 1 + Math.min((chain - 1) * 0.15, 0.6); }

  function bpop(text, cls, anchorEl) {
    var d = document.createElement("div");
    d.className = "battle-pop " + (cls || "");
    d.textContent = text;
    var r = anchorEl ? anchorEl.getBoundingClientRect() : null;
    var s = screenEl.getBoundingClientRect();
    if (r) {
      d.style.left = (r.left - s.left + r.width * 0.3 + rnd(20)) + "px";
      d.style.top = (r.top - s.top + r.height * 0.35) + "px";
    } else { d.style.left = "40%"; }
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

  // ---------- damage helpers ----------
  function hitEnemy(i, dmg, crit, fxColor) {
    var f = foes[i], el = $("penemy-" + i);
    f.hp = Math.max(0, f.hp - dmg);
    if (el) { el.classList.add("hit"); setTimeout(function () { el.classList.remove("hit"); }, 200); }
    slashFx(fxColor);
    bpop(String(dmg), crit ? "crit" : "", el);
    sfx(crit ? "crit" : "slash");
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

  // ---------- command phase ----------
  async function pickCommands() {
    var acts = [];
    var i = 0;
    while (i < party.length) {
      var p = party[i];
      if (p.hp <= 0) { i++; continue; }
      renderParty(i);
      var c = await menu($("pbattle-cmd"), [
        { label: "こうげき" }, { label: "じゅもん", disabled: !p.spells.length },
        { label: "ぼうぎょ" }, { label: "どうぐ" }
      ], p.name + "　ＨＰ" + p.hp);
      if (c === -1) { // back to previous member
        while (i > 0) { i--; acts.pop(); if (party[i].hp > 0) break; }
        continue;
      }
      if (c === 0) {
        var t = await pickTarget();
        if (t === -1) continue;
        acts.push({ who: i, kind: "atk", target: t });
      } else if (c === 1) {
        var opts = p.spells.map(function (s) {
          return { label: s.name + "　MP" + s.mp, disabled: p.mp < s.mp };
        });
        var si = await menu($("pbattle-sub"), opts, "じゅもん");
        if (si === -1) continue;
        var sp = p.spells[si];
        var tgt = -1;
        if (sp.type === "atk" && !sp.all) { tgt = await pickTarget(); if (tgt === -1) continue; }
        if (sp.type === "heal" && !sp.all) { tgt = await pickAlly(false); if (tgt === -1) continue; }
        if (sp.type === "raise") { tgt = await pickAlly(true); if (tgt === -1) continue; }
        acts.push({ who: i, kind: "spell", spell: sp, target: tgt });
      } else if (c === 2) {
        acts.push({ who: i, kind: "guard" });
      } else {
        var inv = [];
        if (items.herb > 0) inv.push({ key: "herb", label: "ハーブティー ×" + items.herb });
        if (items.elixir > 0) inv.push({ key: "elixir", label: "エナジーコーヒー ×" + items.elixir });
        if (!inv.length) { await say("つかえる どうぐが ない！"); continue; }
        var ii = await menu($("pbattle-sub"), inv, "どうぐ");
        if (ii === -1) continue;
        var at = await pickAlly(false);
        if (at === -1) continue;
        acts.push({ who: i, kind: "item", item: inv[ii].key, target: at });
      }
      i++;
    }
    renderParty(-1);
    return acts;
  }

  function pickTarget() {
    var alive = [];
    foes.forEach(function (f, i) { if (f.hp > 0) alive.push(i); });
    if (alive.length === 1) return Promise.resolve(alive[0]);
    var opts = alive.map(function (i) {
      return { label: foes[i].name, fi: i };
    });
    return menu($("pbattle-sub"), opts, "どの敵？").then(function (v) {
      clearTargets();
      return v === -1 ? -1 : opts[v].fi;
    });
  }
  function clearTargets() {
    document.querySelectorAll(".penemy.target").forEach(function (n) { n.classList.remove("target"); });
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

  // ---------- action execution ----------
  async function execMemberAction(a) {
    var p = party[a.who];
    if (p.hp <= 0) return;
    if (a.kind === "guard") {
      p.guard = true;
      renderParty(-1);
      await say(p.name + "は みをまもっている。");
      return;
    }
    if (a.kind === "item") {
      var t = party[a.target];
      if (a.item === "herb") { items.herb--; t.hp = Math.min(t.maxhp, t.hp + 40); await say(p.name + "は ハーブティーを つかった！\n" + t.name + "のＨＰが 40 かいふく！"); }
      else { items.elixir--; t.mp = Math.min(t.maxmp, t.mp + 30); await say(p.name + "は エナジーコーヒーを つかった！\n" + t.name + "のＭＰが 30 かいふく！"); }
      sfx("heal");
      renderParty(-1);
      return;
    }
    if (a.kind === "atk") {
      var ti = foes[a.target] && foes[a.target].hp > 0 ? a.target : firstAliveFoe();
      if (ti < 0) return;
      var f = foes[ti];
      await say(p.name + "の こうげき！");
      var q = await window.QUIZ.ask(quizLvFor(p, f), { time: f.hasty ? 3.5 : 5 });
      if (q.correct) {
        chain++;
        chainBadge();
        var crit = q.elapsed <= 2;
        var dmg = Math.max(1, Math.round((p.atk - f.def / 2 + rnd(6)) * chainMult()));
        if (crit) dmg *= 2;
        if (f.base === "metal" && !crit) dmg = 1;
        hitEnemy(ti, dmg, crit);
        if (crit) await say("かいしんの いちげき！！\n" + f.name + "に " + dmg + " のダメージ！");
        else await say(f.name + "に " + dmg + " のダメージ！" + (chain >= 2 ? "（チェイン×" + chain + "）" : ""));
        await checkFoeDown(ti);
      } else {
        chain = 0; chainBadge();
        await say(p.name + "の こうげきは からぶり！\n（チェインが とぎれた）");
      }
      return;
    }
    if (a.kind === "spell") {
      var sp = a.spell;
      if (p.mp < sp.mp) { await say("ＭＰが たりない！"); return; }
      p.mp -= sp.mp;
      renderParty(-1);
      await say(p.name + "は『" + sp.name + "』を となえた！");
      var lvRef = sp.type === "atk" ? (foes[firstAliveFoe()] || { lv: 500 }) : null;
      var qs = await window.QUIZ.ask(quizLvFor(p, lvRef || aliveFoes()[0]), { time: 5, noCrit: true });
      if (!qs.correct) {
        chain = 0; chainBadge();
        await say("じゅもんは ふはつに おわった…！\n（チェインが とぎれた）");
        return;
      }
      chain++; chainBadge();
      if (sp.type === "heal") {
        sfx("heal");
        if (sp.all) {
          aliveMembers().forEach(function (m) { m.hp = Math.min(m.maxhp, m.hp + sp.power); });
          renderParty(-1);
          await say("やさしい ひかりが ふりそそぐ！\nみんなのＨＰが " + sp.power + " かいふく！");
        } else {
          var tm = party[a.target];
          tm.hp = Math.min(tm.maxhp, tm.hp + sp.power);
          renderParty(-1);
          await say(tm.name + "のＨＰが " + sp.power + " かいふくした！");
        }
        return;
      }
      if (sp.type === "raise") {
        var rm = party[a.target];
        if (rm.hp > 0) { await say("しかし なにも おこらなかった。"); return; }
        rm.hp = Math.min(rm.maxhp, sp.power);
        sfx("heal");
        renderParty(-1);
        await say(rm.name + "が たちあがった！");
        return;
      }
      // attack spell
      var fxc = sp.elem === "fire" ? "rgba(255,150,60,.9)" : sp.elem === "thunder" ? "rgba(255,230,90,.9)" : "rgba(200,160,255,.9)";
      var targets = sp.all ? foes.map(function (f, i) { return i; }).filter(function (i) { return foes[i].hp > 0; })
                           : [foes[a.target] && foes[a.target].hp > 0 ? a.target : firstAliveFoe()];
      for (var k = 0; k < targets.length; k++) {
        var fi = targets[k], foe = foes[fi];
        if (fi < 0 || foe.hp <= 0) continue;
        var sd = Math.round(sp.power * (0.85 + Math.random() * 0.3) * chainMult());
        if (qs.elapsed <= 2) sd = Math.round(sd * 1.3);
        var weak = sp.elem && window.WEAK && window.WEAK[foe.base] === sp.elem;
        if (weak) { sd = Math.round(sd * 1.5); bpop("じゃくてん！", "weak", $("penemy-" + fi)); }
        hitEnemy(fi, sd, false, fxc);
        await say(foe.name + "に " + sd + " のダメージ！" + (weak ? "\nじゃくてんを ついた！" : ""));
        await checkFoeDown(fi);
        if (firstAliveFoe() < 0) break;
      }
    }
  }

  async function checkFoeDown(i) {
    var f = foes[i];
    if (f.hp > 0) {
      if (f.boss && f.phases) await checkPhase(f);
      return;
    }
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

  // ---------- enemy turn ----------
  async function execFoeAction(fi) {
    var f = foes[fi];
    if (f.hp <= 0) return;
    var el = $("penemy-" + fi);
    if (el) { el.classList.add("lunge"); setTimeout(function () { el.classList.remove("lunge"); }, 400); }

    var phase = f.boss ? f.phases[f.phase] : null;

    // charged mega attack resolves first
    if (f.charging) {
      f.charging = false;
      await say(f.name + "の ためていた ちからが\nかいほうされた！！");
      for (var i = 0; i < party.length; i++) {
        var m = party[i];
        if (m.hp <= 0) continue;
        var dm = Math.max(1, Math.round((f.atk * 1.5 - m.def / 2 + rnd(8)) * (m.guard ? 0.45 : 1)));
        hitMember(i, dm);
      }
      await say("すさまじい しょうげきが\nパーティ全体を おそう！");
      return;
    }

    // boss may start charging in late phases
    if (phase && phase.charge && Math.random() < phase.charge) {
      f.charging = true;
      await say(f.name + "は ちからを ためはじめた…！\n（ぼうぎょで しのげ！）");
      return;
    }

    var acts = phase ? phase.acts : 1;
    for (var n = 0; n < acts; n++) {
      var living = [];
      party.forEach(function (m, i) { if (m.hp > 0) living.push(i); });
      if (!living.length) return;
      // AoE breath sometimes in phase 2+
      if (phase && phase.aoe && Math.random() < phase.aoe) {
        await say(f.name + "は 「しずまれ！」と\nさけんだ！　ことばの あらしだ！");
        for (var j = 0; j < living.length; j++) {
          var mi = living[j], mm = party[mi];
          var ad = Math.max(1, Math.round((f.atk * 0.8 - mm.def / 2 + rnd(6)) * (mm.guard ? 0.5 : 1)));
          hitMember(mi, ad);
        }
        await say("パーティ全体が ダメージを うけた！");
        continue;
      }
      var ti = living[rnd(living.length)];
      var t = party[ti];
      var dmg = Math.max(1, Math.round((f.atk - t.def / 2 + rnd(6)) * (t.guard ? 0.5 : 1)));
      hitMember(ti, dmg);
      await say(f.name + "の こうげき！\n" + t.name + "は " + dmg + " のダメージ！" + (t.guard ? "（ぼうぎょで はんげん）" : ""));
      if (t.hp <= 0) await say(t.name + "は たおれてしまった！");
    }
  }

  // ---------- main loop ----------
  async function start(encounter) {
    party = window.PBATTLE._party || (window.PBATTLE._party = makeParty());
    // fresh copies of foes
    foes = encounter.enemies.map(function (e) {
      return Object.assign({ phase: 0, charging: false, maxhp: e.hp }, e);
    });
    chain = 0;
    screenEl = $("pbattle-screen");
    screenEl.style.display = "block";
    var bgEl = $("pbattle-bg");
    if (encounter.bg) {
      var bgSrc = (window.BG_ART && window.BG_ART[encounter.bg]) || "../assets/bg/" + encounter.bg + ".png";
      bgEl.style.backgroundImage = "url('" + bgSrc + "')";
    } else bgEl.style.backgroundImage = "";

    renderEnemies();
    renderParty(-1);
    chainBadge();

    var isBoss = foes.some(function (f) { return f.boss; });
    if (window.BGM) {
      BGM.stop();
      setTimeout(function () {
        if (screenEl.style.display === "none") return;
        if (isBoss) BGM.playAny(["midboss", "boss"]);
        else BGM.playAny(Math.random() < 0.5 ? ["battle", "battle2"] : ["battle2", "battle"]);
      }, 1200);
    }
    sfx(isBoss ? "boss" : "encounter");
    await say(foes.map(function (f) { return f.name; }).join("と ") + "が あらわれた！");
    if (encounter.intro) for (var i = 0; i < encounter.intro.length; i++) await say(encounter.intro[i]);

    var result = null;
    while (!result) {
      party.forEach(function (p) { p.guard = false; });
      renderParty(-1);

      var acts = await pickCommands();

      // build turn order: members + foes by agility
      var queue = acts.map(function (a) { return { m: true, a: a, agi: party[a.who].agi + rnd(8) }; });
      foes.forEach(function (f, i) {
        if (f.hp > 0) queue.push({ m: false, fi: i, agi: f.agi + rnd(8) });
      });
      queue.sort(function (x, y) { return y.agi - x.agi; });

      for (var qi = 0; qi < queue.length; qi++) {
        var q = queue[qi];
        if (q.m) await execMemberAction(q.a);
        else await execFoeAction(q.fi);
        if (firstAliveFoe() < 0) { result = "win"; break; }
        if (!aliveMembers().length) { result = "lose"; break; }
      }
    }

    if (result === "win") {
      if (window.BGM) BGM.stop();
      sfx("win");
      await say("たたかいに かった！");
      var exp = foes.reduce(function (s, f) { return s + (f.exp || 0); }, 0);
      if (exp) await say("けいけんち " + exp + " を みんなで わけあった！");
    } else {
      if (window.BGM) BGM.stop();
      await say("ぜんめつ してしまった…");
    }
    screenEl.style.display = "none";
    return { result: result };
  }

  window.PBATTLE = { start: start, resetParty: function () { window.PBATTLE._party = null; items = { herb: 4, elixir: 2 }; } };
})();
