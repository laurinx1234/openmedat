import { useState, useEffect, useCallback, useRef } from 'react'
import { T } from '../theme.js'
import { Card, BackBtn, TimerBadge, OptionBtn, KeyHint, NavDots, useTimer, useSettingsKeyboard, rnd, pick, shuffle, OPTS, KEYS, playBeep } from '../components/Shared.jsx'
import { setSession, getSession, clearSession, isQuizReady } from '../allergStore.js'
import { navigate } from '../router.js'
import { ALLERGENE } from '../data/allergene.js'
import { LAENDER } from '../data/laender.js'
const BLUTGRUPPEN=["A","B","AB","0"]

const MONTHS=["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"]
const DAYS=[31,28,31,30,31,30,31,31,30,31,30,31]

function genName(used){const LEN=rnd(5,7);for(let _=0;_<300;_++){let nm='';for(let i=0;i<LEN;i++)nm+=String.fromCharCode(65+rnd(0,25));if(!used.has(nm)){used.add(nm);return nm}}return Math.random().toString(36).slice(2,2+LEN).toUpperCase()}
function genBirthday(){const m=rnd(0,11);return`${rnd(1,DAYS[m])}. ${MONTHS[m]}`}

export function genCardPool(){
  const usedNames=new Set()
  return Array.from({length:8},(_,i)=>({
    name:genName(usedNames),geburtstag:genBirthday(),
    medikamente:Math.random()>0.5?'Ja':'Nein',blutgruppe:pick(BLUTGRUPPEN),
    allergien:shuffle([...ALLERGENE]).slice(0,rnd(1,3)).join(', '),
    ausweisnummer:String(rnd(10000,99999)),land:pick(LAENDER),
    photoUrl:null,
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

export function AusweisCard({card}){
  return<div style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:12,padding:14,width:'100%'}}>
    <div style={{display:'flex',gap:12,marginBottom:10}}>
      <img src={card.photoUrl} width={70} height={70} alt={card.name} style={{borderRadius:'50%',objectFit:'cover',objectPosition:'center top',flexShrink:0}}/>
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
  // Name → Attribut
  {label:(c)=>`Wie lautet die Ausweisnummer von ${c.name}?`,correct:(c)=>c.ausweisnummer,pool:(cs)=>cs.map(c=>c.ausweisnummer),av:false},
  {label:(c)=>`Welche Blutgruppe hat ${c.name}?`,correct:(c)=>c.blutgruppe,pool:(cs)=>cs.map(c=>c.blutgruppe),av:false},
  {label:(c)=>`Welche Allergie/n hat ${c.name}?`,correct:(c)=>c.allergien,pool:(cs)=>cs.map(c=>c.allergien),av:false},
  {label:(c)=>`Wann hat ${c.name} Geburtstag?`,correct:(c)=>c.geburtstag,pool:(cs)=>cs.map(c=>c.geburtstag),av:false},
  {label:(c)=>`Aus welchem Land stammt der Ausweis von ${c.name}?`,correct:(c)=>c.land,pool:(cs)=>cs.map(c=>c.land),av:false},
  {label:(c)=>`Welche Beschreibung passt am besten zu ${c.name}?`,correct:(c)=>`Blutgruppe: ${c.blutgruppe}, Medikamente: ${c.medikamente}`,pool:(cs)=>cs.map(c=>`Blutgruppe: ${c.blutgruppe}, Medikamente: ${c.medikamente}`),av:false},
  // Ausweis-Nr. → Attribut
  {label:(c)=>`Wie heißt die Person mit der Ausweisnummer ${c.ausweisnummer}?`,correct:(c)=>c.name,pool:(cs)=>cs.map(c=>c.name),av:false},
  {label:(c)=>`In welchem Land wurde Ausweis-Nr. ${c.ausweisnummer} ausgestellt?`,correct:(c)=>c.land,pool:(cs)=>cs.map(c=>c.land),av:false},
  {label:(c)=>`Welche Blutgruppe hat die Person mit Ausweis-Nr. ${c.ausweisnummer}?`,correct:(c)=>c.blutgruppe,pool:(cs)=>cs.map(c=>c.blutgruppe),av:false},
  {label:(c)=>`Welche Allergie/n hat die Person mit Ausweis-Nr. ${c.ausweisnummer}?`,correct:(c)=>c.allergien,pool:(cs)=>cs.map(c=>c.allergien),av:false},
  {label:(c)=>`Welche Beschreibung passt am besten zur Person mit Ausweis-Nr. ${c.ausweisnummer}?`,correct:(c)=>`Blutgruppe: ${c.blutgruppe}, Medikamente: ${c.medikamente}`,pool:(cs)=>cs.map(c=>`Blutgruppe: ${c.blutgruppe}, Medikamente: ${c.medikamente}`),av:false},
  // Geburtstag → Attribut
  {label:(c)=>`Wie heißt die Person, die am ${c.geburtstag} Geburtstag feiert?`,correct:(c)=>c.name,pool:(cs)=>cs.map(c=>c.name),av:false},
  {label:(c)=>`Welche Ausweisnummer hat die Person, die am ${c.geburtstag} Geburtstag feiert?`,correct:(c)=>c.ausweisnummer,pool:(cs)=>cs.map(c=>c.ausweisnummer),av:false},
  {label:(c)=>`Welche Blutgruppe hat die Person, die am ${c.geburtstag} Geburtstag feiert?`,correct:(c)=>c.blutgruppe,pool:(cs)=>cs.map(c=>c.blutgruppe),av:false},
  {label:(c)=>`Welche Allergien hat die Person, die am ${c.geburtstag} Geburtstag feiert?`,correct:(c)=>c.allergien,pool:(cs)=>cs.map(c=>c.allergien),av:false},
  {label:(c)=>`Aus welchem Land stammt der Ausweis der Person, die am ${c.geburtstag} Geburtstag feiert?`,correct:(c)=>c.land,pool:(cs)=>cs.map(c=>c.land),av:false},
  {label:(c)=>`Welche Beschreibung passt am besten zur Person, die am ${c.geburtstag} Geburtstag feiert?`,correct:(c)=>`Blutgruppe: ${c.blutgruppe}, Medikamente: ${c.medikamente}`,pool:(cs)=>cs.map(c=>`Blutgruppe: ${c.blutgruppe}, Medikamente: ${c.medikamente}`),av:false},
  // Allergie → Attribut
  {label:(c)=>`Wie heißt die Person mit der ${c.allergien} Allergie?`,correct:(c)=>c.name,pool:(cs)=>cs.map(c=>c.name),av:false},
  {label:(c)=>`Welche Ausweisnummer hat die Person mit der ${c.allergien} Allergie?`,correct:(c)=>c.ausweisnummer,pool:(cs)=>cs.map(c=>c.ausweisnummer),av:false},
  {label:(c)=>`Welche Blutgruppe hat die Person mit der ${c.allergien} Allergie?`,correct:(c)=>c.blutgruppe,pool:(cs)=>cs.map(c=>c.blutgruppe),av:false},
  {label:(c)=>`Wann hat die Person mit der ${c.allergien} Allergie Geburtstag?`,correct:(c)=>c.geburtstag,pool:(cs)=>cs.map(c=>c.geburtstag),av:false},
  {label:(c)=>`Aus welchem Land stammt der Ausweis der Person mit der ${c.allergien} Allergie?`,correct:(c)=>c.land,pool:(cs)=>cs.map(c=>c.land),av:false},
  {label:(c)=>`Welche Beschreibung passt am besten zur Person mit der ${c.allergien} Allergie?`,correct:(c)=>`Blutgruppe: ${c.blutgruppe}, Medikamente: ${c.medikamente}`,pool:(cs)=>cs.map(c=>`Blutgruppe: ${c.blutgruppe}, Medikamente: ${c.medikamente}`),av:false},
  // Land → Attribut
  {label:(c)=>`Wie heißt die Person, deren Ausweis aus ${c.land} stammt?`,correct:(c)=>c.name,pool:(cs)=>cs.map(c=>c.name),av:false},
  {label:(c)=>`Welche Ausweisnummer hat die Person, deren Ausweis aus ${c.land} stammt?`,correct:(c)=>c.ausweisnummer,pool:(cs)=>cs.map(c=>c.ausweisnummer),av:false},
  {label:(c)=>`Welche Blutgruppe hat die Person, deren Ausweis aus ${c.land} stammt?`,correct:(c)=>c.blutgruppe,pool:(cs)=>cs.map(c=>c.blutgruppe),av:false},
  {label:(c)=>`Welche Allergien hat die Person, deren Ausweis aus ${c.land} stammt?`,correct:(c)=>c.allergien,pool:(cs)=>cs.map(c=>c.allergien),av:false},
  {label:(c)=>`Wann hat die Person Geburtstag, deren Ausweis aus ${c.land} stammt?`,correct:(c)=>c.geburtstag,pool:(cs)=>cs.map(c=>c.geburtstag),av:false},
  {label:(c)=>`Welche Beschreibung passt am besten zur Person, deren Ausweis aus ${c.land} stammt?`,correct:(c)=>`Blutgruppe: ${c.blutgruppe}, Medikamente: ${c.medikamente}`,pool:(cs)=>cs.map(c=>`Blutgruppe: ${c.blutgruppe}, Medikamente: ${c.medikamente}`),av:false},
  // Ausweis-Nr. → Geburtstag
  {label:(c)=>`Wann hat die Person mit der Ausweisnummer ${c.ausweisnummer} Geburtstag?`,correct:(c)=>c.geburtstag,pool:(cs)=>cs.map(c=>c.geburtstag),av:false},
  // Stelle der Ausweisnummer (nur wenn eindeutig)
  {label:(c)=>`Wie heißt die Person mit der Zahl ${c.ausweisnummer[0]} an erster Stelle der Ausweisnummer?`,correct:(c)=>c.name,pool:(cs)=>cs.map(c=>c.name),av:false,check:(c,sh)=>sh.filter(s=>s.ausweisnummer[0]===c.ausweisnummer[0]).length===1},
  {label:(c)=>`Wie heißt die Person mit der Zahl ${c.ausweisnummer[4]} an letzter Stelle der Ausweisnummer?`,correct:(c)=>c.name,pool:(cs)=>cs.map(c=>c.name),av:false,check:(c,sh)=>sh.filter(s=>s.ausweisnummer[4]===c.ausweisnummer[4]).length===1},
  // Foto-Fragen (av:true — kein Name in Frage, kein Name in Anzeige)
  {label:()=>`Welche Allergie/n hat diese Person?`,correct:(c)=>c.allergien,pool:(cs)=>cs.map(c=>c.allergien),av:true},
  {label:()=>`Welche Blutgruppe hat diese Person?`,correct:(c)=>c.blutgruppe,pool:(cs)=>cs.map(c=>c.blutgruppe),av:true},
  {label:()=>`Wie heißt diese Person?`,correct:(c)=>c.name,pool:(cs)=>cs.map(c=>c.name),av:true},
  {label:()=>`Aus welchem Land stammt der Ausweis dieser Person?`,correct:(c)=>c.land,pool:(cs)=>cs.map(c=>c.land),av:true},
  {label:()=>`Wann hat diese Person Geburtstag?`,correct:(c)=>c.geburtstag,pool:(cs)=>cs.map(c=>c.geburtstag),av:true},
  {label:()=>`Wie lautet die Ausweisnummer dieser Person?`,correct:(c)=>c.ausweisnummer,pool:(cs)=>cs.map(c=>c.ausweisnummer),av:true},
  {label:()=>`Welche Beschreibung passt am besten zu dieser Person?`,correct:(c)=>`Blutgruppe: ${c.blutgruppe}, Medikamente: ${c.medikamente}`,pool:(cs)=>cs.map(c=>`Blutgruppe: ${c.blutgruppe}, Medikamente: ${c.medikamente}`),av:true},
]

function tryMultiQuestion(shown){
  const byBG={}
  for(const c of shown)(byBG[c.blutgruppe]=byBG[c.blutgruppe]||[]).push(c)
  const groups=Object.entries(byBG).filter(([,cs])=>cs.length>=2)
  if(!groups.length)return null
  const[bg,matchCards]=pick(groups)
  const useNrs=Math.random()<0.5
  const question=useNrs?`Welche Ausweisnummern haben Personen mit der Blutgruppe ${bg}?`:`Wer hat die Blutgruppe ${bg}?`
  const toVal=c=>useNrs?c.ausweisnummer:c.name
  const correct=matchCards.map(toVal).sort().join(', ')
  const allVals=shown.map(toVal)
  const wrongs=new Set()
  for(let i=0;i<100&&wrongs.size<4;i++){
    const sz=rnd(1,Math.min(shown.length,3))
    const w=shuffle([...allVals]).slice(0,sz).sort().join(', ')
    if(w!==correct)wrongs.add(w)
  }
  if(wrongs.size<3)return null
  const noneCorrect=Math.random()<0.15
  let opts,ci
  if(noneCorrect){
    const ws=[...wrongs].slice(0,4);if(ws.length<4)return null
    opts=[...ws,'keine'];ci=4
  }else{
    const ws=[...wrongs].slice(0,3)
    const sh=shuffle([correct,...ws]);opts=[...sh,'keine'];ci=sh.indexOf(correct)
  }
  return{question,opts,correctIdx:ci,card:pick(matchCards),showAvatar:false}
}

export function makeQuestion(shown,all){
  if(Math.random()<0.25){const mq=tryMultiQuestion(shown);if(mq)return mq}
  for(let _=0;_<40;_++){
    const card=pick(shown);const qt=pick(Q_TYPES)
    if(qt.check&&!qt.check(card,shown))continue
    const correct=qt.correct(card)
    const pool=[...new Set(qt.pool(all))].filter(v=>v!==correct)
    if(pool.length<3)continue
    const noneCorrect=Math.random()<0.15
    let opts,ci
    if(noneCorrect){
      const ws=shuffle([...pool]).slice(0,4);if(ws.length<4)continue
      opts=[...ws,'keine'];ci=4
    }else{
      const ws=shuffle([...pool]).slice(0,3)
      const sh=shuffle([correct,...ws]);opts=[...sh,'keine'];ci=sh.indexOf(correct)
    }
    return{question:qt.label(card),opts,correctIdx:ci,card,showAvatar:qt.av}
  }
  const card=pick(shown);const correct=card.blutgruppe
  const ws=shuffle(BLUTGRUPPEN.filter(v=>v!==correct)).slice(0,3)
  const sh=shuffle([correct,...ws])
  return{question:`Welche Blutgruppe hat ${card.name}?`,opts:[...sh,'keine'],correctIdx:sh.indexOf(correct),card,showAvatar:false}
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Allergieausweise({onBack}){
  const[phase,setPhase]=useState(()=>{
    // If there's a pending quiz session, check if it's ready
    const s=getSession()
    if(s&&isQuizReady())return'quiz_pending'
    return'settings'
  })
  const[settings,setSettings]=useState({cardCount:8,learnMin:8,quizDelayMin:35,qCount:25})
  const[allCards,setAllCards]=useState([])
  const[shownCards,setShownCards]=useState([])
  const[learnTimer,resetLearn]=useTimer(0)
  const[questions,setQuestions]=useState([])
  const[focusedQ,setFocusedQ]=useState(0)
  const[answers,setAnswers]=useState([])
  const[done,setDone]=useState(false)
  const questionRefs=useRef({})

  // Preselect learnMin when cardCount changes (still manually adjustable)
  useEffect(()=>{setSettings(s=>({...s,learnMin:s.cardCount}))},[settings.cardCount])

  // If quiz pending on mount, load it
  useEffect(()=>{
    if(phase==='quiz_pending'){
      const s=getSession()
      if(s){
        setShownCards(s.shownCards);setAllCards(s.allCards)
        const qs=Array.from({length:s.qCount},()=>makeQuestion(s.shownCards,s.allCards))
        setQuestions(qs);setFocusedQ(0);setAnswers(Array(qs.length).fill(null));setDone(false)
        setPhase('quiz')
      }
    }
  },[])

  async function startLearn(){
    if('Notification' in window&&Notification.permission==='default'){Notification.requestPermission()}
    setPhase('loading')
    const pool=genCardPool()
    const photos=await fetchPhotos(8)
    photos.forEach((url,i)=>{if(i<pool.length)pool[i].photoUrl=url})
    setAllCards(pool)
    const shown=pool.slice(0,settings.cardCount)
    setShownCards(shown)
    resetLearn(settings.learnMin*60)
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
    setQuestions(qs);setFocusedQ(0);setAnswers(Array(qs.length).fill(null));setDone(false)
    setPhase('quiz')
  }

  function startQuizFromStore(){
    const s=getSession()
    if(!s)return
    setShownCards(s.shownCards);setAllCards(s.allCards)
    const qs=Array.from({length:s.qCount},()=>makeQuestion(s.shownCards,s.allCards))
    setQuestions(qs);setFocusedQ(0);setAnswers(Array(qs.length).fill(null));setDone(false)
    setPhase('quiz')
  }

  const answer=useCallback((qi,i)=>{
    if(done)return
    const next=[...answers];next[qi]=next[qi]===i?null:i;setAnswers(next)
  },[done,answers])

  const fqRef=useRef(focusedQ);fqRef.current=focusedQ
  const ansRef=useRef(answers);ansRef.current=answers
  useEffect(()=>{
    if(phase!=='quiz'||done)return
    const h=e=>{
      if(e.key==='Tab'){
        e.preventDefault()
        setFocusedQ(x=>{
          const nx=e.shiftKey?Math.max(x-1,0):Math.min(x+1,questions.length-1)
          questionRefs.current[nx]?.scrollIntoView({behavior:'smooth',block:'nearest'})
          return nx
        })
      }
      else if(e.key==='ArrowDown'){
        e.preventDefault()
        const cur=fqRef.current;const curAns=ansRef.current[cur]
        const opts=questions[cur].opts
        const nx=curAns===null?0:curAns+1>=opts.length?0:curAns+1
        answer(cur,nx)
      }
      else if(e.key==='ArrowUp'){
        e.preventDefault()
        const cur=fqRef.current;const curAns=ansRef.current[cur]
        const opts=questions[cur].opts
        const nx=curAns===null?opts.length-1:curAns-1<0?opts.length-1:curAns-1
        answer(cur,nx)
      }
      else{const i=KEYS.indexOf(e.key.toLowerCase());if(i>=0&&i<5)answer(fqRef.current,i)}
    }
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)
  },[answer,phase,done,questions.length,questions])

  // Settings keyboard
  const skGroupDefs=[
    [{v:2},{v:3},{v:4},{v:5},{v:6},{v:7},{v:8}].map(()=>({action:()=>{}})).map((o,i)=>({action:()=>setSettings(s=>({...s,cardCount:[2,3,4,5,6,7,8][i]}))})),
    Array.from({length:20},(_,i)=>({action:()=>setSettings(s=>({...s,learnMin:i+1}))})),
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
            {label:'Lernzeit',key:'learnMin',type:'slider',min:1,max:20,row:1},
            {label:'Wartezeit',key:'quizDelayMin',opts:[5,10,15,20,25,30,35,40,45,50,55,60].map(v=>({v,l:v+'m'})),row:2},
            {label:'Anzahl Fragen',key:'qCount',opts:[{v:5,l:'5'},{v:10,l:'10'},{v:15,l:'15'},{v:20,l:'20'},{v:25,l:'25'}],row:3},
          ].map(({label,key,opts,row,type,min,max})=>(
            <div key={key} style={{marginBottom:20}}>
              <div style={{color:T.muted,fontSize:13,marginBottom:8}}>{label}: <span style={{color:T.green,fontWeight:'bold'}}>{type==='slider'?settings[key]+' Min':''}</span></div>
              {type==='slider'?(
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <span style={{color:T.muted,fontSize:12}}>{min} Min</span>
                  <input type="range" min={min} max={max} step={1} value={settings[key]}
                    onChange={e=>setSettings(s=>({...s,[key]:Number(e.target.value)}))}
                    style={{flex:1,accentColor:T.green,height:6,cursor:'pointer',
                      boxShadow:skF(row,0)?`0 0 0 3px ${T.green}88`:'none',borderRadius:4,outline:'none'}}/>
                  <span style={{color:T.muted,fontSize:12}}>{max} Min</span>
                </div>
              ):(
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {opts.map((o,i)=>(<button key={o.v} onClick={()=>setSettings(s=>({...s,[key]:o.v}))} style={{background:settings[key]===o.v?`${T.green}22`:T.surf2,border:`1px solid ${settings[key]===o.v?T.green:T.border}`,borderRadius:8,color:settings[key]===o.v?T.green:T.text,cursor:'pointer',padding:'8px 14px',fontSize:13,boxShadow:skF(row,i)?`0 0 0 2px ${T.green}`:'none'}}>{o.l}</button>))}
                </div>
              )}
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
      <div style={{background:T.surf2,borderRadius:6,height:6,marginBottom:24}}><div style={{height:'100%',background:T.green,borderRadius:6,width:`${(learnTimer/(settings.learnMin*60))*100}%`,transition:'width 1s linear'}}/></div>
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
  if(done){
    const score=answers.reduce((s,a,i)=>s+(a===questions[i]?.correctIdx?1:0),0)
    const pct=Math.round((score/questions.length)*100)
    const col=pct>=70?T.green:pct>=50?T.yellow:T.red
    return(
      <div style={{maxWidth:780,margin:'0 auto',padding:'24px 20px'}}>
        <BackBtn onBack={()=>{clearSession();onBack()}}/>
        <div style={{textAlign:'center',padding:'20px 0 32px'}}>
          <div style={{fontSize:72,fontWeight:'bold',color:col,marginBottom:8}}>{pct}%</div>
          <div style={{color:T.muted,fontSize:16}}>{score} von {questions.length} richtig</div>
        </div>
        <div style={{color:T.green,fontSize:18,fontWeight:'bold',marginBottom:12}}>Allergieausweise</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12,marginBottom:32}}>
          {shownCards.map((c,i)=><AusweisCard key={i} card={c}/>)}
        </div>
        <div style={{color:T.green,fontSize:18,fontWeight:'bold',marginBottom:12}}>Fragen</div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {questions.map((q,qi)=>{
            const userAns=answers[qi]
            const isCorrect=userAns===q.correctIdx
            return(
              <Card key={qi} style={{borderLeft:`3px solid ${isCorrect?T.green:T.red}`}}>
                <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                  <span style={{color:T.muted,fontSize:13,minWidth:22,flexShrink:0}}>{qi+1}.</span>
                  <div style={{flex:1,minWidth:0}}>
                    {q.showAvatar&&<div style={{marginBottom:8}}><img src={q.card.photoUrl} width={40} height={40} alt="" style={{borderRadius:'50%',objectFit:'cover',objectPosition:'center top'}}/></div>}
                    <div style={{fontSize:14,color:T.text,marginBottom:10}}>{q.question}</div>
                    <div style={{fontSize:13}}>
                      <div style={{color:isCorrect?T.green:T.red,marginBottom:2}}>
                        Deine Antwort: {userAns!==null?q.opts[userAns]==='keine'?'Keine Antwort ist richtig.':q.opts[userAns]:'Keine'}
                        {isCorrect?' ✓':' ✗'}
                      </div>
                      {!isCorrect&&<div style={{color:T.green}}>Richtig: {q.opts[q.correctIdx]==='keine'?'Keine Antwort ist richtig.':q.opts[q.correctIdx]}</div>}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
        <div style={{display:'flex',gap:12,justifyContent:'center',marginTop:32}}>
          <button onClick={()=>{clearSession();setPhase('settings')}} style={{background:T.surf2,border:`1px solid ${T.border}`,borderRadius:8,color:T.text,cursor:'pointer',padding:'12px 28px',fontSize:15}}>Nochmal</button>
          <button onClick={()=>{clearSession();onBack()}} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,color:T.muted,cursor:'pointer',padding:'12px 28px',fontSize:15}}>Hauptmenü</button>
        </div>
      </div>
    )
  }

  // ── Quiz ──
  const answeredCount=answers.filter(a=>a!==null).length
  return(
    <div style={{maxWidth:720,margin:'0 auto',padding:'24px 20px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <button onClick={()=>{clearSession();setPhase('settings')}} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,color:T.muted,cursor:'pointer',padding:'6px 14px',fontSize:13}}>← Zurück</button>
        <div style={{color:T.green,fontSize:20,fontWeight:'bold'}}>Abfrage</div>
        <button onClick={()=>setDone(true)} style={{background:T.green,border:'none',borderRadius:8,color:'#000',cursor:'pointer',padding:'8px 16px',fontSize:13,fontWeight:'bold'}}>Ergebnis ({answeredCount}/{questions.length})</button>
      </div>
      <NavDots questions={questions} answers={answers} current={focusedQ} onGo={i=>{setFocusedQ(i);questionRefs.current[i]?.scrollIntoView({behavior:'smooth',block:'nearest'})}} color={T.green}/>
      <div style={{display:'flex',flexDirection:'column',gap:20}}>
        {questions.map((q,qi)=>{
          const isFocused=focusedQ===qi
          return(
            <div key={qi} ref={el=>questionRefs.current[qi]=el} onClick={()=>setFocusedQ(qi)} style={{borderRadius:12,outline:isFocused?`2px solid ${T.blue}`:'2px solid transparent',outlineOffset:2,transition:'outline 0.15s',cursor:'pointer'}}>
              <Card>
                <div style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:q.showAvatar?12:8}}>
                  <span style={{color:T.muted,fontSize:13,minWidth:22,flexShrink:0,lineHeight:'20px'}}>{qi+1}.</span>
                  <div style={{flex:1,minWidth:0}}>
                    {q.showAvatar&&<div style={{marginBottom:10}}><img src={q.card.photoUrl} width={56} height={56} alt="" style={{borderRadius:'50%',objectFit:'cover',objectPosition:'center top'}}/></div>}
                    <div style={{fontSize:16,color:T.text}}>{q.question}</div>
                  </div>
                </div>
                {q.opts.map((o,i)=>(<OptionBtn key={i} label={OPTS[i]} state={answers[qi]===i?'selected':'idle'} onClick={()=>answer(qi,i)} text={o==='keine'?'Keine Antwort ist richtig.':o}/>))}
              </Card>
            </div>
          )
        })}
      </div>
      <div style={{marginTop:24,display:'flex',justifyContent:'center'}}>
        <button onClick={()=>setDone(true)} style={{background:T.green,border:'none',borderRadius:10,color:'#000',cursor:'pointer',padding:'14px 40px',fontSize:16,fontWeight:'bold'}}>Ergebnis anzeigen ({answeredCount}/{questions.length})</button>
      </div>
      <KeyHint/>
      <div style={{color:T.muted,fontSize:11,marginTop:4,textAlign:'center'}}>Tab ↦ nächste Frage · ↑↓ Antwort wählen · A–E antworten</div>
    </div>
  )
}

// Helper: polls every 10s to re-render learn_done when quiz becomes ready
function useQuizReadyCheck({onReady}){
  const beeped=useRef(false)
  useEffect(()=>{
    const id=setInterval(()=>{
      if(isQuizReady()){
        if(!beeped.current){playBeep();beeped.current=true
          if('Notification' in window&&Notification.permission==='granted'){new Notification('Bereit zur Abfrage',{body:'Die Wartezeit ist abgelaufen. Du kannst jetzt die Fragen beantworten.'})}
        }
        onReady()
      }
    },10000)
    return()=>clearInterval(id)
  },[])
  return null
}
