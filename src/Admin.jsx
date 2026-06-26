import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection, addDoc, deleteDoc, getDocs,
  doc, query, where, orderBy
} from "firebase/firestore";

const T = {
  bg:"#0f0f0f", card:"#1a1a1a", card2:"#222", border:"#2e2e2e",
  red:"#e01010", gray:"#888", gl:"#aaa", white:"#f0f0f0",
  green:"#4caf7d", blue:"#4a90d9", yellow:"#f0b429",
};

const ADMIN_PASSWORD = "jeet2024"; // 비밀번호 (나중에 변경 가능)

const inp = {
  background:T.card2, border:`1px solid ${T.border}`, borderRadius:8,
  color:T.white, padding:"10px 12px", fontSize:14, width:"100%",
  outline:"none", boxSizing:"border-box", marginBottom:8,
};
const btn = (color=T.red) => ({
  background:color, color:"#fff", border:"none", borderRadius:8,
  padding:"10px 16px", fontWeight:700, fontSize:14, cursor:"pointer",
});
const card = (ex={}) => ({
  background:T.card, borderRadius:12, padding:16, marginBottom:12,
  border:`1px solid ${T.border}`, ...ex
});

function Label({ children }) {
  return <div style={{fontSize:12,color:T.gray,marginBottom:4,marginTop:8}}>{children}</div>;
}

export default function Admin() {
  const [authed, setAuthed]   = useState(false);
  const [pw, setPw]           = useState("");
  const [pwErr, setPwErr]     = useState(false);
  const [tab, setTab]         = useState("student");
  const [students, setStudents] = useState([]);
  const [tests, setTests]     = useState([]);
  const [events, setEvents]   = useState([]);
  const [selStu, setSelStu]   = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState("");

  // 폼 상태
  const [stuForm, setStuForm] = useState({ name:"", grade:"", class:"", level:"", teacher:"", parentPhone:"" });
  const [testForm, setTestForm] = useState({ name:"", date:"", category:"단원평가", score:"", classAvg:"", courseAvg:"", levelAvg:"", rank:"", total:"", maxScore:"100", topics:"" });
  const [evtForm, setEvtForm]  = useState({ date:"", title:"", type:"exam", desc:"" });

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(""),2500); };

  // 데이터 불러오기
  async function fetchAll() {
    const stuSnap = await getDocs(collection(db,"students"));
    const stuList = stuSnap.docs.map(d=>({id:d.id,...d.data()}));
    setStudents(stuList);

    if(stuList.length>0) {
      const allTests = [];
      for(const s of stuList) {
        const tq = query(collection(db,"tests"), where("studentId","==",s.id), orderBy("date","desc"));
        const tSnap = await getDocs(tq);
        tSnap.docs.forEach(d=>allTests.push({id:d.id,studentName:s.name,...d.data()}));
      }
      setTests(allTests);
    }

    const evtSnap = await getDocs(query(collection(db,"events"), orderBy("date","asc")));
    setEvents(evtSnap.docs.map(d=>({id:d.id,...d.data()})));
  }

  useEffect(()=>{ if(authed) fetchAll(); },[authed]);

  // 로그인
  function handleLogin() {
    if(pw===ADMIN_PASSWORD) { setAuthed(true); setPwErr(false); }
    else setPwErr(true);
  }

  // 학생 추가
  async function addStudent() {
    if(!stuForm.name||!stuForm.grade) return alert("이름과 학년은 필수입니다.");
    setLoading(true);
    try {
      await addDoc(collection(db,"students"), stuForm);
      setStuForm({name:"",grade:"",class:"",level:"",teacher:"",parentPhone:""});
      await fetchAll();
      showToast("✅ 학생이 추가되었습니다!");
    } catch(e) {
      console.error(e);
      alert("저장 중 오류가 발생했습니다: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  // 학생 삭제
  async function delStudent(id) {
    if(!window.confirm("정말 삭제하시겠습니까?")) return;
    await deleteDoc(doc(db,"students",id));
    await fetchAll();
    showToast("🗑️ 학생이 삭제되었습니다.");
  }

  // 테스트 추가
  async function addTest() {
    if(!selStu||!testForm.name||!testForm.date||!testForm.score) return alert("학생, 시험명, 날짜, 점수는 필수입니다.");
    setLoading(true);
    try {
      await addDoc(collection(db,"tests"), {
        studentId: selStu,
        name:      testForm.name,
        date:      testForm.date,
        category:  testForm.category,
        score:     Number(testForm.score),
        classAvg:  Number(testForm.classAvg),
        courseAvg: Number(testForm.courseAvg),
        levelAvg:  Number(testForm.levelAvg),
        rank:      Number(testForm.rank),
        total:     Number(testForm.total),
        maxScore:  Number(testForm.maxScore)||100,
        topics:    testForm.topics ? testForm.topics.split(",").map(t=>t.trim()) : [],
      });
      setTestForm({name:"",date:"",category:"단원평가",score:"",classAvg:"",courseAvg:"",levelAvg:"",rank:"",total:"",maxScore:"100",topics:""});
      await fetchAll();
      showToast("✅ 테스트가 추가되었습니다!");
    } catch(e) {
      console.error(e);
      alert("저장 중 오류가 발생했습니다: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  // 테스트 삭제
  async function delTest(id) {
    if(!window.confirm("정말 삭제하시겠습니까?")) return;
    await deleteDoc(doc(db,"tests",id));
    await fetchAll();
    showToast("🗑️ 테스트가 삭제되었습니다.");
  }

  // 일정 추가
  async function addEvent() {
    if(!evtForm.date||!evtForm.title) return alert("날짜와 제목은 필수입니다.");
    setLoading(true);
    try {
      await addDoc(collection(db,"events"), evtForm);
      setEvtForm({date:"",title:"",type:"exam",desc:""});
      await fetchAll();
      showToast("✅ 일정이 추가되었습니다!");
    } catch(e) {
      console.error(e);
      alert("저장 중 오류가 발생했습니다: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  // 일정 삭제
  async function delEvent(id) {
    if(!window.confirm("정말 삭제하시겠습니까?")) return;
    await deleteDoc(doc(db,"events",id));
    await fetchAll();
    showToast("🗑️ 일정이 삭제되었습니다.");
  }

  // ── 로그인 화면 ──
  if(!authed) return (
    <div style={{background:T.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Noto Sans KR',sans-serif"}}>
      <div style={{...card(),width:320,textAlign:"center"}}>
        <div style={{fontSize:22,fontWeight:900,color:T.red,marginBottom:4,fontFamily:"Arial Black,sans-serif"}}>JEET</div>
        <div style={{fontSize:13,color:T.gray,marginBottom:24}}>관리자 페이지</div>
        <input type="password" placeholder="비밀번호 입력" value={pw}
          onChange={e=>setPw(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&handleLogin()}
          style={{...inp,textAlign:"center",marginBottom:4}}/>
        {pwErr&&<div style={{fontSize:12,color:T.red,marginBottom:8}}>비밀번호가 틀렸습니다.</div>}
        <button onClick={handleLogin} style={{...btn(),width:"100%",marginTop:8,padding:"12px 0"}}>로그인</button>
        <div style={{fontSize:11,color:T.gray,marginTop:12}}>기본 비밀번호: jeet2024</div>
      </div>
    </div>
  );

  const tabStyle = active => ({
    flex:1, padding:"10px 0", background:"none", border:"none",
    cursor:"pointer", color:active?T.red:T.gray, fontSize:13,
    fontWeight:active?700:400, borderBottom:`2px solid ${active?T.red:"transparent"}`,
  });

  return (
    <div style={{background:T.bg,minHeight:"100vh",color:T.white,fontFamily:"'Noto Sans KR',sans-serif",maxWidth:600,margin:"0 auto"}}>

      {/* 토스트 */}
      {toast&&(
        <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:T.card,border:`1px solid ${T.green}`,borderRadius:10,padding:"10px 20px",fontSize:13,color:T.green,zIndex:100,whiteSpace:"nowrap"}}>
          {toast}
        </div>
      )}

      {/* 헤더 */}
      <div style={{background:T.card,borderBottom:`1px solid ${T.border}`,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:10}}>
        <div>
          <span style={{fontWeight:900,fontSize:18,color:T.red,fontFamily:"Arial Black,sans-serif"}}>JEET</span>
          <span style={{fontSize:12,color:T.gray,marginLeft:8}}>관리자 페이지</span>
        </div>
        <button onClick={()=>setAuthed(false)} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:8,color:T.gray,fontSize:12,padding:"6px 12px",cursor:"pointer"}}>로그아웃</button>
      </div>

      {/* 탭 */}
      <div style={{background:T.card,borderBottom:`1px solid ${T.border}`,display:"flex"}}>
        <button style={tabStyle(tab==="student")} onClick={()=>setTab("student")}>👤 학생 관리</button>
        <button style={tabStyle(tab==="test")}    onClick={()=>setTab("test")}>📝 테스트 입력</button>
        <button style={tabStyle(tab==="event")}   onClick={()=>setTab("event")}>📅 일정 관리</button>
      </div>

      <div style={{padding:"16px"}}>

        {/* ── 학생 관리 ── */}
        {tab==="student"&&<>
          <div style={card()}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>➕ 학생 추가</div>
            <Label>이름 *</Label>
            <input style={inp} placeholder="예: 김지우" value={stuForm.name} onChange={e=>setStuForm(f=>({...f,name:e.target.value}))}/>
            <Label>학년 *</Label>
            <select style={{...inp,colorScheme:"dark"}} value={stuForm.grade} onChange={e=>setStuForm(f=>({...f,grade:e.target.value}))}>
              <option value="">선택</option>
              {["중1","중2","중3"].map(g=><option key={g}>{g}</option>)}
            </select>
            <Label>반</Label>
            <input style={inp} placeholder="예: 수학 심화 A반" value={stuForm.class} onChange={e=>setStuForm(f=>({...f,class:e.target.value}))}/>
            <Label>레벨</Label>
            <input style={inp} placeholder="예: Level 4" value={stuForm.level} onChange={e=>setStuForm(f=>({...f,level:e.target.value}))}/>
            <Label>담임 선생님</Label>
            <input style={inp} placeholder="예: 박민준 선생님" value={stuForm.teacher} onChange={e=>setStuForm(f=>({...f,teacher:e.target.value}))}/>
            <Label>학부모 전화번호</Label>
            <input style={inp} placeholder="예: 010-0000-0000" value={stuForm.parentPhone} onChange={e=>setStuForm(f=>({...f,parentPhone:e.target.value}))}/>
            <button onClick={addStudent} disabled={loading} style={{...btn(),width:"100%",marginTop:8,padding:"12px 0",opacity:loading?0.6:1}}>
              {loading?"저장 중...":"학생 추가"}
            </button>
          </div>

          <div style={card()}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>📋 등록된 학생 ({students.length}명)</div>
            {students.length===0?(
              <div style={{textAlign:"center",color:T.gray,padding:"20px 0"}}>등록된 학생이 없어요</div>
            ):students.map(s=>(
              <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px",background:T.card2,borderRadius:10,marginBottom:8}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700}}>{s.name}</div>
                  <div style={{fontSize:12,color:T.gray,marginTop:2}}>{s.grade} · {s.class} · {s.level}</div>
                  <div style={{fontSize:11,color:T.gray}}>{s.teacher} · {s.parentPhone}</div>
                </div>
                <button onClick={()=>delStudent(s.id)} style={{...btn("#333"),fontSize:12,padding:"6px 12px",border:`1px solid ${T.border}`}}>삭제</button>
              </div>
            ))}
          </div>
        </>}

        {/* ── 테스트 입력 ── */}
        {tab==="test"&&<>
          <div style={card()}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>➕ 테스트 결과 입력</div>
            <Label>학생 선택 *</Label>
            <select style={{...inp,colorScheme:"dark"}} value={selStu} onChange={e=>setSelStu(e.target.value)}>
              <option value="">학생 선택</option>
              {students.map(s=><option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
            </select>
            <Label>시험명 *</Label>
            <input style={inp} placeholder="예: 6월 단원평가" value={testForm.name} onChange={e=>setTestForm(f=>({...f,name:e.target.value}))}/>
            <Label>날짜 *</Label>
            <input type="date" style={{...inp,colorScheme:"dark"}} value={testForm.date} onChange={e=>setTestForm(f=>({...f,date:e.target.value}))}/>
            <Label>구분</Label>
            <select style={{...inp,colorScheme:"dark"}} value={testForm.category} onChange={e=>setTestForm(f=>({...f,category:e.target.value}))}>
              {["단원평가","모의고사","레벨테스트"].map(c=><option key={c}>{c}</option>)}
            </select>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div>
                <Label>내 점수 *</Label>
                <input style={inp} type="number" placeholder="예: 92" value={testForm.score} onChange={e=>setTestForm(f=>({...f,score:e.target.value}))}/>
              </div>
              <div>
                <Label>만점</Label>
                <input style={inp} type="number" placeholder="100" value={testForm.maxScore} onChange={e=>setTestForm(f=>({...f,maxScore:e.target.value}))}/>
              </div>
              <div>
                <Label>반 평균</Label>
                <input style={inp} type="number" placeholder="예: 83.1" value={testForm.classAvg} onChange={e=>setTestForm(f=>({...f,classAvg:e.target.value}))}/>
              </div>
              <div>
                <Label>과정 평균</Label>
                <input style={inp} type="number" placeholder="예: 80.2" value={testForm.courseAvg} onChange={e=>setTestForm(f=>({...f,courseAvg:e.target.value}))}/>
              </div>
              <div>
                <Label>레벨 평균</Label>
                <input style={inp} type="number" placeholder="예: 85.9" value={testForm.levelAvg} onChange={e=>setTestForm(f=>({...f,levelAvg:e.target.value}))}/>
              </div>
              <div>
                <Label>석차</Label>
                <input style={inp} type="number" placeholder="예: 2" value={testForm.rank} onChange={e=>setTestForm(f=>({...f,rank:e.target.value}))}/>
              </div>
              <div>
                <Label>총 인원</Label>
                <input style={inp} type="number" placeholder="예: 18" value={testForm.total} onChange={e=>setTestForm(f=>({...f,total:e.target.value}))}/>
              </div>
            </div>

            <Label>출제 범위 (쉼표로 구분)</Label>
            <input style={inp} placeholder="예: 이차함수, 피타고라스" value={testForm.topics} onChange={e=>setTestForm(f=>({...f,topics:e.target.value}))}/>

            <button onClick={addTest} disabled={loading} style={{...btn(),width:"100%",marginTop:8,padding:"12px 0",opacity:loading?0.6:1}}>
              {loading?"저장 중...":"테스트 추가"}
            </button>
          </div>

          <div style={card()}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>📋 입력된 테스트 ({tests.length}개)</div>
            {tests.length===0?(
              <div style={{textAlign:"center",color:T.gray,padding:"20px 0"}}>입력된 테스트가 없어요</div>
            ):tests.map(t=>(
              <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px",background:T.card2,borderRadius:10,marginBottom:8}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700}}>{t.studentName} — {t.name}</div>
                  <div style={{fontSize:12,color:T.gray,marginTop:2}}>{t.date} · {t.category} · {t.score}점</div>
                  <div style={{fontSize:11,color:T.gray}}>반평균 {t.classAvg} / 석차 {t.rank}/{t.total}위</div>
                </div>
                <button onClick={()=>delTest(t.id)} style={{...btn("#333"),fontSize:12,padding:"6px 12px",border:`1px solid ${T.border}`}}>삭제</button>
              </div>
            ))}
          </div>
        </>}

        {/* ── 일정 관리 ── */}
        {tab==="event"&&<>
          <div style={card()}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>➕ 일정 추가</div>
            <Label>날짜 *</Label>
            <input type="date" style={{...inp,colorScheme:"dark"}} value={evtForm.date} onChange={e=>setEvtForm(f=>({...f,date:e.target.value}))}/>
            <Label>제목 *</Label>
            <input style={inp} placeholder="예: 7월 모의고사" value={evtForm.title} onChange={e=>setEvtForm(f=>({...f,title:e.target.value}))}/>
            <Label>유형</Label>
            <select style={{...inp,colorScheme:"dark"}} value={evtForm.type} onChange={e=>setEvtForm(f=>({...f,type:e.target.value}))}>
              <option value="exam">시험</option>
              <option value="special">특강</option>
              <option value="event">공지</option>
            </select>
            <Label>설명</Label>
            <textarea rows={3} style={{...inp,resize:"none",lineHeight:1.6}} placeholder="상세 내용을 입력하세요" value={evtForm.desc} onChange={e=>setEvtForm(f=>({...f,desc:e.target.value}))}/>
            <button onClick={addEvent} disabled={loading} style={{...btn(),width:"100%",padding:"12px 0",opacity:loading?0.6:1}}>
              {loading?"저장 중...":"일정 추가"}
            </button>
          </div>

          <div style={card()}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>📋 등록된 일정 ({events.length}개)</div>
            {events.length===0?(
              <div style={{textAlign:"center",color:T.gray,padding:"20px 0"}}>등록된 일정이 없어요</div>
            ):events.map(e=>(
              <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px",background:T.card2,borderRadius:10,marginBottom:8}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700}}>{e.title}</div>
                  <div style={{fontSize:12,color:T.gray,marginTop:2}}>{e.date} · {e.type==="exam"?"시험":e.type==="special"?"특강":"공지"}</div>
                  {e.desc&&<div style={{fontSize:11,color:T.gray,marginTop:2}}>{e.desc}</div>}
                </div>
                <button onClick={()=>delEvent(e.id)} style={{...btn("#333"),fontSize:12,padding:"6px 12px",border:`1px solid ${T.border}`}}>삭제</button>
              </div>
            ))}
          </div>
        </>}
      </div>
    </div>
  );
}