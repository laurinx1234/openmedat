import { useState, useEffect, useCallback, useRef } from 'react'
import { T } from '../theme.js'
import { Card, BackBtn, TimerBadge, useTimer, rnd, pick, shuffle, OPTS, KEYS } from '../components/Shared.jsx'
import { makeTask as makeZahlen } from './Zahlenfolgen.jsx'
import { makeTask as makeWort } from './Wortfluessigkeit.jsx'
import { makeTask as makeImpl } from './Implikationen.jsx'
import { makeTask as makeFigur } from './Figuren.jsx'
import { genCardPool, fetchPhotos, makeQuestion, AusweisCard } from './Allergieausweise.jsx'

// ─── Simulation config ────────────────────────────────────────────────────────
const PHASES = [
  { id:'figuren',   label:'Figuren zusammensetzen', color:T.teal,   n:15, secs:20*60, icon:'🔷' },
  { id:'allerg_l',  label:'Allergieausweise merken', color:T.green,  n:0,  secs:10*60, icon:'💳' },
  { id:'zahlen',    label:'Zahlenfolgen',            color:T.blue,   n:10, secs:15*60, icon:'🔢' },
  { id:'wort',      label:'Wortflüssigkeit',         color:T.mauve,  n:15, secs:20*60, icon:'🔤' },
  { id:'allerg_q',  label:'Allergieausweise Abfrage',color:T.green,  n:25, secs:15*60, icon:'💳' },
  { id:'impl',      label:'Implikationen erkennen',  color:T.yellow, n:10, secs:10*60, icon:'🧠' },
]

// Scoring weights (out of 40 total)
const WEIGHTS = { figuren:8, zahlen:5.3, wort:8, allerg:13.4, impl:5.3 }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pct(n,d){return d>0?Math.round(n/d*100):0}

// ─── Navigator dots ───────────────────────────────────────────────────────────
function NavDots({questions,answers,current,onGo,color}){
  return(
    <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:16}}>
      {questions.map((_,i)=>{
        const ans=answers[i]
        const isCur=i===current
        const col=isCur?color:ans!==null?`${color}88`:T.surf2
        const border=isCur?color:ans!==null?`${color}88`:T.border
        return<button key={i} onClick={()=>onGo(i)}
          style={{width:28,height:28,borderRadius:6,background:col,border:`1px solid ${border}`,
            color:isCur?'#000':T.text,fontSize:11,cursor:'pointer',fontWeight:isCur?'bold':'normal',
            display:'flex',alignItems:'center',justifyContent:'center'}}>
          {i+1}
        </button>
      })}
    </div>
  )
}

// ─── Generic question screen with skip/nav ────────────────────────────────────
function QuestionScreen({phase,questions,answers,setAnswers,current,setCurrent,color,renderQuestion,renderOptions}){
  const unanswered=answers.filter(a=>a===null).length
  function answer(i){
    if(answers[current]!==null)return // already answered
    const next=[...answers];next[current]=i;setAnswers(next)
    // Auto-advance to next unanswered
    for(let j=current+1;j<questions.length;j++){if(next[j]===null){setCurrent(j);return}}
    for(let j=0;j<current;j++){if(next[j]===null){setCurrent(j);return}}
  }
  useEffect(()=>{
    const h=e=>{
      const idx=KEYS.indexOf(e.key.toLowerCase())
      if(idx>=0&&idx<5)answer(idx)
      if(e.key==='ArrowRight'){const nx=current+1<questions.length?current+1:current;setCurrent(nx)}
      if(e.key==='ArrowLeft'){const nx=current-1>=0?current-1:current;setCurrent(nx)}
    }
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)
  },[current,answers])

  const q=questions[current];if(!q)return null
  const myAnswer=answers[current]
  const getState=i=>myAnswer===null?'idle':i===q.correctIdx?'correct':i===myAnswer?'wrong':'idle'
  // Note: in sim mode we show state only if answered (to allow reviewing)
  const stateForSim=i=>myAnswer===null?'idle':i===myAnswer?'selected':'idle'

  return(
    <div>
      <NavDots questions={questions} answers={answers} current={current} onGo={setCurrent} color={color}/>
      <div style={{color:T.muted,fontSize:12,marginBottom:12}}>
        {unanswered} Fragen noch offen · ← → zum Blättern · A–G zum Antworten
      </div>
      {renderQuestion(q)}
      <Card style={{marginTop:12}}>
        {q.opts?q.opts.map((o,i)=>(
          <button key={i} onClick={()=>answer(i)} style={{
            display:'flex',alignItems:'flex-start',gap:12,width:'100%',
            background:myAnswer===i?`${color}22`:T.surf2,
            border:`1px solid ${myAnswer===i?color:T.border}`,
            borderRadius:10,color:T.text,cursor:myAnswer===null?'pointer':'default',
            padding:'12px 16px',fontSize:14,textAlign:'left',marginBottom:8,transition:'all 0.15s'
          }}>
            <span style={{color:T.yellow,minWidth:22,fontWeight:'bold',flexShrink:0}}>{OPTS[i]}</span>
            <span>{renderOptions?renderOptions(o,i):o==='keine'?'Keine Option ist richtig.':o}</span>
            {myAnswer===i&&<span style={{color:color,marginLeft:'auto'}}>✓</span>}
          </button>
        )):null}
        {!q.opts&&q.choices&&q.choices.map((c,i)=>(
          <button key={i} onClick={()=>answer(i)} style={{
            display:'flex',alignItems:'flex-start',gap:12,width:'100%',
            background:myAnswer===i?`${color}22`:T.surf2,
            border:`1px solid ${myAnswer===i?color:T.border}`,
            borderRadius:10,color:T.text,cursor:myAnswer===null?'pointer':'default',
            padding:'12px 16px',fontSize:14,textAlign:'left',marginBottom:8,transition:'all 0.15s'
          }}>
            <span style={{color:T.yellow,minWidth:22,fontWeight:'bold',flexShrink:0}}>{OPTS[i]}</span>
            <span>{c==='keine'?'Keine Option ist richtig.':Array.isArray(c)?`${c[0]}  ,  ${c[1]}`:c}</span>
            {myAnswer===i&&<span style={{color:color,marginLeft:'auto'}}>✓</span>}
          </button>
        ))}
        <div style={{color:T.muted,fontSize:11,marginTop:8}}>← → blättern · A S D F G antworten</div>
      </Card>
    </div>
  )
}

// ─── Results ──────────────────────────────────────────────────────────────────
function ResultsScreen({scores,onBack}){
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
      <div style={{display:'flex',gap:12,justifyContent:'center'}}>
        <button onClick={onBack} style={{background:T.surf2,border:`1px solid ${T.border}`,borderRadius:8,color:T.text,cursor:'pointer',padding:'12px 28px',fontSize:15}}>← Hauptmenü</button>
      </div>
    </div>
  )
}

// ─── Figuren piece renderers (inlined from Figuren.jsx) ───────────────────────
function ptsToPath(pts){return pts.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')+' Z'}
function arcPath(cx,cy,r,a0,a1){const sw=((a1-a0)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);if(sw>=2*Math.PI-0.001)return null;const x0=cx+r*Math.cos(a0),y0=cy+r*Math.sin(a0),x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1);return`M ${cx},${cy} L ${x0.toFixed(2)},${y0.toFixed(2)} A ${r},${r} 0 ${sw>Math.PI?1:0},1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`}
const PC=['#89b4fa','#cba6f7','#94e2d5','#a6e3a1','#f9e2af','#fab387','#f38ba8','#f5c2e7']
function FigPieceTile({data,rotation,idx}){const color=PC[idx%9];return<svg viewBox="0 0 100 100" width="90" height="90"><g transform={`rotate(${rotation},50,50)`}><path d={ptsToPath(data)} fill={`${color}35`} stroke={color} strokeWidth="1.2" strokeLinejoin="round"/></g></svg>}
function regPolyS(n,cx,cy,r){return Array.from({length:n},(_,i)=>{const a=-Math.PI/2+2*Math.PI*i/n;return[cx+r*Math.cos(a),cy+r*Math.sin(a)]})}
function FigAnswerSVG({shape,size=60}){const s=size,cx=s/2,cy=s/2,r=s*0.42;if(shape.isPlaceholder){if(shape.id==='ph_tri')return<svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><polygon points={`${cx},${s*0.08} ${s*0.92},${s*0.88} ${s*0.08},${s*0.88}`} fill={`${T.teal}22`} stroke={T.teal} strokeWidth="2"/></svg>;if(shape.id==='ph_sq')return<svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><rect x={s*0.1} y={s*0.1} width={s*0.8} height={s*0.8} fill={`${T.teal}22`} stroke={T.teal} strokeWidth="2"/></svg>;if(shape.id==='ph_rect')return<svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><rect x={s*0.06} y={s*0.22} width={s*0.88} height={s*0.55} fill={`${T.teal}22`} stroke={T.teal} strokeWidth="2"/></svg>;return<svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><polygon points={`${s*0.22},${s*0.2} ${s*0.92},${s*0.2} ${s*0.78},${s*0.8} ${s*0.08},${s*0.8}`} fill={`${T.teal}22`} stroke={T.teal} strokeWidth="2"/></svg>}if(shape.id==='c4')return<svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><circle cx={cx} cy={cy} r={r} fill={`${T.teal}22`} stroke={T.teal} strokeWidth="2"/></svg>;if(shape.family==='circle'){const a0=-Math.PI/2,path=arcPath(cx,cy,r,a0,a0+shape.sweep);return<svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><path d={path} fill={`${T.teal}22`} stroke={T.teal} strokeWidth="2" strokeLinejoin="round"/></svg>}const pts=regPolyS(shape.sides,cx,cy,r);return<svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><path d={ptsToPath(pts)} fill={`${T.teal}22`} stroke={T.teal} strokeWidth="2" strokeLinejoin="round"/></svg>}

// ─── Avatar inlined ───────────────────────────────────────────────────────────
function Avatar({card,size=60}){const[err,setErr]=useState(false);if(card.photoUrl&&!err)return<img src={card.photoUrl} width={size} height={size} alt={card.name} style={{borderRadius:'50%',objectFit:'cover',objectPosition:'center top',display:'block'}} onError={()=>setErr(true)}/>;const{skin,hair,glasses}=card;return<svg width={size} height={size} viewBox="0 0 80 80" style={{display:'block'}}><ellipse cx="40" cy="26" rx="24" ry="22" fill={hair}/><rect x="32" y="62" width="16" height="14" rx="4" fill={skin}/><ellipse cx="40" cy="44" rx="21" ry="26" fill={skin}/><ellipse cx="40" cy="22" rx="22" ry="16" fill={skin}/><ellipse cx="16" cy="44" rx="6" ry="14" fill={hair}/><ellipse cx="64" cy="44" rx="6" ry="14" fill={hair}/><ellipse cx="40" cy="14" rx="21" ry="14" fill={hair}/><ellipse cx="29" cy="40" rx="6" ry="4" fill="white"/><ellipse cx="51" cy="40" rx="6" ry="4" fill="white"/><circle cx="29" cy="40" r="2.5" fill="#222"/><circle cx="51" cy="40" r="2.5" fill="#222"/><path d="M37 50 Q40 53 43 50" fill="none" stroke="#b07050" strokeWidth="1.2"/><path d="M33 57 Q40 62 47 57" fill="none" stroke="#8B4E4E" strokeWidth="1.8" strokeLinecap="round"/></svg>}

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
  const[simPhase,setSimPhase]=useState('intro')   // intro | phase_card | figuren | allerg_l | zahlen | wort | allerg_q | impl | results
  const[phaseIdx,setPhaseIdx]=useState(0)
  const[timer,resetTimer]=useTimer(0)

  // Per-category state
  const[figQuestions,setFigQuestions]=useState([])
  const[figAnswers,setFigAnswers]=useState([])
  const[figCurrent,setFigCurrent]=useState(0)
  const[figRots,setFigRots]=useState([])

  const[zahlenQuestions,setZahlenQuestions]=useState([])
  const[zahlenAnswers,setZahlenAnswers]=useState([])
  const[zahlenCurrent,setZahlenCurrent]=useState(0)

  const[wortQuestions,setWortQuestions]=useState([])
  const[wortAnswers,setWortAnswers]=useState([])
  const[wortCurrent,setWortCurrent]=useState(0)

  const[allergCards,setAllergCards]=useState([])
  const[allergShown,setAllergShown]=useState([])
  const[allergQuestions,setAllergQuestions]=useState([])
  const[allergAnswers,setAllergAnswers]=useState([])
  const[allergCurrent,setAllergCurrent]=useState(0)

  const[implQuestions,setImplQuestions]=useState([])
  const[implAnswers,setImplAnswers]=useState([])
  const[implCurrent,setImplCurrent]=useState(0)

  const[scores,setScores]=useState({})

  // ── Central keyboard handler for all answer phases ────────────────────────
  useEffect(() => {
    const ANSWER_PHASES = ['figuren','zahlen','wort','allerg_q','impl']
    if (!ANSWER_PHASES.includes(simPhase)) return

    const h = e => {
      const i = ['a','s','d','f','g'].indexOf(e.key.toLowerCase())
      if (i < 0 || i > 4) return
      e.preventDefault()

      if (simPhase === 'figuren') {
        setFigAnswers(prev => {
          if (prev[figCurrent] !== null) return prev
          const next = [...prev]; next[figCurrent] = i
          // auto-advance
          setTimeout(() => {
            setFigCurrent(cur => {
              for (let j=cur+1; j<figQuestions.length; j++) { if (next[j]===null) return j }
              for (let j=0; j<cur; j++)                     { if (next[j]===null) return j }
              return cur
            })
          }, 50)
          return next
        })
      } else if (simPhase === 'zahlen') {
        setZahlenAnswers(prev => {
          if (prev[zahlenCurrent] !== null) return prev
          const next = [...prev]; next[zahlenCurrent] = i
          setTimeout(() => {
            setZahlenCurrent(cur => {
              for (let j=cur+1; j<zahlenQuestions.length; j++) { if (next[j]===null) return j }
              for (let j=0; j<cur; j++)                         { if (next[j]===null) return j }
              return cur
            })
          }, 50)
          return next
        })
      } else if (simPhase === 'wort') {
        setWortAnswers(prev => {
          if (prev[wortCurrent] !== null) return prev
          const next = [...prev]; next[wortCurrent] = i
          setTimeout(() => {
            setWortCurrent(cur => {
              for (let j=cur+1; j<wortQuestions.length; j++) { if (next[j]===null) return j }
              for (let j=0; j<cur; j++)                       { if (next[j]===null) return j }
              return cur
            })
          }, 50)
          return next
        })
      } else if (simPhase === 'allerg_q') {
        setAllergAnswers(prev => {
          if (prev[allergCurrent] !== null) return prev
          const next = [...prev]; next[allergCurrent] = i
          setTimeout(() => {
            setAllergCurrent(cur => {
              for (let j=cur+1; j<allergQuestions.length; j++) { if (next[j]===null) return j }
              for (let j=0; j<cur; j++)                         { if (next[j]===null) return j }
              return cur
            })
          }, 50)
          return next
        })
      } else if (simPhase === 'impl') {
        setImplAnswers(prev => {
          if (prev[implCurrent] !== null) return prev
          const next = [...prev]; next[implCurrent] = i
          setTimeout(() => {
            setImplCurrent(cur => {
              for (let j=cur+1; j<implQuestions.length; j++) { if (next[j]===null) return j }
              for (let j=0; j<cur; j++)                       { if (next[j]===null) return j }
              return cur
            })
          }, 50)
          return next
        })
      }
    }

    // Arrow key navigation between questions
    const nav = e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        if (simPhase==='figuren')  setFigCurrent(c => Math.min(c+1, figQuestions.length-1))
        if (simPhase==='zahlen')   setZahlenCurrent(c => Math.min(c+1, zahlenQuestions.length-1))
        if (simPhase==='wort')     setWortCurrent(c => Math.min(c+1, wortQuestions.length-1))
        if (simPhase==='allerg_q') setAllergCurrent(c => Math.min(c+1, allergQuestions.length-1))
        if (simPhase==='impl')     setImplCurrent(c => Math.min(c+1, implQuestions.length-1))
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (simPhase==='figuren')  setFigCurrent(c => Math.max(c-1, 0))
        if (simPhase==='zahlen')   setZahlenCurrent(c => Math.max(c-1, 0))
        if (simPhase==='wort')     setWortCurrent(c => Math.max(c-1, 0))
        if (simPhase==='allerg_q') setAllergCurrent(c => Math.max(c-1, 0))
        if (simPhase==='impl')     setImplCurrent(c => Math.max(c-1, 0))
      }
    }

    window.addEventListener('keydown', h)
    window.addEventListener('keydown', nav)
    return () => {
      window.removeEventListener('keydown', h)
      window.removeEventListener('keydown', nav)
    }
  }, [simPhase, figCurrent, zahlenCurrent, wortCurrent, allergCurrent, implCurrent,
      figQuestions, zahlenQuestions, wortQuestions, allergQuestions, implQuestions])

  const currentPhase=PHASES[phaseIdx]

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
      const rots=qs.map(q=>Array.from({length:(q.pieces.normalized||q.pieces.data||[]).length},()=>rnd(30,330)))
      setFigQuestions(qs);setFigAnswers(Array(15).fill(null));setFigCurrent(0);setFigRots(rots)
      setSimPhase('figuren')
    } else if(ph.id==='allerg_l'){
      const pool=genCardPool()
      const photos=await fetchPhotos(8)
      photos.forEach((url,i)=>{if(i<pool.length)pool[i].photoUrl=url})
      setAllergCards(pool);setAllergShown(pool.slice(0,8))
      setSimPhase('allerg_l')
    } else if(ph.id==='zahlen'){
      const qs=Array.from({length:10},()=>makeZahlen())
      setZahlenQuestions(qs);setZahlenAnswers(Array(10).fill(null));setZahlenCurrent(0)
      setSimPhase('zahlen')
    } else if(ph.id==='wort'){
      const qs=Array.from({length:15},()=>makeWort())
      setWortQuestions(qs);setWortAnswers(Array(15).fill(null));setWortCurrent(0)
      setSimPhase('wort')
    } else if(ph.id==='allerg_q'){
      const qs=Array.from({length:25},()=>makeQuestion(allergShown,allergCards))
      setAllergQuestions(qs);setAllergAnswers(Array(25).fill(null));setAllergCurrent(0)
      setSimPhase('allerg_q')
    } else if(ph.id==='impl'){
      const qs=Array.from({length:10},()=>makeImpl())
      setImplQuestions(qs);setImplAnswers(Array(10).fill(null));setImplCurrent(0)
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
  if(simPhase==='intro')return(
    <div style={{maxWidth:680,margin:'0 auto',padding:'24px 20px'}}>
      <BackBtn onBack={onBack}/>
      <div style={{color:T.orange,fontSize:24,fontWeight:'bold',marginBottom:24}}>Simulation</div>
      <Card>
        <div style={{marginBottom:24}}>
          <div style={{color:T.muted,fontSize:13,marginBottom:16}}>Simulierter MedAT-Testtag in Originalreihenfolge. Innerhalb jeder Kategorie kannst du Fragen überspringen und später beantworten. Ergebnisse werden erst am Ende angezeigt.</div>
          <div style={{display:'grid',gap:0}}>
            {PHASES.map((ph,i)=>(
              <div key={ph.id} style={{display:'flex',gap:14,alignItems:'center',padding:'10px 0',borderBottom:i<PHASES.length-1?`1px solid ${T.border}`:'none'}}>
                <span style={{fontSize:20,minWidth:28}}>{ph.icon}</span>
                <div style={{flex:1}}>
                  <span style={{color:ph.color,fontWeight:'bold',fontSize:13}}>{ph.label}</span>
                  <span style={{color:T.muted,fontSize:12,marginLeft:10}}>{ph.id==='allerg_l'?'8 Ausweise lernen':`${ph.n} Fragen`} · {Math.round(ph.secs/60)} Min</span>
                </div>
                <span style={{color:T.muted,fontSize:11}}>{phWeight(ph.id)}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:'flex',gap:12}}>
          <button onClick={()=>{setPhaseIdx(0);setSimPhase('phase_card')}} style={{background:T.orange,border:'none',borderRadius:10,color:'#000',cursor:'pointer',padding:'14px 32px',fontSize:16,fontWeight:'bold'}}>Starten</button>
        </div>
      </Card>
    </div>
  )

  if(simPhase==='phase_card')return<PhaseCard phase={currentPhase} onStart={startPhase} />

  if(simPhase==='results')return<ResultsScreen scores={scores} onBack={onBack}/>

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

  // Figuren
  if(simPhase==='figuren'&&figQuestions.length){
    const q=figQuestions[figCurrent]
    const rots=figRots[figCurrent]||[]
    return(
      <div>
        <PhaseHeader label="Figuren zusammensetzen" color={T.teal} n={15} answers={figAnswers}/>
        <div style={{maxWidth:840,margin:'0 auto',padding:'20px 20px'}}>
          <NavDots questions={figQuestions} answers={figAnswers} current={figCurrent} onGo={setFigCurrent} color={T.teal}/>
          <Card style={{marginBottom:16}}>
            <div style={{color:T.muted,fontSize:13,marginBottom:16}}>Welche Figur ergibt sich aus diesen Teilen?</div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {(q.pieces.normalized||q.pieces.data||[]).map((p,i)=>(
                <div key={i} style={{background:T.surf2,border:`1px solid ${T.border}`,borderRadius:10}}>
                  <FigPieceTile data={p} rotation={rots[i]||0} idx={i}/>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            {q.opts.map((o,i)=>{
              const myAns=figAnswers[figCurrent]
              return<button key={i} onClick={()=>{if(myAns!==null)return;const a=[...figAnswers];a[figCurrent]=i;setFigAnswers(a);for(let j=figCurrent+1;j<figQuestions.length;j++){if(a[j]===null){setFigCurrent(j);return}}for(let j=0;j<figCurrent;j++){if(a[j]===null){setFigCurrent(j);return}}}} style={{display:'flex',alignItems:'center',gap:14,width:'100%',background:myAns===i?`${T.teal}22`:T.surf2,border:`1px solid ${myAns===i?T.teal:T.border}`,borderRadius:10,color:T.text,cursor:myAns===null?'pointer':'default',padding:'10px 16px',fontSize:14,marginBottom:8,transition:'all 0.15s'}}>
                <span style={{color:T.yellow,fontWeight:'bold',minWidth:22}}>{OPTS[i]}</span>
                {o.shape?(<><FigAnswerSVG shape={o.shape} size={56}/><span>{o.shape.label}</span></>):<span style={{color:T.muted}}>Keine der Figuren ist richtig.</span>}
                {myAns===i&&<span style={{color:T.teal,marginLeft:'auto'}}>✓</span>}
              </button>
            })}
            <div style={{color:T.muted,fontSize:11,marginTop:8}}>← → blättern · A S D F G antworten</div>
          </Card>
        </div>
      </div>
    )
  }

  // Zahlenfolgen
  if(simPhase==='zahlen'&&zahlenQuestions.length){
    const q=zahlenQuestions[zahlenCurrent]
    return(
      <div>
        <PhaseHeader label="Zahlenfolgen" color={T.blue} n={10} answers={zahlenAnswers}/>
        <div style={{maxWidth:800,margin:'0 auto',padding:'20px 20px'}}>
          <NavDots questions={zahlenQuestions} answers={zahlenAnswers} current={zahlenCurrent} onGo={setZahlenCurrent} color={T.blue}/>
          <Card style={{marginBottom:16}}>
            <div style={{color:T.muted,fontSize:13,marginBottom:16}}>Welche zwei Zahlen kommen als 8. und 9. Stelle?</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {q.visible.map((v,i)=><div key={i} style={{minWidth:56,padding:'12px 8px',background:T.surf2,border:`1px solid ${T.border}`,borderRadius:8,textAlign:'center',fontSize:20,fontWeight:'bold',color:T.text}}>{v}</div>)}
              {[0,1].map(i=><div key={`q${i}`} style={{minWidth:56,padding:'12px 8px',background:`${T.yellow}18`,border:`1px solid ${T.yellow}`,borderRadius:8,textAlign:'center',fontSize:20,fontWeight:'bold',color:T.yellow}}>?</div>)}
            </div>
          </Card>
          <Card>
            {q.choices.map((c,i)=>{
              const myAns=zahlenAnswers[zahlenCurrent]
              return<button key={i} onClick={()=>{if(myAns!==null)return;const a=[...zahlenAnswers];a[zahlenCurrent]=i;setZahlenAnswers(a);for(let j=zahlenCurrent+1;j<zahlenQuestions.length;j++){if(a[j]===null){setZahlenCurrent(j);return}}for(let j=0;j<zahlenCurrent;j++){if(a[j]===null){setZahlenCurrent(j);return}}}} style={{display:'flex',alignItems:'flex-start',gap:12,width:'100%',background:myAns===i?`${T.blue}22`:T.surf2,border:`1px solid ${myAns===i?T.blue:T.border}`,borderRadius:10,color:T.text,cursor:myAns===null?'pointer':'default',padding:'12px 16px',fontSize:14,textAlign:'left',marginBottom:8,transition:'all 0.15s'}}>
                <span style={{color:T.yellow,minWidth:22,fontWeight:'bold',flexShrink:0}}>{OPTS[i]}</span>
                <span>{c==='keine'?'Keine Option ist richtig.':Array.isArray(c)?`${c[0]}  ,  ${c[1]}`:c}</span>
                {myAns===i&&<span style={{color:T.blue,marginLeft:'auto'}}>✓</span>}
              </button>
            })}
            <div style={{color:T.muted,fontSize:11,marginTop:8}}>← → blättern · A S D F G antworten</div>
          </Card>
        </div>
      </div>
    )
  }

  // Wortflüssigkeit
  if(simPhase==='wort'&&wortQuestions.length){
    const q=wortQuestions[wortCurrent]
    const vok=q.display.filter(l=>'AEIOU'.includes(l));const kons=q.display.filter(l=>!'AEIOU'.includes(l))
    return(
      <div>
        <PhaseHeader label="Wortflüssigkeit" color={T.mauve} n={15} answers={wortAnswers}/>
        <div style={{maxWidth:680,margin:'0 auto',padding:'20px 20px'}}>
          <NavDots questions={wortQuestions} answers={wortAnswers} current={wortCurrent} onGo={setWortCurrent} color={T.mauve}/>
          <Card style={{marginBottom:16}}>
            <div style={{color:T.muted,fontSize:13,marginBottom:16}}>Was ist der Anfangsbuchstabe des Wortes?</div>
            <div style={{letterSpacing:10,fontSize:32,fontWeight:'bold',color:T.yellow,textAlign:'center',padding:'20px 0',background:T.surf2,borderRadius:10}}>{q.display.join('  ')}</div>
          </Card>
          <Card>
            {q.opts.map((o,i)=>{
              const myAns=wortAnswers[wortCurrent]
              return<button key={i} onClick={()=>{if(myAns!==null)return;const a=[...wortAnswers];a[wortCurrent]=i;setWortAnswers(a);for(let j=wortCurrent+1;j<wortQuestions.length;j++){if(a[j]===null){setWortCurrent(j);return}}for(let j=0;j<wortCurrent;j++){if(a[j]===null){setWortCurrent(j);return}}}} style={{display:'flex',alignItems:'flex-start',gap:12,width:'100%',background:myAns===i?`${T.mauve}22`:T.surf2,border:`1px solid ${myAns===i?T.mauve:T.border}`,borderRadius:10,color:T.text,cursor:myAns===null?'pointer':'default',padding:'12px 16px',fontSize:14,textAlign:'left',marginBottom:8,transition:'all 0.15s'}}>
                <span style={{color:T.yellow,minWidth:22,fontWeight:'bold',flexShrink:0}}>{OPTS[i]}</span>
                <span>{o==='keine'?'Keine Option ist richtig.':o}</span>
                {myAns===i&&<span style={{color:T.mauve,marginLeft:'auto'}}>✓</span>}
              </button>
            })}
            <div style={{color:T.muted,fontSize:11,marginTop:8}}>← → blättern · A S D F G antworten</div>
          </Card>
        </div>
      </div>
    )
  }

  // Allergieausweise quiz
  if(simPhase==='allerg_q'&&allergQuestions.length){
    const q=allergQuestions[allergCurrent]
    return(
      <div>
        <PhaseHeader label="Allergieausweise Abfrage" color={T.green} n={25} answers={allergAnswers}/>
        <div style={{maxWidth:720,margin:'0 auto',padding:'20px 20px'}}>
          <NavDots questions={allergQuestions} answers={allergAnswers} current={allergCurrent} onGo={setAllergCurrent} color={T.green}/>
          <Card style={{marginBottom:16}}>
            {q.showAvatar&&<div style={{display:'flex',justifyContent:'center',marginBottom:16}}><div style={{background:T.surf2,borderRadius:16,padding:8,overflow:'hidden',width:116,height:116,display:'flex',alignItems:'center',justifyContent:'center'}}><Avatar card={q.card} size={100}/></div></div>}
            <div style={{fontSize:17,color:T.text,marginBottom:8}}>{q.question}</div>
            {!q.showAvatar&&<div style={{display:'flex',gap:10,marginTop:8}}><div style={{background:T.surf2,borderRadius:8,padding:4,overflow:'hidden',width:52,height:52,display:'flex',alignItems:'center',justifyContent:'center'}}><Avatar card={q.card} size={48}/></div><div style={{color:T.muted,fontSize:13,alignSelf:'center'}}>Person: <span style={{color:T.text}}>{q.card.name}</span></div></div>}
          </Card>
          <Card>
            {q.opts.map((o,i)=>{
              const myAns=allergAnswers[allergCurrent]
              return<button key={i} onClick={()=>{if(myAns!==null)return;const a=[...allergAnswers];a[allergCurrent]=i;setAllergAnswers(a);for(let j=allergCurrent+1;j<allergQuestions.length;j++){if(a[j]===null){setAllergCurrent(j);return}}for(let j=0;j<allergCurrent;j++){if(a[j]===null){setAllergCurrent(j);return}}}} style={{display:'flex',alignItems:'flex-start',gap:12,width:'100%',background:myAns===i?`${T.green}22`:T.surf2,border:`1px solid ${myAns===i?T.green:T.border}`,borderRadius:10,color:T.text,cursor:myAns===null?'pointer':'default',padding:'12px 16px',fontSize:14,textAlign:'left',marginBottom:8,transition:'all 0.15s'}}>
                <span style={{color:T.yellow,minWidth:22,fontWeight:'bold',flexShrink:0}}>{OPTS[i]}</span>
                <span>{o==='keine'?'Keine Option ist richtig.':o}</span>
                {myAns===i&&<span style={{color:T.green,marginLeft:'auto'}}>✓</span>}
              </button>
            })}
            <div style={{color:T.muted,fontSize:11,marginTop:8}}>← → blättern · A S D F G antworten</div>
          </Card>
        </div>
      </div>
    )
  }

  // Implikationen
  if(simPhase==='impl'&&implQuestions.length){
    const q=implQuestions[implCurrent]
    return(
      <div>
        <PhaseHeader label="Implikationen erkennen" color={T.yellow} n={10} answers={implAnswers}/>
        <div style={{maxWidth:720,margin:'0 auto',padding:'20px 20px'}}>
          <NavDots questions={implQuestions} answers={implAnswers} current={implCurrent} onGo={setImplCurrent} color={T.yellow}/>
          <Card style={{marginBottom:16}}>
            <div style={{color:T.muted,fontSize:13,marginBottom:16}}>Welche Schlussfolgerung ist logisch korrekt?</div>
            {[q.p1,q.p2].map((p,i)=>(
              <div key={i} style={{display:'flex',gap:12,background:T.surf2,borderRadius:10,padding:'14px 18px',borderLeft:`3px solid ${T.yellow}`,marginBottom:10}}>
                <span style={{color:T.yellow,fontWeight:'bold',minWidth:20}}>{i+1}.</span>
                <span style={{color:T.text,fontSize:16}}>{p}</span>
              </div>
            ))}
          </Card>
          <Card>
            {q.options.map((o,i)=>{
              const myAns=implAnswers[implCurrent]
              return<button key={i} onClick={()=>{if(myAns!==null)return;const a=[...implAnswers];a[implCurrent]=i;setImplAnswers(a);for(let j=implCurrent+1;j<implQuestions.length;j++){if(a[j]===null){setImplCurrent(j);return}}for(let j=0;j<implCurrent;j++){if(a[j]===null){setImplCurrent(j);return}}}} style={{display:'flex',alignItems:'flex-start',gap:12,width:'100%',background:myAns===i?`${T.yellow}22`:T.surf2,border:`1px solid ${myAns===i?T.yellow:T.border}`,borderRadius:10,color:T.text,cursor:myAns===null?'pointer':'default',padding:'12px 16px',fontSize:14,textAlign:'left',marginBottom:8,transition:'all 0.15s'}}>
                <span style={{color:T.yellow,minWidth:22,fontWeight:'bold',flexShrink:0}}>{OPTS[i]}</span>
                <span>{o}</span>
                {myAns===i&&<span style={{color:T.yellow,marginLeft:'auto'}}>✓</span>}
              </button>
            })}
            <div style={{color:T.muted,fontSize:11,marginTop:8}}>← → blättern · A S D F G antworten</div>
          </Card>
        </div>
      </div>
    )
  }

  return<div style={{padding:40,color:T.muted,textAlign:'center'}}>Laden…</div>
}
