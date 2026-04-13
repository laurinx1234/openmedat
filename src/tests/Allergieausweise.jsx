import { useState, useEffect, useCallback } from 'react'
import { T } from '../theme.js'
import { Card, BackBtn, ProgressBar, TimerBadge, OptionBtn, ResultScreen, KeyHint, useTimer, useSettingsKeyboard, rnd, pick, shuffle, OPTS, KEYS } from '../components/Shared.jsx'
import { setSession, getSession, clearSession, isQuizReady } from '../allergStore.js'
import { navigate } from '../router.js'

// ─── Data ─────────────────────────────────────────────────────────────────────
const LAENDER=["Österreich","Deutschland","Schweiz","Frankreich","Italien","Spanien","Portugal","Schweden","Norwegen","Finnland","Dänemark","Polen","Tschechien","Ungarn","Rumänien","Kroatien","Serbien","Slowenien","Slowakei","Bulgarien","Griechenland","Türkei","Russland","Ukraine","Litauen","Lettland","Estland","Georgien","Armenien","Japan","China","Indien","Pakistan","Iran","Irak","Israel","Ägypten","Marokko","Tunesien","Kenia","Südafrika","Nigeria","Brasilien","Argentinien","Chile","Peru","Mexiko","Kuba","USA","Kanada","Australien","Neuseeland","Mongolei","Namibia","Jordanien","Senegal","Bolivien","Ecuador","Costa Rica"]
const ALLERGENE=["Erdnüsse","Milch","Eier","Weizen","Soja","Nüsse","Fisch","Krebstiere","Sellerie","Senf","Sesam","Lupinen","Latex","Jod","Penicillin","Ibuprofen","Aspirin","Codein","ASS","Cephalosporine","Tetracycline","Sulfonamide","Metronidazol","Clindamycin","Ciprofloxacin","Amoxicillin","Diclofenac","Morphin","Cortison","Metformin","Heparin","Bienenstiche","Wespen","Katzenhaare","Hundespeichel","Vogelfedern","Hausstaubmilben","Schimmel","Birke","Gräser","Holz","Sand","Kaffee","Schokolade","Gold","Aluminium","Plastik","Beton","Farbe","Leder","Wolle","Papier","Parfüm","Sonnenlicht","Mondlicht","Salzwasser","Delfine","Schnee","Gummi"]
const BLUTGRUPPEN=["A+","A-","B+","B-","AB+","AB-","0+","0-"]
const SYLLABLES=["BA","BE","BI","BO","BU","DA","DE","DI","DO","GA","GE","GI","GO","HA","HE","HI","HO","KA","KE","KI","KO","LA","LE","LI","LO","MA","ME","MI","MO","MU","NA","NE","NI","NO","PA","PE","PI","PO","RA","RE","RI","RO","RU","SA","SE","SI","SO","TA","TE","TI","TO","VA","VE","VI","VO","ZA","ZI","ZO","WA","FI","FO","RU"]
const ENDINGS=["","N","T","K","S","L","R","M","X","N"]
const MONTHS=["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"]
const DAYS=[31,28,31,30,31,30,31,31,30,31,30,31]
const SKINS=['#FDDCB0','#F0C27F','#D4A574','#C68642','#8D5524']
const HAIRS=['#1A1A1A','#3D2B1F','#8B6347','#C19A6B','#F0E0A0','#A52A2A','#808080','#2C4A7C']

function genName(used){for(let _=0;_<300;_++){const n=rnd(1,2);let nm='';for(let i=0;i<n;i++)nm+=pick(SYLLABLES);nm+=pick(ENDINGS);if(nm.length>=3&&!used.has(nm)){used.add(nm);return nm}}return`P${Math.random().toString(36).slice(2,6).toUpperCase()}`}
function genBirthday(){const m=rnd(0,11);return`${rnd(1,DAYS[m])}. ${MONTHS[m]}`}

export function genCardPool(){
  const usedNames=new Set()
  const combos=[];for(const sk of shuffle([...SKINS]))for(const hr of shuffle([...HAIRS]))for(const gl of[true,false])combos.push({skin:sk,hair:hr,glasses:gl});shuffle(combos)
  return Array.from({length:8},(_,i)=>({
    name:genName(usedNames),geburtstag:genBirthday(),
    medikamente:Math.random()>0.5?'Ja':'Nein',blutgruppe:pick(BLUTGRUPPEN),
    allergien:shuffle([...ALLERGENE]).slice(0,rnd(1,3)).join(', '),
    ausweisnummer:String(rnd(10000,99999)),land:pick(LAENDER),
    photoUrl:null,...combos[i],
  }))
}

export async function fetchPhotos(count=8){
  try{
    const res=await fetch(`https://randomuser.me/api/?results=${count}&inc=picture&noinfo`)
    if(!res.ok)throw new Error()
    const{results}=await res.json()
    return results.map(u=>u.picture.large)
  }catch{return Array.from({length:count},(_,i)=>`https://i.pravatar.cc/150?img=${i+10}`)}
}

function Avatar({card,size=80}){
  const[err,setErr]=useState(false)
  if(card.photoUrl&&!err)return<img src={card.photoUrl} width={size} height={size} alt={card.name} style={{borderRadius:'50%',objectFit:'cover',objectPosition:'center top',display:'block'}} onError={()=>setErr(true)}/>
  const{skin,hair,glasses}=card
  return<svg width={size} height={size} viewBox="0 0 80 80" style={{display:'block'}}>
    <ellipse cx="40" cy="26" rx="24" ry="22" fill={hair}/>
    <rect x="32" y="62" width="16" height="14" rx="4" fill={skin}/>
    <ellipse cx="40" cy="44" rx="21" ry="26" fill={skin}/>
    <ellipse cx="40" cy="22" rx="22" ry="16" fill={skin}/>
    <ellipse cx="16" cy="44" rx="6" ry="14" fill={hair}/>
    <ellipse cx="64" cy="44" rx="6" ry="14" fill={hair}/>
    <ellipse cx="40" cy="14" rx="21" ry="14" fill={hair}/>
    <ellipse cx="29" cy="40" rx="6" ry="4" fill="white"/>
    <ellipse cx="51" cy="40" rx="6" ry="4" fill="white"/>
    <circle cx="29" cy="40" r="2.5" fill="#222"/>
    <circle cx="51" cy="40" r="2.5" fill="#222"/>
    <path d="M37 50 Q40 53 43 50" fill="none" stroke="#b07050" strokeWidth="1.2"/>
    <path d="M33 57 Q40 62 47 57" fill="none" stroke="#8B4E4E" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M24 35 Q29 33 34 35" fill="none" stroke={hair} strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M46 35 Q51 33 56 35" fill="none" stroke={hair} strokeWidth="1.8" strokeLinecap="round"/>
    {glasses&&<><rect x="22" y="36" width="14" height="10" rx="4" fill="none" stroke="#666" strokeWidth="1.5"/><rect x="44" y="36" width="14" height="10" rx="4" fill="none" stroke="#666" strokeWidth="1.5"/><line x1="36" y1="41" x2="44" y2="41" stroke="#666" strokeWidth="1.5"/><line x1="8" y1="41" x2="22" y2="41" stroke="#666" strokeWidth="1.2"/><line x1="58" y1="41" x2="72" y2="41" stroke="#666" strokeWidth="1.2"/></>}
  </svg>
}

export function AusweisCard({card}){
  return<div style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:12,padding:14,width:'100%'}}>
    <div style={{display:'flex',gap:12,marginBottom:10}}>
      <div style={{background:T.surf2,borderRadius:12,padding:4,flexShrink:0,overflow:'hidden',width:74,height:74,display:'flex',alignItems:'center',justifyContent:'center'}}><Avatar card={card} size={70}/></div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{color:T.green,fontWeight:'bold',fontSize:17,marginBottom:4}}>{card.name}</div>
        <div style={{color:T.muted,fontSize:10,letterSpacing:1}}>ALLERGIEAUSWEIS</div>
      </div>
    </div>
    <div style={{display:'grid',gap:3}}>
      {[['Geburtstag',card.geburtstag],['Medikamenteneinnahme',card.medikamente],['Blutgruppe',card.blutgruppe],['Allergien',card.allergien],['Ausweis-Nr.',card.ausweisnummer],['Ausstellungsland',card.land]].map(([k,v])=>(
        <div key={k} style={{display:'flex',gap:8,fontSize:12}}><span style={{color:T.muted,minWidth:130,flexShrink:0}}>{k}:</span><span style={{color:T.text,wordBreak:'break-word'}}>{v}</span></div>
      ))}
    </div>
  </div>
}

const Q_TYPES=[
  {label:(c)=>`Was ist die Ausweisnummer von ${c.name}?`,correct:(c)=>c.ausweisnummer,pool:(cs)=>cs.map(c=>c.ausweisnummer),av:false},
  {label:(c)=>`Welche Blutgruppe hat ${c.name}?`,correct:(c)=>c.blutgruppe,pool:()=>BLUTGRUPPEN,av:false},
  {label:(c)=>`Welche Allergien hat ${c.name}?`,correct:(c)=>c.allergien,pool:(cs)=>cs.map(c=>c.allergien),av:false},
  {label:(c)=>`Wann hat ${c.name} Geburtstag?`,correct:(c)=>c.geburtstag,pool:(cs)=>cs.map(c=>c.geburtstag),av:false},
  {label:(c)=>`Aus welchem Land stammt der Ausweis von ${c.name}?`,correct:(c)=>c.land,pool:()=>LAENDER,av:false},
  {label:(c)=>`Nimmt ${c.name} Medikamente ein?`,correct:(c)=>c.medikamente,pool:()=>['Ja','Nein'],av:false},
  {label:(c)=>`Wie lautet der Name zu Ausweis-Nr. ${c.ausweisnummer}?`,correct:(c)=>c.name,pool:(cs)=>cs.map(c=>c.name),av:false},
  {label:()=>`Welche Allergien hat diese Person?`,correct:(c)=>c.allergien,pool:(cs)=>cs.map(c=>c.allergien),av:true},
  {label:()=>`Welche Blutgruppe hat diese Person?`,correct:(c)=>c.blutgruppe,pool:()=>BLUTGRUPPEN,av:true},
  {label:()=>`Wie heißt diese Person?`,correct:(c)=>c.name,pool:(cs)=>cs.map(c=>c.name),av:true},
  {label:()=>`Aus welchem Land stammt der Ausweis dieser Person?`,correct:(c)=>c.land,pool:()=>LAENDER,av:true},
  {label:()=>`Wann hat diese Person Geburtstag?`,correct:(c)=>c.geburtstag,pool:(cs)=>cs.map(c=>c.geburtstag),av:true},
  {label:()=>`Nimmt diese Person Medikamente ein?`,correct:(c)=>c.medikamente,pool:()=>['Ja','Nein'],av:true},
]

export function makeQuestion(shown,all){
  const card=pick(shown);const qt=pick(Q_TYPES)
  const correct=qt.correct(card)
  const pool=[...new Set(qt.pool(all))].filter(v=>v!==correct)
  const wrongs=shuffle(pool).slice(0,3).concat(Array(3).fill('–')).slice(0,3)
  const injectNone=Math.random()<0.05
  let opts,ci
  if(injectNone){opts=[...shuffle(pool).slice(0,4),'keine'];ci=4}
  else{opts=[...shuffle([correct,...wrongs]),'keine'];ci=opts.indexOf(correct)}
  return{question:qt.label(card),opts,correctIdx:ci,card,showAvatar:qt.av}
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Allergieausweise({onBack}){
  const[phase,setPhase]=useState(()=>{
    // If there's a pending quiz session, check if it's ready
    const s=getSession()
    if(s&&isQuizReady())return'quiz_pending'
    return'settings'
  })
  const[settings,setSettings]=useState({cardCount:4,quizDelayMin:15,qCount:10})
  const[allCards,setAllCards]=useState([])
  const[shownCards,setShownCards]=useState([])
  const[learnTimer,resetLearn]=useTimer(0)
  const[questions,setQuestions]=useState([])
  const[qIdx,setQIdx]=useState(0)
  const[selected,setSelected]=useState(null)
  const[score,setScore]=useState(0)
  const[done,setDone]=useState(false)

  // If quiz pending on mount, load it
  useEffect(()=>{
    if(phase==='quiz_pending'){
      const s=getSession()
      if(s){
        const qs=Array.from({length:s.qCount},()=>makeQuestion(s.shownCards,s.allCards))
        setQuestions(qs);setQIdx(0);setSelected(null);setScore(0);setDone(false)
        setPhase('quiz')
      }
    }
  },[])

  async function startLearn(){
    setPhase('loading')
    const pool=genCardPool()
    const photos=await fetchPhotos(8)
    photos.forEach((url,i)=>{if(i<pool.length)pool[i].photoUrl=url})
    setAllCards(pool)
    const shown=pool.slice(0,settings.cardCount)
    setShownCards(shown)
    resetLearn(settings.cardCount*60)  // 1 min per card
    setPhase('learn')
  }

  // When learn timer ends: store session, go back to home
  useEffect(()=>{
    if(phase!=='learn'||learnTimer>0)return
    // Store session for later quiz
    setSession({
      shownCards,
      allCards,
      qCount:settings.qCount,
      quizReadyAt:Date.now()+settings.quizDelayMin*60*1000,
    })
    setPhase('learn_done')
  },[learnTimer,phase])

  // Keyboard: Escape in learn phase goes back early (cancels session)
  useEffect(()=>{
    if(phase!=='learn')return
    const h=e=>{
      if(e.key==='Escape'){
        setSession({shownCards,allCards,qCount:settings.qCount,quizReadyAt:Date.now()+settings.quizDelayMin*60*1000})
        setPhase('learn_done')
      }
    }
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)
  },[phase,shownCards,allCards,settings])

  function startQuiz(){
    const qs=Array.from({length:settings.qCount},()=>makeQuestion(shownCards,allCards))
    setQuestions(qs);setQIdx(0);setSelected(null);setScore(0);setDone(false)
    setPhase('quiz')
  }

  function startQuizFromStore(){
    const s=getSession()
    if(!s)return
    const qs=Array.from({length:s.qCount},()=>makeQuestion(s.shownCards,s.allCards))
    setQuestions(qs);setQIdx(0);setSelected(null);setScore(0);setDone(false)
    setPhase('quiz')
  }

  const answer=useCallback((i)=>{
    if(selected!==null||done)return
    setSelected(i);if(i===questions[qIdx].correctIdx)setScore(s=>s+1)
    setTimeout(()=>{if(qIdx+1>=questions.length){clearSession();setDone(true)}else{setQIdx(x=>x+1);setSelected(null)}},1000)
  },[selected,done,qIdx,questions])

  useEffect(()=>{
    if(phase!=='quiz')return
    const h=e=>{
      if(e.key==='Escape'){clearSession();setPhase('settings');return}
      const i=KEYS.indexOf(e.key.toLowerCase());if(i>=0&&i<5)answer(i)
    }
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)
  },[answer,phase])

  // Settings keyboard
  const skGroupDefs=[
    [{v:2},{v:3},{v:4},{v:5},{v:6},{v:7},{v:8}].map(()=>({action:()=>{}})).map((o,i)=>({action:()=>setSettings(s=>({...s,cardCount:[2,3,4,5,6,7,8][i]}))})),
    [5,10,15,20,25,30,35,40,45,50,55,60].map((v,i)=>({action:()=>setSettings(s=>({...s,quizDelayMin:v}))})),
    [5,10,15,20,25].map((v)=>({action:()=>setSettings(s=>({...s,qCount:v}))})),
  ]
  const{isFocused:skF,isStartFocused:skS}=useSettingsKeyboard(skGroupDefs,startLearn,onBack,phase==='settings')

  // ── Settings ──
  if(phase==='settings'){
    const existingSession=getSession()
    return(
      <div style={{maxWidth:680,margin:'0 auto',padding:'24px 20px'}}>
        <BackBtn onBack={onBack}/>
        <div style={{color:T.green,fontSize:24,fontWeight:'bold',marginBottom:24}}>Allergieausweise</div>
        {existingSession&&(
          <div style={{background:`${T.green}18`,border:`1px solid ${T.green}`,borderRadius:12,padding:'16px 20px',marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{color:T.green,fontWeight:'bold',marginBottom:4}}>Laufende Merkphase</div>
              <div style={{color:T.muted,fontSize:13}}>Die Zeit läuft. Quiz startet {isQuizReady()?'jetzt':'nach der Merkzeit'}.</div>
            </div>
            <button onClick={startQuizFromStore} style={{background:T.green,border:'none',borderRadius:8,color:'#000',cursor:'pointer',padding:'10px 20px',fontSize:14,fontWeight:'bold'}}>Quiz starten</button>
          </div>
        )}
        <Card>
          {[
            {label:'Anzahl Ausweise',key:'cardCount',opts:[{v:2,l:'2'},{v:3,l:'3'},{v:4,l:'4'},{v:5,l:'5'},{v:6,l:'6'},{v:7,l:'7'},{v:8,l:'8'}],row:0},
            {label:`Abfragezeit (${settings.cardCount} Min Lernzeit + Wartezeit)`,key:'quizDelayMin',opts:[5,10,15,20,25,30,35,40,45,50,55,60].map(v=>({v,l:v+'m'})),row:1},
            {label:'Anzahl Fragen',key:'qCount',opts:[{v:5,l:'5'},{v:10,l:'10'},{v:15,l:'15'},{v:20,l:'20'},{v:25,l:'25'}],row:2},
          ].map(({label,key,opts,row})=>(
            <div key={key} style={{marginBottom:20}}>
              <div style={{color:T.muted,fontSize:13,marginBottom:8}}>{label}:</div>
              {key==='cardCount'&&<div style={{color:T.muted,fontSize:11,marginBottom:6}}>Lernzeit: {settings.cardCount} Min (1 Min / Ausweis)</div>}
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {opts.map((o,i)=>(<button key={o.v} onClick={()=>setSettings(s=>({...s,[key]:o.v}))} style={{background:settings[key]===o.v?`${T.green}22`:T.surf2,border:`1px solid ${settings[key]===o.v?T.green:T.border}`,borderRadius:8,color:settings[key]===o.v?T.green:T.text,cursor:'pointer',padding:'8px 14px',fontSize:13,boxShadow:skF(row,i)?`0 0 0 2px ${T.green}`:'none'}}>{o.l}</button>))}
              </div>
            </div>
          ))}
          <button onClick={startLearn} style={{background:T.green,border:'none',borderRadius:10,color:'#000',cursor:'pointer',padding:'14px 32px',fontSize:16,fontWeight:'bold',marginTop:8,boxShadow:skS()?`0 0 0 3px ${T.green}88`:'none'}}>Fotos laden & starten</button>
          <div style={{color:T.muted,fontSize:11,marginTop:12}}>← → Auswahl · ↑↓ Zeile · Enter bestätigen · Esc zurück</div>
        </Card>
      </div>
    )
  }

  // ── Loading ──
  if(phase==='loading')return(
    <div style={{maxWidth:480,margin:'120px auto',padding:'24px 20px',textAlign:'center'}}>
      <div style={{fontSize:40,marginBottom:20}}>⏳</div>
      <div style={{color:T.text,fontSize:18,marginBottom:8}}>Fotos werden geladen…</div>
      <style>{`@keyframes pulse{from{opacity:0.2}to{opacity:1}}`}</style>
      <div style={{marginTop:24,display:'flex',justifyContent:'center',gap:6}}>
        {[0,1,2].map(i=>(<div key={i} style={{width:8,height:8,borderRadius:'50%',background:T.green,animation:`pulse ${0.8+i*0.2}s ease-in-out infinite alternate`,animationDelay:`${i*0.2}s`}}/>))}
      </div>
    </div>
  )

  // ── Learn ──
  if(phase==='learn')return(
    <div style={{maxWidth:900,margin:'0 auto',padding:'24px 20px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <button onClick={()=>{setSession({shownCards,allCards,qCount:settings.qCount,quizReadyAt:Date.now()+settings.quizDelayMin*60*1000});setPhase('learn_done')}} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,color:T.muted,cursor:'pointer',padding:'6px 14px',fontSize:13}}>Fertig →</button>
          <div style={{color:T.green,fontSize:20,fontWeight:'bold'}}>Ausweise merken</div>
        </div>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <span style={{color:T.muted,fontSize:13}}>Abfrage in {settings.quizDelayMin} Min</span>
          <TimerBadge seconds={learnTimer}/>
        </div>
      </div>
      <div style={{background:T.surf2,borderRadius:6,height:6,marginBottom:24}}><div style={{height:'100%',background:T.green,borderRadius:6,width:`${(learnTimer/(settings.cardCount*60))*100}%`,transition:'width 1s linear'}}/></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16}}>
        {shownCards.map((c,i)=><AusweisCard key={i} card={c}/>)}
      </div>
      <div style={{color:T.muted,fontSize:12,marginTop:16,textAlign:'center'}}>Esc oder "Fertig" → Quiz-Timer starten, andere Übungen machen</div>
    </div>
  )

  // ── Learn done: go elsewhere, come back for quiz ──
  if(phase==='learn_done'){
    const s=getSession()
    const ready=isQuizReady()
    return(
      <div style={{maxWidth:600,margin:'80px auto',padding:'24px 20px',textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16}}>⏱️</div>
        <div style={{color:T.green,fontSize:24,fontWeight:'bold',marginBottom:8}}>Merkphase abgeschlossen</div>
        {ready?(
          <>
            <div style={{color:T.text,fontSize:16,marginBottom:32}}>Die Abfragezeit ist abgelaufen. Jetzt Quiz starten!</div>
            <button onClick={startQuiz} style={{background:T.green,border:'none',borderRadius:12,color:'#000',cursor:'pointer',padding:'16px 40px',fontSize:18,fontWeight:'bold',marginBottom:16,display:'block',width:'100%'}}>Quiz starten</button>
          </>
        ):(
          <>
            <div style={{color:T.text,fontSize:15,marginBottom:8}}>Du hast noch Zeit. Mach andere Übungen und komm zurück!</div>
            <div style={{color:T.muted,fontSize:13,marginBottom:32}}>Quiz wird nach {settings.quizDelayMin} Minuten Abfragezeit freigeschaltet.</div>
            <button onClick={()=>navigate('/')} style={{background:T.surf2,border:`1px solid ${T.border}`,borderRadius:12,color:T.text,cursor:'pointer',padding:'14px 32px',fontSize:16,marginBottom:12,display:'block',width:'100%'}}>← Andere Übungen machen</button>
            {isQuizReady()&&<button onClick={startQuiz} style={{background:T.green,border:'none',borderRadius:12,color:'#000',cursor:'pointer',padding:'14px 32px',fontSize:16,fontWeight:'bold',display:'block',width:'100%'}}>Quiz starten</button>}
          </>
        )}
        <useQuizReadyCheck onReady={()=>setPhase('learn_done')}/>
      </div>
    )
  }

  // ── Done ──
  if(done)return(
    <div style={{maxWidth:680,margin:'0 auto',padding:'24px 20px'}}>
      <BackBtn onBack={()=>{clearSession();onBack()}}/>
      <ResultScreen correct={score} total={questions.length} onRetry={()=>{clearSession();setPhase('settings')}} onBack={()=>{clearSession();onBack()}}/>
    </div>
  )

  // ── Quiz ──
  const q=questions[qIdx];if(!q)return null
  const getState=i=>selected===null?'idle':i===q.correctIdx?'correct':i===selected?'wrong':'idle'
  return(
    <div style={{maxWidth:720,margin:'0 auto',padding:'24px 20px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <button onClick={()=>{clearSession();setPhase('settings')}} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,color:T.muted,cursor:'pointer',padding:'6px 14px',fontSize:13}}>← Zurück</button>
          <div style={{color:T.green,fontSize:20,fontWeight:'bold'}}>Abfrage</div>
        </div>
        <span style={{color:T.muted,fontSize:14}}>{qIdx+1} / {questions.length}</span>
      </div>
      <ProgressBar current={qIdx+1} total={questions.length} color={T.green}/>
      <Card style={{marginBottom:16}}>
        {q.showAvatar&&<div style={{display:'flex',justifyContent:'center',marginBottom:16}}><div style={{background:T.surf2,borderRadius:16,padding:8,overflow:'hidden',width:116,height:116,display:'flex',alignItems:'center',justifyContent:'center'}}><Avatar card={q.card} size={100}/></div></div>}
        <div style={{fontSize:17,color:T.text,marginBottom:q.showAvatar?0:8}}>{q.question}</div>
        {!q.showAvatar&&<div style={{display:'flex',gap:10,marginTop:10}}><div style={{background:T.surf2,borderRadius:8,padding:4,overflow:'hidden',width:52,height:52,display:'flex',alignItems:'center',justifyContent:'center'}}><Avatar card={q.card} size={48}/></div><div style={{color:T.muted,fontSize:13,alignSelf:'center'}}>Person: <span style={{color:T.text}}>{q.card.name}</span></div></div>}
      </Card>
      <Card>
        {q.opts.map((o,i)=>(<OptionBtn key={i} label={OPTS[i]} state={getState(i)} onClick={()=>answer(i)} text={o==='keine'?'Keine Option ist richtig.':o}/>))}
        <KeyHint/>
      </Card>
    </div>
  )
}

// Helper: polls every 10s to re-render learn_done when quiz becomes ready
function useQuizReadyCheck({onReady}){
  useEffect(()=>{
    const id=setInterval(()=>{ if(isQuizReady()) onReady() },10000)
    return()=>clearInterval(id)
  },[])
  return null
}
