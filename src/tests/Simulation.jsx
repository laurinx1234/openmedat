import { useState, useEffect } from 'react'
import { T } from '../theme.js'
import { Card, BackBtn, TimerBadge, useTimer, useSettingsKeyboard, pick, shuffle } from '../components/Shared.jsx'
import { makeTask as makeZahlen, ZahlenQuiz } from './Zahlenfolgen.jsx'
import { makeTask as makeWort, WortQuiz } from './Wortfluessigkeit.jsx'
import { makeTask as makeImpl, ImplQuiz } from './Implikationen.jsx'
import { makeTask as makeFigur, FigurenQuiz, ptsToPath, arcPath, regPoly } from './Figuren.jsx'
import { genCardPool, fetchPhotos, makeQuestion, AusweisCard, AllergieQuiz } from './Allergieausweise.jsx'

// ─── Simulation config ────────────────────────────────────────────────────────
const PHASES = [
  { id:'figuren',   label:'Figuren zusammensetzen', color:T.teal,   n:15, secs:20*60, icon:'🔷' },
  { id:'allerg_l',  label:'Allergieausweise merken', color:T.green,  n:0,  secs:8*60, icon:'💳' },
  { id:'zahlen',    label:'Zahlenfolgen',            color:T.blue,   n:10, secs:15*60, icon:'🔢' },
  { id:'wort',      label:'Wortflüssigkeit',         color:T.mauve,  n:15, secs:20*60, icon:'🔤' },
  { id:'allerg_q',  label:'Allergieausweise Abfrage',color:T.green,  n:25, secs:15*60, icon:'💳' },
  { id:'impl',      label:'Implikationen erkennen',  color:T.yellow, n:10, secs:10*60, icon:'🧠' },
]

// Scoring weights (out of 40 total)
const WEIGHTS = { figuren:8, zahlen:5.3, wort:8, allerg:13.4, impl:5.3 }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pct(n,d){return d>0?Math.round(n/d*100):0}

// ─── Results ──────────────────────────────────────────────────────────────────
function getOptionText(q,i){
  if(q.opts){const o=q.opts[i];if(o==='keine'||o===undefined)return'Keine Antwort ist richtig.';if(typeof o==='object'&&o!==null){if(o.shape)return o.shape.label||'Figur';return'Keine der Figuren ist richtig.'}if(Array.isArray(o))return o.join(' , ');return String(o)}
  if(q.options)return String(q.options[i])
  if(q.choices){const c=q.choices[i];if(c==='keine')return'Keine Option ist richtig.';if(Array.isArray(c))return c.join(' , ');return String(c)}
  return''
}
function getQuestionPrompt(q,catKey){
  if(q.question)return q.question
  if(q.p1&&q.p2)return null
  if(q.visible)return q.visible.join('  ') + '  →  ?  ,  ?'
  if(q.display)return q.display.join('  ')
  return null
}

function ReviewPanel({categories,onBack}){
  const[ci,setCi]=useState(0)
  const[qi,setQi]=useState(0)
  const cat=categories[ci];const q=cat.questions[qi];const ans=cat.answers[qi]
  const correct=ans===q.correctIdx
  useEffect(()=>{
    const h=e=>{
      if(e.key==='ArrowRight'){e.preventDefault();setQi(qi=>Math.min(qi+1,cat.questions.length-1))}
      else if(e.key==='ArrowLeft'){e.preventDefault();setQi(qi=>Math.max(qi-1,0))}
      else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setCi(ci=>{const nxt=e.key==='ArrowDown'?Math.min(ci+1,categories.length-1):Math.max(ci-1,0);return nxt});setQi(0)}
      else if(e.key==='Escape')onBack()
    }
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)
  },[ci,qi,cat.questions.length,categories.length,onBack])
  return(
    <div style={{maxWidth:760,margin:'0 auto',padding:'20px 20px'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <button onClick={onBack} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,color:T.muted,cursor:'pointer',padding:'6px 14px',fontSize:13}}>← Übersicht</button>
        <div style={{color:T.text,fontWeight:'bold',fontSize:16}}>Antworten ansehen</div>
        <div style={{flex:1}}/>
        <span style={{color:T.muted,fontSize:11}}>← → Frage · ↑ ↓ Kategorie · Esc zurück</span>
      </div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
        {categories.map((c,i)=>(<button key={i} onClick={()=>{setCi(i);setQi(0)}} style={{background:ci===i?`${c.color}25`:T.surf2,border:`1px solid ${ci===i?c.color:T.border}`,borderRadius:8,color:ci===i?c.color:T.text,cursor:'pointer',padding:'8px 14px',fontSize:13,display:'flex',alignItems:'center',gap:6}}><span>{c.icon}</span>{c.label}<span style={{color:T.muted,fontSize:11}}>({c.answers.filter(a=>a!==null).length}/{c.questions.length})</span></button>))}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
        <button onClick={()=>setQi(q=>Math.max(q-1,0))} disabled={qi===0} style={{background:'none',border:'none',color:qi===0?T.border:T.text,cursor:qi===0?'default':'pointer',fontSize:18}}>◄</button>
        <span style={{color:T.text,fontSize:14}}>{qi+1} / {cat.questions.length}</span>
        <button onClick={()=>setQi(q=>Math.min(q+1,cat.questions.length-1))} disabled={qi===cat.questions.length-1} style={{background:'none',border:'none',color:qi===cat.questions.length-1?T.border:T.text,cursor:qi===cat.questions.length-1?'default':'pointer',fontSize:18}}>►</button>
        <div style={{flex:1}}/>
        <span style={{color:correct?T.green:T.red,fontWeight:'bold',fontSize:13}}>{ans===null?'Nicht beantwortet':correct?'✓ Richtig':'✗ Falsch'}</span>
      </div>
      <Card style={{marginBottom:12}}>
        {q.p1&&q.p2?(
          <div>
            <div style={{color:T.muted,fontSize:13,marginBottom:12}}>Welche Schlussfolgerung ist logisch korrekt?</div>
            {[q.p1,q.p2].map((p,i)=>(<div key={i} style={{background:T.surf2,borderRadius:10,padding:'14px 18px',borderLeft:`3px solid ${cat.color}`,marginBottom:10,color:T.text,fontSize:16}}>{p}</div>))}
          </div>
        ):(
          <div style={{fontSize:17,color:T.text,marginBottom:q.word?12:0}}>{getQuestionPrompt(q,cat.key)||'Frage'}</div>
        )}
        {q.word&&<div style={{color:T.muted,fontSize:15,marginTop:8}}>Wort: <span style={{color:cat.color,fontWeight:'bold',fontSize:20,letterSpacing:4}}>{q.word.toUpperCase()}</span></div>}
        {q.showAvatar&&q.card&&(
          <div style={{display:'flex',justifyContent:'center',marginTop:12}}>
            <img src={q.card.photoUrl} width={64} height={64} alt="" style={{borderRadius:'50%',objectFit:'cover',objectPosition:'center top'}}/>
          </div>
        )}
      </Card>
      <Card>
        {Array.from({length:q.opts?q.opts.length:q.options?q.options.length:q.choices?q.choices.length:0},(_,i)=>{
          const o=q.opts?q.opts[i]:null
          const isCorrect=i===q.correctIdx
          const isUserPick=i===ans
          const bg=isCorrect?`${T.green}22`:isUserPick?`${T.red}22`:T.surf2
          const border=isCorrect?T.green:isUserPick?T.red:T.border
          return(
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,width:'100%',background:bg,border:`1px solid ${border}`,borderRadius:10,color:T.text,padding:'10px 16px',fontSize:14,textAlign:'left',marginBottom:8}}>
              <span style={{color:T.yellow,minWidth:22,fontWeight:'bold',flexShrink:0}}>{['A','B','C','D','E'][i]}</span>
              {o&&o.shape?<div style={{display:'flex',alignItems:'center',gap:10,flex:1}}><FigAnswerSVG shape={o.shape} size={48}/><span>{o.shape.label}</span></div>:o&&typeof o==='object'&&o!==null&&o.shape===null?<span style={{flex:1,color:T.muted}}>Keine der Figuren ist richtig.</span>:<span style={{flex:1}}>{getOptionText(q,i)}</span>}
              {isCorrect&&isUserPick&&<span style={{color:T.green,fontWeight:'bold',marginLeft:'auto',flexShrink:0}}>✓ Richtig</span>}
              {isCorrect&&!isUserPick&&<span style={{color:T.green,fontWeight:'bold',marginLeft:'auto',flexShrink:0}}>✓ Richtige Antwort</span>}
              {isUserPick&&!isCorrect&&<span style={{color:T.red,fontWeight:'bold',marginLeft:'auto',flexShrink:0}}>✗ Deine Wahl</span>}
            </div>
          )
        })}
        {ans===null&&<div style={{color:T.muted,fontSize:13,fontStyle:'italic'}}>Nicht beantwortet</div>}
        <div style={{color:T.muted,fontSize:11,marginTop:8}}>← → Frage · ↑ ↓ Kategorie · Esc zurück</div>
      </Card>
    </div>
  )
}

// FigAnswerSVG for the ReviewPanel (kept here since ReviewPanel is simulation-only)
function FigAnswerSVG({shape,size=60}){
  const s=size,cx=s/2,cy=s/2,r=s*0.42
  const fill=`${T.teal}22`,stroke=T.teal,sw='2'
  if(shape.isPlaceholder){
    if(shape.id==='ph_tri')return<svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><polygon points={`${cx},${s*0.08} ${s*0.92},${s*0.88} ${s*0.08},${s*0.88}`} fill={fill} stroke={stroke} strokeWidth={sw}/></svg>
    if(shape.id==='ph_sq')return<svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><rect x={s*0.1} y={s*0.1} width={s*0.8} height={s*0.8} fill={fill} stroke={stroke} strokeWidth={sw}/></svg>
    if(shape.id==='ph_rect')return<svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><rect x={s*0.06} y={s*0.22} width={s*0.88} height={s*0.55} fill={fill} stroke={stroke} strokeWidth={sw}/></svg>
    return<svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><polygon points={`${s*0.28},${s*0.25} ${s*0.72},${s*0.25} ${s*0.9},${s*0.78} ${s*0.1},${s*0.78}`} fill={fill} stroke={stroke} strokeWidth={sw}/></svg>
  }
  if(shape.id==='c4')return<svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={sw}/></svg>
  if(shape.family==='circle'){
    const path=arcPath(cx,cy,r,-Math.PI/2,-Math.PI/2+shape.sweep)
    return<svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><path d={path} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/></svg>
  }
  const pts=regPoly(shape.sides,cx,cy,r)
  return<svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><path d={ptsToPath(pts)} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/></svg>
}

function ResultsScreen({scores,onBack,reviewData}){
  const[view,setView]=useState('scores')
  useEffect(()=>{
    if(view!=='scores')return
    const h=e=>{
      if(e.key==='Escape')onBack()
      if(e.key==='Enter'){e.preventDefault();if(reviewData)setView('review')}
    }
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)
  },[view,onBack,reviewData])
  const cats=[
    {k:'figuren',label:'Figuren zusammensetzen',color:T.teal, icon:'🔷'},
    {k:'zahlen', label:'Zahlenfolgen',           color:T.blue, icon:'🔢'},
    {k:'wort',   label:'Wortflüssigkeit',        color:T.mauve,icon:'🔤'},
    {k:'allerg', label:'Allergieausweise',        color:T.green,icon:'💳'},
    {k:'impl',   label:'Implikationen erkennen', color:T.yellow,icon:'🧠'},
  ]
  const total40=cats.reduce((s,{k})=>{
    const sc=scores[k];if(!sc)return s
    return s+(sc.correct/sc.total)*WEIGHTS[k]
  },0)
  const totalPct=Math.round((total40/40)*100)
  const col=totalPct>=75?T.green:totalPct>=55?T.yellow:T.red

  if(view==='review'&&reviewData){
    const rc=cats.map(c=>({...c,...reviewData[c.k],key:c.k}))
    return <ReviewPanel categories={rc} onBack={()=>setView('scores')}/>
  }

  return(
    <div style={{maxWidth:680,margin:'0 auto',padding:'40px 20px'}}>
      <div style={{textAlign:'center',marginBottom:40}}>
        <div style={{fontSize:13,letterSpacing:3,color:T.muted,marginBottom:8}}>SIMULATION ABGESCHLOSSEN</div>
        <div style={{fontSize:72,fontWeight:'bold',color:col,marginBottom:4}}>{totalPct}%</div>
        <div style={{color:T.muted,fontSize:14}}>{total40.toFixed(1)} / 40 Punkte</div>
      </div>
      <Card style={{marginBottom:24}}>
        {cats.map(({k,label,color,icon})=>{
          const sc=scores[k];if(!sc)return null
          const p=pct(sc.correct,sc.total)
          const pts=((sc.correct/sc.total)*WEIGHTS[k]).toFixed(1)
          const barCol=p>=75?T.green:p>=50?T.yellow:T.red
          return<div key={k} style={{marginBottom:18}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span>{icon}</span>
                <span style={{color:T.text,fontSize:14}}>{label}</span>
              </div>
              <div style={{display:'flex',gap:12,alignItems:'center'}}>
                <span style={{color:T.muted,fontSize:12}}>{sc.correct}/{sc.total}</span>
                <span style={{color:barCol,fontWeight:'bold',fontSize:14,minWidth:42,textAlign:'right'}}>{p}%</span>
                <span style={{color:T.muted,fontSize:12,minWidth:52,textAlign:'right'}}>{pts}/{WEIGHTS[k]} Pkt.</span>
              </div>
            </div>
            <div style={{height:6,background:T.surf2,borderRadius:4}}>
              <div style={{width:`${p}%`,height:'100%',background:barCol,borderRadius:4,transition:'width 0.5s'}}/>
            </div>
          </div>
        })}
        <div style={{borderTop:`1px solid ${T.border}`,paddingTop:16,marginTop:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{color:T.text,fontWeight:'bold'}}>Gesamt</span>
          <span style={{color:col,fontWeight:'bold',fontSize:18}}>{total40.toFixed(1)} / 40 Punkten = {totalPct}%</span>
        </div>
      </Card>
      <div style={{display:'flex',gap:12,justifyContent:'center',marginBottom:12}}>
        <button onClick={onBack} style={{background:T.surf2,border:`1px solid ${T.border}`,borderRadius:8,color:T.text,cursor:'pointer',padding:'12px 28px',fontSize:15}}>← Hauptmenü</button>
        {reviewData&&<button onClick={()=>setView('review')} style={{background:T.orange,border:'none',borderRadius:8,color:'#000',cursor:'pointer',padding:'12px 28px',fontSize:15,fontWeight:'bold'}}>Antworten ansehen</button>}
      </div>
      <div style={{textAlign:'center',color:T.muted,fontSize:11}}>Esc → Hauptmenü · Enter → Antworten ansehen</div>
    </div>
  )
}

// ─── Phase transition card ────────────────────────────────────────────────────
function PhaseCard({phase,onStart,timeLeft}){
  const idx=PHASES.findIndex(p=>p.id===phase.id)
  return(
    <div style={{maxWidth:540,margin:'80px auto',padding:'24px 20px',textAlign:'center'}}>
      <div style={{color:T.muted,fontSize:12,letterSpacing:3,marginBottom:16}}>NÄCHSTER ABSCHNITT ({idx+1}/6)</div>
      <div style={{fontSize:48,marginBottom:16}}>{phase.icon}</div>
      <div style={{color:phase.color,fontSize:28,fontWeight:'bold',marginBottom:8}}>{phase.label}</div>
      {phase.n>0&&<div style={{color:T.muted,fontSize:15,marginBottom:24}}>{phase.n} Fragen · {Math.round(phase.secs/60)} Minuten</div>}
      {phase.id==='allerg_l'&&<div style={{color:T.muted,fontSize:15,marginBottom:24}}>8 Ausweise · {Math.round(phase.secs/60)} Minuten Merkzeit</div>}
      <button onClick={onStart} style={{background:phase.color,border:'none',borderRadius:12,color:'#000',cursor:'pointer',padding:'16px 40px',fontSize:18,fontWeight:'bold'}}>Starten</button>
    </div>
  )
}

// ─── Main Simulation Component ────────────────────────────────────────────────

const PH_WEIGHTS = {figuren:'8',zahlen:'5.3',wort:'8',allerg_q:'13.4',impl:'5.3'}
function phWeight(id){ const w=PH_WEIGHTS[id]; return w ? w+' / 40' : '' }

export default function Simulation({onBack}){
  const[simPhase,setSimPhase]=useState('intro')
  const[phaseIdx,setPhaseIdx]=useState(0)
  const[timer,resetTimer]=useTimer(0)

  // Per-category state (no current-index needed — quiz components manage focus internally)
  const[figQuestions,setFigQuestions]=useState([])
  const[figAnswers,setFigAnswers]=useState([])

  const[zahlenQuestions,setZahlenQuestions]=useState([])
  const[zahlenAnswers,setZahlenAnswers]=useState([])

  const[wortQuestions,setWortQuestions]=useState([])
  const[wortAnswers,setWortAnswers]=useState([])

  const[allergCards,setAllergCards]=useState([])
  const[allergShown,setAllergShown]=useState([])
  const[allergQuestions,setAllergQuestions]=useState([])
  const[allergAnswers,setAllergAnswers]=useState([])

  const[implQuestions,setImplQuestions]=useState([])
  const[implAnswers,setImplAnswers]=useState([])

  const[scores,setScores]=useState({})

  const currentPhase=PHASES[phaseIdx]

  // Escape → end current phase
  useEffect(() => {
    const ANSWER_PHASES = ['figuren','zahlen','wort','allerg_q','impl']
    if (!ANSWER_PHASES.includes(simPhase)) return
    const esc = e => { if (e.key === 'Escape') endCurrentPhase() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [simPhase])

  // Auto-end phase when timer runs out
  useEffect(()=>{
    if(!['figuren','zahlen','wort','allerg_q','impl'].includes(simPhase))return
    if(timer<=0)endCurrentPhase()
  },[timer,simPhase])

  // Also end allerg_l when timer runs out
  useEffect(()=>{
    if(simPhase==='allerg_l'&&timer<=0)nextPhase()
  },[timer,simPhase])

  function score(answers,questions){const correct=answers.reduce((s,a,i)=>s+(a===questions[i].correctIdx?1:0),0);return{correct,total:questions.length}}

  function endCurrentPhase(){
    if(simPhase==='figuren')setScores(s=>({...s,figuren:score(figAnswers,figQuestions)}))
    if(simPhase==='zahlen')setScores(s=>({...s,zahlen:score(zahlenAnswers,zahlenQuestions)}))
    if(simPhase==='wort')setScores(s=>({...s,wort:score(wortAnswers,wortQuestions)}))
    if(simPhase==='allerg_q')setScores(s=>({...s,allerg:score(allergAnswers,allergQuestions)}))
    if(simPhase==='impl')setScores(s=>({...s,impl:score(implAnswers,implQuestions)}))
    nextPhase()
  }

  function nextPhase(){
    const next=phaseIdx+1
    if(next>=PHASES.length){setSimPhase('results');return}
    setPhaseIdx(next);setSimPhase('phase_card')
  }

  async function startPhase(){
    const ph=PHASES[phaseIdx]
    resetTimer(ph.secs)
    if(ph.id==='figuren'){
      const qs=Array.from({length:15},()=>makeFigur())
      setFigQuestions(qs);setFigAnswers(Array(15).fill(null))
      setSimPhase('figuren')
    } else if(ph.id==='allerg_l'){
      const pool=genCardPool()
      const photos=await fetchPhotos(8)
      photos.forEach((url,i)=>{if(i<pool.length)pool[i].photoUrl=url})
      setAllergCards(pool);setAllergShown(pool.slice(0,8))
      resetTimer(8*60)
      setSimPhase('allerg_l')
    } else if(ph.id==='zahlen'){
      const qs=Array.from({length:10},()=>makeZahlen())
      setZahlenQuestions(qs);setZahlenAnswers(Array(10).fill(null))
      setSimPhase('zahlen')
    } else if(ph.id==='wort'){
      const qs=Array.from({length:15},()=>makeWort())
      setWortQuestions(qs);setWortAnswers(Array(15).fill(null))
      setSimPhase('wort')
    } else if(ph.id==='allerg_q'){
      const qs=Array.from({length:25},()=>makeQuestion(allergShown,allergCards))
      setAllergQuestions(qs);setAllergAnswers(Array(25).fill(null))
      setSimPhase('allerg_q')
    } else if(ph.id==='impl'){
      const qs=Array.from({length:10},()=>makeImpl())
      setImplQuestions(qs);setImplAnswers(Array(10).fill(null))
      setSimPhase('impl')
    }
  }

  // ── Header bar for active phases ──
  function PhaseHeader({label,color,n,answers}){
    const done=answers?answers.filter(a=>a!==null).length:0
    return(
      <div style={{background:T.surf,borderBottom:`1px solid ${T.border}`,padding:'12px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',gap:16,alignItems:'center'}}>
          <button onClick={endCurrentPhase} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,color:T.muted,cursor:'pointer',padding:'5px 12px',fontSize:12}}>Abschnitt beenden →</button>
          <span style={{color,fontWeight:'bold',fontSize:16}}>{label}</span>
        </div>
        <div style={{display:'flex',gap:16,alignItems:'center'}}>
          {n>0&&<span style={{color:T.muted,fontSize:13}}>{done}/{n} beantwortet</span>}
          <TimerBadge seconds={timer}/>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const simSkRows=[]
  const{isStartFocused:simSkS}=useSettingsKeyboard(simSkRows,()=>{setPhaseIdx(0);setSimPhase('phase_card')},onBack,simPhase==='intro')
  if(simPhase==='intro')return(
    <div style={{maxWidth:680,margin:'0 auto',padding:'24px 20px'}}>
      <BackBtn onBack={onBack}/>
      <div style={{color:T.orange,fontSize:24,fontWeight:'bold',marginBottom:24}}>Simulation</div>
      <Card>
        <div style={{marginBottom:24}}>
          <div style={{color:T.muted,fontSize:13,marginBottom:16}}>Simulierter MedAT-Testtag in Originalreihenfolge. Innerhalb jeder Kategorie kannst du Fragen überspringen und später beantworten. Ergebnisse werden erst am Ende angezeigt.</div>
          <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:12,maxWidth:560,margin:'0 auto'}}>
            {PHASES.map((ph,i)=>(
              <div key={ph.id} style={{background:T.surf2,border:`1px solid ${T.border}`,borderRadius:12,padding:'16px 18px',display:'flex',flexDirection:'column',gap:8,width:260}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:20}}>{ph.icon}</span>
                  <span style={{color:ph.color,fontWeight:'bold',fontSize:14}}>{ph.label}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{color:T.muted,fontSize:12}}>{ph.id==='allerg_l'?'8 Ausweise lernen':`${ph.n} Fragen`} · {Math.round(ph.secs/60)} Min</span>
                  <span style={{color:T.muted,fontSize:11}}>{phWeight(ph.id)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:'flex',gap:12}}>
          <button onClick={()=>{setPhaseIdx(0);setSimPhase('phase_card')}} style={{background:T.orange,border:'none',borderRadius:10,color:'#000',cursor:'pointer',padding:'14px 32px',fontSize:16,fontWeight:'bold',boxShadow:simSkS()?`0 0 0 3px ${T.orange}88`:'none'}}>Starten</button>
        <div style={{color:T.muted,fontSize:11,marginTop:12}}>Enter starten · Esc zurück</div>
        </div>
      </Card>
    </div>
  )

  if(simPhase==='phase_card')return<PhaseCard phase={currentPhase} onStart={startPhase} />

  if(simPhase==='results'){
    const reviewData={
      figuren:{questions:figQuestions,answers:figAnswers},
      zahlen:{questions:zahlenQuestions,answers:zahlenAnswers},
      wort:{questions:wortQuestions,answers:wortAnswers},
      allerg:{questions:allergQuestions,answers:allergAnswers},
      impl:{questions:implQuestions,answers:implAnswers},
    }
    return<ResultsScreen scores={scores} onBack={onBack} reviewData={reviewData}/>
  }

  // Allerg learn
  if(simPhase==='allerg_l')return(
    <div>
      <div style={{background:T.surf,borderBottom:`1px solid ${T.border}`,padding:'12px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',gap:16,alignItems:'center'}}>
          <button onClick={()=>nextPhase()} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,color:T.muted,cursor:'pointer',padding:'5px 12px',fontSize:12}}>Abschnitt beenden →</button>
          <span style={{color:T.green,fontWeight:'bold',fontSize:16}}>Allergieausweise merken</span>
        </div>
        <TimerBadge seconds={timer}/>
      </div>
      <div style={{maxWidth:900,margin:'0 auto',padding:'24px 20px'}}>
        <div style={{background:T.surf2,borderRadius:6,height:6,marginBottom:24}}><div style={{height:'100%',background:T.green,borderRadius:6,width:`${(timer/(PHASES.find(p=>p.id==='allerg_l').secs))*100}%`,transition:'width 1s linear'}}/></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16}}>
          {allergShown.map((c,i)=><AusweisCard key={i} card={c}/>)}
        </div>
      </div>
    </div>
  )

  // ── Quiz phases: delegate to subtest components ──

  if(simPhase==='figuren'&&figQuestions.length)return(
    <div>
      <PhaseHeader label="Figuren zusammensetzen" color={T.teal} n={15} answers={figAnswers}/>
      <div style={{maxWidth:840,margin:'0 auto',padding:'20px 20px'}}>
        <FigurenQuiz questions={figQuestions} answers={figAnswers} onAnswer={(qi,i)=>{const a=[...figAnswers];a[qi]=a[qi]===i?null:i;setFigAnswers(a)}} color={T.teal}/>
      </div>
    </div>
  )

  if(simPhase==='zahlen'&&zahlenQuestions.length)return(
    <div>
      <PhaseHeader label="Zahlenfolgen" color={T.blue} n={10} answers={zahlenAnswers}/>
      <div style={{maxWidth:800,margin:'0 auto',padding:'20px 20px'}}>
        <ZahlenQuiz questions={zahlenQuestions} answers={zahlenAnswers} onAnswer={(qi,i)=>{const a=[...zahlenAnswers];a[qi]=a[qi]===i?null:i;setZahlenAnswers(a)}} color={T.blue}/>
      </div>
    </div>
  )

  if(simPhase==='wort'&&wortQuestions.length)return(
    <div>
      <PhaseHeader label="Wortflüssigkeit" color={T.mauve} n={15} answers={wortAnswers}/>
      <div style={{maxWidth:680,margin:'0 auto',padding:'20px 20px'}}>
        <WortQuiz questions={wortQuestions} answers={wortAnswers} onAnswer={(qi,i)=>{const a=[...wortAnswers];a[qi]=a[qi]===i?null:i;setWortAnswers(a)}} color={T.mauve}/>
      </div>
    </div>
  )

  if(simPhase==='allerg_q'&&allergQuestions.length)return(
    <div>
      <PhaseHeader label="Allergieausweise Abfrage" color={T.green} n={25} answers={allergAnswers}/>
      <div style={{maxWidth:720,margin:'0 auto',padding:'20px 20px'}}>
        <AllergieQuiz questions={allergQuestions} answers={allergAnswers} onAnswer={(qi,i)=>{const a=[...allergAnswers];a[qi]=a[qi]===i?null:i;setAllergAnswers(a)}} color={T.green}/>
      </div>
    </div>
  )

  if(simPhase==='impl'&&implQuestions.length)return(
    <div>
      <PhaseHeader label="Implikationen erkennen" color={T.yellow} n={10} answers={implAnswers}/>
      <div style={{maxWidth:720,margin:'0 auto',padding:'20px 20px'}}>
        <ImplQuiz questions={implQuestions} answers={implAnswers} onAnswer={(qi,i)=>{const a=[...implAnswers];a[qi]=a[qi]===i?null:i;setImplAnswers(a)}} color={T.yellow}/>
      </div>
    </div>
  )

  return<div style={{padding:40,color:T.muted,textAlign:'center'}}>Laden…</div>
}
