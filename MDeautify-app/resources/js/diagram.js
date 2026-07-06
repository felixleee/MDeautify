/* Custom SVG diagram renderer (browser + node). Replaces mermaid with the
   navy technical-spec style used in the first PDF. Parses erDiagram / flowchart
   / sequenceDiagram and returns an <svg> string. Exposed as window.DIAG. */
(function (root) {
  const FONT = "Malgun Gothic, Noto Sans CJK KR, sans-serif";
  const MONO = "Consolas, DejaVu Sans Mono, monospace";
  const INK = "#1f2937", BORDER = "#94a3b8", ROWALT = "#f1f5f9";
  let HEAD = "#1e3a5f", ACCENT = "#2563eb";
  const themeColor = (name, fb) => { try { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fb; } catch (e) { return fb; } };

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
          const c = r.key === "PK" ? ACCENT : "#b45309";
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
  const FLOW_PALETTE = ["#1e3a5f", "#1e3a5f", "#2563eb", "#0369a1", "#0369a1", "#15803d"];

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
    order.forEach((id, idx) => { const p = pos[id]; if (p) drawNode(parts, parsed.nodes[id], p, FLOW_PALETTE[idx % FLOW_PALETTE.length]); });
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
    const palette = ["#1e3a5f", "#1e3a5f", "#334155", "#2563eb", "#0369a1", "#15803d"];
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

  function render(kind, code) {
    try {
      HEAD = themeColor("--brand", "#1e3a5f"); ACCENT = themeColor("--accent", "#2563eb");
      if (kind === "er") { const p = parseEr(code); return erd(p.entities, p.relations); }
      if (kind === "flow") { return flow(parseFlow(code)); }
      if (kind === "seq") { const p = parseSeq(code); return sequence(p.actors, p.messages); }
    } catch (e) { return `<pre>diagram error: ${esc(e && e.message || e)}</pre>`; }
    return "";
  }

  function detectKind(code) {
    const t = code.trim();
    if (/^erDiagram/.test(t)) return "er";
    if (/^sequenceDiagram/.test(t)) return "seq";
    if (/^(flowchart|graph)\b/.test(t)) return "flow";
    return null;
  }

  const api = { erd, flow, sequence, parseEr, parseFlow, parseSeq, render, detectKind };
  root.DIAG = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : this);
