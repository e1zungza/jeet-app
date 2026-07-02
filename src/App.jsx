import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";

const T = {
  bg:"#0f0f0f", card:"#1a1a1a", card2:"#222", border:"#2e2e2e",
  red:"#e01010", gray:"#888", gl:"#aaa", white:"#f0f0f0", text:"#e0e0e0",
  green:"#4caf7d", blue:"#4a90d9", yellow:"#f0b429", orange:"#e67e22", purple:"#9b59b6",
};

const catColor = { "레벨테스트":T.purple, "단원평가":T.blue, "모의고사":T.red };
const evtColor  = { exam:T.red, event:T.blue, special:T.orange };
const evtIcon   = { exam:"📝", event:"📢", special:"⭐" };

function Logo() {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontWeight:900,fontSize:21,color:T.red,letterSpacing:-1,fontFamily:"Arial Black,sans-serif"}}>JEET</span>
      <span style={{fontWeight:600,fontSize:10,color:T.gray,letterSpacing:2}}>EDUCATION</span>
      <div style={{width:1,height:18,background:T.border}}/>
      <span style={{fontSize:11,color:T.gl}}>중등자사센터</span>
    </div>
  );
}

function StatBox({label, value, sub, color, highlight}) {
  return (
    <div style={{flex:1,background:highlight?color+"22":T.card2,border:`1px solid ${highlight?color+"66":T.border}`,borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
      <div style={{fontSize:highlight?20:17,fontWeight:800,color:highlight?color:T.white}}>{value}</div>
      {sub&&<div style={{fontSize:9,color:color,fontWeight:600,marginTop:1}}>{sub}</div>}
      <div style={{fontSize:10,color:T.gray,marginTop:2}}>{label}</div>
    </div>
  );
}

function ScoreBar({value, max=100, color=T.blue, height=6}) {
  return (
    <div style={{background:T.border,borderRadius:4,height,flex:1}}>
      <div style={{width:`${(value/max)*100}%`,background:color,height:"100%",borderRadius:4,transition:"width .6s"}}/>
    </div>
  );
}

function MiniChart({data, width=280, height=60}) {
  if(!data||data.length<2) return null;
  const vals = data.map(d=>d.score);
  const mn = Math.min(...vals)-5, mx = Math.max(...vals)+5;
  const px = i=>(i/(data.length-1))*(width-20)+10;
  const py = v=>height-((v-mn)/(mx-mn))*(height-16)-8;
  const pts = data.map((d,i)=>({x:px(i),y:py(d.score)}));
  const path = pts.map((p,i)=>i===0?`M${p.x},${p.y}`:`L${p.x},${p.y}`).join(" ");
  const area = [...pts.map((p,i)=>i===0?`M${p.x},${height}L${p.x},${p.y}`:`L${p.x},${p.y}`),`L${pts[pts.length-1].x},${height}Z`].join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{overflow:"visible"}}>
      <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.red} stopOpacity="0.3"/><stop offset="100%" stopColor={T.red} stopOpacity="0"/></linearGradient></defs>
      <path d={area} fill="url(#cg)"/>
      <path d={path} fill="none" stroke={T.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((p,i)=>(
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill={T.red} stroke={T.bg} strokeWidth="1.5"/>
          <text x={p.x} y={p.y-7} textAnchor="middle" fontSize="9" fill={T.gl}>{data[i].score}</text>
        </g>
      ))}
    </svg>
  );
}

function Spinner() {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"60vh",gap:16}}>
      <div style={{width:40,height:40,border:`3px solid ${T.border}`,borderTop:`3px solid ${T.red}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <div style={{fontSize:13,color:T.gray}}>데이터 불러오는 중...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const days = ["월","화","수","목","금","토","일"];
const timetableStatic = {
  "월":[ {time:"15:00~17:00",name:"수학 심화 A반",teacher:"박민준",room:"A101"},{time:"17:10~18:40",name:"개념 완성반",teacher:"박민준",room:"A101"} ],
  "화":[], "수":[ {time:"15:00~17:00",name:"수학 심화 A반",teacher:"박민준",room:"A101"} ],
  "목":[ {time:"16:00~18:00",name:"개념 완성반",teacher:"박민준",room:"A101"} ],
  "금":[ {time:"15:00~17:00",name:"수학 심화 A반",teacher:"박민준",room:"A101"} ],
  "토":[ {time:"10:00~13:00",name:"주말 심화 종합",teacher:"전담팀",room:"강당"} ], "일":[],
};

export default function App({ user }) {
  const [tab, setTab]         = useState("home");
  const [student, setStudent] = useState(null);
  const [tests, setTests]     = useState([]);
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [selTest, setSelTest] = useState(null);
  const [selDay, setSelDay]   = useState("월");
  const [calMonth, setCalMonth] = useState({y:new Date().getFullYear(),m:new Date().getMonth()+1});

  useEffect(()=>{
    async function fetchAll() {
      try {
        // 로그인한 전화번호로 학생 찾기
        const phone = user.phoneNumber.replace("+82","0");
        const stuQ  = query(collection(db,"students"), where("parentPhone","==",phone));
        const stuSnap = await getDocs(stuQ);
        if(!stuSnap.empty) {
          const doc = stuSnap.docs[0];
          setStudent({ id:doc.id, ...doc.data() });

          const testQ = query(
            collection(db,"tests"),
            where("studentId","==",doc.id),
            orderBy("date","asc")
          );
          const testSnap = await getDocs(testQ);
          setTests(testSnap.docs.map(d=>({ id:d.id, ...d.data() })));
        } else {
          setError("등록된 학생 정보가 없습니다. 원장 선생님께 문의해주세요.");
        }

        const evtSnap = await getDocs(query(collection(db,"events"), orderBy("date","asc")));
        setEvents(evtSnap.docs.map(d=>({ id:d.id, ...d.data() })));

      } catch(e) {
        console.error(e);
        setError("데이터를 불러오지 못했습니다. Firebase 설정을 확인해 주세요.");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  },[user]);

  if(loading) return (
    <div style={{background:T.bg,minHeight:"100vh",fontFamily:"'Noto Sans KR',sans-serif",maxWidth:420,margin:"0 auto"}}>
      <div style={{background:T.card,borderBottom:`1px solid ${T.border}`,padding:"12px 18px"}}><Logo/></div>
      <Spinner/>
    </div>
  );

  if(error) return (
    <div style={{background:T.bg,minHeight:"100vh",fontFamily:"'Noto Sans KR',sans-serif",maxWidth:420,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",padding:32}}>
        <div style={{fontSize:40,marginBottom:16}}>⚠️</div>
        <div style={{fontSize:14,color:T.gl,lineHeight:1.7}}>{error}</div>
      </div>
    </div>
  );

  if(!student) return (
    <div style={{background:T.bg,minHeight:"100vh",fontFamily:"'Noto Sans KR',sans-serif",maxWidth:420,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",padding:32}}>
        <div style={{fontSize:40,marginBottom:16}}>👤</div>
        <div style={{fontSize:14,color:T.gl}}>등록된 학생 정보가 없습니다.</div>
      </div>
    </div>
  );

  const latest   = tests.length>0 ? tests[tests.length-1] : null;
  const avgScore = tests.length>0 ? Math.round(tests.reduce((a,t)=>a+t.score,0)/tests.length) : 0;
  const bestTest = tests.length>0 ? [...tests].sort((a,b)=>b.score-a.score)[0] : null;
  const today    = new Date().toISOString().slice(0,10);
  const upcoming = events.filter(e=>e.date>=today).slice(0,3);

  const {y,m} = calMonth;
  const firstDow = new Date(y,m-1,1).getDay();
  const dim = new Date(y,m,0).getDate();
  const calCells = [];
  for(let i=0;i<firstDow;i++) calCells.push(null);
  for(let d=1;d<=dim;d++) calCells.push(d);
  while(calCells.length%7!==0) calCells.push(null);
  const evtMap = {};
  events.forEach(e=>{
    const [ey,em,ed]=e.date.split("-").map(Number);
    if(ey===y&&em===m) evtMap[ed]=e;
  });

  const card  = (ex={})=>({background:T.card,borderRadius:12,padding:16,marginBottom:12,border:`1px solid ${T.border}`,...ex});
  const tag   = c=>({background:c+"22",color:c,borderRadius:6,fontSize:10,padding:"2px 7px",fontWeight:700,display:"inline-block"});
  const navBtn= a=>({flex:1,padding:"9px 0",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,color:a?T.red:T.gray,fontSize:9,fontWeight:a?700:400});
  const secTit= {fontSize:11,color:T.gray,fontWeight:700,letterSpacing:0.8,marginBottom:10};

  return (
    <div style={{background:T.bg,minHeight:"100vh",color:T.text,fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif",maxWidth:420,margin:"0 auto",display:"flex",flexDirection:"column"}}>

      <div style={{background:T.card,borderBottom:`1px solid ${T.border}`,padding:"12px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10}}>
        <Logo/>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:12,fontWeight:700,color:T.white}}>{student.name}</div>
            <div style={{fontSize:10,color:T.gray}}>{student.grade} · {student.level}</div>
          </div>
          <div style={{width:32,height:32,borderRadius:"50%",background:T.red+"22",border:`1px solid ${T.red}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>👤</div>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 14px 76px"}}>

        {tab==="home"&&<>
          <div style={{...card(),background:"linear-gradient(135deg,#1a0808,#200e0e)",border:`1px solid ${T.red}44`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:11,color:T.gray,marginBottom:3}}>내 아이 현황</div>
                <div style={{fontSize:20,fontWeight:800,color:T.white}}>{student.name}</div>
                <div style={{fontSize:12,color:T.gl,marginTop:3}}>{student.grade} · {student.class}</div>
                <div style={{marginTop:6,display:"flex",gap:6,flexWrap:"wrap"}}>
                  <span style={tag(T.red)}>{student.level}</span>
                  <span style={tag(T.blue)}>{student.teacher}</span>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:11,color:T.gray}}>누적 평균</div>
                <div style={{fontSize:34,fontWeight:900,color:T.red,lineHeight:1}}>{avgScore||"-"}</div>
                <div style={{fontSize:10,color:T.gray,marginTop:2}}>총 {tests.length}회 테스트</div>
              </div>
            </div>
          </div>

          {latest ? (
            <div style={card()}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={secTit}>최근 테스트</div>
                <button onClick={()=>setTab("test")} style={{background:"none",border:"none",color:T.red,fontSize:12,cursor:"pointer"}}>전체보기 →</button>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <span style={tag(catColor[latest.category]||T.gray)}>{latest.category}</span>
                <span style={{fontSize:13,color:T.white,fontWeight:600}}>{latest.name}</span>
                <span style={{fontSize:11,color:T.gray,marginLeft:"auto"}}>{latest.date}</span>
              </div>
              <div style={{display:"flex",gap:7}}>
                <StatBox label="내 점수" value={latest.score} color={T.red} highlight/>
                <StatBox label="반평균" value={latest.classAvg} color={T.blue}/>
                <StatBox label="레벨평균" value={latest.levelAvg} color={T.green}/>
                <StatBox label="석차" value={`${latest.rank}위`} sub={`/${latest.total}명`} color={T.yellow}/>
              </div>
            </div>
          ):(
            <div style={{...card(),textAlign:"center",padding:32,color:T.gray}}>
              <div style={{fontSize:32,marginBottom:8}}>📝</div>
              아직 등록된 테스트가 없어요
            </div>
          )}

          {tests.length>=2&&(
            <div style={card()}>
              <div style={{...secTit,marginBottom:14}}>점수 추이</div>
              <MiniChart data={tests}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                {tests.map((t,i)=><div key={i} style={{fontSize:8,color:T.gray,textAlign:"center",flex:1}}>{t.date.slice(5)}</div>)}
              </div>
            </div>
          )}

          <div style={card()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={secTit}>다가오는 일정</div>
              <button onClick={()=>setTab("schedule")} style={{background:"none",border:"none",color:T.red,fontSize:12,cursor:"pointer"}}>전체보기 →</button>
            </div>
            {upcoming.length>0 ? upcoming.map((e,i)=>(
              <div key={i} style={{display:"flex",gap:10,marginBottom:10,alignItems:"center"}}>
                <div style={{width:36,height:36,borderRadius:10,background:(evtColor[e.type]||T.blue)+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{evtIcon[e.type]||"📌"}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:T.white}}>{e.title}</div>
                  <div style={{fontSize:11,color:T.gray}}>{e.date}</div>
                </div>
                <span style={tag(evtColor[e.type]||T.blue)}>{e.type==="exam"?"시험":e.type==="special"?"특강":"공지"}</span>
              </div>
            )):(
              <div style={{textAlign:"center",color:T.gray,fontSize:13,padding:"8px 0"}}>예정된 일정이 없어요</div>
            )}
          </div>
        </>}

        {tab==="test"&&<>
          <div style={{fontSize:17,fontWeight:700,marginBottom:14,color:T.white}}>📝 테스트 결과</div>
          {selTest ? (
            <div>
              <button onClick={()=>setSelTest(null)} style={{background:"none",border:"none",color:T.red,fontSize:13,cursor:"pointer",marginBottom:12,padding:0}}>← 목록으로</button>
              <div style={{...card(),border:`1px solid ${(catColor[selTest.category]||T.gray)}44`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                  <div>
                    <span style={tag(catColor[selTest.category]||T.gray)}>{selTest.category}</span>
                    <div style={{fontSize:17,fontWeight:700,color:T.white,marginTop:6}}>{selTest.name}</div>
                    <div style={{fontSize:12,color:T.gray,marginTop:2}}>{selTest.date}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:11,color:T.gray}}>내 점수</div>
                    <div style={{fontSize:38,fontWeight:900,color:T.red,lineHeight:1}}>{selTest.score}</div>
                    <div style={{fontSize:11,color:T.gray}}>/ {selTest.maxScore}점</div>
                  </div>
                </div>
                <div style={{background:T.yellow+"15",border:`1px solid ${T.yellow}44`,borderRadius:10,padding:"12px 16px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:13,color:T.gl}}>석차</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                    <span style={{fontSize:28,fontWeight:900,color:T.yellow}}>{selTest.rank}위</span>
                    <span style={{fontSize:13,color:T.gray}}>/ {selTest.total}명</span>
                  </div>
                  <div style={{fontSize:12,color:T.yellow}}>상위 {Math.round((selTest.rank/selTest.total)*100)}%</div>
                </div>
                <div style={{...secTit,marginBottom:12}}>점수 비교</div>
                {[
                  {label:"내 점수",   val:selTest.score,     color:T.red,    highlight:true},
                  {label:"반 평균",   val:selTest.classAvg,  color:T.blue},
                  {label:"과정 평균", val:selTest.courseAvg, color:T.purple},
                  {label:"레벨 평균", val:selTest.levelAvg,  color:T.green},
                ].map(r=>(
                  <div key={r.label} style={{marginBottom:11}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:12,color:r.highlight?T.white:T.gl,fontWeight:r.highlight?700:400}}>{r.label}</span>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        {r.highlight&&selTest.classAvg&&<span style={{fontSize:10,color:selTest.score>=selTest.classAvg?T.green:"#e07070"}}>{selTest.score>=selTest.classAvg?"▲":"▼"} 반평균 {selTest.score>=selTest.classAvg?"+":""}{(selTest.score-selTest.classAvg).toFixed(1)}</span>}
                        <span style={{fontSize:13,fontWeight:700,color:r.color}}>{r.val}점</span>
                      </div>
                    </div>
                    <ScoreBar value={r.val} color={r.color} height={r.highlight?8:5}/>
                  </div>
                ))}
                {selTest.topics&&selTest.topics.length>0&&(
                  <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${T.border}`}}>
                    <div style={{fontSize:11,color:T.gray,marginBottom:8}}>출제 범위</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {selTest.topics.map(tp=><span key={tp} style={tag(T.gl)}>{tp}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ):(
            <>
              {tests.length>0 ? (
                <>
                  <div style={{...card(),border:`1px solid ${T.red}33`}}>
                    <div style={{...secTit,marginBottom:12}}>누적 성적 요약</div>
                    <div style={{display:"flex",gap:7,marginBottom:12}}>
                      <StatBox label="평균" value={avgScore} color={T.red} highlight/>
                      <StatBox label="최고" value={bestTest.score} sub={bestTest.name.slice(0,4)} color={T.green}/>
                      <StatBox label="최저" value={Math.min(...tests.map(t=>t.score))} color={T.blue}/>
                      <StatBox label="횟수" value={`${tests.length}회`} color={T.yellow}/>
                    </div>
                    {tests.length>=2&&<MiniChart data={tests}/>}
                  </div>
                  <div style={secTit}>전체 테스트 ({tests.length}회)</div>
                  {[...tests].reverse().map(t=>(
                    <div key={t.id} onClick={()=>setSelTest(t)} style={{...card(),cursor:"pointer",marginBottom:8,padding:"13px 14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                            <span style={tag(catColor[t.category]||T.gray)}>{t.category}</span>
                            <span style={{fontSize:13,fontWeight:600,color:T.white,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</span>
                          </div>
                          <div style={{display:"flex",gap:10}}>
                            <span style={{fontSize:11,color:T.gray}}>반평균 {t.classAvg}</span>
                            <span style={{fontSize:11,color:T.gray}}>레벨평균 {t.levelAvg}</span>
                            <span style={{fontSize:11,color:T.yellow}}>#{t.rank}/{t.total}위</span>
                          </div>
                        </div>
                        <div style={{textAlign:"right",marginLeft:12}}>
                          <div style={{fontSize:24,fontWeight:900,color:t.score>=(t.levelAvg||0)?T.green:T.yellow}}>{t.score}</div>
                          <div style={{fontSize:10,color:T.gray}}>{t.date.slice(5)}</div>
                        </div>
                      </div>
                      <div style={{marginTop:10}}><ScoreBar value={t.score} color={t.score>=90?T.green:t.score>=80?T.blue:T.yellow}/></div>
                    </div>
                  ))}
                </>
              ):(
                <div style={{...card(),textAlign:"center",padding:40,color:T.gray}}>
                  <div style={{fontSize:36,marginBottom:12}}>📝</div>
                  아직 등록된 테스트가 없어요
                </div>
              )}
            </>
          )}
        </>}

        {tab==="report"&&<>
          <div style={{fontSize:17,fontWeight:700,marginBottom:14,color:T.white}}>📊 성적 분석 리포트</div>
          {tests.length===0 ? (
            <div style={{...card(),textAlign:"center",padding:40,color:T.gray}}>
              <div style={{fontSize:36,marginBottom:12}}>📊</div>테스트 데이터가 없어요
            </div>
          ):(
            <>
              <div style={{...card(),background:"linear-gradient(135deg,#1a0808,#200e0e)",border:`1px solid ${T.red}44`}}>
                <div style={{...secTit,color:T.red}}>종합 평가</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div>
                    <div style={{fontSize:28,fontWeight:900,color:T.white}}>누적 평균 <span style={{color:T.red}}>{avgScore}점</span></div>
                    <div style={{fontSize:12,color:T.gray,marginTop:2}}>{student.level} · 총 {tests.length}회</div>
                  </div>
                  {tests.length>=2&&(
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:13,color:T.gl}}>성장 추이</div>
                      <div style={{fontSize:20,fontWeight:800,color:tests[tests.length-1].score>=tests[0].score?T.green:"#e07070"}}>
                        {tests[tests.length-1].score>=tests[0].score?"▲":"▼"} {Math.abs(tests[tests.length-1].score-tests[0].score)}점
                      </div>
                      <div style={{fontSize:10,color:T.gray}}>첫 테스트 대비</div>
                    </div>
                  )}
                </div>
              </div>

              <div style={card()}>
                <div style={{...secTit,marginBottom:12}}>테스트 유형별 평균</div>
                {["모의고사","단원평가","레벨테스트"].map(cat=>{
                  const filtered = tests.filter(t=>t.category===cat);
                  if(filtered.length===0) return null;
                  const avg  = Math.round(filtered.reduce((a,t)=>a+t.score,0)/filtered.length);
                  const cavg = Math.round(filtered.reduce((a,t)=>a+(t.classAvg||0),0)/filtered.length);
                  return (
                    <div key={cat} style={{marginBottom:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={tag(catColor[cat]||T.gray)}>{cat}</span>
                          <span style={{fontSize:11,color:T.gray}}>{filtered.length}회</span>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <span style={{fontSize:11,color:T.blue}}>반평균 {cavg}</span>
                          <span style={{fontSize:15,fontWeight:700,color:catColor[cat]||T.gray}}>{avg}점</span>
                        </div>
                      </div>
                      <ScoreBar value={avg} color={catColor[cat]||T.gray} height={8}/>
                      <div style={{display:"flex",justifyContent:"flex-end",marginTop:3}}>
                        <span style={{fontSize:10,color:avg>=cavg?T.green:"#e07070"}}>반평균 대비 {avg>=cavg?"+":""}{(avg-cavg).toFixed(1)}점</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={card()}>
                <div style={{...secTit,marginBottom:12}}>반평균 대비 점수 차이</div>
                {tests.map(t=>{
                  const diff = ((t.score||0)-(t.classAvg||0)).toFixed(1);
                  const pos  = diff>0;
                  return (
                    <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
                      <div style={{fontSize:11,color:T.gray,width:55,flexShrink:0}}>{t.date.slice(5)}</div>
                      <div style={{fontSize:12,color:T.gl,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</div>
                      <span style={{fontSize:13,fontWeight:700,color:pos?T.green:"#e07070"}}>{pos?"+":""}{diff}점</span>
                    </div>
                  );
                })}
              </div>

              <div style={card()}>
                <div style={{...secTit,marginBottom:12}}>석차 변화</div>
                <div style={{display:"flex",alignItems:"flex-end",gap:6,height:80,paddingBottom:4}}>
                  {tests.map((t,i)=>{
                    const h = Math.max(10,70-((t.rank-1)/(t.total-1))*60);
                    return (
                      <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                        <div style={{fontSize:9,color:T.yellow,fontWeight:700}}>{t.rank}위</div>
                        <div style={{width:"100%",background:T.yellow+"44",border:`1px solid ${T.yellow}66`,borderRadius:4,height:h}}/>
                        <div style={{fontSize:8,color:T.gray,textAlign:"center"}}>{t.date.slice(5)}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{fontSize:11,color:T.gray,textAlign:"center",marginTop:4}}>막대가 높을수록 높은 순위</div>
              </div>
            </>
          )}
        </>}

        {tab==="schedule"&&<>
          <div style={{fontSize:17,fontWeight:700,marginBottom:14,color:T.white}}>📅 일정</div>
          <div style={card()}>
            <div style={{...secTit,marginBottom:12}}>수업 시간표</div>
            <div style={{display:"flex",gap:5,marginBottom:12,overflowX:"auto"}}>
              {days.map(d=>(
                <button key={d} onClick={()=>setSelDay(d)}
                  style={{minWidth:36,padding:"6px 8px",borderRadius:8,border:`1px solid ${selDay===d?T.red:T.border}`,background:selDay===d?T.red:"none",color:selDay===d?"#fff":T.gray,fontSize:13,fontWeight:selDay===d?700:400,cursor:"pointer",flexShrink:0}}>
                  {d}
                </button>
              ))}
            </div>
            {(timetableStatic[selDay]||[]).length===0 ? (
              <div style={{textAlign:"center",color:T.gray,padding:"20px 0",fontSize:13}}>😴 수업이 없는 날이에요</div>
            ):timetableStatic[selDay].map((c,i)=>(
              <div key={i} style={{display:"flex",gap:10,marginBottom:8,background:T.card2,borderRadius:10,padding:"12px 14px",borderLeft:`3px solid ${T.red}`}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:T.white}}>{c.name}</div>
                  <div style={{fontSize:11,color:T.gray,marginTop:3}}>{c.teacher} · {c.room}</div>
                </div>
                <div style={{fontSize:12,color:T.gl,textAlign:"right",flexShrink:0}}>{c.time}</div>
              </div>
            ))}
          </div>

          <div style={card()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <button onClick={()=>setCalMonth(({y,m})=>m===1?{y:y-1,m:12}:{y,m:m-1})} style={{background:"none",border:"none",color:T.gl,fontSize:20,cursor:"pointer"}}>‹</button>
              <div style={{fontSize:14,fontWeight:700,color:T.white}}>{y}년 {m}월</div>
              <button onClick={()=>setCalMonth(({y,m})=>m===12?{y:y+1,m:1}:{y,m:m+1})} style={{background:"none",border:"none",color:T.gl,fontSize:20,cursor:"pointer"}}>›</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:6}}>
              {["일","월","화","수","목","금","토"].map(d=>(
                <div key={d} style={{textAlign:"center",fontSize:10,color:d==="일"?"#e07070":d==="토"?T.blue:T.gray,fontWeight:600,paddingBottom:4}}>{d}</div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
              {calCells.map((d,i)=>{
                if(!d) return <div key={i}/>;
                const evt=evtMap[d], dow=i%7;
                return (
                  <div key={i} style={{aspectRatio:"1",borderRadius:8,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:evt?(evtColor[evt.type]||T.blue)+"22":T.card2,border:`1px solid ${evt?(evtColor[evt.type]||T.blue)+"66":T.border}`}}>
                    <span style={{fontSize:11,color:dow===0?"#e07070":dow===6?T.blue:T.gl,fontWeight:evt?700:400}}>{d}</span>
                    {evt&&<div style={{width:5,height:5,borderRadius:"50%",background:evtColor[evt.type]||T.blue,marginTop:1}}/>}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={card()}>
            <div style={{...secTit,marginBottom:12}}>연간 일정 및 이벤트</div>
            {events.length>0 ? events.map((e,i)=>(
              <div key={i} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start",paddingBottom:10,borderBottom:i<events.length-1?`1px solid ${T.border}`:"none"}}>
                <div style={{width:38,height:38,borderRadius:10,background:(evtColor[e.type]||T.blue)+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{evtIcon[e.type]||"📌"}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3,flexWrap:"wrap"}}>
                    <span style={{fontSize:13,fontWeight:600,color:T.white}}>{e.title}</span>
                    <span style={tag(evtColor[e.type]||T.blue)}>{e.type==="exam"?"시험":e.type==="special"?"특강":"공지"}</span>
                  </div>
                  <div style={{fontSize:11,color:T.gray,marginBottom:4}}>{e.date}</div>
                  <div style={{fontSize:12,color:T.gl,lineHeight:1.5}}>{e.desc}</div>
                </div>
              </div>
            )):(
              <div style={{textAlign:"center",color:T.gray,fontSize:13,padding:"16px 0"}}>등록된 일정이 없어요</div>
            )}
          </div>
        </>}
      </div>

      <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:420,background:T.card,borderTop:`1px solid ${T.border}`,display:"flex",zIndex:10}}>
        {[{id:"home",ic:"🏠",l:"홈"},{id:"test",ic:"📝",l:"테스트"},{id:"report",ic:"📊",l:"리포트"},{id:"schedule",ic:"📅",l:"일정"}].map(t=>(
          <button key={t.id} style={navBtn(tab===t.id)} onClick={()=>setTab(t.id)}>
            <span style={{fontSize:20}}>{t.ic}</span><span>{t.l}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}