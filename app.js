const D = window.PORTFOLIO_DATA;
const COL = {navy:'#1f3a5f',navyDeep:'#16293f',gold:'#c9a227',teal:'#2a9d8f',red:'#c1432f',grey:'#8a8f98',green:'#2f8f5b'};
const SLEEVE_COL = {Core:COL.navy,Satellite:COL.gold,Alternative:COL.teal,Hedge:COL.red,Fixed:COL.grey};
const FUND_PALETTE = ['#1f3a5f','#2c5282','#3a6ea5','#c9a227','#d9b94e','#2a9d8f','#3cb6a6','#c1432f','#8a8f98','#b7bcc4'];
let current = 'Junior-1';
let charts = {};

Chart.defaults.font.family = "'Inter',sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#5b6472';

/* ---------- GLOSSARY / TERM DEFINITIONS ---------- */
const TERMS = {
  cagr:["Annual return (CAGR)","The average yearly growth rate, smoothed so it accounts for compounding. If something grew 8% per year on average, that's its CAGR."],
  volatility:["Risk / Volatility","How much the value bounces up and down month to month. Higher means a bumpier ride. Measured as the yearly standard deviation of returns."],
  sharpe:["Sharpe ratio","A 'bang for your buck' score: how much return you earned for each unit of risk taken. Higher is better. Above ~0.5 is decent, above 1.0 is excellent."],
  drawdown:["Drawdown","The drop from a previous high point to a low. The 'worst drawdown' is the most painful peak-to-bottom fall you'd have had to sit through."],
  backtest:["Backtest","Replaying history: applying today's portfolio mix to the last 10 years of real market data to see how it would have performed."],
  projection:["Projection","A forward-looking estimate of possible future outcomes. Not a prediction \u2014 a range of what could happen, with probabilities."],
  montecarlo:["Monte Carlo simulation","Running thousands of imagined futures (here, 50,000) with random but realistic market moves, then looking at the spread of results."],
  sleeve:["Sleeve","A group of holdings that play the same role \u2014 e.g. the 'Core' sleeve is the main engine, the 'Hedge' sleeve protects against bad times."],
  correlation:["Correlation","Whether two investments move together. High correlation = they rise and fall as one (less protection). Low/negative = they zig when others zag (true diversification)."],
  fx:["FX / Currency exposure","Foreign exchange. Because some funds hold assets priced in US dollars or other currencies, their baht value also changes when exchange rates move."],
  hedged:["Currency-hedged","The fund uses contracts to cancel out exchange-rate swings, so you mostly get the asset's return without the currency wobble \u2014 for a small cost."],
  benchmark:["Benchmark","A simple yardstick to compare against \u2014 here the US S&P 500 (pure US stocks) and a classic Global 60/40 (60% stocks, 40% bonds)."],
  diversification:["Diversification","Not putting all eggs in one basket. Mixing things that don't move together so one bad area doesn't sink the whole portfolio."],
  median:["Median (typical) outcome","The middle result \u2014 half the simulated futures did better, half did worse. A more honest 'expected' figure than an average."],
  percentile:["Percentile","A ranking. The 5th percentile is a bad case (only 5% of futures were worse); the 95th is a great case (only 5% were better)."],
  inflation:["Inflation","The gradual rise in prices that erodes money's buying power. Beating inflation means your wealth grows in real, spendable terms."],
  realasset:["Real assets","Tangible things like commodities and infrastructure that often hold value when prices rise \u2014 a useful hedge against inflation and shocks."],
};

/* ---------- TOOLTIP ENGINE ---------- */
const tip = document.getElementById('tooltip');
function showTip(el, html){
  tip.innerHTML = html; tip.classList.add('show');
  const r = el.getBoundingClientRect();
  let x = r.left + r.width/2 - 150; x = Math.max(10, Math.min(x, window.innerWidth-310));
  let y = r.top - tip.offsetHeight - 10; if(y < 10) y = r.bottom + 10;
  tip.style.left = x+'px'; tip.style.top = y+'px';
}
function hideTip(){ tip.classList.remove('show'); }
function bindTerm(el){
  const key = el.dataset.term;
  let html;
  if(key && TERMS[key]) html = `<b>${TERMS[key][0]}</b><br>${TERMS[key][1]}`;
  else { // infer from text
    const t = el.textContent.toLowerCase().replace(/[^a-z]/g,'');
    const k = Object.keys(TERMS).find(k=>t.includes(k));
    html = k ? `<b>${TERMS[k][0]}</b><br>${TERMS[k][1]}` : el.textContent;
  }
  el.addEventListener('mouseenter',()=>showTip(el,html));
  el.addEventListener('mouseleave',hideTip);
  el.addEventListener('click',()=>{showTip(el,html);setTimeout(hideTip,3500);});
}
function bindAllTerms(){ document.querySelectorAll('.term, .tinfo').forEach(bindTerm); }

/* ---------- HELPERS ---------- */
const pct = (v,d=1)=> (v>0?'+':'')+v.toFixed(d)+'%';
const fmt = (v,d=1)=> v.toFixed(d);
function deltaTag(now, was, unit='%', invert=false){
  const diff = now - was;
  if(Math.abs(diff)<0.005) return `<div class="delta flat">no change vs original</div>`;
  const good = invert ? diff<0 : diff>0;
  const cls = diff>0?'up':'down';
  return `<div class="delta ${cls}">${diff>0?'+':''}${diff.toFixed(2)}${unit} vs original</div>`;
}

/* ---------- KPI CARDS ---------- */
function renderKPIs(){
  const v = D.versions[current], o = D.versions['Original'].stats, s = v.stats, p = v.projection;
  const cards = [
    {label:'Annual return', term:'cagr', val:pct(s.cagr*100,2), sub:'historical (CAGR)', d:deltaTag(s.cagr*100,o.cagr*100,'%')},
    {label:'Risk', term:'volatility', val:fmt(s.vol*100,2)+'%', sub:'yearly volatility', d:deltaTag(s.vol*100,o.vol*100,'%',true)},
    {label:'Return for risk', term:'sharpe', val:fmt(s.sharpe,2), sub:'Sharpe ratio', d:deltaTag(s.sharpe,o.sharpe,'')},
    {label:'Worst drop', term:'drawdown', val:fmt(s.max_dd*100,1)+'%', sub:'peak-to-trough', d:deltaTag(s.max_dd*100,o.max_dd*100,'%')},
    {label:'Typical future', term:'median', val:pct(p.ann_pct.p50,1)+'/yr', sub:'median 10y outlook', d:''},
    {label:'Chance of loss', term:'projection', val:fmt(p.prob_neg,1)+'%', sub:'over 10 years', d:''},
  ];
  document.getElementById('kpiGrid').innerHTML = cards.map(c=>`
    <div class="kpi">
      <div class="kpi-label">${c.label} <span class="tinfo" data-term="${c.term}">i</span></div>
      <div class="kpi-value">${c.val}</div>
      <div class="kpi-sub">${c.sub}</div>
      ${c.d}
    </div>`).join('');
}

/* ---------- ALLOCATION ---------- */
let allocMode = 'sleeve';
function renderAlloc(){
  const v = D.versions[current];
  const ctx = document.getElementById('allocChart');
  if(charts.alloc) charts.alloc.destroy();
  let labels, data, colors, cap;
  if(allocMode==='sleeve'){
    const order=['Core','Satellite','Alternative','Hedge','Fixed'];
    labels = order.filter(o=>v.sleeve_weights[o]);
    data = labels.map(l=>v.sleeve_weights[l]);
    colors = labels.map(l=>SLEEVE_COL[l]);
    const roleMap={Core:'main growth engine',Satellite:'targeted tilts',Alternative:'inflation & shock hedges',Hedge:'bond ballast',Fixed:'cash safety buffer'};
    cap = labels.map((l,i)=>`<strong>${l}</strong> ${data[i]}% &mdash; ${roleMap[l]}`).join(' &nbsp;&bull;&nbsp; ');
  } else {
    const funds=[...v.funds].sort((a,b)=>b.weight-a.weight);
    labels = funds.map(f=>f.ticker); data = funds.map(f=>f.weight);
    colors = funds.map((f,i)=>FUND_PALETTE[i%FUND_PALETTE.length]);
    cap = 'Each fund as a share of the whole portfolio. Hover a slice for its exact weight.';
  }
  document.getElementById('allocCaption').innerHTML = cap;
  charts.alloc = new Chart(ctx,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:colors,borderColor:'#fff',borderWidth:2.5}]},
    options:{cutout:'58%',plugins:{legend:{position:'right',labels:{boxWidth:12,boxHeight:12,padding:11,font:{size:12}}},
      tooltip:{callbacks:{label:c=>` ${c.label}: ${c.parsed}%`}}},responsive:true,maintainAspectRatio:false}});
}

/* ---------- FX ---------- */
function renderFX(){
  const v=D.versions[current];
  const ctx=document.getElementById('fxChart');
  if(charts.fx) charts.fx.destroy();
  charts.fx=new Chart(ctx,{type:'doughnut',data:{labels:['Currency-hedged','Foreign-currency / THB'],
    datasets:[{data:[v.fx.hedged,v.fx.unhedged],backgroundColor:[COL.navy,COL.gold],borderColor:'#fff',borderWidth:2.5}]},
    options:{cutout:'62%',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.label}: ${c.parsed}%`}}},responsive:true,maintainAspectRatio:false}});
  document.getElementById('fxLegend').innerHTML=
    `<div class="lg"><span class="sw" style="background:${COL.navy}"></span>Hedged ${v.fx.hedged}%</div>
     <div class="lg"><span class="sw" style="background:${COL.gold}"></span>Unhedged ${v.fx.unhedged}%</div>`;
}

/* ---------- GROWTH ---------- */
function renderGrowth(){
  const v=D.versions[current];
  const ctx=document.getElementById('growthChart');
  if(charts.growth) charts.growth.destroy();
  const labels=D.dates;
  charts.growth=new Chart(ctx,{type:'line',data:{labels,datasets:[
    {label:'This portfolio',data:v.curve,borderColor:COL.navy,backgroundColor:'rgba(31,58,95,.07)',borderWidth:2.6,fill:true,tension:.1,pointRadius:0},
    {label:'S&P 500 (US stocks)',data:D.bench.SPY.curve,borderColor:COL.gold,borderWidth:1.8,fill:false,tension:.1,pointRadius:0},
    {label:'Global 60/40',data:D.bench['6040'].curve,borderColor:COL.teal,borderWidth:1.8,fill:false,tension:.1,pointRadius:0},
  ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:false},tooltip:{callbacks:{title:i=>'As of '+i[0].label,label:c=>` ${c.dataset.label}: ${c.parsed.y.toFixed(2)}\u00d7`}}},
    scales:{x:{grid:{display:false},ticks:{maxTicksLimit:11,callback:function(val){const l=this.getLabelForValue(val);return l.endsWith('-06')||l.endsWith('-12')?l.slice(0,4):'';}}},
      y:{grid:{color:'#eeebe3'},ticks:{callback:v=>v.toFixed(1)+'\u00d7'}}}}});
  document.getElementById('growthLegend').innerHTML=
    `<div class="lg"><span class="sw" style="background:${COL.navy}"></span>This portfolio</div>
     <div class="lg"><span class="sw" style="background:${COL.gold}"></span><span class="term" data-term="benchmark">S&P 500</span> (pure US stocks)</div>
     <div class="lg"><span class="sw" style="background:${COL.teal}"></span><span class="term" data-term="benchmark">Global 60/40</span></div>`;
  document.querySelectorAll('#growthLegend .term').forEach(bindTerm);
}

/* ---------- DRAWDOWN ---------- */
function renderDD(){
  const v=D.versions[current];
  const ctx=document.getElementById('ddChart');
  if(charts.dd) charts.dd.destroy();
  let peak=0; const dd=v.curve.map(x=>{peak=Math.max(peak,x);return (x/peak-1)*100;});
  charts.dd=new Chart(ctx,{type:'line',data:{labels:D.dates,datasets:[
    {label:'Drawdown',data:dd,borderColor:COL.navy,backgroundColor:'rgba(193,67,47,.18)',borderWidth:1.5,fill:true,tension:.1,pointRadius:0}]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:false},tooltip:{callbacks:{title:i=>i[0].label,label:c=>` Down ${c.parsed.y.toFixed(1)}% from peak`}}},
    scales:{x:{grid:{display:false},ticks:{maxTicksLimit:6,callback:function(val){const l=this.getLabelForValue(val);return l.endsWith('-06')?l.slice(0,4):'';}}},
      y:{grid:{color:'#eeebe3'},ticks:{callback:v=>v.toFixed(0)+'%'},max:0}}}});
}

/* ---------- ANNUAL ---------- */
function renderAnnual(){
  const v=D.versions[current];
  const ctx=document.getElementById('annualChart');
  if(charts.annual) charts.annual.destroy();
  const yrs=Object.keys(v.annual), vals=yrs.map(y=>v.annual[y]*100);
  charts.annual=new Chart(ctx,{type:'bar',data:{labels:yrs,datasets:[{data:vals,
    backgroundColor:vals.map(x=>x>=0?COL.teal:COL.red),borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},
      tooltip:{callbacks:{label:c=>` ${c.parsed.y>=0?'+':''}${c.parsed.y.toFixed(1)}%`}}},
    scales:{x:{grid:{display:false}},y:{grid:{color:'#eeebe3'},ticks:{callback:v=>v.toFixed(0)+'%'}}}}});
}

/* ---------- PROJECTION ---------- */
function renderProjection(){
  const v=D.versions[current], p=v.projection;
  const ctx=document.getElementById('projChart');
  if(charts.proj) charts.proj.destroy();
  let fan=p.fan;
  if(!fan){ // build synthetic fan from annualized percentiles if missing (Original)
    const yrs=[...Array(11).keys()];
    const mk=r=>yrs.map(t=>Math.pow(1+r/100,t));
    fan={p5:mk(p.ann_pct.p5),p25:mk(p.ann_pct.p25),p50:mk(p.ann_pct.p50),p75:mk(p.ann_pct.p75),p95:mk(p.ann_pct.p95)};
  }
  const yrs=[...Array(fan.p50.length).keys()];
  charts.proj=new Chart(ctx,{type:'line',data:{labels:yrs,datasets:[
    {label:'95th percentile (great case)',data:fan.p95,borderColor:'transparent',backgroundColor:'rgba(31,58,95,.07)',fill:'+1',pointRadius:0,tension:.2},
    {label:'75th',data:fan.p75,borderColor:'transparent',backgroundColor:'rgba(31,58,95,.13)',fill:'+1',pointRadius:0,tension:.2},
    {label:'Typical (median)',data:fan.p50,borderColor:COL.navy,borderWidth:2.8,fill:false,pointRadius:0,tension:.2},
    {label:'25th',data:fan.p25,borderColor:'transparent',backgroundColor:'rgba(31,58,95,.13)',fill:'+1',pointRadius:0,tension:.2},
    {label:'5th percentile (bad case)',data:fan.p5,borderColor:'transparent',backgroundColor:'transparent',pointRadius:0,tension:.2},
  ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:false},tooltip:{filter:i=>[2,0,4].includes(i.datasetIndex),callbacks:{title:i=>'Year '+i[0].label,label:c=>` ${c.dataset.label}: ${c.parsed.y.toFixed(2)}\u00d7`}}},
    scales:{x:{grid:{display:false},title:{display:true,text:'Years from now'}},
      y:{grid:{color:'#eeebe3'},title:{display:true,text:'Multiple of starting value'},ticks:{callback:v=>v.toFixed(1)+'\u00d7'}}}}});
  const ps=p.ann_pct, tm=p.term_pct;
  document.getElementById('projStats').innerHTML=`
    <div class="pstat"><div class="pl">Bad case (5%)</div><div class="pv">${pct(ps.p5,1)}</div><div class="px">${tm.p5}\u00d7 money</div></div>
    <div class="pstat"><div class="pl">Below typical (25%)</div><div class="pv">${pct(ps.p25,1)}</div><div class="px">${tm.p25}\u00d7 money</div></div>
    <div class="pstat hl"><div class="pl">Typical (median)</div><div class="pv">${pct(ps.p50,1)}</div><div class="px">${tm.p50}\u00d7 money</div></div>
    <div class="pstat"><div class="pl">Above typical (75%)</div><div class="pv">${pct(ps.p75,1)}</div><div class="px">${tm.p75}\u00d7 money</div></div>
    <div class="pstat"><div class="pl">Great case (95%)</div><div class="pv">${pct(ps.p95,1)}</div><div class="px">${tm.p95}\u00d7 money</div></div>`;
}

/* ---------- SCENARIOS ---------- */
const SCEN_COL={'Base / Muddle-Through':COL.teal,'Lost Decade / Stagnation':COL.grey,'Conflict / Stagflation Shock':COL.red,'Goldilocks / AI Productivity Boom':COL.gold,'Deflation / Credit Bust':COL.navyDeep};
function renderScenarios(){
  const p=D.versions[current].projection;
  document.getElementById('scenarioTable').innerHTML=Object.entries(p.scenarios).map(([name,s])=>`
    <div class="srow">
      <div class="sname"><span class="sdot" style="background:${SCEN_COL[name]||COL.navy}"></span>${name}</div>
      <div class="sprob">${s.p}%</div>
      <div class="sret">~${s.mu}%/yr return</div>
      <div class="snote">${s.note}</div>
    </div>`).join('');
}

/* ---------- SCATTER ---------- */
function renderScatter(){
  const v=D.versions[current];
  const ctx=document.getElementById('scatterChart');
  if(charts.scatter) charts.scatter.destroy();
  const pts=v.funds.map((f,i)=>({x:f.vol,y:f.cagr,r:4+f.weight*0.9,label:f.ticker,sleeve:f.sleeve,w:f.weight}));
  charts.scatter=new Chart(ctx,{type:'bubble',data:{datasets:[{data:pts,
    backgroundColor:pts.map(p=>SLEEVE_COL[p.sleeve]+'cc'),borderColor:pts.map(p=>SLEEVE_COL[p.sleeve]),borderWidth:1.5}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},
      tooltip:{callbacks:{label:c=>{const p=c.raw;return [` ${p.label} (${p.sleeve})`,` Return ${p.y}%/yr, Risk ${p.x}%, Weight ${p.w}%`];}}}},
    scales:{x:{title:{display:true,text:'Risk (volatility %) \u2192'},grid:{color:'#eeebe3'},min:0},
      y:{title:{display:true,text:'\u2191 Return (%/yr)'},grid:{color:'#eeebe3'}}}}});
}

/* ---------- CORRELATION HEATMAP ---------- */
function corrColor(v){ // 1 -> dark navy, 0 -> pale, negative -> green-ish pale
  if(v>=0){const t=v; const r=Math.round(238-(238-22)*t),g=Math.round(241-(241-41)*t),b=Math.round(233-(233-63)*t);return `rgb(${r},${g},${b})`;}
  const t=Math.min(1,-v*2.5);return `rgb(${Math.round(238-30*t)},${Math.round(241-10*t)},${Math.round(233+20*t*0)})`;
}
function renderHeatmap(){
  const c=D.versions[current].corr, labels=c.labels, m=c.matrix, n=labels.length;
  const el=document.getElementById('corrHeatmap');
  el.style.gridTemplateColumns=`70px repeat(${n},1fr)`;
  let html='<div></div>'+labels.map(l=>`<div class="hm-label col">${l}</div>`).join('');
  for(let i=0;i<n;i++){
    html+=`<div class="hm-label row">${labels[i]}</div>`;
    for(let j=0;j<n;j++){
      const val=m[i][j];const dark=val>0.55;
      html+=`<div class="hm-cell" style="background:${corrColor(val)};color:${dark?'#fff':'#5b6472'}" title="${labels[i]} \u2194 ${labels[j]}: ${val}">${i===j?'':val.toFixed(1)}</div>`;
    }
  }
  el.innerHTML=html;
}

/* ---------- HOLDINGS TABLE ---------- */
let sortKey='weight', sortDir=-1;
function renderTable(){
  const v=D.versions[current];
  const rows=[...v.funds].sort((a,b)=>{
    let x=a[sortKey],y=b[sortKey];
    if(typeof x==='string') return sortDir*x.localeCompare(y);
    return sortDir*(x-y);
  });
  const tb=document.querySelector('#holdingsTable tbody');
  tb.innerHTML=rows.map(f=>`<tr>
    <td><span class="t-ticker">${f.ticker}</span>${f.role.startsWith('NEW')?'<span class="t-new">NEW</span>':''}<span class="t-fund">${f.fund}</span></td>
    <td><span class="pill" style="background:${SLEEVE_COL[f.sleeve]}1a;color:${SLEEVE_COL[f.sleeve]}">${f.sleeve}</span></td>
    <td class="num">${f.weight}</td>
    <td>${f.asset}</td>
    <td>${f.fx}</td>
    <td class="num ${f.cagr>=0?'pos':'neg'}">${f.cagr>=0?'+':''}${f.cagr}</td>
    <td class="num">${f.vol}</td>
    <td class="num neg">${f.max_dd}</td>
    <td style="font-size:.8rem;color:var(--muted)">${f.role.replace('NEW \u2014 ','')}</td>
  </tr>`).join('');
  document.querySelectorAll('#holdingsTable th').forEach(th=>{
    th.classList.remove('asc','desc');
    if(th.dataset.sort===sortKey) th.classList.add(sortDir>0?'asc':'desc');
  });
}
document.querySelectorAll('#holdingsTable th').forEach(th=>{
  th.addEventListener('click',()=>{
    const k=th.dataset.sort;
    if(k===sortKey) sortDir*=-1; else {sortKey=k; sortDir=(['ticker','sleeve','asset','fx','role'].includes(k))?1:-1;}
    renderTable();
  });
});

/* ---------- NOTES (version-specific) ---------- */
const NOTES={
  'Junior-1':[
    {v:'good',h:'Dropping the absolute-return fund (TGSMART-D)',p:'In the history test it behaved almost like a watered-down stock fund (it moved with stocks ~90% of the time) while earning little. Removing it loses almost no real protection.'},
    {v:'good',h:'Adding Japan (ASP-NGF)',p:'Japan is the cheapest big developed market, with a real corporate-reform story. It is less tied to US tech, so it genuinely widens the spread of bets. Caveat: its currency hedging is left to the manager.'},
    {v:'good',h:'More commodities & infrastructure',p:'These are the portfolio\u2019s best protection against war/inflation shocks. Commodities are the one piece that actually zigs when bonds zag. Sizing them up is the smartest risk decision here.'},
    {v:'watch',h:'Cutting global bonds (15% \u2192 10%)',p:'This is where the extra risk comes from. Bonds are a key shock-absorber; trimming them leans more on cash and commodities for safety. Acceptable given the big 20% cash buffer, but worth watching.'},
    {v:'good',h:'Shifting Core to the low-cost index',p:'Moving money from the pricier active global fund into the cheap passive global index cuts fees and concentration while keeping the same broad exposure. A clean upgrade.'},
    {v:'neutral',h:'The diversification reality',p:'The five stock funds still move together ~80\u201399% of the time \u2014 in a crash they fall as one. Only three things truly diversify: commodities, cash, and (to a lesser degree) bonds. Junior-1 grew the first and shrank the third.'},
  ],
  'Original':[
    {v:'neutral',h:'Balanced, cautious starting point',p:'A 25/25/15/15/20 mix across growth, tilts, real assets, bonds and cash. Solid downside control with a large 35% safety buffer (bonds + cash).'},
    {v:'watch',h:'Two near-duplicate roles',p:'The absolute-return fund (TGSMART-D) and income fund behaved a lot like the stock sleeve (~90% correlation), so they added less diversification than their labels suggest.'},
    {v:'good',h:'Genuine shock absorbers present',p:'Commodities (8%), cash (20%) and unhedged global bonds (15%) are the real diversifiers \u2014 the parts that hold up when stocks fall.'},
    {v:'neutral',h:'Lower risk, lower return',p:'With more bonds and less in stocks/real-assets, the original mix is a touch calmer (8.95% risk) but earns a touch less (7.98%/yr) than the revised version.'},
  ],
};
function renderNotes(){
  document.getElementById('notesGrid').innerHTML=NOTES[current].map(n=>`
    <div class="note">
      <span class="verdict v-${n.v}">${n.v==='good'?'\u2713 Sound move':n.v==='watch'?'\u26a0 Watch this':'\u2022 Context'}</span>
      <h4>${n.h}</h4><p>${n.p}</p>
    </div>`).join('');
}

/* ---------- GLOSSARY ---------- */
function renderGlossary(){
  document.getElementById('glossary').innerHTML=Object.values(TERMS).map(([t,d])=>`
    <dl class="gterm"><dt>${t}</dt><dd>${d}</dd></dl>`).join('');
}

/* ---------- MASTER RENDER ---------- */
function renderAll(){
  renderKPIs(); renderAlloc(); renderFX(); renderGrowth(); renderDD(); renderAnnual();
  renderProjection(); renderScenarios(); renderScatter(); renderHeatmap(); renderTable(); renderNotes();
  bindAllTerms();
}

/* ---------- EVENTS ---------- */
document.querySelectorAll('.vbtn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.vbtn').forEach(x=>x.classList.remove('active'));
  b.classList.add('active'); current=b.dataset.version; renderAll();
}));
document.querySelectorAll('#allocToggle button').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#allocToggle button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active'); allocMode=b.dataset.mode; renderAlloc();
}));

renderGlossary();
renderAll();
