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

  // ---------------- ERD ----------------
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
      parts.push(`<line x1="${a.x + bw}" y1="${y}" x2="${b.x}" y2="${y}" stroke="${ACCENT}" stroke-width="1.4"/>`);
      parts.push(`<text x="${(a.x + bw + b.x) / 2}" y="${y - 8}" text-anchor="middle" fill="${ACCENT}" font-family="${MONO}" font-size="9">1 : N</text>`);
      parts.push(`<text x="${(a.x + bw + b.x) / 2}" y="${y + 14}" text-anchor="middle" fill="#64748b" font-family="${MONO}" font-size="8">${esc(rel.label)}</text>`);
    });
    const totalH = rowY + maxH + 20;
    return `<svg viewBox="0 0 800 ${totalH}" xmlns="http://www.w3.org/2000/svg" font-family="${FONT}">${parts.join("")}</svg>`;
  }

  // ---------------- Flow ----------------
  function flow(steps) {
    const bw = 560, gap = 26, x = 120;
    const palette = ["#1e3a5f", "#1e3a5f", "#2563eb", "#0369a1", "#0369a1", "#15803d"];
    const parts = []; let y = 20;
    steps.forEach((st, i) => {
      const c = palette[i % palette.length];
      const lines = st.lines;
      const bh = Math.max(54, 16 + lines.length * 18);
      parts.push(`<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="8" fill="#fff" stroke="${c}" stroke-width="1.6"/>`);
      parts.push(`<rect x="${x}" y="${y}" width="6" height="${bh}" rx="3" fill="${c}"/>`);
      lines.forEach((ln, k) => {
        const ty = y + 22 + k * 18;
        const weight = k === 0 ? ' font-weight="bold"' : '';
        const fill = k === 0 ? c : INK;
        const size = k === 0 ? 13 : 11;
        parts.push(`<text x="${x + 22}" y="${ty}" fill="${fill}" font-family="${FONT}" font-size="${size}"${weight}>${esc(ln)}</text>`);
      });
      if (i < steps.length - 1) {
        const ay = y + bh, cx = x + bw / 2;
        parts.push(`<line x1="${cx}" y1="${ay}" x2="${cx}" y2="${ay + gap}" stroke="${BORDER}" stroke-width="1.6"/>`);
        parts.push(`<polygon points="${cx - 5},${ay + gap - 6} ${cx + 5},${ay + gap - 6} ${cx},${ay + gap}" fill="${BORDER}"/>`);
      }
      y += bh + gap;
    });
    return `<svg viewBox="0 0 800 ${y + 4}" xmlns="http://www.w3.org/2000/svg">${parts.join("")}</svg>`;
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
    return `<svg viewBox="0 0 800 ${bottom + 8}" xmlns="http://www.w3.org/2000/svg">${parts.join("")}</svg>`;
  }

  // ---------------- Parsers ----------------
  function stripQuotes(s) { return s.trim().replace(/^["']|["']$/g, "").trim(); }

  function parseEr(code) {
    const lines = code.split("\n").map(l => l.trim()).filter(l => l && l !== "erDiagram");
    const entities = []; const index = {}; const relations = [];
    let cur = null;
    const relRe = /^(\S+)\s+[|}{o<>.ox-]+\s+(\S+)\s*:\s*(.+)$/;
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
      const em = line.match(/^(\w+)\s*\{$/);
      if (em) { cur = { title: em[1], rows: [] }; entities.push(cur); index[em[1]] = entities.length - 1; continue; }
      const rm = line.match(relRe);
      if (rm) { relations.push({ aName: rm[1], bName: rm[2], label: stripQuotes(rm[3]) }); }
    }
    relations.forEach(r => { r.a = index[r.aName]; r.b = index[r.bName]; });
    return { entities, relations: relations.filter(r => r.a != null && r.b != null) };
  }

  function splitLabelLines(label) {
    // "<br/>" and "<br>" -> line breaks; also split first ":" into title + rest
    let s = label.replace(/<br\s*\/?>/gi, "\n");
    const parts = s.split("\n").map(x => x.trim()).filter(x => x.length);
    if (parts.length === 1 && parts[0].indexOf(":") > -1) {
      const i = parts[0].indexOf(":");
      return [parts[0].slice(0, i).trim(), parts[0].slice(i + 1).trim()].filter(x => x.length);
    }
    // if first line has "title: rest", split it
    if (parts.length && parts[0].indexOf(":") > -1) {
      const i = parts[0].indexOf(":");
      const head = parts[0].slice(0, i).trim(), tail = parts[0].slice(i + 1).trim();
      return [head, tail].concat(parts.slice(1)).filter(x => x.length);
    }
    return parts;
  }

  function parseFlow(code) {
    const raw = code.split("\n").map(l => l.trim()).filter(l => l);
    raw.shift(); // flowchart XX
    const labels = {}; const order = [];
    const defRe = /([A-Za-z0-9_]+)\s*[\[\(\{]+\s*"?([^"\]\)\}]*)"?\s*[\]\)\}]+/g;
    const seen = {};
    const addNode = id => { if (!(id in seen)) { seen[id] = true; order.push(id); } };
    for (const line of raw) {
      let m; defRe.lastIndex = 0;
      while ((m = defRe.exec(line)) !== null) { labels[m[1]] = m[2]; }
      // edges: split on --> -.-> ==>
      if (/-->|-\.->|==>/.test(line)) {
        const ids = line.split(/-->|-\.->|==>/).map(seg => {
          const mm = seg.trim().match(/^([A-Za-z0-9_]+)/);
          return mm ? mm[1] : null;
        }).filter(Boolean);
        ids.forEach(addNode);
      }
    }
    // include any defined-but-unlinked nodes at end
    Object.keys(labels).forEach(addNode);
    const steps = order.map(id => ({ lines: splitLabelLines(labels[id] != null ? labels[id] : id) }));
    return steps;
  }

  function parseSeq(code) {
    const raw = code.split("\n").map(l => l.trim()).filter(l => l && l !== "sequenceDiagram");
    const ids = []; const names = {}; const index = {};
    const msgs = [];
    for (const line of raw) {
      let m = line.match(/^participant\s+([A-Za-z0-9_]+)(?:\s+as\s+(.+))?$/i);
      if (m) { const id = m[1]; if (!(id in index)) { index[id] = ids.length; ids.push(id); } names[id] = m[2] ? m[2].trim() : id; continue; }
      m = line.match(/^([A-Za-z0-9_]+)\s*(-{1,2}>>?|-{1,2}x|-{1,2}\))\s*([A-Za-z0-9_]+)\s*:\s*(.+)$/);
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
