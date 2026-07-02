import { useState } from "react";
import { auth } from "./firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";

const T = {
  bg:"#0f0f0f", card:"#1a1a1a", card2:"#222", border:"#2e2e2e",
  red:"#e01010", gray:"#888", gl:"#aaa", white:"#f0f0f0",
};

const inp = {
  background:T.card2, border:`1px solid ${T.border}`, borderRadius:8,
  color:T.white, padding:"12px 14px", fontSize:16, width:"100%",
  outline:"none", boxSizing:"border-box", textAlign:"center", letterSpacing:4,
};

export default function Login({ onLogin }) {
  const [phone, setPhone]     = useState("");
  const [code, setCode]       = useState("");
  const [step, setStep]       = useState("phone"); // phone | code
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // reCAPTCHA 설정
  function setupRecaptcha() {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {},
      });
    }
  }

  // 인증번호 전송
  async function sendCode() {
    setError("");
    const formatted = phone.startsWith("0")
      ? "+82" + phone.slice(1)
      : phone;

    if (formatted.length < 12) {
      setError("전화번호를 정확히 입력해주세요. (예: 01012345678)");
      return;
    }

    setLoading(true);
    try {
      setupRecaptcha();
      const result = await signInWithPhoneNumber(auth, formatted, window.recaptchaVerifier);
      setConfirm(result);
      setStep("code");
    } catch (e) {
      console.error(e);
      if (e.code === "auth/invalid-phone-number") {
        setError("올바르지 않은 전화번호 형식이에요.");
      } else if (e.code === "auth/too-many-requests") {
        setError("너무 많은 시도가 있었어요. 잠시 후 다시 시도해주세요.");
      } else {
        setError("인증번호 전송에 실패했습니다. 다시 시도해주세요.");
      }
      window.recaptchaVerifier = null;
    } finally {
      setLoading(false);
    }
  }

  // 인증번호 확인
  async function verifyCode() {
    setError("");
    if (code.length !== 6) {
      setError("인증번호 6자리를 입력해주세요.");
      return;
    }
    setLoading(true);
    try {
      const result = await confirm.confirm(code);
      onLogin(result.user);
    } catch (e) {
      console.error(e);
      setError("인증번호가 올바르지 않아요. 다시 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{background:T.bg,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Noto Sans KR',sans-serif",padding:20}}>

      {/* 로고 */}
      <div style={{textAlign:"center",marginBottom:40}}>
        <div style={{fontWeight:900,fontSize:36,color:T.red,letterSpacing:-1,fontFamily:"Arial Black,sans-serif"}}>JEET</div>
        <div style={{fontWeight:600,fontSize:12,color:T.gray,letterSpacing:3}}>EDUCATION</div>
        <div style={{fontSize:13,color:T.gl,marginTop:6}}>중등자사센터</div>
      </div>

      {/* 카드 */}
      <div style={{background:T.card,borderRadius:16,padding:28,width:"100%",maxWidth:360,border:`1px solid ${T.border}`}}>

        {step === "phone" ? <>
          <div style={{fontSize:18,fontWeight:700,color:T.white,marginBottom:6}}>학부모 로그인</div>
          <div style={{fontSize:13,color:T.gray,marginBottom:24}}>등록된 전화번호로 인증번호를 받으세요</div>

          <div style={{fontSize:12,color:T.gray,marginBottom:6}}>전화번호</div>
          <input
            style={inp}
            type="tel"
            placeholder="01012345678"
            value={phone}
            onChange={e=>setPhone(e.target.value.replace(/[^0-9]/g,""))}
            onKeyDown={e=>e.key==="Enter"&&sendCode()}
            maxLength={11}
          />
          <div style={{fontSize:11,color:T.gray,marginTop:6,marginBottom:20}}>'-' 없이 숫자만 입력하세요</div>

          {error && <div style={{fontSize:13,color:T.red,marginBottom:14,textAlign:"center"}}>{error}</div>}

          <button onClick={sendCode} disabled={loading}
            style={{background:T.red,color:"#fff",border:"none",borderRadius:10,padding:"14px 0",width:"100%",fontWeight:700,fontSize:15,cursor:"pointer",opacity:loading?0.6:1}}>
            {loading ? "전송 중..." : "인증번호 받기"}
          </button>

        </> : <>
          <div style={{fontSize:18,fontWeight:700,color:T.white,marginBottom:6}}>인증번호 입력</div>
          <div style={{fontSize:13,color:T.gray,marginBottom:6}}>
            <span style={{color:T.white,fontWeight:600}}>{phone}</span> 으로 전송된
          </div>
          <div style={{fontSize:13,color:T.gray,marginBottom:24}}>6자리 인증번호를 입력하세요</div>

          <input
            style={{...inp,fontSize:24,letterSpacing:12}}
            type="number"
            placeholder="000000"
            value={code}
            onChange={e=>setCode(e.target.value.slice(0,6))}
            onKeyDown={e=>e.key==="Enter"&&verifyCode()}
            maxLength={6}
          />

          {error && <div style={{fontSize:13,color:T.red,marginTop:10,marginBottom:4,textAlign:"center"}}>{error}</div>}

          <button onClick={verifyCode} disabled={loading}
            style={{background:T.red,color:"#fff",border:"none",borderRadius:10,padding:"14px 0",width:"100%",fontWeight:700,fontSize:15,cursor:"pointer",marginTop:16,opacity:loading?0.6:1}}>
            {loading ? "확인 중..." : "로그인"}
          </button>

          <button onClick={()=>{setStep("phone");setCode("");setError("");window.recaptchaVerifier=null;}}
            style={{background:"none",border:"none",color:T.gray,fontSize:13,cursor:"pointer",marginTop:12,width:"100%"}}>
            ← 전화번호 다시 입력
          </button>
        </>}
      </div>

      {/* reCAPTCHA (invisible) */}
      <div id="recaptcha-container"/>
    </div>
  );
}