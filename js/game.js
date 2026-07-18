// TOEIC QUEST - main engine (field, UI, events, save)
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function rnd(n) { return (Math.random() * n) | 0; }

  // =================== SFX (WebAudio, no files) ===================
  var actx = null;
  function beep(freq, dur, type, vol, slide) {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(freq, actx.currentTime);
      if (slide) o.frequency.linearRampToValueAtTime(slide, actx.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.06, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(); o.stop(actx.currentTime + dur);
    } catch (e) {}
  }
  // uploaded files (assets/sfx/<name>.mp3) replace synth beeps automatically
  var sfxFiles = {};
  function sfxFile(name) {
    var f = sfxFiles[name];
    if (f === "no") return false;
    if (f) { var c = f.cloneNode(); c.volume = 0.5; c.play().catch(function () {}); return true; }
    var a = new Audio();
    a.preload = "auto";
    a.oncanplaythrough = function () { a.oncanplaythrough = null; sfxFiles[name] = a; };
    a.onerror = function () { sfxFiles[name] = "no"; };
    a.src = (window.SFX_ART && window.SFX_ART[name]) || "assets/sfx/" + name + ".mp3";
    return false; // beep this once; file takes over when cached
  }
  window.SFX = {
    duration: function (name) {
      var f = sfxFiles[name];
      return (f && f !== "no" && f.duration && isFinite(f.duration)) ? f.duration : 1.2;
    },
    play: function (name) {
      if (sfxFile(name)) return;
      switch (name) {
        case "ok": beep(880, 0.12, "square"); beep(1320, 0.15, "square"); break;
        case "crit": beep(660, 0.08, "square"); beep(990, 0.1, "square"); beep(1560, 0.2, "square"); break;
        case "ng": beep(200, 0.3, "sawtooth", 0.05, 90); break;
        case "slash": beep(500, 0.08, "sawtooth", 0.05, 200); break;
        case "hit": beep(140, 0.22, "sawtooth", 0.07, 60); break;
        case "heal": beep(700, 0.12, "sine", 0.06, 1100); break;
        case "level": [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { beep(f, 0.16, "square"); }, i * 110); }); break;
        case "win": [784, 988, 1175].forEach(function (f, i) { setTimeout(function () { beep(f, 0.14, "square"); }, i * 100); }); break;
        case "encounter": beep(220, 0.15, "sawtooth", 0.06, 440); break;
        case "boss": beep(110, 0.5, "sawtooth", 0.08, 55); break;
        case "chest": beep(587, 0.1, "square"); setTimeout(function () { beep(880, 0.18, "square"); }, 110); break;
        case "stairs": beep(400, 0.12, "triangle", 0.06, 250); break;
        case "cursor": beep(1100, 0.04, "square", 0.03); break;
      }
    }
  };

  // =================== INPUT ===================
  var INPUT = window.INPUT = {
    held: { up: false, down: false, left: false, right: false },
    stack: [],
    push: function (c) { this.stack.push(c); },
    pop: function () { this.stack.pop(); },
    top: function () { return this.stack[this.stack.length - 1] || null; },
    uiActive: function () { return this.stack.length > 0; },
    pressA: function () { var t = this.top(); if (t && t.onA) t.onA(); else fieldA(); },
    pressB: function () { var t = this.top(); if (t && t.onB) t.onB(); else fieldB(); },
    pressDir: function (d) { var t = this.top(); if (t && t.onDir) t.onDir(d); }
  };

  var KEYMAP = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
  window.addEventListener("keydown", function (e) {
    if (e.repeat) { if (KEYMAP[e.key]) e.preventDefault(); return; }
    var d = KEYMAP[e.key];
    if (d) { e.preventDefault(); INPUT.held[d] = true; INPUT.pressDir(d); }
    else if (e.key === "Enter" || e.key === " " || e.key === "z") INPUT.pressA();
    else if (e.key === "Escape" || e.key === "x") INPUT.pressB();
  });
  window.addEventListener("keyup", function (e) {
    var d = KEYMAP[e.key];
    if (d) INPUT.held[d] = false;
  });

  function bindHold(id, dir) {
    var el = $(id);
    function down(e) { e.preventDefault(); INPUT.held[dir] = true; INPUT.pressDir(dir); }
    function up(e) { e.preventDefault(); INPUT.held[dir] = false; }
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", up);
  }

  // =================== UI: message & menu ===================
  var UI = window.UI = {};

  UI.say = function (text, el) {
    el = el || $("msg-win");
    return new Promise(function (resolve) {
      el.style.display = "block";
      el.innerHTML = '<span class="body"></span><span class="arrow">▼</span>';
      var body = el.querySelector(".body");
      var i = 0, typing = true;
      var iv = setInterval(function () {
        if (i >= text.length) { clearInterval(iv); typing = false; return; }
        body.textContent = text.slice(0, ++i);
      }, 24);
      INPUT.push({
        onA: adv, onB: adv,
        onDir: function () {}
      });
      el.onpointerdown = function (e) { e.preventDefault(); adv(); };
      function adv() {
        if (typing) { clearInterval(iv); body.textContent = text; typing = false; return; }
        INPUT.pop();
        el.onpointerdown = null;
        el.style.display = "none";
        resolve();
      }
    });
  };

  UI.menu = function (el, items, title) {
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
      function close(v) {
        INPUT.pop();
        el.style.display = "none";
        resolve(v);
      }
      INPUT.push({
        onA: function () { if (!items[sel].disabled) { SFX.play("cursor"); close(sel); } },
        onB: function () { close(-1); },
        onDir: function (d) {
          if (d === "up" || d === "left") sel = (sel + items.length - 1) % items.length;
          else if (d === "down" || d === "right") sel = (sel + 1) % items.length;
          SFX.play("cursor");
          render();
        }
      });
      el.style.display = "block";
      render();
    });
  };

  function fade(on) {
    var f = $("fade-layer");
    f.classList.toggle("on", on);
    return wait(380);
  }

  // =================== GAME STATE ===================
  var SAVE_KEY = "tq_save_v1";
  var G = null;

  function newGame() {
    var t = window.LEVEL_TABLE[0];
    window.G = G = {
      player: {
        lv: 1, exp: 0, gold: 30,
        maxhp: t.maxhp, hp: t.maxhp, maxmp: t.maxmp, mp: t.maxmp,
        str: t.str, vit: t.vit,
        weapon: 0, armor: 0,
        items: { herb: 2, wing: 0, elixir: 0, key: 0 },
        spells: []
      },
      pos: { map: "castle", x: 9, y: 4, dir: "up" },
      flags: {},
      chests: {},
      combo: 0,
      study: { missed: {}, answered: 0, correct: 0, words: {} }
    };
  }

  function saveGame() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) {}
  }
  function loadGame() {
    try {
      var s = localStorage.getItem(SAVE_KEY);
      if (!s) return false;
      window.G = G = JSON.parse(s);
      return true;
    } catch (e) { return false; }
  }
  function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }

  function curMap() { return window.MAPS[G.pos.map]; }
  function mapTrack(m) {
    if (m.kind === "world") return "field";
    if (m.kind === "dungeon") return m.id === "maou" ? "boss" : "dungeon";
    return "town";
  }
  function playMapBgm() { if (window.BGM) BGM.play(mapTrack(curMap())); }
  function tileAt(m, x, y) {
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return "=";
    return m.rows[y][x];
  }
  function eventAt(m, x, y) {
    for (var i = 0; i < (m.events || []).length; i++) {
      var ev = m.events[i];
      if (ev.x === x && ev.y === y) return ev;
    }
    return null;
  }

  var SOLID = { w: 1, m: 1, "=": 1 };
  function isBlocked(m, x, y) {
    var t = tileAt(m, x, y);
    if (SOLID[t]) return true;
    var ev = eventAt(m, x, y);
    if (ev && ev.type === "npc") return true;
    if (ev && ev.type === "boss" && !G.flags[ev.flag]) return true;
    return false;
  }

  // =================== ZONES / ENCOUNTERS ===================
  var CASTLE_POS = { x: 7, y: 7 };
  function zoneAt(m, x, y) {
    if (m.id !== "world") return m.zone || 0;
    var dx = x - CASTLE_POS.x, dy = y - CASTLE_POS.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < 9) return 1;
    if (d < 18) return 2;
    if (d < 25) return 3;
    if (d < 31) return 4;
    if (d < 37) return 5;
    return 6;
  }
  function pickEnemy(zone) {
    var table = window.ZONE_TABLE[zone] || window.ZONE_TABLE[1];
    var total = 0;
    table.forEach(function (t) { total += t[1]; });
    var r = Math.random() * total;
    for (var i = 0; i < table.length; i++) {
      r -= table[i][1];
      if (r <= 0) return table[i][0];
    }
    return table[0][0];
  }
  var ENC_RATE = { ".": 0.06, t: 0.09, s: 0.08, "-": 0.08 };

  // =================== RENDERING ===================
  var TILE = 24, VW = 16, VH = 14;
  var canvas, ctx, dpr = 1;
  var anim = null; // {fx,fy,tx,ty,p}
  var tick = 0;

  function setupCanvas() {
    canvas = $("field-canvas");
    ctx = canvas.getContext("2d");
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = VW * TILE * dpr;
    canvas.height = VH * TILE * dpr;
    ctx.imageSmoothingEnabled = false;
  }

  var TILE_COLORS = {
    ".": ["#2f9e44", "#268a3a"], t: ["#2f9e44", "#14591f"], m: ["#7a5c33", "#5c421f"],
    w: ["#1b4fbf", "#1640a0"], s: ["#d9c06b", "#c4aa53"], b: ["#8a5a2b", "#6e4218"],
    "=": ["#8d8d99", "#6d6d7a"], ",": ["#d9cba3", "#c8b98d"], "-": ["#5a5a6e", "#4a4a5c"],
    "^": ["#d9cba3", "#333"], v: ["#5a5a6e", "#222"], c: ["#d9cba3", "#c8b98d"],
    C: ["#2f9e44", "#268a3a"], T: ["#2f9e44", "#268a3a"], D: ["#7a5c33", "#5c421f"],
    U: ["#2f9e44", "#268a3a"], X: ["#d9c06b", "#c4aa53"]
  };
  var GLYPH = { C: "🏰", T: "🏠", D: "🕳️", U: "🗼", X: "🚪" };

  function drawTile(m, x, y, px, py) {
    var t = tileAt(m, x, y);
    var c = TILE_COLORS[t] || TILE_COLORS["."];
    ctx.fillStyle = c[0];
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = c[1];
    if (t === "." || t === "C" || t === "T" || t === "U") {
      ctx.fillRect(px + 4, py + 6, 2, 2); ctx.fillRect(px + 16, py + 14, 2, 2); ctx.fillRect(px + 9, py + 19, 2, 2);
    } else if (t === "t") {
      ctx.beginPath(); ctx.moveTo(px + 12, py + 2); ctx.lineTo(px + 21, py + 20); ctx.lineTo(px + 3, py + 20); ctx.fill();
      ctx.fillStyle = "#3d2b14"; ctx.fillRect(px + 10, py + 18, 4, 5);
    } else if (t === "m" || t === "D") {
      ctx.beginPath(); ctx.moveTo(px + 12, py + 3); ctx.lineTo(px + 22, py + 21); ctx.lineTo(px + 2, py + 21); ctx.fill();
      ctx.fillStyle = "#a88b5c"; ctx.beginPath(); ctx.moveTo(px + 12, py + 3); ctx.lineTo(px + 16, py + 11); ctx.lineTo(px + 8, py + 11); ctx.fill();
    } else if (t === "w") {
      var off = (tick >> 4) % 2 ? 3 : 0;
      ctx.fillRect(px + 2 + off, py + 7, 8, 2); ctx.fillRect(px + 12 - off, py + 16, 8, 2);
    } else if (t === "s" || t === "X") {
      ctx.fillRect(px + 5, py + 8, 3, 2); ctx.fillRect(px + 14, py + 15, 3, 2);
    } else if (t === "b") {
      for (var i = 0; i < 4; i++) ctx.fillRect(px, py + 2 + i * 6, TILE, 2);
    } else if (t === "=") {
      ctx.fillRect(px, py + 7, TILE, 2); ctx.fillRect(px, py + 16, TILE, 2);
      ctx.fillRect(px + 8, py, 2, 7); ctx.fillRect(px + 16, py + 9, 2, 7); ctx.fillRect(px + 8, py + 18, 2, 6);
    } else if (t === "," || t === "-" || t === "c") {
      ctx.fillRect(px + 11, py + 11, 2, 2);
    } else if (t === "^" || t === "v") {
      ctx.fillRect(px + 4, py + 16, 16, 4); ctx.fillRect(px + 7, py + 10, 10, 4); ctx.fillRect(px + 10, py + 4, 4, 4);
    }
    if (GLYPH[t]) {
      ctx.font = "18px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(GLYPH[t], px + TILE / 2, py + TILE / 2 + 1);
    }
    // chest
    if (t === "c") {
      var ev = eventAt(m, x, y);
      var opened = ev && G.chests[ev.id];
      ctx.fillStyle = opened ? "#7a5a30" : "#a8742f";
      ctx.fillRect(px + 4, py + 8, 16, 12);
      ctx.fillStyle = opened ? "#4a3418" : "#ffd54a";
      ctx.fillRect(px + 4, py + 12, 16, 3);
      ctx.fillStyle = "#4a3418";
      ctx.fillRect(px + 4, py + 8, 16, 2);
    }
  }

  function drawEmoji(icon, px, py, size) {
    ctx.font = (size || 18) + "px serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(icon, px + TILE / 2, py + TILE / 2 + 1);
  }

  function draw() {
    if (!G) return;
    var m = curMap();
    var px = G.pos.x, py = G.pos.y;
    if (anim) {
      px = anim.fx + (anim.tx - anim.fx) * anim.p;
      py = anim.fy + (anim.ty - anim.fy) * anim.p;
    }
    var camx = Math.max(0, Math.min(m.w - VW, px - VW / 2 + 0.5));
    var camy = Math.max(0, Math.min(m.h - VH, py - VH / 2 + 0.5));
    if (m.w <= VW) camx = (m.w - VW) / 2;
    if (m.h <= VH) camy = (m.h - VH) / 2;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, VW * TILE, VH * TILE);

    var x0 = Math.floor(camx), y0 = Math.floor(camy);
    for (var y = y0; y <= y0 + VH; y++) {
      for (var x = x0; x <= x0 + VW; x++) {
        if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
        drawTile(m, x, y, Math.round((x - camx) * TILE), Math.round((y - camy) * TILE));
      }
    }
    // events (npc, boss)
    (m.events || []).forEach(function (ev) {
      if (ev.type === "npc" || (ev.type === "boss" && !G.flags[ev.flag])) {
        drawEmoji(ev.icon, Math.round((ev.x - camx) * TILE), Math.round((ev.y - camy) * TILE), ev.type === "boss" ? 20 : 18);
      }
    });
    // player
    var hx = Math.round((px - camx) * TILE), hy = Math.round((py - camy) * TILE);
    drawEmoji("🧝", hx, hy, 19);
    // facing indicator
    ctx.fillStyle = "rgba(255,255,255,.85)";
    var d = G.pos.dir;
    if (d === "up") ctx.fillRect(hx + 10, hy, 4, 3);
    else if (d === "down") ctx.fillRect(hx + 10, hy + 21, 4, 3);
    else if (d === "left") ctx.fillRect(hx, hy + 10, 3, 4);
    else ctx.fillRect(hx + 21, hy + 10, 3, 4);

    // darkness in dark dungeons
    if (m.dark) {
      var gx = hx + TILE / 2, gy = hy + TILE / 2;
      var grad = ctx.createRadialGradient(gx, gy, TILE * 2.2, gx, gy, TILE * 4.5);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.96)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VW * TILE, VH * TILE);
    }
    ctx.restore();

    // status
    var p = G.player;
    $("status-win").innerHTML =
      '<div class="name">' + m.name + "</div>" +
      "Lv" + p.lv + "　<span class='gold-text'>" + p.gold + "G</span><br>" +
      "ＨＰ " + p.hp + "/" + p.maxhp + "<br>ＭＰ " + p.mp + "/" + p.maxmp;
  }

  // =================== FIELD LOGIC ===================
  var moving = false, bumpLatch = false, busyEvent = false;

  function dirDelta(d) {
    return d === "up" ? [0, -1] : d === "down" ? [0, 1] : d === "left" ? [-1, 0] : [1, 0];
  }

  async function tryMove(d) {
    var m = curMap();
    G.pos.dir = d;
    var dd = dirDelta(d);
    var nx = G.pos.x + dd[0], ny = G.pos.y + dd[1];
    if (isBlocked(m, nx, ny)) {
      var ev = eventAt(m, nx, ny);
      if (ev && !bumpLatch && (ev.type === "npc" || (ev.type === "boss" && !G.flags[ev.flag]))) {
        bumpLatch = true;
        interactWith(ev);
      }
      return;
    }
    moving = true;
    anim = { fx: G.pos.x, fy: G.pos.y, tx: nx, ty: ny, p: 0 };
    await new Promise(function (res) {
      function step() {
        anim.p += 0.18;
        if (anim.p >= 1) { res(); return; }
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
    G.pos.x = nx; G.pos.y = ny;
    anim = null;
    moving = false;
    await stepEvents();
  }

  async function transferTo(map, x, y) {
    busyEvent = true;
    SFX.play("stairs");
    await fade(true);
    G.pos.map = map; G.pos.x = x; G.pos.y = y;
    saveGame();
    playMapBgm();
    await fade(false);
    busyEvent = false;
  }

  async function stepEvents() {
    var m = curMap();
    var t = tileAt(m, G.pos.x, G.pos.y);
    var ev = eventAt(m, G.pos.x, G.pos.y);

    if (ev) {
      if (ev.type === "enter") { await transferTo(ev.map, ev.tx, ev.ty); return; }
      if (ev.type === "stairs") { await transferTo(ev.map, ev.tx, ev.ty); return; }
      if (ev.type === "gate") {
        busyEvent = true;
        if (G.player.items.key) {
          await UI.say("『ことばのカギ』をつかった！\n扉が ゆっくりと ひらいていく…");
          busyEvent = false;
          await transferTo(ev.map, ev.tx, ev.ty);
        } else {
          await UI.say(ev.lockedMsg);
          busyEvent = false;
        }
        return;
      }
      if (ev.type === "chest" && !G.chests[ev.id]) {
        busyEvent = true;
        G.chests[ev.id] = true;
        SFX.play("chest");
        await openChest(ev.loot);
        saveGame();
        busyEvent = false;
        return;
      }
    }

    if ((t === "^" || t === "v") && m.exit && !(ev && ev.type === "stairs")) {
      await transferTo(m.exit.map, m.exit.x, m.exit.y);
      return;
    }

    // random encounter
    var rate = ENC_RATE[t];
    if (rate && (m.kind === "world" || m.kind === "dungeon") && Math.random() < rate) {
      var zone = zoneAt(m, G.pos.x, G.pos.y);
      await runBattle(pickEnemy(zone), false);
    }
  }

  async function openChest(loot) {
    if (loot.gold) {
      G.player.gold += loot.gold;
      await UI.say("たからばこを あけた！\n" + loot.gold + " ゴールドを てにいれた！");
    } else if (loot.item) {
      var n = loot.n || 1;
      G.player.items[loot.item] = (G.player.items[loot.item] || 0) + n;
      await UI.say("たからばこを あけた！\n『" + window.ITEM_DEFS[loot.item].name + "』を " + n + "こ てにいれた！");
    } else if (loot.weapon) {
      var wi = window.WEAPONS.findIndex(function (w) { return w.id === loot.weapon; });
      await UI.say("たからばこを あけた！\n『" + window.WEAPONS[wi].name + "』を てにいれた！");
      if (wi > G.player.weapon) { G.player.weapon = wi; await UI.say("さっそく そうびした！"); }
    } else if (loot.armor) {
      var ai = window.ARMORS.findIndex(function (a) { return a.id === loot.armor; });
      await UI.say("たからばこを あけた！\n『" + window.ARMORS[ai].name + "』を てにいれた！");
      if (ai > G.player.armor) { G.player.armor = ai; await UI.say("さっそく そうびした！"); }
    }
  }

  async function runBattle(enemyId, isEventBoss, bossEv) {
    busyEvent = true;
    var m = curMap();
    var bgKey = m.id === "world" ? "zone" + zoneAt(m, G.pos.x, G.pos.y) : m.id;
    var isBossFight = window.ENEMY_BY_ID[enemyId].traits.indexOf("boss") >= 0;
    // let the encounter sting finish before battle music starts
    if (window.BGM) {
      BGM.stop();
      var stingMs = Math.min(Math.max(SFX.duration(isBossFight ? "boss" : "encounter") * 1000 + 150, 900), 4000);
      setTimeout(function () {
        if ($("battle-screen").style.display === "none") return; // battle already over
        if (enemyId === "maou") BGM.playAny(["boss"]);
        else if (isBossFight) BGM.playAny(["midboss", "boss"]);
        else {
          // normal fights: dungeon variant in caves/towers, otherwise random pick
          var c = Math.random() < 0.5 ? ["battle", "battle2"] : ["battle2", "battle"];
          if (m.kind === "dungeon") c.unshift("battle_dungeon");
          BGM.playAny(c);
        }
      }, stingMs);
    }
    var r = await window.BATTLE.start(enemyId, { bg: bgKey });
    var maouWin = r.result === "win" && isEventBoss && bossEv && bossEv.enemy === "maou";
    if (!maouWin) playMapBgm(); // after maou, ending() handles music
    if (r.result === "lose") {
      await fade(true);
      G.player.gold = Math.floor(G.player.gold / 2);
      G.player.hp = G.player.maxhp;
      G.player.mp = G.player.maxmp;
      G.pos = { map: "castle", x: 9, y: 4, dir: "up" };
      await fade(false);
      await UI.say("気を おとすでない、ゆうしゃよ。\nしっぱいは 学びの もとじゃ。\n（しょじきんが はんぶんに なった）");
      saveGame();
    } else if (r.result === "win" && isEventBoss && bossEv) {
      G.flags[bossEv.flag] = true;
      if (bossEv.drops && bossEv.drops.item) {
        G.player.items[bossEv.drops.item] = (G.player.items[bossEv.drops.item] || 0) + 1;
      }
      for (var i = 0; i < (bossEv.after || []).length; i++) await UI.say(bossEv.after[i]);
      if (bossEv.enemy === "maou") await ending();
      saveGame();
    } else {
      saveGame();
    }
    await checkDaily();
    busyEvent = false;
  }

  async function ending() {
    if (window.BGM) { BGM.stop(); BGM.playAny(["ending", "title"]); }
    await fade(true); await fade(false);
    await UI.say("まおう ヴォキャブロスは\nことばにならない さけびをあげ\nくずれさった…！");
    await UI.say("うばわれていた《言葉の力》が\nレキシア大陸に もどっていく…。");
    await UI.say("草原に ことばが めばえ\n町に うたが あふれ\n人々は ふたたび かたりはじめた。");
    var st = G.study;
    var rate = st.answered ? Math.round(100 * st.correct / st.answered) : 0;
    await UI.say("― ぼうけんのきろく ―\nとうたつレベル： " + G.player.lv +
      "\nこたえた単語： " + st.answered + " 問\nせいかいりつ： " + rate + "％");
    await UI.say("だが、まなびの旅に\nおわりは ない。\n\n～ TOEIC QUEST ～\nTHANK YOU FOR PLAYING!");
    G.pos = { map: "castle", x: 9, y: 4, dir: "up" };
    G.player.hp = G.player.maxhp; G.player.mp = G.player.maxmp;
    saveGame();
    await fade(true);
    // back to the title screen (continue keeps the cleared save)
    location.reload();
  }

  // =================== DAILY MISSION & STREAK ===================
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function ensureDaily() {
    if (!G) return;
    if (!G.daily || G.daily.date !== todayStr()) {
      G.daily = { date: todayStr(), correct: 0, goal: 20, done: false };
    }
  }
  async function checkDaily() {
    ensureDaily();
    if (!G.daily.done && G.daily.correct >= G.daily.goal) {
      G.daily.done = true;
      G.player.gold += 150;
      SFX.play("level");
      await UI.say("デイリーミッション たっせい！\n本日 " + G.daily.goal + " 問 せいかい！\nほうびに 150ゴールドを てにいれた！");
      saveGame();
    }
  }
  async function streakCheck() {
    var t = todayStr();
    if (G.lastPlay === t) return;
    var y = new Date(); y.setDate(y.getDate() - 1);
    var ys = y.getFullYear() + "-" + (y.getMonth() + 1) + "-" + y.getDate();
    G.streakDays = (G.lastPlay === ys) ? (G.streakDays || 0) + 1 : 1;
    G.lastPlay = t;
    if (G.streakDays >= 2) {
      var bonus = Math.min(G.streakDays, 7) * 20;
      G.player.gold += bonus;
      await UI.say("れんぞくログイン " + G.streakDays + " 日目！\nボーナス " + bonus + "ゴールドを てにいれた！");
    }
    saveGame();
  }

  // =================== INTERACTIONS ===================
  async function interactWith(ev) {
    busyEvent = true;
    if (ev.type === "boss" && !G.flags[ev.flag]) {
      for (var i = 0; i < (ev.pre || []).length; i++) await UI.say(ev.pre[i]);
      busyEvent = false;
      await runBattle(ev.enemy, true, ev);
      return;
    }
    if (ev.type === "npc") {
      if (ev.king) await kingTalk();
      else if (ev.inn) await innTalk(ev);
      else if (ev.shop) await shopTalk(ev);
      else {
        for (var j = 0; j < ev.text.length; j++) await UI.say(ev.text[j]);
      }
    }
    busyEvent = false;
  }

  async function kingTalk() {
    if (G.flags.maou_down) {
      await UI.say("おお、ゆうしゃよ！\nよくぞ まおうを たおしてくれた！\nそなたこそ まことの英雄じゃ！");
      await UI.say("じゃが 学びの旅は つづく。\nこれからも 単語をきたえるのじゃぞ！");
    } else if (!G.flags.metKing) {
      G.flags.metKing = true;
      await UI.say("おお ゆうしゃよ、よくきた。\nまおう ヴォキャブロスが\n大陸の《言葉の力》を うばったのじゃ。");
      await UI.say("やつを たおせるのは\n『英単語のちから』で たたかえる\nそなただけ じゃ。");
      await UI.say("たたかいかたは かんたんじゃ。\nてきに こうげきするとき\n英単語の意味を ５秒いないに えらぶのじゃ。");
      await UI.say("まちがえたり まにあわなければ\nこうげきは からぶりとなり\nてきの はんげきを うける。きをつけよ。");
      await UI.say("まずは 城のそばの\n『スタディの村』で そうびを ととのえよ。\nそなたの ぶうんを いのる！");
    } else {
      await UI.say("ゆうしゃよ、たびの じゅんびは\nよいか。むりは するでないぞ。");
    }
    await UI.say("がくしゅうきろくを セーブした！");
    saveGame();
  }

  async function innTalk(ev) {
    var price = ev.inn.price;
    await UI.say("ここは やどや。\nひとばん " + price + "ゴールドですが\nおとまりに なりますか？");
    var c = await UI.menu($("cmd-win"), [{ label: "はい" }, { label: "いいえ" }], "やどや");
    if (c !== 0) { await UI.say("また どうぞ。"); return; }
    if (G.player.gold < price) { await UI.say("おかねが たりないようですね…。"); return; }
    G.player.gold -= price;
    await fade(true);
    G.player.hp = G.player.maxhp;
    G.player.mp = G.player.maxmp;
    SFX.play("heal");
    await wait(400);
    await fade(false);
    await UI.say("おはようございます！\nあたまも すっきり！\n（ＨＰ・ＭＰが かいふくした！）");
    saveGame();
    // NOTE: リリース版ではここがインタースティシャル広告の表示ポイント
  }

  async function shopTalk(ev) {
    if (ev.text && ev.text.length) await UI.say(ev.text[0]);
    while (true) {
      var goods = [];
      ev.shop.items.forEach(function (id) {
        if (ev.shop.kind === "weapon") {
          var wi = window.WEAPONS.findIndex(function (w) { return w.id === id; });
          if (wi >= 0) { goods.push({ kind: "weapon", idx: wi, label: window.WEAPONS[wi].name + "　" + window.WEAPONS[wi].price + "G" }); return; }
          var ai = window.ARMORS.findIndex(function (a) { return a.id === id; });
          if (ai >= 0) { goods.push({ kind: "armor", idx: ai, label: window.ARMORS[ai].name + "　" + window.ARMORS[ai].price + "G" }); }
        } else {
          var d = window.ITEM_DEFS[id];
          goods.push({ kind: "item", id: id, label: d.name + "　" + d.price + "G" });
        }
      });
      goods.push({ label: "やめる" });
      var gi = await UI.menu($("cmd-win"), goods, "（しょじきん " + G.player.gold + "G）");
      if (gi < 0 || gi === goods.length - 1) { await UI.say("まいどありがとう ございました！"); return; }
      var g = goods[gi];
      var price = g.kind === "weapon" ? window.WEAPONS[g.idx].price : g.kind === "armor" ? window.ARMORS[g.idx].price : window.ITEM_DEFS[g.id].price;
      if (G.player.gold < price) { await UI.say("おかねが たりないよ。"); continue; }
      if (g.kind === "weapon") {
        if (g.idx <= G.player.weapon) { await UI.say("いまの ぶきのほうが つよいよ。"); continue; }
        G.player.gold -= price; G.player.weapon = g.idx;
        await UI.say(window.WEAPONS[g.idx].name + "を こうにゅうし\nさっそく そうびした！");
      } else if (g.kind === "armor") {
        if (g.idx <= G.player.armor) { await UI.say("いまの ぼうぐのほうが つよいよ。"); continue; }
        G.player.gold -= price; G.player.armor = g.idx;
        await UI.say(window.ARMORS[g.idx].name + "を こうにゅうし\nさっそく そうびした！");
      } else {
        G.player.gold -= price;
        G.player.items[g.id] = (G.player.items[g.id] || 0) + 1;
        await UI.say(window.ITEM_DEFS[g.id].name + "を こうにゅうした！");
      }
      saveGame();
    }
  }

  window.onQuizCorrect = function () { ensureDaily(); G.daily.correct++; };

  // A button on field: talk to facing tile
  function fieldA() {
    if (busyEvent || moving || !G || screenMode !== "field") return;
    var m = curMap();
    var dd = dirDelta(G.pos.dir);
    var ev = eventAt(m, G.pos.x + dd[0], G.pos.y + dd[1]);
    if (ev && (ev.type === "npc" || (ev.type === "boss" && !G.flags[ev.flag]))) interactWith(ev);
  }

  // B button on field: menu
  async function fieldB() {
    if (busyEvent || moving || !G || screenMode !== "field") return;
    busyEvent = true;
    var bgmOn = window.BGM ? BGM.isEnabled() : false;
    var c = await UI.menu($("cmd-win"), [
      { label: "つよさ" }, { label: "どうぐ" }, { label: "じゅもん" },
      { label: "たんごちょう" }, { label: "セーブ" },
      { label: "ＢＧＭ：" + (bgmOn ? "ＯＮ" : "ＯＦＦ") }, { label: "とじる" }
    ], "メニュー");
    if (c === 5) {
      if (window.BGM) BGM.setEnabled(!bgmOn);
      await UI.say("ＢＧＭを " + (!bgmOn ? "ＯＮ" : "ＯＦＦ") + " にした。");
      busyEvent = false;
      return;
    }
    if (c === 0) {
      var p = G.player, T = window.LEVEL_TABLE;
      var next = p.lv < T.length ? (T[p.lv].exp - p.exp) : 0;
      await UI.say(
        "レベル： " + p.lv + "　　けいけんち： " + p.exp +
        "\nつぎのレベルまで： " + next +
        "\nこうげき： " + (p.str + window.WEAPONS[p.weapon].atk) + "（" + window.WEAPONS[p.weapon].name + "）" +
        "\nしゅび： " + (p.vit + window.ARMORS[p.armor].def) + "（" + window.ARMORS[p.armor].name + "）" +
        "\nしょじきん： " + p.gold + "G" +
        "\n\nデイリー： " + (G.daily ? Math.min(G.daily.correct, G.daily.goal) : 0) + "／" + (G.daily ? G.daily.goal : 20) + " 問せいかい" +
        (G.daily && G.daily.done ? "（たっせい！）" : "") +
        "\nれんぞくログイン： " + (G.streakDays || 1) + " 日"
      );
    } else if (c === 1) {
      await fieldItems();
    } else if (c === 2) {
      await fieldSpells();
    } else if (c === 3) {
      await openZukan();
    } else if (c === 4) {
      saveGame();
      await UI.say("がくしゅうきろくを セーブした！");
    }
    busyEvent = false;
  }

  async function fieldItems() {
    var inv = [];
    if (G.player.items.herb > 0) inv.push({ key: "herb", label: "ハーブティー ×" + G.player.items.herb });
    if (G.player.items.elixir > 0) inv.push({ key: "elixir", label: "エナジーコーヒー ×" + G.player.items.elixir });
    if (G.player.items.wing > 0) inv.push({ key: "wing", label: "ワープの羽根ペン ×" + G.player.items.wing });
    if (G.player.items.key > 0) inv.push({ key: "key", label: "ことばのカギ" });
    if (!inv.length) { await UI.say("なにも もっていない。"); return; }
    var i = await UI.menu($("cmd-win"), inv, "どうぐ");
    if (i < 0) return;
    var k = inv[i].key;
    if (k === "herb") {
      G.player.items.herb--;
      G.player.hp = Math.min(G.player.maxhp, G.player.hp + 30);
      SFX.play("heal");
      await UI.say("ハーブティーを のんだ！\nＨＰが 30 かいふくした。");
    } else if (k === "elixir") {
      G.player.items.elixir--;
      G.player.mp = Math.min(G.player.maxmp, G.player.mp + 40);
      SFX.play("heal");
      await UI.say("エナジーコーヒーを のんだ！\nＭＰが 40 かいふくした。");
    } else if (k === "wing") {
      G.player.items.wing--;
      await UI.say("ワープの羽根ペンを つかった！");
      await transferTo("castle", 9, 4);
    } else {
      await UI.say("魔王城の とびらを ひらく カギだ。");
    }
  }

  async function fieldSpells() {
    var learned = window.SPELLS.filter(function (s) { return G.player.spells.indexOf(s.id) >= 0 && s.type !== "attack"; });
    if (!learned.length) { await UI.say("いま つかえる じゅもんは ない。"); return; }
    var items = learned.map(function (s) { return { label: s.name + "　MP" + s.mp, disabled: G.player.mp < s.mp }; });
    var i = await UI.menu($("cmd-win"), items, "じゅもん");
    if (i < 0) return;
    var s = learned[i];
    if (G.player.mp < s.mp) return;
    G.player.mp -= s.mp;
    if (s.type === "field") {
      await UI.say("『リターン』！");
      await transferTo("castle", 9, 4);
      return;
    }
    await UI.say("『" + s.name + "』！\n（TOEIC" + s.quizLv + " の単語に こたえよ！）");
    var q = await window.QUIZ.ask(s.quizLv, { time: 5 });
    if (q.correct) {
      G.player.hp = Math.min(G.player.maxhp, G.player.hp + s.power);
      SFX.play("heal");
      await UI.say("ＨＰが " + s.power + " かいふくした！");
    } else {
      await UI.say("じゅもんは ふはつに おわった…！");
    }
  }

  async function wordBook() {
    var st = G.study;
    var rate = st.answered ? Math.round(100 * st.correct / st.answered) : 0;
    var words = Object.keys(st.missed)
      .map(function (w) { return { w: w, r: st.missed[w] }; })
      .filter(function (e) { return e.r.wrong > 0; })
      .sort(function (a, b) { return b.r.wrong - a.r.wrong; });
    await UI.say("― たんごちょう ―\nこたえた単語： " + st.answered + " 問\nせいかいりつ： " + rate + "％\nにがて単語： " + words.length + " 語");
    for (var i = 0; i < Math.min(words.length, 20); i += 5) {
      var page = words.slice(i, i + 5).map(function (e) {
        return e.w + " ＝ " + e.r.m + "（×" + e.r.wrong + "）";
      }).join("\n");
      await UI.say(page);
    }
    if (words.length) await UI.say("にがて単語は 戦闘で\nでやすくなっているぞ。\nくりかえして おぼえよう！");
  }

  // =================== WORD ENCYCLOPEDIA (zukan) ===================
  var zukanBand = 400;
  function starOf(r) {
    if (!r || !r.c) return "none";
    if (r.g) return "gold";
    if (r.f) return "silver";
    return "bronze";
  }
  function renderZukan() {
    var words = (G.study && G.study.words) || {};
    var tabs = $("zukan-tabs");
    tabs.innerHTML = "";
    [400, 500, 600, 700, 800, 900].forEach(function (b) {
      var t = document.createElement("div");
      t.className = "ztab" + (b === zukanBand ? " on" : "");
      t.textContent = b;
      t.onpointerdown = function (e) { e.preventDefault(); zukanBand = b; renderZukan(); };
      tabs.appendChild(t);
    });
    var pool = (window.VOCAB[zukanBand] || []).slice().sort(function (a, b) { return a.w < b.w ? -1 : 1; });
    var nB = 0, nS = 0, nG = 0, weakN = 0;
    var rows = pool.map(function (e) {
      var r = words[e.w];
      var st = starOf(r);
      if (st !== "none") nB++;
      if (st === "silver" || st === "gold") nS++;
      if (st === "gold") nG++;
      var weak = r && r.wr > 0 && r.s < 2;
      if (weak) weakN++;
      var known = r && r.c > 0;
      return '<div class="zrow"><div class="zstar ' + st + '">★</div>' +
        '<div class="zw">' + e.w + "</div>" +
        '<div class="zm' + (known ? "" : " hidden-m") + '">' + (known ? e.m : "？？？") + "</div>" +
        (weak ? '<div class="zweak">！</div>' : "") + "</div>";
    });
    $("zukan-summary").innerHTML =
      "はっけん " + nB + "／" + pool.length +
      '　<span style="color:#cfd8e6">★' + nS + "</span>" +
      '　<span style="color:#ffd54a">★' + nG + "</span>" +
      (weakN ? '　<span style="color:#ff5a5a">にがて ' + weakN + "</span>" : "") +
      '<div style="font-size:10.5px;color:#667;margin-top:2px">★＝正解ずみ／銀★＝2秒以内で正解／金★＝3連続正解</div>';
    $("zukan-list").innerHTML = rows.join("");
    $("zukan-list").scrollTop = 0;
  }
  function openZukan() {
    return new Promise(function (resolve) {
      renderZukan();
      $("zukan").classList.add("on");
      function close() {
        INPUT.pop();
        $("zukan").classList.remove("on");
        $("zukan-close").onpointerdown = null;
        resolve();
      }
      var list = $("zukan-list");
      INPUT.push({
        onA: function () { list.scrollTop += 240; },
        onB: close,
        onDir: function (d) {
          var bands = [400, 500, 600, 700, 800, 900];
          var i = bands.indexOf(zukanBand);
          if (d === "left") { zukanBand = bands[(i + 5) % 6]; renderZukan(); }
          else if (d === "right") { zukanBand = bands[(i + 1) % 6]; renderZukan(); }
          else if (d === "down") list.scrollTop += 240;
          else if (d === "up") list.scrollTop -= 240;
        }
      });
      $("zukan-close").onpointerdown = function (e) { e.preventDefault(); close(); };
    });
  }

  // =================== MAIN LOOP ===================
  var screenMode = "title";
  var lastMove = 0;

  function loop(ts) {
    tick++;
    if (screenMode === "field" && G && !busyEvent && !moving && !INPUT.uiActive()) {
      var d = INPUT.held.up ? "up" : INPUT.held.down ? "down" : INPUT.held.left ? "left" : INPUT.held.right ? "right" : null;
      if (d) {
        if (ts - lastMove > 30) { lastMove = ts; tryMove(d); }
      } else {
        bumpLatch = false;
      }
    }
    if (screenMode === "field") draw();
    requestAnimationFrame(loop);
  }

  // =================== TITLE / BOOT ===================
  async function startGame(isNew) {
    $("title-screen").style.display = "none";
    screenMode = "field";
    if (isNew) {
      newGame();
      ensureDaily();
      playMapBgm();
      await fade(true); await fade(false);
      await UI.say("レキシア大陸 ―\nかつて だれもが 英語をはなせた\nゆたかな くにが あった。");
      await UI.say("しかし まおう ヴォキャブロスが\n《言葉の力》を うばい\n大陸は やみに つつまれた…。");
      await UI.say("いま ひとりの ゆうしゃが\nラーニング王のまえに めしだされた。\n（王さまに はなしかけよう。Ａボタンだ！）");
    } else {
      loadGame();
      ensureDaily();
      playMapBgm();
      await fade(true); await fade(false);
      await UI.say("がくしゅうきろくを よみこんだ！\nおかえりなさい、ゆうしゃよ。");
      await streakCheck();
    }
  }

  // debug: boss-ready save for playtesting the whole game quickly
  async function debugStart() {
    newGame();
    var t = window.LEVEL_TABLE[24]; // Lv25
    var p = G.player;
    p.lv = 25; p.exp = t.exp;
    p.maxhp = t.maxhp; p.hp = t.maxhp; p.maxmp = t.maxmp; p.mp = t.maxmp;
    p.str = t.str; p.vit = t.vit;
    p.weapon = 4; p.armor = 4; p.gold = 5000;
    p.items = { herb: 9, wing: 3, elixir: 5, key: 1 };
    p.spells = window.SPELLS.filter(function (s) { return s.learnLv <= 25; }).map(function (s) { return s.id; });
    G.flags.metKing = true; G.flags.gen_r_down = true; G.flags.gen_l_down = true;
    ensureDaily();
    saveGame();
    $("title-screen").style.display = "none";
    screenMode = "field";
    playMapBgm();
    await fade(true); await fade(false);
    await UI.say("【デバッグモード】\nＬｖ２５・最強一歩手前の装備・\n『ことばのカギ』所持ではじめます。\n南東の魔王城へ どうぞ！");
  }

  function refreshAd() {
    var premium = false;
    try { premium = localStorage.getItem("tq_premium") === "1"; } catch (e) {}
    $("ad-banner").classList.toggle("hidden", premium);
  }

  async function settings() {
    var premium = false;
    try { premium = localStorage.getItem("tq_premium") === "1"; } catch (e) {}
    var bgmOn = window.BGM ? BGM.isEnabled() : true;
    var c = await UI.menu($("cmd-win"), [
      { label: "ＢＧＭ： " + (bgmOn ? "ＯＮ" : "ＯＦＦ") },
      { label: "広告除去： " + (premium ? "ＯＮ（購入済み扱い）" : "ＯＦＦ") },
      { label: "がくしゅうきろくを けす" },
      { label: "デバッグ開始（Ｌｖ２５）" },
      { label: "とじる" }
    ], "せってい");
    if (c === 0) {
      if (window.BGM) BGM.setEnabled(!bgmOn);
      await UI.say("ＢＧＭを " + (!bgmOn ? "ＯＮ" : "ＯＦＦ") + " にした。");
      return;
    }
    if (c === 3) { await debugStart(); return; }
    c = c - 1;
    if (c === 0) {
      try { localStorage.setItem("tq_premium", premium ? "0" : "1"); } catch (e) {}
      refreshAd();
      await UI.say(premium ? "広告が ひょうじされます。" : "広告を けしました！\n（リリース版では ここが かきん となります）");
    } else if (c === 1) {
      var c2 = await UI.menu($("cmd-win"), [{ label: "やめておく" }, { label: "ほんとうに けす" }], "ほんとうに？");
      if (c2 === 1) {
        try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
        await UI.say("がくしゅうきろくを けした。");
        location.reload();
      }
    }
  }

  function boot() {
    setupCanvas();
    refreshAd();
    // key visual (assets/ui/title.png) if present
    (function () {
      var src = (window.UI_ART && window.UI_ART.title) || "assets/ui/title.png";
      var img = new Image();
      img.onload = function () {
        $("title-screen").style.background =
          "linear-gradient(rgba(2,4,20,.3), rgba(0,0,10,.75)), url('" + src + "') center/cover";
      };
      img.src = src;
    })();
    bindHold("dpad-up", "up"); bindHold("dpad-down", "down");
    bindHold("dpad-left", "left"); bindHold("dpad-right", "right");
    $("btn-a").addEventListener("pointerdown", function (e) { e.preventDefault(); INPUT.pressA(); });
    $("btn-b").addEventListener("pointerdown", function (e) { e.preventDefault(); INPUT.pressB(); });

    var canCont = hasSave();
    $("btn-continue").style.display = canCont ? "block" : "none";
    $("btn-continue").addEventListener("click", function () { startGame(false); });
    // double-tap confirm when a save exists (no confirm() dialog: blocked in sandboxed webviews)
    var newArmed = false;
    $("btn-new").addEventListener("click", function () {
      if (canCont && !newArmed) {
        newArmed = true;
        $("btn-new").textContent = "ほんとうに はじめから？";
        setTimeout(function () {
          newArmed = false;
          $("btn-new").textContent = "はじめから";
        }, 3000);
        return;
      }
      startGame(true);
    });
    $("btn-settings").addEventListener("click", function () { settings(); });

    if (window.BGM) BGM.play("title");
    requestAnimationFrame(loop);
  }

  window.addEventListener("DOMContentLoaded", boot);
})();
