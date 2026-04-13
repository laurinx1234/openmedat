import { useState, useEffect, useCallback } from 'react'
import { T } from '../theme.js'
import { Card, BackBtn, ProgressBar, TimerBadge, OptionBtn, ResultScreen, KeyHint, useTimer, useSettingsKeyboard, rnd, pick, shuffle, OPTS, KEYS } from '../components/Shared.jsx'

const safe=s=>s.every(x=>x>-999999&&x<999999)
const ch=arr=>arr[Math.floor(Math.random()*arr.length)]

function genS1(){for(let _=0;_<50;_++){const a=rnd(10,60),d=rnd(-20,-3),r=ch([2,3]);const s=[a];for(let i=0;i<8;i++)s.push(i%2===0?s[s.length-1]+d:s[s.length-1]*r);if(safe(s))return{seq:s,label:`Alt. ${d>0?'+':''}${d} / ×${r}`}}return genS6()}
function genS2(){for(let _=0;_<50;_++){const a=rnd(10,50),r1=rnd(2,8),r2=rnd(-15,-3),i1=rnd(3,8),i2=rnd(-3,-1);const s=[a];for(let i=0;i<8;i++)s.push(i%2===0?s[s.length-1]+r1+Math.floor(i/2)*i1:s[s.length-1]+r2+Math.floor(i/2)*i2);if(safe(s))return{seq:s,label:`Wechselnde Raten, R1 +${i1} je Schritt`}}return genS3()}
function genS3(){for(let _=0;_<50;_++){const a=rnd(5,30),d=rnd(4,12),x=rnd(1,4);const s=[a];let diff=d,ok=true;for(let i=0;i<8;i++){s.push(s[s.length-1]+diff);diff=diff+x*Math.pow(2,i);if(diff>500){ok=false;break}}if(ok&&s.length===9&&safe(s))return{seq:s,label:`Inception: Δ=${d}, ${d+x}, ${d+3*x}, ...`}}const a=rnd(5,20),diffs=[2,4,6,10,16,26,42,68],s=[a];for(let i=0;i<8;i++)s.push(s[i]+diffs[i]);return{seq:s,label:'Steigende Differenzen'}}
function genS4(){for(let _=0;_<100;_++){const a=ch([16,24,32,48,64,80]),add=ch([8,12,16,20]);const s=[a];let ok=true;for(let i=0;i<8;i++){const last=s[s.length-1],op=i%3;if(op===0){if(last%2!==0){ok=false;break};s.push(last/2)}else if(op===1)s.push(last*4);else s.push(last+add)}if(ok&&safe(s))return{seq:s,label:`3er-Zyklus: ÷2, ×4, +${add}`}}return genS6()}
function genS6(){const a=rnd(1,15),b=rnd(1,15),s=[a,b];while(s.length<9)s.push(s[s.length-1]+s[s.length-2]);return{seq:s,label:'Fibonacci: Zₙ = Zₙ₋₁ + Zₙ₋₂'}}
function genS8(){const a=rnd(1,8),b=rnd(1,8),c=rnd(1,8),s=[a,b,c];while(s.length<9)s.push(s[s.length-1]+s[s.length-2]+s[s.length-3]);return safe(s)?{seq:s,label:'Fib³: Zₙ = Zₙ₋₁ + Zₙ₋₂ + Zₙ₋₃'}:genS6()}
function genS10(){const a=rnd(5,20),r1=rnd(1,5),r2=rnd(3,9);const s=[a,a+r1],diffs=[r1,r2];while(s.length<9){const nd=diffs[diffs.length-1]+diffs[diffs.length-2];diffs.push(nd);s.push(s[s.length-1]+nd)}return safe(s)?{seq:s,label:`Fibonacci der Differenzen: ${r1}, ${r2}, ${r1+r2}, ...`}:genS6()}
function genS11(){for(let _=0;_<50;_++){const a1=rnd(5,40),a2=rnd(2,15),d=rnd(3,10),r=ch([2,3]);const s=[];for(let i=0;i<5;i++){s.push(a1+i*d);s.push(a2*Math.pow(r,i))}const s9=s.slice(0,9);if(safe(s9))return{seq:s9,label:`2er-Sprung: Folge A +${d} / Folge B ×${r}`}}return genS6()}
function genS13(){for(let _=0;_<50;_++){const z1=rnd(2,20),z2=rnd(2,20),z3=rnd(2,15),m=ch([3,4,5,6]),a=rnd(3,15);const s=[z1,z2,z3,0,0,0,0,0,0];s[3]=s[0]*m;s[4]=s[1]+a;s[5]=s[2]*m;s[6]=s[3]+a;s[7]=s[4]*m;s[8]=s[5]+a;if(safe(s))return{seq:s,label:`3er-Sprung: ×${m} / +${a}`}}return genS6()}
function genS15(){for(let _=0;_<50;_++){const sub=ch([2,4,6,8]),a=rnd(3,15);const s=[a];for(let i=0;i<8;i++)s.push(s[s.length-1]*2-sub);if(safe(s))return{seq:s,label:`Je Schritt: ×2 dann −${sub}`}}return genS6()}
function genS20(){for(let _=0;_<50;_++){const z1=rnd(2,10),r1=rnd(2,6),r2=ch([2,3]);const s=[z1];s.push(s[0]+r1);s.push(s[0]+s[1]);s.push(s[2]*r2);s.push(s[3]+r1);s.push(s[3]+s[4]);s.push(s[5]*r2);s.push(s[6]+r1);s.push(s[6]+s[7]);if(safe(s))return{seq:s,label:`3er-Zyklus: +${r1}, Fibonacci-Summe, ×${r2}`}}return genS6()}
function genS25(){for(let _=0;_<100;_++){const sub=ch([2,4,6]),add=ch([2,4,6]),a=ch([8,10,12,14,16,18,20,24,28,32]);const s=[a];let ok=true;for(let i=0;i<8;i++){const last=s[s.length-1],op=['sub','mul','add','div'][i%4];if(op==='sub')s.push(last-sub);else if(op==='mul')s.push(last*2);else if(op==='add')s.push(last+add);else{if(last%2!==0){ok=false;break};s.push(last/2)}}if(ok&&safe(s))return{seq:s,label:`4er-Zyklus: −${sub}, ×2, +${add}, ÷2`}}return genS6()}
function genS26(){for(let _=0;_<50;_++){const a=rnd(1,10),b=rnd(1,10),c=rnd(1,10),d=rnd(1,10),s=[a,b,c,d];while(s.length<9)s.push(s[s.length-2]+s[s.length-4]);if(safe(s))return{seq:s,label:'Zₙ = Zₙ₋₂ + Zₙ₋₄'}}return genS6()}

const GENS=[genS1,genS2,genS3,genS4,genS6,genS8,genS10,genS11,genS13,genS15,genS20,genS25,genS26]
function plausOff(v){const m=Math.max(1,Math.abs(v));if(m<20)return ch([-6,-5,-4,-3,-2,-1,1,2,3,4,5,6]);if(m<100)return ch([-15,-12,-10,-8,-6,-5,5,6,8,10,12,15]);return ch([-40,-30,-20,-15,-10,10,15,20,30,40])}
function makeChoices(a1,a2,inject){const correct=`${a1}|${a2}`,used=new Set([correct]);const tryPair=(f1,f2)=>{for(let _=0;_<200;_++){const v1=f1!==null?f1:a1+plausOff(a1),v2=f2!==null?f2:a2+plausOff(a2),k=`${v1}|${v2}`;if(!used.has(k)){used.add(k);return[v1,v2]}}return null};const dist=[tryPair(a1,null),tryPair(null,a2),tryPair(null,null)].filter(Boolean);while(dist.length<(inject?4:3)){const p=tryPair(null,null);if(p)dist.push(p)};const vis=inject?dist.slice(0,4):[...dist.slice(0,3),[a1,a2]];return[...shuffle(vis),'keine']}

export function makeTask(){const{seq,label}=ch(GENS)();const[a1,a2]=[seq[7],seq[8]];const inject=Math.random()<0.20;const choices=makeChoices(a1,a2,inject);const ci=inject?4:choices.findIndex(c=>Array.isArray(c)&&c[0]===a1&&c[1]===a2);return{visible:seq.slice(0,7),answer:[a1,a2],choices,correctIdx:ci,label}}

function ScoreBar({score,total,color}){const pct=total>0?Math.round(score/total*100):0;return<span style={{color,fontSize:14}}>{score}/{total} <span style={{color:T.muted}}>({pct}%)</span></span>}

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
        {showFb&&(
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
