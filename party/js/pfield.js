// WORD QUEST II - field/explore engine (chapter-1 scope)
// PFIELD.start() : walk the WQ2 world — towns, shops, inns, chests, gates,
// stairs, random encounters (via PBATTLE), boss fights, save/load.
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  var SAVE_KEY = "wq2_save_v1";
  var BASE = "../"; // pmain.js sets window.ASSET_BASE later; this page always lives in party/

  // ---------- shared state ----------
  var S = null;          // { pos:{map,x,y,dir}, gold, chests:{}, flags:{}, keys:{} }
  var mode = "off";      // off | field | busy
  var moving = false, busy = false;

  var ITEM_NAMES = {
    herb: "ハーブティー", wing: "帰還の羽根ペン", elixir: "エナジーコーヒー",
    cave_key: "洞窟のカギ", tower_key: "塔のカギ"
  };
  var GEAR = {
    w1: { name: "かきかたブレード", kind: "weapon", atk: 4, gold: 80 },
    w2: { name: "製図のレイピア", kind: "weapon", atk: 9, gold: 350 },
    w3: { name: "鋼のペン剣", kind: "weapon", atk: 15, gold: 900 },
    a1: { name: "布のスクールコート", kind: "armor", def: 4, gold: 60 },
    a2: { name: "鋼のバインダー鎧", kind: "armor", def: 9, gold: 420 }
  };
  // recompute a member's gear bonuses from its equipped weapon/armor ids
  function recalcGear(p) {
    p.gearAtk = p.weapon && GEAR[p.weapon] ? GEAR[p.weapon].atk : 0;
    p.gearDef = p.armor && GEAR[p.armor] ? GEAR[p.armor].def : 0;
  }
  function addOwned(id, n) { S.owned[id] = (S.owned[id] || 0) + (n || 1); }
  // move gear from the shared bag onto a member (old piece returns to the bag)
  function equipGear(p, id) {
    var kind = GEAR[id].kind, slot = kind === "weapon" ? "weapon" : "armor";
    if ((S.owned[id] || 0) <= 0) return false;
    S.owned[id]--;
    if (p[slot]) addOwned(p[slot], 1); // old piece back to the bag
    p[slot] = id;
    recalcGear(p);
    return true;
  }
  function unequipGear(p, slot) {
    if (!p[slot]) return;
    addOwned(p[slot], 1);
    p[slot] = null;
    recalcGear(p);
  }
  var ITEM_PRICE = { herb: 12, wing: 40, elixir: 60 };

  // ---------- encounter tables (chapter-1 scope) ----------
  // world is 216x176, split at its center (see maps_wq2.js OW_CX/OW_CY)
  function region(x, y) {
    if (x < 108 && y >= 88) return "sw";
    if (x >= 108 && y < 88) return "ne";
    if (x >= 108 && y >= 88) return "se";
    return "nw";
  }
  var PACKS = {
    sw: [["slime"], ["slime", "bat"], ["rat", "goblin"]],
    ne: [["wolf", "bee"], ["mush", "wolf"], ["goblin", "bee", "bat"]],
    se: [["snake", "lizard"], ["snake", "snake"], ["worm", "lizard"]],
    nw: [["ghost", "owl"], ["ghost", "wolf"], ["owl", "owl"]],
    cave: [["bat", "rat"], ["slime", "bat", "rat"], ["goblin", "rat"]],
    tower: [["wolf", "ghost"], ["bee", "bee", "mush"], ["snake", "owl"]]
  };
  // some enemies use magic / group attacks (kanji names). power = ×atk multiplier.
  var FOE_SKILLS = {
    ghost: [{ name: "呪いの言葉", power: 1.1, all: false, elem: "dark" }],
    owl:   [{ name: "風の刃", power: 0.75, all: true }],
    bee:   [{ name: "群れの一撃", power: 0.7, all: true }],
    bat:   [{ name: "吸血", power: 1.0, all: false }],
    mush:  [{ name: "毒の胞子", power: 0.65, all: true }],
    snake: [{ name: "毒牙", power: 1.05, all: false }],
    goblin:[{ name: "石つぶて", power: 0.7, all: true }]
  };
  function scaledFoe(id) {
    var d = window.ENEMY_BY_ID[id];
    return {
      base: d.id, name: d.name, lv: d.lv,
      hp: Math.round(d.hp * 1.5), atk: Math.round(d.atk * 1.15), def: Math.round(d.def * 1.05),
      mag: Math.round(d.atk * 1.1),
      exp: Math.round(d.exp * 1.4), agi: Math.round(d.lv / 25),
      hasty: d.traits && d.traits.indexOf("hasty") >= 0,
      skills: FOE_SKILLS[id], skillRate: 0.32
    };
  }
  // field doubled back up (dungeon stays lower); tuned per feedback
  var ENC_RATE = { world: 0.056, dungeon: 0.038 };

  // ---------- input ----------
  var INPUT = {
    stack: [], held: { up: false, down: false, left: false, right: false },
    top: function () { return this.stack[this.stack.length - 1] || null; },
    pressA: function () { var t = this.top(); if (t && t.onA) t.onA(); else fieldA(); },
    pressB: function () { var t = this.top(); if (t && t.onB) t.onB(); else fieldB(); },
    pressDir: function (d) { var t = this.top(); if (t && t.onDir) t.onDir(d); }
  };
  var KEYMAP = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
  window.addEventListener("keydown", function (e) {
    if (mode === "off") return;
    if (battleActive()) return; // pbattle handles its own keys
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
  function battleActive() {
    var el = $("pbattle-screen");
    return el && el.style.display === "block";
  }

  function bindHold(id, dir) {
    var el = $(id);
    function down(e) {
      e.preventDefault();
      if (battleActive()) { window.PBATTLE.pressDir(dir); return; } // menu cursor in battle
      INPUT.held[dir] = true; INPUT.pressDir(dir);
    }
    function up(e) { e.preventDefault(); INPUT.held[dir] = false; }
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", up);
  }

  // controller is live from page load — battles can be played standalone (demo
  // buttons) without ever entering field mode
  function bindControls() {
    bindHold("dpad-up", "up"); bindHold("dpad-down", "down");
    bindHold("dpad-left", "left"); bindHold("dpad-right", "right");
    $("btn-a").addEventListener("pointerdown", function (e) {
      e.preventDefault();
      if (battleActive()) window.PBATTLE.pressA(); else if (mode === "field") INPUT.pressA();
    });
    $("btn-b").addEventListener("pointerdown", function (e) {
      e.preventDefault();
      if (battleActive()) window.PBATTLE.pressB(); else if (mode === "field") INPUT.pressB();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindControls);
  else bindControls();

  // ---------- UI: say / menu (field windows) ----------
  function say(text, el) {
    el = el || $("msg-win");
    return new Promise(function (resolve) {
      el.style.display = "block";
      el.innerHTML = '<span class="body"></span><span class="arrow">▼</span>';
      var body = el.querySelector(".body");
      var i = 0, typing = true;
      var iv = setInterval(function () {
        if (i >= text.length) { clearInterval(iv); typing = false; return; }
        body.textContent = text.slice(0, ++i);
      }, 18);
      INPUT.stack.push({ onA: adv, onB: adv, onDir: function () {} });
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
      }
      function close(v) {
        INPUT.stack.pop();
        el.style.display = "none";
        resolve(v);
      }
      INPUT.stack.push({
        onA: function () { if (!items[sel].disabled) close(sel); },
        onB: function () { close(-1); },
        onDir: function (d) {
          var n = items.length;
          for (var k = 0; k < n; k++) {
            sel = (d === "up" || d === "left") ? (sel + n - 1) % n : (sel + 1) % n;
            if (!items[sel].disabled) break;
          }
          render();
        }
      });
      el.style.display = "block";
      render();
    });
  }
  function fade(on) {
    $("fade-layer").classList.toggle("on", on);
    return new Promise(function (r) { setTimeout(r, 360); });
  }

  // ---------- map helpers ----------
  function curMap() { return window.WQ2_MAPS[S.pos.map]; }
  function tileAt(m, x, y) {
    if (x < 0 || y < 0 || y >= m.h || x >= m.w) return "=";
    return m.grid[y][x];
  }
  var SOLID = { w: 1, m: 1, "=": 1 };
  function eventAt(m, x, y) {
    var evs = m.events || [];
    for (var i = 0; i < evs.length; i++) {
      if (evs[i].x === x && evs[i].y === y) return evs[i];
    }
    return null;
  }
  function dirDelta(d) {
    return d === "up" ? [0, -1] : d === "down" ? [0, 1] : d === "left" ? [-1, 0] : [1, 0];
  }

  // ---------- rendering (ported from game 1, ASSET_BASE-aware) ----------
  var TILE = 32, VW = 12, VH = 10;
  var canvas, ctx, dpr = 1, tick = 0, anim = null;
  var TILE_COLORS = {
    ".": ["#2f9e44", "#268a3a"], t: ["#2f9e44", "#14591f"], m: ["#7a5c33", "#5c421f"],
    w: ["#1b4fbf", "#1640a0"], s: ["#d9c06b", "#c4aa53"], b: ["#8a5a2b", "#6e4218"],
    "=": ["#8d8d99", "#6d6d7a"], ",": ["#d9cba3", "#c8b98d"], "-": ["#5a5a6e", "#4a4a5c"],
    "^": ["#d9cba3", "#333"], v: ["#5a5a6e", "#222"], c: ["#d9cba3", "#c8b98d"],
    C: ["#2f9e44", "#268a3a"], T: ["#2f9e44", "#268a3a"], D: ["#7a5c33", "#5c421f"],
    U: ["#2f9e44", "#268a3a"], X: ["#d9c06b", "#c4aa53"]
  };
  var GLYPH = { C: "🏰", T: "🏠", D: "🕳️", U: "🗼", X: "🚪" };
  var TERRAIN_TEX = {
    ".": "grass", t: "forest", m: "mountain", w: "water", s: "sand", b: "cliff",
    "=": "stonewall", ",": "floor", "-": "cavefloor",
    "^": "floor", v: "cavefloor", c: "floor",
    C: "grass", T: "grass", U: "grass", D: "mountain", X: "sand"
  };
  var TILE_ICON = { C: "icon_castle", T: "icon_town", D: "icon_cave", U: "icon_tower", X: "icon_gate" };
  var NPC_SPRITE = {
    "👑": "npc_king", "💂": "npc_guard", "🧙": "npc_mage", "⚔️": "npc_weapon",
    "🧴": "npc_item", "🛏️": "npc_inn", "👦": "npc_boy", "👩": "npc_woman",
    "🧔": "npc_man", "👴": "npc_oldman", "👵": "npc_oldgrandma"
  };
  var FIELD_IMG = {};
  function fieldImg(name, src) {
    if (!name) return null;
    var v = FIELD_IMG[name];
    if (v === undefined) {
      FIELD_IMG[name] = "loading";
      var img = new Image();
      img.onload = function () { FIELD_IMG[name] = img; };
      img.onerror = function () { FIELD_IMG[name] = "no"; };
      img.src = src || (window.FIELD_ART && window.FIELD_ART[name]) || BASE + "assets/field/" + name + ".png";
      return null;
    }
    return (v === "no" || v === "loading") ? null : v;
  }
  function enemyFieldImg(id) {
    return fieldImg("enemy_" + id, (window.ENEMY_ART && window.ENEMY_ART[id]) || BASE + "assets/enemies/" + id + ".png");
  }
  function drawSprite(img, px, py, hMul, mirror) {
    var h = TILE * hMul, w = h * img.width / img.height;
    var dx = px + (TILE - w) / 2, dy = py + TILE - h;
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.beginPath();
    ctx.ellipse(px + TILE / 2, py + TILE - 2, w * 0.32, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    if (mirror) {
      ctx.save();
      ctx.translate(dx + w / 2, 0); ctx.scale(-1, 1);
      ctx.drawImage(img, -w / 2, dy, w, h);
      ctx.restore();
    } else ctx.drawImage(img, dx, dy, w, h);
  }
  function terrainOf(m, x, y) {
    var tt = tileAt(m, x, y);
    return TERRAIN_TEX[tt] || null;
  }
  function drawEdges(m, x, y, px, py, t) {
    var mine = TERRAIN_TEX[t];
    if (!mine) return;
    var E = 3;
    var dirs = [[0, -1, "t"], [0, 1, "b"], [-1, 0, "l"], [1, 0, "r"]];
    for (var i = 0; i < dirs.length; i++) {
      var other = terrainOf(m, x + dirs[i][0], y + dirs[i][1]);
      if (other === mine || other === null) continue;
      var side = dirs[i][2];
      if (mine === "water") {
        var pulse = 0.28 + 0.14 * Math.sin(tick / 24 + x + y);
        ctx.fillStyle = "rgba(255,255,255," + pulse.toFixed(2) + ")";
      } else if (other === "water") ctx.fillStyle = "rgba(20,40,80,.28)";
      else ctx.fillStyle = "rgba(0,0,0,.14)";
      if (side === "t") ctx.fillRect(px, py, TILE, E);
      else if (side === "b") ctx.fillRect(px, py + TILE - E, TILE, E);
      else if (side === "l") ctx.fillRect(px, py, E, TILE);
      else ctx.fillRect(px + TILE - E, py, E, TILE);
    }
  }
  function drawTile(m, x, y, px, py) {
    var t = tileAt(m, x, y);
    var tex = fieldImg(TERRAIN_TEX[t]);
    if (tex) {
      if (t === "t" || t === "m" || t === "D") {
        var prop = fieldImg(t === "t" ? "tree" : "peak");
        var gbase = prop && fieldImg("grass");
        if (prop && gbase) {
          var gw = gbase.width / 2, gh = gbase.height / 2;
          ctx.drawImage(gbase, (x & 1) * gw, (y & 1) * gh, gw, gh, px, py, TILE, TILE);
          drawSprite(prop, px, py, 1.1);
        } else {
          var fw = tex.width * 0.28, fh = tex.height * 0.28;
          var fx = tex.width * (0.08 + 0.28 * (x & 1) + 0.14 * (y & 1));
          var fy = tex.height * (0.08 + 0.28 * (y & 1) + 0.14 * (x & 1));
          ctx.drawImage(tex, fx, fy, fw, fh, px, py, TILE, TILE);
        }
      } else {
        var hw = tex.width / 2, hh = tex.height / 2;
        ctx.drawImage(tex, (x & 1) * hw, (y & 1) * hh, hw, hh, px, py, TILE, TILE);
      }
      drawEdges(m, x, y, px, py, t);
      if (t === "^" || t === "v") {
        ctx.fillStyle = "rgba(20,16,10,.6)";
        var u = TILE / 24;
        ctx.fillRect(px + 4 * u, py + 16 * u, 16 * u, 4 * u);
        ctx.fillRect(px + 7 * u, py + 10 * u, 10 * u, 4 * u);
        ctx.fillRect(px + 10 * u, py + 4 * u, 4 * u, 4 * u);
      }
      if (GLYPH[t]) {
        var icon = fieldImg(TILE_ICON[t]);
        if (icon) drawSprite(icon, px, py, 1.2);
        else {
          ctx.font = "22px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(GLYPH[t], px + TILE / 2, py + TILE / 2 + 1);
        }
      }
    } else {
      var c = TILE_COLORS[t] || TILE_COLORS["."];
      ctx.fillStyle = c[0];
      ctx.fillRect(px, py, TILE, TILE);
    }
    // chest sprite (walk-on opens)
    var ev = eventAt(m, x, y);
    if (ev && ev.type === "chest") {
      var opened = S.chests[ev.id];
      var cimg = fieldImg(opened ? "chest_open" : "chest_closed");
      if (cimg) drawSprite(cimg, px, py, 1.0);
    }
    // gate marker
    if (ev && ev.type === "gate" && !S.flags["gate_" + ev.x + "_" + ev.y + "_" + m.id]) {
      ctx.fillStyle = "rgba(120,90,40,.9)";
      ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
      ctx.fillStyle = "#ffd54a";
      ctx.font = "16px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("🔒", px + TILE / 2, py + TILE / 2);
    }
  }

  function draw() {
    if (!S || mode === "off") return;
    var m = curMap();
    var px = S.pos.x, py = S.pos.y;
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
    (m.events || []).forEach(function (ev) {
      if (ev.type === "npc" || (ev.type === "boss" && !S.flags[ev.flag])) {
        var ex = Math.round((ev.x - camx) * TILE), ey = Math.round((ev.y - camy) * TILE);
        var eimg = ev.type === "boss" ? enemyFieldImg(ev.enemy) : fieldImg(NPC_SPRITE[ev.icon]);
        if (eimg) drawSprite(eimg, ex, ey, ev.type === "boss" ? 1.5 : 1.35);
        else {
          ctx.font = "22px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(ev.icon || "❓", ex + TILE / 2, ey + TILE / 2);
        }
      }
    });
    var hx = Math.round((px - camx) * TILE), hy = Math.round((py - camy) * TILE);
    var d = S.pos.dir;
    // walking bounce: lift the sprite on a sine while a step is animating
    var bob = anim ? -Math.round(Math.abs(Math.sin(anim.p * Math.PI)) * 4) : 0;
    var sway = anim ? Math.round(Math.sin(anim.p * Math.PI * 2) * 1.5) : 0;
    var himg = fieldImg(d === "up" ? "hero_up" : (d === "left" || d === "right") ? "hero_side" : "hero_down");
    if (himg) drawSprite(himg, hx + sway, hy + bob, 1.35, d === "left");
    else {
      ctx.font = "22px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("🧝", hx + TILE / 2, hy + TILE / 2 + bob);
    }
    if (m.dark) {
      var gx = hx + TILE / 2, gy = hy + TILE / 2;
      var grad = ctx.createRadialGradient(gx, gy, TILE * 2.2, gx, gy, TILE * 4.5);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.96)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VW * TILE, VH * TILE);
    }
    ctx.restore();

    var roster = window.PBATTLE.getParty().map(function (p) {
      var cls = p.hp <= 0 ? " style='color:#c66'" : (p.hp <= p.maxhp * 0.25 ? " style='color:#e94'" : "");
      return "<div class='pstat'" + cls + ">" + p.name + " <b>" + Math.max(0, p.hp) + "</b>/" + p.maxhp + "</div>";
    }).join("");
    $("status-win").innerHTML =
      '<div class="name">' + m.name + '　<span class="gold-text">' + S.gold + "G</span></div>" +
      roster;
  }

  // ---------- movement ----------
  async function transferTo(mapId, x, y) {
    busy = true;
    await fade(true);
    S.pos.map = mapId; S.pos.x = x; S.pos.y = y;
    playMapBgm();
    await fade(false);
    busy = false;
    await checkStoryJoins();
  }

  // party grows through the story instead of starting full
  function partyLv() {
    return window.PBATTLE.getParty().reduce(function (m, p) { return Math.max(m, p.lv); }, 1);
  }
  async function joinMember(id, line) {
    if (window.PBATTLE.hasMember(id)) return;
    var m = window.PBATTLE.addMember(id, partyLv());
    if (!m) return;
    if (line) await say(line);
    await say(m.name + "が 仲間に加わった！");
    save();
  }
  async function checkStoryJoins() {
    // ガイ: 鋼の村にたどり着くと合流
    if (S.pos.map === "village" && !S.flags.gai_joined) {
      S.flags.gai_joined = true;
      await joinMember("gai", "剣士のガイが 駆け寄ってきた。\n「妹の声を取り戻したい。\n　その旅、おれも連れて行ってくれ！」");
    }
  }
  function playMapBgm() {
    if (!window.BGM) return;
    var m = curMap();
    if (m.kind === "town") BGM.playAny(["town"]);
    else if (m.kind === "dungeon") BGM.playAny(["dungeon"]);
    else BGM.playAny(["field"]);
  }

  async function tryMove(d) {
    if (busy || moving) return;
    var m = curMap();
    S.pos.dir = d;
    var dd = dirDelta(d);
    var nx = S.pos.x + dd[0], ny = S.pos.y + dd[1];

    // walking out of a town/dungeon edge exits if defined
    if ((nx < 0 || ny < 0 || nx >= m.w || ny >= m.h)) {
      if (m.exit) await transferTo(m.exit.map, m.exit.x, m.exit.y);
      return;
    }
    var t = tileAt(m, nx, ny);
    var ev = eventAt(m, nx, ny);

    if (ev && ev.type === "gate" && !S.flags["gate_" + ev.x + "_" + ev.y + "_" + m.id]) {
      if (S.items[ev.needs] > 0) {
        S.flags["gate_" + ev.x + "_" + ev.y + "_" + m.id] = true;
        await say("『" + ITEM_NAMES[ev.needs] + "』を使った！\n扉が開いた。");
      } else {
        await say(ev.lockedMsg || "扉は固く閉ざされている。");
        return;
      }
    }
    if (ev && (ev.type === "npc" || (ev.type === "boss" && !S.flags[ev.flag]))) return; // bump
    if (SOLID[t]) return;

    moving = true;
    anim = { fx: S.pos.x, fy: S.pos.y, tx: nx, ty: ny, p: 0 };
    var steps = 5;
    for (var i = 1; i <= steps; i++) {
      anim.p = i / steps;
      await new Promise(function (r) { setTimeout(r, 26); });
    }
    anim = null;
    S.pos.x = nx; S.pos.y = ny;
    moving = false;

    // arrival events
    if (ev) {
      if (ev.type === "enter" || ev.type === "stairs") {
        await transferTo(ev.map, ev.tx, ev.ty);
        return;
      }
      if (ev.type === "chest" && !S.chests[ev.id]) {
        S.chests[ev.id] = true;
        await openChest(ev.loot);
        save();
        return;
      }
    }
    if ((t === "^" || t === "v") && m.exit && !(ev && ev.type === "stairs")) {
      await transferTo(m.exit.map, m.exit.x, m.exit.y);
      return;
    }
    // random encounter
    var rate = ENC_RATE[m.kind === "dungeon" ? "dungeon" : m.kind === "world" ? "world" : ""];
    if (rate && Math.random() < rate && !SOLID[t] && t !== "b") {
      var packSet = m.kind === "dungeon"
        ? (m.id.indexOf("tower") === 0 ? PACKS.tower : PACKS.cave)
        : PACKS[region(nx, ny)];
      var pack = packSet[rnd(packSet.length)];
      await runEncounter({ bg: m.kind === "dungeon" ? "cave" : "zone2", enemies: pack.map(scaledFoe) });
    }
  }

  async function openChest(loot) {
    if (window.SFX_ART || true) { try { new Audio((window.SFX_ART && window.SFX_ART.chest) || BASE + "assets/sfx/chest.mp3").play().catch(function(){}); } catch (e) {} }
    if (loot.gold) {
      S.gold += loot.gold;
      await say("宝箱を開けた！\n" + loot.gold + " ゴールドを手に入れた！");
    } else if (loot.item) {
      var n = loot.n || 1;
      addItem(loot.item, n);
      await say("宝箱を開けた！\n『" + ITEM_NAMES[loot.item] + "』を " + n + "個 手に入れた！");
    } else if (loot.weapon) {
      addOwned(loot.weapon, 1);
      await say("宝箱を開けた！\n『" + GEAR[loot.weapon].name + "』を手に入れた！\n（メニューの「そうび」で装備できる）");
    } else if (loot.armor) {
      addOwned(loot.armor, 1);
      await say("宝箱を開けた！\n『" + GEAR[loot.armor].name + "』を手に入れた！\n（メニューの「そうび」で装備できる）");
    }
  }
  function addItem(key, n) {
    S.items[key] = (S.items[key] || 0) + n;
    // battle items share the same pool
    var bi = window.PBATTLE.getItems();
    if (key === "herb" || key === "elixir") bi[key] = S.items[key];
  }
  function syncItemsFromBattle() {
    var bi = window.PBATTLE.getItems();
    S.items.herb = bi.herb; S.items.elixir = bi.elixir;
  }

  // ---------- battle glue ----------
  async function runEncounter(enc, bossEv) {
    busy = true;
    var bi = window.PBATTLE.getItems();
    bi.herb = S.items.herb || 0; bi.elixir = S.items.elixir || 0;
    var r = await window.PBATTLE.start(enc);
    syncItemsFromBattle();
    playMapBgm();
    if (r.result === "lose") {
      await fade(true);
      S.gold = Math.floor(S.gold / 2);
      window.PBATTLE.getParty().forEach(function (p) { p.hp = p.maxhp; p.mp = p.maxmp; });
      S.pos = { map: "castle", x: 20, y: 6, dir: "up" }; // revive in front of the king
      playMapBgm();
      await fade(false);
      await say("国王グロッサ\n『気を落とすでない、勇者よ。\n　失敗は学びのもと。\n　また 送り出してやろう。』\n（所持金が半分になった）");
    } else if (r.result === "win" && bossEv) {
      S.flags[bossEv.flag] = true;
      for (var i = 0; i < (bossEv.after || []).length; i++) await say(bossEv.after[i]);
      // story companions join after key bosses
      if (bossEv.flag === "cave1_boss_down") {
        await joinMember("rina", "洞窟の奥にいた 魔法使いのリナが\n進み出た。\n「その力…わたしも 見届けたい。\n　同行させてもらうわ。」");
      } else if (bossEv.flag === "howl_down") {
        await joinMember("mia", "塔に囚われていた 僧侶のミアが\n救い出された。\n「あなたたちの旅、\n　この身を捧げて お支えします。」");
      }
    }
    save();
    busy = false;
  }

  // ---------- interactions (A button) ----------
  async function fieldA() {
    if (busy || moving || mode !== "field") return;
    var m = curMap();
    var dd = dirDelta(S.pos.dir);
    var ev = eventAt(m, S.pos.x + dd[0], S.pos.y + dd[1]);
    if (!ev) return;
    busy = true;
    if (ev.type === "boss" && !S.flags[ev.flag]) {
      for (var i = 0; i < (ev.pre || []).length; i++) await say(ev.pre[i]);
      busy = false;
      var boss;
      if (ev.enemy === "gen_r") {
        boss = { bg: "tower1", enemies: [{
          base: "gen_r", name: "四天王ハウル", lv: 600, hp: 760, atk: 24, def: 20, agi: 20, mag: 28, exp: 600, boss: true,
          skills: [{ name: "轟音の叫び", power: 0.85, all: true }], skillRate: 0.3,
          phases: [
            { at: 1.0, acts: 1, aoe: 0, charge: 0 },
            { at: 0.66, acts: 2, aoe: 0.25, charge: 0, msg: ["ハウルの様子が変わった！\n『ほう…やるではないか！』", "ハウルの行動が2回になった！"] },
            { at: 0.33, acts: 2, aoe: 0.3, charge: 0.4, msg: ["ハウルが本気を出した！！\n『この叫びで終わらせる！』", "（力をためたら防御だ！）"] }
          ]
        }] };
      } else {
        boss = { bg: "cave", enemies: [{
          base: ev.enemy, name: "あらしオオカミ", lv: 450, hp: 150, atk: 15, def: 7, agi: 8, mag: 15, exp: 90, boss: true,
          skills: [{ name: "うなり声", power: 0.7, all: true }], skillRate: 0.28,
          phases: [
            { at: 1.0, acts: 1, aoe: 0, charge: 0 },
            { at: 0.4, acts: 1, aoe: 0.4, charge: 0, msg: ["あらしオオカミは 手負いになり\nいっそう 荒々しくなった！"] }
          ]
        }] };
      }
      await runEncounter(boss, ev);
      return;
    }
    if (ev.type === "npc") {
      if (ev.inn) {
        var c = await menu($("cmd-win"), [{ label: "泊まる（" + ev.inn.price + "G）" }, { label: "やめる" }], "宿屋");
        if (c === 0) {
          if (S.gold < ev.inn.price) await say("ゴールドが足りない！");
          else {
            S.gold -= ev.inn.price;
            await fade(true);
            window.PBATTLE.getParty().forEach(function (p) { if (p.hp > 0) { p.hp = p.maxhp; p.mp = p.maxmp; } });
            await fade(false);
            await say("ぐっすり眠って 全回復した！");
            save();
          }
        }
      } else if (ev.shop) {
        await shopTalk(ev);
      } else {
        for (var j = 0; j < (ev.text || []).length; j++) await say(ev.text[j]);
      }
    }
    busy = false;
  }

  async function shopTalk(ev) {
    for (var j = 0; j < (ev.text || []).length; j++) await say(ev.text[j]);
    while (true) {
      var goods = ev.shop.items.map(function (k) {
        if (GEAR[k]) return { label: GEAR[k].name + "　" + GEAR[k].gold + "G", k: k };
        return { label: ITEM_NAMES[k] + "　" + ITEM_PRICE[k] + "G", k: k };
      });
      goods.push({ label: "やめる" });
      var gi = await menu($("cmd-win"), goods, "（所持金 " + S.gold + "G）");
      if (gi < 0 || gi === goods.length - 1) break;
      var k = goods[gi].k;
      var price = GEAR[k] ? GEAR[k].gold : ITEM_PRICE[k];
      if (S.gold < price) { await say("ゴールドが足りない！"); continue; }
      S.gold -= price;
      if (GEAR[k]) {
        addOwned(k, 1);
        await say("『" + GEAR[k].name + "』を買った！\n（メニューの「そうび」で装備しよう）");
      } else {
        addItem(k, 1);
        await say("『" + ITEM_NAMES[k] + "』を買った！");
      }
      save();
    }
  }

  // ---------- field menu (B button) ----------
  async function fieldB() {
    if (busy || moving || mode !== "field") return;
    busy = true;
    var bgmOn = window.BGM ? BGM.isEnabled() : false;
    var c = await menu($("cmd-win"), [
      { label: "つよさ" }, { label: "そうび" }, { label: "どうぐ" }, { label: "セーブ" },
      { label: "ＢＧＭ：" + (bgmOn ? "ＯＮ" : "ＯＦＦ") },
      { label: "タイトルへ" }, { label: "とじる" }
    ], "メニュー");
    if (c === 0) {
      var lines = window.PBATTLE.getParty().map(function (p) {
        var wn = p.weapon && GEAR[p.weapon] ? GEAR[p.weapon].name : "なし";
        var an = p.armor && GEAR[p.armor] ? GEAR[p.armor].name : "なし";
        return p.name + "（Ｌｖ" + p.lv + " " + p.role + "）\n　ＨＰ" + p.hp + "/" + p.maxhp + "　ＭＰ" + p.mp + "/" + p.maxmp +
          "　攻" + (p.atk + (p.gearAtk || 0)) + " 守" + (p.def + (p.gearDef || 0)) +
          "\n　武器：" + wn + "／防具：" + an;
      });
      await say(lines.join("\n\n") + "\n\n所持金 " + S.gold + "G");
    } else if (c === 1) {
      await equipMenu();
    } else if (c === 2) {
      var inv = [];
      Object.keys(S.items).forEach(function (k) {
        if (S.items[k] > 0) inv.push({ label: (ITEM_NAMES[k] || k) + " ×" + S.items[k], k: k });
      });
      if (!inv.length) await say("道具を持っていない。");
      else {
        var ii = await menu($("sub-win"), inv, "どうぐ");
        if (ii >= 0) {
          var k = inv[ii].k;
          if (k === "herb") {
            var p0 = lowestHpMember();
            p0.hp = Math.min(p0.maxhp, p0.hp + 40);
            S.items.herb--; syncToBattle();
            await say(p0.name + "のＨＰが 40 回復した！");
          } else if (k === "elixir") {
            var p1 = lowestMpMember();
            p1.mp = Math.min(p1.maxmp, p1.mp + 30);
            S.items.elixir--; syncToBattle();
            await say(p1.name + "のＭＰが 30 回復した！");
          } else if (k === "wing") {
            S.items.wing--;
            await transferTo("castle", 20, 26);
            await say("帰還の羽根ペンで\n王都グロッサに戻った！");
          } else {
            await say("ここでは使えない。");
          }
          save();
        }
      }
    } else if (c === 3) {
      save();
      await say("冒険の記録を保存した！");
    } else if (c === 4) {
      if (window.BGM) BGM.setEnabled(!bgmOn);
      await say("ＢＧＭを " + (!bgmOn ? "ＯＮ" : "ＯＦＦ") + " にした。");
    } else if (c === 5) {
      mode = "off";
      if (window.BGM) BGM.stop();
      $("pfield-wrap").style.display = "none";
      $("ptitle-screen").style.display = "flex";
      if (window.BGM) BGM.playAny(["title"]);
    }
    busy = false;
  }

  // equip / hand gear between members (shared bag = handing items to allies)
  async function equipMenu() {
    while (true) {
      var party = window.PBATTLE.getParty();
      var mem = party.map(function (p) {
        return { label: p.name + "  武器:" + (p.weapon ? GEAR[p.weapon].name : "なし") + " / 防具:" + (p.armor ? GEAR[p.armor].name : "なし"), p: p };
      });
      mem.push({ label: "やめる" });
      var mi = await menu($("cmd-win"), mem, "だれの装備？");
      if (mi < 0 || mi === mem.length - 1) break;
      var p = mem[mi].p;
      // slot choice
      while (true) {
        var slotSel = await menu($("sub-win"), [
          { label: "武器：" + (p.weapon ? GEAR[p.weapon].name : "なし") },
          { label: "防具：" + (p.armor ? GEAR[p.armor].name : "なし") },
          { label: "もどる" }
        ], p.name + "の装備");
        if (slotSel < 0 || slotSel === 2) break;
        var kind = slotSel === 0 ? "weapon" : "armor";
        var slot = kind;
        // owned gear of this kind (shared bag) + unequip option
        var opts = [];
        Object.keys(S.owned).forEach(function (id) {
          if (S.owned[id] > 0 && GEAR[id] && GEAR[id].kind === kind) {
            var stat = kind === "weapon" ? "攻+" + GEAR[id].atk : "守+" + GEAR[id].def;
            opts.push({ label: GEAR[id].name + "（" + stat + "）×" + S.owned[id], id: id });
          }
        });
        if (p[slot]) opts.push({ id: "__off", label: "はずす（" + GEAR[p[slot]].name + "）" });
        opts.push({ id: "__cancel", label: "やめる" });
        var gi = await menu($("sub-win"), opts, (kind === "weapon" ? "武器" : "防具") + "をえらぶ");
        if (gi < 0) continue;
        var pick = opts[gi];
        if (pick.id === "__cancel") continue;
        if (pick.id === "__off") { unequipGear(p, slot); await say(p.name + "は 装備をはずした。"); save(); continue; }
        equipGear(p, pick.id);
        await say(p.name + "は『" + GEAR[pick.id].name + "』を装備した！");
        save();
      }
    }
  }
  function lowestHpMember() {
    var ps = window.PBATTLE.getParty().filter(function (p) { return p.hp > 0; });
    ps.sort(function (a, b) { return a.hp / a.maxhp - b.hp / b.maxhp; });
    return ps[0];
  }
  function lowestMpMember() {
    var ps = window.PBATTLE.getParty().slice();
    ps.sort(function (a, b) { return (a.maxmp - a.mp) < (b.maxmp - b.mp) ? 1 : -1; });
    return ps[0];
  }
  function syncToBattle() {
    var bi = window.PBATTLE.getItems();
    bi.herb = S.items.herb || 0; bi.elixir = S.items.elixir || 0;
  }

  // ---------- save / load ----------
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        pos: S.pos, gold: S.gold, chests: S.chests, flags: S.flags, items: S.items,
        owned: S.owned, party: window.PBATTLE.getParty()
      }));
    } catch (e) {}
  }
  function load() {
    try {
      var s = localStorage.getItem(SAVE_KEY);
      if (!s) return null;
      return JSON.parse(s);
    } catch (e) { return null; }
  }

  // ---------- main loop ----------
  var lastMove = 0, rafStarted = false;
  function loop(ts) {
    tick++;
    if (mode === "field" && S && !busy && !moving && !INPUT.stack.length && !battleActive()) {
      var d = INPUT.held.up ? "up" : INPUT.held.down ? "down" : INPUT.held.left ? "left" : INPUT.held.right ? "right" : null;
      if (d && ts - lastMove > 30) { lastMove = ts; tryMove(d); }
    }
    if (mode === "field" && !battleActive()) draw();
    requestAnimationFrame(loop);
  }

  async function start(isNew) {
    var m = $("pfield-wrap");
    m.style.display = "block";
    $("ptitle-screen").style.display = "none";
    if (!canvas) {
      canvas = $("field-canvas");
      ctx = canvas.getContext("2d");
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = VW * TILE * dpr;
      canvas.height = VH * TILE * dpr;
      ctx.imageSmoothingEnabled = true;
      if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = "high";
    }
    var sv = !isNew && load();
    if (sv) {
      S = { pos: sv.pos, gold: sv.gold, chests: sv.chests || {}, flags: sv.flags || {}, items: sv.items || {}, owned: sv.owned || {} };
      if (sv.party) {
        window.PBATTLE.setParty(sv.party);
        window.PBATTLE.getParty().forEach(recalcGear); // rebuild gear bonuses from equipped ids
      }
    } else {
      window.PBATTLE.resetParty();
      S = { pos: { map: "castle", x: 20, y: 26, dir: "up" }, gold: 120,
            chests: {}, flags: {}, items: { herb: 6, elixir: 2, wing: 1 }, owned: { w1: 1, a1: 1 } };
      var yu = window.PBATTLE.getParty()[0];
      equipGear(yu, "w1"); equipGear(yu, "a1"); // hero starts with basic gear equipped
    }
    syncToBattle();
    mode = "field";
    playMapBgm();
    if (!rafStarted) { rafStarted = true; requestAnimationFrame(loop); }
    await fade(true); await fade(false);
    if (!sv) {
      await say("【第1章 旅立ち】\n王都グロッサ ― 人々から《声》が\n消え始めた大陸で、勇者ユウの\n冒険が始まる。");
      await say("まずは王様に話を聞こう。\n（Ａボタン：話す／調べる\n　Ｂボタン：メニュー）");
    }
    save();
  }

  window.PFIELD = { start: start, hasSave: function () { return !!load(); } };
})();
