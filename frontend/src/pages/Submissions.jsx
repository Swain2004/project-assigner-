import { useEffect, useState } from 'react';
import { FileText, Search, Eye, Download, Trash2, ArrowLeft, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

export default function Submissions() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [submissions, setSubmissions] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [filters, setFilters] = useState({
    template_id: searchParams.get('template_id') || '',
    project_id: searchParams.get('project_id') || ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [subRes, tempRes, projRes] = await Promise.all([
        api.get('/templates/submissions'),
        api.get('/templates'),
        api.get('/projects')
      ]);
      setSubmissions(subRes.data.submissions);
      setTemplates(tempRes.data.templates);
      setProjects(projRes.data.projects);
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSubmission(id) {
    if (!confirm('Delete this submission?')) return;
    try {
      await api.delete(`/templates/submissions/${id}`);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert('Failed to delete submission');
    }
  }

  const filtered = submissions.filter((s) => {
    if (search && !s.title?.toLowerCase().includes(search.toLowerCase()) && 
        !s.submitter_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.template_id && s.template_id !== filters.template_id) return false;
    if (filters.project_id && s.project_id !== filters.project_id) return false;
    return true;
  });

  const groupedByDate = filtered.reduce((acc, s) => {
    const date = format(new Date(s.created_at), 'MMM d, yyyy');
    if (!acc[date]) acc[date] = [];
    acc[date].push(s);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-5 max-w-6xl mx-auto animate-fade-in">
        <div className="skeleton h-12 rounded-ios" />
        {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-24 rounded-ios" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-fade-in pb-32">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 items-start">
        <div>
          <h2 className="page-title">Template Submissions</h2>
          <p className="text-sm text-gray-400 mt-0.5">View all filled template forms submitted by team members</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{filtered.length} submissions</span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            className="input-field pl-10" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Search by title or submitter..." 
          />
        </div>
        <select
          className="input-field w-[180px]"
          value={filters.template_id}
          onChange={(e) => setFilters({ ...filters, template_id: e.target.value })}
        >
          <option value="">All Templates</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          className="input-field w-[180px]"
          value={filters.project_id}
          onChange={(e) => setFilters({ ...filters, project_id: e.target.value })}
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {(filters.template_id || filters.project_id) && (
          <button 
            onClick={() => setFilters({ template_id: '', project_id: '' })}
            className="text-sm text-blue-500 hover:text-blue-600 font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center py-20 text-center">
          <FileText size={48} className="text-gray-200 mb-4" strokeWidth={1.5} />
          <p className="text-base font-semibold text-gray-500">No submissions found</p>
          <p className="text-sm text-gray-400 mt-1">
            {submissions.length === 0 
              ? "No one has filled any templates yet" 
              : "Try adjusting your search or filters"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, dateSubs]) => (
            <div key={date} className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 sticky top-0 bg-gray-50/80 backdrop-blur py-2 -mx-4 px-4">
                {date}
              </h3>
              <div className="space-y-3">
                {dateSubs.map((s) => (
                  <div 
                    key={s.id} 
                    className="card p-4 hover:shadow-apple-md transition-shadow group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-ios flex items-center justify-center flex-shrink-0">
                        <FileText size={18} className="text-blue-500" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-gray-900">{s.title}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              <span className="badge bg-purple-50 text-purple-600">{s.template_name}</span>
                              {s.project_name && (
                                <>
                                  <span className="text-gray-300">•</span>
                                  <Link 
                                    to={`/projects/${s.project_id}`}
                                    className="text-blue-500 hover:text-blue-600 hover:underline"
                                  >
                                    {s.project_name}
                                  </Link>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setSelectedSubmission(s)}
                              className="p-1.5 text-gray-400 hover:text-blue-500 rounded transition-colors"
                              title="View details"
                            >
                              <Eye size={14} />
                            </button>
                            <button 
                              onClick={() => deleteSubmission(s.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-[9px] font-bold text-gray-600">
                                {s.submitter_name?.charAt(0) || '?'}
                              </span>
                            </div>
                            <span className="text-xs text-gray-600">{s.submitter_name}</span>
                          </div>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-gray-400">
                            {format(new Date(s.created_at), 'h:mm a')}
                          </span>
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

      {/* View Submission Modal */}
      {selectedSubmission && (
        <Modal 
          isOpen={!!selectedSubmission} 
          onClose={() => setSelectedSubmission(null)} 
          title={selectedSubmission.title}
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="badge bg-purple-50 text-purple-600">{selectedSubmission.template_name}</span>
              {selectedSubmission.project_name && (
                <>
                  <span>•</span>
                  <Link 
                    to={`/projects/${selectedSubmission.project_id}`}
                    className="text-blue-500 hover:text-blue-600"
                  >
                    {selectedSubmission.project_name}
                  </Link>
                </>
              )}
            </div>
            
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Submitted Data</h4>
              <div className="space-y-3">
                {Object.entries(selectedSubmission.data || {}).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 rounded-ios p-3">
                    <p className="text-xs text-gray-500 font-medium mb-1">{key}</p>
                    <p className="text-sm text-gray-800">
                      {typeof value === 'boolean' 
                        ? (value ? 'Yes' : 'No')
                        : (value || '-')
                      }
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-400">
                Submitted by {selectedSubmission.submitter_name} on {' '}
                {format(new Date(selectedSubmission.created_at), 'MMM d, yyyy h:mm a')}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedSubmission(null)}
                  className="btn-secondary"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    const dataStr = JSON.stringify(selectedSubmission.data, null, 2);
                    const blob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${selectedSubmission.title.replace(/\s+/g, '_')}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="btn-primary flex items-center gap-1.5"
                >
                  <Download size={14} /> Export JSON
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
