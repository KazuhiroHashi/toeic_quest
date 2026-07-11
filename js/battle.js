// TOEIC QUEST - battle module
// BATTLE.start(enemyId, {boss}) -> Promise<{result:"win"|"lose"|"flee"|"enemyfled", exp, gold}>
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function rnd(n) { return (Math.random() * n) | 0; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function pAtk() { var G = window.G; return G.player.str + window.WEAPONS[G.player.weapon].atk; }
  function pDef() { var G = window.G; return G.player.vit + window.ARMORS[G.player.armor].def; }

  function refreshStatus() {
    var G = window.G, p = G.player;
    $("battle-status").innerHTML =
      '<div class="name">ゆうしゃ　Lv' + p.lv + "</div>" +
      "ＨＰ " + p.hp + "/" + p.maxhp + "<br>ＭＰ " + p.mp + "/" + p.maxmp;
  }

  function setEnemyHp(e) {
    $("enemy-hp-bar").firstElementChild.style.width = Math.max(0, 100 * e.hp / e.maxhp) + "%";
  }

  // battle message (typewriter, tap to continue handled by UI.say core)
  function bsay(text) { return window.UI.say(text, $("battle-msg")); }

  async function enemyAttack(e, kind) {
    var G = window.G, p = G.player;
    var dmg;
    if (kind === "fire") {
      await bsay(e.name + "は ほのおを はいた！");
      dmg = Math.max(2, Math.round(e.atk * 0.55 - pDef() / 8) + rnd(4));
    } else {
      await bsay(e.name + "の こうげき！");
      dmg = Math.max(1, Math.round(e.atk / 2 - pDef() / 4) + rnd(4));
    }
    p.hp = Math.max(0, p.hp - dmg);
    $("battle-screen").classList.add("shake");
    $("battle-bg").classList.add("flash-red");
    if (window.SFX) SFX.play("hit");
    setTimeout(function () {
      $("battle-screen").classList.remove("shake");
      $("battle-bg").classList.remove("flash-red");
    }, 400);
    refreshStatus();
    await bsay("ゆうしゃは " + dmg + " の\nダメージを うけた！");
  }

  async function enemyTurn(e) {
    var G = window.G;
    if (e.traits.indexOf("flee") >= 0 && Math.random() < 0.45) {
      await bsay(e.name + "は にげだした！");
      return "fled";
    }
    if (e.traits.indexOf("heal") >= 0 && e.hp < e.maxhp * 0.3 && Math.random() < 0.6) {
      var h = Math.round(e.maxhp * 0.25);
      e.hp = Math.min(e.maxhp, e.hp + h);
      setEnemyHp(e);
      await bsay(e.name + "は じこさいせいした！\nＨＰが " + h + " かいふくした。");
      return null;
    }
    var kind = (e.traits.indexOf("fire") >= 0 && Math.random() < 0.35) ? "fire" : "attack";
    await enemyAttack(e, kind);
    if (G.player.hp <= 0) return "dead";
    if (e.traits.indexOf("double") >= 0 && Math.random() < 0.3 && kind !== "fire") {
      await enemyAttack(e, "attack");
      if (G.player.hp <= 0) return "dead";
    }
    return null;
  }

  async function playerHit(e, dmg, crit) {
    var sp = $("enemy-sprite");
    sp.classList.add("hit");
    if (window.SFX) SFX.play(crit ? "crit" : "slash");
    setTimeout(function () { sp.classList.remove("hit"); }, 120);
    e.hp = Math.max(0, e.hp - dmg);
    setEnemyHp(e);
    if (crit) await bsay("かいしんの いちげき！！\n" + e.name + "に " + dmg + " のダメージ！");
    else await bsay(e.name + "に " + dmg + " のダメージ！");
  }

  async function levelUpCheck() {
    var G = window.G, p = G.player, T = window.LEVEL_TABLE;
    while (p.lv < T.length && p.exp >= T[p.lv].exp) {
      var prev = T[p.lv - 1], next = T[p.lv];
      p.lv++;
      p.maxhp = next.maxhp; p.maxmp = next.maxmp;
      p.str = next.str; p.vit = next.vit;
      p.hp = p.maxhp; p.mp = p.maxmp; // full heal on level up (kind for mobile play)
      if (window.SFX) SFX.play("level");
      await bsay("ゆうしゃは レベル " + p.lv + " に あがった！\nＨＰ+" + (next.maxhp - prev.maxhp) + "　ちから+" + (next.str - prev.str));
      for (var i = 0; i < window.SPELLS.length; i++) {
        var s = window.SPELLS[i];
        if (s.learnLv === p.lv && p.spells.indexOf(s.id) < 0) {
          p.spells.push(s.id);
          await bsay("じゅもん『" + s.name + "』を おぼえた！\n（" + s.desc + "）");
        }
      }
      refreshStatus();
    }
  }

  async function start(enemyId, opts) {
    opts = opts || {};
    var G = window.G;
    var def = window.ENEMY_BY_ID[enemyId];
    var e = { id: def.id, name: def.name, icon: def.icon, lv: def.lv, hp: def.hp, maxhp: def.hp,
              atk: def.atk, def: def.def, exp: def.exp, gold: def.gold, traits: def.traits };
    var isBoss = e.traits.indexOf("boss") >= 0;
    var quizTime = e.traits.indexOf("hasty") >= 0 ? 3.5 : 5;

    var scr = $("battle-screen");
    scr.style.display = "block";
    var sp = $("enemy-sprite");
    sp.textContent = e.icon;
    sp.className = isBoss ? "boss" : "";
    $("enemy-name-tag").textContent = e.name + "（TOEIC" + e.lv + "）";
    setEnemyHp(e);
    refreshStatus();
    if (window.SFX) SFX.play(isBoss ? "boss" : "encounter");
    await bsay(e.name + "が あらわれた！" + (quizTime < 5 ? "\n（せっかち：制限時間 " + quizTime + " 秒！）" : ""));

    var result = null, gotExp = 0, gotGold = 0;

    while (!result) {
      var cmd = await window.UI.menu($("battle-cmd"), [
        { label: "たたかう" }, { label: "じゅもん" }, { label: "どうぐ" }, { label: "にげる" }
      ], "コマンド");

      if (cmd === 0) {
        // ---- attack: answer a word at the enemy's level ----
        var q = await window.QUIZ.ask(e.lv, { time: quizTime });
        if (q.correct) {
          var crit = q.elapsed <= 2;
          var dmg = Math.max(1, pAtk() - Math.round(e.def / 2) + rnd(5));
          if (crit) dmg *= 2;
          if (e.id === "metal" && !crit) dmg = 1; // metal body unless critical
          await playerHit(e, dmg, crit);
        } else {
          await bsay("ゆうしゃの こうげきは\nからぶりに おわった！");
        }
      } else if (cmd === 1) {
        // ---- spells ----
        var learned = window.SPELLS.filter(function (s) { return G.player.spells.indexOf(s.id) >= 0 && s.type !== "field"; });
        if (!learned.length) { await bsay("まだ じゅもんを おぼえていない！"); continue; }
        var items = learned.map(function (s) {
          return { label: s.name + "　MP" + s.mp, disabled: G.player.mp < s.mp };
        });
        var si = await window.UI.menu($("battle-sub"), items, "じゅもん");
        if (si < 0) continue;
        var spell = learned[si];
        if (G.player.mp < spell.mp) { await bsay("ＭＰが たりない！"); continue; }
        G.player.mp -= spell.mp;
        refreshStatus();
        await bsay("ゆうしゃは『" + spell.name + "』を となえた！\n（TOEIC" + spell.quizLv + " の単語に こたえよ！）");
        var qs = await window.QUIZ.ask(spell.quizLv, { time: quizTime });
        if (!qs.correct) {
          await bsay("じゅもんは ふはつに おわった…！");
        } else if (spell.type === "heal") {
          var h = spell.power;
          G.player.hp = Math.min(G.player.maxhp, G.player.hp + h);
          refreshStatus();
          if (window.SFX) SFX.play("heal");
          await bsay("ＨＰが " + h + " かいふくした！");
        } else {
          var sd = Math.round(spell.power * (0.85 + Math.random() * 0.3));
          if (qs.elapsed <= 2) sd = Math.round(sd * 1.3);
          await playerHit(e, sd, qs.elapsed <= 2);
        }
      } else if (cmd === 2) {
        // ---- items ----
        var inv = [];
        if (G.player.items.herb > 0) inv.push({ key: "herb", label: "ハーブティー ×" + G.player.items.herb });
        if (G.player.items.elixir > 0) inv.push({ key: "elixir", label: "しゅうちゅうコーヒー ×" + G.player.items.elixir });
        if (!inv.length) { await bsay("つかえる どうぐを もっていない！"); continue; }
        var ii = await window.UI.menu($("battle-sub"), inv, "どうぐ");
        if (ii < 0) continue;
        if (inv[ii].key === "herb") {
          G.player.items.herb--;
          G.player.hp = Math.min(G.player.maxhp, G.player.hp + 30);
          await bsay("ハーブティーを のんだ！\nＨＰが 30 かいふくした。");
        } else {
          G.player.items.elixir--;
          G.player.mp = Math.min(G.player.maxmp, G.player.mp + 40);
          await bsay("しゅうちゅうコーヒーを のんだ！\nＭＰが 40 かいふくした。");
        }
        refreshStatus();
      } else {
        // ---- flee ----
        if (isBoss) { await bsay("にげられない！！"); }
        else if (Math.random() < 0.55) {
          await bsay("ゆうしゃは にげだした！");
          result = { result: "flee" };
          break;
        } else {
          await bsay("しかし にげられなかった！");
        }
      }

      if (e.hp <= 0) {
        $("enemy-sprite").classList.add("dead");
        if (window.SFX) SFX.play("win");
        await bsay(e.name + "を たおした！");
        gotExp = e.exp; gotGold = e.gold;
        if (gotExp || gotGold) {
          G.player.exp += gotExp; G.player.gold += gotGold;
          await bsay("けいけんち " + gotExp + " かくとく！\n" + gotGold + " ゴールドを てにいれた！");
          await levelUpCheck();
        }
        result = { result: "win", exp: gotExp, gold: gotGold };
        break;
      }

      // enemy turn (unless player already resolved battle)
      var et = await enemyTurn(e);
      if (et === "fled") { result = { result: "enemyfled" }; break; }
      if (et === "dead") {
        await bsay("ゆうしゃは しんでしまった…");
        result = { result: "lose" };
        break;
      }
    }

    scr.style.display = "none";
    return result;
  }

  window.BATTLE = { start: start };
})();
