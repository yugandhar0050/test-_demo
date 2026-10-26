import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import api from './api';

export default function AdminRoadmapProgress({ Layout }) {
  const Wrapper = Layout ? ({ children }) => <Layout admin>{children}</Layout> : ({ children }) => <div className="portal-content">{children}</div>;
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [assignable, setAssignable] = useState([]);
  const [catalog, setCatalog] = useState({ modules: [], courses: [] });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [moduleForm, setModuleForm] = useState({ name: '', description: '', courseId: '' });
  const [topicForm, setTopicForm] = useState({ moduleId: '', name: '', description: '' });
  const [assignTopic, setAssignTopic] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadCatalog() {
    const r = await api.get('/admin/roadmap/catalog');
    setCatalog(r.data);
    setTopicForm(v => ({
      ...v,
      moduleId: v.moduleId || (r.data.modules?.[0]?.id ? String(r.data.modules[0].id) : '')
    }));
  }

  useEffect(() => {
    Promise.all([api.get('/admin/student-progress'), loadCatalog()])
      .then(([r]) => setStudents(r.data.students || []))
      .catch(e => setErr(e.response?.data?.error || 'Unable to load employee roadmap data.'))
      .finally(() => setLoading(false));
  }, []);

  async function openStudent(student) {
    setSelected(student);
    setDetail(null);
    setErr('');
    setDetailLoading(true);
    try {
      const [r, a] = await Promise.all([
        api.get(`/admin/student-progress/${student.id}`),
        api.get(`/admin/student-progress/${student.id}/assignable-topics`)
      ]);
      setDetail(r.data);
      setAssignable(a.data.topics || []);
      setAssignTopic(a.data.topics?.[0]?.id ? String(a.data.topics[0].id) : '');
    } catch (e) {
      setErr(e.response?.data?.error || 'Unable to load this employee roadmap.');
    } finally {
      setDetailLoading(false);
    }
  }

  async function createModule(e) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    setMsg('');
    try {
      const r = await api.post('/admin/roadmap/modules', moduleForm);
      setModuleForm({ name: '', description: '', courseId: '' });
      await loadCatalog();
      if (r.data?.module?.id) {
        setTopicForm(v => ({ ...v, moduleId: String(r.data.module.id) }));
      }
      setMsg('Module created. Add topics below.');
    } catch (e) {
      setErr(e.response?.data?.error || 'Unable to create module.');
    } finally {
      setSaving(false);
    }
  }

  async function createTopic(e) {
    e.preventDefault();
    if (!topicForm.moduleId) {
      setErr('Please select a module first.');
      return;
    }
    setSaving(true);
    setErr('');
    setMsg('');
    try {
      await api.post(`/admin/roadmap/modules/${topicForm.moduleId}/topics`, {
        name: topicForm.name,
        description: topicForm.description
      });
      setTopicForm(v => ({ ...v, name: '', description: '' }));
      const [r] = await Promise.all([api.get('/admin/student-progress'), loadCatalog()]);
      setStudents(r.data.students || []);
      if (selected) await openStudent(selected);
      setMsg('Topic created successfully.');
    } catch (e) {
      setErr(e.response?.data?.error || 'Unable to create topic.');
    } finally {
      setSaving(false);
    }
  }

  async function assign() {
    if (!selected || !assignTopic) return;
    setSaving(true);
    setErr('');
    try {
      await api.post(`/admin/student-progress/${selected.id}/topics`, { topicId: assignTopic });
      await openStudent(selected);
      setMsg('Topic assigned to employee.');
    } catch (e) {
      setErr(e.response?.data?.error || 'Unable to assign topic.');
    } finally {
      setSaving(false);
    }
  }

  async function unassign(topic) {
    if (!selected) return;
    setSaving(true);
    setErr('');
    try {
      await api.delete(`/admin/student-progress/${selected.id}/topics/${topic.id}`);
      await openStudent(selected);
      setMsg('Topic assignment removed.');
    } catch (e) {
      setErr(e.response?.data?.error || 'Unable to remove assignment.');
    } finally {
      setSaving(false);
    }
  }

  const filtered = students.filter(s => {
    const matches = (s.student_id + ' ' + s.first_name + ' ' + s.last_name + ' ' + s.email).toLowerCase().includes(search.toLowerCase());
    const status = filter === 'all'
      || (filter === 'not_started' && s.completed_topics === 0)
      || (filter === 'in_progress' && s.completed_topics > 0 && s.pending_topics > 0)
      || (filter === 'complete' && s.total_topics > 0 && s.pending_topics === 0);
    return matches && status;
  });

  const groups = (detail?.topics || []).reduce((all, t) => {
    let m = all.find(x => x.id === t.module_id);
    if (!m) {
      m = { id: t.module_id, name: t.module_name, topics: [] };
      all.push(m);
    }
    m.topics.push(t);
    return all;
  }, []);

  return (
    <Wrapper>
      <div className="page-intro">
        <div>
          <label className="eyebrow">EMPLOYEE LEARNING</label>
          <h1>Roadmap progress</h1>
          <p>Create modules and topics, then assign course topics to individual employees.</p>
        </div>
      </div>
      {err && <div className="error" role="alert">{err}</div>}
      {msg && <div className="success" role="status">{msg}</div>}

      <section className="roadmap-content-manager">
        <form className="panel form-panel" onSubmit={createModule}>
          <h3>Create a roadmap module</h3>
          <p className="form-help">Choose a course for course-specific topics, or leave blank for all employees.</p>
          <label>
            Module name
            <input
              value={moduleForm.name}
              onChange={e => setModuleForm({ ...moduleForm, name: e.target.value })}
              required
              placeholder="e.g. Full Stack Development"
            />
          </label>
          <label>
            Course
            <select
              value={moduleForm.courseId}
              onChange={e => setModuleForm({ ...moduleForm, courseId: e.target.value })}
            >
              <option value="">All employees</option>
              {catalog.courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.code ? ` (${c.code})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            Description
            <textarea
              value={moduleForm.description}
              onChange={e => setModuleForm({ ...moduleForm, description: e.target.value })}
              placeholder="What employees will learn"
            />
          </label>
          <div className="roadmap-form-footer">
            <button className="btn" disabled={saving}>
              {saving ? 'Saving…' : 'Create module'} <ArrowRight size={16} />
            </button>
          </div>
        </form>

        <form className="panel form-panel" onSubmit={createTopic}>
          <h3>Add a roadmap topic</h3>
          <p className="form-help">Topics are added to a module, and inherited by its course or all employees.</p>
          <label>
            Module
            <select
              value={String(topicForm.moduleId || '')}
              onChange={e => setTopicForm({ ...topicForm, moduleId: e.target.value })}
              required
            >
              <option value="">Choose a module</option>
              {catalog.modules.map(m => (
                <option key={m.id} value={String(m.id)}>
                  {m.name}{m.course_name ? ` — ${m.course_name}` : ' — All employees'}
                </option>
              ))}
            </select>
          </label>
          <label>
            Topic name
            <input
              value={topicForm.name}
              onChange={e => setTopicForm({ ...topicForm, name: e.target.value })}
              required
              placeholder="e.g. Relational databases"
            />
          </label>
          <label>
            Description
            <textarea
              value={topicForm.description}
              onChange={e => setTopicForm({ ...topicForm, description: e.target.value })}
              placeholder="Optional learning objective"
            />
          </label>
          <div className="roadmap-form-footer">
            <button className="btn" disabled={saving || !topicForm.moduleId}>
              {saving ? 'Saving…' : 'Add topic'} <ArrowRight size={16} />
            </button>
            <small className="form-help">
              {catalog.modules.length} modules · {catalog.modules.reduce((n, m) => n + Number(m.topic_count || 0), 0)} topics
            </small>
          </div>
        </form>
      </section>

      {selected ? (
        <>
          <div className="roadmap-detail-toolbar">
            <button className="btn light" onClick={() => { setSelected(null); setDetail(null); setMsg(''); setErr(''); }}>
              ← All employees
            </button>
            <span>{selected.first_name} {selected.last_name} · {selected.student_id}</span>
          </div>
          {detailLoading ? (
            <div className="panel empty">Loading employee roadmap…</div>
          ) : detail && (
            <>
              <div className="roadmap-assign-bar panel">
                <label>
                  Assign a course-specific topic
                  <select value={assignTopic} onChange={e => setAssignTopic(e.target.value)}>
                    <option value="">Choose a topic</option>
                    {assignable.map(t => (
                      <option key={t.id} value={String(t.id)}>
                        {t.module_name} — {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="btn" disabled={saving || !assignTopic} onClick={assign}>
                  Assign topic <ArrowRight size={16} />
                </button>
                {!assignable.length && (
                  <small>All existing course topics are already available or assigned.</small>
                )}
              </div>
              <div className="roadmap-admin-summary">
                <div><b>{detail.progress.total}</b><small>Total topics</small></div>
                <div><b>{detail.progress.completed}</b><small>Completed</small></div>
                <div><b>{detail.progress.pending}</b><small>Pending</small></div>
                <div><b>{detail.progress.percentage}%</b><small>Overall completion</small></div>
              </div>
              {groups.length ? (
                groups.map(m => (
                  <section className="panel roadmap-admin-module" key={m.id}>
                    <div className="roadmap-admin-module-title">
                      <h3>{m.name}</h3>
                      <span>{m.topics.filter(t => t.is_completed).length} / {m.topics.length} completed</span>
                    </div>
                    {m.topics.map(t => (
                      <div className={`roadmap-admin-topic ${t.is_completed ? 'is-complete' : ''}`} key={t.id}>
                        <span className="roadmap-status-dot" />
                        <div>
                          <b>{t.name}</b>
                          {t.description && <small>{t.description}</small>}
                        </div>
                        <strong>{t.is_completed ? 'Completed' : 'Pending'}</strong>
                        <time>{t.updated_at ? new Date(t.updated_at).toLocaleString() : 'Not updated'}</time>
                        {t.is_explicitly_assigned && (
                          <button className="delete-link" disabled={saving} onClick={() => unassign(t)}>
                            Unassign
                          </button>
                        )}
                      </div>
                    ))}
                  </section>
                ))
              ) : (
                <div className="panel empty">
                  <b>No topics for this employee yet</b>
                  <p>Create a global module/topic above, or create a course-specific topic and assign it here.</p>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="panel table-panel roadmap-admin-table">
          <div className="roadmap-admin-filters">
            <input
              aria-label="Search employees"
              placeholder="Search name, employee ID, or email"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              aria-label="Filter employees by roadmap progress"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="all">All employees</option>
              <option value="not_started">Not started</option>
              <option value="in_progress">In progress</option>
              <option value="complete">Complete</option>
            </select>
          </div>
          {loading ? (
            <div className="empty">Loading employee progress…</div>
          ) : filtered.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Employee ID</th>
                    <th>Total topics</th>
                    <th>Completed</th>
                    <th>Pending</th>
                    <th>Progress</th>
                    <th>Last update</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id}>
                      <td><b>{s.first_name} {s.last_name}</b><small>{s.email}</small></td>
                      <td>{s.student_id}</td>
                      <td>{s.total_topics}</td>
                      <td>{s.completed_topics}</td>
                      <td>{s.pending_topics}</td>
                      <td>
                        <span className="roadmap-table-progress">
                          <i><span style={{ width: `${s.percentage}%` }} /></i>
                          {s.percentage}%
                        </span>
                      </td>
                      <td>{s.last_updated ? new Date(s.last_updated).toLocaleString() : 'Not updated'}</td>
                      <td>
                        <button className="link" onClick={() => openStudent(s)}>
                          Manage topics →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              <BookOpen />
              <b>No employees match this filter</b>
            </div>
          )}
        </div>
      )}
    </Wrapper>
  );
}
