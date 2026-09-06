const pptxgen = require('./frontend/node_modules/pptxgenjs');

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'EcoShield';
pptx.subject = 'Hackathon presentation';
pptx.title = 'EcoShield Environmental Intelligence Platform';
pptx.company = 'EcoShield';
pptx.lang = 'en-IN';
pptx.theme = { headFontFace: 'Aptos Display', bodyFontFace: 'Aptos', lang: 'en-US' };
pptx.defineSlideMaster({
  title: 'MASTER',
  background: { color: '071412' },
  objects: [
    { rect: { x: 0, y: 7.18, w: 13.33, h: 0.32, fill: { color: '0D2720' }, line: { color: '0D2720' } } },
    { text: { text: 'ECOSHIELD  /  ENVIRONMENTAL INTELLIGENCE', options: { x: 0.55, y: 7.24, w: 5.5, h: 0.12, fontFace: 'Aptos', fontSize: 7, color: '6A8B82', charSpacing: 1.1, margin: 0 } } }
  ],
  slideNumber: { x: 12.45, y: 7.22, color: '6A8B82', fontFace: 'Aptos', fontSize: 8 }
});

const C = { bg: '071412', panel: '0D211C', panel2: '102A23', mint: '68E0B5', mint2: 'B4F4D9', text: 'EFF9F4', muted: '91AEA3', dim: '55766C', amber: 'FFBE69', red: 'FF7C82', blue: '6DAAFF', line: '24473C', white: 'FFFFFF' };
const S = pptx.ShapeType;

function text(slide, value, x, y, w, h, opts = {}) {
  slide.addText(value, { x, y, w, h, margin: 0, fontFace: opts.fontFace || 'Aptos', fontSize: opts.size || 14, color: opts.color || C.text, bold: opts.bold || false, breakLine: false, fit: 'shrink', valign: opts.valign || 'mid', align: opts.align || 'left', charSpacing: opts.spacing || 0, italic: opts.italic || false, bullet: opts.bullet, paraSpaceAfterPt: opts.paraSpaceAfterPt || 0 });
}
function box(slide, x, y, w, h, fill = C.panel, line = C.line, radius = 0.12) { slide.addShape(S.roundRect, { x, y, w, h, rectRadius: radius, fill: { color: fill }, line: { color: line, width: 1 } }); }
function line(slide, x1, y1, x2, y2, color = C.line, width = 1) { slide.addShape(S.line, { x: x1, y: y1, w: x2 - x1, h: y2 - y1, line: { color, width, beginArrowType: 'none', endArrowType: 'none' } }); }
function circle(slide, x, y, d, fill, lineColor = fill) { slide.addShape(S.ellipse, { x, y, w: d, h: d, fill: { color: fill }, line: { color: lineColor, width: 1 } }); }
function title(slide, kicker, heading, sub) { text(slide, kicker.toUpperCase(), 0.62, 0.55, 4.8, 0.2, { size: 9, color: C.mint, bold: true, spacing: 1.8 }); text(slide, heading, 0.62, 0.85, 11.8, 0.58, { size: 27, bold: true }); if (sub) text(slide, sub, 0.65, 1.52, 11.5, 0.36, { size: 11, color: C.muted }); }
function badge(slide, value, x, y, w, color = C.mint) { slide.addShape(S.roundRect, { x, y, w, h: 0.32, rectRadius: 0.14, fill: { color: '12352D' }, line: { color, width: 1 } }); text(slide, value, x, y + 0.02, w, 0.2, { size: 8, color, bold: true, align: 'center', spacing: 0.9 }); }
function metric(slide, x, y, w, label, value, accent = C.mint) { box(slide, x, y, w, 1.08); text(slide, label.toUpperCase(), x + 0.18, y + 0.16, w - 0.36, 0.16, { size: 8, color: C.dim, bold: true, spacing: 1.1 }); text(slide, value, x + 0.18, y + 0.4, w - 0.36, 0.36, { size: 23, color: accent, bold: true }); }
function dot(slide, x, y, color, label) { circle(slide, x, y, 0.1, color); text(slide, label, x + 0.16, y - 0.03, 1.2, 0.16, { size: 8, color: C.muted }); }
function footerNote(slide, value) { text(slide, value, 8.0, 6.78, 4.5, 0.18, { size: 8, color: C.dim, align: 'right' }); }

// 1. Cover
{
  const s = pptx.addSlide('MASTER');
  s.background = { color: C.bg };
  circle(s, 10.15, 0.35, 2.2, '123D31'); circle(s, 10.72, 0.93, 1.05, C.mint); circle(s, 11.02, 1.23, 0.45, C.bg);
  text(s, 'ECOSHIELD', 0.72, 0.72, 4.2, 0.3, { size: 13, color: C.mint, bold: true, spacing: 2.6 });
  text(s, 'Environmental\nintelligence for\na changing planet.', 0.72, 1.52, 7.0, 2.2, { size: 34, bold: true });
  text(s, 'A real-time risk command center that turns weather, rainfall, air quality, fire, and satellite signals into decisions people can act on.', 0.76, 4.05, 6.1, 0.7, { size: 14, color: C.muted });
  badge(s, 'HACKATHON 2026  /  TEAM ECOSHIELD', 0.76, 5.25, 2.95, C.amber);
  box(s, 8.18, 2.14, 4.18, 3.0, C.panel2, C.line);
  text(s, 'LIVE RISK PULSE', 8.53, 2.48, 2.4, 0.18, { size: 9, color: C.mint, bold: true, spacing: 1.2 });
  text(s, '62', 8.52, 2.92, 1.35, 0.72, { size: 42, bold: true }); text(s, '/100', 9.88, 3.31, 0.65, 0.2, { size: 11, color: C.muted });
  text(s, 'ELEVATED CONDITIONS', 8.55, 3.78, 2.8, 0.2, { size: 10, color: C.amber, bold: true });
  line(s, 8.55, 4.22, 11.95, 4.22, C.line, 2); line(s, 8.55, 4.22, 10.72, 4.22, C.amber, 2);
  text(s, 'Flood 68    Fire 42    Pollution 76', 8.55, 4.52, 3.25, 0.2, { size: 10, color: C.muted });
  text(s, '01', 12.25, 6.65, 0.35, 0.2, { size: 8, color: C.dim, align: 'right' });
}

// 2. Problem
{
  const s = pptx.addSlide('MASTER'); title(s, '01  /  The problem', 'Environmental risk is fragmented.', 'Signals exist. Decisions do not. Communities need one clear picture before a crisis compounds.');
  const cards = [
    ['01', 'Too many silos', 'Weather, rainfall, pollution, fire, and satellite data live in separate systems.', C.blue],
    ['02', 'Too late to act', 'A dashboard that only reports the past cannot support early action.', C.amber],
    ['03', 'Too hard to trust', 'Black-box scores hide the evidence behind a warning.', C.red]
  ];
  cards.forEach((c, i) => { const x = 0.68 + i * 4.18; box(s, x, 2.35, 3.65, 2.55); text(s, c[0], x + 0.25, 2.65, 0.45, 0.25, { size: 13, color: c[3], bold: true }); text(s, c[1], x + 0.25, 3.12, 3.05, 0.35, { size: 17, bold: true }); text(s, c[2], x + 0.25, 3.7, 3.0, 0.7, { size: 11, color: C.muted }); line(s, x + 0.25, 4.55, x + 1.05, 4.55, c[3], 3); });
  text(s, 'The gap is not data. The gap is interpretation.', 0.72, 5.65, 8.5, 0.45, { size: 22, color: C.mint2, bold: true }); footerNote(s, 'From disconnected observations to one operational view');
}

// 3. Solution
{
  const s = pptx.addSlide('MASTER'); title(s, '02  /  Our solution', 'EcoShield connects the signal chain.', 'A transparent, location-aware platform for monitoring, comparing, explaining, and acting on environmental risk.');
  const nodes = [['OBSERVE', 'Open-Meteo\nCPCB / data.gov.in\nNASA FIRMS', C.blue], ['NORMALIZE', 'One API\nIndia bounds\nProvider health', C.mint], ['SCORE', 'Flood + fire +\npollution risk', C.amber], ['ACT', 'Alerts\nAI briefing\nSatellite workflow', C.red]];
  nodes.forEach((n, i) => { const x = 0.72 + i * 3.1; box(s, x, 2.35, 2.35, 2.2, C.panel2, n[2]); circle(s, x + 0.2, 2.62, 0.28, n[2]); text(s, n[0], x + 0.58, 2.63, 1.5, 0.18, { size: 9, color: n[2], bold: true, spacing: 1.2 }); text(s, n[1], x + 0.22, 3.2, 1.9, 0.75, { size: 12, color: C.text, bold: true }); if (i < 3) { line(s, x + 2.38, 3.42, x + 2.92, 3.42, C.mint, 2); s.addShape(S.chevron, { x: x + 2.72, y: 3.3, w: 0.2, h: 0.24, fill: { color: C.mint }, line: { color: C.mint } }); } });
  box(s, 1.82, 5.15, 9.7, 0.65, '0C2A22', C.line); text(s, 'A decision surface, not another data warehouse.', 2.08, 5.33, 9.2, 0.25, { size: 16, color: C.mint2, bold: true, align: 'center' });
}

// 4. Architecture
{
  const s = pptx.addSlide('MASTER'); title(s, '03  /  How it works', 'A modular architecture built for live conditions.', 'Fast provider calls, transparent risk functions, and a frontend that keeps evidence close to every score.');
  const layers = [['DATA PROVIDERS', 'Open-Meteo   |   NASA FIRMS   |   CPCB   |   NASA POWER   |   Earth Engine', C.blue], ['FASTAPI CORE', 'Normalized endpoints   |   CORS   |   error envelopes   |   provider diagnostics', C.mint], ['RISK ENGINE', 'Flood heuristic   |   fire score   |   pollution score   |   weighted overall risk', C.amber], ['EXPERIENCE', 'React dashboard   |   Leaflet map   |   AI summary   |   Gemini briefing', C.red]];
  layers.forEach((l, i) => { const y = 2.05 + i * 0.98; box(s, 1.0, y, 11.25, 0.68, i === 1 ? '12382E' : C.panel, l[2]); text(s, l[0], 1.28, y + 0.19, 1.85, 0.18, { size: 9, color: l[2], bold: true, spacing: 1.1 }); text(s, l[1], 3.35, y + 0.18, 8.35, 0.2, { size: 11, color: C.text }); });
  text(s, 'Every result retains a source context and a human-readable explanation.', 1.0, 6.35, 8.8, 0.25, { size: 13, color: C.muted });
}

// 5. Product
{
  const s = pptx.addSlide('MASTER'); title(s, '04  /  Product experience', 'One workspace. Multiple ways to understand risk.', 'Designed for scanning first, then exploring the evidence behind a signal.');
  box(s, 0.7, 2.05, 7.0, 3.82, C.panel2, C.line); text(s, 'OVERVIEW', 1.0, 2.32, 1.2, 0.16, { size: 8, color: C.mint, bold: true, spacing: 1.2 });
  metric(s, 1.0, 2.73, 1.78, 'Overall risk', '62', C.amber); metric(s, 2.98, 2.73, 1.78, 'Temperature', '29 C', C.blue); metric(s, 4.96, 2.73, 1.78, 'Air quality', '76 AQI', C.red);
  box(s, 1.0, 4.1, 3.12, 1.22, '102D27', C.line); text(s, 'LIVE MAP', 1.2, 4.3, 1.2, 0.15, { size: 8, color: C.mint, bold: true }); circle(s, 1.25, 4.78, 0.12, C.red); circle(s, 2.12, 4.57, 0.12, C.amber); circle(s, 3.0, 4.95, 0.12, C.mint); text(s, 'India environmental view', 1.48, 4.72, 2.3, 0.18, { size: 10, color: C.muted });
  box(s, 4.34, 4.1, 3.0, 1.22, '102D27', C.line); text(s, 'AI SIGNAL', 4.57, 4.3, 1.2, 0.15, { size: 8, color: C.amber, bold: true }); text(s, 'Potential warning detected', 4.57, 4.68, 2.2, 0.2, { size: 11, bold: true }); text(s, 'Air quality risk is 76/100', 4.57, 5.0, 2.25, 0.16, { size: 9, color: C.muted });
  const features = [['Live map', 'Click a point for current weather'], ['Rainfall monitor', 'Hourly and 7-day precipitation'], ['Alerts center', 'Threshold-based attention signals'], ['AI briefing', 'Gemini explains verified context']];
  features.forEach((f, i) => { const y = 2.2 + i * 0.88; circle(s, 8.35, y + 0.08, 0.13, [C.mint, C.blue, C.amber, C.red][i]); text(s, f[0], 8.65, y, 2.5, 0.18, { size: 14, bold: true }); text(s, f[1], 8.65, y + 0.27, 3.3, 0.16, { size: 10, color: C.muted }); });
}

// 6. Intelligence
{
  const s = pptx.addSlide('MASTER'); title(s, '05  /  Intelligence layer', 'Risk scores stay explainable.', 'EcoShield makes the evidence visible, then lets AI explain what the numbers mean without changing the calculated score.');
  box(s, 0.72, 2.1, 4.0, 3.78); text(s, 'COMPOSITE RISK', 1.02, 2.4, 2.0, 0.16, { size: 8, color: C.mint, bold: true, spacing: 1.2 });
  circle(s, 1.32, 2.88, 1.75, '173D34'); circle(s, 1.53, 3.09, 1.33, C.bg); text(s, '62', 1.65, 3.35, 0.9, 0.4, { size: 30, bold: true, align: 'center' }); text(s, '/100', 2.52, 3.56, 0.5, 0.16, { size: 9, color: C.muted }); text(s, 'ELEVATED', 1.55, 4.22, 1.5, 0.18, { size: 10, color: C.amber, bold: true, align: 'center' });
  [['Flood', 68, C.blue], ['Fire', 42, C.amber], ['Pollution', 76, C.red]].forEach((r, i) => { const y = 4.7 + i * 0.32; text(s, r[0], 3.1, y, 0.75, 0.15, { size: 9, color: C.muted }); line(s, 3.85, y + 0.08, 4.4, y + 0.08, C.line, 5); line(s, 3.85, y + 0.08, 3.85 + r[1] / 100 * 0.55, y + 0.08, r[2], 5); });
  const ai = [['01', 'Observe', 'Read verified weather and hazard signals.'], ['02', 'Compare', 'Find threshold crossings and compounding drivers.'], ['03', 'Explain', 'Write a concise, evidence-based briefing.']];
  ai.forEach((a, i) => { const y = 2.38 + i * 1.12; circle(s, 5.65, y, 0.34, [C.mint, C.amber, C.red][i]); text(s, a[0], 5.65, y + 0.08, 0.34, 0.12, { size: 8, color: C.bg, bold: true, align: 'center' }); text(s, a[1], 6.25, y - 0.01, 1.5, 0.2, { size: 15, bold: true }); text(s, a[2], 6.25, y + 0.29, 5.3, 0.22, { size: 10, color: C.muted }); if (i < 2) line(s, 5.82, y + 0.38, 5.82, y + 0.98, C.line, 1); });
}

// 7. Impact
{
  const s = pptx.addSlide('MASTER'); title(s, '06  /  Why it matters', 'From awareness to earlier action.', 'The platform is built to reduce cognitive load when environmental conditions change quickly.');
  metric(s, 0.75, 2.15, 2.75, 'Signals unified', '5+', C.mint); metric(s, 3.72, 2.15, 2.75, 'Risk dimensions', '3', C.blue); metric(s, 6.69, 2.15, 2.75, 'Live map layers', '4', C.amber); metric(s, 9.66, 2.15, 2.75, 'API endpoints', '15+', C.red);
  const rows = [['Residents', 'Understand local conditions before a warning becomes a crisis.'], ['Response teams', 'Prioritize locations with the strongest combined signals.'], ['Administrators', 'See provider health, provenance, and risk drivers in one view.']];
  rows.forEach((r, i) => { const y = 3.85 + i * 0.78; line(s, 0.78, y - 0.16, 12.2, y - 0.16, C.line, 1); text(s, r[0], 0.78, y, 2.2, 0.2, { size: 13, color: C.mint2, bold: true }); text(s, r[1], 3.25, y, 7.95, 0.2, { size: 12, color: C.muted }); });
  box(s, 0.78, 6.15, 11.4, 0.42, '102A23', C.line); text(s, 'The outcome: faster orientation, clearer decisions, better prepared communities.', 1.02, 6.27, 10.9, 0.17, { size: 11, color: C.mint2, bold: true, align: 'center' });
}

// 8. Roadmap / close
{
  const s = pptx.addSlide('MASTER'); title(s, '07  /  Next steps', 'Ready to move from prototype to public utility.', 'The foundation is live. The next layer is scale, validation, and trusted local partnerships.');
  const phases = [['NOW', 'Working prototype', 'Live dashboard\nProvider health\nRisk engine', C.mint], ['NEXT', 'Pilot deployment', 'District pilots\nAlert subscriptions\nHistorical baselines', C.amber], ['SCALE', 'Decision network', 'Official warnings\nMore satellite models\nCommunity feedback', C.blue]];
  phases.forEach((p, i) => { const x = 0.8 + i * 4.15; box(s, x, 2.2, 3.55, 2.45, C.panel2, p[3]); text(s, p[0], x + 0.25, 2.5, 0.7, 0.18, { size: 9, color: p[3], bold: true, spacing: 1.2 }); text(s, p[1], x + 0.25, 2.92, 2.9, 0.3, { size: 17, bold: true }); text(s, p[2], x + 0.25, 3.62, 2.5, 0.65, { size: 11, color: C.muted }); });
  text(s, 'EcoShield', 0.82, 5.55, 3.0, 0.35, { size: 22, color: C.mint, bold: true }); text(s, 'See the signal. Understand the risk. Act earlier.', 0.82, 5.98, 7.8, 0.3, { size: 17, color: C.mint2, bold: true }); badge(s, 'THANK YOU  /  QUESTIONS?', 10.05, 5.92, 2.25, C.amber);
}

pptx.writeFile({ fileName: 'EcoShield_Hackathon_Deck.pptx' });
