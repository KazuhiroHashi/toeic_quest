// WORD WIZ - battle engine
// WBATTLE.start(quest, team) -> Promise<{win:boolean}>
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function rndi(n) { return (Math.random() * n) | 0; }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = rndi(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  var B = null; // battle state

  // ---------- vocab helpers ----------
  var POS_LABEL = { n: "名詞", v: "動詞", adj: "形容詞", adv: "副詞", phr: "熟語" };
  function pickQuestion(level) {
    var pool = window.VOCAB[level] || window.VOCAB[400];
    var entry = pool[rndi(pool.length)];
    var used = {}; used[entry.m] = true;
    var same = pool.filter(function (e) { return e.p === entry.p && e.w !== entry.w; });
    var src = same.length >= 8 ? same : pool.filter(function (e) { return e.w !== entry.w; });
    var wrong = [];
    var guard = 0;
    while (wrong.length < 3 && guard++ < 300) {
      var c = src[rndi(src.length)];
      if (!used[c.m]) { used[c.m] = true; wrong.push(c.m); }
    }
    var choices = shuffle(wrong.concat([entry.m]));
    return { entry: entry, choices: choices, level: level };
  }

  // ---------- fx ----------
  function fxRect(el) {
    var host = $("scr-battle").getBoundingClientRect();
    var r = el.getBoundingClientRect();
    return { x: r.left - host.left + r.width / 2, y: r.top - host.top + r.height / 2 };
  }
  function dmgPop(el, text, cls) {
    var p = fxRect(el);
    var d = document.createElement("div");
    d.className = "dmg-pop " + (cls || "");
    d.textContent = text;
    d.style.left = (p.x - 30 + rndi(24)) + "px";
    d.style.top = (p.y - 30) + "px";
    d.style.color = cls ? "" : "#fff";
    $("fx-layer").appendChild(d);
    setTimeout(function () { d.remove(); }, 950);
  }
  function gradePop(text, color) {
    var g = document.createElement("div");
    g.className = "grade-pop";
    g.textContent = text;
    g.style.color = color;
    $("fx-layer").appendChild(g);
    setTimeout(function () { g.remove(); }, 750);
  }
  function orb(fromEl, toEl, color) {
    return new Promise(function (res) {
      var a = fxRect(fromEl), b = fxRect(toEl);
      var o = document.createElement("div");
      o.className = "orb";
      o.style.color = color;
      o.style.left = (a.x - 11) + "px";
      o.style.top = (a.y - 11) + "px";
      o.style.transition = "transform .32s cubic-bezier(.3,.1,.6,1)";
      $("fx-layer").appendChild(o);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          o.style.transform = "translate(" + (b.x - a.x) + "px," + (b.y - a.y) + "px) scale(1.25)";
        });
      });
      setTimeout(function () { o.remove(); res(); }, 330);
    });
  }
  function cutin(text) {
    var c = $("cutin");
    c.textContent = text;
    c.style.display = "block";
    c.style.animation = "none";
    void c.offsetWidth;
    c.style.animation = "";
    setTimeout(function () { c.style.display = "none"; }, 900);
  }
  function showMsg(text) {
    return new Promise(function (res) {
      var m = $("b-msg");
      m.innerHTML = text;
      m.classList.add("on");
      $("panel-zone").classList.remove("on");
      $("quiz-zone").classList.remove("on");
      var done = function () { m.classList.remove("on"); m.onpointerdown = null; res(); };
      m.onpointerdown = done;
      setTimeout(done, 2000);
    });
  }

  // ---------- rendering ----------
  function renderFoes() {
    var z = $("enemy-zone");
    z.innerHTML = "";
    B.foes.forEach(function (f, i) {
      var d = document.createElement("div");
      d.className = "foe" + (B.foes.length >= 3 ? " small" : "") + (i === B.target ? " target" : "") + (f.hp <= 0 ? " dead" : "");
      d.id = "foe" + i;
      d.innerHTML =
        '<div class="fcount' + (f.count <= 1 ? " hot" : "") + '">' + f.count + "</div>" +
        '<div class="fart">' + window.CardArt.svg(f.def, { enemy: true, boss: f.def.boss }) + "</div>" +
        '<div class="fhp"><div style="width:' + Math.max(0, 100 * f.hp / f.maxhp) + '%"></div></div>' +
        '<div class="fname">' + window.ELEMS[f.def.elem].icon + " " + f.def.name + "</div>";
      d.onpointerdown = function () {
        if (f.hp > 0) { B.target = i; renderFoes(); }
      };
      z.appendChild(d);
    });
    $("b-wave").textContent = "WAVE " + (B.wave + 1) + " / " + B.quest.waves.length;
  }
  function renderTeam() {
    $("team-hp-bar").firstElementChild.style.width = Math.max(0, 100 * B.hp / B.maxHp) + "%";
    $("team-hp-num").textContent = B.hp + " / " + B.maxHp;
    var cb = $("chain-badge");
    cb.querySelector(".cnum").textContent = B.chain;
    B.team.forEach(function (m, i) {
      var el = $("bcard" + i);
      var pct = Math.min(100, 100 * m.charge / m.ssNeed);
      el.querySelector(".ss-fill").style.height = pct + "%";
      el.classList.toggle("ss-ready", m.charge >= m.ssNeed);
    });
  }
  function bumpChain() {
    var cb = $("chain-badge");
    cb.classList.remove("bump");
    void cb.offsetWidth;
    cb.classList.add("bump");
  }

  function aliveFoes() { return B.foes.filter(function (f) { return f.hp > 0; }); }
  function targetFoe() {
    if (B.foes[B.target] && B.foes[B.target].hp > 0) return B.foes[B.target];
    for (var i = 0; i < B.foes.length; i++) if (B.foes[i].hp > 0) { B.target = i; return B.foes[i]; }
    return null;
  }

  // ---------- damage ----------
  async function hitFoe(foe, idx, dmg, crit) {
    foe.hp = Math.max(0, foe.hp - dmg);
    var el = $("foe" + idx);
    if (el) {
      el.classList.add("hurt");
      setTimeout(function () { el && el.classList.remove("hurt"); }, 550);
      dmgPop(el, (crit ? "" : "") + dmg, crit ? "crit" : "");
    }
    window.WSFX && WSFX.play(crit ? "crit" : "hit");
    if (foe.hp <= 0 && el) {
      el.classList.add("dead");
      window.WSFX && WSFX.play("die");
    }
  }

  async function cardAttack(memberIdx, foe, foeIdx, mult, gradeExcellent, critBonus) {
    var m = B.team[memberIdx];
    var cardEl = $("bcard" + memberIdx);
    cardEl.classList.add("attacking");
    setTimeout(function () { cardEl.classList.remove("attacking"); }, 360);
    var eMult = window.elemMult(m.card.elem, foe.def.elem);
    var dmg = m.stat.atk * eMult * mult * (1 + B.chain * 0.05);
    // answer skills
    if (m.card.as === "speed" && gradeExcellent) dmg *= 1.4;
    if (m.card.as === "chain" && B.chain >= 5) dmg *= 1.5;
    if (m.card.as === "slayer" && eMult > 1) dmg *= 1.3;
    if (B.buff.atkUp) dmg *= 1.8;
    var critP = critBonus + (m.card.as === "crit" ? 0.12 : 0);
    var crit = Math.random() < critP;
    if (crit) dmg *= 2;
    dmg = Math.max(1, Math.round(dmg * (0.92 + Math.random() * 0.16)));
    await orb(cardEl, $("foe" + foeIdx), window.ELEMS[m.card.elem].c1);
    await hitFoe(foe, foeIdx, dmg, crit);
    if (eMult > 1) dmgPop($("foe" + foeIdx), "弱点!", "crit");
  }

  // ---------- quiz phase ----------
  function askQuiz(level) {
    return new Promise(function (resolve) {
      var q = pickQuestion(level);
      var extra = B.buff.time > 0 ? 3 : 0;
      var timeMs = (5 + extra) * 1000;
      if (B.buff.time > 0) B.buff.time--;
      $("q-word").textContent = q.entry.w;
      $("q-meta").textContent = "TOEIC " + q.level + "【" + (POS_LABEL[q.entry.p] || "?") + "】" + (extra ? "　⏳+3秒" : "");
      var zone = $("q-choices");
      zone.innerHTML = "";
      var done = false, t0 = performance.now(), raf = 0;
      var bar = $("q-timer").firstElementChild;
      bar.style.transform = "scaleX(1)";
      var btns = q.choices.map(function (mm, i) {
        var b = document.createElement("button");
        b.className = "qc";
        b.textContent = mm;
        b.onpointerdown = function (e) { e.preventDefault(); answer(i); };
        zone.appendChild(b);
        return b;
      });
      $("panel-zone").classList.remove("on");
      $("quiz-zone").classList.add("on");

      function tick(now) {
        var left = 1 - (now - t0) / timeMs;
        if (left <= 0) { finish(false, timeMs / 1000, true); return; }
        bar.style.transform = "scaleX(" + left + ")";
        raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);

      function answer(i) {
        if (done) return;
        var ok = q.choices[i] === q.entry.m;
        if (!ok) btns[i].classList.add("ng");
        finish(ok, (performance.now() - t0) / 1000, false);
      }
      function finish(ok, elapsed, timeout) {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        btns.forEach(function (b, i) { if (q.choices[i] === q.entry.m) b.classList.add("ok"); });
        recordStudy(q.entry, ok);
        setTimeout(function () {
          $("quiz-zone").classList.remove("on");
          resolve({ ok: ok, elapsed: elapsed, timeout: timeout, entry: q.entry });
        }, ok ? 500 : 1200);
        if (!ok) {
          $("q-meta").textContent = "正解: " + q.entry.w + " ＝ " + q.entry.m;
          $("q-meta").style.color = "#ff8fa3";
          setTimeout(function () { $("q-meta").style.color = ""; }, 1300);
        }
      }
    });
  }
  function recordStudy(entry, ok) {
    var st = window.WSTATE;
    if (!st) return;
    st.study = st.study || { answered: 0, correct: 0 };
    st.study.answered++;
    if (ok) st.study.correct++;
  }

  // ---------- panels ----------
  function buildPanels() {
    var L = B.quest.level;
    var down = B.buff.lvdown > 0 ? 100 : 0;
    if (B.buff.lvdown > 0) B.buff.lvdown--;
    var deckElems = [];
    B.team.forEach(function (m) { if (deckElems.indexOf(m.card.elem) < 0) deckElems.push(m.card.elem); });
    var all = Object.keys(window.ELEMS);
    function pickColors(n) {
      var pool = shuffle(deckElems);
      while (pool.length < n) {
        var e = all[rndi(all.length)];
        if (pool.indexOf(e) < 0) pool.push(e);
      }
      return pool.slice(0, n);
    }
    function clampLv(x) { return Math.max(400, Math.min(900, x)); }
    return [
      { colors: pickColors(1), level: clampLv(L - 100 - down), crit: 0.05, tag: "かんたん" },
      { colors: pickColors(2), level: clampLv(L - down), crit: 0.12, tag: "ふつう" },
      { colors: pickColors(3), level: clampLv(L + 100 - down), crit: 0.30, tag: "むずかしい" }
    ];
  }

  function showPanels() {
    return new Promise(function (resolve) {
      var panels = buildPanels();
      var z = $("panel-zone");
      z.innerHTML = '<div class="panel-hint">パネルを選ぼう（高レベル＝多くの精霊が攻撃＆クリティカル率UP）</div>';
      panels.forEach(function (p, i) {
        var attackers = B.team.filter(function (m) { return p.colors.indexOf(m.card.elem) >= 0; }).length;
        var btn = document.createElement("button");
        btn.className = "qpanel" + (i === 2 ? " hard" : "");
        btn.innerHTML =
          '<div class="pcolors">' + p.colors.map(function (c) {
            return '<div class="pdot" style="background:linear-gradient(180deg,' + window.ELEMS[c].c2 + "," + window.ELEMS[c].c1 + ')"></div>';
          }).join("") + "</div>" +
          '<div class="plv">TOEIC ' + p.level + '</div>' +
          '<div class="pdesc">' + p.tag + "・攻撃 " + attackers + "体<br>クリ率" + Math.round(p.crit * 100) + "%</div>";
        btn.onpointerdown = function (e) { e.preventDefault(); z.classList.remove("on"); resolve(p); };
        z.appendChild(btn);
      });
      z.classList.add("on");
      renderTeam();
    });
  }

  // ---------- special skills ----------
  async function fireSS(i) {
    var m = B.team[i];
    if (m.charge < m.ssNeed) return;
    m.charge = 0;
    var ss = window.SS_DEFS[m.card.ss];
    window.WSFX && WSFX.play("ss");
    cutin(m.card.name + "「" + ss.name + "」");
    await wait(750);
    var foe = targetFoe();
    if (m.card.ss === "nuke" && foe) {
      var idx = B.foes.indexOf(foe);
      var eM = window.elemMult(m.card.elem, foe.def.elem);
      var dmg = Math.round(m.stat.atk * 3.5 * eM * (1 + B.chain * 0.05));
      await orb($("bcard" + i), $("foe" + idx), window.ELEMS[m.card.elem].c1);
      await hitFoe(foe, idx, dmg, true);
    } else if (m.card.ss === "aoe") {
      for (var fi = 0; fi < B.foes.length; fi++) {
        var f = B.foes[fi];
        if (f.hp <= 0) continue;
        var d2 = Math.round(m.stat.atk * 2.2 * window.elemMult(m.card.elem, f.def.elem) * (1 + B.chain * 0.05));
        await orb($("bcard" + i), $("foe" + fi), window.ELEMS[m.card.elem].c1);
        await hitFoe(f, fi, d2, false);
      }
    } else if (m.card.ss === "heal30") {
      B.hp = Math.min(B.maxHp, B.hp + Math.round(B.maxHp * 0.3));
      dmgPop($("team-hp-bar"), "+" + Math.round(B.maxHp * 0.3), "heal");
      window.WSFX && WSFX.play("heal");
    } else if (m.card.ss === "time3") {
      B.buff.time = 3;
    } else if (m.card.ss === "lvdown") {
      B.buff.lvdown = 3;
    } else if (m.card.ss === "chain5") {
      B.chain += 5; bumpChain();
    } else if (m.card.ss === "shield") {
      B.buff.shield = 1;
    } else if (m.card.ss === "buff") {
      B.buff.atkUpNext = true;
    }
    renderTeam();
    renderFoes();
    await checkWaveClear();
  }

  // ---------- enemy turn ----------
  async function enemyTurn() {
    var guards = B.team.filter(function (m) { return m.card.as === "guard"; }).length;
    for (var i = 0; i < B.foes.length; i++) {
      var f = B.foes[i];
      if (f.hp <= 0) continue;
      f.count--;
      if (f.count <= 0) {
        f.count = f.def.count;
        var dmg = Math.round(f.atk * (0.9 + Math.random() * 0.2));
        dmg = Math.round(dmg * Math.pow(0.85, guards));
        if (B.buff.shield) { dmg = Math.round(dmg * 0.2); B.buff.shield = 0; dmgPop($("team-hp-bar"), "GUARD!", "heal"); }
        B.hp = Math.max(0, B.hp - dmg);
        var scr = $("scr-battle");
        scr.classList.add("bshake", "flashred");
        window.WSFX && WSFX.play("edmg");
        dmgPop($("team-hp-bar"), "-" + dmg, "");
        setTimeout(function () { scr.classList.remove("bshake", "flashred"); }, 500);
        await wait(450);
      }
    }
    renderFoes();
    renderTeam();
  }

  // ---------- waves ----------
  function loadWave() {
    var defs = B.quest.waves[B.wave];
    B.foes = defs.map(function (d) {
      var base = window.WENEMY_BY_ID[d.id];
      return {
        def: base,
        hp: Math.round(base.hp * d.scale), maxhp: Math.round(base.hp * d.scale),
        atk: Math.round(base.atk * (1 + (d.scale - 1) * 0.55)),
        count: base.count
      };
    });
    B.target = 0;
    renderFoes();
  }
  async function checkWaveClear() {
    if (aliveFoes().length) return false;
    if (B.wave < B.quest.waves.length - 1) {
      B.wave++;
      await showMsg("WAVE CLEAR！　つぎの敵が現れた…");
      loadWave();
      return false;
    }
    B.over = "win";
    return true;
  }

  // ---------- main flow ----------
  async function start(quest, team) {
    B = {
      quest: quest,
      team: team.map(function (t) {
        return { card: t.card, stat: t.stat, charge: 0, ssNeed: window.SS_DEFS[t.card.ss].need };
      }),
      wave: 0, chain: 0, target: 0,
      buff: { time: 0, lvdown: 0, shield: 0, atkUpNext: false, atkUp: false },
      over: null
    };
    B.maxHp = B.team.reduce(function (a, m) { return a + m.stat.hp; }, 0);
    B.hp = B.maxHp;

    // deck row
    var dz = $("b-deck");
    dz.innerHTML = "";
    B.team.forEach(function (m, i) {
      var d = document.createElement("div");
      d.className = "bcard";
      d.id = "bcard" + i;
      d.innerHTML = '<div class="bart">' + window.CardArt.svg(m.card, { evo: m.evo }) + '</div><div class="ss-fill" style="height:0"></div><div class="ss-ring"></div>';
      d.onpointerdown = function () {
        if (B.team[i].charge >= B.team[i].ssNeed && !B.busy && $("panel-zone").classList.contains("on")) fireSS(i);
      };
      dz.appendChild(d);
    });
    $("b-quest-lv").textContent = quest.name + "　TOEIC" + quest.level;
    loadWave();
    renderTeam();
    await showMsg(quest.chName + "<br><b>" + quest.name + "</b>");

    while (!B.over) {
      var panel = await showPanels();
      B.busy = true;
      var q = await askQuiz(panel.level);
      if (q.ok) {
        var grade = q.elapsed <= 2 ? "EXCELLENT!" : q.elapsed <= 3.5 ? "GREAT!" : "GOOD";
        var gm = q.elapsed <= 2 ? 1.3 : q.elapsed <= 3.5 ? 1.15 : 1;
        gradePop(grade, q.elapsed <= 2 ? "#ffd54a" : q.elapsed <= 3.5 ? "#7ec8ff" : "#eef1ff");
        window.WSFX && WSFX.play(q.elapsed <= 2 ? "ex" : "ok");
        B.chain++;
        bumpChain();
        B.buff.atkUp = B.buff.atkUpNext;
        B.buff.atkUpNext = false;
        // charge SS
        B.team.forEach(function (m) { m.charge = Math.min(m.ssNeed, m.charge + 1); });
        // healers
        var healers = B.team.filter(function (m) { return m.card.as === "heal"; }).length;
        if (healers) {
          B.hp = Math.min(B.maxHp, B.hp + Math.round(B.maxHp * 0.02 * healers));
        }
        // attacks
        var excellent = q.elapsed <= 2;
        for (var i = 0; i < B.team.length; i++) {
          if (panel.colors.indexOf(B.team[i].card.elem) < 0) continue;
          var foe = targetFoe();
          if (!foe) break;
          await cardAttack(i, foe, B.foes.indexOf(foe), gm, excellent, panel.crit);
          await wait(90);
        }
        B.buff.atkUp = false;
        renderFoes();
        renderTeam();
        if (await checkWaveClear()) break;
      } else {
        B.chain = 0;
        gradePop(q.timeout ? "TIME UP…" : "MISS…", "#ff6b6b");
        window.WSFX && WSFX.play("miss");
        await wait(600);
      }
      await enemyTurn();
      if (B.hp <= 0) { B.over = "lose"; break; }
      B.busy = false;
    }
    await wait(500);
    return { win: B.over === "win" };
  }

  window.WBATTLE = { start: start };
})();
