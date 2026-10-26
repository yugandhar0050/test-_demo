import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ClipboardCheck,
  ArrowRight,
  Edit3,
  Eye,
  Send,
  BookOpen,
  CalendarCheck,
  RotateCcw,
  X
} from 'lucide-react';
import api from './api';

const DOMAIN_LABELS = {
  fullstack: 'Full Stack Development',
  database: 'Database',
  testing: 'Testing',
  cybersecurity: 'Cybersecurity',
  sap: 'SAP',
  devops: 'DevOps'
};

export default function StudentDailyLog({ Layout }) {
  const [records, setRecords] = useState([]);
  const [mandateData, setMandateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  // Selected record for detail modal
  const [activeModalRecord, setActiveModalRecord] = useState(null);
  const [recordReviews, setRecordReviews] = useState([]);

  // Form state
  const todayStr = new Date().toISOString().slice(0, 10);
  const blankForm = {
    recordDate: todayStr,
    topicsLearned: '',
    tasksCompleted: '',
    hoursSpent: 2,
    challengesBlockers: '',
    notesSummary: '',
    isDraft: false
  };
  const [f, setF] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setErr('');
    try {
      const [recordsRes, mandateRes] = await Promise.all([
        api.get('/student/daily-records').catch(e => ({ data: { records: [] } })),
        api.get('/student/daily-mandates').catch(e => ({ data: { mandate: null, todayStatus: { status: 'none' } } }))
      ]);

      const recs = recordsRes.data.records || [];
      setRecords(recs);
      setMandateData(mandateRes.data || null);

      // If user has a draft or corrections requested record for today, prefill it
      const todayRec = recs.find(r => r.record_date?.slice(0, 10) === todayStr);
      if (todayRec && (todayRec.status === 'draft' || todayRec.status === 'corrections_requested')) {
        startEdit(todayRec);
      }
    } catch (e) {
      setErr(e.response?.data?.error || 'Unable to load daily learning records.');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(record) {
    setEditingId(record.id);
    setF({
      recordDate: record.record_date?.slice(0, 10) || todayStr,
      topicsLearned: record.topics_learned || '',
      tasksCompleted: record.tasks_completed || '',
      hoursSpent: record.hours_spent != null ? Number(record.hours_spent) : 2,
      challengesBlockers: record.challenges_blockers || '',
      notesSummary: record.notes_summary || '',
      isDraft: record.status === 'draft'
    });
    setFormOpen(true);
    setMsg('');
    setErr('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setF({ ...blankForm, recordDate: todayStr });
    setMsg('');
    setErr('');
  }

  async function handleSubmit(e, isDraftAction = false) {
    if (e && e.preventDefault) e.preventDefault();
    setErr('');
    setMsg('');

    if (!f.topicsLearned.trim() || !f.tasksCompleted.trim()) {
      return setErr('Please fill in both topics learned and tasks completed.');
    }
    const parsedHours = parseFloat(f.hoursSpent);
    if (
      f.hoursSpent === '' ||
      f.hoursSpent === null ||
      f.hoursSpent === undefined ||
      Number.isNaN(parsedHours) ||
      !Number.isFinite(parsedHours) ||
      parsedHours < 0.1 ||
      parsedHours > 24
    ) {
      return setErr('Hours spent must be between 0.1 and 24 hours.');
    }

    setBusy(true);
    try {
      const payload = {
        ...f,
        hoursSpent: Number(f.hoursSpent),
        isDraft: isDraftAction
      };

      let res;
      if (editingId) {
        res = await api.put(`/student/daily-records/${editingId}`, payload);
      } else {
        res = await api.post('/student/daily-records', payload);
      }

      setMsg(res.data.message || (isDraftAction ? 'Draft saved.' : 'Record submitted for review!'));
      cancelEdit();
      await loadData();
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not save learning record.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDirectSubmit(recordId) {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const res = await api.post(`/student/daily-records/${recordId}/submit`);
      setMsg(res.data.message || 'Record submitted for review!');
      await loadData();
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not submit record.');
    } finally {
      setBusy(false);
    }
  }

  async function viewDetails(record) {
    setActiveModalRecord(record);
    setRecordReviews([]);
    try {
      const res = await api.get(`/student/daily-records/${record.id}`);
      setRecordReviews(res.data.reviews || []);
    } catch (e) {
      console.error(e);
    }
  }

  // Calculate stats
  const totalHours = records.reduce((acc, r) => acc + (Number(r.hours_spent) || 0), 0);
  const approvedCount = records.filter(r => r.status === 'approved').length;
  const underReviewCount = records.filter(r => r.status === 'submitted').length;
  const correctionsCount = records.filter(r => r.status === 'corrections_requested').length;

  const mandate = mandateData?.mandate;
  const todayStatus = mandateData?.todayStatus;

  return (
    <Layout>
      <div className="page-intro">
        <div>
          <label className="eyebrow">ACADEMIC PROGRESS</label>
          <h1>Daily Learning Log<em>.</em></h1>
          <p>Document your daily progress, track study hours, and receive mentor feedback.</p>
        </div>
        <button
          className="btn"
          onClick={() => {
            if (formOpen && !editingId) {
              setFormOpen(false);
            } else {
              setFormOpen(true);
              cancelEdit();
            }
          }}
        >
          {formOpen && !editingId ? 'Close Form' : '+ Log Study'} <ArrowRight size={16} />
        </button>
      </div>

      {err && <div className="error" role="alert">{err}</div>}
      {msg && <div className="success" role="status">{msg}</div>}

      {/* Active Mandate & Today's Status Banner */}
      {mandate && (
        <section
          className="panel"
          style={{
            padding: '20px 24px',
            marginBottom: '20px',
            background: 'linear-gradient(135deg, #f7fdff 0%, #ffffff 100%)',
            border: '1px solid #d4edf5'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ maxWidth: '650px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="pill" style={{ background: '#e3faff', color: '#098fab', fontWeight: 800 }}>
                  ACTIVE MANDATE
                </span>
                <span style={{ fontSize: '10px', color: '#688099', fontWeight: 600 }}>
                  Due daily by {mandate.due_time?.slice(0, 5) || '23:59'}
                </span>
                {mandate.allow_late_submissions ? (
                  <span style={{ fontSize: '9px', color: '#169a71' }}>• Late submissions allowed</span>
                ) : (
                  <span style={{ fontSize: '9px', color: '#b23040' }}>• Strict deadline (no late submissions)</span>
                )}
              </div>
              <h3 style={{ margin: '4px 0 6px', fontFamily: 'Manrope', fontSize: '16px', color: '#142a42' }}>
                {mandate.title}
              </h3>
              {mandate.instructions && (
                <p style={{ margin: 0, fontSize: '11px', color: '#697c92', lineHeight: 1.6 }}>
                  {mandate.instructions}
                </p>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gap: '4px',
                textAlign: 'right',
                minWidth: '150px'
              }}
            >
              <span style={{ fontSize: '9px', color: '#8899aa', fontWeight: 700, textTransform: 'uppercase' }}>
                Today's Status ({todayStr})
              </span>
              <div>
                {todayStatus?.status === 'approved' && (
                  <span className="pill" style={{ background: '#e3f8ef', color: '#13845f', padding: '6px 12px', fontSize: '10px' }}>
                    <CheckCircle2 size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                    Approved
                  </span>
                )}
                {todayStatus?.status === 'submitted' && (
                  <span className="pill" style={{ background: '#e5f3ff', color: '#1575ca', padding: '6px 12px', fontSize: '10px' }}>
                    <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                    Awaiting Review
                  </span>
                )}
                {todayStatus?.status === 'corrections_requested' && (
                  <span className="pill" style={{ background: '#fff4e5', color: '#b7730e', padding: '6px 12px', fontSize: '10px' }}>
                    <AlertCircle size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                    Corrections Requested
                  </span>
                )}
                {todayStatus?.status === 'draft' && (
                  <span className="pill" style={{ background: '#f0f3f6', color: '#56697f', padding: '6px 12px', fontSize: '10px' }}>
                    Draft Saved
                  </span>
                )}
                {todayStatus?.status === 'pending' && (
                  <span className="pill" style={{ background: '#e8f9fd', color: '#0994b2', padding: '6px 12px', fontSize: '10px' }}>
                    Pending Submission
                  </span>
                )}
                {todayStatus?.status === 'overdue' && (
                  <span className="pill" style={{ background: '#fff0f1', color: '#b83240', padding: '6px 12px', fontSize: '10px' }}>
                    <AlertCircle size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                    Overdue
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Corrections Banner if any */}
      {correctionsCount > 0 && (
        <div
          className="error"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '14px 18px',
            marginBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} color="#b83240" />
            <div>
              <b style={{ fontSize: '11px' }}>Action Required: Corrections Requested</b>
              <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#7a313b' }}>
                Your reviewer has requested revisions on {correctionsCount} learning record(s). Please review the feedback and resubmit.
              </p>
            </div>
          </div>
          {records.find(r => r.status === 'corrections_requested') && (
            <button
              className="btn light"
              style={{ fontSize: '10px', padding: '7px 12px', whiteSpace: 'nowrap' }}
              onClick={() => startEdit(records.find(r => r.status === 'corrections_requested'))}
            >
              Edit & Resubmit
            </button>
          )}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat">
          <span className="stat-icon a"><CalendarCheck size={19} /></span>
          <div>
            <small>Total Submissions</small>
            <b>{records.length}</b>
            <em>Recorded logs</em>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon b"><Clock size={19} /></span>
          <div>
            <small>Hours Logged</small>
            <b>{totalHours.toFixed(1)}</b>
            <em>Total learning hours</em>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon c"><CheckCircle2 size={19} /></span>
          <div>
            <small>Approved</small>
            <b>{approvedCount}</b>
            <em>Verified by mentor</em>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon d"><ClipboardCheck size={19} /></span>
          <div>
            <small>Under Review</small>
            <b>{underReviewCount}</b>
            <em>Pending feedback</em>
          </div>
        </div>
      </div>

      {/* Entry Form */}
      {formOpen && (
        <section className="panel form-panel" style={{ maxWidth: 'none', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <label className="eyebrow">{editingId ? 'REVISE SUBMISSION' : 'DAILY REPORT'}</label>
              <h3>{editingId ? 'Edit Learning Record' : 'Log Daily Learning Record'}</h3>
              <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#7a8b9e' }}>
                Fill out the topics covered and tasks completed today. You can save as a draft or submit directly.
              </p>
            </div>
            {editingId && (
              <button className="link" onClick={cancelEdit} style={{ color: '#8899aa' }}>
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={e => handleSubmit(e, false)}>
            <div className="two">
              <label>
                Record Date
                <input
                  type="date"
                  name="recordDate"
                  value={f.recordDate}
                  max={todayStr}
                  onChange={e => setF({ ...f, recordDate: e.target.value })}
                  required
                />
              </label>

              <label>
                Hours Spent Learning
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  max="24"
                  name="hoursSpent"
                  value={f.hoursSpent}
                  onChange={e => setF({ ...f, hoursSpent: e.target.value })}
                  placeholder="e.g. 3.5"
                  required
                />
              </label>
            </div>

            <label>
              Topics Learned
              <textarea
                name="topicsLearned"
                value={f.topicsLearned}
                onChange={e => setF({ ...f, topicsLearned: e.target.value })}
                placeholder="What topics, concepts, APIs, or architectural patterns did you learn today?"
                rows={3}
                required
              />
            </label>

            <label>
              Tasks & Activities Completed
              <textarea
                name="tasksCompleted"
                value={f.tasksCompleted}
                onChange={e => setF({ ...f, tasksCompleted: e.target.value })}
                placeholder="What projects, exercises, assignments, or coding challenges did you complete?"
                rows={3}
                required
              />
            </label>

            <div className="two">
              <label>
                Challenges or Blockers (Optional)
                <textarea
                  name="challengesBlockers"
                  value={f.challengesBlockers}
                  onChange={e => setF({ ...f, challengesBlockers: e.target.value })}
                  placeholder="Any difficult concepts, bugs, or questions where you need mentor help?"
                  rows={2}
                />
              </label>

              <label>
                Summary & Next Steps (Optional)
                <textarea
                  name="notesSummary"
                  value={f.notesSummary}
                  onChange={e => setF({ ...f, notesSummary: e.target.value })}
                  placeholder="Key takeaways, insights, or goals for your next learning session."
                  rows={2}
                />
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
              <button className="btn" type="submit" disabled={busy}>
                {busy ? 'Submitting…' : (editingId ? 'Save & Submit Revisions' : 'Submit for Review')}{' '}
                <Send size={15} />
              </button>

              <button
                className="btn light"
                type="button"
                disabled={busy}
                onClick={e => handleSubmit(e, true)}
              >
                Save as Draft
              </button>

              <button
                className="btn light"
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  cancelEdit();
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* History Table */}
      <section className="panel table-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px 16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0 }}>Submission History ({records.length})</h3>
            <p style={{ margin: '3px 0 0', fontSize: '10px', color: '#8899aa' }}>
              Review all your recorded study logs, submission dates, and examiner feedback.
            </p>
          </div>
        </div>

        {records.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Hours</th>
                  <th>Topics & Tasks</th>
                  <th>Submitted At</th>
                  <th>Status</th>
                  <th>Feedback</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const canEdit =
                    r.status === 'draft' ||
                    r.status === 'corrections_requested' ||
                    (r.status === 'submitted' && mandate?.allow_edits_after_submission === true);

                  return (
                    <tr key={r.id}>
                      <td>
                        <b>{new Date(r.record_date).toLocaleDateString()}</b>
                        {r.is_late && (
                          <span style={{ fontSize: '8px', color: '#b83240', fontWeight: 700 }}>
                            Late submission
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#162e48' }}>
                          {Number(r.hours_spent)} hrs
                        </span>
                      </td>
                      <td style={{ maxWidth: '280px', whiteSpace: 'normal' }}>
                        <b style={{ fontSize: '10px', color: '#273e56' }}>{r.topics_learned}</b>
                        <small style={{ display: 'block', color: '#7a8c9e', marginTop: '3px' }}>
                          {r.tasks_completed}
                        </small>
                      </td>
                      <td>
                        {r.submitted_at ? (
                          <>
                            <span>{new Date(r.submitted_at).toLocaleDateString()}</span>
                            <small>{new Date(r.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                          </>
                        ) : (
                          <span style={{ color: '#9aa8b7', fontStyle: 'italic', fontSize: '9px' }}>
                            Unsubmitted draft
                          </span>
                        )}
                      </td>
                      <td>
                        {r.status === 'approved' && (
                          <span className="pill" style={{ background: '#e3f8ef', color: '#13845f' }}>
                            Approved
                          </span>
                        )}
                        {r.status === 'submitted' && (
                          <span className="pill" style={{ background: '#e5f3ff', color: '#1575ca' }}>
                            Under Review
                          </span>
                        )}
                        {r.status === 'corrections_requested' && (
                          <span className="pill" style={{ background: '#fff4e5', color: '#b7730e' }}>
                            Corrections
                          </span>
                        )}
                        {r.status === 'draft' && (
                          <span className="pill" style={{ background: '#f0f3f6', color: '#56697f' }}>
                            Draft
                          </span>
                        )}
                      </td>
                      <td style={{ maxWidth: '200px', whiteSpace: 'normal' }}>
                        {r.feedback ? (
                          <span
                            style={{
                              fontSize: '9px',
                              color: r.status === 'corrections_requested' ? '#b83240' : '#2b445c',
                              fontWeight: 600
                            }}
                          >
                            "{r.feedback.length > 50 ? r.feedback.slice(0, 50) + '…' : r.feedback}"
                          </span>
                        ) : (
                          <span style={{ color: '#a0aebc', fontSize: '9px', fontStyle: 'italic' }}>
                            —
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="link"
                          style={{ marginRight: '10px' }}
                          onClick={() => viewDetails(r)}
                        >
                          <Eye size={13} style={{ verticalAlign: '-2px' }} /> View
                        </button>

                        {canEdit && (
                          <button
                            type="button"
                            className="link"
                            style={{ color: '#098fab', marginRight: '10px' }}
                            onClick={() => startEdit(r)}
                          >
                            <Edit3 size={13} style={{ verticalAlign: '-2px' }} /> Edit
                          </button>
                        )}

                        {r.status === 'draft' && (
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '5px 9px', fontSize: '9px' }}
                            disabled={busy}
                            onClick={() => handleDirectSubmit(r.id)}
                          >
                            Submit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <CalendarCheck size={36} />
            <b>No daily learning logs yet</b>
            <p>Track your studies every day by clicking "+ Log Study". Your logs will appear here.</p>
          </div>
        )}
      </section>

      {/* Detail Modal */}
      {activeModalRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(7, 21, 40, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setActiveModalRecord(null)}
        >
          <div
            className="panel"
            style={{
              width: 'min(680px, 100%)',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <label className="eyebrow">DAILY LEARNING LOG</label>
                <h3 style={{ margin: '5px 0', fontFamily: 'Manrope', fontSize: '20px', color: '#132840' }}>
                  {new Date(activeModalRecord.record_date).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
                <span style={{ fontSize: '10px', color: '#7a8d9e' }}>
                  Logged {Number(activeModalRecord.hours_spent)} study hours
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalRecord(null)}
                style={{ background: 'transparent', border: 0, color: '#8899aa', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '16px', fontSize: '11px', color: '#2b425b' }}>
              <div style={{ background: '#f8fbfd', border: '1px solid #e7eff6', borderRadius: '10px', padding: '14px' }}>
                <b style={{ color: '#098fab', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Topics Learned
                </b>
                <p style={{ margin: '6px 0 0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {activeModalRecord.topics_learned}
                </p>
              </div>

              <div style={{ background: '#f8fbfd', border: '1px solid #e7eff6', borderRadius: '10px', padding: '14px' }}>
                <b style={{ color: '#098fab', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Tasks & Activities Completed
                </b>
                <p style={{ margin: '6px 0 0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {activeModalRecord.tasks_completed}
                </p>
              </div>

              {activeModalRecord.challenges_blockers && (
                <div style={{ background: '#f8fbfd', border: '1px solid #e7eff6', borderRadius: '10px', padding: '14px' }}>
                  <b style={{ color: '#b7730e', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Challenges & Blockers
                  </b>
                  <p style={{ margin: '6px 0 0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {activeModalRecord.challenges_blockers}
                  </p>
                </div>
              )}

              {activeModalRecord.notes_summary && (
                <div style={{ background: '#f8fbfd', border: '1px solid #e7eff6', borderRadius: '10px', padding: '14px' }}>
                  <b style={{ color: '#098fab', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Summary / Key Notes
                  </b>
                  <p style={{ margin: '6px 0 0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {activeModalRecord.notes_summary}
                  </p>
                </div>
              )}

              {/* Review Feedback Thread */}
              {activeModalRecord.feedback && (
                <div
                  style={{
                    background: activeModalRecord.status === 'corrections_requested' ? '#fff5f5' : '#f0faf6',
                    border: `1px solid ${activeModalRecord.status === 'corrections_requested' ? '#fcd4d7' : '#c8eedd'}`,
                    borderRadius: '10px',
                    padding: '14px'
                  }}
                >
                  <b
                    style={{
                      color: activeModalRecord.status === 'corrections_requested' ? '#b83240' : '#14835f',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px'
                    }}
                  >
                    Examiner Feedback ({activeModalRecord.status === 'corrections_requested' ? 'Action Required' : 'Approved'})
                  </b>
                  <p style={{ margin: '6px 0 0', lineHeight: 1.7, color: '#2a425a', whiteSpace: 'pre-wrap' }}>
                    {activeModalRecord.feedback}
                  </p>
                  {activeModalRecord.reviewed_at && (
                    <small style={{ display: 'block', marginTop: '6px', color: '#8899aa' }}>
                      Reviewed on {new Date(activeModalRecord.reviewed_at).toLocaleString()}
                    </small>
                  )}
                </div>
              )}

              {/* Review History */}
              {recordReviews.length > 0 && (
                <div>
                  <b style={{ fontSize: '10px', color: '#566e85', textTransform: 'uppercase' }}>Review History</b>
                  <div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
                    {recordReviews.map(rv => (
                      <div
                        key={rv.id}
                        style={{
                          fontSize: '10px',
                          padding: '10px 12px',
                          background: '#fafcff',
                          border: '1px solid #edf1f6',
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8899aa', marginBottom: '3px' }}>
                          <span>{rv.reviewer_first_name} {rv.reviewer_last_name} · <b>{rv.action}</b></span>
                          <span>{new Date(rv.created_at).toLocaleString()}</span>
                        </div>
                        {rv.feedback && <p style={{ margin: '3px 0 0', color: '#334b62' }}>{rv.feedback}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {(activeModalRecord.status === 'draft' || activeModalRecord.status === 'corrections_requested') && (
                <button
                  className="btn"
                  onClick={() => {
                    const toEdit = activeModalRecord;
                    setActiveModalRecord(null);
                    startEdit(toEdit);
                  }}
                >
                  Edit Record <Edit3 size={15} />
                </button>
              )}
              <button className="btn light" onClick={() => setActiveModalRecord(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
