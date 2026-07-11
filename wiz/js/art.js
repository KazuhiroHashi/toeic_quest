// WORD WIZ - procedural SVG art for spirit cards & void enemies
// CardArt.svg(card, {evo, enemy, boss}) -> svg string (viewBox 0 0 200 240)
(function () {
  "use strict";

  var uid = 0;

  function star(x, y, r, fill, op) {
    return '<path d="M' + x + ' ' + (y - r) + ' L' + (x + r * 0.28) + ' ' + (y - r * 0.28) +
      " L" + (x + r) + " " + y + " L" + (x + r * 0.28) + " " + (y + r * 0.28) +
      " L" + x + " " + (y + r) + " L" + (x - r * 0.28) + " " + (y + r * 0.28) +
      " L" + (x - r) + " " + y + " L" + (x - r * 0.28) + " " + (y - r * 0.28) +
      ' Z" fill="' + fill + '" opacity="' + (op || 0.9) + '"/>';
  }

  // element motif silhouette behind character
  function motif(elem, c) {
    switch (elem) {
      case "fire": return '<path d="M100 30 C120 55 132 70 132 95 C132 118 118 132 100 132 C82 132 68 118 68 95 C68 82 74 74 80 64 C80 80 88 86 92 84 C86 66 92 46 100 30 Z" fill="' + c + '" opacity=".18"/>';
      case "water": return '<path d="M100 32 C118 60 134 78 134 102 C134 124 119 138 100 138 C81 138 66 124 66 102 C66 78 82 60 100 32 Z" fill="' + c + '" opacity=".18"/>';
      case "thunder": return '<path d="M112 28 L76 92 L98 92 L86 140 L128 76 L104 76 L120 28 Z" fill="' + c + '" opacity=".18"/>';
      case "light": return star(100, 84, 52, c, 0.18);
      case "dark": return '<path d="M124 30 A52 52 0 1 0 124 134 A42 42 0 1 1 124 30 Z" fill="' + c + '" opacity=".2"/>';
    }
    return "";
  }

  function eyes(x1, x2, y, col, glow) {
    var s = "";
    [x1, x2].forEach(function (x) {
      if (glow) {
        s += '<ellipse cx="' + x + '" cy="' + y + '" rx="9" ry="12" fill="' + col + '"/>' +
             '<ellipse cx="' + x + '" cy="' + y + '" rx="4.5" ry="6" fill="#fff" opacity=".85"/>';
      } else {
        s += '<ellipse cx="' + x + '" cy="' + y + '" rx="10" ry="12.5" fill="#372b47"/>' +
             '<circle cx="' + (x - 3.4) + '" cy="' + (y - 4) + '" r="3.6" fill="#fff"/>' +
             '<circle cx="' + (x + 3.6) + '" cy="' + (y + 4.5) + '" r="1.8" fill="#fff" opacity=".85"/>';
      }
    });
    return s;
  }

  function blush(x1, x2, y) {
    return '<ellipse cx="' + x1 + '" cy="' + y + '" rx="8" ry="4.5" fill="#ff8fa3" opacity=".5"/>' +
           '<ellipse cx="' + x2 + '" cy="' + y + '" rx="8" ry="4.5" fill="#ff8fa3" opacity=".5"/>';
  }

  function catMouth(y) {
    return '<path d="M93 ' + y + ' Q97 ' + (y + 5) + ' 100 ' + y + ' Q103 ' + (y + 5) + ' 107 ' + y +
      '" fill="none" stroke="#372b47" stroke-width="2.4" stroke-linecap="round"/>';
  }
  function smile(y, w) {
    w = w || 7;
    return '<path d="M' + (100 - w) + " " + y + " Q100 " + (y + 7) + " " + (100 + w) + " " + y +
      '" fill="none" stroke="#372b47" stroke-width="2.6" stroke-linecap="round"/>';
  }

  // species features: returns {behind, front, bodyPath}
  function species(sp, P, opts) {
    var b = "", f = "", bodyPath = null;
    var inner = "#ffd9e8", lineCol = opts.enemy ? "#1a1426" : P.deep;
    switch (sp) {
      case "fox":
        b += '<path d="M62 76 L54 34 L88 58 Z" fill="' + P.body + '"/><path d="M64 68 L60 44 L80 58 Z" fill="' + inner + '" opacity=".8"/>' +
             '<path d="M138 76 L146 34 L112 58 Z" fill="' + P.body + '"/><path d="M136 68 L140 44 L120 58 Z" fill="' + inner + '" opacity=".8"/>' +
             '<path d="M150 150 C182 140 184 108 166 96 C176 122 158 138 142 138 Z" fill="' + P.body + '"/>' +
             '<path d="M166 106 C172 120 162 132 150 134 C162 128 166 118 166 106 Z" fill="#fff" opacity=".75"/>';
        break;
      case "cat":
        b += '<path d="M62 78 L56 36 L90 56 Z" fill="' + P.body + '"/><path d="M65 70 L62 46 L82 58 Z" fill="' + inner + '" opacity=".75"/>' +
             '<path d="M138 78 L144 36 L110 56 Z" fill="' + P.body + '"/><path d="M135 70 L138 46 L118 58 Z" fill="' + inner + '" opacity=".75"/>' +
             '<path d="M148 158 C176 156 182 130 170 118 C174 138 162 148 146 146 Z" fill="' + P.body + '"/>';
        f += '<g stroke="' + lineCol + '" stroke-width="1.6" opacity=".65" stroke-linecap="round">' +
             '<path d="M52 108 L34 104"/><path d="M52 116 L34 118"/><path d="M148 108 L166 104"/><path d="M148 116 L166 118"/></g>';
        break;
      case "rabbit":
        b += '<ellipse cx="80" cy="42" rx="13" ry="34" fill="' + P.body + '" transform="rotate(-8 80 42)"/>' +
             '<ellipse cx="80" cy="46" rx="6.5" ry="24" fill="' + inner + '" opacity=".8" transform="rotate(-8 80 46)"/>' +
             '<ellipse cx="120" cy="42" rx="13" ry="34" fill="' + P.body + '" transform="rotate(8 120 42)"/>' +
             '<ellipse cx="120" cy="46" rx="6.5" ry="24" fill="' + inner + '" opacity=".8" transform="rotate(8 120 46)"/>';
        break;
      case "bird":
        b += '<path d="M50 118 C28 110 24 88 38 76 C36 96 48 106 62 108 Z" fill="' + P.body + '"/>' +
             '<path d="M150 118 C172 110 176 88 162 76 C164 96 152 106 138 108 Z" fill="' + P.body + '"/>' +
             '<path d="M100 52 C96 40 104 34 108 42 C112 34 120 40 112 52 Z" fill="' + P.deep + '" opacity=".9"/>';
        f += '<path d="M93 126 L100 136 L107 126 Q100 121 93 126 Z" fill="#ffb340" stroke="#e08e1f" stroke-width="1.5"/>';
        break;
      case "dragon":
        b += '<path d="M74 48 L66 24 L90 42 Z" fill="' + P.deep + '"/><path d="M126 48 L134 24 L110 42 Z" fill="' + P.deep + '"/>' +
             '<path d="M46 128 C24 118 22 94 40 84 C34 104 46 116 60 118 Z" fill="' + P.deep + '" opacity=".85"/>' +
             '<path d="M154 128 C176 118 178 94 160 84 C166 104 154 116 140 118 Z" fill="' + P.deep + '" opacity=".85"/>';
        break;
      case "drop":
        bodyPath = '<path d="M100 26 C130 66 148 92 148 130 C148 166 126 190 100 190 C74 190 52 166 52 130 C52 92 70 66 100 26 Z" fill="url(#body{U})"/>';
        b += '<circle cx="100" cy="20" r="7" fill="' + P.body + '"/>';
        break;
      case "squirrel":
        b += '<path d="M146 168 C190 160 196 96 158 82 C186 114 172 152 134 152 Z" fill="' + P.body + '"/>' +
             '<path d="M162 100 C176 118 170 142 150 148 C166 136 168 116 162 100 Z" fill="#fff" opacity=".6"/>' +
             '<circle cx="74" cy="58" r="13" fill="' + P.body + '"/><circle cx="74" cy="58" r="6.5" fill="' + inner + '" opacity=".8"/>' +
             '<circle cx="126" cy="58" r="13" fill="' + P.body + '"/><circle cx="126" cy="58" r="6.5" fill="' + inner + '" opacity=".8"/>';
        break;
      case "pup":
        b += '<path d="M60 56 C42 60 40 92 56 100 L70 66 Z" fill="' + P.deep + '"/>' +
             '<path d="M140 56 C158 60 160 92 144 100 L130 66 Z" fill="' + P.deep + '"/>';
        break;
      case "ram":
        b += '<path d="M64 62 A16 16 0 1 0 80 84 A10 10 0 1 1 64 62 Z" fill="#e8b04a"/>' +
             '<path d="M136 62 A16 16 0 1 0 120 84 A10 10 0 1 1 136 62 Z" fill="#e8b04a"/>';
        for (var i = 0; i < 7; i++) {
          var a = Math.PI * (0.16 + i * 0.113);
          b += '<circle cx="' + (100 - Math.cos(a) * 58).toFixed(1) + '" cy="' + (108 - Math.sin(a) * 50).toFixed(1) + '" r="14" fill="' + P.body + '"/>';
        }
        break;
      case "unicorn":
        b += '<path d="M100 16 L92 52 L108 52 Z" fill="url(#horn{U})"/>' +
             '<path d="M70 52 C58 40 60 60 66 66 Z" fill="' + P.deep + '" opacity=".7"/>' +
             '<path d="M74 44 C66 30 82 36 82 48 Z" fill="' + P.deep + '" opacity=".7"/>' +
             '<path d="M64 78 L58 46 L86 62 Z" fill="' + P.body + '"/><path d="M136 78 L142 46 L114 62 Z" fill="' + P.body + '"/>';
        break;
      case "bat":
        b += '<path d="M56 96 C20 78 14 110 30 122 C36 112 44 112 50 120 C54 112 60 112 66 118 Z" fill="' + P.deep + '"/>' +
             '<path d="M144 96 C180 78 186 110 170 122 C164 112 156 112 150 120 C146 112 140 112 134 118 Z" fill="' + P.deep + '"/>' +
             '<path d="M70 66 L64 40 L88 54 Z" fill="' + P.body + '"/><path d="M130 66 L136 40 L112 54 Z" fill="' + P.body + '"/>';
        f += '<path d="M94 128 L97 134 L100 128 Z" fill="#fff"/><path d="M100 128 L103 134 L106 128 Z" fill="#fff"/>';
        break;
      case "whale":
        bodyPath = '<ellipse cx="100" cy="128" rx="66" ry="52" fill="url(#body{U})"/>';
        b += '<path d="M158 158 C186 148 190 168 178 176 C186 178 180 192 164 186 C154 182 152 168 158 158 Z" fill="' + P.body + '"/>' +
             '<path d="M96 62 C90 46 96 38 100 46 C104 38 110 46 104 62 Z" fill="#9fd9ff"/>' +
             '<circle cx="92" cy="34" r="4" fill="#9fd9ff"/><circle cx="108" cy="30" r="3" fill="#9fd9ff"/>';
        f += '<path d="M56 152 Q100 168 144 152" fill="none" stroke="#fff" stroke-width="3" opacity=".5"/>' +
             '<path d="M60 162 Q100 176 140 162" fill="none" stroke="#fff" stroke-width="3" opacity=".35"/>';
        break;
      case "mouse":
        b += '<circle cx="66" cy="52" r="20" fill="' + P.body + '"/><circle cx="66" cy="52" r="11" fill="' + inner + '" opacity=".8"/>' +
             '<circle cx="134" cy="52" r="20" fill="' + P.body + '"/><circle cx="134" cy="52" r="11" fill="' + inner + '" opacity=".8"/>' +
             '<path d="M148 170 C170 176 178 160 170 150 C172 162 160 168 148 162 Z" fill="' + P.body + '" opacity=".9"/>';
        break;
      case "blob":
        bodyPath = '<path d="M100 40 C142 40 158 74 154 110 C170 116 168 136 152 138 C150 168 128 184 100 184 C72 184 50 168 48 138 C32 136 30 116 46 110 C42 74 58 40 100 40 Z" fill="url(#body{U})"/>';
        break;
    }
    return { behind: b, front: f, bodyPath: bodyPath };
  }

  function svg(card, opts) {
    opts = opts || {};
    var u = ++uid;
    var E = window.ELEMS[card.elem];
    var enemy = !!opts.enemy;
    var P = {
      body: enemy ? "#332b47" : E.c1,
      body2: enemy ? "#1c1730" : E.c2,
      deep: enemy ? "#241d38" : E.deep
    };
    var sp = species(card.sp, P, opts);
    var s = '<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">';
    s += "<defs>" +
      '<radialGradient id="bg' + u + '" cx="50%" cy="32%" r="80%">' +
      '<stop offset="0%" stop-color="' + (enemy ? "#3d3355" : E.c2) + '"/>' +
      '<stop offset="100%" stop-color="' + (enemy ? "#120e20" : E.deep) + '"/></radialGradient>' +
      '<linearGradient id="body' + u + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + (enemy ? "#453a63" : E.c2) + '"/>' +
      '<stop offset="100%" stop-color="' + P.body + '"/></linearGradient>' +
      '<linearGradient id="horn' + u + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#fff3c4"/><stop offset="100%" stop-color="#e8b04a"/></linearGradient>' +
      "</defs>";
    s += '<rect width="200" height="240" rx="14" fill="url(#bg' + u + ')"/>';
    // ambient decoration
    s += '<circle cx="30" cy="200" r="26" fill="#fff" opacity=".05"/><circle cx="176" cy="40" r="30" fill="#fff" opacity=".06"/>';
    s += motif(card.elem, enemy ? "#000" : "#fff");
    s += star(34, 44, 7, "#fff", 0.55) + star(168, 150, 5, "#fff", 0.4) + star(150, 26, 4, "#fff", 0.45);
    if (opts.evo) {
      s += '<circle cx="100" cy="118" r="78" fill="none" stroke="' + E.c2 + '" stroke-width="3" opacity=".55"/>' +
           '<circle cx="100" cy="118" r="86" fill="none" stroke="' + E.c2 + '" stroke-width="1.5" opacity=".35"/>' +
           star(100, 34, 8, E.c2, 0.9) + star(28, 118, 6, E.c2, 0.7) + star(172, 118, 6, E.c2, 0.7);
    }
    // ground shadow
    s += '<ellipse cx="100" cy="196" rx="52" ry="10" fill="#000" opacity=".28"/>';
    s += sp.behind.replace(/\{U\}/g, u);
    // body
    s += (sp.bodyPath || '<circle cx="100" cy="118" r="62" fill="url(#body{U})"/>').replace(/\{U\}/g, u);
    // belly highlight
    if (!sp.bodyPath) s += '<ellipse cx="100" cy="146" rx="34" ry="24" fill="#fff" opacity="' + (enemy ? ".08" : ".35") + '"/>';
    // feet nubs
    s += '<ellipse cx="76" cy="184" rx="13" ry="9" fill="' + P.body + '"/><ellipse cx="124" cy="184" rx="13" ry="9" fill="' + P.body + '"/>';
    // face
    var eyeY = card.sp === "whale" ? 114 : 106;
    if (enemy) {
      s += eyes(80, 120, eyeY, E.c1, true);
      s += '<path d="M88 132 L94 126 L100 132 L106 126 L112 132" fill="none" stroke="' + E.c1 + '" stroke-width="2.6" stroke-linecap="round" opacity=".9"/>';
      s += '<circle cx="46" cy="80" r="4" fill="' + E.c1 + '" opacity=".7"/><circle cx="158" cy="96" r="3" fill="' + E.c1 + '" opacity=".6"/><circle cx="164" cy="70" r="2.5" fill="' + E.c1 + '" opacity=".5"/>';
    } else {
      s += eyes(80, 120, eyeY, null, false);
      s += card.sp === "cat" ? catMouth(eyeY + 18) : card.sp === "bird" ? "" : smile(eyeY + 18);
      s += blush(66, 134, eyeY + 14);
    }
    s += sp.front.replace(/\{U\}/g, u);
    // witch hat (mascot)
    if (card.hat) {
      s += '<g transform="rotate(-8 100 60)">' +
           '<ellipse cx="100" cy="62" rx="44" ry="11" fill="#43306b"/>' +
           '<path d="M100 -2 C112 20 118 40 122 58 C108 66 92 66 78 58 C84 38 90 18 100 -2 Z" fill="#54408a"/>' +
           '<path d="M78 52 Q100 62 122 52 L122 58 Q100 68 78 58 Z" fill="#8a5fd6"/>' +
           star(112, 30, 6, "#ffd54a", 1) + "</g>";
    }
    if (opts.boss) {
      s += '<path d="M72 30 L80 12 L92 26 L100 8 L108 26 L120 12 L128 30 Z" fill="#ffd54a" stroke="#c8951d" stroke-width="2"/>';
    }
    return s + "</svg>";
  }

  window.CardArt = { svg: svg };
})();
