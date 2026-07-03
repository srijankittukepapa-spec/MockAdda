'use strict';

let DATA = {};
let S = {
  screen: 'loading',
  activeCatKey: null,
  activeExamKey: null,
  activeExam: null,
  test: null,
  qi: 0, ans: {}, flagged: new Set(), visited: new Set([0]),
  timeLeft: 0, timeTaken: 0, startTime: null,
  navOpen: false, confirm: false, reviewOpen: false
};
let timerHandle = null;
const app = document.getElementById('app');

const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const qs = (sel, ctx=document) => ctx.querySelector(sel);

function el(tag, props={}, children=[]) {
  const e = document.createElement(tag);
  for (const [k,v] of Object.entries(props)) {
    if (k === 'style') Object.assign(e.style, v);
    else if (k === 'css') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v);
  }
  children.filter(Boolean).forEach(c =>
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c)
  );
  return e;
}

const render = () => { app.innerHTML = ''; app.appendChild(buildScreen()); window.scrollTo(0,0); };
const go = screen => { S.screen = screen; render(); };

// ── QUIZ THEME ────────────────────────────────────────────────────────────────
const Q = {
  bg:'#070c18', surface:'#0d1426', card:'#121c33',
  border:'rgba(255,255,255,0.08)',
  green:'#34d399', red:'#f87171', purple:'#a78bfa', dim:'#475569',
  text:'#f1f5f9', muted:'#94a3b8',
};
const ST = { unvisited:Q.dim, visited:Q.red, answered:Q.green, flagged:Q.purple, 'ans-flag':Q.purple };

// ── QUIZ LOGIC ────────────────────────────────────────────────────────────────
function startQuiz(catKey, examKey, test) {
  S.activeCatKey = catKey;        // always keep as string key
  S.activeExamKey = examKey;
  S.activeExam = DATA[catKey].exams[examKey];
  S.test = { ...test, questions: [...test.questions] };
  S.qi=0; S.ans={}; S.flagged=new Set(); S.visited=new Set([0]);
  S.timeLeft=test.duration*60; S.startTime=Date.now();
  S.navOpen=false; S.confirm=false; S.reviewOpen=false;
  S.screen='quiz';
  render();
  startTimer();
}

function startTimer() {
  clearInterval(timerHandle);
  timerHandle = setInterval(() => {
    S.timeLeft = Math.max(0, S.timeLeft - 1);
    if (S.timeLeft === 0) { clearInterval(timerHandle); submit(); return; }
    const d = document.getElementById('timerDisp');
    if (d) {
      d.textContent = '⏱ ' + fmt(S.timeLeft);
      if (S.timeLeft < 60) { d.style.background='rgba(248,113,113,0.15)'; d.style.color=Q.red; }
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
    if (S.ans[i]===undefined) return;
    S.ans[i]===q.ans ? correct++ : wrong++;
  });
  const total = S.test.questions.length;
  return { correct, wrong, unattempted:total-correct-wrong, score:Math.round((correct/total)*100), total };
}
function qStatus(i) {
  if (!S.visited.has(i)) return 'unvisited';
  const a=S.ans[i]!==undefined, f=S.flagged.has(i);
  if (a&&f) return 'ans-flag';
  if (a) return 'answered';
  if (f) return 'flagged';
  return 'visited';
}

// ── DATA HELPERS ──────────────────────────────────────────────────────────────
function totalExams() { return Object.values(DATA).reduce((a,c)=>a+Object.keys(c.exams).length,0); }
function totalTests() { return Object.values(DATA).reduce((a,c)=>a+Object.values(c.exams).reduce((b,e)=>b+e.tests.length,0),0); }
function totalQuestions() { return Object.values(DATA).reduce((a,c)=>a+Object.values(c.exams).reduce((b,e)=>b+e.tests.reduce((d,t)=>d+t.questions.length,0),0),0); }

// ── SCREEN ROUTER ─────────────────────────────────────────────────────────────
function buildScreen() {
  const map = { loading:loadingScreen, home:homeScreen, exams:examsScreen,
    tests:testsScreen, quiz:quizScreen, results:resultsScreen,
    privacy:privacyScreen, contact:contactScreen, about:aboutScreen, terms:termsScreen };
  return (map[S.screen]||loadingScreen)();
}

// ── LOADING ───────────────────────────────────────────────────────────────────
function loadingScreen() {
  const wrap = el('div',{css:'min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;background:#f8fafc;'});
  wrap.appendChild(el('div',{css:'width:44px;height:44px;border:4px solid #e2e8f0;border-top:4px solid #0ea5e9;border-radius:50%;animation:spin 1s linear infinite;'}));
  wrap.appendChild(el('div',{css:'font-family:Syne,sans-serif;font-weight:700;color:#0ea5e9;font-size:16px;',text:'Loading MockAdda...'}));
  return wrap;
}

// ── NAVBAR ────────────────────────────────────────────────────────────────────
function Navbar() {
  const nav = el('nav',{css:'position:sticky;top:0;z-index:50;background:#fff;border-bottom:1px solid #e2e8f0;padding:0 20px;display:flex;align-items:center;justify-content:space-between;height:58px;box-shadow:0 1px 4px rgba(0,0,0,0.06);'});
  const logo = el('div',{css:'display:flex;align-items:center;gap:8px;cursor:pointer;', onClick:()=>go('home')});
  const logoIcon = el('div',{css:'width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#0ea5e9,#7c3aed);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:17px;font-family:Syne,sans-serif;',text:'M'});
  const logoText = el('div',{css:'display:flex;align-items:baseline;gap:1px;'});
  logoText.appendChild(el('span',{css:'font-family:Syne,sans-serif;font-weight:800;font-size:19px;color:#0f172a;',text:'Mock'}));
  logoText.appendChild(el('span',{css:'font-family:Syne,sans-serif;font-weight:800;font-size:19px;color:#0ea5e9;',text:'Adda'}));
  logo.appendChild(logoIcon); logo.appendChild(logoText);
  nav.appendChild(logo);
  const right = el('div',{css:'display:flex;align-items:center;gap:10px;'});
  right.appendChild(el('a',{href:'mailto:contact@mockadda.com',css:'font-size:12px;color:#64748b;font-weight:500;text-decoration:none;',text:'Contact'}));
  nav.appendChild(right);
  return nav;
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function homeScreen() {
  const root = el('div');
  root.appendChild(Navbar());

  // Hero
  const hero = el('div',{css:'background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 60%,#0f172a 100%);padding:44px 20px 48px;text-align:center;position:relative;overflow:hidden;'});
  hero.appendChild(el('div',{css:'position:absolute;top:-80px;left:-80px;width:260px;height:260px;background:rgba(14,165,233,0.07);border-radius:50%;pointer-events:none;'}));
  hero.appendChild(el('div',{css:'position:absolute;bottom:-100px;right:-60px;width:300px;height:300px;background:rgba(124,58,237,0.06);border-radius:50%;pointer-events:none;'}));
  const heroInner = el('div',{css:'position:relative;max-width:600px;margin:0 auto;'});
  heroInner.appendChild(el('div',{css:'display:inline-block;background:rgba(14,165,233,0.15);border:1px solid rgba(14,165,233,0.3);color:#38bdf8;font-size:11px;font-weight:700;padding:5px 16px;border-radius:20px;letter-spacing:0.1em;margin-bottom:18px;',text:'🎯 FREE MOCK TESTS FOR ALL COMPETITIVE EXAMS'}));
  heroInner.appendChild(el('h1',{css:'font-family:Syne,sans-serif;font-weight:800;font-size:26px;color:#fff;line-height:1.3;margin-bottom:12px;',text:'One Destination for Complete Exam Preparation'}));
  heroInner.appendChild(el('p',{css:'color:#94a3b8;font-size:14px;line-height:1.7;margin-bottom:28px;',text:'Practice with real exam-pattern mock tests for SSC, Banking, Railways, Teaching & Civil Services.'}));
  const learnRow = el('div',{css:'display:flex;justify-content:center;gap:6px;align-items:center;margin-bottom:28px;flex-wrap:wrap;'});
  ['Learn','Practice','Improve','Succeed'].forEach((t,i,arr) => {
    learnRow.appendChild(el('span',{css:'color:#f1f5f9;font-size:13px;font-weight:600;',text:t}));
    if(i<arr.length-1) learnRow.appendChild(el('span',{css:'color:#0ea5e9;font-size:16px;',text:'→'}));
  });
  heroInner.appendChild(learnRow);

  // Stats
  const stats = el('div',{css:'display:flex;justify-content:center;gap:0;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;'});
  [[Object.keys(DATA).length+'','Categories'],[totalExams()+'','Exams'],[totalTests()+'','Mock Tests'],[totalQuestions()+'','Questions']].forEach(([v,l],i,arr) => {
    const stat = el('div',{css:`flex:1;padding:16px 10px;text-align:center;${i<arr.length-1?'border-right:1px solid rgba(255,255,255,0.08);':''}`});
    stat.appendChild(el('div',{css:'font-family:Syne,sans-serif;font-size:22px;font-weight:800;color:#0ea5e9;',text:v}));
    stat.appendChild(el('div',{css:'font-size:10px;color:#64748b;margin-top:2px;font-weight:500;',text:l}));
    stats.appendChild(stat);
  });
  heroInner.appendChild(stats);
  hero.appendChild(heroInner);
  root.appendChild(hero);

  // Category filter tabs
  const tabWrap = el('div',{css:'background:#fff;border-bottom:2px solid #e2e8f0;padding:0 20px;overflow-x:auto;white-space:nowrap;-webkit-overflow-scrolling:touch;scrollbar-width:none;'});
  const tabs = el('div',{css:'display:inline-flex;gap:2px;'});
  Object.entries(DATA).forEach(([k,cat]) => {
    const tab = el('button',{
      css:`background:none;border:none;border-bottom:2px solid transparent;margin-bottom:-2px;padding:14px 16px;font-size:13px;font-weight:600;color:#64748b;cursor:pointer;white-space:nowrap;transition:all 0.15s;`,
      onClick:()=>{ S.activeCatKey=k; go('exams'); }
    });
    tab.appendChild(el('span',{text:cat.icon+' '+cat.name}));
    tab.addEventListener('mouseenter',()=>{ tab.style.color=cat.color; tab.style.borderBottomColor=cat.color; });
    tab.addEventListener('mouseleave',()=>{ tab.style.color='#64748b'; tab.style.borderBottomColor='transparent'; });
    tabs.appendChild(tab);
  });
  tabWrap.appendChild(tabs);
  root.appendChild(tabWrap);

  // Body
  const body = el('div',{css:'padding:28px 20px 20px;max-width:800px;margin:0 auto;'});

  // Info banner
  const banner = el('div',{css:'background:linear-gradient(135deg,#f0f9ff,#faf5ff);border:1px solid #e0f2fe;border-radius:14px;padding:16px 18px;margin-bottom:28px;display:flex;align-items:center;gap:14px;'});
  banner.appendChild(el('div',{css:'font-size:28px;flex-shrink:0;',text:'📊'}));
  const bannerText = el('div');
  bannerText.appendChild(el('div',{css:'font-family:Syne,sans-serif;font-weight:700;font-size:14px;color:#0f172a;margin-bottom:3px;',text:'Real Exam Pattern Mock Tests'}));
  bannerText.appendChild(el('div',{css:'font-size:12px;color:#64748b;line-height:1.5;',text:'All tests follow the latest exam pattern with timed interface, auto-submit, and detailed result analysis.'}));
  banner.appendChild(bannerText);
  body.appendChild(banner);

  // Exams by category
  body.appendChild(el('h2',{css:'font-family:Syne,sans-serif;font-weight:800;font-size:18px;color:#0f172a;margin-bottom:20px;',text:'Popular Exams'}));
  Object.entries(DATA).forEach(([catKey,cat]) => {
    const section = el('div',{css:'margin-bottom:28px;'});
    const secHead = el('div',{css:'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;'});
    const secLeft = el('div',{css:'display:flex;align-items:center;gap:8px;'});
    secLeft.appendChild(el('div',{css:`width:32px;height:32px;background:${cat.color}18;color:${cat.color};border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;`,text:cat.icon}));
    secLeft.appendChild(el('span',{css:'font-family:Syne,sans-serif;font-weight:700;font-size:15px;color:#0f172a;',text:cat.name}));
    secLeft.appendChild(el('span',{css:'font-size:11px;color:#94a3b8;',text:`(${Object.keys(cat.exams).length} exams)`}));
    secHead.appendChild(secLeft);
    const viewAll = el('span',{css:`font-size:12px;color:${cat.color};font-weight:600;cursor:pointer;`,text:'View All →', onClick:()=>{ S.activeCatKey=catKey; go('exams'); }});
    secHead.appendChild(viewAll);
    section.appendChild(secHead);
    const grid = el('div',{css:'display:grid;grid-template-columns:1fr 1fr;gap:10px;'});
    Object.entries(cat.exams).forEach(([examKey,exam]) => grid.appendChild(examCard(catKey,examKey,exam,cat.color)));
    section.appendChild(grid);
    body.appendChild(section);
  });

  // Features section
  const features = el('div',{css:'background:linear-gradient(135deg,#0f172a,#1e1b4b);border-radius:16px;padding:24px 20px;margin-bottom:28px;'});
  features.appendChild(el('h3',{css:'font-family:Syne,sans-serif;font-weight:800;font-size:16px;color:#fff;text-align:center;margin-bottom:18px;',text:'Why MockAdda?'}));
  const featureGrid = el('div',{css:'display:grid;grid-template-columns:1fr 1fr;gap:12px;'});
  [['⏱','Timed Tests','Real CBT experience with auto-submit'],['📊','Detailed Results','Score, accuracy & time analysis'],['📝','Answer Review','Check correct answers after test'],['🆓','100% Free','No registration required']].forEach(([ic,t,d]) => {
    const f = el('div',{css:'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px 12px;'});
    f.appendChild(el('div',{css:'font-size:22px;margin-bottom:6px;',text:ic}));
    f.appendChild(el('div',{css:'font-family:Syne,sans-serif;font-weight:700;font-size:12px;color:#f1f5f9;margin-bottom:3px;',text:t}));
    f.appendChild(el('div',{css:'font-size:11px;color:#64748b;line-height:1.4;',text:d}));
    featureGrid.appendChild(f);
  });
  features.appendChild(featureGrid);
  body.appendChild(features);

  root.appendChild(body);
  root.appendChild(Footer());
  return root;
}

function examCard(catKey, examKey, exam, color) {
  const tc = exam.tests.length, qc = exam.tests.reduce((a,t)=>a+t.questions.length,0);
  const card = el('div',{css:`background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;padding:16px 14px;cursor:pointer;transition:all 0.18s;box-shadow:0 1px 3px rgba(0,0,0,0.06);position:relative;overflow:hidden;`});
  card.appendChild(el('div',{css:`position:absolute;top:0;right:0;width:56px;height:56px;background:${color};opacity:0.06;border-radius:0 14px 0 56px;pointer-events:none;`}));
  card.appendChild(el('div',{css:'font-size:22px;margin-bottom:8px;',text:exam.name.length > 8 ? '📝' : '📋'}));
  card.appendChild(el('div',{css:'font-family:Syne,sans-serif;font-weight:700;font-size:13px;color:#0f172a;margin-bottom:3px;',text:exam.name}));
  card.appendChild(el('div',{css:'font-size:10px;color:#94a3b8;margin-bottom:10px;line-height:1.4;',text:exam.fullname}));
  const tags = el('div',{css:'display:flex;gap:6px;flex-wrap:wrap;'});
  tags.appendChild(el('span',{css:`background:${color}18;color:${color};font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;`,text:`${tc} Tests`}));
  tags.appendChild(el('span',{css:'background:#f1f5f9;color:#64748b;font-size:10px;font-weight:600;padding:2px 8px;border-radius:8px;',text:`${qc} Qs`}));
  card.appendChild(tags);
  card.addEventListener('mouseenter',()=>{ card.style.borderColor=color; card.style.transform='translateY(-2px)'; card.style.boxShadow=`0 6px 20px ${color}22`; });
  card.addEventListener('mouseleave',()=>{ card.style.borderColor='#e2e8f0'; card.style.transform=''; card.style.boxShadow='0 1px 3px rgba(0,0,0,0.06)'; });
  card.addEventListener('click',()=>{ S.activeCatKey=catKey; S.activeExamKey=examKey; S.activeExam=exam; go('tests'); });
  return card;
}

// ── EXAMS SCREEN ──────────────────────────────────────────────────────────────
function examsScreen() {
  const cat = DATA[S.activeCatKey];
  const root = el('div');
  root.appendChild(Navbar());
  const hdr = el('div',{css:`background:linear-gradient(135deg,${cat.color}15,${cat.color}05);border-bottom:1px solid #e2e8f0;padding:20px;`});
  hdr.appendChild(el('button',{css:'background:none;border:none;color:#64748b;font-size:13px;cursor:pointer;margin-bottom:10px;display:flex;align-items:center;gap:4px;padding:0;',text:'← Back to Home', onClick:()=>go('home')}));
  hdr.appendChild(el('div',{css:'display:flex;align-items:center;gap:10px;'}, [
    el('div',{css:`font-size:28px;`,text:cat.icon}),
    el('h2',{css:'font-family:Syne,sans-serif;font-weight:800;font-size:20px;color:#0f172a;',text:cat.name})
  ]));
  hdr.appendChild(el('p',{css:'font-size:13px;color:#64748b;margin-top:4px;',text:`${Object.keys(cat.exams).length} exams available • Select to view tests`}));
  root.appendChild(hdr);
  const body = el('div',{css:'padding:20px;max-width:800px;margin:0 auto;'});
  const grid = el('div',{css:'display:grid;grid-template-columns:1fr 1fr;gap:12px;'});
  Object.entries(cat.exams).forEach(([examKey,exam]) => grid.appendChild(examCard(S.activeCatKey,examKey,exam,cat.color)));
  body.appendChild(grid);
  root.appendChild(body);
  root.appendChild(Footer());
  return root;
}

// ── TESTS SCREEN ──────────────────────────────────────────────────────────────
function testsScreen() {
  const cat = DATA[S.activeCatKey];
  const exam = S.activeExam;
  const root = el('div');
  root.appendChild(Navbar());
  const hdr = el('div',{css:`background:linear-gradient(135deg,${cat.color}15,${cat.color}04);padding:20px;border-bottom:1px solid #e2e8f0;`});
  hdr.appendChild(el('button',{css:'background:none;border:none;color:#64748b;font-size:13px;cursor:pointer;margin-bottom:10px;display:flex;align-items:center;gap:4px;padding:0;',text:'← Back', onClick:()=>go('exams')}));
  hdr.appendChild(el('div',{css:'display:flex;align-items:center;gap:8px;margin-bottom:6px;'},[
    el('span',{css:`background:${cat.color};color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:8px;`,text:cat.name})
  ]));
  hdr.appendChild(el('h2',{css:'font-family:Syne,sans-serif;font-weight:800;font-size:20px;color:#0f172a;margin-bottom:3px;',text:exam.name}));
  hdr.appendChild(el('p',{css:'font-size:12px;color:#64748b;',text:exam.fullname}));
  root.appendChild(hdr);
  const body = el('div',{css:'padding:20px;max-width:800px;margin:0 auto;'});
  body.appendChild(el('p',{css:'font-size:13px;color:#64748b;margin-bottom:18px;line-height:1.6;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;',text:'⚠️ Tests are timed. Once started, the timer cannot be paused. The test auto-submits when time expires.'}));
  exam.tests.forEach((t,i) => {
    const dc = {Easy:['#f0fdf4','#16a34a'], Medium:['#fffbeb','#d97706'], Hard:['#fef2f2','#dc2626']}[t.difficulty]||['#f8fafc','#64748b'];
    const card = el('div',{css:'background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;padding:18px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.06);'});
    const top = el('div',{css:'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;'});
    top.appendChild(el('div',{},[
      el('div',{css:'font-family:Syne,sans-serif;font-weight:700;font-size:15px;color:#0f172a;margin-bottom:3px;',text:t.title}),
      el('div',{css:'font-size:11px;color:#94a3b8;',text:`Mock Test ${i+1}`})
    ]));
    top.appendChild(el('span',{css:`background:${dc[0]};color:${dc[1]};font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;`,text:t.difficulty}));
    card.appendChild(top);
    const meta = el('div',{css:'display:flex;gap:18px;margin-bottom:16px;'});
    [['⏱',`${t.duration} min`],['❓',`${t.questions.length} Questions`],['📝','MCQ Format']].forEach(([ic,tx]) => {
      meta.appendChild(el('div',{css:'display:flex;align-items:center;gap:5px;font-size:12px;color:#64748b;'}, [el('span',{text:ic}), tx]));
    });
    card.appendChild(meta);
    const btn = el('button',{css:`width:100%;padding:13px;background:${cat.color};color:#fff;border:none;border-radius:10px;font-family:Syne,sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:opacity 0.15s;`,text:'Start Mock Test →'});
    btn.addEventListener('click',()=>startQuiz(S.activeCatKey, S.activeExamKey, t));
    btn.addEventListener('mouseenter',()=>{ btn.style.opacity='0.88'; });
    btn.addEventListener('mouseleave',()=>{ btn.style.opacity='1'; });
    card.appendChild(btn);
    body.appendChild(card);
  });
  root.appendChild(body);
  root.appendChild(Footer());
  return root;
}

// ── QUIZ SCREEN (dark) ────────────────────────────────────────────────────────
function quizScreen() {
  const test=S.test, qs=test.questions, q=qs[S.qi], sel=S.ans[S.qi];
  const cat = DATA[S.activeCatKey];
  const accent = cat ? cat.color : '#0ea5e9';
  const answered = Object.keys(S.ans).length;
  const root = el('div',{css:`min-height:100vh;background:${Q.bg};font-family:'DM Sans',sans-serif;color:${Q.text};display:flex;flex-direction:column;`});

  // Topbar
  const bar = el('div',{css:`padding:10px 16px;background:${Q.surface};border-bottom:1px solid ${Q.border};display:flex;align-items:center;justify-content:space-between;flex-shrink:0;`});
  bar.appendChild(el('div',{},[
    el('div',{css:`font-size:10px;color:${Q.muted};font-weight:600;letter-spacing:0.08em;text-transform:uppercase;`,text:(cat?cat.name:'Exam')+' → '+(S.activeExam?S.activeExam.name:'')}),
    el('div',{css:`font-family:Syne,sans-serif;font-weight:700;font-size:12px;color:${Q.text};margin-top:1px;`,text:test.title})
  ]));
  const rBar = el('div',{css:'display:flex;align-items:center;gap:8px;'});
  rBar.appendChild(el('div',{id:'timerDisp',css:`background:${accent}22;color:${accent};border:1px solid ${accent}44;padding:5px 10px;border-radius:8px;font-family:Syne,sans-serif;font-weight:700;font-size:15px;`,text:'⏱ '+fmt(S.timeLeft)}));
  rBar.appendChild(el('button',{css:`background:${Q.card};border:1px solid ${Q.border};color:${Q.text};padding:5px 10px;border-radius:8px;font-size:12px;cursor:pointer;`,text:`📋 ${answered}/${qs.length}`, onClick:()=>{ S.navOpen=true; render(); }}));
  bar.appendChild(rBar);
  root.appendChild(bar);

  // Progress bar
  const pbar = el('div',{css:`height:3px;background:${Q.border};`});
  pbar.appendChild(el('div',{css:`height:100%;background:${accent};width:${Math.round(((S.qi+1)/qs.length)*100)}%;transition:width 0.3s;`}));
  root.appendChild(pbar);

  // Question
  const qArea = el('div',{css:'flex:1;overflow-y:auto;padding:18px 18px 0;'});
  const qTop = el('div',{css:'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;'});
  qTop.appendChild(el('div',{css:`background:${accent}22;color:${accent};padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;`,text:`Q ${S.qi+1} / ${qs.length}`}));
  const isFlagged = S.flagged.has(S.qi);
  qTop.appendChild(el('button',{css:`background:${isFlagged?Q.purple+'22':'transparent'};border:1px solid ${isFlagged?Q.purple:Q.border};color:${isFlagged?Q.purple:Q.muted};padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;`,text:isFlagged?'🚩 Flagged':'🏳 Flag', onClick:()=>{ isFlagged?S.flagged.delete(S.qi):S.flagged.add(S.qi); render(); }}));
  qArea.appendChild(qTop);
  qArea.appendChild(el('div',{css:`background:${Q.card};border:1px solid ${Q.border};border-radius:12px;padding:16px 18px;margin-bottom:18px;font-size:15px;font-weight:500;line-height:1.65;color:${Q.text};`,text:q.q}));

  const opts = el('div',{css:'display:flex;flex-direction:column;gap:10px;padding-bottom:100px;'});
  q.opts.forEach((opt,i) => {
    const isSel = sel===i;
    const btn = el('div',{css:`text-align:left;padding:13px 16px;border-radius:12px;border:2px solid ${isSel?accent:Q.border};background:${isSel?accent+'22':Q.card};color:${Q.text};font-size:14px;line-height:1.5;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all 0.12s;`});
    btn.appendChild(el('span',{css:`width:28px;height:28px;border-radius:50%;flex-shrink:0;border:2px solid ${isSel?accent:Q.dim};background:${isSel?accent:'transparent'};color:${isSel?'#fff':Q.dim};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;`,text:'ABCD'[i]}));
    btn.appendChild(document.createTextNode(opt));
    btn.addEventListener('click',()=>{ S.ans[S.qi]=i; render(); });
    opts.appendChild(btn);
  });
  qArea.appendChild(opts);
  root.appendChild(qArea);

  // Bottom
  const bot = el('div',{css:`padding:12px 18px 18px;background:${Q.surface};border-top:1px solid ${Q.border};display:flex;gap:10px;flex-shrink:0;`});
  bot.appendChild(el('button',{css:`flex:1;padding:12px;background:${Q.card};border:1px solid ${Q.border};color:${S.qi===0?Q.dim:Q.text};border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;`,text:'← Prev', onClick:()=>{ if(S.qi>0) goQ(S.qi-1); }}));
  if (S.qi===qs.length-1) {
    bot.appendChild(el('button',{css:`flex:2;padding:12px;background:${Q.green};border:none;color:#000;border-radius:10px;font-family:Syne,sans-serif;font-weight:700;font-size:14px;cursor:pointer;`,text:'Submit Test ✓', onClick:()=>{ S.confirm=true; render(); }}));
  } else {
    bot.appendChild(el('button',{css:`flex:1;padding:12px;background:${accent};border:none;color:#fff;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;`,text:'Next →', onClick:()=>goQ(S.qi+1)}));
  }
  root.appendChild(bot);
  if (S.navOpen) root.appendChild(navPanel(qs, accent));
  if (S.confirm) root.appendChild(confirmPanel(qs, answered));
  return root;
}

function navPanel(qs, accent) {
  const ov = el('div',{css:`position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:100;display:flex;align-items:flex-end;`});
  ov.addEventListener('click',()=>{ S.navOpen=false; render(); });
  const pan = el('div',{css:`background:${Q.surface};width:100%;border-radius:18px 18px 0 0;padding:22px;max-height:72vh;overflow-y:auto;`});
  pan.addEventListener('click',e=>e.stopPropagation());
  pan.appendChild(el('div',{css:'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;'},[
    el('div',{css:`font-family:Syne,sans-serif;font-weight:700;font-size:16px;color:${Q.text};`,text:'Question Navigator'}),
    el('button',{css:`background:none;border:none;color:${Q.muted};font-size:22px;cursor:pointer;`,text:'✕', onClick:()=>{ S.navOpen=false; render(); }})
  ]));
  const leg = el('div',{css:'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;'});
  [[Q.dim,'Not Visited'],[Q.red,'Not Answered'],[Q.green,'Answered'],[Q.purple,'Flagged']].forEach(([c,l]) => {
    leg.appendChild(el('div',{css:`display:flex;align-items:center;gap:5px;font-size:11px;color:${Q.muted};`},[el('div',{css:`width:10px;height:10px;border-radius:2px;background:${c};`}),l]));
  });
  pan.appendChild(leg);
  const grid = el('div',{css:'display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:18px;'});
  qs.forEach((_,i) => {
    const st=qStatus(i), c=ST[st];
    grid.appendChild(el('button',{css:`padding:9px 0;border-radius:8px;background:${i===S.qi?c:c+'28'};border:2px solid ${c};color:${i===S.qi?'#000':c};font-weight:700;font-size:13px;cursor:pointer;`,text:String(i+1), onClick:()=>goQ(i)}));
  });
  pan.appendChild(grid);
  pan.appendChild(el('button',{css:`width:100%;padding:14px;background:${Q.green};border:none;color:#000;border-radius:10px;font-family:Syne,sans-serif;font-weight:700;font-size:15px;cursor:pointer;`,text:'Submit Test ✓', onClick:()=>{ S.navOpen=false; S.confirm=true; render(); }}));
  ov.appendChild(pan);
  return ov;
}

function confirmPanel(qs, answered) {
  const ov = el('div',{css:`position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;`});
  const box = el('div',{css:`background:${Q.surface};border-radius:16px;padding:24px;border:1px solid ${Q.border};width:100%;max-width:320px;`});
  box.appendChild(el('div',{css:`font-family:Syne,sans-serif;font-weight:700;font-size:18px;margin-bottom:10px;color:${Q.text};`,text:'Submit Test?'}));
  const rem = qs.length - answered;
  const ansLine = el('div',{css:`font-size:13px;color:${Q.muted};margin-bottom:6px;`});
  ansLine.innerHTML = `Answered: <strong style="color:${Q.green}">${answered}</strong> / ${qs.length}`;
  box.appendChild(ansLine);
  box.appendChild(el('div',{css:`font-size:13px;color:${rem>0?Q.red:Q.green};margin-bottom:18px;`,text:rem>0?`⚠ ${rem} question(s) unattempted`:'✓ All questions attempted!'}));
  box.appendChild(el('div',{css:'display:flex;gap:10px;'},[
    el('button',{css:`flex:1;padding:12px;background:${Q.card};border:1px solid ${Q.border};color:${Q.text};border-radius:10px;cursor:pointer;font-weight:600;`,text:'Cancel', onClick:()=>{ S.confirm=false; render(); }}),
    el('button',{css:`flex:1;padding:12px;background:${Q.green};border:none;color:#000;border-radius:10px;cursor:pointer;font-family:Syne,sans-serif;font-weight:700;`,text:'Submit', onClick:submit})
  ]));
  ov.appendChild(box);
  return ov;
}

// ── RESULTS SCREEN ────────────────────────────────────────────────────────────
function resultsScreen() {
  const r = getResults();
  const { correct, wrong, unattempted, score, total } = r;
  const cat = DATA[S.activeCatKey];
  const accent = cat ? cat.color : '#0ea5e9';
  const C = 2*Math.PI*58, filled = (score/100)*C;
  const ringColor = score>=75 ? Q.green : score>=40 ? accent : Q.red;
  const root = el('div',{css:`min-height:100vh;background:${Q.bg};font-family:'DM Sans',sans-serif;color:${Q.text};`});

  const hdr = el('div',{css:`padding:12px 20px;background:${Q.surface};border-bottom:1px solid ${Q.border};display:flex;align-items:center;gap:12px;`});
  hdr.appendChild(el('button',{css:`background:none;border:none;color:${Q.muted};font-size:22px;cursor:pointer;`,text:'←', onClick:()=>{ S.screen='tests'; render(); }}));
  hdr.appendChild(el('div',{},[
    el('div',{css:`font-family:Syne,sans-serif;font-weight:700;font-size:17px;color:${Q.text};`,text:'Test Results'}),
    el('div',{css:`font-size:11px;color:${Q.muted};margin-top:1px;`,text:S.test.title})
  ]));
  root.appendChild(hdr);

  const body = el('div',{css:'padding:22px 20px 40px;max-width:600px;margin:0 auto;'});
  const sw = el('div',{css:'text-align:center;margin-bottom:24px;'});
  sw.innerHTML = `<svg width="150" height="150" viewBox="0 0 150 150">
    <circle cx="75" cy="75" r="58" fill="none" stroke="${Q.card}" stroke-width="10"/>
    <circle cx="75" cy="75" r="58" fill="none" stroke="${ringColor}" stroke-width="10" stroke-dasharray="${filled} ${C}" stroke-linecap="round" transform="rotate(-90 75 75)"/>
    <text x="75" y="68" text-anchor="middle" fill="#f1f5f9" font-size="26" font-weight="800" font-family="Syne">${score}%</text>
    <text x="75" y="90" text-anchor="middle" fill="#94a3b8" font-size="11">${correct}/${total} correct</text>
  </svg>`;
  sw.appendChild(el('div',{css:`font-family:Syne,sans-serif;font-weight:800;font-size:20px;margin-top:4px;color:${Q.text};`,text:score>=75?'🎉 Excellent!':score>=40?'👍 Good Effort!':'📚 Keep Practicing!'}));
  sw.appendChild(el('div',{css:`font-size:12px;color:${Q.muted};margin-top:4px;`,text:`Time: ${Math.floor(S.timeTaken/60)}m ${S.timeTaken%60}s`}));
  body.appendChild(sw);

  const sg = el('div',{css:'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;'});
  [[Q.green,'✓','Correct',correct],[Q.red,'✗','Wrong',wrong],[Q.dim,'–','Skipped',unattempted],[Q.muted,'⏱','Duration',`${S.test.duration}m`]].forEach(([c,ic,lb,vl]) => {
    sg.appendChild(el('div',{css:`background:${Q.card};border:1px solid ${Q.border};border-radius:12px;padding:14px 12px;`},[
      el('div',{css:`color:${c};font-size:20px;margin-bottom:4px;`,text:ic}),
      el('div',{css:`font-family:Syne,sans-serif;font-weight:700;font-size:22px;color:${c};`,text:String(vl)}),
      el('div',{css:`font-size:11px;color:${Q.muted};`,text:lb})
    ]));
  });
  body.appendChild(sg);

  body.appendChild(el('button',{css:`width:100%;padding:11px;background:${Q.card};border:1px solid ${Q.border};color:${Q.text};border-radius:10px;font-weight:600;font-size:13px;margin-bottom:16px;cursor:pointer;`,text:(S.reviewOpen?'Hide':'View')+' Answer Review '+(S.reviewOpen?'▲':'▼'), onClick:()=>{ S.reviewOpen=!S.reviewOpen; render(); }}));

  if (S.reviewOpen) {
    const rv = el('div',{css:'margin-bottom:16px;'});
    S.test.questions.forEach((q,i) => {
      const ua=S.ans[i], ok=ua===q.ans, sk=ua===undefined;
      const card = el('div',{css:`background:${Q.card};border:1px solid ${sk?Q.border:ok?Q.green+'35':Q.red+'35'};border-radius:12px;padding:12px 14px;margin-bottom:8px;`});
      const row = el('div',{css:'display:flex;justify-content:space-between;gap:8px;'});
      const qt = el('div',{css:`font-size:12px;line-height:1.5;flex:1;color:${Q.text};`});
      qt.appendChild(el('span',{css:`color:${Q.muted};margin-right:6px;font-weight:600;`,text:`Q${i+1}.`}));
      qt.appendChild(document.createTextNode(q.q));
      row.appendChild(qt);
      row.appendChild(el('span',{css:`flex-shrink:0;color:${sk?Q.dim:ok?Q.green:Q.red};font-size:16px;`,text:sk?'–':ok?'✓':'✗'}));
      card.appendChild(row);
      if (!sk&&!ok) card.appendChild(el('div',{css:`margin-top:6px;font-size:11px;color:${Q.green};`,text:`Correct: ${q.opts[q.ans]}`}));
      if (sk) card.appendChild(el('div',{css:`margin-top:6px;font-size:11px;color:${Q.muted};`,text:`Answer: ${q.opts[q.ans]}`}));
      rv.appendChild(card);
    });
    body.appendChild(rv);
  }

  body.appendChild(el('div',{css:'display:flex;gap:10px;'},[
    el('button',{css:`flex:1;padding:12px;background:${Q.card};border:1px solid ${Q.border};color:${Q.text};border-radius:10px;font-weight:600;font-size:13px;cursor:pointer;`,text:'Retry', onClick:()=>startQuiz(S.activeCatKey,S.activeExamKey,S.test)}),
    el('button',{css:`flex:1;padding:12px;background:${accent};border:none;color:#fff;border-radius:10px;font-family:Syne,sans-serif;font-weight:700;font-size:13px;cursor:pointer;`,text:'More Tests', onClick:()=>{ S.screen='tests'; render(); }})
  ]));
  root.appendChild(body);
  return root;
}

// ── STATIC PAGES ──────────────────────────────────────────────────────────────
function staticPage(title, content) {
  const root = el('div');
  root.appendChild(Navbar());
  const hdr = el('div',{css:'background:linear-gradient(135deg,#0f172a,#1e1b4b);padding:28px 20px;'});
  hdr.appendChild(el('button',{css:'background:none;border:none;color:#94a3b8;font-size:13px;cursor:pointer;margin-bottom:8px;display:block;padding:0;',text:'← Back to Home', onClick:()=>go('home')}));
  hdr.appendChild(el('h1',{css:'font-family:Syne,sans-serif;font-weight:800;font-size:22px;color:#fff;',text:title}));
  root.appendChild(hdr);
  const body = el('div',{css:'padding:24px 20px 40px;max-width:720px;margin:0 auto;font-size:14px;line-height:1.8;color:#374151;'});
  body.innerHTML = content;
  root.appendChild(body);
  root.appendChild(Footer());
  return root;
}

function aboutScreen() {
  return staticPage('About MockAdda', `
    <h2 style="font-family:Syne,sans-serif;font-weight:700;font-size:17px;color:#0f172a;margin-bottom:10px;">Who We Are</h2>
    <p style="margin-bottom:16px;">MockAdda is a free online mock test platform built for students preparing for competitive exams in India. We provide high-quality, exam-pattern mock tests for SSC, Banking, Railways, Teaching, and Civil Services exams — completely free of charge.</p>
    <h2 style="font-family:Syne,sans-serif;font-weight:700;font-size:17px;color:#0f172a;margin-bottom:10px;">Our Mission</h2>
    <p style="margin-bottom:16px;">Our mission is simple: give every student in India access to quality mock tests without any cost. We believe that financial barriers should not stop anyone from preparing for their dream government job.</p>
    <h2 style="font-family:Syne,sans-serif;font-weight:700;font-size:17px;color:#0f172a;margin-bottom:10px;">What We Offer</h2>
    <ul style="padding-left:20px;margin-bottom:16px;">
      <li style="margin-bottom:8px;">Real exam-pattern timed mock tests</li>
      <li style="margin-bottom:8px;">Detailed score analysis and answer review</li>
      <li style="margin-bottom:8px;">Tests for SSC, Banking, Railways, Teaching & Civil Services</li>
      <li style="margin-bottom:8px;">Mobile-friendly CBT simulator experience</li>
      <li style="margin-bottom:8px;">Completely free — no login, no registration needed</li>
    </ul>
    <h2 style="font-family:Syne,sans-serif;font-weight:700;font-size:17px;color:#0f172a;margin-bottom:10px;">Our Promise</h2>
    <p>MockAdda will always remain free for students. We are constantly adding new tests and questions to help you prepare better. Your success is our success.</p>
  `);
}

function contactScreen() {
  return staticPage('Contact Us', `
    <p style="margin-bottom:20px;color:#64748b;">Have a question, suggestion, or found an error in a question? We'd love to hear from you!</p>
    <div style="background:#f0f9ff;border:1px solid #e0f2fe;border-radius:14px;padding:20px;margin-bottom:20px;">
      <div style="font-family:Syne,sans-serif;font-weight:700;font-size:15px;color:#0f172a;margin-bottom:14px;">📬 Get In Touch</div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <span style="font-size:18px;">📧</span>
        <div>
          <div style="font-size:11px;color:#64748b;font-weight:600;">Email Us</div>
          <a href="mailto:contact@mockadda.com" style="color:#0ea5e9;font-weight:600;text-decoration:none;">contact@mockadda.com</a>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <span style="font-size:18px;">🌐</span>
        <div>
          <div style="font-size:11px;color:#64748b;font-weight:600;">Website</div>
          <span style="color:#0f172a;font-weight:600;">mockadda.com</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:18px;">⏱</span>
        <div>
          <div style="font-size:11px;color:#64748b;font-weight:600;">Response Time</div>
          <span style="color:#0f172a;">We usually respond within 24–48 hours</span>
        </div>
      </div>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:20px;">
      <div style="font-family:Syne,sans-serif;font-weight:700;font-size:15px;color:#0f172a;margin-bottom:10px;">💡 Report an Issue</div>
      <p style="font-size:13px;color:#64748b;margin-bottom:0;">Found a wrong answer or a typo in a question? Please email us with the question text and the correct answer. We appreciate your help in making MockAdda better for everyone!</p>
    </div>
  `);
}

function privacyScreen() {
  return staticPage('Privacy Policy', `
    <p style="color:#64748b;margin-bottom:20px;font-size:13px;">Last updated: June 2025</p>
    <p style="margin-bottom:16px;">At MockAdda, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard any information when you visit our website.</p>
    <h2 style="font-family:Syne,sans-serif;font-weight:700;font-size:16px;color:#0f172a;margin:20px 0 10px;">Information We Collect</h2>
    <p style="margin-bottom:12px;">MockAdda does <strong>not</strong> require registration or login. We do not collect any personally identifiable information such as your name, email address, or phone number unless you contact us directly.</p>
    <p style="margin-bottom:16px;">We may collect non-personal information such as browser type, device type, and pages visited through standard web analytics tools (like Google Analytics) to help us improve the website.</p>
    <h2 style="font-family:Syne,sans-serif;font-weight:700;font-size:16px;color:#0f172a;margin:20px 0 10px;">Cookies</h2>
    <p style="margin-bottom:16px;">Our website may use cookies to enhance user experience. You can choose to disable cookies through your browser settings. Disabling cookies will not affect your ability to take mock tests.</p>
    <h2 style="font-family:Syne,sans-serif;font-weight:700;font-size:16px;color:#0f172a;margin:20px 0 10px;">Third-Party Services</h2>
    <p style="margin-bottom:16px;">We may use third-party services such as Google Analytics for website traffic analysis. These services have their own privacy policies governing the use of your information.</p>
    <h2 style="font-family:Syne,sans-serif;font-weight:700;font-size:16px;color:#0f172a;margin:20px 0 10px;">Children's Privacy</h2>
    <p style="margin-bottom:16px;">MockAdda is safe for students of all ages. We do not knowingly collect personal information from children under 13. If you believe a child has provided us personal information, please contact us.</p>
    <h2 style="font-family:Syne,sans-serif;font-weight:700;font-size:16px;color:#0f172a;margin:20px 0 10px;">Changes to This Policy</h2>
    <p style="margin-bottom:16px;">We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>
    <h2 style="font-family:Syne,sans-serif;font-weight:700;font-size:16px;color:#0f172a;margin:20px 0 10px;">Contact Us</h2>
    <p>If you have any questions about this Privacy Policy, please email us at <a href="mailto:contact@mockadda.com" style="color:#0ea5e9;">contact@mockadda.com</a></p>
  `);
}

function termsScreen() {
  return staticPage('Terms of Service', `
    <p style="color:#64748b;margin-bottom:20px;font-size:13px;">Last updated: June 2025</p>
    <p style="margin-bottom:16px;">By using MockAdda, you agree to the following terms and conditions. Please read them carefully.</p>
    <h2 style="font-family:Syne,sans-serif;font-weight:700;font-size:16px;color:#0f172a;margin:20px 0 10px;">Use of Content</h2>
    <p style="margin-bottom:16px;">All content on MockAdda including questions, answers, and test materials is for personal, non-commercial educational use only. You may not reproduce, distribute, or sell any content from this website without prior written permission.</p>
    <h2 style="font-family:Syne,sans-serif;font-weight:700;font-size:16px;color:#0f172a;margin:20px 0 10px;">Accuracy of Content</h2>
    <p style="margin-bottom:16px;">While we strive to ensure all questions and answers are accurate, MockAdda makes no warranty about the completeness or accuracy of the content. Always refer to official sources for exam preparation.</p>
    <h2 style="font-family:Syne,sans-serif;font-weight:700;font-size:16px;color:#0f172a;margin:20px 0 10px;">No Registration Required</h2>
    <p style="margin-bottom:16px;">MockAdda does not require you to create an account. All mock tests are freely accessible. Your test results are not stored on our servers.</p>
    <h2 style="font-family:Syne,sans-serif;font-weight:700;font-size:16px;color:#0f172a;margin:20px 0 10px;">Limitation of Liability</h2>
    <p style="margin-bottom:16px;">MockAdda shall not be liable for any indirect, incidental, or consequential damages arising from the use of this website. Use of this website is at your own risk.</p>
    <h2 style="font-family:Syne,sans-serif;font-weight:700;font-size:16px;color:#0f172a;margin:20px 0 10px;">Changes to Terms</h2>
    <p>We reserve the right to modify these terms at any time. Continued use of the website after any changes constitutes your acceptance of the new terms.</p>
  `);
}

// ── FOOTER ────────────────────────────────────────────────────────────────────
function Footer() {
  const f = el('footer',{css:'background:#0f172a;padding:32px 20px 20px;'});
  const top = el('div',{css:'max-width:800px;margin:0 auto;'});

  // Brand
  const brand = el('div',{css:'display:flex;align-items:center;gap:8px;margin-bottom:10px;'});
  brand.appendChild(el('div',{css:'width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#0ea5e9,#7c3aed);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:16px;font-family:Syne,sans-serif;',text:'M'}));
  brand.appendChild(el('span',{css:'font-family:Syne,sans-serif;font-weight:800;font-size:18px;color:#fff;',text:'MockAdda'}));
  top.appendChild(brand);
  top.appendChild(el('p',{css:'font-size:12px;color:#475569;line-height:1.6;margin-bottom:20px;',text:'Free mock tests for SSC, Banking, Railways, Teaching & Civil Services exams. Practice with real exam-pattern tests and boost your preparation.'}));

  // Links grid
  const linksGrid = el('div',{css:'display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;'});

  const col1 = el('div');
  col1.appendChild(el('div',{css:'font-family:Syne,sans-serif;font-weight:700;font-size:12px;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px;',text:'Exams'}));
  ['SSC Exams','Banking Exams','Railways Exams','Teaching Exams','Civil Services'].forEach(name => {
    const catKey = Object.keys(DATA).find(k=>DATA[k].name===name||name.includes(DATA[k].name.split(' ')[0]));
    const link = el('div',{css:'font-size:13px;color:#64748b;margin-bottom:7px;cursor:pointer;transition:color 0.15s;',text:name});
    link.addEventListener('mouseenter',()=>link.style.color='#0ea5e9');
    link.addEventListener('mouseleave',()=>link.style.color='#64748b');
    if(catKey) link.addEventListener('click',()=>{ S.activeCatKey=catKey; go('exams'); });
    col1.appendChild(link);
  });
  linksGrid.appendChild(col1);

  const col2 = el('div');
  col2.appendChild(el('div',{css:'font-family:Syne,sans-serif;font-weight:700;font-size:12px;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px;',text:'Company'}));
  [['About Us','about'],['Contact Us','contact'],['Privacy Policy','privacy'],['Terms of Service','terms']].forEach(([name,screen]) => {
    const link = el('div',{css:'font-size:13px;color:#64748b;margin-bottom:7px;cursor:pointer;transition:color 0.15s;',text:name});
    link.addEventListener('mouseenter',()=>link.style.color='#0ea5e9');
    link.addEventListener('mouseleave',()=>link.style.color='#64748b');
    link.addEventListener('click',()=>go(screen));
    col2.appendChild(link);
  });
  linksGrid.appendChild(col2);
  top.appendChild(linksGrid);

  // Divider
  top.appendChild(el('div',{css:'border-top:1px solid rgba(255,255,255,0.07);padding-top:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;'},[
    el('div',{css:'font-size:11px;color:#374151;',text:`© ${new Date().getFullYear()} MockAdda. All rights reserved.`}),
    el('div',{css:'font-size:11px;color:#374151;',text:'Made with ❤️ for students of India 🇮🇳'})
  ]));
  f.appendChild(top);
  return f;
}

// ── GLOBAL STYLES ─────────────────────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  html,body{background:#f8fafc;color:#0f172a;font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px;}
  button,a{cursor:pointer;}
  @keyframes spin{to{transform:rotate(360deg);}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
`;
document.head.appendChild(style);

// ── BOOT ──────────────────────────────────────────────────────────────────────
render();
fetch('questions.json')
  .then(r=>{ if(!r.ok) throw new Error(); return r.json(); })
  .then(data=>{ DATA=data; S.screen='home'; render(); })
  .catch(()=>{
    app.innerHTML=`<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;padding:20px;text-align:center;">
      <div style="font-size:32px;">⚠️</div>
      <div style="font-family:Syne,sans-serif;font-weight:700;font-size:18px;">Could not load questions.json</div>
      <div style="font-size:13px;color:#64748b;">Make sure questions.json is in the same folder as index.html.</div>
    </div>`;
  });
