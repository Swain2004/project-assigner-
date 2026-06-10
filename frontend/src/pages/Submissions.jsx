import { useEffect, useState } from 'react';
import { FileText, Search, Download, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function fileIcon(mime) {
  if (!mime) return '📎';
  if (mime.includes('pdf')) return '📄';
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return '📊';
  if (mime.includes('word') || mime.includes('document')) return '📝';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return '📑';
  if (mime.includes('image')) return '🖼️';
  return '📎';
}

export default function Submissions() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTemplate, setFilterTemplate] = useState('');
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    Promise.all([api.get('/templates/submissions'), api.get('/templates')])
      .then(([subRes, tempRes]) => {
        setSubmissions(subRes.data.submissions);
        setTemplates(tempRes.data.templates);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    if (!confirm('Delete this submission?')) return;
    try {
      await api.delete(`/templates/submissions/${id}`);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch { alert('Failed to delete submission'); }
  }

  const filtered = submissions.filter((s) => {
    if (search && !s.title?.toLowerCase().includes(search.toLowerCase()) &&
        !s.submitter_name?.toLowerCase().includes(search.toLowerCase()) &&
        !s.original_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTemplate && s.template_id !== filterTemplate) return false;
    return true;
  });

  const grouped = filtered.reduce((acc, s) => {
    const date = format(new Date(s.created_at), 'MMM d, yyyy');
    if (!acc[date]) acc[date] = [];
    acc[date].push(s);
    return acc;
  }, {});

  if (loading) return (
    <div className="space-y-5 max-w-6xl mx-auto animate-fade-in">
      <div className="skeleton h-12 rounded-ios" />
      {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-20 rounded-ios" />)}
    </div>
  );

  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-fade-in pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 items-start">
        <div>
          <h2 className="page-title">Submissions</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {isAdmin ? 'All submitted files from team members' : 'Your submitted template files'}
          </p>
        </div>
        <span className="text-sm text-gray-400">{filtered.length} {filtered.length === 1 ? 'submission' : 'submissions'}</span>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title, file or submitter..." />
        </div>
        <select className="input-field w-[200px]" value={filterTemplate} onChange={(e) => setFilterTemplate(e.target.value)}>
          <option value="">All Templates</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {filterTemplate && (
          <button onClick={() => setFilterTemplate('')} className="text-sm text-blue-500 hover:text-blue-600 font-medium">Clear</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center py-20 text-center">
          <FileText size={48} className="text-gray-200 mb-4" strokeWidth={1.5} />
          <p className="text-base font-semibold text-gray-500">No submissions found</p>
          <p className="text-sm text-gray-400 mt-1">
            {submissions.length === 0 ? 'No files have been submitted yet' : 'Try adjusting your search or filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-1">{date}</h3>
              <div className="space-y-2">
                {items.map((s) => (
                  <div key={s.id} className="card p-4 hover:shadow-apple-md transition-shadow group">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-gray-50 border border-gray-150 rounded-ios flex items-center justify-center flex-shrink-0 text-xl">
                        {fileIcon(s.mime_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{s.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="badge bg-purple-50 text-purple-600 text-[11px]">{s.template_name}</span>
                              {s.original_name && (
                                <span className="text-xs text-gray-400 truncate max-w-[200px]">{s.original_name}</span>
                              )}
                              {s.file_size && <span className="text-xs text-gray-400">{formatBytes(s.file_size)}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {s.file_url && (
                              <a href={s.file_url} download target="_blank" rel="noopener noreferrer"
                                className="p-1.5 text-gray-400 hover:text-blue-500 rounded transition-colors" title="Download file">
                                <Download size={14} />
                              </a>
                            )}
                            {(isAdmin || s.submitted_by === user?.id) && (
                              <button onClick={() => handleDelete(s.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors" title="Delete">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                          <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-[9px] font-bold text-blue-600">{s.submitter_name?.charAt(0) || '?'}</span>
                          </div>
                          <span className="text-xs text-gray-600">{s.submitter_name}</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-gray-400">{format(new Date(s.created_at), 'h:mm a')}</span>
                          {s.data?.note && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="text-xs text-gray-500 truncate max-w-[200px]" title={s.data.note}>{s.data.note}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
