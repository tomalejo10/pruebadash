import { useState, useMemo } from "react";
import { upsertProfile } from "../lib/supabase";

const C = { bg:"#07090F", card:"#0D1117", border:"#1C2333", cyan:"#26ECC8", cyanDim:"rgba(38,236,200,0.12)", text:"#E2E8F0", muted:"#64748B" };
const QUESTIONS = [
  { q:"¿Cuál es tu horizonte de inversión?", opts:["Menos de 1 año","1-3 años","3-7 años","Más de 7 años"], scores:[1,2,3,4] },
  { q:"Si tu cartera cae 30%, ¿qué hacés?", opts:["Vendo todo","Vendo algo","Me quedo quieto","Compro más"], scores:[1,2,3,4] },
  { q:"¿Cuál es tu objetivo principal?", opts:["Preservar capital","Renta estable","Crecimiento moderado","Máximo rendimiento"], scores:[1,2,3,4] },
  { q:"¿Qué % de tu patrimonio invertís?", opts:["Menos del 10%","10-25%","25-50%","Más del 50%"], scores:[1,2,3,4] },
  { q:"¿Cuánta experiencia tenés en inversiones?", opts:["Ninguna","Menos de 2 años","2-5 años","Más de 5 años"], scores:[1,2,3,4] },
  { q:"¿Qué rendimiento anual esperás?", opts:["5-10%","10-20%","20-40%","Más del 40%"], scores:[1,2,3,4] },
];
const PROFILES = [
  { name:"Conservador", range:[6,12], color:"#4ECDC4", emoji:"🛡️", alloc:{renta_fija:60,acciones:20,cash:15,cripto:5}, desc:"Priorizás preservar capital. Carteras de baja volatilidad con predominio de renta fija y activos defensivos." },
  { name:"Moderado", range:[13,18], color:"#FFD166", emoji:"⚖️", alloc:{renta_fija:35,acciones:45,cash:10,cripto:10}, desc:"Buscás equilibrio entre rendimiento y riesgo. Mix balanceado entre acciones growth y renta fija." },
  { name:"Agresivo", range:[19,24], color:"#26ECC8", emoji:"🚀", alloc:{renta_fija:10,acciones:65,cash:5,cripto:20}, desc:"Aceptás alta volatilidad a cambio de máximo rendimiento. Enfoque en acciones growth y criptoactivos." },
];
function getProfile(score) { return PROFILES.find(p=>score>=p.range[0]&&score<=p.range[1])||PROFILES[1]; }

export default function RiskProfileSetup({ user, profile, onComplete }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const score = useMemo(()=>Object.values(answers).reduce((a,b)=>a+b,0),[answers]);
  const riskProfile = useMemo(()=>submitted?getProfile(score):null,[submitted,score]);

  async function handleSave() {
    setSaving(true);
    const { data } = await upsertProfile({ ...profile, id:user.id, risk_profile:riskProfile.name, risk_score:score, risk_updated_at:new Date().toISOString() });
    setSaving(false);
    onComplete(data);
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'DM Sans',sans-serif", padding:"40px 20px" }}>
      <div style={{ maxWidth:600, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ color:C.cyan, fontSize:28, fontWeight:800, marginBottom:6 }}>QuickInvest</div>
          <div style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:6 }}>Definí tu perfil de inversor</div>
          <div style={{ color:C.muted, fontSize:13, lineHeight:1.6 }}>Solo toma 2 minutos. Podés cambiarlo cuando quieras.</div>
        </div>
        {!submitted ? (
          <>
            <div style={{ display:"flex", gap:4, marginBottom:28 }}>
              {QUESTIONS.map((_,i)=>(<div key={i} style={{ flex:1, height:3, borderRadius:3, background:answers[i]!=null?C.cyan:C.border, transition:"background 0.3s" }}/>))}
            </div>
            {QUESTIONS.map((q,i)=>(
              <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:22, marginBottom:14 }}>
                <div style={{ color:C.muted, fontSize:11, fontWeight:700, marginBottom:8 }}>PREGUNTA {i+1} DE {QUESTIONS.length}</div>
                <div style={{ fontWeight:600, marginBottom:14, fontSize:14, color:C.text }}>{q.q}</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {q.opts.map((opt,j)=>{
                    const sel=answers[i]===q.scores[j];
                    return <button key={j} onClick={()=>setAnswers(p=>({...p,[i]:q.scores[j]}))} style={{ background:sel?C.cyanDim:"#090D15", border:`1px solid ${sel?C.cyan:C.border}`, borderRadius:8, padding:"9px 13px", color:sel?C.cyan:C.text, cursor:"pointer", fontSize:12, textAlign:"left", fontFamily:"inherit", fontWeight:sel?600:400 }}>{opt}</button>;
                  })}
                </div>
              </div>
            ))}
            <button style={{ width:"100%", padding:14, background:C.cyan, color:"#07090F", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit", opacity:Object.keys(answers).length===QUESTIONS.length?1:0.4 }} disabled={Object.keys(answers).length<QUESTIONS.length} onClick={()=>setSubmitted(true)}>Ver mi perfil →</button>
          </>
        ) : (
          <div style={{ background:C.card, border:`2px solid ${riskProfile.color}`, borderRadius:16, padding:32 }}>
            <div style={{ display:"flex", alignItems:"center", gap:18, marginBottom:20 }}>
              <div style={{ fontSize:52 }}>{riskProfile.emoji}</div>
              <div>
                <div style={{ fontSize:28, fontWeight:800, color:riskProfile.color }}>{riskProfile.name}</div>
                <div style={{ color:C.muted, fontSize:13 }}>Score: {score}/24 puntos</div>
              </div>
            </div>
            <p style={{ color:"#94A3B8", lineHeight:1.65, marginBottom:20, fontSize:14 }}>{riskProfile.desc}</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:24 }}>
              {Object.entries(riskProfile.alloc).map(([k,v])=>(
                <div key={k} style={{ background:"#090D15", borderRadius:10, padding:14, textAlign:"center" }}>
                  <div style={{ color:riskProfile.color, fontSize:22, fontWeight:800, fontFamily:"monospace" }}>{v}%</div>
                  <div style={{ color:C.muted, fontSize:10, marginTop:4, textTransform:"capitalize" }}>{k.replace("_"," ")}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>{setSubmitted(false);setAnswers({});}} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, borderRadius:8, padding:"10px 20px", cursor:"pointer", fontFamily:"inherit", fontWeight:600, fontSize:13 }}>Rehacer</button>
              <button onClick={handleSave} disabled={saving} style={{ flex:1, background:C.cyan, color:"#07090F", border:"none", borderRadius:8, padding:"10px 20px", cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:14, opacity:saving?0.7:1 }}>{saving?"Guardando...":"Confirmar mi perfil →"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
