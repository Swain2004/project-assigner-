import { useEffect, useState, useRef } from 'react';
import { Layout, Plus, Trash2, Upload, Download, Send, X, FileText, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../components/Modal';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { getCached, setCached } from '../api/cache';

function fileTypeInfo(mime, name) {
  if (!mime && name) {
    const ext = name.split('.').pop().toLowerCase();
    if (['xls','xlsx'].includes(ext)) return { label: 'Excel', color: 'bg-green-50 text-green-600 border-green-100', icon: '📊' };
    if (['doc','docx'].includes(ext)) return { label: 'Word', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: '📝' };
    if (ext === 'pdf') return { label: 'PDF', color: 'bg-red-50 text-red-600 border-red-100', icon: '📄' };
    if (ext === 'csv') return { label: 'CSV', color: 'bg-teal-50 text-teal-600 border-teal-100', icon: '📋' };
    if (['ppt','pptx'].includes(ext)) return { label: 'PPT', color: 'bg-orange-50 text-orange-600 border-orange-100', icon: '📑' };
  }
  if (!mime) return { label: 'File', color: 'bg-gray-50 text-gray-500 border-gray-200', icon: '📎' };
  if (mime.includes('pdf')) return { label: 'PDF', color: 'bg-red-50 text-red-600 border-red-100', icon: '📄' };
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return { label: mime.includes('csv') ? 'CSV' : 'Excel', color: 'bg-green-50 text-green-600 border-green-100', icon: '📊' };
  if (mime.includes('word') || mime.includes('document')) return { label: 'Word', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: '📝' };
  if (mime.includes('presentation') || mime.includes('powerpoint')) return { label: 'PPT', color: 'bg-orange-50 text-orange-600 border-orange-100', icon: '📑' };
  if (mime.includes('image')) return { label: 'Image', color: 'bg-purple-50 text-purple-600 border-purple-100', icon: '🖼️' };
  if (mime.includes('text')) return { label: 'Text', color: 'bg-gray-50 text-gray-500 border-gray-200', icon: '📋' };
  return { label: 'File', color: 'bg-gray-50 text-gray-500 border-gray-200', icon: '📎' };
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function FileDrop({ value, onChange, label = 'Drop your file here or click to browse', accept }) {
  const ref = useRef();
  const [dragging, setDragging] = useState(false);

  function handleFile(file) { if (file) onChange(file); }
  function onDrop(e) { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }

  return (
    <div
      onClick={() => ref.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-ios p-6 text-center cursor-pointer transition-all ${dragging ? 'border-blue-400 bg-blue-50/40' : value ? 'border-green-300 bg-green-50/30' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/20'}`}
    >
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
      {value ? (
        <div className="flex items-center justify-center gap-3">
          <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800 truncate max-w-[240px]">{value.name}</p>
            <p className="text-xs text-gray-400">{formatBytes(value.size)}</p>
          </div>
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(null); }} className="ml-2 p-1 text-gray-300 hover:text-red-400 rounded">
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          <Upload size={24} className="text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, CSV, PPT, images — up to 50 MB</p>
        </>
      )}
    </div>
  );
}

function UploadTemplateModal({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (!open) { setName(''); setDescription(''); setFile(null); setError(''); } }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return setError('Please select a file to upload');
    if (!name.trim()) return setError('Template name is required');
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', name.trim());
      fd.append('description', description);
      const res = await api.post('/templates', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onCreated(res.data.template);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload template');
    } finally { setLoading(false); }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Upload Template" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Template Name <span className="text-red-500">*</span></label>
          <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Monthly Report Form" required />
        </div>
        <div>
          <label className="label">Description <span className="text-gray-400 font-normal">(optional)</span></label>
          <textarea className="input-field resize-none" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should users fill in this template?" />
        </div>
        <div>
          <label className="label">Template File <span className="text-red-500">*</span></label>
          <FileDrop value={file} onChange={setFile} label="Drop your template file here or click to browse" />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Uploading...' : 'Upload Template'}</button>
        </div>
      </form>
    </Modal>
  );
}

function UseTemplateModal({ open, onClose, template, onSubmitted, onDownload }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => { if (!open) { setFile(null); setTitle(''); setNote(''); setError(''); setSuccess(false); } }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return setError('Please upload your filled file');
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', title || `${template.name} - Submission`);
      fd.append('note', note);
      await api.post(`/templates/${template.id}/submit`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess(true);
      if (onSubmitted) onSubmitted(template.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally { setLoading(false); }
  }

  if (success) return (
    <Modal isOpen={open} onClose={onClose} title="Submitted!" size="sm">
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <p className="text-base font-bold text-gray-900">Submission received</p>
        <p className="text-sm text-gray-500 mt-1">Your filled file has been submitted successfully.</p>
        <button onClick={onClose} className="btn-primary mt-6">Done</button>
      </div>
    </Modal>
  );

  return (
    <Modal isOpen={open} onClose={onClose} title={`Use: ${template?.name}`} size="md">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-100 rounded-ios p-4">
          <p className="text-sm font-semibold text-blue-700 mb-1">How to use this template</p>
          <ol className="text-sm text-blue-600 space-y-1 list-decimal list-inside">
            <li>Download the template file below</li>
            <li>Fill it in with your information</li>
            <li>Upload the completed file here</li>
          </ol>
          <button
            onClick={() => onDownload(template)}
            className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-ios hover:bg-blue-600 transition-colors"
          >
            <Download size={14} /> Download Template
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Submission Title <span className="text-gray-400 font-normal">(optional)</span></label>
            <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${template?.name} - Submission`} />
          </div>
          <div>
            <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea className="input-field resize-none" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any notes about this submission..." />
          </div>
          <div>
            <label className="label">Upload Your Filled File <span className="text-red-500">*</span></label>
            <FileDrop value={file} onChange={setFile} label="Drop your completed file here or click to browse" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Submitting...' : 'Submit'}</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default function Templates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState(() => getCached('/templates') || []);
  const [loading, setLoading] = useState(() => !getCached('/templates'));
  const [showUpload, setShowUpload] = useState(false);
  const [useTarget, setUseTarget] = useState(null);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    api.get('/templates').then((res) => {
      setCached('/templates', res.data.templates);
      setTemplates(res.data.templates);
    }).finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    if (!confirm('Delete this template and all its submissions?')) return;
    await api.delete(`/templates/${id}`);
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    setCached('/templates', updated);
  }

  function handleSubmitted(templateId) {
    setTemplates((prev) => prev.map((t) =>
      t.id === templateId ? { ...t, submission_count: (parseInt(t.submission_count) || 0) + 1 } : t
    ));
  }

  async function handleDownload(template) {
    if (!template?.id) return;
    try {
      const response = await api.get(`/templates/${template.id}/download`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: template.mime_type || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = template.original_name || 'template';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download template. Please try again.');
    }
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 items-start">
        <div>
          <h2 className="page-title">Templates</h2>
          <p className="text-sm text-gray-400 mt-0.5">Upload document templates — team members can download, fill, and submit them back</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowUpload(true)} className="btn-primary">
            <Upload size={16} strokeWidth={2.5} /> Upload Template
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-44 rounded-ios-lg" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="card flex flex-col items-center py-20 text-center">
          <FileText size={48} className="text-gray-200 mb-4" strokeWidth={1.5} />
          <p className="text-base font-semibold text-gray-500">No templates yet</p>
          <p className="text-sm text-gray-400 mt-1 max-w-sm">
            {isAdmin ? 'Upload a template file (Excel, PDF, Word, etc.) and your team can fill it and submit back' : 'No templates have been uploaded yet'}
          </p>
          {isAdmin && <button onClick={() => setShowUpload(true)} className="btn-primary mt-5"><Upload size={15} /> Upload Template</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => {
            const ft = fileTypeInfo(t.mime_type, t.original_name);
            return (
              <div key={t.id} className="card p-5 hover:shadow-apple-md transition-shadow group flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className={`w-12 h-12 ${ft.color} border rounded-ios flex items-center justify-center flex-shrink-0 text-xl`}>
                    {ft.icon}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    {t.file_url && (
                      <button onClick={() => handleDownload(t)}
                        className="p-1.5 text-gray-300 hover:text-blue-500 rounded transition-colors" title="Download template">
                        <Download size={14} />
                      </button>
                    )}
                    {(t.created_by === user?.id || isAdmin) && (
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded transition-colors" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1">
                  <p className="text-base font-bold text-gray-900 leading-snug">{t.name}</p>
                  {t.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{t.description}</p>}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${ft.color} border`}>{ft.label}</span>
                      {t.file_size && <span>{formatBytes(t.file_size)}</span>}
                    </div>
                    <span>{t.submission_count || 0} {parseInt(t.submission_count) === 1 ? 'submission' : 'submissions'}</span>
                  </div>
                  <div className="text-xs text-gray-400 flex items-center justify-between">
                    <span>by {t.creator_name}</span>
                    <span>{format(new Date(t.created_at), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex gap-2">
                    {t.file_url && (
                      <button onClick={() => handleDownload(t)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-ios hover:bg-gray-100 transition-colors">
                        <Download size={13} /> Download
                      </button>
                    )}
                    <button onClick={() => setUseTarget(t)} className="flex-1 btn-primary text-sm py-2">
                      <Send size={13} /> Use Template
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <UploadTemplateModal open={showUpload} onClose={() => setShowUpload(false)} onCreated={(t) => { setTemplates((p) => [t, ...p]); setCached('/templates', [t, ...templates]); }} />
      {useTarget && <UseTemplateModal open={!!useTarget} onClose={() => setUseTarget(null)} template={useTarget} onSubmitted={handleSubmitted} onDownload={handleDownload} />}
    </div>
  );
}
