import React, { useEffect, useState } from 'react';
import {
  Users,
  CalendarDays,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Eye,
  Check,
  MessageSquare,
  ArrowRight,
  Plus,
  Play,
  Pause,
  XCircle,
  X,
  FileText
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

export default function AdminDailyRecords({ Layout, Stat }) {
  const [tab, setTab] = useState('records'); // 'records' | 'mandates'
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [mandates, setMandates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Review modal state
  const [activeRecord, setActiveRecord] = useState(null);
  const [recordReviews, setRecordReviews] = useState([]);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [approving, setApproving] = useState(false);
  const [requestingCorrections, setRequestingCorrections] = useState(false);

  // Mandate modal / form state
  const [mandateModalOpen, setMandateModalOpen] = useState(false);
  const [editingMandate, setEditingMandate] = useState(null);
  const blankMandate = {
    title: '',
    instructions: '',
    targetType: 'all',
    targetValue: '',
    startDate: new Date().toISOString().slice(0, 10),
    dueTime: '23:59',
    endDate: '',
    status: 'active',
    allowLateSubmissions: true,
    allowEditsAfterSubmission: false
  };
  const [mf, setMf] = useState(blankMandate);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    setErr('');
    try {
      const [recordsRes, summaryRes, mandatesRes] = await Promise.all([
        api.get('/admin/daily-records').catch(() => ({ data: { records: [] } })),
        api.get('/admin/daily-records/summary').catch(() => ({ data: { summary: {} } })),
        api.get('/admin/daily-mandates').catch(() => ({ data: { mandates: [] } }))
      ]);

      setRecords(recordsRes.data.records || []);
      setSummary(summaryRes.data.summary || null);
      setMandates(mandatesRes.data.mandates || []);
    } catch (e) {
      setErr(e.response?.data?.error || 'Unable to load daily records data.');
    } finally {
      setLoading(false);
    }
  }

  async function openReviewModal(record) {
    setActiveRecord(record);
    setFeedbackInput(record.feedback || '');
    setRecordReviews([]);
    try {
      const res = await api.get(`/admin/daily-records/${record.id}`);
      setRecordReviews(res.data.reviews || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleApprove() {
    if (!activeRecord) return;
    setApproving(true);
    setErr('');
    setMsg('');
    try {
      await api.patch(`/admin/daily-records/${activeRecord.id}/approve`, {
        remarks: feedbackInput.trim() || undefined
      });
      setMsg('Daily learning record approved.');
      setActiveRecord(null);
      await loadAllData();
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not approve record.');
    } finally {
      setApproving(false);
    }
  }

  async function handleRequestCorrections() {
    if (!activeRecord) return;
    if (!feedbackInput.trim()) {
      return setErr('Please write specific revision feedback for the employee.');
    }
    setRequestingCorrections(true);
    setErr('');
    setMsg('');
    try {
      await api.patch(`/admin/daily-records/${activeRecord.id}/request-corrections`, {
        feedback: feedbackInput.trim()
      });
      setMsg('Corrections requested. Feedback has been sent to the employee.');
      setActiveRecord(null);
      await loadAllData();
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not request corrections.');
    } finally {
      setRequestingCorrections(false);
    }
  }

  // Mandate handlers
  function openCreateMandate() {
    setEditingMandate(null);
    setMf(blankMandate);
    setMandateModalOpen(true);
  }

  function openEditMandate(mandate) {
    setEditingMandate(mandate);
    setMf({
      title: mandate.title || '',
      instructions: mandate.instructions || '',
      targetType: mandate.target_type || 'all',
      targetValue: mandate.target_value || '',
      startDate: mandate.start_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      dueTime: mandate.due_time?.slice(0, 5) || '23:59',
      endDate: mandate.end_date?.slice(0, 10) || '',
      status: mandate.status || 'active',
      allowLateSubmissions: mandate.allow_late_submissions ?? true,
      allowEditsAfterSubmission: mandate.allow_edits_after_submission ?? false
    });
    setMandateModalOpen(true);
  }

  async function handleSaveMandate(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      if (editingMandate) {
        await api.patch(`/admin/daily-mandates/${editingMandate.id}`, mf);
        setMsg('Mandate updated successfully.');
      } else {
        await api.post('/admin/daily-mandates', mf);
        setMsg('New daily submission mandate created.');
      }
      setMandateModalOpen(false);
      await loadAllData();
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not save mandate.');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleMandateStatus(mandate, newStatus) {
    setBusy(true);
    setErr('');
    try {
      await api.patch(`/admin/daily-mandates/${mandate.id}`, { status: newStatus });
      setMsg(`Mandate status updated to ${newStatus}.`);
      await loadAllData();
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not update mandate.');
    } finally {
      setBusy(false);
    }
  }

  // Filter records client-side (or refresh API)
  const filtered = records.filter(r => {
    const studentMatch =
      !search.trim() ||
      (
        (r.first_name || '') +
        ' ' +
        (r.last_name || '') +
        ' ' +
        (r.student_id || '') +
        ' ' +
        (r.email || '') +
        ' ' +
        (r.topics_learned || '')
      )
        .toLowerCase()
        .includes(search.toLowerCase());

    const domainMatch =
      domainFilter === 'all'
        ? true
        : domainFilter === 'unassigned'
        ? !r.domain
        : r.domain === domainFilter;

    const statusMatch = statusFilter === 'all' ? true : r.status === statusFilter;

    const recordDateStr = r.record_date?.slice(0, 10);
    const startMatch = !startDate || recordDateStr >= startDate;
    const endMatch = !endDate || recordDateStr <= endDate;

    return studentMatch && domainMatch && statusMatch && startMatch && endMatch;
  });

  const s = summary || {};

  return (
    <Layout admin>
      <div className="page-intro">
        <div>
          <label className="eyebrow">ACADEMIC OVERSIGHT</label>
          <h1>Daily Learning Records<em>.</em></h1>
          <p>Monitor employee daily activity, review submitted work, and manage reporting mandates.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className={`btn ${tab === 'records' ? '' : 'light'}`}
            onClick={() => setTab('records')}
          >
            Submissions <CalendarCheck size={16} />
          </button>
          <button
            className={`btn ${tab === 'mandates' ? '' : 'light'}`}
            onClick={() => setTab('mandates')}
          >
            Submission Mandates <Filter size={16} />
          </button>
        </div>
      </div>

      {err && <div className="error" role="alert">{err}</div>}
      {msg && <div className="success" role="status">{msg}</div>}

      {/* 7 Summary Cards as requested */}
      <div className="stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '14px' }}>
        <Stat label="Total Employees" value={s.totalStudents} sub="Registered accounts" I={Users} tone="a" />
        <Stat label="Submitted Logs" value={s.totalRecords} sub="All recorded logs" I={CalendarCheck} tone="b" />
        <Stat label="Awaiting Review" value={s.awaitingReview} sub="Pending mentor review" I={Clock} tone="d" />
        <Stat label="Approved" value={s.approved} sub="Verified records" I={CheckCircle2} tone="b" />
      </div>

      <div className="stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '22px' }}>
        <Stat label="Corrections Requested" value={s.correctionsRequested} sub="Revisions awaiting employee" I={AlertCircle} tone="d" />
        <Stat label="Today: Pending" value={s.pendingToday} sub="Awaiting submission today" I={Clock} tone="a" />
        <Stat label="Today: Overdue" value={s.overdueToday} sub="Passed daily due time" I={XCircle} tone="d" />
      </div>

      {/* Tab 1: Records View */}
      {tab === 'records' && (
        <section className="panel table-panel">
          <div className="results-toolbar" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3>Daily Submissions ({filtered.length})</h3>
              <p style={{ margin: '3px 0 0', fontSize: '10px', color: '#8899aa' }}>
                Filter by employee, learning domain, submission status, or date range.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <input
                aria-label="Search records"
                placeholder="Search employee, ID, topic..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '220px', fontSize: '11px', padding: '9px 12px' }}
              />

              <select
                aria-label="Filter by domain"
                value={domainFilter}
                onChange={e => setDomainFilter(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #dfe7ef', borderRadius: '8px', fontSize: '11px', background: '#fbfdff' }}
              >
                <option value="all">All Domains</option>
                <option value="fullstack">Full Stack Development</option>
                <option value="database">Database</option>
                <option value="testing">Testing</option>
                <option value="cybersecurity">Cybersecurity</option>
                <option value="sap">SAP</option>
                <option value="devops">DevOps</option>
                <option value="unassigned">Not specified</option>
              </select>

              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #dfe7ef', borderRadius: '8px', fontSize: '11px', background: '#fbfdff' }}
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Awaiting Review</option>
                <option value="approved">Approved</option>
                <option value="corrections_requested">Corrections Requested</option>
                <option value="draft">Draft</option>
              </select>

              <input
                type="date"
                aria-label="Start date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ padding: '7px 10px', border: '1px solid #dfe7ef', borderRadius: '8px', fontSize: '10px' }}
              />
              <span style={{ fontSize: '10px', color: '#8899aa' }}>to</span>
              <input
                type="date"
                aria-label="End date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{ padding: '7px 10px', border: '1px solid #dfe7ef', borderRadius: '8px', fontSize: '10px' }}
              />

              {(search || domainFilter !== 'all' || statusFilter !== 'all' || startDate || endDate) && (
                <button
                  className="link"
                  style={{ fontSize: '10px' }}
                  onClick={() => {
                    setSearch('');
                    setDomainFilter('all');
                    setStatusFilter('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {filtered.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Employee ID</th>
                    <th>Domain</th>
                    <th>Date</th>
                    <th>Submission Time</th>
                    <th>Summary & Topics</th>
                    <th>Hours</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id}>
                      <td>
                        <b>{r.first_name} {r.last_name}</b>
                        <small>{r.email}</small>
                      </td>
                      <td>{r.student_id}</td>
                      <td>
                        {r.domain ? (
                          <span className="pill" style={{ textTransform: 'none', fontWeight: 600 }}>
                            {DOMAIN_LABELS[r.domain] || r.domain}
                          </span>
                        ) : (
                          <span style={{ color: '#8a9aa9', fontSize: '10px', fontStyle: 'italic' }}>
                            Not specified
                          </span>
                        )}
                      </td>
                      <td>
                        <b>{new Date(r.record_date).toLocaleDateString()}</b>
                      </td>
                      <td>
                        {r.submitted_at ? (
                          <>
                            <span>{new Date(r.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <small>{new Date(r.submitted_at).toLocaleDateString()}</small>
                            {r.is_late && (
                              <span style={{ color: '#b83240', fontSize: '8px', fontWeight: 800 }}>
                                LATE
                              </span>
                            )}
                          </>
                        ) : (
                          <span style={{ color: '#9aa8b7', fontStyle: 'italic', fontSize: '9px' }}>
                            Draft
                          </span>
                        )}
                      </td>
                      <td style={{ maxWidth: '240px', whiteSpace: 'normal' }}>
                        <b style={{ fontSize: '10px' }}>{r.topics_learned}</b>
                        <small style={{ color: '#7a8c9e', marginTop: '2px', display: 'block' }}>
                          {r.tasks_completed}
                        </small>
                      </td>
                      <td>
                        <b>{Number(r.hours_spent)} hrs</b>
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
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="link"
                          onClick={() => openReviewModal(r)}
                        >
                          <Eye size={13} style={{ verticalAlign: '-2px' }} /> Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              <CalendarCheck size={36} />
              <b>No daily records match your query</b>
              <p>Try clearing filters or adjusting your date range.</p>
            </div>
          )}
        </section>
      )}

      {/* Tab 2: Mandates Management */}
      {tab === 'mandates' && (
        <section className="panel table-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px 16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3>Submission Mandates ({mandates.length})</h3>
              <p style={{ margin: '3px 0 0', fontSize: '10px', color: '#8899aa' }}>
                Enforce daily study submissions across all employees or targeted learning domains.
              </p>
            </div>
            <button className="btn" onClick={openCreateMandate}>
              + Create New Mandate <Plus size={16} />
            </button>
          </div>

          {mandates.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Title & Instructions</th>
                    <th>Target Audience</th>
                    <th>Daily Due Time</th>
                    <th>Active Window</th>
                    <th>Late Submissions</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mandates.map(m => (
                    <tr key={m.id}>
                      <td style={{ maxWidth: '280px', whiteSpace: 'normal' }}>
                        <b>{m.title}</b>
                        {m.instructions && (
                          <small style={{ color: '#7a8c9e', marginTop: '2px', display: 'block' }}>
                            {m.instructions}
                          </small>
                        )}
                      </td>
                      <td>
                        {m.target_type === 'all' && (
                          <span className="pill" style={{ background: '#e3faff', color: '#098fab' }}>
                            All Employees
                          </span>
                        )}
                        {m.target_type === 'domain' && (
                          <span className="pill" style={{ textTransform: 'none' }}>
                            Domain: {DOMAIN_LABELS[m.target_value] || m.target_value}
                          </span>
                        )}
                        {m.target_type === 'student' && (
                          <span className="pill">Specific Employee</span>
                        )}
                      </td>
                      <td>
                        <b>{m.due_time?.slice(0, 5) || '23:59'}</b>
                      </td>
                      <td>
                        <span>{new Date(m.start_date).toLocaleDateString()}</span>
                        {m.end_date ? (
                          <small>to {new Date(m.end_date).toLocaleDateString()}</small>
                        ) : (
                          <small style={{ color: '#169a71' }}>Ongoing</small>
                        )}
                      </td>
                      <td>
                        {m.allow_late_submissions ? (
                          <span style={{ color: '#169a71', fontSize: '10px', fontWeight: 600 }}>Allowed</span>
                        ) : (
                          <span style={{ color: '#b83240', fontSize: '10px', fontWeight: 600 }}>Disallowed</span>
                        )}
                      </td>
                      <td>
                        {m.status === 'active' && (
                          <span className="pill" style={{ background: '#e3f8ef', color: '#13845f' }}>
                            Active
                          </span>
                        )}
                        {m.status === 'paused' && (
                          <span className="pill" style={{ background: '#fff4e5', color: '#b7730e' }}>
                            Paused
                          </span>
                        )}
                        {m.status === 'ended' && (
                          <span className="pill" style={{ background: '#f0f3f6', color: '#56697f' }}>
                            Ended
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="link"
                          style={{ marginRight: '8px' }}
                          onClick={() => openEditMandate(m)}
                        >
                          Edit
                        </button>

                        {m.status === 'active' && (
                          <button
                            type="button"
                            className="link"
                            style={{ color: '#b7730e', marginRight: '8px' }}
                            onClick={() => handleToggleMandateStatus(m, 'paused')}
                          >
                            Pause
                          </button>
                        )}

                        {m.status === 'paused' && (
                          <button
                            type="button"
                            className="link"
                            style={{ color: '#14835f', marginRight: '8px' }}
                            onClick={() => handleToggleMandateStatus(m, 'active')}
                          >
                            Resume
                          </button>
                        )}

                        {m.status !== 'ended' && (
                          <button
                            type="button"
                            className="delete-link"
                            onClick={() => handleToggleMandateStatus(m, 'ended')}
                          >
                            End Mandate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              <Filter size={36} />
              <b>No submission mandates active</b>
              <p>Create a daily mandate to establish submission requirements and due times.</p>
            </div>
          )}
        </section>
      )}

      {/* Review & Approve / Request Corrections Modal */}
      {activeRecord && (
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
          onClick={() => setActiveRecord(null)}
        >
          <div
            className="panel"
            style={{
              width: 'min(720px, 100%)',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <label className="eyebrow">REVIEW LEARNING SUBMISSION</label>
                <h3 style={{ margin: '4px 0 2px', fontFamily: 'Manrope', fontSize: '20px', color: '#132840' }}>
                  {activeRecord.first_name} {activeRecord.last_name}
                </h3>
                <span style={{ fontSize: '10px', color: '#7a8d9e' }}>
                  Employee ID: <b>{activeRecord.student_id}</b> · {activeRecord.email} ·{' '}
                  {activeRecord.domain ? DOMAIN_LABELS[activeRecord.domain] || activeRecord.domain : 'Domain not specified'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveRecord(null)}
                style={{ background: 'transparent', border: 0, color: '#8899aa', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Submission metadata bar */}
            <div
              style={{
                display: 'flex',
                gap: '20px',
                padding: '12px 14px',
                background: '#f8fbfd',
                border: '1px solid #e7eff6',
                borderRadius: '9px',
                fontSize: '11px',
                marginBottom: '16px',
                flexWrap: 'wrap'
              }}
            >
              <div>
                <small style={{ color: '#8899aa', display: 'block', fontSize: '9px' }}>RECORD DATE</small>
                <b>{new Date(activeRecord.record_date).toLocaleDateString()}</b>
              </div>
              <div>
                <small style={{ color: '#8899aa', display: 'block', fontSize: '9px' }}>STUDY HOURS</small>
                <b>{Number(activeRecord.hours_spent)} hrs</b>
              </div>
              <div>
                <small style={{ color: '#8899aa', display: 'block', fontSize: '9px' }}>SUBMITTED AT</small>
                <b>{activeRecord.submitted_at ? new Date(activeRecord.submitted_at).toLocaleString() : 'Draft'}</b>
                {activeRecord.is_late && <span style={{ color: '#b83240', marginLeft: '6px', fontWeight: 800 }}>[LATE]</span>}
              </div>
              <div>
                <small style={{ color: '#8899aa', display: 'block', fontSize: '9px' }}>REVISIONS</small>
                <b>{activeRecord.submission_count || 1}</b>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '14px', fontSize: '11px', color: '#2b425b', marginBottom: '20px' }}>
              <div style={{ background: '#f8fbfd', border: '1px solid #e7eff6', borderRadius: '10px', padding: '14px' }}>
                <b style={{ color: '#098fab', fontSize: '10px', textTransform: 'uppercase' }}>Topics Learned</b>
                <p style={{ margin: '6px 0 0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {activeRecord.topics_learned}
                </p>
              </div>

              <div style={{ background: '#f8fbfd', border: '1px solid #e7eff6', borderRadius: '10px', padding: '14px' }}>
                <b style={{ color: '#098fab', fontSize: '10px', textTransform: 'uppercase' }}>Tasks & Activities Completed</b>
                <p style={{ margin: '6px 0 0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {activeRecord.tasks_completed}
                </p>
              </div>

              {activeRecord.challenges_blockers && (
                <div style={{ background: '#f8fbfd', border: '1px solid #e7eff6', borderRadius: '10px', padding: '14px' }}>
                  <b style={{ color: '#b7730e', fontSize: '10px', textTransform: 'uppercase' }}>Challenges & Blockers</b>
                  <p style={{ margin: '6px 0 0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {activeRecord.challenges_blockers}
                  </p>
                </div>
              )}

              {activeRecord.notes_summary && (
                <div style={{ background: '#f8fbfd', border: '1px solid #e7eff6', borderRadius: '10px', padding: '14px' }}>
                  <b style={{ color: '#098fab', fontSize: '10px', textTransform: 'uppercase' }}>Summary & Key Insights</b>
                  <p style={{ margin: '6px 0 0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {activeRecord.notes_summary}
                  </p>
                </div>
              )}

              {/* Review History */}
              {recordReviews.length > 0 && (
                <div>
                  <b style={{ fontSize: '10px', color: '#566e85', textTransform: 'uppercase' }}>Previous Reviews & Actions</b>
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

              {/* Examiner Feedback Input */}
              <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'grid', gap: '6px', fontSize: '10px', fontWeight: 700, color: '#33465d' }}>
                  Review Feedback / Revision Notes
                  <textarea
                    rows={3}
                    placeholder="Enter mentor remarks (mandatory if requesting corrections, optional if approving)..."
                    value={feedbackInput}
                    onChange={e => setFeedbackInput(e.target.value)}
                    style={{
                      width: '100%',
                      border: '1px solid #dfe7ef',
                      borderRadius: '8px',
                      padding: '10px',
                      fontSize: '11px',
                      boxSizing: 'border-box'
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Review actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <button
                className="btn light"
                type="button"
                onClick={() => setActiveRecord(null)}
              >
                Close
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn"
                  style={{
                    background: 'linear-gradient(110deg, #b7730e, #d88910)',
                    color: '#fff',
                    boxShadow: 'none'
                  }}
                  disabled={requestingCorrections || approving}
                  onClick={handleRequestCorrections}
                >
                  <AlertCircle size={15} />
                  {requestingCorrections ? 'Sending…' : 'Request Corrections'}
                </button>

                <button
                  className="btn"
                  style={{
                    background: 'linear-gradient(110deg, #13845f, #1bb583)',
                    color: '#fff'
                  }}
                  disabled={approving || requestingCorrections}
                  onClick={handleApprove}
                >
                  <Check size={15} />
                  {approving ? 'Approving…' : 'Approve Record'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mandate Create/Edit Modal */}
      {mandateModalOpen && (
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
          onClick={() => setMandateModalOpen(false)}
        >
          <div
            className="panel form-panel"
            style={{
              width: 'min(640px, 100%)',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <label className="eyebrow">{editingMandate ? 'EDIT MANDATE' : 'NEW SUBMISSION MANDATE'}</label>
                <h3 style={{ margin: '4px 0 2px', fontFamily: 'Manrope', fontSize: '20px', color: '#132840' }}>
                  {editingMandate ? 'Edit Submission Mandate' : 'Create Daily Reporting Mandate'}
                </h3>
                <p style={{ margin: 0, fontSize: '10px', color: '#7a8d9e' }}>
                  Configure daily submission rules, schedules, and target employee cohorts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMandateModalOpen(false)}
                style={{ background: 'transparent', border: 0, color: '#8899aa', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveMandate}>
              <label>
                Mandate Title
                <input
                  name="title"
                  value={mf.title}
                  onChange={e => setMf({ ...mf, title: e.target.value })}
                  placeholder="e.g. Daily Standup & Learning Log"
                  required
                />
              </label>

              <label>
                Instructions for Employees
                <textarea
                  name="instructions"
                  value={mf.instructions}
                  onChange={e => setMf({ ...mf, instructions: e.target.value })}
                  placeholder="Explain what topics or artifacts should be documented daily..."
                  rows={3}
                />
              </label>

              <div className="two">
                <label>
                  Target Audience
                  <select
                    name="targetType"
                    value={mf.targetType}
                    onChange={e => setMf({ ...mf, targetType: e.target.value, targetValue: '' })}
                  >
                    <option value="all">All Enrolled Employees</option>
                    <option value="domain">By Learning Domain</option>
                    <option value="student">Specific Employee</option>
                  </select>
                </label>

                {mf.targetType === 'domain' && (
                  <label>
                    Select Domain
                    <select
                      name="targetValue"
                      value={mf.targetValue}
                      onChange={e => setMf({ ...mf, targetValue: e.target.value })}
                      required
                    >
                      <option value="">-- Choose Domain --</option>
                      <option value="fullstack">Full Stack Development</option>
                      <option value="database">Database</option>
                      <option value="testing">Testing</option>
                      <option value="cybersecurity">Cybersecurity</option>
                      <option value="sap">SAP</option>
                      <option value="devops">DevOps</option>
                    </select>
                  </label>
                )}

                {mf.targetType === 'student' && (
                  <label>
                    Employee ID or UUID
                    <input
                      name="targetValue"
                      value={mf.targetValue}
                      onChange={e => setMf({ ...mf, targetValue: e.target.value })}
                      placeholder="e.g. 294001 or employee UUID"
                      required
                    />
                  </label>
                )}

                {mf.targetType === 'all' && (
                  <label>
                    Reporting Frequency
                    <input value="Daily" disabled style={{ background: '#f5f7fa', color: '#7a8c9e' }} />
                  </label>
                )}
              </div>

              <div className="three">
                <label>
                  Start Date
                  <input
                    type="date"
                    name="startDate"
                    value={mf.startDate}
                    onChange={e => setMf({ ...mf, startDate: e.target.value })}
                    required
                  />
                </label>

                <label>
                  Daily Due Time
                  <input
                    type="time"
                    name="dueTime"
                    value={mf.dueTime}
                    onChange={e => setMf({ ...mf, dueTime: e.target.value })}
                    required
                  />
                </label>

                <label>
                  End Date (Optional)
                  <input
                    type="date"
                    name="endDate"
                    value={mf.endDate}
                    onChange={e => setMf({ ...mf, endDate: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gap: '10px', marginTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={mf.allowLateSubmissions}
                    onChange={e => setMf({ ...mf, allowLateSubmissions: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Allow late submissions after daily due time</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={mf.allowEditsAfterSubmission}
                    onChange={e => setMf({ ...mf, allowEditsAfterSubmission: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Allow employee edits after submission (before review)</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
                <button
                  type="button"
                  className="btn light"
                  onClick={() => setMandateModalOpen(false)}
                >
                  Cancel
                </button>
                <button className="btn" type="submit" disabled={busy}>
                  {busy ? 'Saving…' : (editingMandate ? 'Save Changes' : 'Create Mandate')} <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
