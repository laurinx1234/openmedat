import { useState, useEffect, useCallback } from 'react'
import { T } from '../theme.js'
import { Card, BackBtn, ProgressBar, TimerBadge, OptionBtn, ResultScreen, KeyHint, useTimer, useSettingsKeyboard, rnd, pick, shuffle, OPTS, KEYS } from '../components/Shared.jsx'
import { UNIQUE_WORDS } from '../data/words.js'

const ALPHA='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export function makeTask(){
  const word=pick(UNIQUE_WORDS);const letters=word.split('');const correct=word[0]
  const inWord=[...new Set(letters)];const others=inWord.filter(l=>l!==correct)
  const display=shuffle([...letters]);const injectNone=Math.random()<0.15
  let opts,correctIdx
  if(injectNone){
    const pool=shuffle(others.length>=4?others:[...others,...shuffle(ALPHA.filter(l=>l!==correct)).slice(0,4-others.length)])
    opts=pool.slice(0,4);correctIdx=4
  } else {
    const pool=shuffle(others.length>=3?others:[...others,...shuffle(ALPHA.filter(l=>!inWord.includes(l))).slice(0,3-others.length)])
    opts=shuffle([...pool.slice(0,3),correct]);correctIdx=opts.indexOf(correct)
  }
  return{word,display,opts:[...opts,'keine'],correctIdx}
}

function ScoreBar({score,total,color}){const pct=total>0?Math.round(score/total*100):0;return<span style={{color,fontSize:14}}>{score}/{total} <span style={{color:T.muted}}>({pct}%)</span></span>}

function Buchstabenwolke({letters}){
  const n=letters.length
  return(
    <div style={{position:'relative',height:190,background:T.surf2,borderRadius:12,overflow:'hidden',userSelect:'none'}}>
      {letters.map((l,i)=>{
        const phi=i*2.399963  // goldener Winkel ≈ 137.5°
        const r=14+(i+0.5)/n*38
        const x=Math.max(6,Math.min(94, 50+r*Math.cos(phi)))
        const y=Math.max(8,Math.min(92, 50+r*0.55*Math.sin(phi)))
        const fs=[28,22,26,20,24][i%5]
        const col=[T.yellow,T.text,T.mauve,T.yellow,T.text][i%5]
        return<div key={i} style={{position:'absolute',left:`${x}%`,top:`${y}%`,transform:'translate(-50%,-50%)',fontSize:fs,fontWeight:'bold',color:col,lineHeight:1}}>{l}</div>
      })}
    </div>
  )
}

export default function Wortfluessigkeit({onBack}){
  const[mode,setMode]=useState('settings')
  const[count,setCount]=useState(15)
  const[displayMode,setDisplayMode]=useState('gemischt')
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

  function startGame(){setQuestion(makeTask());setScore(0);setTotal(0);setSelected(null);setShowFb(false);setDone(false);setRemaining(count);resetGame(endless?99999:count*80);setMode('game')}
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
  useEffect(()=>{if(showFb)return;const h=e=>{if(e.key==='Escape'){endless?setDone(true):setMode('settings');return}const i=KEYS.indexOf(e.key.toLowerCase());if(i>=0&&i<5)answer(i)};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[answer,showFb])

  const skRows=[
    [{action:()=>setCount(15)},{action:()=>setCount(0)}],
    [{action:()=>setDisplayMode('gemischt')},{action:()=>setDisplayMode('getrennt')},{action:()=>setDisplayMode('wolke')}],
  ]
  const{isFocused:skF,isStartFocused:skS}=useSettingsKeyboard(skRows,startGame,onBack,mode==='settings')
  if(mode==='settings')return(
    <div style={{maxWidth:680,margin:'0 auto',padding:'24px 20px'}}>
      <BackBtn onBack={onBack}/>
      <div style={{color:T.mauve,fontSize:24,fontWeight:'bold',marginBottom:24}}>Wortflüssigkeit</div>
      <Card>
        <div style={{marginBottom:20}}>
          <div style={{color:T.muted,fontSize:13,marginBottom:10}}>Anzahl Aufgaben:</div>
          <div style={{display:'flex',gap:8}}>
            {[{v:15,l:'15  (20 Min)'},{v:0,l:'∞  Endlosmodus'}].map((o,i)=>(
              <button key={o.v} onClick={()=>setCount(o.v)} style={{background:count===o.v?`${T.mauve}25`:T.surf2,border:`1px solid ${count===o.v?T.mauve:T.border}`,borderRadius:8,color:count===o.v?T.mauve:T.text,cursor:'pointer',padding:'8px 18px',fontSize:14,boxShadow:skF(0,i)?`0 0 0 2px ${T.mauve}`:'none'}}>{o.l}</button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:24}}>
          <div style={{color:T.muted,fontSize:13,marginBottom:10}}>Darstellungsmodus:</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {[{v:'gemischt',l:'Gemischt'},{v:'getrennt',l:'Vokale / Konsonanten'},{v:'wolke',l:'Buchstabenwolke'}].map((o,i)=>(
              <button key={o.v} onClick={()=>setDisplayMode(o.v)} style={{background:displayMode===o.v?`${T.mauve}25`:T.surf2,border:`1px solid ${displayMode===o.v?T.mauve:T.border}`,borderRadius:8,color:displayMode===o.v?T.mauve:T.text,cursor:'pointer',padding:'8px 18px',fontSize:14,boxShadow:skF(1,i)?`0 0 0 2px ${T.mauve}`:'none'}}>{o.l}</button>
            ))}
          </div>
        </div>
        <button onClick={startGame} style={{background:T.mauve,border:'none',borderRadius:10,color:'#000',cursor:'pointer',padding:'14px 32px',fontSize:16,fontWeight:'bold',boxShadow:skS()?`0 0 0 3px ${T.mauve}88`:'none'}}>Starten</button>
        <div style={{color:T.muted,fontSize:11,marginTop:12}}>← → Auswahl · ↑↓ Zeile · Enter bestätigen · Esc zurück</div>
      </Card>
    </div>
  )
  if(done)return(<div style={{maxWidth:680,margin:'0 auto',padding:'24px 20px'}}><BackBtn onBack={onBack}/><ResultScreen correct={score} total={total} onRetry={()=>setMode('settings')} onBack={onBack}/></div>)
  const q=question;if(!q)return null
  const getState=i=>selected===null?'idle':i===q.correctIdx?'correct':i===selected?'wrong':'idle'
  const vok=q.display.filter(l=>'AEIOU'.includes(l));const kons=q.display.filter(l=>!'AEIOU'.includes(l))
  return(
    <div style={{maxWidth:680,margin:'0 auto',padding:'24px 20px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{display:'flex',gap:16,alignItems:'center'}}>
          <button onClick={()=>endless?setDone(true):setMode('settings')} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,color:T.muted,cursor:'pointer',padding:'6px 14px',fontSize:13}}>← Zurück</button>
          <div style={{color:T.mauve,fontSize:18,fontWeight:'bold'}}>Wortflüssigkeit</div>
        </div>
        <div style={{display:'flex',gap:16,alignItems:'center'}}>
          <ScoreBar score={score} total={total} color={T.mauve}/>
          {!endless?<TimerBadge seconds={gameTimer}/>:<span style={{color:T.muted,fontSize:13}}>∞</span>}
        </div>
      </div>
      {!endless&&<ProgressBar current={count-remaining+1} total={count} color={T.mauve}/>}
      <Card style={{marginBottom:16}}>
        <div style={{color:T.muted,fontSize:13,marginBottom:16}}>Was ist der Anfangsbuchstabe des Wortes?</div>
        {displayMode==='gemischt'&&<div style={{letterSpacing:10,fontSize:32,fontWeight:'bold',color:T.yellow,textAlign:'center',padding:'20px 0',background:T.surf2,borderRadius:10}}>{q.display.join('  ')}</div>}
        {displayMode==='getrennt'&&<div style={{display:'flex',gap:16}}>
          <div style={{flex:1,background:T.surf2,borderRadius:10,padding:'16px',textAlign:'center'}}>
            <div style={{color:T.muted,fontSize:11,letterSpacing:2,marginBottom:8}}>VOKALE</div>
            <div style={{fontSize:24,fontWeight:'bold',color:T.teal,letterSpacing:8}}>{vok.length?vok.join('  '):'–'}</div>
          </div>
          <div style={{flex:1,background:T.surf2,borderRadius:10,padding:'16px',textAlign:'center'}}>
            <div style={{color:T.muted,fontSize:11,letterSpacing:2,marginBottom:8}}>KONSONANTEN</div>
            <div style={{fontSize:24,fontWeight:'bold',color:T.orange,letterSpacing:8}}>{kons.length?kons.join('  '):'–'}</div>
          </div>
        </div>}
        {displayMode==='wolke'&&<Buchstabenwolke letters={q.display}/>}
      </Card>
      <Card>
        <div style={{color:T.muted,fontSize:13,marginBottom:12}}>Welcher Buchstabe steht am Anfang?</div>
        {q.opts.map((o,i)=>(<OptionBtn key={i} label={OPTS[i]} state={getState(i)} onClick={()=>answer(i)} text={o==='keine'?'Keine Option ist richtig.':o}/>))}
        {!showFb&&<KeyHint/>}
        {showFb&&(
          <div style={{marginTop:16,background:T.surf2,borderRadius:10,padding:'14px 18px'}}>
            <div style={{color:T.muted,fontSize:12,marginBottom:6}}>Das Wort war: <span style={{color:T.yellow,fontWeight:'bold',letterSpacing:2}}>{q.word}</span></div>
            <div style={{color:T.muted,fontSize:12,marginBottom:10}}>Anfangsbuchstabe: <span style={{color:T.green,fontWeight:'bold',fontSize:18}}>{q.word[0]}</span></div>
            <button onClick={nextQ} style={{background:T.mauve,border:'none',borderRadius:8,color:'#000',cursor:'pointer',padding:'8px 20px',fontSize:14,fontWeight:'bold'}}>Weiter → <span style={{opacity:0.6,fontSize:12}}>(beliebige Taste)</span></button>
          </div>
        )}
      </Card>
    </div>
  )
}
