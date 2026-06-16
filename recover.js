// In die Browser-Konsole (F12) der ALTEN Seite pasten, dann Enter.
// Achtung: Nicht die Seite neu laden - sonst sind die Daten weg!
// Falls Vite HMR aktiv: erst __simData in Konsole checken, dann __recoverSimulation()

(function() {
  const SUBTESTS_H = [
    { name:'Biologie',                  qCount:40, timeMin:30, section:'BMS', type:'standard'  },
    { name:'Chemie',                    qCount:24, timeMin:18, section:'BMS', type:'standard'  },
    { name:'Physik',                    qCount:18, timeMin:16, section:'BMS', type:'standard'  },
    { name:'Mathematik',                qCount:12, timeMin:11, section:'BMS', type:'standard'  },
    { name:'Textverständnis',           qCount:12, timeMin:35, section:'BMS', type:'standard'  },
    { name:'Figuren zusammensetzen',    qCount:15, timeMin:20, section:'KFF', type:'standard'  },
    { name:'Allergieausweise (Merken)', qCount:8,  timeMin:8,  section:'KFF', type:'merken'    },
    { name:'Zahlenfolgen',              qCount:10, timeMin:15, section:'KFF', type:'standard'  },
    { name:'Wortflüssigkeit',           qCount:15, timeMin:20, section:'KFF', type:'standard'  },
    { name:'Allergieausweise (Abfrage)',qCount:25, timeMin:15, section:'KFF', type:'standard'  },
    { name:'Implikationen erkennen',    qCount:10, timeMin:10, section:'KFF', type:'standard'  },
    { name:'Emotionen regulieren',      qCount:12, timeMin:18, section:'SEK', type:'standard'  },
    { name:'Emotionen erkennen',        qCount:14, timeMin:21, section:'SEK', type:'emotionen' },
    { name:'Soziales Entscheiden',      qCount:14, timeMin:21, section:'SEK', type:'soziales'  },
  ];

  const sts = [...SUBTESTS_H];
  const pauseIdx = sts.findIndex(s => s.name === 'Textverständnis');
  if (pauseIdx >= 0) sts.splice(pauseIdx + 1, 0, { name:'Mittagspause', qCount:0, timeMin:60, section:null, type:'pause' });

  function getScoredItems(st) {
    if (st.type === 'merken' || st.type === 'pause') return 0;
    return st.qCount;
  }

  const SECTION_WEIGHTS = { BMS:0.4, KFF:0.4, SEK:0.1, TV:0.1 };
  const bySection = {};
  for (const st of sts) {
    const sec = st.section === 'BMS' && st.name === 'Textverständnis' ? 'TV' : st.section;
    if (!bySection[sec]) bySection[sec] = [];
    bySection[sec].push(st);
  }
  const weights = sts.map(st => {
    const sec = st.section === 'BMS' && st.name === 'Textverständnis' ? 'TV' : st.section;
    const secWeight = SECTION_WEIGHTS[sec] || 0;
    const secItems = bySection[sec].reduce((s, x) => s + getScoredItems(x), 0);
    const stItems = getScoredItems(st);
    return secItems > 0 ? (stItems / secItems) * secWeight : 0;
  });

  // ── React State finden ──────────────────────────────────
  let ua = null, ca = null;

  // Weg 1: window.__simData (falls Vite HMR Update schon aktiv)
  if (window.__simData && window.__simData.userAnswers && window.__simData.correctAnswers) {
    ua = window.__simData.userAnswers;
    ca = window.__simData.correctAnswers;
    console.log('✅ Daten via window.__simData geladen.');
  }

  // Weg 2: React Fiber Tree durchsuchen
  if (!ua || !ca) {
    console.log('window.__simData nicht verfügbar, durchsuche React Fiber...');
    const root = document.getElementById('root');
    let fiber = null;

    const reactKey = Object.keys(root).find(k =>
      k.startsWith('__reactContainer$') ||
      k.startsWith('__reactFiber$') ||
      k.startsWith('__reactInternalInstance$')
    );
    if (reactKey) {
      const val = root[reactKey];
      fiber = val?._internalRoot?.current || val?.current || val;
      if (fiber && !fiber.memoizedState && fiber._internalRoot) {
        fiber = fiber._internalRoot.current;
      }
    }

    // Fallback: Fiber an beliebigem DOM-Knoten suchen
    if (!fiber) {
      for (const el of document.querySelectorAll('*')) {
        const k = Object.keys(el).find(x => x.startsWith('__reactFiber$'));
        if (k) { fiber = el[k]; while (fiber?.return) fiber = fiber.return; break; }
      }
    }

    if (!fiber) {
      console.error('❌ React fiber nicht gefunden.');
      console.error('Keys auf root:', Object.keys(root).filter(k => k.startsWith('__')));
      console.error('Läuft der Vite Dev-Server? Falls nicht: npm run dev ausführen,');
      console.error('dann warten bis HMR das Update lädt, dann __simData in Konsole checken.');
      return;
    }
    console.log('Fiber gefunden, durchsuche State...');

    // Fiber-Baum rekursiv nach userAnswers/correctAnswers durchsuchen
    (function walk(f) {
      if (!f || ua) return;
      if (f.memoizedState) {
        const states = [];
        let h = f.memoizedState;
        while (h) { states.push(h.memoizedState); h = h.next; }
        for (let i = 0; i < states.length; i++) {
          const s = states[i];
          if (Array.isArray(s) && s.length >= 14 && s.length <= 16) {
            const hasNulls = s.some(x => x === null);
            const hasArrays = s.some(x => Array.isArray(x) && x.length > 3);
            if (hasNulls && hasArrays) {
              ua = s;
              ca = states[i + 1];
              console.log('✅ Daten via Fiber gefunden (Hook-Index ' + i + ').');
              return;
            }
          }
        }
      }
      walk(f.child);
      walk(f.sibling);
    })(fiber);
  }

  if (!ua || !ca) {
    console.error('❌ userAnswers oder correctAnswers nicht im State gefunden.');
    console.error('  ua:', ua, 'ca:', ca);
    return;
  }

  // ── Korrupte Standard-Einträge reparieren ─────────────────
  function fix(arr) {
    if (!arr) return arr;
    return arr.map(item => {
      if (Array.isArray(item) && item.length === 1 && typeof item[0] === 'string') {
        return item[0]; // ['A'] → 'A'
      }
      return item;
    });
  }

  const fixedUA = ua.map((a, i) => {
    if (!a || sts[i]?.type === 'emotionen' || sts[i]?.type === 'soziales') return a;
    return fix(a);
  });
  const fixedCA = ca.map((a, i) => {
    if (!a || sts[i]?.type === 'emotionen' || sts[i]?.type === 'soziales') return a;
    return fix(a);
  });

  // ── computeResults ────────────────────────────────────────
  const breakdown = sts.map((st, i) => {
    let scored = 0, correct = 0;
    if (st.type === 'standard') {
      for (let qi = 0; qi < st.qCount; qi++) {
        if (fixedCA[i]?.[qi] != null && fixedUA[i]?.[qi] != null) {
          scored++;
          if (fixedUA[i][qi] === fixedCA[i][qi]) correct++;
        }
      }
    } else if (st.type === 'emotionen') {
      for (let ei = 0; ei < st.qCount; ei++) {
        const uRow = fixedUA[i]?.[ei], cRow = fixedCA[i]?.[ei];
        if (!uRow || !cRow) continue;
        if (!uRow.every(v => v != null) || !cRow.every(v => v != null)) continue;
        scored++;
        if (uRow.every((v, oi) => v === cRow[oi])) correct++;
      }
    } else if (st.type === 'soziales') {
      for (let ei = 0; ei < st.qCount; ei++) {
        const uRow = fixedUA[i]?.[ei], cRow = fixedCA[i]?.[ei];
        if (!uRow || !cRow) continue;
        if (!uRow.every(v => v != null) || !cRow.every(v => v != null)) continue;
        scored++;
        let diffSum = 0;
        for (let oi = 0; oi < 5; oi++) diffSum += Math.abs(uRow[oi] - cRow[oi]);
        correct += 1 - diffSum / 12;
      }
    }
    const total = getScoredItems(st);
    const pct = total > 0 ? correct / total : null;
    return { ...st, scored, correct, pct, weight: weights[i] };
  });

  const secData = {};
  for (const b of breakdown) {
    const sec = b.section === 'BMS' && b.name === 'Textverständnis' ? 'TV' : b.section;
    if (!secData[sec]) secData[sec] = { correct: 0, total: 0 };
    secData[sec].correct += b.correct;
    secData[sec].total += getScoredItems(b);
  }
  let gesamt = 0;
  for (const [sec, d] of Object.entries(secData)) {
    if (d.total > 0 && SECTION_WEIGHTS[sec]) gesamt += (d.correct / d.total) * SECTION_WEIGHTS[sec];
  }

  // ── Ausgabe ───────────────────────────────────────────────
  const rows = breakdown.filter(b => b.type !== 'merken' && b.type !== 'pause');
  console.table(rows.map((b, i) => ({
    '#': i + 1,
    Untertest: b.name,
    Fragen: getScoredItems(b),
    Richtig: b.type === 'soziales' ? b.correct.toFixed(1) : b.correct,
    Bewertet: b.scored,
    '%': b.pct != null ? Math.round(b.pct * 100) + '%' : '–',
    Gewicht: (b.weight * 100).toFixed(1) + '%',
  })));
  console.log('%c🏆 Gesamtscore: ' + Math.round(gesamt * 100) + '%', 'font-size:18px;font-weight:bold;color:#fab387');
  console.log('%c⚠ Mach einen Screenshot! Nach Reload sind die Daten weg.', 'color:#f38ba8');
})();
