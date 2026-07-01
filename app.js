// MockAdda - vanilla JS app. Reads questions from questions.json.
const T = {
  green:"#34d399", red:"#f87171", purple:"#a78bfa", dim:"#475569",
  primary:"#f59e0b"
};
const STATUS_COLOR = {unvisited:T.dim, visited:T.red, answered:T.green, flagged:T.purple, "ans-flag":T.purple};

let QUIZ_DATA = {};
let state = {
  screen: "loading",
  sub: null, test: null, qi: 0,
  ans: {}, flagged: new Set(), visited: new Set([0]),
  timeLeft: 0, timeTaken: 0, startTime: null,
  navOpen: false, confirm: false, reviewOpen: false
};
let timerHandle = null;
const app = document.getElementById("app");

const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

function render() { app.innerHTML = ""; app.appendChild(buildScreen()); }

function setState(patch){ Object.assign(state, patch); render(); }

function startTimer(){
  clearInterval(timerHandle);
  timerHandle = setInterval(()=>{
    state.timeLeft = Math.max(0, state.timeLeft - 1);
    if(state.timeLeft === 0){ clearInterval(timerHandle); submit(); return; }
    const timerEl = document.getElementById("timerDisplay");
    if(timerEl){
      timerEl.textContent = "⏱ " + fmt(state.timeLeft);
      if(state.timeLeft < 60){ timerEl.style.background="rgba(248,113,113,0.12)"; timerEl.style.color=T.red; timerEl.style.borderColor=T.red+"40"; }
    }
  },1000);
}

function startQuiz(subKey, test){
  const sub = {key:subKey, ...QUIZ_DATA[subKey]};
  state.sub = sub; state.test = {...test};
  state.qi = 0; state.ans = {}; state.flagged = new Set(); state.visited = new Set([0]);
  state.timeLeft = test.duration * 60; state.startTime = Date.now();
  state.navOpen=false; state.confirm=false; state.reviewOpen=false;
  state.screen = "quiz";
  render();
  startTimer();
}

function goQ(idx){ state.visited.add(idx); state.qi = idx; state.navOpen=false; render(); }

function submit(){
  clearInterval(timerHandle);
  if(state.startTime) state.timeTaken = Math.floor((Date.now()-state.startTime)/1000);
  state.screen = "results"; state.confirm=false; state.navOpen=false;
  render();
}

function getResults(){
  if(!state.test) return null;
  let correct=0, wrong=0;
  state.test.questions.forEach((q,i)=>{
    if(state.ans[i]===undefined) return;
    state.ans[i]===q.ans ? correct++ : wrong++;
  });
  const total = state.test.questions.length;
  return {correct, wrong, unattempted: total-correct-wrong, score: Math.round((correct/total)*100), total};
}

function qStatus(i){
  if(!state.visited.has(i)) return "unvisited";
  const answered = state.ans[i]!==undefined, flagged = state.flagged.has(i);
  if(answered && flagged) return "ans-flag";
  if(answered) return "answered";
  if(flagged) return "flagged";
  return "visited";
}

function el(tag, attrs={}, children=[]){
  const e = document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k==="style") Object.assign(e.style, v);
    else if(k.startsWith("on")) e.addEventListener(k.slice(2).toLowerCase(), v);
    else if(k==="text") e.textContent = v;
    else if(k==="html") e.innerHTML = v;
    else e.setAttribute(k, v);
  }
  (Array.isArray(children)?children:[children]).forEach(c=>{ if(c) e.appendChild(c); });
  return e;
}

function Hdr(title, subtitle, back){
  const h = el("div",{class:"hdr"});
  if(back) h.appendChild(el("button",{class:"back", text:"‹", onClick:back}));
  const wrap = el("div",{style:{flex:"1"}});
  wrap.appendChild(el("div",{class:"hdr-title", text:title}));
  if(subtitle) wrap.appendChild(el("div",{class:"hdr-sub", text:subtitle}));
  h.appendChild(wrap);
  return h;
}

function buildScreen(){
  if(state.screen==="loading") return loadingScreen();
  if(state.screen==="error") return errorScreen();
  if(state.screen==="home") return homeScreen();
  if(state.screen==="tests") return testsScreen();
  if(state.screen==="quiz") return quizScreen();
  if(state.screen==="results") return resultsScreen();
  return el("div");
}

function loadingScreen(){
  return el("div",{style:{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"14px"}},[
    el("div",{style:{width:"40px",height:"40px",border:"4px solid rgba(245,158,11,0.2)",borderTop:"4px solid #f59e0b",borderRadius:"50%",animation:"spin 1s linear infinite"}}),
    el("div",{style:{fontFamily:"var(--ffh)",fontWeight:"700",color:"var(--primary)"}, text:"Loading quiz data..."})
  ]);
}

function errorScreen(){
  return el("div",{style:{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"10px",padding:"20px",textAlign:"center"}},[
    el("div",{style:{fontSize:"32px"}, text:"⚠️"}),
    el("div",{style:{fontFamily:"var(--ffh)",fontWeight:"700"}, text:"Couldn't load questions.json"}),
    el("div",{style:{fontSize:"13px",color:"var(--muted)"}, text:"Make sure questions.json is in the same folder as index.html."})
  ]);
}

function homeScreen(){
  const root = el("div",{style:{minHeight:"100vh"}});
  const heroWrap = el("div",{style:{padding:"22px 20px 10px", background:"linear-gradient(180deg,var(--surface) 0%,var(--bg) 100%)"}});
  const top = el("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}});
  const titleBlock = el("div",{},[
    el("div",{style:{fontFamily:"var(--ffh)",fontSize:"20px",fontWeight:"800",color:"var(--primary)",letterSpacing:"-0.02em"}, text:"MockAdda"}),
    el("div",{style:{fontSize:"11px",color:"var(--muted)",marginTop:"1px"}, text:"Free Mock Tests for Students"})
  ]);
  top.appendChild(titleBlock);
  top.appendChild(el("div",{style:{width:"38px",height:"38px",borderRadius:"50%",background:"var(--primaryBg)",border:"1px solid #f59e0b40",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px"}, text:"🎓"}));
  heroWrap.appendChild(top);

  const subjectKeys = Object.keys(QUIZ_DATA);
  let totalTests=0, totalQ=0;
  subjectKeys.forEach(k=>{ totalTests += QUIZ_DATA[k].tests.length; QUIZ_DATA[k].tests.forEach(t=> totalQ += t.questions.length); });

  const stats = el("div",{style:{background:"var(--card)",borderRadius:"14px",padding:"16px 20px",border:"1px solid var(--border)",display:"flex",justifyContent:"space-around"}});
  [[String(totalTests),"Tests"],[String(subjectKeys.length),"Subjects"],[String(totalQ),"Questions"],["⏱","Timed"]].forEach(([v,l])=>{
    stats.appendChild(el("div",{style:{textAlign:"center"}},[
      el("div",{style:{fontFamily:"var(--ffh)",fontSize:"18px",fontWeight:"800",color:"var(--primary)"}, text:v}),
      el("div",{style:{fontSize:"10px",color:"var(--muted)",marginTop:"1px"}, text:l})
    ]));
  });
  heroWrap.appendChild(stats);
  root.appendChild(heroWrap);

  const body = el("div",{style:{padding:"20px 20px 32px"}});
  body.appendChild(el("div",{style:{fontSize:"11px",fontWeight:"600",color:"var(--dim)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"14px"}, text:"Choose a Subject"}));

  const grid = el("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}});
  subjectKeys.forEach(k=>{
    const s = QUIZ_DATA[k];
    const card = el("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:"16px",padding:"18px 14px",cursor:"pointer",position:"relative",overflow:"hidden",transition:"border-color 0.2s"},
      onClick:()=>{ state.sub = {key:k, ...s}; state.screen="tests"; render(); }
    });
    card.addEventListener("mouseenter",()=>{ card.style.borderColor=s.color; card.style.background="var(--cardHov)"; });
    card.addEventListener("mouseleave",()=>{ card.style.borderColor="var(--border)"; card.style.background="var(--card)"; });
    card.appendChild(el("div",{style:{position:"absolute",top:"0",right:"0",width:"70px",height:"70px",background:s.color,opacity:"0.07",borderRadius:"0 16px 0 70px"}}));
    card.appendChild(el("div",{style:{fontSize:"28px",marginBottom:"10px"}, text:s.icon}));
    card.appendChild(el("div",{style:{fontFamily:"var(--ffh)",fontWeight:"700",fontSize:"14px",color:"var(--text)",marginBottom:"3px"}, text:s.name}));
    card.appendChild(el("div",{style:{fontSize:"11px",color:"var(--muted)"}, text:`${s.tests.length} Tests`}));
    card.appendChild(el("div",{style:{marginTop:"10px",display:"inline-flex",alignItems:"center",gap:"4px",background:s.color+"20",color:s.color,fontSize:"11px",fontWeight:"600",padding:"3px 10px",borderRadius:"20px"}, text:"Explore →"}));
    grid.appendChild(card);
  });
  body.appendChild(grid);
  root.appendChild(body);
  return root;
}

function testsScreen(){
  const root = el("div",{style:{minHeight:"100vh"}});
  root.appendChild(Hdr(state.sub.name, `${state.sub.tests.length} Mock Tests Available`, ()=>{ state.screen="home"; render(); }));
  const body = el("div",{style:{padding:"20px 20px 32px"}});
  body.appendChild(el("div",{style:{fontSize:"12px",color:"var(--muted)",marginBottom:"18px",lineHeight:"1.5"}, text:"Select a test to begin your timed CBT simulation. Each test is auto-submitted when time expires."}));

  state.sub.tests.forEach((t,i)=>{
    const card = el("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:"16px",padding:"18px",marginBottom:"12px"}});
    const headRow = el("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px"}});
    headRow.appendChild(el("div",{},[
      el("div",{style:{fontFamily:"var(--ffh)",fontWeight:"700",fontSize:"15px",color:"var(--text)"}, text:t.title}),
      el("div",{style:{fontSize:"11px",color:"var(--muted)",marginTop:"3px"}, text:`Mock Test ${i+1}`})
    ]));
    const diffColors = {Easy:["var(--greenBg)",T.green], Hard:["var(--redBg)",T.red]};
    const [bg,fg] = diffColors[t.difficulty] || ["var(--indigoBg)","#818cf8"];
    headRow.appendChild(el("span",{style:{background:bg,color:fg,fontSize:"11px",fontWeight:"600",padding:"4px 10px",borderRadius:"20px"}, text:t.difficulty}));
    card.appendChild(headRow);

    const metaRow = el("div",{style:{display:"flex",gap:"16px",marginBottom:"16px"}});
    [["⏱",`${t.duration} min`],["❓",`${t.questions.length} Questions`],["📝","MCQ"]].forEach(([ic,tx])=>{
      metaRow.appendChild(el("div",{style:{display:"flex",alignItems:"center",gap:"5px",fontSize:"12px",color:"var(--muted)"}},[
        el("span",{style:{fontSize:"14px"}, text:ic}), document.createTextNode(tx)
      ]));
    });
    card.appendChild(metaRow);

    card.appendChild(el("button",{style:{width:"100%",padding:"12px",background:state.sub.color,color:"#000",border:"none",borderRadius:"10px",fontFamily:"var(--ffh)",fontWeight:"700",fontSize:"14px",cursor:"pointer"}, text:"Start Test →",
      onClick:()=>startQuiz(state.sub.key, t)
    }));
    body.appendChild(card);
  });
  root.appendChild(body);
  return root;
}

function quizScreen(){
  const test = state.test, qs = test.questions, q = qs[state.qi], sel = state.ans[state.qi];
  const answeredCount = Object.keys(state.ans).length;
  const root = el("div",{style:{height:"100vh",display:"flex",flexDirection:"column",overflow:"hidden"}});

  const topBar = el("div",{style:{padding:"10px 16px",background:"var(--surface)",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:"0"}});
  topBar.appendChild(el("div",{},[
    el("div",{style:{fontSize:"10px",color:"var(--muted)",fontWeight:"600",letterSpacing:"0.08em",textTransform:"uppercase"}, text:state.sub.name}),
    el("div",{style:{fontFamily:"var(--ffh)",fontWeight:"700",fontSize:"12px",color:"var(--text)",marginTop:"1px"}, text:test.title})
  ]));
  const rightWrap = el("div",{style:{display:"flex",alignItems:"center",gap:"8px"}});
  rightWrap.appendChild(el("div",{id:"timerDisplay", style:{background:"var(--primaryBg)",color:"var(--primary)",border:"1px solid #f59e0b40",padding:"5px 10px",borderRadius:"8px",fontFamily:"var(--ffh)",fontWeight:"700",fontSize:"15px"}, text:"⏱ "+fmt(state.timeLeft)}));
  rightWrap.appendChild(el("button",{style:{background:"var(--card)",border:"1px solid var(--border)",color:"var(--text)",padding:"5px 10px",borderRadius:"8px",cursor:"pointer",fontSize:"12px"}, text:`📋 ${answeredCount}/${qs.length}`,
    onClick:()=>{ state.navOpen=true; render(); }
  }));
  topBar.appendChild(rightWrap);
  root.appendChild(topBar);

  const qArea = el("div",{style:{flex:"1",overflowY:"auto",padding:"18px 18px 0"}});
  const qTop = el("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}});
  qTop.appendChild(el("div",{style:{background:state.sub.color+"20",color:state.sub.color,padding:"4px 12px",borderRadius:"20px",fontSize:"11px",fontWeight:"600"}, text:`Q ${state.qi+1} / ${qs.length}`}));
  const isFlagged = state.flagged.has(state.qi);
  qTop.appendChild(el("button",{style:{background:isFlagged?"var(--purpleBg)":"var(--card)",border:`1px solid ${isFlagged?T.purple:"var(--border)"}`,color:isFlagged?T.purple:"var(--muted)",padding:"4px 12px",borderRadius:"20px",cursor:"pointer",fontSize:"11px",fontWeight:"600"}, text:isFlagged?"🚩 Flagged":"🏳 Flag",
    onClick:()=>{ isFlagged ? state.flagged.delete(state.qi) : state.flagged.add(state.qi); render(); }
  }));
  qArea.appendChild(qTop);

  qArea.appendChild(el("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:"12px",padding:"16px 18px",marginBottom:"18px",fontSize:"15px",fontWeight:"500",lineHeight:"1.65",color:"var(--text)"}, text:q.q}));

  const optsWrap = el("div",{style:{display:"flex",flexDirection:"column",gap:"10px",paddingBottom:"100px"}});
  q.opts.forEach((opt,i)=>{
    const isSel = sel===i;
    const btn = el("button",{style:{textAlign:"left",padding:"13px 16px",borderRadius:"12px",border:`2px solid ${isSel?state.sub.color:"var(--border)"}`,background:isSel?state.sub.color+"18":"var(--card)",color:"var(--text)",cursor:"pointer",fontSize:"14px",lineHeight:"1.5",display:"flex",alignItems:"center",gap:"12px",width:"100%"},
      onClick:()=>{ state.ans[state.qi]=i; render(); }
    });
    btn.appendChild(el("span",{style:{width:"28px",height:"28px",borderRadius:"50%",flexShrink:"0",border:`2px solid ${isSel?state.sub.color:T.dim}`,background:isSel?state.sub.color:"transparent",color:isSel?"#000":T.dim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"700"}, text:["A","B","C","D"][i]}));
    btn.appendChild(document.createTextNode(opt));
    optsWrap.appendChild(btn);
  });
  qArea.appendChild(optsWrap);
  root.appendChild(qArea);

  const bottomNav = el("div",{style:{padding:"12px 18px 18px",background:"var(--surface)",borderTop:"1px solid var(--border)",display:"flex",gap:"10px",flexShrink:"0"}});
  bottomNav.appendChild(el("button",{style:{flex:"1",padding:"12px",background:"var(--card)",border:"1px solid var(--border)",color:state.qi===0?T.dim:"var(--text)",borderRadius:"10px",cursor:state.qi===0?"not-allowed":"pointer",fontWeight:"600",fontSize:"14px"}, text:"← Prev",
    onClick:()=>{ if(state.qi>0) goQ(state.qi-1); }
  }));
  if(state.qi===qs.length-1){
    bottomNav.appendChild(el("button",{style:{flex:"2",padding:"12px",background:T.green,border:"none",color:"#000",borderRadius:"10px",cursor:"pointer",fontFamily:"var(--ffh)",fontWeight:"700",fontSize:"14px"}, text:"Submit ✓",
      onClick:()=>{ state.confirm=true; render(); }
    }));
  } else {
    bottomNav.appendChild(el("button",{style:{flex:"1",padding:"12px",background:state.sub.color,border:"none",color:"#000",borderRadius:"10px",cursor:"pointer",fontWeight:"700",fontSize:"14px"}, text:"Next →",
      onClick:()=>goQ(state.qi+1)
    }));
  }
  root.appendChild(bottomNav);

  if(state.navOpen) root.appendChild(navPanel(qs));
  if(state.confirm) root.appendChild(confirmPanel(qs, answeredCount));
  return root;
}

function navPanel(qs){
  const overlay = el("div",{style:{position:"fixed",inset:"0",background:"rgba(0,0,0,0.55)",zIndex:"100",display:"flex",alignItems:"flex-end"}, onClick:()=>{ state.navOpen=false; render(); }});
  const panel = el("div",{style:{background:"var(--surface)",width:"100%",borderRadius:"18px 18px 0 0",padding:"22px",maxHeight:"72vh",overflowY:"auto"}, onClick:e=>e.stopPropagation()});
  const head = el("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}});
  head.appendChild(el("div",{style:{fontFamily:"var(--ffh)",fontWeight:"700",fontSize:"16px"}, text:"Question Navigator"}));
  head.appendChild(el("button",{style:{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:"22px",lineHeight:"1"}, text:"✕", onClick:()=>{ state.navOpen=false; render(); }}));
  panel.appendChild(head);

  const legend = el("div",{style:{display:"flex",flexWrap:"wrap",gap:"8px",marginBottom:"14px"}});
  [[T.dim,"Not Visited"],[T.red,"Not Answered"],[T.green,"Answered"],[T.purple,"Flagged"]].forEach(([c,l])=>{
    legend.appendChild(el("div",{style:{display:"flex",alignItems:"center",gap:"5px",fontSize:"11px",color:"var(--muted)"}},[
      el("div",{style:{width:"10px",height:"10px",borderRadius:"2px",background:c}}), document.createTextNode(l)
    ]));
  });
  panel.appendChild(legend);

  const grid = el("div",{style:{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"8px",marginBottom:"18px"}});
  qs.forEach((_,i)=>{
    const st = qStatus(i), c = STATUS_COLOR[st];
    grid.appendChild(el("button",{style:{padding:"9px 0",borderRadius:"8px",background:i===state.qi?c:c+"28",border:`2px solid ${c}`,color:i===state.qi?"#000":c,fontWeight:"700",fontSize:"13px",cursor:"pointer"}, text:String(i+1),
      onClick:()=>goQ(i)
    }));
  });
  panel.appendChild(grid);

  panel.appendChild(el("button",{style:{width:"100%",padding:"14px",background:T.green,border:"none",color:"#000",borderRadius:"10px",cursor:"pointer",fontFamily:"var(--ffh)",fontWeight:"700",fontSize:"15px"}, text:"Submit Test ✓",
    onClick:()=>{ state.navOpen=false; state.confirm=true; render(); }
  }));
  overlay.appendChild(panel);
  return overlay;
}

function confirmPanel(qs, answeredCount){
  const overlay = el("div",{style:{position:"fixed",inset:"0",background:"rgba(0,0,0,0.6)",zIndex:"200",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}});
  const box = el("div",{style:{background:"var(--surface)",borderRadius:"16px",padding:"24px",border:"1px solid var(--border)",width:"100%",maxWidth:"320px"}});
  box.appendChild(el("div",{style:{fontFamily:"var(--ffh)",fontWeight:"700",fontSize:"18px",marginBottom:"10px"}, text:"Submit Test?"}));
  const ansLine = el("div",{style:{fontSize:"13px",color:"var(--muted)",marginBottom:"6px"}});
  ansLine.appendChild(document.createTextNode("Answered: "));
  ansLine.appendChild(el("strong",{style:{color:T.green}, text:String(answeredCount)}));
  ansLine.appendChild(document.createTextNode(` / ${qs.length}`));
  box.appendChild(ansLine);
  const remaining = qs.length - answeredCount;
  if(remaining>0) box.appendChild(el("div",{style:{fontSize:"13px",color:T.red,marginBottom:"18px"}, text:`⚠ ${remaining} question(s) unattempted`}));
  else box.appendChild(el("div",{style:{fontSize:"13px",color:T.green,marginBottom:"18px"}, text:"✓ All questions attempted!"}));
  const btnRow = el("div",{style:{display:"flex",gap:"10px"}});
  btnRow.appendChild(el("button",{style:{flex:"1",padding:"12px",background:"var(--card)",border:"1px solid var(--border)",color:"var(--text)",borderRadius:"10px",cursor:"pointer",fontWeight:"600"}, text:"Cancel",
    onClick:()=>{ state.confirm=false; render(); }
  }));
  btnRow.appendChild(el("button",{style:{flex:"1",padding:"12px",background:T.green,border:"none",color:"#000",borderRadius:"10px",cursor:"pointer",fontFamily:"var(--ffh)",fontWeight:"700"}, text:"Submit",
    onClick:submit
  }));
  box.appendChild(btnRow);
  overlay.appendChild(box);
  return overlay;
}

function resultsScreen(){
  const r = getResults();
  const {correct,wrong,unattempted,score,total} = r;
  const C = 2*Math.PI*58, filled = (score/100)*C;
  const ringColor = score>=75?T.green:score>=40?T.primary:T.red;

  const root = el("div",{style:{minHeight:"100vh"}});
  root.appendChild(Hdr("Results", state.test.title, ()=>{ state.screen="tests"; render(); }));
  const body = el("div",{style:{padding:"22px 20px 32px"}});

  const scoreWrap = el("div",{style:{textAlign:"center",marginBottom:"24px"}});
  scoreWrap.innerHTML = `
    <svg width="150" height="150" viewBox="0 0 150 150">
      <circle cx="75" cy="75" r="58" fill="none" stroke="var(--card)" stroke-width="10"/>
      <circle cx="75" cy="75" r="58" fill="none" stroke="${ringColor}" stroke-width="10" stroke-dasharray="${filled} ${C}" stroke-linecap="round" transform="rotate(-90 75 75)"/>
      <text x="75" y="68" text-anchor="middle" fill="#f1f5f9" font-size="26" font-weight="800" font-family="Syne">${score}%</text>
      <text x="75" y="90" text-anchor="middle" fill="#94a3b8" font-size="11">${correct}/${total} correct</text>
    </svg>`;
  scoreWrap.appendChild(el("div",{style:{fontFamily:"var(--ffh)",fontWeight:"800",fontSize:"20px",marginTop:"4px"}, text: score>=75?"🎉 Excellent!":score>=40?"👍 Good Effort!":"📚 Keep Practicing!"}));
  scoreWrap.appendChild(el("div",{style:{fontSize:"12px",color:"var(--muted)",marginTop:"4px"}, text:`Time: ${Math.floor(state.timeTaken/60)}m ${state.timeTaken%60}s`}));
  body.appendChild(scoreWrap);

  const statsGrid = el("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"20px"}});
  [[T.green,"✓","Correct",correct],[T.red,"✗","Wrong",wrong],[T.dim,"–","Skipped",unattempted],["#94a3b8","⏱","Duration",`${state.test.duration}m`]].forEach(([c,ic,lb,vl])=>{
    statsGrid.appendChild(el("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:"12px",padding:"14px 12px"}},[
      el("div",{style:{color:c,fontSize:"20px",marginBottom:"4px"}, text:ic}),
      el("div",{style:{fontFamily:"var(--ffh)",fontWeight:"700",fontSize:"22px",color:c}, text:String(vl)}),
      el("div",{style:{fontSize:"11px",color:"var(--muted)"}, text:lb})
    ]));
  });
  body.appendChild(statsGrid);

  body.appendChild(el("button",{style:{width:"100%",padding:"11px",background:"var(--card)",border:"1px solid var(--border)",color:"var(--text)",borderRadius:"10px",cursor:"pointer",fontWeight:"600",fontSize:"13px",marginBottom:"16px"}, text:(state.reviewOpen?"Hide":"View")+" Answer Review "+(state.reviewOpen?"▲":"▼"),
    onClick:()=>{ state.reviewOpen=!state.reviewOpen; render(); }
  }));

  if(state.reviewOpen){
    const reviewWrap = el("div",{style:{marginBottom:"16px"}});
    state.test.questions.forEach((q,i)=>{
      const ua = state.ans[i], ok = ua===q.ans, sk = ua===undefined;
      const borderColor = sk ? "var(--border)" : ok ? T.green+"35" : T.red+"35";
      const card = el("div",{style:{background:"var(--card)",border:`1px solid ${borderColor}`,borderRadius:"12px",padding:"12px 14px",marginBottom:"8px"}});
      const row = el("div",{style:{display:"flex",justifyContent:"space-between",gap:"8px"}});
      const qText = el("div",{style:{fontSize:"12px",lineHeight:"1.5",flex:"1",color:"var(--text)"}});
      qText.appendChild(el("span",{style:{color:"var(--muted)",marginRight:"6px",fontWeight:"600"}, text:`Q${i+1}.`}));
      qText.appendChild(document.createTextNode(q.q));
      row.appendChild(qText);
      row.appendChild(el("span",{style:{flexShrink:"0",color:sk?T.dim:ok?T.green:T.red,fontSize:"16px"}, text:sk?"–":ok?"✓":"✗"}));
      card.appendChild(row);
      if(!sk && !ok) card.appendChild(el("div",{style:{marginTop:"6px",fontSize:"11px",color:T.green}, text:`Correct: ${q.opts[q.ans]}`}));
      if(sk) card.appendChild(el("div",{style:{marginTop:"6px",fontSize:"11px",color:"var(--muted)"}, text:`Answer: ${q.opts[q.ans]}`}));
      reviewWrap.appendChild(card);
    });
    body.appendChild(reviewWrap);
  }

  const actionRow = el("div",{style:{display:"flex",gap:"10px"}});
  actionRow.appendChild(el("button",{style:{flex:"1",padding:"12px",background:"var(--card)",border:"1px solid var(--border)",color:"var(--text)",borderRadius:"10px",cursor:"pointer",fontWeight:"600",fontSize:"13px"}, text:"Retry",
    onClick:()=>startQuiz(state.sub.key, state.test)
  }));
  actionRow.appendChild(el("button",{style:{flex:"1",padding:"12px",background:state.sub.color,border:"none",color:"#000",borderRadius:"10px",cursor:"pointer",fontFamily:"var(--ffh)",fontWeight:"700",fontSize:"13px"}, text:"More Tests",
    onClick:()=>{ state.screen="tests"; render(); }
  }));
  body.appendChild(actionRow);
  root.appendChild(body);
  return root;
}

// Load questions and boot the app
fetch("questions.json")
  .then(r=>{ if(!r.ok) throw new Error("not ok"); return r.json(); })
  .then(data=>{ QUIZ_DATA = data; state.screen="home"; render(); })
  .catch(()=>{ state.screen="error"; render(); });

render();
