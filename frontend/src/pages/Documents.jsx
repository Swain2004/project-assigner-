import { useEffect, useState } from 'react';
import { FileText, Upload, Search, Trash2, Download, ExternalLink, Filter } from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const CATEGORY_STYLE = {
  technical_note: 'bg-blue-50 text-blue-600 border-blue-100',
  report: 'bg-purple-50 text-purple-600 border-purple-100',
  specification: 'bg-orange-50 text-orange-600 border-orange-100',
  proposal: 'bg-green-50 text-green-600 border-green-100',
  other: 'bg-gray-50 text-gray-500 border-gray-200',
};

function getMimeColor(mime) {
  if (mime?.includes('pdf')) return 'bg-red-50 border-red-100 text-red-500';
  if (mime?.includes('spreadsheet') || mime?.includes('excel') || mime?.includes('csv')) return 'bg-green-50 border-green-100 text-green-600';
  if (mime?.includes('word') || mime?.includes('document')) return 'bg-blue-50 border-blue-100 text-blue-500';
  if (mime?.includes('image')) return 'bg-purple-50 border-purple-100 text-purple-500';
  if (mime?.includes('zip')) return 'bg-orange-50 border-orange-100 text-orange-500';
  return 'bg-gray-50 border-gray-200 text-gray-400';
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1024/1024).toFixed(1)} MB`;
}

function UploadModal({ open, onClose, onUploaded, projects }) {
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ name:'', category:'other', description:'', project_id:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);

  useEffect(() => { if (!open) { setFile(null); setForm({ name:'', category:'other', description:'', project_id:'' }); setError(''); } }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return setError('Please select a file');
    if (!form.project_id) return setError('Please select a project');
    setLoading(true); setError('');
    try {
      const data = new FormData();
      data.append('file', file);
      Object.entries(form).forEach(([k, v]) => { if (v) data.append(k, v); });
      if (!form.name) data.set('name', file.name);
      const res = await api.post('/documents', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUploaded(res.data.document);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally { setLoading(false); }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Upload Document" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setForm((p) => ({...p, name: f.name})); } }}
          onClick={() => document.getElementById('doc-file').click()}
          className={`border-2 border-dashed rounded-ios-md p-10 text-center cursor-pointer transition-all ${drag ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'}`}
        >
          <input id="doc-file" type="file" className="hidden" onChange={(e) => { const f = e.target.files[0]; if (f) { setFile(f); setForm((p) => ({...p, name: f.name})); } }} />
          <Upload size={32} className="text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
          {file ? (
            <div>
              <p className="text-sm font-bold text-gray-700">{file.name}</p>
              <p className="text-xs text-gray-400 mt-1">{formatBytes(file.size)}</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-gray-500">Drop a file here or click to browse</p>
              <p className="text-xs text-gray-400 mt-1.5">Supports PDF, Word, Excel, CSV, PowerPoint, Images, ZIP — up to 50MB</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Project *</label>
            <select className="input-field" value={form.project_id} onChange={(e) => setForm({...form, project_id: e.target.value})} required>
              <option value="">Select project...</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input-field" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}>
              {['technical_note','report','specification','proposal','other'].map((c) => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Display Name</label>
          <input className="input-field" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Document name (defaults to filename)" />
        </div>

        <div>
          <label className="label">Description <span className="text-gray-400">(optional)</span></label>
          <textarea className="input-field resize-none" rows={2} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Brief description..." />
        </div>

        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading || !file} className="btn-primary flex-1">{loading ? 'Uploading...' : 'Upload Document'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Documents() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ project: 'all', category: 'all' });
  const [showUpload, setShowUpload] = useState(false);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    Promise.all([api.get('/documents'), api.get('/projects')]).then(([dRes, pRes]) => {
      setDocuments(dRes.data.documents);
      setProjects(pRes.data.projects);
    }).finally(() => setLoading(false));
  }, []);

  async function deleteDoc(id) {
    if (!confirm('Delete this document?')) return;
    await api.delete(`/documents/${id}`);
    setDocuments((p) => p.filter((d) => d.id !== id));
  }

  const filtered = documents.filter((d) => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.original_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter.project !== 'all' && d.project_id !== filter.project) return false;
    if (filter.category !== 'all' && d.category !== filter.category) return false;
    return true;
  });

  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="page-title">Documents</h2>
          <p className="text-sm text-gray-400 mt-0.5">{documents.length} total files</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary">
          <Upload size={16} strokeWidth={2} /> Upload
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents..." />
        </div>
        <select className="input-field w-auto max-w-[180px]" value={filter.project} onChange={(e) => setFilter({...filter, project: e.target.value})}>
          <option value="all">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input-field w-auto" value={filter.category} onChange={(e) => setFilter({...filter, category: e.target.value})}>
          <option value="all">All Categories</option>
          {['technical_note','report','specification','proposal','other'].map((c) => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-36 rounded-ios-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center py-20 text-center">
          <FileText size={48} className="text-gray-200 mb-4" strokeWidth={1.5} />
          <p className="text-base font-semibold text-gray-500">{search ? 'No documents found' : 'No documents yet'}</p>
          <p className="text-sm text-gray-400 mt-1">Upload files to share with your team</p>
          {!search && <button onClick={() => setShowUpload(true)} className="btn-primary mt-4">Upload Document</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((doc) => (
            <div key={doc.id} className="card p-4 hover:shadow-apple-md transition-shadow duration-200 group flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className={`w-11 h-11 rounded-ios flex items-center justify-center flex-shrink-0 border ${getMimeColor(doc.mime_type)}`}>
                  <FileText size={20} strokeWidth={1.5} />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <a href={doc.file_url} target="_blank" rel="noreferrer" className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-all" title="View">
                    <ExternalLink size={13} />
                  </a>
                  <a href={doc.file_url} download={doc.original_name} className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded transition-all" title="Download">
                    <Download size={13} />
                  </a>
                  {(doc.uploaded_by === user?.id || isAdmin) && (
                    <button onClick={() => deleteDoc(doc.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug">{doc.name}</p>
                {doc.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{doc.description}</p>}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`badge capitalize text-[11px] border ${CATEGORY_STYLE[doc.category] || CATEGORY_STYLE.other}`}>
                    {doc.category?.replace('_',' ')}
                  </span>
                  {doc.file_size && <span className="text-[11px] text-gray-400">{formatBytes(doc.file_size)}</span>}
                </div>
                <div className="flex items-center justify-between">
                  {doc.project_name && <span className="text-[11px] text-blue-500 font-medium truncate max-w-[120px]">{doc.project_name}</span>}
                  <span className="text-[11px] text-gray-400 flex-shrink-0">{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
                </div>
                <p className="text-[11px] text-gray-400">by {doc.uploader_name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} onUploaded={(d) => setDocuments((p) => [d, ...p])} projects={projects} />
    </div>
  );
}
