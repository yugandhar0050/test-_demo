import React,{useEffect,useRef,useState}from'react';import{Routes,Route,Link,NavLink,useNavigate,useParams,useLocation}from'react-router-dom';import{ArrowRight,ArrowUpRight,BookOpen,CalendarDays,CalendarCheck,ChartNoAxesCombined,CheckCircle2,Clock3,GraduationCap,LayoutDashboard,LogOut,Menu,ShieldCheck,Target,Trophy,Users,Bell,Search,LockKeyhole,ClipboardList,CircleHelp}from'lucide-react';import{ResponsiveContainer,LineChart,Line,XAxis,YAxis,Tooltip,CartesianGrid}from'recharts';import api from'./api';import AdminRoadmapProgress from './AdminRoadmapProgress';import StudentDailyLog from './StudentDailyLog';import AdminDailyRecords from './AdminDailyRecords';
const Logo=({to='/'})=> <Link className="brand" to={to}><img src="/company-logo.png" alt="Koundinyasa Technology Services"/><i/><span>EXAM<br/><b>PORTAL</b></span></Link>;
function Header(){return <header className="header"><Logo/><nav><a href="/#features">Features</a><a href="/#how">How it works</a><a href="/#about">About</a><Link to="/login" className="login-link">Log in</Link><Link className="btn" to="/signup">Get started <ArrowRight size={16}/></Link></nav></header>}
const feats=[['Secure by design','Role-based access and server-validated exam windows.',ShieldCheck],['Exam schedule','See what is coming up and start eligible exams on time.',CalendarDays],['Performance insights','Track your own results and identify improvement areas.',ChartNoAxesCombined],['Clear scorecards','Review published marks and result status.',Trophy],['Focused exam mode','A clean workspace with saved answers and submission.',Clock3],['Admin oversight','Manage exams and review aggregate performance.',Users]];
function Landing(){return <><Header/><main><section className="hero"><div><label className="eyebrow">EXAMINATION MANAGEMENT, REIMAGINED</label><h1>Your exams.<br/><em>Your progress.</em><br/>Your future.</h1><p>A smarter, clearer way to take examinations, track your academic progress, and turn every result into your next step.</p><div className="actions"><Link className="btn" to="/signup">Get started <ArrowRight size={17}/></Link><a className="btn light" href="#features">Explore features <ArrowUpRight size={16}/></a></div><div className="trust"><ShieldCheck size={18}/><span><b>Built for focused learning</b><small>Employees · Examiners · Administrators</small></span></div></div><div className="hero-art"><div className="art-card"><div className="art-head"><span><small>EMPLOYEE WORKSPACE</small><h3>Good afternoon 👋</h3><p>Your learning journey, at a glance.</p></span><div className="avatar">H</div></div><div className="mini-stats"><div><BookOpen/><small>Exams available</small><b>—</b></div><div><Target/><small>Average score</small><b>—</b></div></div><div className="chart-box"><b>Performance overview</b><span>Live data after login</span><svg viewBox="0 0 380 105"><path d="M0 83 C35 75 50 55 78 68 S125 36 154 51 S198 24 229 39 S274 16 301 29 S350 7 380 15 L380 105 L0 105Z" fill="#18b9d722"/><path d="M0 83 C35 75 50 55 78 68 S125 36 154 51 S198 24 229 39 S274 16 301 29 S350 7 380 15" fill="none" stroke="#16b8d7" strokeWidth="3"/></svg></div><div className="mini-next"><CalendarDays/><span><small>YOUR NEXT STEP</small><b>Your next exam, all in one place</b></span><ArrowUpRight/></div><div className="art-foot">● Portal overview preview <span>KP · TECHNOLOGY</span></div></div><div className="float f1"><CheckCircle2/><span><b>Stay on track</b><small>Know what comes next</small></span></div><div className="float f2"><Trophy/><span><b>Progress that matters</b><small>Your results, clearly presented</small></span></div></div></section><div className="strip"><span>ONE CONNECTED EXPERIENCE</span><b><ShieldCheck/> Secure exams</b><b><ChartNoAxesCombined/> Useful insights</b><b><GraduationCap/> Employee-first design</b></div><section className="section" id="features"><div className="center"><label className="eyebrow">EVERYTHING IN ONE PLACE</label><h2>Designed around the<br/><em>whole exam journey.</em></h2><p>From your first sign-in to your published scorecard, the essentials stay clear and connected.</p></div><div className="features">{feats.map(([t,d,I],i)=><article key={t}><div className={'feature-icon c'+i}><I/></div><h3>{t}</h3><p>{d}</p><small>0{i+1}</small></article>)}</div></section><section className="how" id="how"><div><label className="eyebrow">A CLEARER WORKFLOW</label><h2>Less friction.<br/><em>More focus.</em></h2><p>One dependable place for employees to prepare, participate, and understand their results.</p>{[['01','Sign in securely','Use your registered employee ID and password.'],['02','Take your exam','Check eligibility, read instructions, and submit answers.'],['03','Learn from results','Review published scorecards and your performance history.']].map(x=><div className="step" key={x[0]}><span>{x[0]}</span><div><b>{x[1]}</b><p>{x[2]}</p></div></div>)}<Link to="/signup" className="link">Create your employee account <ArrowRight size={16}/></Link></div><aside><BookOpen/><small>YOUR NEXT CHAPTER</small><h3>Make every<br/>attempt count.</h3><p>Clear schedules. Transparent results. A better view of your progress.</p><hr/><span>LEARN · ASSESS · GROW</span></aside></section><section className="cta" id="about"><div><label className="eyebrow">READY WHEN YOU ARE</label><h2>Your next step starts here.</h2><p>Sign in to see your exams, or create your account to get started.</p></div><Link className="btn" to="/signup">Join the portal <ArrowRight size={17}/></Link></section></main><footer><p>A connected examination experience by Koundinyasa Technology Services.</p><span>© {new Date().getFullYear()} Koundinyasa Technology Services Pvt. Ltd.</span></footer></>}
function Auth({signup=false}){const nav=useNavigate(),[v,setV]=useState({firstName:'',lastName:'',studentId:'',phone:'',email:'',domain:'',password:'',confirmPassword:''}),[err,setErr]=useState(''),[busy,setBusy]=useState(false),[show,setShow]=useState(false);function change(e){setV({...v,[e.target.name]:e.target.value})}async function submit(e){e.preventDefault();setErr('');if(signup&&v.password!==v.confirmPassword)return setErr('Passwords do not match.');if(signup&&!v.domain)return setErr('Please select your domain.');setBusy(true);try{const {data}=await api.post(signup?'/auth/register':'/auth/login',signup?v:{id:v.studentId,password:v.password});sessionStorage.setItem('exam_token',data.token);sessionStorage.setItem('exam_user',JSON.stringify(data.user));nav(data.user.role==='admin'?'/admin':'/dashboard')}catch(e){setErr(e.response?.data?.error||'Unable to connect. Check the API and try again.')}finally{setBusy(false)}}return <div className="auth"><div className="auth-top"><Logo/><Link to="/">← Back to home</Link></div><div className="auth-grid"><div className="auth-copy"><label className="eyebrow">YOUR ACADEMIC WORKSPACE</label><h1>Every result<br/>has a <em>next step.</em></h1><p>Stay organized, take exams with confidence, and see your progress in one secure place.</p><div className="auth-benefit"><ShieldCheck/><span><b>Secure access</b><small>Your account, protected</small></span></div><div className="auth-benefit"><ChartNoAxesCombined/><span><b>Clear progress</b><small>Your performance, in context</small></span></div></div><div className="auth-card"><div className="auth-mark"><GraduationCap/></div><label className="eyebrow">{signup?'GET STARTED':'WELCOME BACK'}</label><h2>{signup?'Create your account':'Welcome back'}</h2><p>{signup?'Register with your employee details to get started.':'Sign in to access your examination workspace.'}</p><form onSubmit={submit}>{signup&&<div className="two"><label>First name<input name="firstName" value={v.firstName} onChange={change} required placeholder="First name"/></label><label>Last name<input name="lastName" value={v.lastName} onChange={change} required placeholder="Last name"/></label></div>}<label>{signup?'Employee ID':'Employee ID or email'}<input name="studentId" value={v.studentId} onChange={change} required placeholder={signup?'6 digits, starts with 294 or 295':'Employee ID or registered email'} pattern={signup?'(?:294|295)[0-9]{3}':undefined} title={signup?'Employee ID must be six digits beginning with 294 or 295.':undefined}/></label>{signup&&<div className="two"><label>Phone number<input name="phone" value={v.phone} onChange={change} required minLength="10" placeholder="+91…"/></label><label>Email address<input name="email" type="email" value={v.email} onChange={change} required placeholder="you@college.edu"/></label></div>}{signup&&<label>Select Your Domain<select name="domain" value={v.domain} onChange={change} required aria-label="Select Your Domain"><option value="">-- Choose your learning domain --</option><option value="fullstack">Full Stack Development</option><option value="database">Database</option><option value="testing">Testing</option><option value="cybersecurity">Cybersecurity</option><option value="sap">SAP</option><option value="devops">DevOps</option></select></label>}<label>Password<div className="pw"><input name="password" type={show?'text':'password'} value={v.password} onChange={change} required minLength="8" placeholder="At least 8 characters"/><button type="button" onClick={()=>setShow(!show)}>{show?'Hide':'Show'}</button></div></label>{signup&&<label>Confirm password<input name="confirmPassword" type={show?'text':'password'} value={v.confirmPassword} onChange={change} required minLength="8" placeholder="Re-enter password"/></label>}{!signup&&<div className="remember"><label><input type="checkbox"/> Remember this device</label><small>Forgot password? Contact your administrator.</small></div>}{err&&<div className="error">{err}</div>}<button className="btn submit" disabled={busy}>{busy?'Please wait…':signup?'Create employee account':'Sign in securely'} <ArrowRight size={16}/></button></form><div className="switch">{signup?'Already registered?':'New to the portal?'} <Link to={signup?'/login':'/signup'}>{signup?'Sign in':'Create an account'}</Link></div><div className="secure"><LockKeyhole size={13}/> Your information is handled securely.</div></div></div><div className="copyright">© {new Date().getFullYear()} Koundinyasa Technology Services Pvt. Ltd.</div></div>}
function useUser(){const [s,setS]=useState(()=>{let user=null;try{user=JSON.parse(sessionStorage.getItem('exam_user')||'null')}catch{}return{loading:Boolean(sessionStorage.getItem('exam_token')),user}});useEffect(()=>{if(!sessionStorage.getItem('exam_token')){setS({loading:false,user:null});return}api.get('/auth/me').then(r=>{sessionStorage.setItem('exam_user',JSON.stringify(r.data.user));if(r.data.token)sessionStorage.setItem('exam_token',r.data.token);setS({loading:false,user:r.data.user})}).catch(e=>{if(e.response?.status===401){sessionStorage.removeItem('exam_token');sessionStorage.removeItem('exam_user');setS({loading:false,user:null});return}let cached=null;try{cached=JSON.parse(sessionStorage.getItem('exam_user')||'null')}catch{}setS({loading:false,user:cached})})},[]);return s}
const DOMAIN_LABELS={fullstack:'Full Stack Development',database:'Database',testing:'Testing',cybersecurity:'Cybersecurity',sap:'SAP',devops:'DevOps'};
const navStudent=[['Overview',LayoutDashboard,'/dashboard'],['Daily learning log',CalendarCheck,'/daily-log'],['My exams',BookOpen,'/exams'],['Results & scorecards',Trophy,'/results'],['Notifications',Bell,'/notifications']],navAdmin=[['Overview',LayoutDashboard,'/admin'],['Daily records',CalendarCheck,'/admin/daily-records'],['Employees',Users,'/admin/students'],['Examinations',ClipboardList,'/admin/exams'],['Question bank',BookOpen,'/admin/questions'],['Employee results',Trophy,'/admin/results'],['Exam incidents',ShieldCheck,'/admin/incidents'],['Roadmap progress',BookOpen,'/admin/student-progress'],['Performance reports',ChartNoAxesCombined,'/admin/reports']];
function isRouteActive(target,current){if(target==='/admin'||target==='/dashboard')return current===target;if(target==='/exams'&&(current.startsWith('/exam/')||current.startsWith('/attempt/')))return true;return current===target||current.startsWith(target+'/')}
function Layout({children,admin=false}){const n=useNavigate(),loc=useLocation(),u=JSON.parse(sessionStorage.getItem('exam_user')||'{}'),links=admin?navAdmin:navStudent;function logout(){sessionStorage.removeItem('exam_token');sessionStorage.removeItem('exam_user');n('/login')}return <div className="portal"><aside className="sidebar"><Logo to={admin?'/admin':'/dashboard'}/><label>{admin?'ADMINISTRATION':'EMPLOYEE SPACE'}</label>{links.map(([t,I,p])=><NavLink key={p} to={p} className={()=>isRouteActive(p,loc.pathname)?'active':undefined}><I size={18}/>{t}</NavLink>)}<div className="side-bottom"><div><CircleHelp/><span><b>Need help?</b><small>Contact your portal admin</small></span></div><button onClick={logout}><LogOut size={17}/> Sign out</button></div></aside><main className="portal-main"><header className="portal-header"><div><small>{admin?'ADMIN CONSOLE':'EMPLOYEE WORKSPACE'}</small><h3>{admin?'Administration':'My learning space'}</h3></div><div className="user"><span>{(u.first_name||'S')[0].toUpperCase()}</span><div><b>{u.first_name||'Employee'} {u.last_name||''}</b><small>{u.student_id||'Account'}{u.domain?` · ${DOMAIN_LABELS[u.domain]||u.domain}`:''}</small></div><button onClick={logout} title="Sign out"><LogOut size={16}/></button></div></header><div className="portal-content">{children}</div></main></div>}
function Guard({children,admin=false}){const a=useUser(),n=useNavigate(),allowed=a.user&&(admin?a.user.role==='admin':a.user.role==='student');useEffect(()=>{if(!a.loading){if(!a.user)n('/login',{replace:true});else if(!allowed)n(a.user.role==='admin'?'/admin':'/dashboard',{replace:true})}},[a.loading,a.user,allowed,n]);if(a.loading)return <div className="loading">Loading your secure workspace…</div>;return allowed?children:null}
function Stat({label,value,sub,I,tone}){return <div className="stat"><span className={'stat-icon '+tone}><I/></span><div><small>{label}</small><b>{value??'—'}</b><em>{sub}</em></div></div>}
function RoadmapProgress(){
  const[data,setData]=useState(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState({}),[err,setErr]=useState(''),[message,setMessage]=useState('');
  useEffect(()=>{api.get('/student/roadmap').then(r=>setData(r.data)).catch(e=>setErr(e.response?.data?.error||'Unable to load your learning roadmap.')).finally(()=>setLoading(false))},[]);
  function replaceTopic(topicId,changes){setData(current=>{if(!current)return current;const topics=current.topics.map(topic=>topic.id===topicId?{...topic,...changes}:topic),completed=topics.filter(topic=>topic.is_completed).length,total=topics.length;return {...current,topics,progress:{total,completed,pending:total-completed,percentage:total?Math.round(completed/total*100):0}}})}
  async function toggle(topic){const next=!topic.is_completed;setErr('');setMessage('');setSaving(current=>({...current,[topic.id]:true}));replaceTopic(topic.id,{is_completed:next});try{const r=await api.patch(`/student/progress/${topic.id}`,{is_completed:next});replaceTopic(topic.id,{is_completed:r.data.progress.is_completed,updated_at:r.data.progress.updated_at});setMessage('Your roadmap progress was saved.')}catch(e){replaceTopic(topic.id,{is_completed:topic.is_completed});setErr(e.response?.data?.error||'Could not save this topic. Your previous progress was restored.')}finally{setSaving(current=>({...current,[topic.id]:false}))}}
  const modules=(data?.topics||[]).reduce((groups,topic)=>{const key=topic.module_id;let module=groups.find(item=>item.id===key);if(!module){module={id:key,name:topic.module_name,topics:[]};groups.push(module)}module.topics.push(topic);return groups},[]),progress=data?.progress||{total:0,completed:0,pending:0,percentage:0};
  return <section className="panel roadmap-panel"><div className="roadmap-heading"><div><label className="eyebrow">YOUR LEARNING ROADMAP</label><h3>Track your learning progress</h3><p>Check off topics as you complete them. Your progress saves automatically.</p></div><div className="roadmap-percent">{progress.percentage}%<small>complete</small></div></div>{loading?<div className="roadmap-loading">Loading your roadmap…</div>:<><div className="roadmap-progress-summary"><div className="roadmap-summary-stats"><span><b>{progress.total}</b><small>Total topics</small></span><span><b>{progress.completed}</b><small>Completed</small></span><span><b>{progress.pending}</b><small>Pending</small></span></div><div className="roadmap-progress-track" role="progressbar" aria-label="Roadmap completion" aria-valuenow={progress.percentage} aria-valuemin="0" aria-valuemax="100"><span style={{width:`${progress.percentage}%`}}/></div></div>{err&&<div className="error" role="alert">{err}</div>}{message&&<div className="success" role="status">{message}</div>}{modules.length?modules.map(module=><section className="roadmap-module" key={module.id}><h4>{module.name}</h4><div className="roadmap-topic-list">{module.topics.map(topic=><label className={`roadmap-topic ${topic.is_completed?'is-complete':''}`} key={topic.id}><input type="checkbox" checked={topic.is_completed} disabled={Boolean(saving[topic.id])} onChange={()=>toggle(topic)} aria-label={`Mark ${topic.name} ${topic.is_completed?'pending':'completed'}`}/><span className="roadmap-topic-copy"><b>{topic.name}</b>{topic.description&&<small>{topic.description}</small>}</span><span className="roadmap-topic-status">{saving[topic.id]?'Saving…':topic.is_completed?'Completed':'Pending'}</span></label>)}</div></section>):<div className="empty roadmap-empty"><BookOpen/><b>No roadmap topics available yet</b><p>Topics assigned to your course will appear here. Contact your administrator if you think this is an error.</p></div>}</>}</section>
}
function Dashboard(){const[d,setD]=useState(null),[err,setErr]=useState(''),u=JSON.parse(sessionStorage.getItem('exam_user')||'{}');useEffect(()=>{api.get('/dashboard/summary').then(r=>setD(r.data)).catch(e=>setErr(e.response?.data?.error||'Unable to load dashboard data.'))},[]);const s=d?.summary||{};return <Layout><div className="page-intro"><div><label className="eyebrow">YOUR OVERVIEW</label><h1>Welcome back, {u.first_name||'Employee'}<em>.</em></h1><p>Here’s what’s happening with your exams and progress.</p></div><span className="date"><CalendarDays size={16}/>{new Date().toLocaleDateString()}</span></div>{err&&<div className="error">{err}</div>}<div className="stats"><Stat label="Available exams" value={s.total_exams} sub="Published examinations" I={BookOpen} tone="a"/><Stat label="Completed" value={s.completed_exams} sub="Submitted attempts" I={CheckCircle2} tone="b"/><Stat label="Upcoming" value={s.upcoming_exams} sub="Scheduled ahead" I={CalendarDays} tone="c"/><Stat label="Average score" value={s.average_score==null?'—':s.average_score+'%'} sub="Published results" I={Target} tone="d"/></div><div className="dash-grid"><section className="panel"><div className="panel-title"><div><label className="eyebrow">YOUR JOURNEY</label><h3>Performance overview</h3></div><span>Published results</span></div>{d?.performance?.length?<ResponsiveContainer width="100%" height={260}><LineChart data={d.performance}><CartesianGrid strokeDasharray="3 3" stroke="#e9eff5"/><XAxis dataKey="title" hide/><YAxis domain={[0,100]}/><Tooltip/><Line type="monotone" dataKey="percentage" stroke="#0fb4d2" strokeWidth={3}/></LineChart></ResponsiveContainer>:<div className="empty"><ChartNoAxesCombined/><b>Your progress will appear here</b><p>After results are published, your performance trend will be shown here.</p></div>}</section><section className="panel"><div className="panel-title"><div><label className="eyebrow">QUICK ACCESS</label><h3>Next steps</h3></div></div><Link className="quick" to="/exams"><BookOpen/><span><b>Browse examinations</b><small>Review exams and dates</small></span><ArrowRight/></Link><Link className="quick" to="/results"><Trophy/><span><b>View your scorecards</b><small>Review published results</small></span><ArrowRight/></Link><div className="tip"><BookOpen/><span><b>A helpful reminder</b><p>Read exam instructions before starting and submit before the timer expires.</p></span></div></section></div><RoadmapProgress/><div className="privacy"><ShieldCheck/><span><b>Your workspace is personal to you.</b><small>Exam history, answers, and results are restricted to your authenticated account.</small></span></div></Layout>}
function Exams(){const[e,setE]=useState([]),[s,setS]=useState(''),[err,setErr]=useState('');useEffect(()=>{api.get('/exams').then(r=>setE(r.data.exams)).catch(x=>setErr(x.response?.data?.error||'Unable to load exams.'))},[]);return <Layout><div className="page-intro"><div><label className="eyebrow">ASSESSMENTS</label><h1>My exams</h1><p>Review the schedule and open an exam when it is available.</p></div><div className="search"><Search/><input placeholder="Search exams…" value={s} onChange={e=>setS(e.target.value)}/></div></div>{err&&<div className="error">{err}</div>}<div className="panel table-panel"><h3>Examination schedule</h3><div className="table-scroll"><table><thead><tr><th>Exam</th><th>Subject</th><th>Start date</th><th>Duration</th><th>Status</th><th></th></tr></thead><tbody>{e.filter(x=>(x.title+' '+(x.subject||'')).toLowerCase().includes(s.toLowerCase())).map(x=><tr key={x.id}><td><b>{x.title}</b><small>{x.description||'Examination assessment'}</small></td><td>{x.subject||'General'}</td><td>{new Date(x.starts_at).toLocaleString()}</td><td>{x.duration_minutes} min</td><td><span className="pill">{x.status}</span></td><td><Link className="link" to={'/exam/'+x.id}>View <ArrowRight size={14}/></Link></td></tr>)}</tbody></table>{!e.length&&<div className="empty"><CalendarDays/><b>No examinations to show yet</b><p>Published exams will appear here.</p></div>}</div></div></Layout>}
function ExamDetail(){
  const {id}=useParams(), n=useNavigate(), [d,setD]=useState(null), [eligibility,setEligibility]=useState(null), [err,setErr]=useState(''), [busy,setBusy]=useState(false);

  useEffect(()=>{
    let active = true;
    Promise.all([
      api.get('/exams/'+id),
      api.get('/exams/'+id+'/eligibility').catch(e => ({ data: { eligible: false, reason: e.response?.data?.error || 'Unable to check eligibility.' } }))
    ]).then(([rExam, rElig]) => {
      if(!active) return;
      setD(rExam.data);
      setEligibility(rElig.data);
    }).catch(e => {
      if(!active) return;
      setErr(e.response?.data?.error || 'Unable to load exam.');
    });
    return () => { active = false; };
  }, [id]);

  async function start(){
    if (busy) return;
    setBusy(true);
    setErr('');
    try {
      // 1. Authorize with backend and create or resume attempt
      const r = await api.post('/exams/'+id+'/start');
      const attempt = r.data?.attempt;
      if (!attempt?.id) throw new Error('Could not initialize exam attempt.');

      // 2. Request fullscreen directly within the user click flow
      let fullscreenSuccess = false;
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          fullscreenSuccess = Boolean(document.fullscreenElement);
        }
      } catch (fsErr) {
        console.warn('Fullscreen entry rejected or deferred:', fsErr);
        fullscreenSuccess = false;
      }

      // 3. Navigate to the exam workspace
      n('/attempt/'+attempt.id, {
        state: {
          examId: id,
          expiresAt: attempt.expires_at,
          fullscreenReady: fullscreenSuccess
        }
      });
    } catch (e) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(()=>{});
      }
      setErr(e.response?.data?.error || e.message || 'Unable to start exam.');
    } finally {
      setBusy(false);
    }
  }

  const isEligible = eligibility?.eligible !== false;
  const isUpcoming = eligibility?.windowState === 'upcoming';
  const isEnded = eligibility?.windowState === 'ended';
  const hasActiveAttempt = Boolean(eligibility?.canResume);
  const hasSubmitted = Boolean(eligibility?.hasSubmitted);
  const hasQuestions = Boolean(d?.questions?.length);
  const canClick = !busy && hasQuestions && (isEligible || hasActiveAttempt);

  return (
    <Layout>
      <div className="page-intro">
        <div>
          <label className="eyebrow">EXAM DETAILS</label>
          <h1>{d?.exam?.title||'Exam details'}</h1>
          <p>Review the schedule and instructions before beginning.</p>
        </div>
        <Link className="btn light" to="/exams">Back to exams</Link>
      </div>

      {err && <div className="error" role="alert">{err}</div>}

      {d && (
        <div className="panel detail">
          <label className="eyebrow">INSTRUCTIONS</label>
          <h3>Before you begin</h3>
          <p>{d.exam.instructions||'Read each question carefully. Answers can be saved as you progress. Submit before the timer expires.'}</p>

          <div className="detail-stats">
            <span><Clock3/><small>Duration</small><b>{d.exam.duration_minutes} minutes</b></span>
            <span><Target/><small>Total marks</small><b>{d.exam.total_marks}</b></span>
            <span><CheckCircle2/><small>Questions</small><b>{d.questions?.length||0}</b></span>
            <span><CalendarDays/><small>Schedule</small><b>{new Date(d.exam.starts_at).toLocaleString()} – {new Date(d.exam.ends_at).toLocaleString()}</b></span>
          </div>

          {!hasQuestions && (
            <div className="error" role="alert">This exam has no active questions yet. Please contact your administrator.</div>
          )}

          {eligibility && !isEligible && (
            <div className="error" role="alert">
              {eligibility.reason || 'This exam is currently outside its permitted window or unavailable.'}
            </div>
          )}

          {hasActiveAttempt && (
            <div className="tip">
              <ShieldCheck/> You have an active attempt in progress. Click below to resume your examination.
            </div>
          )}

          <div className="tip">
            <ShieldCheck/> Starting opens a focused fullscreen exam workspace. Your answers save as you go.
          </div>

          <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
            {hasSubmitted ? (
              <Link className="btn" to="/results">View scorecards <ArrowRight size={16}/></Link>
            ) : (
              <button
                className="btn"
                onClick={start}
                disabled={!canClick}
              >
                {busy ? 'Checking eligibility…' : hasActiveAttempt ? 'Resume examination' : isUpcoming ? 'Exam not started' : isEnded ? 'Exam closed' : !hasQuestions ? 'No questions' : 'Start examination'} <ArrowRight size={16}/>
              </button>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

function Attempt(){
  const {id}=useParams(), nav=useNavigate(), [data,setData]=useState(null), [answers,setAnswers]=useState({}), [idx,setIdx]=useState(0), [seconds,setSeconds]=useState(null), [err,setErr]=useState(''), [fsError,setFsError]=useState(''), [busy,setBusy]=useState(false), [isFullscreen,setFullscreen]=useState(Boolean(document.fullscreenElement));
  const workspaceRef=useRef(null);
  const hasEnteredFullscreen=useRef(Boolean(document.fullscreenElement));
  const terminationStarted=useRef(false);

  useEffect(()=>{
    api.get(`/attempts/${id}`).then(r=>{
      setData(r.data);
      const saved={};
      for(const a of r.data.answers||[]) saved[a.question_id]=a.answer_json;
      setAnswers(saved);
      setSeconds(Math.max(0,Math.floor((new Date(r.data.attempt.expires_at)-Date.now())/1000)));
    }).catch(e=>{
      setErr(e.response?.data?.error||'Unable to load this exam attempt.');
    });
  },[id]);

  useEffect(()=>{
    const fn=()=>{
      const active=Boolean(document.fullscreenElement);
      setFullscreen(active);
      if(active){
        hasEnteredFullscreen.current=true;
        setFsError('');
      }
    };
    document.addEventListener('fullscreenchange',fn);
    return()=>document.removeEventListener('fullscreenchange',fn);
  },[]);

  useEffect(()=>{
    if(!data?.attempt?.id) return;

    const endForExit=reason=>{
      if(!terminationStarted.current && data.attempt.status==='in_progress'){
        submit(true,reason);
      }
    };

    const onFullscreenChange=()=>{
      const isNowFullscreen=Boolean(document.fullscreenElement);
      setFullscreen(isNowFullscreen);

      if(isNowFullscreen){
        // Entering fullscreen: mark initialization complete, NEVER submit!
        hasEnteredFullscreen.current=true;
        setFsError('');
        return;
      }

      // Only if fullscreen was previously active in this attempt session,
      // and is now exited, trigger exam security exit!
      if(hasEnteredFullscreen.current){
        endForExit('Fullscreen mode was exited.');
      }
    };

    const onVisibility=()=>{
      if(document.visibilityState==='hidden'){
        endForExit('The exam tab was changed or hidden.');
      }
    };

    const onBack=()=>{
      endForExit('The employee navigated away from the exam screen.');
    };

    const onPageHide=()=>{
      if(terminationStarted.current || !data?.attempt?.id || data.attempt.status!=='in_progress') return;
      terminationStarted.current=true;
      const token=sessionStorage.getItem('exam_token');
      fetch(`${String(api.defaults.baseURL||'').replace(/\/+$/,'')}/attempts/${id}/submit`,{
        method:'POST',
        keepalive:true,
        headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
        body:JSON.stringify({exitReason:'The exam page was closed or reloaded.'})
      }).catch(()=>{});
    };

    document.addEventListener('fullscreenchange',onFullscreenChange);
    document.addEventListener('visibilitychange',onVisibility);
    window.addEventListener('popstate',onBack);
    window.addEventListener('pagehide',onPageHide);

    return()=>{
      document.removeEventListener('fullscreenchange',onFullscreenChange);
      document.removeEventListener('visibilitychange',onVisibility);
      window.removeEventListener('popstate',onBack);
      window.removeEventListener('pagehide',onPageHide);
    };
  },[data?.attempt?.id, data?.attempt?.status]);

  useEffect(()=>{
    if(seconds===null||seconds<=0) return;
    const timer=setInterval(()=>setSeconds(Math.max(0,Math.floor((new Date(data?.attempt?.expires_at)-Date.now())/1000))),1000);
    return()=>clearInterval(timer);
  },[seconds===null,data?.attempt?.expires_at]);

  const questions=data?.questions||[];
  const pendingAnswers=useRef(new Map());
  const pendingWrites=useRef(new Set());

  async function persistAnswer(q,answer){await api.put('/attempts/'+id+'/answers/'+q.id,{answer})}
  function persistAndTrack(q,answer){const task=persistAnswer(q,answer);pendingWrites.current.add(task);task.finally(()=>pendingWrites.current.delete(task)).catch(()=>{});return task}
  function save(q,answer){
    setAnswers(old=>({...old,[q.id]:answer}));
    if(q.question_type!=='descriptive'){
      persistAndTrack(q,answer).catch(e=>setErr(e.response?.data?.error||'Could not save answer. Please retry.'));
      return;
    }
    const existing=pendingAnswers.current.get(q.id);
    if(existing) clearTimeout(existing.timer);
    const pending={q,answer,timer:null};
    pending.timer=setTimeout(()=>{
      persistAndTrack(q,pending.answer).then(()=>pendingAnswers.current.delete(q.id)).catch(e=>setErr(e.response?.data?.error||'Could not save answer. Please retry.'));
    },500);
    pendingAnswers.current.set(q.id,pending);
  }

  async function flushPendingAnswers(){
    const pending=[...pendingAnswers.current.values()];
    for(const item of pending) clearTimeout(item.timer);
    pending.forEach(item=>persistAndTrack(item.q,item.answer));
    pendingAnswers.current.clear();
    await Promise.all([...pendingWrites.current]);
  }

  async function submit(auto=false,exitReason=''){
    if(terminationStarted.current||busy) return;
    if(!auto&&!window.confirm('Submit this exam? You cannot change answers afterwards.')) return;
    terminationStarted.current=true;
    setBusy(true);
    try{
      await flushPendingAnswers();
      const r=await api.post(`/attempts/${id}/submit`,exitReason?{exitReason}:{});
      if(document.fullscreenElement) await document.exitFullscreen().catch(()=>{});
      nav('/results',{replace:true,state:{submitted:r.data.result,...(exitReason?{exitReason}:{})}});
    }catch(e){
      if(e.response?.status===409){
        if(document.fullscreenElement) await document.exitFullscreen().catch(()=>{});
        nav('/results',{replace:true});
        return;
      }
      terminationStarted.current=false;
      setErr(e.response?.data?.error||'Unable to submit.');
    }finally{
      setBusy(false);
    }
  }

  useEffect(()=>{
    if(seconds===0&&data&&!busy) submit(true,'Time expired.');
  },[seconds,data]);

  async function resumeFullscreen(){
    setFsError('');
    try{
      const el = workspaceRef.current || document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      if (document.fullscreenElement) {
        hasEnteredFullscreen.current = true;
        setFullscreen(true);
        setFsError('');
      }
    }catch(fsErr){
      console.warn('Fullscreen entry rejected:', fsErr);
      setFsError('Fullscreen could not be opened. Please check your browser permissions and click again.');
    }
  }

  if(err&&!data) return <main className="exam-shell" ref={workspaceRef}><div className="exam-load-error"><h2>Unable to open exam</h2><p>{err}</p><button className="btn" onClick={()=>nav('/exams')}>Back to exams</button></div></main>;
  if(!data) return <main className="exam-shell" ref={workspaceRef}><div className="exam-loading">Loading your secure exam…</div></main>;

  const q=questions[idx],answered=questions.filter(x=>answers[x.id]!==undefined&&answers[x.id]!==null&&answers[x.id]!=='').length,formatTime=n=>`${Math.floor(n/60).toString().padStart(2,'0')}:${(n%60).toString().padStart(2,'0')}`;
  return (
    <main className="exam-shell" ref={workspaceRef}>
      <header className="exam-top">
        <div>
          <span className="exam-live-dot"/>
          <div>
            <b>{data.exam?.title||'Examination'}</b>
            <small>Secure exam session</small>
          </div>
        </div>
        <div className={'exam-timer '+(seconds<300?'urgent':'')}>
          <Clock3/>
          <span><small>TIME REMAINING</small><b>{formatTime(seconds||0)}</b></span>
        </div>
        <button className="exam-submit" onClick={()=>submit(false)} disabled={busy}>{busy?'Submitting…':'Submit exam'}</button>
      </header>
      <div className="exam-progress"><span style={{width:`${questions.length?((idx+1)/questions.length)*100:0}%`}}/></div>
      <div className="exam-workspace">
        <aside className="question-rail">
          <div className="rail-summary"><b>Questions</b><span>{answered} of {questions.length} answered</span></div>
          <div className="question-grid">{questions.map((item,i)=><button key={item.id} className={`${i===idx?'current ':''}${answers[item.id]!==undefined&&answers[item.id]!==null&&answers[item.id]!==''?'answered':'unanswered'}`} onClick={()=>setIdx(i)} aria-label={`Question ${i+1}${answers[item.id]!==undefined?' answered':' unanswered'}`}>{i+1}</button>)}</div>
          <div className="question-legend"><span><i className="legend-answered"/>Answered</span><span><i className="legend-unanswered"/>Not answered</span><span><i className="legend-current"/>Current</span></div>
        </aside>
        <section className="question-stage">
          {err&&<div className="error" role="alert">{err}</div>}
          {fsError&&<div className="error" role="alert">{fsError}</div>}
          {!isFullscreen&&<div className="fullscreen-notice"><span>For a focused exam, return to fullscreen mode.</span><button onClick={resumeFullscreen}>Resume fullscreen</button></div>}
          {q?<><div className="question-meta"><span>QUESTION {idx+1} OF {questions.length}</span><span>{q.marks} marks</span></div><h1>{q.question_text}</h1>{q.question_type==='descriptive'?<div className="descriptive-response"><label htmlFor="written-response">Your answer</label><textarea id="written-response" className="written-answer" placeholder="Write your answer here…" value={answers[q.id]||''} onChange={e=>save(q,e.target.value)}/><small>Your response is saved automatically.</small></div>:Array.isArray(q.options)?<div className="exam-options">{q.options.map((op,i)=><label className={`exam-option ${answers[q.id]===op?'selected':''}`} key={i}><input type="radio" name={q.id} checked={answers[q.id]===op} onChange={()=>save(q,op)}/><span className="option-letter">{String.fromCharCode(65+i)}</span><span>{typeof op==='string'?op:JSON.stringify(op)}</span><CheckCircle2 className="option-check" size={18}/></label>)}</div>:<textarea className="written-answer" placeholder="Write your answer" value={answers[q.id]||''} onChange={e=>save(q,e.target.value)}/>}
            <div className="question-controls"><button className="btn light" disabled={idx===0} onClick={()=>setIdx(idx-1)}>← Previous</button><span>Answer saves automatically</span>{idx<questions.length-1?<button className="btn" onClick={()=>setIdx(idx+1)}>Next question <ArrowRight size={16}/></button>:<button className="btn" onClick={()=>submit(false)}>Review & submit <ArrowRight size={16}/></button>}</div></>:<div className="exam-load-error"><h2>No questions found</h2><p>This exam has no active questions. Contact your administrator.</p></div>}
        </section>
      </div>
    </main>
  );
}
function createReviewPdf(result,questions){
  const clean=value=>String(value??'').normalize('NFKD').replace(/[^\x20-\x7E]/g,' ').replace(/[\\()]/g,'\\$&').replace(/\s+/g,' ').trim();
  const lines=[{text:'KOUNDINYASA TECHNOLOGY SERVICES · EXAM SCORECARD',color:'0.03 0.14 0.27'},{text:`Employee: ${result.first_name} ${result.last_name} (${result.student_id})`},{text:`Examination: ${result.title}`},{text:`Score: ${result.marks_obtained} / ${result.total_marks} · ${Number(result.percentage).toFixed(1)}% · ${result.result_status.toUpperCase()}`},{text:`Published: ${new Date(result.published_at).toLocaleDateString()}`},{text:''}];
  questions.forEach((q,i)=>{lines.push({text:`Q${i+1}. ${q.question_text}`},{text:`Your answer: ${q.answer_json??'Not answered'}`});if(q.question_type==='mcq'){lines.push({text:`Correct answer: ${q.correct_answer??'Not available'}`,color:q.is_correct?'0.02 0.55 0.28':'0.75 0.12 0.16'},{text:q.is_correct?'Correct':'Incorrect',color:q.is_correct?'0.02 0.55 0.28':'0.75 0.12 0.16'})}else lines.push({text:'Descriptive response · reviewed by your examiner'});lines.push({text:''})});
  const pages=[];for(let i=0;i<lines.length;i+=48)pages.push(lines.slice(i,i+48));const objects=['<< /Type /Catalog /Pages 2 0 R >>','','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'],refs=[];
  pages.forEach((page,index)=>{const pid=4+index*2,cid=pid+1;refs.push(`${pid} 0 R`);const stream='BT\n/F1 9 Tf\n40 755 Td\n13 TL\n'+page.map(line=>`${line.color||'0.12 0.18 0.25'} rg\n(${clean(line.text).slice(0,115)}) Tj\nT*`).join('\n')+'\nET';objects[pid-1]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${cid} 0 R >>`;objects[cid-1]=`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`});objects[1]=`<< /Type /Pages /Kids [${refs.join(' ')}] /Count ${pages.length} >>`;
  let pdf='%PDF-1.4\n';const offsets=[0];objects.forEach((obj,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`});const xref=pdf.length;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let i=1;i<offsets.length;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;pdf+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;const url=URL.createObjectURL(new Blob([pdf],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download=`${clean(result.title).replace(/ /g,'-')}-scorecard.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
function Results(){const[r,setR]=useState([]),[err,setErr]=useState(''),[downloading,setDownloading]=useState(''),location=useLocation();useEffect(()=>{api.get('/results').then(x=>setR(x.data.results)).catch(e=>setErr(e.response?.data?.error||'Unable to load results.'))},[]);async function download(x){setErr('');setDownloading(x.id);try{const{data}=await api.get(`/results/${x.id}/review`);createReviewPdf(data.result,data.questions||[])}catch(e){setErr(e.response?.data?.error||'Unable to download this scorecard.')}finally{setDownloading('')}}return <Layout><div className="page-intro"><div><label className="eyebrow">YOUR ACHIEVEMENTS</label><h1>Results & scorecards</h1><p>Published results and downloadable answer reviews.</p></div></div>{location.state?.exitReason&&<div className="error" role="status">Your exam was automatically submitted because: {location.state.exitReason}</div>}{err&&<div className="error" role="alert">{err}</div>}<div className="panel table-panel"><h3>Examination history</h3><div className="table-scroll"><table><thead><tr><th>Exam</th><th>Published</th><th>Score</th><th>Percentage</th><th>Result</th><th>Scorecard</th></tr></thead><tbody>{r.map(x=><tr key={x.id}><td><b>{x.title}</b><small>{x.subject||'General'}</small></td><td>{new Date(x.published_at).toLocaleDateString()}</td><td>{x.marks_obtained}/{x.total_marks}</td><td>{Number(x.percentage).toFixed(1)}%</td><td><span className="pill">{x.result_status}</span></td><td><button className="link" disabled={downloading===x.id} onClick={()=>download(x)}>{downloading===x.id?'Preparing…':'Download PDF'}</button></td></tr>)}</tbody></table>{!r.length&&<div className="empty"><Trophy/><b>No published results yet</b><p>Your scorecards appear here after your exam results are released.</p></div>}</div></div></Layout>}
function Notifications(){const[n,setN]=useState([]);useEffect(()=>{api.get('/notifications').then(r=>setN(r.data.notifications)).catch(()=>{})},[]);return <Layout><div className="page-intro"><div><label className="eyebrow">STAY INFORMED</label><h1>Notifications</h1><p>Updates and reminders for your exam journey.</p></div></div><div className="panel table-panel">{n.length?n.map(x=><div className="notice-row" key={x.id}><Bell/><span><b>{x.title}</b><p>{x.body}</p><small>{new Date(x.created_at).toLocaleString()}</small></span></div>):<div className="empty"><Bell/><b>You’re all caught up</b><p>Exam and result updates will appear here.</p></div>}</div></Layout>}
function AdminHome(){const[o,setO]=useState(null),[s,setS]=useState([]),[err,setErr]=useState('');useEffect(()=>{api.get('/admin/overview').then(res=>{setO(res.data.overview)}).catch(e=>{setErr(prev=>prev||e.response?.data?.error||'Unable to load overview statistics.')});api.get('/admin/students').then(res=>{setS(res.data.students||[])}).catch(e=>{setErr(prev=>prev||e.response?.data?.error||'Unable to load registered students.')})},[]);return <Layout admin><div className="page-intro"><div><label className="eyebrow">INSTITUTION OVERVIEW</label><h1>Admin console<em>.</em></h1><p>Manage employees, examinations, and performance reporting.</p></div><Link className="btn" to="/admin/exams">Manage exams <ArrowRight size={16}/></Link></div>{err&&<div className="error">{err}</div>}<div className="stats"><Stat label="Employees" value={o?.students} sub="Registered accounts" I={Users} tone="a"/><Stat label="Examinations" value={o?.exams} sub="Across all statuses" I={BookOpen} tone="c"/><Stat label="Attempts" value={o?.attempts} sub="Recorded sessions" I={ClipboardList} tone="d"/><Stat label="Published results" value={o?.published_results} sub="Results released" I={Trophy} tone="b"/></div><div className="panel table-panel"><h3>Recently registered employees</h3><table><thead><tr><th>Name</th><th>Employee ID</th><th>Domain</th><th>Email</th><th>Status</th></tr></thead><tbody>{s.slice(0,8).map(x=><tr key={x.id}><td>{x.first_name} {x.last_name}</td><td>{x.student_id}</td><td>{x.domain?<span className="pill" style={{textTransform:'none',fontWeight:600}}>{DOMAIN_LABELS[x.domain]||x.domain}</span>:<span style={{color:'#8a9aa9',fontSize:'10px',fontStyle:'italic'}}>Not specified</span>}</td><td>{x.email}</td><td>{x.status}</td></tr>)}</tbody></table></div></Layout>}
function AdminStudents(){const[s,setS]=useState([]),[filter,setFilter]=useState('all'),[search,setSearch]=useState('');useEffect(()=>{api.get('/admin/students').then(r=>setS(r.data.students||[])).catch(()=>{})},[]);const filtered=(s||[]).filter(x=>{const matchesDomain=filter==='all'?true:filter==='unassigned'?!x.domain:x.domain===filter;const matchesSearch=(x.first_name+' '+x.last_name+' '+x.student_id+' '+x.email+' '+(DOMAIN_LABELS[x.domain]||x.domain||'')).toLowerCase().includes(search.toLowerCase());return matchesDomain&&matchesSearch});return <Layout admin><div className="page-intro"><div><label className="eyebrow">DIRECTORY</label><h1>Employees</h1><p>Browse registered accounts and professional learning domains.</p></div></div><div className="panel table-panel"><div className="results-toolbar" style={{padding:'0 20px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}><input aria-label="Search employees" placeholder="Search name, employee ID, email..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:'min(280px, 100%)',padding:'9px 12px',border:'1px solid #dfe7ef',borderRadius:'8px',fontSize:'11px'}}/><div style={{display:'flex',alignItems:'center',gap:'8px'}}><label style={{fontSize:'10px',fontWeight:700,color:'#485a70'}}>Domain Filter:</label><select aria-label="Filter employees by domain" value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:'8px 12px',border:'1px solid #dfe7ef',borderRadius:'8px',fontSize:'11px',background:'#fbfdff',color:'#142942'}}><option value="all">All Domains ({s.length})</option><option value="fullstack">Full Stack Development</option><option value="database">Database</option><option value="testing">Testing</option><option value="cybersecurity">Cybersecurity</option><option value="sap">SAP</option><option value="devops">DevOps</option><option value="unassigned">Not specified</option></select></div></div><div className="table-scroll"><table><thead><tr><th>Name</th><th>Employee ID</th><th>Domain</th><th>Email</th><th>Phone</th><th>Status</th></tr></thead><tbody>{filtered.map(x=><tr key={x.id}><td><b>{x.first_name} {x.last_name}</b></td><td>{x.student_id}</td><td>{x.domain?<span className="pill" style={{textTransform:'none',fontWeight:600}}>{DOMAIN_LABELS[x.domain]||x.domain}</span>:<span style={{color:'#8a9aa9',fontSize:'10px',fontStyle:'italic'}}>Not specified</span>}</td><td>{x.email}</td><td>{x.phone}</td><td><span className="pill">{x.status}</span></td></tr>)}</tbody></table>{!filtered.length&&<div className="empty"><b>No employees found</b><p>Try adjusting your search query or domain filter.</p></div>}</div></div></Layout>}
function AdminExams(){
  const blank={title:'',description:'',instructions:'',startsAt:'',endsAt:'',durationMinutes:60,totalMarks:100,passingMarks:40,status:'draft'};
  const [f,setF]=useState(blank),[exams,setExams]=useState([]),[editing,setEditing]=useState(''),[msg,setMsg]=useState(''),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{loadExams()},[]);async function loadExams(){try{const r=await api.get('/admin/exams');setExams(r.data.exams||[])}catch(e){setErr(e.response?.data?.error||'Unable to load examinations.')}}
  function change(e){setF({...f,[e.target.name]:e.target.value})}
  function localDate(value){if(!value)return '';const d=new Date(value);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)}
  function editExam(x){setEditing(x.id);setF({title:x.title||'',description:x.description||'',instructions:x.instructions||'',startsAt:localDate(x.starts_at),endsAt:localDate(x.ends_at),durationMinutes:x.duration_minutes,totalMarks:x.total_marks,passingMarks:x.passing_marks,status:x.status});setErr('');setMsg('');window.scrollTo({top:0,behavior:'smooth'})}
  async function submit(e){e.preventDefault();setMsg('');setErr('');if(new Date(f.endsAt)<=new Date(f.startsAt))return setErr('The end time must be after the start time.');if(+f.passingMarks>+f.totalMarks)return setErr('Passing marks cannot exceed total marks.');setBusy(true);try{const body={...f,startsAt:new Date(f.startsAt).toISOString(),endsAt:new Date(f.endsAt).toISOString(),durationMinutes:+f.durationMinutes,totalMarks:+f.totalMarks,passingMarks:+f.passingMarks};if(editing){await api.patch('/admin/exams/'+editing,body);setMsg('Examination schedule and details updated.');setEditing('')}else{await api.post('/admin/exams',body);setMsg('Examination created. It now appears in your examination list.');setF({...blank})}await loadExams()}catch(e){setErr(e.response?.data?.error||'Could not save examination.')}finally{setBusy(false)}}
  function cancelEdit(){setEditing('');setF({...blank});setErr('')}
  return <Layout admin><div className="page-intro"><div><label className="eyebrow">ASSESSMENT SETUP</label><h1>Examinations</h1><p>Create exams, edit schedules, and manage their questions.</p></div><Link className="btn light" to="/admin/questions">Open question bank <ArrowRight size={16}/></Link></div>{err&&<div className="error" role="alert">{err}</div>}{msg&&<div className="success" role="status">{msg}</div>}
    <div className="panel form-panel"><h3>{editing?'Edit examination':'Create an examination'}</h3><form onSubmit={submit}><label>Exam title<input name="title" value={f.title} onChange={change} required/></label><label>Description<textarea name="description" value={f.description} onChange={change}/></label><label>Instructions<textarea name="instructions" value={f.instructions} onChange={change}/></label><div className="two"><label>Starts at<input type="datetime-local" name="startsAt" value={f.startsAt} onChange={change} required/></label><label>Ends at<input type="datetime-local" name="endsAt" value={f.endsAt} onChange={change} required/></label></div><div className="three"><label>Duration (minutes)<input type="number" min="1" name="durationMinutes" value={f.durationMinutes} onChange={change} required/></label><label>Total marks<input type="number" min="1" name="totalMarks" value={f.totalMarks} onChange={change} required/></label><label>Passing marks<input type="number" min="0" max={f.totalMarks} name="passingMarks" value={f.passingMarks} onChange={change} required/></label></div><label>Status<select name="status" value={f.status} onChange={change}><option value="draft">Draft</option><option value="published">Published</option></select></label><div className="exam-admin-actions"><button className="btn" disabled={busy}>{busy?'Saving…':editing?'Save changes':'Create examination'} <ArrowRight size={16}/></button>{editing&&<button className="btn light" type="button" onClick={cancelEdit}>Cancel</button>}</div></form></div>
    <div className="panel table-panel admin-exam-list"><h3>Your examinations ({exams.length})</h3>{exams.length?<div className="table-scroll"><table><thead><tr><th>Examination</th><th>Schedule</th><th>Duration</th><th>Status</th><th>Questions</th><th></th></tr></thead><tbody>{exams.map(x=><tr key={x.id}><td><b>{x.title}</b></td><td>{new Date(x.starts_at).toLocaleString()}</td><td>{x.duration_minutes||'—'} min</td><td><span className="pill">{x.status}</span></td><td>{x.question_count??'—'}</td><td className="exam-actions"><button type="button" className="link" onClick={()=>editExam(x)}>Edit exam</button><Link className="link" to={'/admin/questions?examId='+x.id}>Manage questions <ArrowRight size={14}/></Link><button type="button" className="delete-link" onClick={async()=>{if(!window.confirm('Delete this examination? It will be archived and hidden from employees.'))return;try{await api.delete('/admin/exams/'+x.id);setExams(current=>current.filter(exam=>exam.id!==x.id));setMsg('Examination deleted.')}catch(e){setErr(e.response?.data?.error||'Could not delete examination.')}}}>Delete</button></td></tr>)}</tbody></table></div>:<div className="empty"><ClipboardList/><b>No examinations created yet</b><p>After creating an examination, manage its questions from the Question bank.</p></div>}</div>
  </Layout>
}
function AdminQuestionBank(){
  const [exams,setExams]=useState([]),[examId,setExamId]=useState(new URLSearchParams(window.location.search).get('examId')||''),[questions,setQuestions]=useState([]),[q,setQ]=useState({questionType:'mcq',questionText:'',options:'',correctAnswer:'',marks:1,negativeMarks:0}),[editingQuestion,setEditingQuestion]=useState(''),[err,setErr]=useState(''),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);const options=q.options.split('\n').map(x=>x.trim()).filter(Boolean);
  useEffect(()=>{api.get('/admin/exams').then(r=>{const list=r.data.exams||[];setExams(list);if(!examId&&list.length)setExamId(list[0].id)}).catch(e=>setErr(e.response?.data?.error||'Unable to load exams.'))},[]);
  async function loadQuestions(id){if(!id){setQuestions([]);return}try{const r=await api.get('/admin/exams/'+id+'/questions');setQuestions(r.data.questions||[])}catch(e){setErr(e.response?.data?.error||'Unable to load questions.')}}
  useEffect(()=>{loadQuestions(examId)},[examId]);
  function change(e){setQ({...q,[e.target.name]:e.target.value})}
  function editQuestion(item){setEditingQuestion(item.id);setQ({questionType:item.question_type,questionText:item.question_text,options:Array.isArray(item.options)?item.options.join('\n'):'',correctAnswer:typeof item.correct_answer==='string'?item.correct_answer:JSON.stringify(item.correct_answer||''),marks:item.marks,negativeMarks:item.negative_marks||0});setErr('');setMsg('')}
  function cancelQuestionEdit(){setEditingQuestion('');setQ({questionType:'mcq',questionText:'',options:'',correctAnswer:'',marks:1,negativeMarks:0})}
  async function removeQuestion(item){if(!window.confirm('Delete this question from the examination?'))return;setErr('');setMsg('');try{await api.delete('/admin/exams/'+examId+'/questions/'+item.id);setQuestions(current=>current.filter(x=>x.id!==item.id));setMsg('Question deleted.')}catch(e){setErr(e.response?.data?.error||'Could not delete question.')}}
  async function add(e){e.preventDefault();setErr('');setMsg('');if(q.questionType==='mcq'){if(options.length<2)return setErr('Enter at least two answer options.');if(new Set(options).size!==options.length)return setErr('Duplicate options are not allowed.');if(!options.includes(q.correctAnswer))return setErr('Choose the correct answer from the options.')}setBusy(true);try{const body={questionType:q.questionType,questionText:q.questionText.trim(),options:q.questionType==='mcq'?options:[],correctAnswer:q.questionType==='mcq'?q.correctAnswer:null,marks:+q.marks,negativeMarks:q.questionType==='mcq'?+q.negativeMarks:0,displayOrder:questions.length+1};if(editingQuestion)await api.put('/admin/exams/'+examId+'/questions/'+editingQuestion,body);else await api.post('/admin/exams/'+examId+'/questions',body);cancelQuestionEdit();setMsg(editingQuestion?'Question updated.':'Question added to this examination.');await loadQuestions(examId)}catch(e){setErr(e.response?.data?.error||'Could not save question.')}finally{setBusy(false)}}
  return <Layout admin><div className="page-intro"><div><label className="eyebrow">QUESTION MANAGEMENT</label><h1>Question bank</h1><p>Choose an examination to review, add, edit, or delete questions.</p></div><Link className="btn light" to="/admin/exams">View examinations <ArrowRight size={16}/></Link></div>{err&&<div className="error" role="alert">{err}</div>}{msg&&<div className="success" role="status">{msg}</div>}<div className="question-bank-layout"><div className="panel exam-picker"><label>Select examination<select value={examId} onChange={e=>{setExamId(e.target.value);setMsg('');setErr('');cancelQuestionEdit()}}><option value="">Choose an exam</option>{exams.map(x=><option key={x.id} value={x.id}>{x.title} — {x.status}</option>)}</select></label><h3>Questions ({questions.length})</h3>{questions.length?questions.map((x,i)=><article className="bank-question" key={x.id}><span>Q{i+1}</span><strong>{x.question_text}</strong><small>{x.question_type==='descriptive'?'Descriptive':'Multiple choice'} · {x.marks} marks</small><button type="button" className="link" onClick={()=>editQuestion(x)}>Edit</button><button type="button" className="delete-link" onClick={()=>removeQuestion(x)}>Delete</button></article>):<div className="empty compact"><ClipboardList/><b>No questions yet</b><p>Questions for the selected examination will appear here.</p></div>}</div><div className="panel form-panel question-editor"><h3>{editingQuestion?'Edit question':'Add a question'}</h3>{!examId?<p className="form-help">Select an examination first to start adding questions.</p>:<form onSubmit={add}><label>Question type<select name="questionType" value={q.questionType} onChange={e=>{setQ({...q,questionType:e.target.value,options:'',correctAnswer:'',negativeMarks:0})}}><option value="mcq">Multiple choice</option><option value="descriptive">Descriptive answer</option></select></label><label>Question text<textarea name="questionText" value={q.questionText} onChange={change} placeholder="Enter the question" required/></label>{q.questionType==='mcq'?<><label>Answer options <small>Enter one option per line.</small><textarea name="options" value={q.options} onChange={change} placeholder={'Option A\nOption B\nOption C\nOption D'} required/></label><label>Correct answer<select name="correctAnswer" value={q.correctAnswer} onChange={change} required><option value="">Select the correct answer</option>{options.map((x,i)=><option key={i} value={x}>{x}</option>)}</select></label></>:<div className="descriptive-hint">Employees will write their response in a text area. Descriptive responses will be marked for review.</div>}<div className="two"><label>Marks<input type="number" min="0.5" step="0.5" name="marks" value={q.marks} onChange={change} required/></label>{q.questionType==='mcq'&&<label>Negative marks<input type="number" min="0" step="0.25" name="negativeMarks" value={q.negativeMarks} onChange={change} required/></label>}</div><div className="exam-admin-actions"><button className="btn" disabled={busy}>{busy?'Saving…':editingQuestion?'Save question changes':'Save question'} <ArrowRight size={16}/></button>{editingQuestion&&<button type="button" className="btn light" onClick={cancelQuestionEdit}>Cancel</button>}</div></form>}</div></div></Layout>
}function makeResultsPdf(rows){
  const clean=value=>String(value??'').normalize('NFKD').replace(/[^\x20-\x7E]/g,' ').replace(/[\\()]/g,'\\$&').replace(/\s+/g,' ').trim();
  const esc=value=>clean(value).slice(0,36),navy='0.04 0.12 0.23',cyan='0.02 0.66 0.82',muted='0.37 0.45 0.55',white='1 1 1',line='0.87 0.91 0.95';
  const cols=[65,104,95,64,52,61,82],headers=['EMPLOYEE ID','EMPLOYEE','EXAMINATION','SCORE','PERCENT','RESULT','PUBLISHED'];
  const pageRows=[];for(let i=0;i<rows.length;i+=19)pageRows.push(rows.slice(i,i+19));if(!pageRows.length)pageRows.push([]);
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'],refs=[];
  const rect=(x,y,w,h,color)=>`q ${color} rg ${x} ${y} ${w} ${h} re f Q\n`;
  const text=(x,y,size,value,color=navy,bold=false)=>`BT ${color} rg /${bold?'F2':'F1'} ${size} Tf ${x} ${y} Td (${esc(value)}) Tj ET\n`;
  const passes=rows.filter(r=>r.result_status==='pass').length,fails=rows.filter(r=>r.result_status==='fail').length;
  pageRows.forEach((page,index)=>{const commands=[];commands.push(rect(0,810,595,32,navy),rect(0,806,595,4,cyan),text(36,778,10,'KOUNDINYASA TECHNOLOGY SERVICES',navy,true),text(36,754,21,'Employee results report',navy,true),text(36,737,9,`Generated ${new Date().toLocaleString()}`,muted));
    const cards=[['SCORECARDS',rows.length],['PASSED',passes],['NOT PASSED',fails]];cards.forEach((c,i)=>{const x=36+i*176;commands.push(rect(x,681,164,42,i===1?'0.90 0.97 0.94':'0.94 0.97 0.99'),text(x+10,707,7,c[0],muted,true),text(x+10,689,15,c[1],i===1?'0.02 0.48 0.34':navy,true))});
    let x=36;const tableTop=652,rowHeight=26;commands.push(rect(36,tableTop-24,523,24,navy));headers.forEach((h,i)=>{commands.push(text(x+6,tableTop-15,6.5,h,white,true));x+=cols[i]});
    if(!page.length){commands.push(rect(36,tableTop-54,523,30,'0.97 0.98 0.99'),text(48,tableTop-43,9,'No published employee results are available.',muted));}
    page.forEach((r,rowIndex)=>{const top=tableTop-24-rowIndex*rowHeight,bottom=top-rowHeight;commands.push(rect(36,bottom,523,rowHeight,rowIndex%2?'1 1 1':'0.97 0.98 0.99'),rect(36,bottom,523,0.6,line));let cx=36;const values=[r.student_id,`${r.first_name} ${r.last_name}`,r.exam_title,`${Number(r.marks_obtained||0).toFixed(2)} / ${Number(r.total_marks||0).toFixed(2)}`,`${Number(r.percentage||0).toFixed(1)}%`,String(r.result_status||'').toUpperCase(),new Date(r.published_at).toLocaleDateString()];values.forEach((v,i)=>{const max=[9,15,14,11,8,10,11][i];const val=clean(v);commands.push(text(cx+6,top-16,i===5?6.5:7.2,val.length>max?val.slice(0,max-1)+'...':val,i===5?(r.result_status==='pass'?'0.02 0.48 0.34':'0.65 0.25 0.20'):navy,i===5));cx+=cols[i]})});
    commands.push(text(36,30,7,`Confidential employee information - Page ${index+1} of ${pageRows.length}`,muted));const stream=commands.join(''),pid=5+index*2,cid=pid+1;refs.push(`${pid} 0 R`);objects[pid-1]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cid} 0 R >>`;objects[cid-1]=`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`});objects[1]=`<< /Type /Pages /Kids [${refs.join(' ')}] /Count ${pageRows.length} >>`;
  let pdf='%PDF-1.4\n';const offsets=[0];objects.forEach((obj,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`});const xref=pdf.length;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let i=1;i<offsets.length;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;pdf+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;const url=URL.createObjectURL(new Blob([pdf],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download=`employee-results-${rows.length}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}function AdminResults(){const [rows,setRows]=useState([]),[pending,setPending]=useState([]),[scores,setScores]=useState({}),[err,setErr]=useState(''),[busy,setBusy]=useState(true),[search,setSearch]=useState(''),[saving,setSaving]=useState('');async function load(){setBusy(true);try{const [a,b]=await Promise.all([api.get('/admin/results'),api.get('/admin/results/pending')]);setRows(a.data.results||[]);setPending(b.data.results||[]);setScores(Object.fromEntries((b.data.results||[]).map(x=>[x.id,String(x.marks_obtained||0)])))}catch(e){setErr(e.response?.data?.error||'Unable to load employee results.')}finally{setBusy(false)}}useEffect(()=>{load()},[]);const filtered=rows.filter(r=>(r.student_id+' '+r.first_name+' '+r.last_name+' '+r.exam_title+' '+r.email).toLowerCase().includes(search.toLowerCase()));async function grade(item){const marks=Number(scores[item.id]);if(!Number.isFinite(marks)||marks<0||marks>Number(item.total_marks)){setErr('Final marks must be between zero and the exam total.');return}setSaving(item.id);setErr('');try{await api.patch('/admin/results/'+item.id+'/grade',{marks});await load()}catch(e){setErr(e.response?.data?.error||'Unable to publish the graded result.')}finally{setSaving('')}}return <Layout admin><div className="page-intro"><div><label className="eyebrow">EMPLOYEE PERFORMANCE</label><h1>Employee results</h1><p>Review written answers, publish grades, and download scorecards.</p></div><button className="btn" onClick={()=>makeResultsPdf(filtered)} disabled={!filtered.length}>Download PDF <ArrowRight size={16}/></button></div>{err&&<div className="error" role="alert">{err}</div>}{pending.length>0&&<section className="pending-reviews"><div className="pending-heading"><div><label className="eyebrow">TEACHER REVIEW</label><h2>Descriptive answers awaiting marks ({pending.length})</h2></div></div>{pending.map(item=><article className="panel review-card" key={item.id}><div className="review-student"><div><b>{item.first_name} {item.last_name}</b><small>{item.student_id} · {item.exam_title}</small></div><span>MCQ score: {item.marks_obtained} / {item.total_marks}</span></div>{(item.descriptive_answers||[]).map((answer,i)=><div className="written-review" key={i}><b>Q{i+1} · {answer.max_marks} marks</b><p>{answer.question}</p><blockquote>{answer.answer||'No response provided.'}</blockquote></div>)}<div className="grade-controls"><label>Final marks (out of {item.total_marks})<input type="number" min="0" max={item.total_marks} step="0.25" value={scores[item.id]??''} onChange={e=>setScores({...scores,[item.id]:e.target.value})}/></label><button className="btn" disabled={saving===item.id} onClick={()=>grade(item)}>{saving===item.id?'Publishing…':'Publish result'} <ArrowRight size={16}/></button></div></article>)}</section>}{busy?<div className="panel empty">Loading employee results…</div>:<div className="panel table-panel results-panel"><div className="results-toolbar"><h3>Published scorecards ({filtered.length})</h3><input aria-label="Search employee results" placeholder="Search employee, ID, or exam" value={search} onChange={e=>setSearch(e.target.value)}/></div>{filtered.length?<div className="table-scroll"><table><thead><tr><th>Employee</th><th>Employee ID</th><th>Examination</th><th>Score</th><th>Percentage</th><th>Result</th><th>Published</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td><b>{r.first_name} {r.last_name}</b><small>{r.email}</small></td><td>{r.student_id}</td><td>{r.exam_title}</td><td>{r.marks_obtained}/{r.total_marks}</td><td>{Number(r.percentage||0).toFixed(1)}%</td><td><span className="pill">{r.result_status}</span></td><td>{new Date(r.published_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>:<div className="empty"><Trophy/><b>No published results yet</b><p>Published employee scorecards will appear here.</p></div>}</div>}</Layout>
}function AdminReports(){const[r,setR]=useState([]),[err,setErr]=useState('');useEffect(()=>{api.get('/admin/reports/performance').then(x=>setR(x.data.report)).catch(e=>setErr(e.response?.data?.error||'Unable to load reports.'))},[]);return <Layout admin><div className="page-intro"><div><label className="eyebrow">ANALYTICS</label><h1>Performance reports</h1><p>Aggregate performance from published results.</p></div></div>{err&&<div className="error">{err}</div>}<div className="panel table-panel"><table><thead><tr><th>Exam</th><th>Participants</th><th>Average score</th><th>Passes</th><th>Fails</th></tr></thead><tbody>{r.map((x,i)=><tr key={i}><td>{x.title}</td><td>{x.participants}</td><td>{x.average_percentage??'—'}</td><td>{x.passes||0}</td><td>{x.fails||0}</td></tr>)}</tbody></table>{!r.length&&<div className="empty">Performance data appears after results exist.</div>}</div></Layout>}
function AdminIncidents(){
  const[rows,setRows]=useState([]),[err,setErr]=useState(''),[busy,setBusy]=useState(true);
  useEffect(()=>{let active=true;async function load(initial=false){try{const r=await api.get('/admin/incidents');if(active){setRows(r.data.incidents||[]);setErr('')}}catch(e){if(active)setErr(e.response?.data?.error||'Unable to load exam exit reports.')}finally{if(active&&initial)setBusy(false)}}load(true);const timer=setInterval(()=>load(),5000);return()=>{active=false;clearInterval(timer)}},[]);
  return <Layout admin><div className="page-intro"><div><label className="eyebrow">EXAM SECURITY</label><h1>Exam incidents</h1><p>Review exam exits that triggered automatic submission.</p></div><span className="date">Live updates every 5 seconds</span></div>{err&&<div className="error" role="alert">{err}</div>}<div className="panel table-panel"><h3>Recorded exits ({rows.length})</h3>{busy?<div className="empty">Loading exam incidents...</div>:rows.length?<div className="table-scroll"><table><thead><tr><th>Employee</th><th>Examination</th><th>Exit reason</th><th>Attempt status</th><th>Recorded at</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><b>{x.first_name} {x.last_name}</b><small>{x.student_id} · {x.email}</small></td><td>{x.exam_title}</td><td>{x.details?.reason||x.event_type}</td><td><span className="pill">{x.attempt_status}</span></td><td>{new Date(x.created_at).toLocaleString()}</td></tr>)}</tbody></table></div>:<div className="empty"><ShieldCheck/><b>No exam exits recorded</b><p>Automatic submissions caused by leaving an exam will appear here.</p></div>}</div></Layout>
}function NotFound(){return <div className="notfound"><Logo/><h1>Page not found</h1><Link className="btn" to="/">Return home</Link></div>}
export default function App(){return <Routes><Route path="/" element={<Landing/>}/><Route path="/login" element={<Auth/>}/><Route path="/signup" element={<Auth signup/>}/><Route path="/dashboard" element={<Guard><Dashboard/></Guard>}/><Route path="/daily-log" element={<Guard><StudentDailyLog Layout={Layout}/></Guard>}/><Route path="/exams" element={<Guard><Exams/></Guard>}/><Route path="/exam/:id" element={<Guard><ExamDetail/></Guard>}/><Route path="/attempt/:id" element={<Guard><Attempt/></Guard>}/><Route path="/results" element={<Guard><Results/></Guard>}/><Route path="/notifications" element={<Guard><Notifications/></Guard>}/><Route path="/admin" element={<Guard admin><AdminHome/></Guard>}/><Route path="/admin/daily-records" element={<Guard admin><AdminDailyRecords Layout={Layout} Stat={Stat}/></Guard>}/><Route path="/admin/students" element={<Guard admin><AdminStudents/></Guard>}/><Route path="/admin/exams" element={<Guard admin><AdminExams/></Guard>}/><Route path="/admin/questions" element={<Guard admin><AdminQuestionBank/></Guard>}/><Route path="/admin/results" element={<Guard admin><AdminResults/></Guard>}/><Route path="/admin/incidents" element={<Guard admin><AdminIncidents/></Guard>}/><Route path="/admin/student-progress" element={<Guard admin><AdminRoadmapProgress Layout={Layout}/></Guard>}/><Route path="/admin/reports" element={<Guard admin><AdminReports/></Guard>}/><Route path="*" element={<NotFound/>}/></Routes>}








