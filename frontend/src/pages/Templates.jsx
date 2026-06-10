import { useEffect, useState } from 'react';
import { Layout, Plus, Trash2, Edit2, Send, X, GripVertical, Eye } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../components/Modal';
import AppleSelect from '../components/AppleSelect';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { getCached, setCached } from '../api/cache';

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
];

const TEMPLATE_TYPES = ['custom','report','specification','proposal','technical_note','meeting_notes'];

function FieldEditor({ field, index, onChange, onRemove }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-ios border border-gray-150 group">
      <div className="flex-1 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="col-span-2">
            <input
              className="input-field text-sm py-2"
              value={field.label}
              onChange={(e) => onChange(index, { ...field, label: e.target.value })}
              placeholder="Field label *"
            />
          </div>
          <div className="w-[140px]">
            <AppleSelect
              value={field.type}
              onChange={(e) => onChange(index, { ...field, type: e.target.value, options: e.target.value === 'select' ? ['Option 1'] : undefined })}
              options={FIELD_TYPES.map((t) => ({value: t.value, label: t.label}))}
            />
          </div>
        </div>
        {field.type === 'select' && (
          <div>
            <p className="text-xs text-gray-500 mb-1 font-medium">Options (one per line)</p>
            <textarea
              className="input-field text-xs py-2 resize-none"
              rows={3}
              value={(field.options || []).join('\n')}
              onChange={(e) => onChange(index, { ...field, options: e.target.value.split('\n').filter(Boolean) })}
              placeholder="Option 1&#10;Option 2&#10;Option 3"
            />
          </div>
        )}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={field.required || false} onChange={(e) => onChange(index, { ...field, required: e.target.checked })} className="rounded" />
            Required
          </label>
          <input
            className="flex-1 input-field text-xs py-2"
            value={field.placeholder || ''}
            onChange={(e) => onChange(index, { ...field, placeholder: e.target.value })}
            placeholder="Placeholder text..."
          />
        </div>
      </div>
      <button onClick={() => onRemove(index)} className="p-1.5 text-gray-300 hover:text-red-500 rounded transition-colors mt-0.5 flex-shrink-0">
        <X size={15} />
      </button>
    </div>
  );
}

function SubmitModal({ open, onClose, template, projects }) {
  const [form, setForm] = useState({});
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) { setForm({}); setProjectId(''); setTitle(''); setError(''); setSuccess(false); }
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!projectId) return setError('Please select a project');
    setLoading(true); setError('');
    try {
      await api.post(`/templates/${template.id}/submit`, { project_id: projectId, data: form, title: title || template.name });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally { setLoading(false); }
  }

  if (success) return (
    <Modal isOpen={open} onClose={onClose} title="Submitted" size="sm">
      <div className="text-center py-6">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M5 14L10.5 19.5L23 7" stroke="#30D158" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <p className="text-base font-bold text-gray-900">Template Submitted</p>
        <p className="text-sm text-gray-500 mt-1">Your submission has been recorded.</p>
        <button onClick={onClose} className="btn-primary mt-5">Close</button>
      </div>
    </Modal>
  );

  return (
    <Modal isOpen={open} onClose={onClose} title={`Fill: ${template?.name}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Submission Title</label>
          <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={template?.name} />
        </div>
        <div>
          <label className="label">Project *</label>
          <AppleSelect
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            options={[{value: '', label: 'Select project...'}, ...projects.map((p) => ({value: p.id, label: p.name}))]}
          />
        </div>
        <div className="border-t border-gray-100 pt-4 space-y-4">
          {(template?.fields || []).map((field) => (
            <div key={field.id || field.label}>
              <label className="label">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</label>
              {field.type === 'textarea' ? (
                <textarea className="input-field resize-none" rows={3} required={field.required} placeholder={field.placeholder}
                  value={form[field.label] || ''} onChange={(e) => setForm({ ...form, [field.label]: e.target.value })} />
              ) : field.type === 'select' ? (
                <AppleSelect
                  value={form[field.label] || ''}
                  onChange={(e) => setForm({ ...form, [field.label]: e.target.value })}
                  options={[{value: '', label: 'Select...'}, ...(field.options || []).map((o) => ({value: o, label: o}))]}
                />
              ) : field.type === 'checkbox' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!form[field.label]} onChange={(e) => setForm({ ...form, [field.label]: e.target.checked })} className="rounded w-4 h-4" />
                  <span className="text-sm text-gray-700">{field.placeholder || field.label}</span>
                </label>
              ) : (
                <input className="input-field" type={field.type} required={field.required} placeholder={field.placeholder}
                  value={form[field.label] || ''} onChange={(e) => setForm({ ...form, [field.label]: e.target.value })} />
              )}
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Submitting...' : 'Submit'}</button>
        </div>
      </form>
    </Modal>
  );
}

function CreateTemplateModal({ open, onClose, onCreated, projects }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ name:'', description:'', template_type:'custom', is_public:false, project_id:'' });
  const [fields, setFields] = useState([{ label:'', type:'text', required:false, placeholder:'' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (!open) { setForm({ name:'', description:'', template_type:'custom', is_public:false, project_id:'' }); setFields([{ label:'', type:'text', required:false, placeholder:'' }]); setError(''); } }, [open]);

  function addField() { setFields([...fields, { label:'', type:'text', required:false, placeholder:'' }]); }
  function updateField(i, f) { setFields(fields.map((x, idx) => idx === i ? f : x)); }
  function removeField(i) { setFields(fields.filter((_, idx) => idx !== i)); }

  async function handleSubmit(e) {
    e.preventDefault();
    const validFields = fields.filter((f) => f.label.trim());
    if (validFields.length === 0) return setError('Add at least one field with a label');
    setLoading(true); setError('');
    try {
      const res = await api.post('/templates', { ...form, fields: validFields, project_id: form.project_id || null });
      onCreated(res.data.template); onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create template');
    } finally { setLoading(false); }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Create Template" size="xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Template Name *</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="e.g. Project Report" required />
          </div>
          <div>
            <label className="label">Type</label>
            <AppleSelect
              value={form.template_type}
              onChange={(e) => setForm({...form, template_type: e.target.value})}
              options={TEMPLATE_TYPES.map((t) => ({value: t, label: t.replace('_',' ')}))}
            />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input-field resize-none" rows={2} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="What is this template for?" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Associate with Project <span className="text-gray-400">(optional)</span></label>
            <AppleSelect
              value={form.project_id}
              onChange={(e) => setForm({...form, project_id: e.target.value})}
              options={[{value: '', label: 'All Projects (Global)'}, ...projects.map((p) => ({value: p.id, label: p.name}))]}
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => setForm({...form, is_public: !form.is_public})}
                className={`w-10 h-6 rounded-full transition-colors relative ${form.is_public ? 'bg-blue-500' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_public ? 'translate-x-4' : ''}`} />
              </div>
              <span className="text-sm font-medium text-gray-700">Public (visible to all)</span>
            </label>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-gray-700">Form Fields</label>
            <button type="button" onClick={addField} className="flex items-center gap-1.5 text-sm font-semibold text-blue-500 hover:text-blue-600 transition-colors">
              <Plus size={14} /> Add Field
            </button>
          </div>
          <div className="space-y-2.5 max-h-80 overflow-y-auto" data-lenis-prevent>
            {fields.map((f, i) => <FieldEditor key={i} field={f} index={i} onChange={updateField} onRemove={removeField} />)}
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Creating...' : 'Create Template'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Templates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState(() => getCached('/templates') || []);
  const [projects, setProjects] = useState(() => getCached('/projects') || []);
  const [loading, setLoading] = useState(() => !getCached('/templates'));
  const [showCreate, setShowCreate] = useState(false);
  const [submitTarget, setSubmitTarget] = useState(null);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    Promise.all([api.get('/templates'), api.get('/projects')]).then(([tRes, pRes]) => {
      setCached('/templates', tRes.data.templates);
      setCached('/projects', pRes.data.projects);
      setTemplates(tRes.data.templates);
      setProjects(pRes.data.projects);
    }).finally(() => setLoading(false));
  }, []);

  async function deleteTemplate(id) {
    if (!confirm('Delete this template?')) return;
    await api.delete(`/templates/${id}`);
    setTemplates((p) => p.filter((t) => t.id !== id));
  }

  const TYPE_COLOR = { custom:'bg-gray-100 text-gray-600', report:'bg-blue-100 text-blue-600', specification:'bg-orange-100 text-orange-600', proposal:'bg-green-100 text-green-600', technical_note:'bg-purple-100 text-purple-600', meeting_notes:'bg-teal-100 text-teal-600' };

  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 items-start">
        <div>
          <h2 className="page-title">Templates</h2>
          <p className="text-sm text-gray-400 mt-0.5">Create reusable form templates for structured data collection</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} strokeWidth={2.5} /> New Template
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-40 rounded-ios-lg" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="card flex flex-col items-center py-20 text-center">
          <Layout size={48} className="text-gray-200 mb-4" strokeWidth={1.5} />
          <p className="text-base font-semibold text-gray-500">No templates yet</p>
          <p className="text-sm text-gray-400 mt-1">Create templates to standardize data collection across your team</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-5">Create Template</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="card p-5 hover:shadow-apple-md transition-shadow group flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 bg-purple-50 border border-purple-100 rounded-ios flex items-center justify-center flex-shrink-0">
                  <Layout size={18} className="text-purple-500" strokeWidth={1.5} />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  {(t.created_by === user?.id || isAdmin) && (
                    <button onClick={() => deleteTemplate(t.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <p className="text-base font-bold text-gray-900 leading-snug">{t.name}</p>
                {t.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{t.description}</p>}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`badge capitalize ${TYPE_COLOR[t.template_type] || 'bg-gray-100 text-gray-600'}`}>{t.template_type?.replace('_',' ')}</span>
                  {t.is_public && <span className="badge bg-blue-50 text-blue-500">Public</span>}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{t.fields?.length || 0} fields · {t.submission_count || 0} uses</span>
                  <span>by {t.creator_name}</span>
                </div>
                <button onClick={() => setSubmitTarget(t)} className="w-full btn-primary text-sm py-2 mt-1">
                  <Send size={13} /> Use Template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateTemplateModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={(t) => setTemplates((p) => [t, ...p])} projects={projects} />
      {submitTarget && <SubmitModal open={!!submitTarget} onClose={() => setSubmitTarget(null)} template={submitTarget} projects={projects} />}
    </div>
  );
}
