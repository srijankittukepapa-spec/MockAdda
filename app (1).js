'use strict';

// ── STATE ────────────────────────────────────────────────────────────────────
let DATA = {};
let S = {
  screen: 'loading',
  activeCat: null,
  activeExamKey: null,
  activeExam: null,
  test: null,
  qi: 0,
  ans: {},
  flagged: new Set(),
  visited: new Set([0]),
  timeLeft: 0,
  timeTaken: 0,
  startTime: null,
  navOpen: false,
  confirm: false,
  reviewOpen: false
};
let timerHandle = null;
const app = document.getElementById('app');

// ── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const $ = (tag, attrs={}, kids=[]) => {
  const e = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)) {
    if (k === 'style') { if (typeof v === 'string') e.style.cssText = v; else Object.assign(e.style, v); }
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v);
  }
  kids.filter(Boolean).forEach(c => e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return e;
};
const render = () => { app.innerHTML = ''; app.appendChild(buildScreen()); };

// Quiz colors (dark mode)
const QC = {
  bg:'#070c18', surface:'#0d1426', card:'#121c33', cardHov:'#192237',
  border:'rgba(255,255,255,0.07)',
  green:'#34d399', red:'#f87171', purple:'#a78bfa', dim:'#475569',
  text:'#f1f5f9', muted:'#94a3b8',
  ff:"'DM Sans',sans-serif", ffh:"'Syne',sans-serif"
};
const STATUS_CLR = {unvisited:QC.dim, visited:QC.red, answered:QC.green, flagged:QC.purple, 'ans-flag':QC.purple};

// ── QUIZ LOGIC ────────────────────────────────────────────────────────────────
function startQuiz(catKey, examKey, test) {
  const cat = DATA[catKey];
  const exam = cat.exams[examKey];
  S.activeCat = {key:catKey, ...cat};
  S.activeExamKey = examKey;
  S.activeExam = exam;
  S.test = {...test, questions:[...test.questions]};
  S.qi=0; S.ans={}; S.flagged=new Set(); S.visited=new Set([0]);
  S.timeLeft = test.duration * 60; S.startTime = Date.now();
  S.navOpen=false; S.confirm=false; S.reviewOpen=false;
  S.screen = 'quiz';
  render();
  startTimer();
}

function startTimer() {
  clearInterval(timerHandle);
  timerHandle = setInterval(() => {
    S.timeLeft = Math.max(0, S.timeLeft - 1);
    if (S.timeLeft === 0) { clearInterval(timerHandle); submit(); return; }
    const el = document.getElementById('timerDisp');
    if (el) {
      el.textContent = '⏱ ' + fmt(S.timeLeft);
      if (S.timeLeft < 60) { el.style.background=QC.red+'22'; el.style.color=QC.red; el.style.borderColor=QC.red+'44'; }
    }
  }, 1000);
}

function goQ(idx) { S.visited.add(idx); S.qi=idx; S.navOpen=false; render(); }

function submit() {
  clearInterval(timerHandle);
  if (S.startTime) S.timeTaken = Math.floor((Date.now()-S.startTime)/1000);
  S.screen='results'; S.confirm=false; S.navOpen=false; render();
}

function getResults() {
  if (!S.test) return null;
  let correct=0, wrong=0;
  S.test.questions.forEach((q,i) => {
    if (S.ans[i] === undefined) return;
    S.ans[i] === q.ans ? correct++ : wrong++;
  });
  const total = S.test.questions.length;
  return {correct, wrong, unattempted: total-correct-wrong, score:Math.round((correct/total)*100), total};
}

function qStatus(i) {
  if (!S.visited.has(i)) return 'unvisited';
  const a = S.ans[i]!==undefined, f = S.flagged.has(i);
  if (a&&f) return 'ans-flag';
  if (a) return 'answered';
  if (f) return 'flagged';
  return 'visited';
}

// ── SCREEN ROUTER ─────────────────────────────────────────────────────────────
function buildScreen() {
  const screens = {
    loading: loadingScreen,
    home: homeScreen,
    exams: examsScreen,
    tests: testsScreen,
    quiz: quizScreen,
    results: resultsScreen
  };
  return (screens[S.screen] || loadingScreen)();
}

// ── LOADING ───────────────────────────────────────────────────────────────────
function loadingScreen() {
  return $('div', {style:'min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;'}, [
    $('div', {style:`width:44px;height:44px;border:4px solid #e2e8f0;border-top:4px solid #0ea5e9;border-radius:50%;animation:spin 1s linear infinite;`}),
    $('div', {style:'font-family:var(--ffh);font-weight:700;color:#0ea5e9;font-size:16px;', text:'Loading MockAdda...'})
  ]);
}

// ── NAVBAR ────────────────────────────────────────────────────────────────────
function Navbar(showBack, backFn, backLabel) {
  const nav = $('nav', {style:'position:sticky;top:0;z-index:50;background:#fff;border-bottom:1px solid var(--border);padding:0 20px;display:flex;align-items:center;justify-content:space-between;height:56px;box-shadow:0 1px 3px rgba(0,0,0,0.06);'});
  const left = $('div', {style:'display:flex;align-items:center;gap:12px;'});
  if (showBack) {
    left.appendChild($('button', {style:'background:none;border:none;color:var(--muted);font-size:22px;padding:0;line-height:1;display:flex;align-items:center;', onClick:backFn, text:'←'}));
  }
  const logo = $('div', {style:'display:flex;align-items:center;gap:6px;cursor:pointer;', onClick:()=>{S.screen='home';render();}});
  logo.appendChild($('div', {style:'background:linear-gradient(135deg,#0ea5e9,#7c3aed);width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;', text:'M'}));
  logo.appendChild($('span', {style:'font-family:var(--ffh);font-weight:800;font-size:18px;color:#0f172a;', text:'Mock'}));
  logo.appendChild($('span', {style:'font-family:var(--ffh);font-weight:800;font-size:18px;color:#0ea5e9;', text:'Adda'}));
  left.appendChild(logo);
  nav.appendChild(left);

  const right = $('div', {style:'display:flex;align-items:center;gap:10px;'});
  right.appendChild($('div', {style:'font-size:12px;color:var(--muted);font-weight:500;', text:'Free Mock Tests'}));
  nav.appendChild(right);
  return nav;
}

// ── HOME SCREEN ───────────────────────────────────────────────────────────────
function homeScreen() {
  const root = $('div', {class:'fade-in'});
  root.appendChild(Navbar(false));

  // Hero
  const hero = $('div', {style:'background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%);padding:40px 20px 50px;text-align:center;position:relative;overflow:hidden;'});
  hero.appendChild($('div', {style:'position:absolute;top:-60px;left:-60px;width:200px;height:200px;background:rgba(14,165,233,0.08);border-radius:50%;'}));
  hero.appendChild($('div', {style:'position:absolute;bottom:-80px;right:-40px;width:250px;height:250px;background:rgba(124,58,237,0.07);border-radius:50%;'}));
  hero.appendChild($('div', {style:'position:relative;'},[
    $('div', {style:'display:inline-block;background:rgba(14,165,233,0.15);border:1px solid rgba(14,165,233,0.3);color:#38bdf8;font-size:11px;font-weight:600;padding:4px 14px;border-radius:20px;letter-spacing:0.08em;margin-bottom:16px;', text:'🎯 FREE MOCK TESTS FOR ALL EXAMS'}),
    $('h1', {style:'font-family:var(--ffh);font-weight:800;font-size:28px;color:#fff;line-height:1.25;margin-bottom:12px;', text:'One Destination for Complete Exam Preparation'}),
    $('p', {style:'color:#94a3b8;font-size:14px;line-height:1.6;margin-bottom:24px;', text:'Practice with real exam-pattern mock tests for SSC, Banking, Railways, Teaching & more.'}),

    // Stats row
    $('div', {style:'display:flex;justify-content:center;gap:24px;flex-wrap:wrap;'}, [
      ...[[Object.keys(DATA).length+'','Categories'],[Object.values(DATA).reduce((a,c)=>a+Object.keys(c.exams).length,0)+'','Exams'],[Object.values(DATA).reduce((a,c)=>a+Object.values(c.exams).reduce((b,e)=>b+e.tests.length,0),0)+'','Mock Tests'],[Object.values(DATA).reduce((a,c)=>a+Object.values(c.exams).reduce((b,e)=>b+e.tests.reduce((d,t)=>d+t.questions.length,0),0),0)+'','Questions']].map(([v,l])=>
        $('div', {style:'text-align:center;'}, [
          $('div', {style:'font-family:var(--ffh);font-size:22px;font-weight:800;color:#0ea5e9;', text:v}),
          $('div', {style:'font-size:11px;color:#64748b;margin-top:2px;', text:l})
        ])
      )
    ])
  ]));
  root.appendChild(hero);

  // Category strip
  const catStrip = $('div', {style:'background:#fff;border-bottom:1px solid var(--border);padding:0 20px;overflow-x:auto;white-space:nowrap;scrollbar-width:none;'});
  catStrip.style.cssText += ';-webkit-overflow-scrolling:touch;';
  const inner = $('div', {style:'display:inline-flex;gap:4px;padding:10px 0;'});
  Object.entries(DATA).forEach(([k,cat]) => {
    const btn = $('button', {style:`background:none;border:2px solid transparent;padding:7px 16px;border-radius:20px;font-size:13px;font-weight:600;color:var(--muted);white-space:nowrap;transition:all 0.15s;`,
      onClick:()=>{ S.activeCat=k; S.screen='exams'; render(); }
    });
    btn.appendChild($('span', {text:cat.icon+' '+cat.name}));
    btn.addEventListener('mouseenter',()=>{ btn.style.background=cat.color+'15'; btn.style.color=cat.color; btn.style.borderColor=cat.color+'50'; });
    btn.addEventListener('mouseleave',()=>{ btn.style.background='none'; btn.style.color='var(--muted)'; btn.style.borderColor='transparent'; });
    inner.appendChild(btn);
  });
  catStrip.appendChild(inner);
  root.appendChild(catStrip);

  // Popular Exams section
  const section = $('div', {style:'padding:24px 20px 40px;'});
  section.appendChild($('div', {style:'display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;'}, [
    $('h2', {style:'font-family:var(--ffh);font-weight:800;font-size:18px;color:var(--text);', text:'Popular Exams'}),
    $('span', {style:'font-size:12px;color:var(--primary);font-weight:600;cursor:pointer;', text:'View All →'})
  ]));

  Object.entries(DATA).forEach(([catKey, cat]) => {
    section.appendChild($('div', {style:'margin-bottom:24px;'}, [
      $('div', {style:`display:flex;align-items:center;gap:8px;margin-bottom:12px;`}, [
        $('div', {style:`background:${cat.color}18;color:${cat.color};width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;`, text:cat.icon}),
        $('span', {style:'font-family:var(--ffh);font-weight:700;font-size:14px;color:var(--text);', text:cat.name}),
        $('span', {style:'font-size:11px;color:var(--muted);', text:`${Object.keys(cat.exams).length} Exams`})
      ]),
      $('div', {style:'display:grid;grid-template-columns:1fr 1fr;gap:10px;'},
        Object.entries(cat.exams).map(([examKey, exam]) => examCard(catKey, examKey, exam, cat.color))
      )
    ]));
  });
  root.appendChild(section);

  // Footer
  root.appendChild($('div', {style:'background:#0f172a;padding:24px 20px;text-align:center;'}, [
    $('div', {style:'font-family:var(--ffh);font-weight:800;font-size:16px;color:#fff;margin-bottom:4px;', text:'MockAdda'}),
    $('div', {style:'font-size:12px;color:#64748b;', text:'Free Mock Tests for Competitive Exams • India 🇮🇳'})
  ]));

  return root;
}

function examCard(catKey, examKey, exam, color) {
  const testCount = exam.tests.length;
  const qCount = exam.tests.reduce((a,t)=>a+t.questions.length,0);
  const card = $('div', {style:`background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:14px;cursor:pointer;transition:all 0.15s;box-shadow:var(--shadow);position:relative;overflow:hidden;`});
  card.appendChild($('div', {style:`position:absolute;top:0;right:0;width:50px;height:50px;background:${color};opacity:0.06;border-radius:0 12px 0 50px;`}));
  card.appendChild($('div', {style:`font-size:22px;margin-bottom:8px;`, text:exam.name.split(' ').length > 2 ? '📝' : '📋'}));
  card.appendChild($('div', {style:'font-family:var(--ffh);font-weight:700;font-size:13px;color:var(--text);margin-bottom:3px;', text:exam.name}));
  card.appendChild($('div', {style:'font-size:11px;color:var(--muted);margin-bottom:10px;line-height:1.4;', text:exam.fullname}));
  card.appendChild($('div', {style:'display:flex;gap:8px;flex-wrap:wrap;'}, [
    $('span', {style:`background:${color}15;color:${color};font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;`, text:`${testCount} Tests`}),
    $('span', {style:`background:#f1f5f9;color:var(--muted);font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;`, text:`${qCount} Qs`})
  ]));
  card.addEventListener('mouseenter',()=>{ card.style.borderColor=color; card.style.transform='translateY(-2px)'; card.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'; });
  card.addEventListener('mouseleave',()=>{ card.style.borderColor='var(--border)'; card.style.transform=''; card.style.boxShadow='var(--shadow)'; });
  card.addEventListener('click',()=>{ S.activeCat=catKey; S.activeExamKey=examKey; S.activeExam=exam; S.screen='tests'; render(); });
  return card;
}

// ── EXAMS SCREEN ──────────────────────────────────────────────────────────────
function examsScreen() {
  const cat = DATA[S.activeCat];
  const root = $('div', {class:'fade-in'});
  root.appendChild(Navbar(true, ()=>{ S.screen='home'; render(); }));

  // Category header
  const hdr = $('div', {style:`background:linear-gradient(135deg,${cat.color}22,${cat.color}08);border-bottom:1px solid var(--border);padding:20px;`});
  hdr.appendChild($('div', {style:'display:flex;align-items:center;gap:12px;margin-bottom:4px;'}, [
    $('div', {style:`font-size:28px;`, text:cat.icon}),
    $('h2', {style:'font-family:var(--ffh);font-weight:800;font-size:20px;color:var(--text);', text:cat.name})
  ]));
  hdr.appendChild($('p', {style:'font-size:13px;color:var(--muted);', text:`${Object.keys(cat.exams).length} exams available`}));
  root.appendChild(hdr);

  const body = $('div', {style:'padding:20px;'});
  body.appendChild($('h3', {style:'font-family:var(--ffh);font-weight:700;font-size:15px;color:var(--text);margin-bottom:14px;', text:'Select an Exam'}));
  const grid = $('div', {style:'display:grid;grid-template-columns:1fr 1fr;gap:12px;'});
  Object.entries(cat.exams).forEach(([examKey, exam]) => {
    grid.appendChild(examCard(S.activeCat, examKey, exam, cat.color));
  });
  body.appendChild(grid);
  root.appendChild(body);
  return root;
}

// ── TESTS SCREEN ──────────────────────────────────────────────────────────────
function testsScreen() {
  const cat = DATA[S.activeCat];
  const exam = S.activeExam;
  const root = $('div', {class:'fade-in'});
  root.appendChild(Navbar(true, ()=>{ S.screen='exams'; render(); }));

  const hdr = $('div', {style:`background:linear-gradient(135deg,${cat.color}22,${cat.color}06);padding:20px;border-bottom:1px solid var(--border);`});
  hdr.appendChild($('div', {style:'display:flex;align-items:center;gap:10px;margin-bottom:4px;'}, [
    $('div', {style:`background:${cat.color};color:#fff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:10px;`, text:cat.name}),
  ]));
  hdr.appendChild($('h2', {style:'font-family:var(--ffh);font-weight:800;font-size:19px;color:var(--text);margin-bottom:4px;', text:exam.name}));
  hdr.appendChild($('p', {style:'font-size:12px;color:var(--muted);', text:exam.fullname}));
  root.appendChild(hdr);

  const body = $('div', {style:'padding:20px 20px 40px;'});
  body.appendChild($('p', {style:'font-size:13px;color:var(--muted);margin-bottom:18px;line-height:1.6;', text:'Select a mock test to begin. Tests are timed and auto-submitted when time expires.'}));

  exam.tests.forEach((t, i) => {
    const diffClr = {Easy:[cat.color+'18',cat.color], Medium:['#fff7ed','#d97706'], Hard:['#fef2f2','#dc2626']}[t.difficulty] || ['#f1f5f9','#64748b'];
    const card = $('div', {style:'background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:18px;margin-bottom:12px;box-shadow:var(--shadow);'});
    const top = $('div', {style:'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;'});
    top.appendChild($('div', {}, [
      $('div', {style:'font-family:var(--ffh);font-weight:700;font-size:15px;color:var(--text);margin-bottom:3px;', text:t.title}),
      $('div', {style:'font-size:11px;color:var(--muted);', text:`Mock Test ${i+1}`})
    ]));
    top.appendChild($('span', {style:`background:${diffClr[0]};color:${diffClr[1]};font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px;`, text:t.difficulty}));
    card.appendChild(top);

    const meta = $('div', {style:'display:flex;gap:20px;margin-bottom:16px;'});
    [['⏱',`${t.duration} min`],['❓',`${t.questions.length} Questions`],['📝','MCQ']].forEach(([ic,tx])=>{
      meta.appendChild($('div', {style:'display:flex;align-items:center;gap:5px;font-size:12px;color:var(--muted);'}, [
        $('span', {style:'font-size:14px;', text:ic}), tx
      ]));
    });
    card.appendChild(meta);

    card.appendChild($('button', {
      style:`width:100%;padding:12px;background:${cat.color};color:#fff;border:none;border-radius:10px;font-family:var(--ffh);font-weight:700;font-size:14px;transition:opacity 0.15s;`,
      text:'Start Mock Test →',
      onClick:()=>startQuiz(S.activeCat, S.activeExamKey, t)
    }));
    body.appendChild(card);
  });
  root.appendChild(body);
  return root;
}

// ── QUIZ SCREEN (dark) ────────────────────────────────────────────────────────
function quizScreen() {
  const test=S.test, qs=test.questions, q=qs[S.qi], sel=S.ans[S.qi];
  const cat = DATA[S.activeCat];
  const answered = Object.keys(S.ans).length;
  const accentColor = cat.color;

  const root = $('div', {style:`min-height:100vh;background:${QC.bg};font-family:${QC.ff};color:${QC.text};display:flex;flex-direction:column;`});

  // Top bar
  const topBar = $('div', {style:`padding:10px 16px;background:${QC.surface};border-bottom:1px solid ${QC.border};display:flex;align-items:center;justify-content:space-between;flex-shrink:0;`});
  topBar.appendChild($('div', {}, [
    $('div', {style:`font-size:10px;color:${QC.muted};font-weight:600;letter-spacing:0.08em;text-transform:uppercase;`, text:S.activeExam.name}),
    $('div', {style:`font-family:${QC.ffh};font-weight:700;font-size:12px;color:${QC.text};margin-top:1px;`, text:test.title})
  ]));
  const rightBar = $('div', {style:'display:flex;align-items:center;gap:8px;'});
  rightBar.appendChild($('div', {id:'timerDisp', style:`background:${accentColor}22;color:${accentColor};border:1px solid ${accentColor}44;padding:5px 10px;border-radius:8px;font-family:${QC.ffh};font-weight:700;font-size:15px;`, text:'⏱ '+fmt(S.timeLeft)}));
  rightBar.appendChild($('button', {style:`background:${QC.card};border:1px solid ${QC.border};color:${QC.text};padding:5px 10px;border-radius:8px;font-size:12px;`, text:`📋 ${answered}/${qs.length}`, onClick:()=>{ S.navOpen=true; render(); }}));
  topBar.appendChild(rightBar);
  root.appendChild(topBar);

  // Question area
  const qArea = $('div', {style:'flex:1;overflow-y:auto;padding:18px 18px 0;'});
  const qTop = $('div', {style:'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;'});
  qTop.appendChild($('div', {style:`background:${accentColor}22;color:${accentColor};padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;`, text:`Q ${S.qi+1} / ${qs.length}`}));
  const isFlagged = S.flagged.has(S.qi);
  qTop.appendChild($('button', {style:`background:${isFlagged?QC.purple+'22':'none'};border:1px solid ${isFlagged?QC.purple:QC.border};color:${isFlagged?QC.purple:QC.muted};padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;`, text:isFlagged?'🚩 Flagged':'🏳 Flag',
    onClick:()=>{ isFlagged ? S.flagged.delete(S.qi) : S.flagged.add(S.qi); render(); }
  }));
  qArea.appendChild(qTop);

  qArea.appendChild($('div', {style:`background:${QC.card};border:1px solid ${QC.border};border-radius:12px;padding:16px 18px;margin-bottom:18px;font-size:15px;font-weight:500;line-height:1.65;color:${QC.text};`, text:q.q}));

  const opts = $('div', {style:'display:flex;flex-direction:column;gap:10px;padding-bottom:100px;'});
  q.opts.forEach((opt, i) => {
    const isSel = sel===i;
    const btn = $('button', {style:`text-align:left;padding:13px 16px;border-radius:12px;border:2px solid ${isSel?accentColor:QC.border};background:${isSel?accentColor+'22':QC.card};color:${QC.text};font-size:14px;line-height:1.5;display:flex;align-items:center;gap:12px;width:100%;transition:all 0.12s;`});
    btn.appendChild($('span', {style:`width:28px;height:28px;border-radius:50%;flex-shrink:0;border:2px solid ${isSel?accentColor:QC.dim};background:${isSel?accentColor:'transparent'};color:${isSel?'#fff':QC.dim};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;`, text:'ABCD'[i]}));
    btn.appendChild(opt);
    btn.addEventListener('click',()=>{ S.ans[S.qi]=i; render(); });
    opts.appendChild(btn);
  });
  qArea.appendChild(opts);
  root.appendChild(qArea);

  // Bottom nav
  const bottom = $('div', {style:`padding:12px 18px 18px;background:${QC.surface};border-top:1px solid ${QC.border};display:flex;gap:10px;flex-shrink:0;`});
  bottom.appendChild($('button', {style:`flex:1;padding:12px;background:${QC.card};border:1px solid ${QC.border};color:${S.qi===0?QC.dim:QC.text};border-radius:10px;font-weight:600;font-size:14px;`, text:'← Prev', onClick:()=>{ if(S.qi>0) goQ(S.qi-1); }}));
  if (S.qi===qs.length-1) {
    bottom.appendChild($('button', {style:`flex:2;padding:12px;background:${QC.green};border:none;color:#fff;border-radius:10px;font-family:${QC.ffh};font-weight:700;font-size:14px;`, text:'Submit ✓', onClick:()=>{ S.confirm=true; render(); }}));
  } else {
    bottom.appendChild($('button', {style:`flex:1;padding:12px;background:${accentColor};border:none;color:#fff;border-radius:10px;font-weight:700;font-size:14px;`, text:'Next →', onClick:()=>goQ(S.qi+1)}));
  }
  root.appendChild(bottom);

  if (S.navOpen) root.appendChild(navPanel(qs, accentColor));
  if (S.confirm) root.appendChild(confirmPanel(qs, answered, accentColor));
  return root;
}

function navPanel(qs, accentColor) {
  const overlay = $('div', {style:`position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:100;display:flex;align-items:flex-end;`, onClick:()=>{ S.navOpen=false; render(); }});
  const panel = $('div', {style:`background:${QC.surface};width:100%;border-radius:18px 18px 0 0;padding:22px;max-height:72vh;overflow-y:auto;`, onClick:e=>e.stopPropagation()});
  panel.appendChild($('div', {style:'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;'}, [
    $('div', {style:`font-family:${QC.ffh};font-weight:700;font-size:16px;color:${QC.text};`, text:'Question Navigator'}),
    $('button', {style:`background:none;border:none;color:${QC.muted};font-size:22px;`, text:'✕', onClick:()=>{ S.navOpen=false; render(); }})
  ]));
  const legend = $('div', {style:'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;'});
  [[QC.dim,'Not Visited'],[QC.red,'Not Answered'],[QC.green,'Answered'],[QC.purple,'Flagged']].forEach(([c,l])=>{
    legend.appendChild($('div', {style:'display:flex;align-items:center;gap:5px;font-size:11px;color:'+QC.muted+';'}, [
      $('div', {style:`width:10px;height:10px;border-radius:2px;background:${c};`}), l
    ]));
  });
  panel.appendChild(legend);
  const grid = $('div', {style:'display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:18px;'});
  qs.forEach((_,i)=>{
    const st=qStatus(i), c=STATUS_CLR[st];
    grid.appendChild($('button', {style:`padding:9px 0;border-radius:8px;background:${i===S.qi?c:c+'28'};border:2px solid ${c};color:${i===S.qi?'#fff':c};font-weight:700;font-size:13px;`, text:String(i+1), onClick:()=>goQ(i)}));
  });
  panel.appendChild(grid);
  panel.appendChild($('button', {style:`width:100%;padding:14px;background:${QC.green};border:none;color:#fff;border-radius:10px;font-family:${QC.ffh};font-weight:700;font-size:15px;`, text:'Submit Test ✓', onClick:()=>{ S.navOpen=false; S.confirm=true; render(); }}));
  overlay.appendChild(panel);
  return overlay;
}

function confirmPanel(qs, answered, accentColor) {
  const overlay = $('div', {style:`position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;`});
  const box = $('div', {style:`background:${QC.surface};border-radius:16px;padding:24px;border:1px solid ${QC.border};width:100%;max-width:320px;`});
  box.appendChild($('div', {style:`font-family:${QC.ffh};font-weight:700;font-size:18px;margin-bottom:10px;color:${QC.text};`, text:'Submit Test?'}));
  const rem = qs.length - answered;
  box.appendChild($('div', {style:`font-size:13px;color:${QC.muted};margin-bottom:6px;`}, ['Answered: ', $('strong', {style:`color:${QC.green};`, text:String(answered)}), ` / ${qs.length}`]));
  box.appendChild($('div', {style:`font-size:13px;color:${rem>0?QC.red:QC.green};margin-bottom:18px;`, text:rem>0?`⚠ ${rem} question(s) unattempted`:'✓ All questions attempted!'}));
  box.appendChild($('div', {style:'display:flex;gap:10px;'}, [
    $('button', {style:`flex:1;padding:12px;background:${QC.card};border:1px solid ${QC.border};color:${QC.text};border-radius:10px;font-weight:600;`, text:'Cancel', onClick:()=>{ S.confirm=false; render(); }}),
    $('button', {style:`flex:1;padding:12px;background:${QC.green};border:none;color:#fff;border-radius:10px;font-family:${QC.ffh};font-weight:700;`, text:'Submit', onClick:submit})
  ]));
  overlay.appendChild(box);
  return overlay;
}

// ── RESULTS SCREEN ────────────────────────────────────────────────────────────
function resultsScreen() {
  const r = getResults();
  const {correct,wrong,unattempted,score,total} = r;
  const cat = DATA[S.activeCat];
  const C = 2*Math.PI*58, filled=(score/100)*C;
  const ringColor = score>=75?QC.green:score>=40?cat.color:QC.red;

  const root = $('div', {style:`min-height:100vh;background:${QC.bg};font-family:${QC.ff};color:${QC.text};`});

  // Header
  const hdr = $('div', {style:`padding:12px 20px;background:${QC.surface};border-bottom:1px solid ${QC.border};display:flex;align-items:center;gap:12px;`});
  hdr.appendChild($('button', {style:`background:none;border:none;color:${QC.muted};font-size:22px;`, text:'←', onClick:()=>{ S.screen='tests'; render(); }}));
  hdr.appendChild($('div', {}, [
    $('div', {style:`font-family:${QC.ffh};font-weight:700;font-size:17px;color:${QC.text};`, text:'Test Results'}),
    $('div', {style:`font-size:11px;color:${QC.muted};margin-top:1px;`, text:S.test.title})
  ]));
  root.appendChild(hdr);

  const body = $('div', {style:'padding:22px 20px 40px;'});

  // Score circle
  const scoreWrap = $('div', {style:'text-align:center;margin-bottom:24px;'});
  scoreWrap.innerHTML = `<svg width="150" height="150" viewBox="0 0 150 150">
    <circle cx="75" cy="75" r="58" fill="none" stroke="${QC.card}" stroke-width="10"/>
    <circle cx="75" cy="75" r="58" fill="none" stroke="${ringColor}" stroke-width="10" stroke-dasharray="${filled} ${C}" stroke-linecap="round" transform="rotate(-90 75 75)"/>
    <text x="75" y="68" text-anchor="middle" fill="#f1f5f9" font-size="26" font-weight="800" font-family="Syne">${score}%</text>
    <text x="75" y="90" text-anchor="middle" fill="#94a3b8" font-size="11">${correct}/${total} correct</text>
  </svg>`;
  scoreWrap.appendChild($('div', {style:`font-family:${QC.ffh};font-weight:800;font-size:20px;margin-top:4px;color:${QC.text};`, text:score>=75?'🎉 Excellent!':score>=40?'👍 Good Effort!':'📚 Keep Practicing!'}));
  scoreWrap.appendChild($('div', {style:`font-size:12px;color:${QC.muted};margin-top:4px;`, text:`Time: ${Math.floor(S.timeTaken/60)}m ${S.timeTaken%60}s`}));
  body.appendChild(scoreWrap);

  // Stats grid
  const sg = $('div', {style:'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;'});
  [[QC.green,'✓','Correct',correct],[QC.red,'✗','Wrong',wrong],[QC.dim,'–','Skipped',unattempted],[QC.muted,'⏱','Duration',`${S.test.duration}m`]].forEach(([c,ic,lb,vl])=>{
    sg.appendChild($('div', {style:`background:${QC.card};border:1px solid ${QC.border};border-radius:12px;padding:14px 12px;`}, [
      $('div', {style:`color:${c};font-size:20px;margin-bottom:4px;`, text:ic}),
      $('div', {style:`font-family:${QC.ffh};font-weight:700;font-size:22px;color:${c};`, text:String(vl)}),
      $('div', {style:`font-size:11px;color:${QC.muted};`, text:lb})
    ]));
  });
  body.appendChild(sg);

  // Review toggle
  body.appendChild($('button', {style:`width:100%;padding:11px;background:${QC.card};border:1px solid ${QC.border};color:${QC.text};border-radius:10px;font-weight:600;font-size:13px;margin-bottom:16px;`, text:(S.reviewOpen?'Hide':'View')+' Answer Review '+(S.reviewOpen?'▲':'▼'), onClick:()=>{ S.reviewOpen=!S.reviewOpen; render(); }}));

  if (S.reviewOpen) {
    const rv = $('div', {style:'margin-bottom:16px;'});
    S.test.questions.forEach((q,i)=>{
      const ua=S.ans[i], ok=ua===q.ans, sk=ua===undefined;
      const brd = sk?QC.border:ok?QC.green+'35':QC.red+'35';
      const card = $('div', {style:`background:${QC.card};border:1px solid ${brd};border-radius:12px;padding:12px 14px;margin-bottom:8px;`});
      const row = $('div', {style:'display:flex;justify-content:space-between;gap:8px;'});
      const qt = $('div', {style:`font-size:12px;line-height:1.5;flex:1;color:${QC.text};`}, [$('span', {style:`color:${QC.muted};margin-right:6px;font-weight:600;`, text:`Q${i+1}.`}), q.q]);
      row.appendChild(qt);
      row.appendChild($('span', {style:`flex-shrink:0;color:${sk?QC.dim:ok?QC.green:QC.red};font-size:16px;`, text:sk?'–':ok?'✓':'✗'}));
      card.appendChild(row);
      if (!sk&&!ok) card.appendChild($('div', {style:`margin-top:6px;font-size:11px;color:${QC.green};`, text:`Correct: ${q.opts[q.ans]}`}));
      if (sk) card.appendChild($('div', {style:`margin-top:6px;font-size:11px;color:${QC.muted};`, text:`Answer: ${q.opts[q.ans]}`}));
      rv.appendChild(card);
    });
    body.appendChild(rv);
  }

  body.appendChild($('div', {style:'display:flex;gap:10px;'}, [
    $('button', {style:`flex:1;padding:12px;background:${QC.card};border:1px solid ${QC.border};color:${QC.text};border-radius:10px;font-weight:600;font-size:13px;`, text:'Retry', onClick:()=>startQuiz(S.activeCat, S.activeExamKey, S.test)}),
    $('button', {style:`flex:1;padding:12px;background:${cat.color};border:none;color:#fff;border-radius:10px;font-family:${QC.ffh};font-weight:700;font-size:13px;`, text:'More Tests', onClick:()=>{ S.screen='tests'; render(); }})
  ]));
  root.appendChild(body);
  return root;
}

// ── BOOT ──────────────────────────────────────────────────────────────────────
render();
fetch('questions.json')
  .then(r=>{ if(!r.ok) throw new Error(); return r.json(); })
  .then(data=>{ DATA=data; S.screen='home'; render(); })
  .catch(()=>{ app.innerHTML=`<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;padding:20px;text-align:center;"><div style="font-size:32px;">⚠️</div><div style="font-family:var(--ffh);font-weight:700;">Could not load questions.json</div><div style="font-size:13px;color:var(--muted);">Make sure questions.json is in the same folder.</div></div>`; });
