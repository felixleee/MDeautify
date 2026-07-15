/* Custom SVG diagram renderer (browser + node). Replaces mermaid with the
   navy technical-spec style used in the first PDF. Parses erDiagram / flowchart
   / sequenceDiagram and returns an <svg> string. Exposed as window.DIAG. */
(function (root) {
  const FONT = "Malgun Gothic, Noto Sans CJK KR, sans-serif";
  const MONO = "Consolas, DejaVu Sans Mono, monospace";
  const INK = "#1f2937", BORDER = "#94a3b8", ROWALT = "#f1f5f9";
  let HEAD = "#1e3a5f", ACCENT = "#2563eb";
  const themeColor = (name, fb) => { try { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fb; } catch (e) { return fb; } };
  // 테마색(HSL) 유틸: 하드코딩 팔레트 대신 --brand/--accent 에서 조화로운 다색을 생성
  function hexToHsl(hex) {
    hex = (hex || "").replace("#", ""); if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
    let r = parseInt(hex.slice(0, 2), 16) / 255, g = parseInt(hex.slice(2, 4), 16) / 255, b = parseInt(hex.slice(4, 6), 16) / 255;
    if (isNaN(r) || isNaN(g) || isNaN(b)) return [220, 0.5, 0.4];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0, l = (mx + mn) / 2;
    if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
    return [h * 360, s, l];
  }
  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const cf = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    const to = v => ("0" + Math.round(v * 255).toString(16)).slice(-2);
    return "#" + to(cf(h + 1 / 3)) + to(cf(h)) + to(cf(h - 1 / 3));
  }
  // ACCENT 색상(hue) 기준 어두움→밝음 명도 램프로 n개 색 생성(테마 일관 · 서로 구분됨)
  function themeSeries(n) {
    const a = hexToHsl(ACCENT); if (n <= 1) return [ACCENT];
    const loL = 0.34, hiL = 0.66, out = [];
    for (let i = 0; i < n; i++) { const t = i / (n - 1); out.push(hslToHex(a[0], Math.max(0.3, Math.min(0.85, a[1] * (1 - 0.1 * t))), loL + (hiL - loL) * t)); }
    return out;
  }
  // 보조 색(비-PK 키 등): ACCENT hue의 채도 낮춘 중간톤 — 테마와 어울리는 뉴트럴
  const themeMuted = () => { const a = hexToHsl(ACCENT); return hslToHex(a[0], 0.28, 0.46); };

  function esc(s) {
    return String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  }
  // CJK 인지 텍스트 폭 추정(한글/전각≈1em, 그 외≈0.55em)
  function textW(s, fs) {
    let w = 0;
    for (const ch of String(s)) w += /[ᄀ-ᇿ　-〿㄰-㆏가-힣＀-￯]/.test(ch) ? fs : fs * 0.55;
    return w;
  }
  // 긴 라벨 줄을 maxw 폭에 맞춰 여러 줄로 자동 줄바꿈(공백 우선, 한글 등은 문자 단위)
  function wrapLine(s, maxw, fs) {
    s = String(s);
    if (textW(s, fs) <= maxw) return [s];
    const lines = []; let cur = "";
    const flush = () => { if (cur.trim()) lines.push(cur.trim()); cur = ""; };
    for (const p of s.split(/(\s+)/)) {
      if (textW(cur + p, fs) <= maxw) { cur += p; continue; }
      if (cur.trim()) flush();
      if (textW(p, fs) <= maxw) { cur = p.replace(/^\s+/, ""); continue; }
      let chunk = "";
      for (const ch of p) {
        if (textW(chunk + ch, fs) <= maxw) chunk += ch;
        else { if (chunk) lines.push(chunk); chunk = ch; }
      }
      cur = chunk;
    }
    flush();
    return lines.length ? lines : [s];
  }
  function stripQuotes(s) { return String(s).trim().replace(/^["']|["']$/g, "").trim(); }

  // ---------------- ERD ----------------
  function cardOf(sym) {
    if (!sym) return "";
    const many = /[{}]/.test(sym), opt = /o/.test(sym);
    if (many) return opt ? "0..N" : "1..N";
    return opt ? "0..1" : "1";
  }
  function erd(entities, relations) {
    relations = relations || [];
    const rh = 22, bw = 210, gapX = 65, perRow = 3;
    const pos = []; const parts = [];
    const x0 = 20, y0 = 60; let rowY = y0, maxH = 0;
    entities.forEach((ent, i) => {
      const col = i % perRow;
      if (col === 0 && i > 0) { rowY += maxH + 50; maxH = 0; }
      const x = x0 + col * (bw + gapX), y = rowY;
      const h = rh + ent.rows.length * rh;
      maxH = Math.max(maxH, h);
      pos.push({ x, y, h });
      parts.push(`<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="6" fill="#fff" stroke="${BORDER}" stroke-width="1.2"/>`);
      parts.push(`<rect x="${x}" y="${y}" width="${bw}" height="${rh}" rx="6" fill="${HEAD}"/>`);
      parts.push(`<rect x="${x}" y="${y + rh - 6}" width="${bw}" height="6" fill="${HEAD}"/>`);
      parts.push(`<text x="${x + bw / 2}" y="${y + 15}" text-anchor="middle" fill="#fff" font-family="${MONO}" font-size="12" font-weight="bold">${esc(ent.title)}</text>`);
      ent.rows.forEach((r, j) => {
        const ry = y + rh + j * rh;
        if (j % 2 === 1) parts.push(`<rect x="${x + 1}" y="${ry}" width="${bw - 2}" height="${rh}" fill="${ROWALT}"/>`);
        parts.push(`<text x="${x + 10}" y="${ry + 15}" fill="${INK}" font-family="${MONO}" font-size="10.5">${esc(r.name)}<tspan fill="#64748b">  ${esc(r.type)}</tspan></text>`);
        if (r.key) {
          const c = r.key === "PK" ? ACCENT : themeMuted();
          parts.push(`<text x="${x + bw - 10}" y="${ry + 15}" text-anchor="end" fill="${c}" font-family="${MONO}" font-size="9" font-weight="bold">${esc(r.key)}</text>`);
        }
      });
    });
    relations.forEach(rel => {
      const a = pos[rel.a], b = pos[rel.b];
      if (!a || !b) return;
      const y = a.y + 60;
      const x1 = a.x + bw, x2 = b.x;
      parts.push(`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${ACCENT}" stroke-width="1.4"/>`);
      if (rel.leftCard) parts.push(`<text x="${x1 + 6}" y="${y - 5}" fill="${ACCENT}" font-family="${MONO}" font-size="9">${esc(rel.leftCard)}</text>`);
      if (rel.rightCard) parts.push(`<text x="${x2 - 6}" y="${y - 5}" text-anchor="end" fill="${ACCENT}" font-family="${MONO}" font-size="9">${esc(rel.rightCard)}</text>`);
      if (rel.label) parts.push(`<text x="${(x1 + x2) / 2}" y="${y + 14}" text-anchor="middle" fill="#64748b" font-family="${MONO}" font-size="8">${esc(rel.label)}</text>`);
    });
    const totalH = rowY + maxH + 20;
    return `<svg viewBox="0 0 800 ${totalH}" width="800" height="${totalH}" xmlns="http://www.w3.org/2000/svg" font-family="${FONT}">${parts.join("")}</svg>`;
  }

  function parseEr(code) {
    const lines = code.split("\n").map(l => l.trim()).filter(l => l && l !== "erDiagram");
    const entities = []; const index = {}; const relations = [];
    let cur = null;
    const relRe = /^(\S+)\s+([|}{o<>.ox\-]+)\s+(\S+)\s*:\s*(.+)$/;
    for (const line of lines) {
      if (cur) {
        if (line === "}") { cur = null; continue; }
        const t = line.replace(/\s+/g, " ").split(" ");
        if (t.length >= 2) {
          const type = t[0], name = t[1];
          let key = "";
          if (t[2] && /^(PK|FK|UK)$/i.test(t[2])) key = t[2].toUpperCase();
          cur.rows.push({ name, type, key });
        }
        continue;
      }
      const em = line.match(/^([\w가-힣ㄱ-ㅎㅏ-ㅣ]+)\s*\{$/);
      if (em) { cur = { title: em[1], rows: [] }; entities.push(cur); index[em[1]] = entities.length - 1; continue; }
      const rm = line.match(relRe);
      if (rm) {
        const sym = rm[2]; const cm = sym.match(/^(.*?)([-.]{2,})(.*)$/);
        const left = cm ? cm[1] : "", right = cm ? cm[3] : "";
        relations.push({ aName: rm[1], bName: rm[3], label: stripQuotes(rm[4]), leftCard: cardOf(left), rightCard: cardOf(right) });
      }
    }
    relations.forEach(r => { r.a = index[r.aName]; r.b = index[r.bName]; });
    return { entities, relations: relations.filter(r => r.a != null && r.b != null) };
  }

  // ---------------- Flow (계층형 레이아웃) ----------------
  // 노드 팔레트는 flow() 안에서 테마색(themeSeries)으로 생성

  function cleanLabel(s) {
    return String(s).replace(/^["']|["']$/g, "").replace(/<br\s*\/?>/gi, "\n").trim();
  }

  function parseFlow(code) {
    const raw = code.split("\n").map(l => l.trim()).filter(l => l && !/^%%/.test(l));
    const first = raw.shift() || "";
    let dir = "TD";
    const dm = first.match(/\b(TB|TD|BT|LR|RL)\b/i);
    if (dm) dir = dm[1].toUpperCase();
    if (dir === "TB") dir = "TD";
    const nodes = {}, order = [], edges = [];
    function ensure(id, label, shape) {
      if (!nodes[id]) { nodes[id] = { id, label: label != null ? label : id, shape: shape || "rect" }; order.push(id); }
      else if (label != null) { nodes[id].label = label; if (shape) nodes[id].shape = shape; }
      return id;
    }
    function nodeTok(tok) {
      tok = tok.trim(); if (!tok) return null;
      let m;
      if (m = tok.match(/^([\w가-힣ㄱ-ㅎㅏ-ㅣ]+)\(\[([\s\S]*)\]\)$/)) return ensure(m[1], cleanLabel(m[2]), "stadium");
      if (m = tok.match(/^([\w가-힣ㄱ-ㅎㅏ-ㅣ]+)\(\(([\s\S]*)\)\)$/)) return ensure(m[1], cleanLabel(m[2]), "circle");
      if (m = tok.match(/^([\w가-힣ㄱ-ㅎㅏ-ㅣ]+)\{([\s\S]*)\}$/)) return ensure(m[1], cleanLabel(m[2]), "diamond");
      if (m = tok.match(/^([\w가-힣ㄱ-ㅎㅏ-ㅣ]+)\[([\s\S]*)\]$/)) return ensure(m[1], cleanLabel(m[2]), "rect");
      if (m = tok.match(/^([\w가-힣ㄱ-ㅎㅏ-ㅣ]+)\(([\s\S]*)\)$/)) return ensure(m[1], cleanLabel(m[2]), "round");
      if (m = tok.match(/^([\w가-힣ㄱ-ㅎㅏ-ㅣ]+)$/)) return ensure(m[1], null, "rect");
      const mm = tok.match(/^([\w가-힣ㄱ-ㅎㅏ-ㅣ]+)/);
      return mm ? ensure(mm[1], null, "rect") : null;
    }
    for (let line of raw) {
      if (/^(subgraph|end|direction|classDef|class|style|linkStyle)\b/.test(line)) continue;
      // "A -- 라벨 --> B" 형태를 "A -->|라벨| B" 로 정규화
      line = line.replace(/--\s+([^->|][^>]*?)\s+-->/g, "-->|$1|");
      const rx = /(-->|-\.->|==>|--x|--o)\s*(?:\|([^|]*)\|)?\s*/g;
      const toks = []; const labs = []; let last = 0, m;
      while ((m = rx.exec(line)) !== null) { toks.push(line.slice(last, m.index)); labs.push(m[2] || ""); last = rx.lastIndex; }
      toks.push(line.slice(last));
      const ids = toks.map(nodeTok);
      for (let i = 0; i < ids.length - 1; i++) {
        if (ids[i] && ids[i + 1]) edges.push({ from: ids[i], to: ids[i + 1], label: cleanLabel(labs[i] || "") });
      }
    }
    return { nodes, order, edges, dir };
  }

  function computeRanks(order, edges) {
    const rank = {}; order.forEach(id => rank[id] = 0);
    for (let iter = 0; iter < order.length + 2; iter++) {
      let changed = false;
      edges.forEach(e => { if (rank[e.to] != null && rank[e.from] != null && rank[e.to] < rank[e.from] + 1) { rank[e.to] = rank[e.from] + 1; changed = true; } });
      if (!changed) break;
    }
    return rank;
  }

  function arrowHead(x, y, dir) {
    const s = 5;
    if (dir === "down") return `<polygon points="${x - s},${y - s - 1} ${x + s},${y - s - 1} ${x},${y}" fill="${BORDER}"/>`;
    if (dir === "up") return `<polygon points="${x - s},${y + s + 1} ${x + s},${y + s + 1} ${x},${y}" fill="${BORDER}"/>`;
    if (dir === "left") return `<polygon points="${x + s + 1},${y - s} ${x + s + 1},${y + s} ${x},${y}" fill="${BORDER}"/>`;
    return `<polygon points="${x - s - 1},${y - s} ${x - s - 1},${y + s} ${x},${y}" fill="${BORDER}"/>`; // right
  }

  function drawNode(parts, nd, p, c) {
    const lines = nd._lines || String(nd.label).split("\n");
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    if (nd.shape === "point") { // stateDiagram [*] 시작/끝점
      parts.push(`<circle cx="${cx}" cy="${cy}" r="13" fill="none" stroke="${INK}" stroke-width="1.5"/>`);
      parts.push(`<circle cx="${cx}" cy="${cy}" r="8" fill="${INK}"/>`);
      return;
    }
    if (nd.shape === "diamond") {
      parts.push(`<polygon points="${cx},${p.y} ${p.x + p.w},${cy} ${cx},${p.y + p.h} ${p.x},${cy}" fill="#fff" stroke="${c}" stroke-width="1.6"/>`);
    } else if (nd.shape === "circle") {
      parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${p.w / 2}" ry="${p.h / 2}" fill="#fff" stroke="${c}" stroke-width="1.6"/>`);
    } else {
      const rx = nd.shape === "stadium" ? p.h / 2 : (nd.shape === "round" ? 14 : 8);
      parts.push(`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${rx}" fill="#fff" stroke="${c}" stroke-width="1.6"/>`);
      if (nd.shape === "rect") parts.push(`<rect x="${p.x}" y="${p.y}" width="6" height="${p.h}" rx="3" fill="${c}"/>`);
    }
    const startY = cy - (lines.length - 1) * 9;
    lines.forEach((ln, k) => {
      const bold = k === 0 && lines.length > 1 ? ' font-weight="bold"' : '';
      parts.push(`<text x="${cx}" y="${startY + k * 18 + 4}" text-anchor="middle" fill="${INK}" font-family="${FONT}" font-size="12"${bold}>${esc(ln)}</text>`);
    });
  }

  function flow(parsed) {
    const { order, edges, dir } = parsed;
    if (!order.length) return `<svg viewBox="0 0 800 40" xmlns="http://www.w3.org/2000/svg"></svg>`;
    const horizontal = (dir === "LR" || dir === "RL");
    const fs = 12, WRAPW = 300;
    const size = {};
    order.forEach(id => {
      const nd = parsed.nodes[id];
      let lines = [];
      String(nd.label).split("\n").forEach(l => { lines = lines.concat(wrapLine(l, WRAPW, fs)); });
      if (!lines.length) lines = [nd.id];
      nd._lines = lines;
      let w = Math.max.apply(null, lines.map(l => textW(l, fs))) + 40;
      let h = Math.max(42, 18 + lines.length * 18);
      if (nd.shape === "diamond") { w += 40; h += 16; }
      size[id] = { w: Math.max(130, Math.ceil(w)), h: Math.ceil(h) };
    });
    // 박스 크기 균일화: 한 다이어그램 내 모든 노드를 최대 폭·높이로 통일(정돈된 그리드)
    let uw = 0, uh = 0;
    order.forEach(id => { uw = Math.max(uw, size[id].w); uh = Math.max(uh, size[id].h); });
    order.forEach(id => { size[id] = { w: uw, h: uh }; });
    const rank = computeRanks(order, edges);
    const byRank = {};
    order.forEach(id => { (byRank[rank[id]] = byRank[rank[id]] || []).push(id); });
    let ranks = Object.keys(byRank).map(Number).sort((a, b) => a - b);
    const gapMain = 52, gapCross = 30, pad = 20;

    // 랭크별 교차축 총길이, 주축 크기
    let maxCross = 0;
    ranks.forEach(r => {
      let total = 0; byRank[r].forEach(id => total += (horizontal ? size[id].h : size[id].w) + gapCross);
      total -= gapCross; byRank[r]._total = total;
      let mm = 0; byRank[r].forEach(id => mm = Math.max(mm, horizontal ? size[id].w : size[id].h));
      byRank[r]._main = mm;
      maxCross = Math.max(maxCross, total);
    });
    // 주축 오프셋
    const mainOff = {}; let acc = pad;
    ranks.forEach(r => { mainOff[r] = acc; acc += byRank[r]._main + gapMain; });
    const totalMain = acc - gapMain + pad;

    // 배치
    const pos = {};
    ranks.forEach(r => {
      const start = (maxCross - byRank[r]._total) / 2 + pad;
      let c = start;
      byRank[r].forEach(id => {
        const s = size[id];
        if (horizontal) { pos[id] = { x: mainOff[r] + (byRank[r]._main - s.w) / 2, y: c, w: s.w, h: s.h }; c += s.h + gapCross; }
        else { pos[id] = { x: c, y: mainOff[r] + (byRank[r]._main - s.h) / 2, w: s.w, h: s.h }; c += s.w + gapCross; }
      });
    });
    const W = horizontal ? totalMain : maxCross + pad * 2;
    const H = horizontal ? maxCross + pad * 2 : totalMain;

    const parts = [];
    // 엣지 (노드 아래)
    edges.forEach(e => {
      const a = pos[e.from], b = pos[e.to]; if (!a || !b) return;
      const forward = (rank[e.to] >= rank[e.from]);
      let p1, p2, ahead;
      if (horizontal) {
        p1 = { x: forward ? a.x + a.w : a.x, y: a.y + a.h / 2 };
        p2 = { x: forward ? b.x : b.x + b.w, y: b.y + b.h / 2 };
        ahead = forward ? "right" : "left";
        const mid = (p1.x + p2.x) / 2;
        parts.push(`<path d="M${p1.x},${p1.y} H${mid} V${p2.y} H${p2.x}" fill="none" stroke="${BORDER}" stroke-width="1.5"/>`);
        parts.push(arrowHead(p2.x, p2.y, ahead));
        if (e.label) { const lx = mid, ly = (p1.y + p2.y) / 2; labelChip(parts, lx, ly, e.label); }
      } else {
        p1 = { x: a.x + a.w / 2, y: forward ? a.y + a.h : a.y };
        p2 = { x: b.x + b.w / 2, y: forward ? b.y : b.y + b.h };
        ahead = forward ? "down" : "up";
        const mid = (p1.y + p2.y) / 2;
        parts.push(`<path d="M${p1.x},${p1.y} V${mid} H${p2.x} V${p2.y}" fill="none" stroke="${BORDER}" stroke-width="1.5"/>`);
        parts.push(arrowHead(p2.x, p2.y, ahead));
        if (e.label) { labelChip(parts, p2.x, mid, e.label); }
      }
    });
    // 노드
    const flowPal = themeSeries(6);
    order.forEach((id, idx) => { const p = pos[id]; if (p) drawNode(parts, parsed.nodes[id], p, flowPal[idx % flowPal.length]); });
    return `<svg viewBox="0 0 ${Math.ceil(W)} ${Math.ceil(H)}" width="${Math.ceil(W)}" height="${Math.ceil(H)}" xmlns="http://www.w3.org/2000/svg">${parts.join("")}</svg>`;
  }
  function labelChip(parts, x, y, text) {
    const w = textW(text, 10) + 8;
    parts.push(`<rect x="${x - w / 2}" y="${y - 8}" width="${w}" height="15" rx="3" fill="#fff" opacity="0.92"/>`);
    parts.push(`<text x="${x}" y="${y + 3}" text-anchor="middle" fill="#64748b" font-family="${FONT}" font-size="10">${esc(text)}</text>`);
  }

  // ---------------- Sequence ----------------
  function sequence(actors, messages) {
    const n = actors.length;
    const left = 62, right = 712;
    const xs = n > 1 ? actors.map((_, i) => left + (right - left) * i / (n - 1)) : [400];
    const top = 20, headH = 34, row = 34;
    const y0 = top + headH + 24;
    const bottom = y0 + messages.length * row + 10;
    const palette = themeSeries(6);
    const parts = [];
    actors.forEach((name, i) => {
      const x = xs[i], col = palette[i % palette.length];
      parts.push(`<line x1="${x}" y1="${top + headH}" x2="${x}" y2="${bottom}" stroke="${BORDER}" stroke-width="1" stroke-dasharray="3,3"/>`);
      parts.push(`<rect x="${x - 56}" y="${top}" width="112" height="${headH}" rx="6" fill="${col}"/>`);
      parts.push(`<text x="${x}" y="${top + 21}" text-anchor="middle" fill="#fff" font-family="${FONT}" font-size="11" font-weight="bold">${esc(name)}</text>`);
    });
    messages.forEach((m, k) => {
      const y = y0 + k * row, xa = xs[m.a], xb = xs[m.b];
      const dash = m.dashed ? ' stroke-dasharray="5,4"' : '';
      if (m.a === m.b) {
        parts.push(`<path d="M${xa},${y} h40 v16 h-40" fill="none" stroke="${INK}" stroke-width="1.2"${dash}/>`);
        parts.push(`<polygon points="${xa + 6},${y + 11} ${xa},${y + 16} ${xa + 6},${y + 21}" fill="${INK}"/>`);
        parts.push(`<text x="${xa + 48}" y="${y + 4}" fill="${INK}" font-family="${FONT}" font-size="10.5">${esc(m.label)}</text>`);
      } else {
        parts.push(`<line x1="${xa}" y1="${y}" x2="${xb}" y2="${y}" stroke="${INK}" stroke-width="1.2"${dash}/>`);
        if (xb > xa) parts.push(`<polygon points="${xb - 7},${y - 4} ${xb},${y} ${xb - 7},${y + 4}" fill="${INK}"/>`);
        else parts.push(`<polygon points="${xb + 7},${y - 4} ${xb},${y} ${xb + 7},${y + 4}" fill="${INK}"/>`);
        parts.push(`<text x="${(xa + xb) / 2}" y="${y - 5}" text-anchor="middle" fill="${INK}" font-family="${FONT}" font-size="10.5">${esc(m.label)}</text>`);
      }
    });
    return `<svg viewBox="0 0 800 ${bottom + 8}" width="800" height="${bottom + 8}" xmlns="http://www.w3.org/2000/svg">${parts.join("")}</svg>`;
  }

  function parseSeq(code) {
    const raw = code.split("\n").map(l => l.trim()).filter(l => l && l !== "sequenceDiagram");
    const ids = []; const names = {}; const index = {};
    const msgs = [];
    for (const line of raw) {
      let m = line.match(/^participant\s+([\w가-힣ㄱ-ㅎㅏ-ㅣ]+)(?:\s+as\s+(.+))?$/i);
      if (m) { const id = m[1]; if (!(id in index)) { index[id] = ids.length; ids.push(id); } names[id] = m[2] ? m[2].trim() : id; continue; }
      m = line.match(/^([\w가-힣ㄱ-ㅎㅏ-ㅣ]+)\s*(-{1,2}>>?|-{1,2}x|-{1,2}\))\s*([\w가-힣ㄱ-ㅎㅏ-ㅣ]+)\s*:\s*(.+)$/);
      if (m) {
        const from = m[1], arrow = m[2], to = m[3], label = m[4].trim();
        [from, to].forEach(id => { if (!(id in index)) { index[id] = ids.length; ids.push(id); names[id] = names[id] || id; } });
        msgs.push({ a: index[from], b: index[to], label, dashed: /--/.test(arrow) });
      }
    }
    const actors = ids.map(id => names[id]);
    return { actors, messages: msgs };
  }

  // ---------------- Pie ----------------
  // 파이 팔레트는 pie() 안에서 테마색(themeSeries)으로 생성
  function parsePie(code) {
    const lines = code.split("\n").map(l => l.trim()).filter(Boolean);
    let title = ""; const data = [];
    for (const line of lines) {
      if (/^%%/.test(line)) continue;
      let m = line.match(/^pie\s+(?:showData\s+)?title\s+(.+)$/i); if (m) { title = m[1].trim(); continue; }
      if (/^pie\b/i.test(line)) continue;
      m = line.match(/^title\s+(.+)$/i); if (m) { title = m[1].trim(); continue; }
      m = line.match(/^"([^"]*)"\s*:\s*([\d.]+)$/); if (m) { data.push({ label: m[1], value: parseFloat(m[2]) }); continue; }
      m = line.match(/^(.+?)\s*:\s*([\d.]+)$/); if (m) { data.push({ label: stripQuotes(m[1]), value: parseFloat(m[2]) }); }
    }
    return { title, data };
  }
  function pie(parsed) {
    const data = parsed.data.filter(d => d.value > 0);
    if (!data.length) return `<svg viewBox="0 0 800 60" xmlns="http://www.w3.org/2000/svg"></svg>`;
    const total = data.reduce((s, d) => s + d.value, 0);
    const cx = 175, cy = 190, r = 130;
    const pal = themeSeries(data.length);
    const parts = [];
    if (parsed.title) parts.push(`<text x="400" y="28" text-anchor="middle" fill="${INK}" font-family="${FONT}" font-size="16" font-weight="bold">${esc(parsed.title)}</text>`);
    let ang = -Math.PI / 2;
    data.forEach((d, i) => {
      const frac = d.value / total, a2 = ang + frac * 2 * Math.PI;
      const col = pal[i % pal.length];
      if (data.length === 1) { parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}"/>`); }
      else {
        const x1 = cx + r * Math.cos(ang), y1 = cy + r * Math.sin(ang), x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
        parts.push(`<path d="M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${frac > 0.5 ? 1 : 0},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z" fill="${col}" stroke="#fff" stroke-width="1.5"/>`);
      }
      const mid = (ang + a2) / 2, lr = r * 0.6, lx = cx + lr * Math.cos(mid), ly = cy + lr * Math.sin(mid);
      if (frac > 0.045) parts.push(`<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle" fill="#fff" font-family="${FONT}" font-size="12" font-weight="bold">${(frac * 100).toFixed(1)}%</text>`);
      ang = a2;
    });
    const lx0 = 350, ly0 = cy - data.length * 13 + 8;
    data.forEach((d, i) => {
      const y = ly0 + i * 26, col = pal[i % pal.length];
      parts.push(`<rect x="${lx0}" y="${y - 11}" width="14" height="14" rx="3" fill="${col}"/>`);
      parts.push(`<text x="${lx0 + 22}" y="${y}" fill="${INK}" font-family="${FONT}" font-size="13">${esc(d.label)}<tspan fill="#64748b">  ${d.value} (${(d.value / total * 100).toFixed(1)}%)</tspan></text>`);
    });
    const h = Math.max(cy + r + 30, ly0 + data.length * 26 + 20);
    return `<svg viewBox="0 0 800 ${h}" width="800" height="${h}" xmlns="http://www.w3.org/2000/svg">${parts.join("")}</svg>`;
  }

  // ---------------- State (flow 레이아웃 재사용) ----------------
  function parseState(code) {
    const raw = code.split("\n").map(l => l.trim()).filter(l => l && !/^%%/.test(l));
    raw.shift(); // stateDiagram / stateDiagram-v2
    const nodes = {}, order = [], edges = []; let dir = "TD";
    function ensure(id, label, shape) { if (!nodes[id]) { nodes[id] = { id, label: label != null ? label : id, shape: shape || "round" }; order.push(id); } else if (label != null) { nodes[id].label = label; } return id; }
    function resolve(tok, isTarget) { tok = tok.trim(); if (tok === "[*]") { return ensure(isTarget ? "__end" : "__start", "", "point"); } return ensure(tok, null, "round"); }
    for (let line of raw) {
      let m = line.match(/^direction\s+(LR|RL|TB|TD)/i); if (m) { dir = m[1].toUpperCase(); if (dir === "TB") dir = "TD"; continue; }
      if (/^(note|classDef|class|\}|state\s+\w+\s*\{)/.test(line)) continue;
      m = line.match(/^state\s+"([^"]*)"\s+as\s+(\S+)/); if (m) { ensure(m[2], cleanLabel(m[1]), "round"); continue; }
      m = line.match(/^(.+?)\s*-->\s*([^:]+?)(?:\s*:\s*(.+))?$/);
      if (m) { const a = resolve(m[1], false), b = resolve(m[2], true); edges.push({ from: a, to: b, label: cleanLabel(m[3] || "") }); continue; }
      m = line.match(/^([A-Za-z0-9_가-힣]+)\s*:\s*(.+)$/); if (m) { ensure(m[1], cleanLabel(m[2]), "round"); }
    }
    return { nodes, order, edges, dir };
  }

  // ---------------- Class ----------------
  function parseClass(code) {
    const lines = code.split("\n").map(l => l.trim()).filter(l => l && l !== "classDiagram" && !/^%%/.test(l) && !/^direction/.test(l));
    const classes = [], index = {}, relations = [];
    const relRe = /^(\S+)\s*(<\|--|--\|>|<\|\.\.|\.\.\|>|\*--|--\*|o--|--o|-->|<--|\.\.>|<\.\.|--|\.\.)\s*(\S+?)\s*(?::\s*(.+))?$/;
    let cur = null;
    function cls(name) { if (index[name] == null) { classes.push({ title: name, rows: [] }); index[name] = classes.length - 1; } return classes[index[name]]; }
    for (const line of lines) {
      if (cur) { if (line === "}") { cur = null; continue; } cur.rows.push(line.replace(/^[+\-#~]\s*/, "").trim()); continue; }
      let m = line.match(/^class\s+([A-Za-z0-9_가-힣]+)\s*\{$/); if (m) { cur = cls(m[1]); continue; }
      m = line.match(/^class\s+([A-Za-z0-9_가-힣]+)\s*$/); if (m) { cls(m[1]); continue; }
      m = line.match(relRe);
      if (m && /[<>o*|.\-]{2,}/.test(m[2])) { cls(m[1]); cls(m[3]); relations.push({ aName: m[1], bName: m[3], type: m[2], label: stripQuotes(m[4] || "") }); continue; }
      m = line.match(/^([A-Za-z0-9_가-힣]+)\s*:\s*(.+)$/); if (m) { cls(m[1]).rows.push(m[2].replace(/^[+\-#~]\s*/, "").trim()); }
    }
    return { classes, relations, index };
  }
  function boxEdge(b, tx, ty) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, dx = tx - cx, dy = ty - cy;
    if (!dx && !dy) return { x: cx, y: cy };
    const s = Math.min(dx ? (b.w / 2) / Math.abs(dx) : Infinity, dy ? (b.h / 2) / Math.abs(dy) : Infinity);
    return { x: cx + dx * s, y: cy + dy * s };
  }
  function classMarker(parts, px, py, dx, dy, kind) {
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    const ex = -dy, ey = dx, s = 9, bx = px - dx * s, by = py - dy * s;
    if (kind === "triangle") parts.push(`<polygon points="${px.toFixed(1)},${py.toFixed(1)} ${(bx + ex * s * .7).toFixed(1)},${(by + ey * s * .7).toFixed(1)} ${(bx - ex * s * .7).toFixed(1)},${(by - ey * s * .7).toFixed(1)}" fill="#fff" stroke="${BORDER}" stroke-width="1.2"/>`);
    else if (kind === "diamond" || kind === "diamondf") { const mx = px - dx * s, my = py - dy * s, fx = px - dx * s * 2, fy = py - dy * s * 2; parts.push(`<polygon points="${px.toFixed(1)},${py.toFixed(1)} ${(mx + ex * s * .7).toFixed(1)},${(my + ey * s * .7).toFixed(1)} ${fx.toFixed(1)},${fy.toFixed(1)} ${(mx - ex * s * .7).toFixed(1)},${(my - ey * s * .7).toFixed(1)}" fill="${kind === 'diamondf' ? INK : '#fff'}" stroke="${BORDER}" stroke-width="1.2"/>`); }
    else if (kind === "arrow") parts.push(`<path d="M${(bx + ex * s * .6).toFixed(1)},${(by + ey * s * .6).toFixed(1)} L${px.toFixed(1)},${py.toFixed(1)} L${(bx - ex * s * .6).toFixed(1)},${(by - ey * s * .6).toFixed(1)}" fill="none" stroke="${INK}" stroke-width="1.4"/>`);
  }
  function symKind(sym) { if (sym.indexOf("|") >= 0) return "triangle"; if (sym.indexOf("*") >= 0) return "diamondf"; if (sym.indexOf("o") >= 0) return "diamond"; if (sym.indexOf(">") >= 0 || sym.indexOf("<") >= 0) return "arrow"; return null; }
  function classRender(parsed) {
    const cls = parsed.classes, rels = parsed.relations || [];
    if (!cls.length) return `<svg viewBox="0 0 800 40" xmlns="http://www.w3.org/2000/svg"></svg>`;
    const rh = 20, bw = 190, gapX = 60, gapY = 60, perRow = 3, x0 = 20, y0 = 25;
    const pos = [], parts = []; let rowY = y0, maxH = 0;
    cls.forEach((c, i) => { const col = i % perRow; if (col === 0 && i > 0) { rowY += maxH + gapY; maxH = 0; } const h = rh + c.rows.length * rh + (c.rows.length ? 6 : 0); maxH = Math.max(maxH, h); pos.push({ x: x0 + col * (bw + gapX), y: rowY, w: bw, h }); });
    const totalH = rowY + maxH + 25;
    rels.forEach(r => {
      const a = pos[parsed.index[r.aName]], b = pos[parsed.index[r.bName]]; if (!a || !b) return;
      const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 }, bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      const p1 = boxEdge(a, bc.x, bc.y), p2 = boxEdge(b, ac.x, ac.y);
      const dm = r.type.match(/^([<>o*|]*)[-.]+([<>o*|]*)$/), left = dm ? dm[1] : "", right = dm ? dm[2] : "";
      parts.push(`<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="${BORDER}" stroke-width="1.4"${/\.\./.test(r.type) ? ' stroke-dasharray="5,4"' : ''}/>`);
      if (symKind(left)) classMarker(parts, p1.x, p1.y, p1.x - p2.x, p1.y - p2.y, symKind(left));
      if (symKind(right)) classMarker(parts, p2.x, p2.y, p2.x - p1.x, p2.y - p1.y, symKind(right));
      if (r.label) parts.push(`<text x="${((p1.x + p2.x) / 2).toFixed(1)}" y="${((p1.y + p2.y) / 2 - 4).toFixed(1)}" text-anchor="middle" fill="#64748b" font-family="${MONO}" font-size="9">${esc(r.label)}</text>`);
    });
    cls.forEach((c, i) => {
      const p = pos[i];
      parts.push(`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="5" fill="#fff" stroke="${BORDER}" stroke-width="1.2"/>`);
      parts.push(`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${rh}" rx="5" fill="${HEAD}"/><rect x="${p.x}" y="${p.y + rh - 6}" width="${p.w}" height="6" fill="${HEAD}"/>`);
      parts.push(`<text x="${p.x + p.w / 2}" y="${p.y + 14}" text-anchor="middle" fill="#fff" font-family="${FONT}" font-size="12" font-weight="bold">${esc(c.title)}</text>`);
      c.rows.forEach((row, j) => parts.push(`<text x="${p.x + 8}" y="${p.y + rh + j * rh + 14}" fill="${INK}" font-family="${MONO}" font-size="10">${esc(row)}</text>`));
    });
    return `<svg viewBox="0 0 800 ${totalH}" width="800" height="${totalH}" xmlns="http://www.w3.org/2000/svg">${parts.join("")}</svg>`;
  }

  // ---------------- Gantt ----------------
  function durDays(d) { if (!d) return 1; const m = String(d).match(/^(\d+)\s*([dwh])?$/i); if (!m) return 1; const n = +m[1], u = (m[2] || "d").toLowerCase(); return u === "w" ? n * 7 : (u === "h" ? Math.max(1, Math.round(n / 24)) : n); }
  function parseGantt(code) {
    const raw = code.split("\n").map(l => l.trim()).filter(l => l && !/^%%/.test(l));
    let title = "", section = ""; const tasks = [], byId = {};
    for (const line of raw) {
      if (/^gantt\b/i.test(line)) continue;
      let m = line.match(/^title\s+(.+)$/i); if (m) { title = m[1].trim(); continue; }
      if (/^(dateFormat|axisFormat|excludes|todayMarker|tickInterval|weekday|inclusiveEndDates)\b/i.test(line)) continue;
      m = line.match(/^section\s+(.+)$/i); if (m) { section = m[1].trim(); continue; }
      m = line.match(/^(.+?)\s*:\s*(.*)$/);
      if (m) {
        const name = m[1].trim(), toks = m[2].split(",").map(s => s.trim()).filter(Boolean);
        let id = null, start = null, after = null, dur = null, milestone = false, status = "";
        toks.forEach(tok => {
          if (/^(done|active|crit)$/i.test(tok)) status = tok.toLowerCase();
          else if (/^milestone$/i.test(tok)) milestone = true;
          else if (/^\d{4}-\d{2}-\d{2}$/.test(tok)) start = tok;
          else if (/^after\s+/i.test(tok)) after = tok.replace(/^after\s+/i, "").trim();
          else if (/^\d+\s*[dwh]?$/i.test(tok) && dur == null && !/^\d{4}$/.test(tok)) dur = tok;
          else if (id == null) id = tok;
        });
        const t = { name, section, id, start, after, dur, milestone, status, s: null, e: null };
        tasks.push(t); if (id) byId[id] = t;
      }
    }
    return { title, tasks, byId };
  }
  function gantt(parsed) {
    const tasks = parsed.tasks; if (!tasks.length) return `<svg viewBox="0 0 800 40" xmlns="http://www.w3.org/2000/svg"></svg>`;
    const toDay = iso => { const dt = new Date(iso + "T00:00:00Z"); return isNaN(dt) ? null : Math.round(dt.getTime() / 86400000); };
    const fromDay = d => { const dt = new Date(d * 86400000); return dt.toISOString().slice(5, 10); };
    for (let pass = 0; pass < tasks.length + 1; pass++) {
      let changed = false;
      tasks.forEach((t, idx) => {
        if (t.s != null) return; let s = null;
        if (t.start) s = toDay(t.start);
        else if (t.after) { const r = parsed.byId[t.after]; if (r && r.e != null) s = r.e; }
        else if (idx > 0 && tasks[idx - 1].e != null) s = tasks[idx - 1].e;
        else if (idx === 0) s = 0;
        if (s != null) { t.s = s; t.e = s + durDays(t.dur); changed = true; }
      });
      if (!changed) break;
    }
    let cursor = 0; tasks.forEach(t => { if (t.s == null) { t.s = cursor; t.e = cursor + durDays(t.dur); } cursor = Math.max(cursor, t.e); });
    const minD = Math.min.apply(null, tasks.map(t => t.s)), maxD = Math.max.apply(null, tasks.map(t => t.e)), span = Math.max(1, maxD - minD);
    const colorOf = t => t.status === "done" ? "#94a3b8" : t.status === "active" ? ACCENT : t.status === "crit" ? "#dc2626" : HEAD;
    // 섹션 헤더 + 작업 행 목록
    const rows = []; let curSec = null;
    tasks.forEach(t => { if (t.section !== curSec) { curSec = t.section; if (curSec) rows.push({ type: "sec", name: curSec }); } rows.push({ type: "task", t }); });
    // 표 레이아웃
    const x0 = 10, tableW = 780, labelW = 195, chartX = x0 + labelW, chartW = tableW - labelW;
    const titleH = parsed.title ? 40 : 8, headH = 28, rowH = 28;
    const tableTop = titleH, bodyTop = tableTop + headH, bodyBottom = bodyTop + rows.length * rowH, tableH = headH + rows.length * rowH;
    const X = d => chartX + (d - minD) / span * chartW;
    let step = Math.ceil(span / 8); if (step < 1) step = 1;
    const ticks = []; for (let d = minD; d <= maxD + 0.001; d += step) ticks.push(Math.round(d));
    const parts = [];
    if (parsed.title) parts.push(`<text x="400" y="26" text-anchor="middle" fill="${INK}" font-family="${FONT}" font-size="16" font-weight="bold">${esc(parsed.title)}</text>`);
    // 행 배경(섹션 밴드 · 지브라)
    rows.forEach((r, i) => { const ry = bodyTop + i * rowH; if (r.type === "sec") parts.push(`<rect x="${x0}" y="${ry}" width="${tableW}" height="${rowH}" fill="#eef2f7"/>`); else if (i % 2 === 1) parts.push(`<rect x="${x0}" y="${ry}" width="${tableW}" height="${rowH}" fill="#f8fafc"/>`); });
    // 세로 그리드(타임라인)
    ticks.forEach(d => { const gx = X(d); parts.push(`<line x1="${gx.toFixed(1)}" y1="${bodyTop}" x2="${gx.toFixed(1)}" y2="${bodyBottom}" stroke="#e5e9f0" stroke-width="1"/>`); });
    // 가로 행 구분선
    for (let i = 1; i < rows.length; i++) { const ly = bodyTop + i * rowH; parts.push(`<line x1="${x0}" y1="${ly}" x2="${x0 + tableW}" y2="${ly}" stroke="#eef1f5" stroke-width="1"/>`); }
    // 헤더(네이비, 위 모서리만 라운드)
    parts.push(`<rect x="${x0}" y="${tableTop}" width="${tableW}" height="${headH}" rx="6" fill="${HEAD}"/><rect x="${x0}" y="${tableTop + headH - 8}" width="${tableW}" height="8" fill="${HEAD}"/>`);
    parts.push(`<text x="${x0 + 12}" y="${tableTop + headH / 2 + 4}" fill="#fff" font-family="${FONT}" font-size="11" font-weight="bold">작업</text>`);
    ticks.forEach(d => { const gx = X(d); parts.push(`<text x="${gx.toFixed(1)}" y="${tableTop + headH / 2 + 4}" text-anchor="middle" fill="#cbd8ea" font-family="${MONO}" font-size="9">${fromDay(d)}</text>`); });
    // 행 내용(섹션명 · 작업명 · 막대/마일스톤)
    rows.forEach((r, i) => {
      const ry = bodyTop + i * rowH, mid = ry + rowH / 2;
      if (r.type === "sec") { parts.push(`<text x="${x0 + 10}" y="${mid + 4}" fill="${HEAD}" font-family="${FONT}" font-size="11.5" font-weight="bold">${esc(r.name)}</text>`); return; }
      const t = r.t, col = colorOf(t);
      parts.push(`<text x="${chartX - 10}" y="${mid + 4}" text-anchor="end" fill="${INK}" font-family="${FONT}" font-size="11">${esc(t.name)}</text>`);
      if (t.milestone) { const mx = X(t.s), rr = 7; parts.push(`<polygon points="${mx.toFixed(1)},${mid - rr} ${(mx + rr).toFixed(1)},${mid} ${mx.toFixed(1)},${mid + rr} ${(mx - rr).toFixed(1)},${mid}" fill="${col}" stroke="#fff" stroke-width="1"/>`); }
      else { const bx = X(t.s), bw = Math.max(4, X(t.e) - X(t.s)); parts.push(`<rect x="${bx.toFixed(1)}" y="${ry + 6}" width="${bw.toFixed(1)}" height="${rowH - 12}" rx="3" fill="${col}" fill-opacity="${t.status === 'done' ? 0.5 : 0.95}" stroke="rgba(15,23,42,0.15)" stroke-width="0.8"/>`); }
    });
    // 좌측 열 구분선 + 외곽 테두리
    parts.push(`<line x1="${chartX}" y1="${bodyTop}" x2="${chartX}" y2="${bodyBottom}" stroke="#cbd5e1" stroke-width="1"/>`);
    parts.push(`<rect x="${x0}" y="${tableTop}" width="${tableW}" height="${tableH}" rx="6" fill="none" stroke="#cbd5e1" stroke-width="1.3"/>`);
    // 범례(사용된 상태만)
    const seen = {}; tasks.forEach(t => { if (t.milestone) { seen.ms = 1; return; } seen[t.status || "def"] = 1; });
    const leg = []; if (seen.def) leg.push(["일반", HEAD]); if (seen.active) leg.push(["진행중", ACCENT]); if (seen.done) leg.push(["완료", "#94a3b8"]); if (seen.crit) leg.push(["중요", "#dc2626"]);
    let lx = x0 + 2; const ly = bodyBottom + 22;
    leg.forEach(it => { parts.push(`<rect x="${lx}" y="${ly - 9}" width="11" height="11" rx="2" fill="${it[1]}"/><text x="${lx + 16}" y="${ly}" fill="#64748b" font-family="${FONT}" font-size="10">${it[0]}</text>`); lx += 26 + textW(it[0], 10); });
    if (seen.ms) { const my = ly - 3.5; parts.push(`<polygon points="${(lx + 5).toFixed(1)},${my - 6} ${(lx + 11).toFixed(1)},${my} ${(lx + 5).toFixed(1)},${my + 6} ${(lx - 1).toFixed(1)},${my}" fill="${HEAD}"/><text x="${lx + 16}" y="${ly}" fill="#64748b" font-family="${FONT}" font-size="10">마일스톤</text>`); }
    const h = ly + 14;
    return `<svg viewBox="0 0 800 ${h}" width="800" height="${h}" xmlns="http://www.w3.org/2000/svg">${parts.join("")}</svg>`;
  }

  function render(kind, code) {
    try {
      HEAD = themeColor("--brand", "#1e3a5f"); ACCENT = themeColor("--accent", "#2563eb");
      if (kind === "er") { const p = parseEr(code); return erd(p.entities, p.relations); }
      if (kind === "flow") { return flow(parseFlow(code)); }
      if (kind === "seq") { const p = parseSeq(code); return sequence(p.actors, p.messages); }
      if (kind === "pie") { return pie(parsePie(code)); }
      if (kind === "state") { return flow(parseState(code)); }
      if (kind === "class") { return classRender(parseClass(code)); }
      if (kind === "gantt") { return gantt(parseGantt(code)); }
    } catch (e) { return `<pre>diagram error: ${esc(e && e.message || e)}</pre>`; }
    return "";
  }

  function detectKind(code) {
    const t = code.trim();
    if (/^erDiagram/.test(t)) return "er";
    if (/^sequenceDiagram/.test(t)) return "seq";
    if (/^(flowchart|graph)\b/.test(t)) return "flow";
    if (/^pie\b/.test(t)) return "pie";
    if (/^stateDiagram(-v2)?\b/.test(t)) return "state";
    if (/^classDiagram\b/.test(t)) return "class";
    if (/^gantt\b/.test(t)) return "gantt";
    return null;
  }

  const api = { erd, flow, sequence, pie, parsePie, parseState, classRender, parseClass, gantt, parseGantt, parseEr, parseFlow, parseSeq, render, detectKind };
  root.DIAG = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : this);
