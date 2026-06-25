import { useState, useEffect, useRef } from 'react'
import { T } from '../theme.js'
import { Card, BackBtn, ProgressBar, TimerBadge, OptionBtn, ResultScreen, KeyHint, ScoreBar, useTimer, useSettingsKeyboard, OPTS, KEYS, saveStat } from '../components/Shared.jsx'
import { makeTask } from '../data/gens/index.js'
export { makeTask }

export default function Zahlenfolgen({onBack}){
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

  function startGame(){setQuestion(makeTask());setScore(0);setTotal(0);setSelected(null);setShowFb(false);setDone(false);setRemaining(count);resetGame(endless?99999:count*90);setMode('game')}
  useEffect(()=>{if(mode==='game'&&!endless&&gameTimer<=0&&!showFb&&question)setDone(true)},[gameTimer,mode,endless,showFb,question])
  useEffect(()=>{if(done&&!endless)saveStat('zahlenfolgen',score,total)},[done,endless,score,total])

  const advanceRef = useRef(null)

  function answer(i){
    if(selected!==null||showFb)return
    setSelected(i);if(i===question.correctIdx)setScore(s=>s+1);setTotal(t=>t+1)
    if(endless) setTimeout(()=>{setShowFb(true);setTimeout(()=>setFbReady(true),250)},50)
    else advanceRef.current = setTimeout(()=>nextQ(),300)
  }
  function nextQ(){
    setFbReady(false);setShowFb(false);setSelected(null)
    const rem=remaining-1
    if(!endless&&rem<=0){setDone(true);return}
    setRemaining(rem);setQuestion(makeTask())
  }
  useEffect(()=>{if(!fbReady)return;const h=()=>nextQ();window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[fbReady,remaining,endless])
  useEffect(()=>{if(showFb)return;const h=e=>{if(e.key==='Escape'){endless?setDone(true):setMode('settings');return}if(!endless&&selected!==null){clearTimeout(advanceRef.current);nextQ();return}const i=KEYS.indexOf(e.key.toLowerCase());if(i>=0&&i<5)answer(i)};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[answer,showFb,selected,endless])

  const skRows=[
    [{action:()=>setCount(10)},{action:()=>setCount(0)}],
  ]
  const{isFocused:skF,isStartFocused:skS}=useSettingsKeyboard(skRows,startGame,onBack,mode==='settings')
  if(mode==='settings')return(
    <div style={{maxWidth:680,margin:'0 auto',padding:'24px 20px'}}>
      <BackBtn onBack={onBack}/>
      <div style={{color:T.blue,fontSize:24,fontWeight:'bold',marginBottom:24}}>Zahlenfolgen</div>
      <Card>
        <div style={{marginBottom:24}}>
          <div style={{color:T.muted,fontSize:13,marginBottom:10}}>Anzahl Aufgaben:</div>
          <div style={{display:'flex',gap:8}}>
            {[{v:10,l:'10  (15 Min)'},{v:0,l:'∞  Endlosmodus'}].map((o,i)=>(
              <button key={o.v} onClick={()=>setCount(o.v)} style={{background:count===o.v?`${T.blue}25`:T.surf2,border:`1px solid ${count===o.v?T.blue:T.border}`,borderRadius:8,color:count===o.v?T.blue:T.text,cursor:'pointer',padding:'8px 18px',fontSize:14,boxShadow:skF(0,i)?`0 0 0 2px ${T.blue}`:'none'}}>{o.l}</button>
            ))}
          </div>
        </div>
        <button onClick={startGame} style={{background:T.blue,border:'none',borderRadius:10,color:'#000',cursor:'pointer',padding:'14px 32px',fontSize:16,fontWeight:'bold',boxShadow:skS()?`0 0 0 3px ${T.blue}88`:'none'}}>Starten</button>
        <div style={{color:T.muted,fontSize:11,marginTop:12}}>← → Auswahl · ↑↓ Zeile · Enter bestätigen · Esc zurück</div>
      </Card>
    </div>
  )
  if(done)return(<div style={{maxWidth:680,margin:'0 auto',padding:'24px 20px'}}><BackBtn onBack={onBack}/><ResultScreen correct={score} total={total} onRetry={()=>setMode('settings')} onBack={onBack}/></div>)
  const q=question;if(!q)return null
  const getState=i=>selected===null?'idle':i===q.correctIdx?'correct':i===selected?'wrong':'idle'
  return(
    <div style={{maxWidth:800,margin:'0 auto',padding:'24px 20px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{display:'flex',gap:16,alignItems:'center'}}>
          <button onClick={()=>endless?setDone(true):setMode('settings')} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,color:T.muted,cursor:'pointer',padding:'6px 14px',fontSize:13}}>← Zurück</button>
          <div style={{color:T.blue,fontSize:18,fontWeight:'bold'}}>Zahlenfolgen</div>
        </div>
        <div style={{display:'flex',gap:16,alignItems:'center'}}>
          <ScoreBar score={score} total={total} color={T.blue}/>
          {!endless?<TimerBadge seconds={gameTimer}/>:<span style={{color:T.muted,fontSize:13}}>∞</span>}
        </div>
      </div>
      {!endless&&<ProgressBar current={count-remaining+1} total={count} color={T.blue}/>}
      <Card style={{marginBottom:16}}>
        <div style={{color:T.muted,fontSize:13,marginBottom:16}}>Welche zwei Zahlen kommen als 8. und 9. Stelle?</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
          {q.visible.map((v,i)=>(
            <div key={i} style={{minWidth:56,padding:'12px 8px',background:T.surf2,border:`1px solid ${T.border}`,borderRadius:8,textAlign:'center',fontSize:20,fontWeight:'bold',color:T.text}}>{v}</div>
          ))}
          {[0,1].map(i=>(<div key={`q${i}`} style={{minWidth:56,padding:'12px 8px',background:`${T.yellow}18`,border:`1px solid ${T.yellow}`,borderRadius:8,textAlign:'center',fontSize:20,fontWeight:'bold',color:T.yellow}}>?</div>))}
        </div>
      </Card>
      <Card>
        {q.choices.map((c,i)=>(<OptionBtn key={i} label={OPTS[i]} state={getState(i)} onClick={()=>answer(i)} text={c==='keine'?'Keine Option ist richtig.':`${Array.isArray(c)?c[0]:c}  ,  ${Array.isArray(c)?c[1]:''}`}/>))}
        {!showFb&&<KeyHint/>}
        {showFb&&endless&&(
          <div style={{marginTop:16,background:T.surf2,borderRadius:10,padding:'14px 18px'}}>
            <div style={{color:T.muted,fontSize:12,marginBottom:6}}>Schema: <span style={{color:T.text}}>{q.label}</span></div>
            <div style={{color:T.muted,fontSize:12,marginBottom:10}}>Richtige Antwort: <span style={{color:T.green,fontWeight:'bold'}}>{q.choices[q.correctIdx]==='keine'?'Keine Option ist richtig.':Array.isArray(q.choices[q.correctIdx])?`${q.choices[q.correctIdx][0]} , ${q.choices[q.correctIdx][1]}`:''}</span></div>
            <button onClick={nextQ} style={{background:T.blue,border:'none',borderRadius:8,color:'#000',cursor:'pointer',padding:'8px 20px',fontSize:14,fontWeight:'bold'}}>Weiter → <span style={{opacity:0.6,fontSize:12}}>(beliebige Taste)</span></button>
          </div>
        )}
      </Card>
    </div>
  )
}
