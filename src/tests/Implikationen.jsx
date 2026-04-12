import { useState, useEffect, useCallback } from 'react'
import { T } from '../theme.js'
import { Card, BackBtn, ProgressBar, TimerBadge, OptionBtn, ResultScreen, KeyHint, useTimer, useSettingsKeyboard, rnd, pick, shuffle, OPTS, KEYS } from '../components/Shared.jsx'

const NOUNS=["Hunde","Katzen","Vögel","Fische","Elefanten","Löwen","Bären","Wölfe","Pferde","Schlangen","Adler","Delphine","Krokodile","Papageien","Tiger","Gorillas","Flamingos","Pinguine","Wale","Haie","Ärzte","Lehrer","Kinder","Studenten","Soldaten","Musiker","Maler","Sportler","Künstler","Richter","Chirurgen","Ingenieure","Bankräuber","Pianisten","Tänzer","Sänger","Wissenschaftler","Autos","Bücher","Bäume","Steine","Pflanzen","Roboter","Maschinen","Schiffe","Flugzeuge","Computer","Pilze","Algen","Bakterien","Insekten","Reptilien","Lebewesen","Objekte","Kristalle","Planeten","Rosen","Tulpen","Orchideen","Kakteen","Farne","Korallen","Häuser","Türme","Burgen","Kathedralen","Pyramiden","Brücken","Gauner","Einbrecher","Detektive","Spione","Piraten","Ritter","Zauberer","Drachen"]

const VALID_MODI=[
  {name:'Barbara',   p1:(s,m,c)=>`Alle ${m} sind ${c}.`,          p2:(s,m,c)=>`Alle ${s} sind ${m}.`,               concl:'alle',         w:4},
  {name:'Celarent',  p1:(s,m,c)=>`Alle ${m} sind keine ${c}.`,    p2:(s,m,c)=>`Alle ${s} sind ${m}.`,               concl:'kein',         w:4},
  {name:'Darii',     p1:(s,m,c)=>`Alle ${m} sind ${c}.`,          p2:(s,m,c)=>`Einige ${s} sind ${m}.`,             concl:'einige',       w:4},
  {name:'Ferio',     p1:(s,m,c)=>`Alle ${m} sind keine ${c}.`,    p2:(s,m,c)=>`Einige ${s} sind ${m}.`,             concl:'einige_nicht', w:4},
  {name:'Cesare',    p1:(s,m,c)=>`Alle ${c} sind keine ${m}.`,    p2:(s,m,c)=>`Alle ${s} sind ${m}.`,               concl:'kein',         w:3},
  {name:'Camestres', p1:(s,m,c)=>`Alle ${c} sind ${m}.`,          p2:(s,m,c)=>`Alle ${s} sind keine ${m}.`,         concl:'kein',         w:3},
  {name:'Festino',   p1:(s,m,c)=>`Alle ${c} sind keine ${m}.`,    p2:(s,m,c)=>`Einige ${s} sind ${m}.`,             concl:'einige_nicht', w:3},
  {name:'Baroco',    p1:(s,m,c)=>`Alle ${c} sind ${m}.`,          p2:(s,m,c)=>`Einige ${s} sind keine ${m}.`,       concl:'einige_nicht', w:3},
  {name:'Darapti',   p1:(s,m,c)=>`Alle ${m} sind ${c}.`,          p2:(s,m,c)=>`Alle ${m} sind ${s}.`,               concl:'einige',       w:3},
  {name:'Felapton',  p1:(s,m,c)=>`Alle ${m} sind keine ${c}.`,    p2:(s,m,c)=>`Alle ${m} sind ${s}.`,               concl:'einige_nicht', w:3},
  {name:'Disamis',   p1:(s,m,c)=>`Einige ${m} sind ${c}.`,        p2:(s,m,c)=>`Alle ${m} sind ${s}.`,               concl:'einige',       w:3},
  {name:'Datisi',    p1:(s,m,c)=>`Alle ${m} sind ${c}.`,          p2:(s,m,c)=>`Einige ${m} sind ${s}.`,             concl:'einige',       w:3},
  {name:'Bocardo',   p1:(s,m,c)=>`Einige ${m} sind keine ${c}.`,  p2:(s,m,c)=>`Alle ${m} sind ${s}.`,               concl:'einige_nicht', w:3},
  {name:'Ferison',   p1:(s,m,c)=>`Alle ${m} sind keine ${c}.`,    p2:(s,m,c)=>`Einige ${m} sind ${s}.`,             concl:'einige_nicht', w:3},
  {name:'Bramantip', p1:(s,m,c)=>`Alle ${c} sind ${m}.`,          p2:(s,m,c)=>`Alle ${m} sind ${s}.`,               concl:'einige',       w:3},
  {name:'Camenes',   p1:(s,m,c)=>`Alle ${c} sind ${m}.`,          p2:(s,m,c)=>`Alle ${m} sind keine ${s}.`,         concl:'kein',         w:3},
  {name:'Dimaris',   p1:(s,m,c)=>`Einige ${c} sind ${m}.`,        p2:(s,m,c)=>`Alle ${m} sind ${s}.`,               concl:'einige',       w:3},
  {name:'Fesapo',    p1:(s,m,c)=>`Alle ${c} sind keine ${m}.`,    p2:(s,m,c)=>`Alle ${m} sind ${s}.`,               concl:'einige_nicht', w:3},
  {name:'Fresison',  p1:(s,m,c)=>`Alle ${c} sind keine ${m}.`,    p2:(s,m,c)=>`Einige ${m} sind ${s}.`,             concl:'einige_nicht', w:3},
]
const INVALID_MODI=[
  {name:'Undistributed Middle A', p1:(s,m,c)=>`Einige ${m} sind ${c}.`,     p2:(s,m,c)=>`Alle ${s} sind ${m}.`,          w:4},
  {name:'Undistributed Middle B', p1:(s,m,c)=>`Einige ${m} sind ${c}.`,     p2:(s,m,c)=>`Einige ${s} sind ${m}.`,        w:4},
  {name:'Illicit Major',          p1:(s,m,c)=>`Alle ${m} sind ${c}.`,        p2:(s,m,c)=>`Alle ${s} sind keine ${m}.`,    w:4},
  {name:'Negative Premises',      p1:(s,m,c)=>`Alle ${m} sind keine ${c}.`, p2:(s,m,c)=>`Alle ${s} sind keine ${m}.`,    w:3},
  {name:'Weak Fig3',              p1:(s,m,c)=>`Einige ${m} sind ${c}.`,     p2:(s,m,c)=>`Einige ${m} sind ${s}.`,        w:3},
  {name:'Invalid Fig2',           p1:(s,m,c)=>`Einige ${c} sind ${m}.`,     p2:(s,m,c)=>`Alle ${s} sind ${m}.`,          w:3},
  {name:'Weak Affirmative',       p1:(s,m,c)=>`Alle ${m} sind ${c}.`,        p2:(s,m,c)=>`Einige ${s} sind keine ${m}.`,  w:3},
  {name:'Weak Fig4',              p1:(s,m,c)=>`Einige ${c} sind ${m}.`,     p2:(s,m,c)=>`Einige ${m} sind ${s}.`,        w:3},
]

function wPick(items){const tot=items.reduce((s,i)=>s+i.w,0);let r=Math.random()*tot;for(const it of items){r-=it.w;if(r<=0)return it}return items[items.length-1]}

export function makeTask(){
  const isValid=Math.random()<0.75
  const pool=shuffle([...NOUNS]);const[S,M,C]=pool
  const mod=wPick(isValid?VALID_MODI:INVALID_MODI)
  const concl=isValid?mod.concl:'keine'
  const options=[`Alle ${S} sind ${C}.`,`Einige ${S} sind ${C}.`,`Alle ${S} sind keine ${C}.`,`Einige ${S} sind keine ${C}.`,'Keine Schlussfolgerung ist richtig.']
  return{p1:mod.p1(S,M,C),p2:mod.p2(S,M,C),S,C,options,correctIdx:{alle:0,einige:1,kein:2,einige_nicht:3,keine:4}[concl],modusName:isValid?mod.name:`Ungültig (${mod.name})`}
}

function ScoreBar({score,total,color}){const pct=total>0?Math.round(score/total*100):0;return<span style={{color,fontSize:14}}>{score}/{total} <span style={{color:T.muted}}>({pct}%)</span></span>}

export default function Implikationen({onBack}){
  const[mode,setMode]=useState('settings')
  const[count,setCount]=useState(10)
  const[question,setQuestion]=useState(null)
  const[selected,setSelected]=useState(null)
  const[score,setScore]=useState(0)
  const[total,setTotal]=useState(0)
  const[remaining,setRemaining]=useState(0)
  const[showFb,setShowFb]=useState(false)
  const[fbReady,setFbReady]=useState(false)
  const[done,setDone]=useState(false)
  const[gameTimer,resetGame]=useTimer(0)
  const endless=count===0

  function startGame(){setQuestion(makeTask());setScore(0);setTotal(0);setSelected(null);setShowFb(false);setDone(false);setRemaining(count);resetGame(endless?99999:count*60);setMode('game')}
  useEffect(()=>{if(mode==='game'&&!endless&&gameTimer<=0&&!showFb&&question)setDone(true)},[gameTimer,mode,endless,showFb,question])

  function answer(i){
    if(selected!==null||showFb)return
    setSelected(i);if(i===question.correctIdx)setScore(s=>s+1);setTotal(t=>t+1)
    setTimeout(()=>{setShowFb(true);setTimeout(()=>setFbReady(true),250)},50)
  }
  function nextQ(){
    setFbReady(false);setShowFb(false);setSelected(null)
    const rem=remaining-1
    if(!endless&&rem<=0){setDone(true);return}
    setRemaining(rem);setQuestion(makeTask())
  }
  useEffect(()=>{if(!fbReady)return;const h=()=>nextQ();window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[fbReady,remaining,endless])
  useEffect(()=>{if(showFb)return;const h=e=>{const i=KEYS.indexOf(e.key.toLowerCase());if(i>=0&&i<5)answer(i)};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[answer,showFb])

  const skRows=[
    [{action:()=>setCount(10)},{action:()=>setCount(0)}],
  ]
  const{isFocused:skF,isStartFocused:skS}=useSettingsKeyboard(skRows,startGame,onBack,mode==='settings')
  if(mode==='settings')return(
    <div style={{maxWidth:680,margin:'0 auto',padding:'24px 20px'}}>
      <BackBtn onBack={onBack}/>
      <div style={{color:T.yellow,fontSize:24,fontWeight:'bold',marginBottom:24}}>Implikationen erkennen</div>
      <Card>
        <div style={{marginBottom:24}}>
          <div style={{color:T.muted,fontSize:13,marginBottom:10}}>Anzahl Aufgaben:</div>
          <div style={{display:'flex',gap:8}}>
            {[{v:10,l:'10  (10 Min)'},{v:0,l:'∞  Endlosmodus'}].map((o,i)=>(
              <button key={o.v} onClick={()=>setCount(o.v)} style={{background:count===o.v?`${T.yellow}25`:T.surf2,border:`1px solid ${count===o.v?T.yellow:T.border}`,borderRadius:8,color:count===o.v?T.yellow:T.text,cursor:'pointer',padding:'8px 18px',fontSize:14,boxShadow:skF(0,i)?`0 0 0 2px ${T.yellow}`:'none'}}>{o.l}</button>
            ))}
          </div>
        </div>
        <button onClick={startGame} style={{background:T.yellow,border:'none',borderRadius:10,color:'#000',cursor:'pointer',padding:'14px 32px',fontSize:16,fontWeight:'bold',boxShadow:skS()?`0 0 0 3px ${T.yellow}88`:'none'}}>Starten</button>
        <div style={{color:T.muted,fontSize:11,marginTop:12}}>← → Auswahl · ↑↓ Zeile · Enter bestätigen · Esc zurück</div>
      </Card>
    </div>
  )
  if(done)return(<div style={{maxWidth:680,margin:'0 auto',padding:'24px 20px'}}><BackBtn onBack={onBack}/><ResultScreen correct={score} total={total} onRetry={()=>setMode('settings')} onBack={onBack}/></div>)
  const q=question;if(!q)return null
  const getState=i=>selected===null?'idle':i===q.correctIdx?'correct':i===selected?'wrong':'idle'
  return(
    <div style={{maxWidth:720,margin:'0 auto',padding:'24px 20px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{display:'flex',gap:16,alignItems:'center'}}>
          <button onClick={()=>endless?setDone(true):setMode('settings')} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,color:T.muted,cursor:'pointer',padding:'6px 14px',fontSize:13}}>← Zurück</button>
          <div style={{color:T.yellow,fontSize:18,fontWeight:'bold'}}>Implikationen erkennen</div>
        </div>
        <div style={{display:'flex',gap:16,alignItems:'center'}}>
          <ScoreBar score={score} total={total} color={T.yellow}/>
          {!endless?<TimerBadge seconds={gameTimer}/>:<span style={{color:T.muted,fontSize:13}}>∞</span>}
        </div>
      </div>
      {!endless&&<ProgressBar current={count-remaining+1} total={count} color={T.yellow}/>}
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
        {q.options.map((o,i)=>(<OptionBtn key={i} label={OPTS[i]} state={getState(i)} onClick={()=>answer(i)} text={o}/>))}
        {!showFb&&<KeyHint/>}
        {showFb&&(
          <div style={{marginTop:16,background:T.surf2,borderRadius:10,padding:'14px 18px'}}>
            <div style={{color:T.muted,fontSize:12,marginBottom:4}}>Lösungsmodus: <span style={{color:T.text}}>{q.modusName}</span></div>
            <div style={{color:T.muted,fontSize:12,marginBottom:10}}>Richtige Antwort: <span style={{color:T.green,fontWeight:'bold'}}>{q.options[q.correctIdx]}</span></div>
            <button onClick={nextQ} style={{background:T.yellow,border:'none',borderRadius:8,color:'#000',cursor:'pointer',padding:'8px 20px',fontSize:14,fontWeight:'bold'}}>Weiter → <span style={{opacity:0.6,fontSize:12}}>(beliebige Taste)</span></button>
          </div>
        )}
      </Card>
    </div>
  )
}
