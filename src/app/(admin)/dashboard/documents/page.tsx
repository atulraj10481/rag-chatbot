'use client';

import { useState, useEffect, useCallback } from 'react';
import DocumentUploader from '@/components/admin/document-uploader';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Document } from '@/types';
import { FileText, RefreshCw, Trash2 } from 'lucide-react';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents?include_archived=${showArchived}`);
      const data = await res.json();
      if (res.ok) {
        setDocuments(data.documents || []);
      } else {
        toast.error(data.error || 'Failed to load documents');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will remove all associated vector embeddings.`)) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      toast.success(`Deleted ${name}`);
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2.5 py-0.5">Ready</span>;
      case 'processing':
        return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2.5 py-0.5">Processing</span>;
      case 'error':
        return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-400 bg-red-400/10 border border-red-400/20 rounded-full px-2.5 py-0.5">Error</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5">Pending</span>;
    }
  };

  const getSourceBadge = (type: string) => {
    const map: Record<string, { label: string; color: string }> = {
      pdf: { label: 'PDF', color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20' },
      url: { label: 'URL', color: 'text-sky-400 bg-sky-400/10 border-sky-400/20' },
      notion: { label: 'Notion', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
    };
    const s = map[type] || { label: type, color: 'text-slate-400 bg-white/5 border-white/10' };
    return (
      <span className={`inline-flex text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${s.color}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Document Manager</h1>
          <p className="text-sm text-slate-500 mt-1">
            Ingest PDFs, scrape websites, or sync Notion pages into pgvector.
          </p>
        </div>
        <span className="text-xs font-medium text-indigo-400 bg-indigo-400/10 border border-indigo-400/20 rounded-full px-3 py-1.5">
          Phase 2 · Ingestion
        </span>
      </div>

      <DocumentUploader onUploadSuccess={fetchDocuments} />

      {/* Knowledge Base Table */}
      <div className="rounded-2xl bg-white/3 border border-white/8 overflow-hidden">
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            Knowledge Base
            <span className="text-[11px] font-normal text-slate-500 ml-1">· {documents.length} document{documents.length !== 1 ? 's' : ''}</span>
          </h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-200 transition-colors">
              <input
                type="checkbox"
                className="rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/20"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              Show archived
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchDocuments}
              className="text-slate-400 hover:text-slate-200 hover:bg-white/5 gap-1.5 text-xs rounded-lg h-8"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            <div className="inline-block h-5 w-5 rounded-full border-2 border-slate-700 border-t-slate-400 animate-spin mb-3" />
            <p>Loading knowledge base…</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm space-y-2">
            <FileText className="h-10 w-10 mx-auto opacity-20 mb-3" />
            <p className="font-medium text-slate-400">No documents ingested yet.</p>
            <p className="text-xs text-slate-600">Upload a PDF or add a URL above to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Document Name</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Source</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Clearance</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Chunks</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Added</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-white/3 transition-colors group">
                    <td className="px-5 py-3.5 font-medium text-slate-200 truncate max-w-xs" title={doc.name}>
                      {doc.name}
                    </td>
                    <td className="px-5 py-3.5">
                      {getSourceBadge(doc.source_type)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex text-[11px] font-medium text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/10 capitalize">
                        {doc.department_id || 'general'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded border capitalize
                        ${doc.minimum_role === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          doc.minimum_role === 'manager' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                        {doc.minimum_role || 'employee'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">
                      {doc.chunk_count ?? '—'} <span className="text-slate-600">chunks</span>
                    </td>
                    <td className="px-5 py-3.5">{getStatusBadge(doc.status)}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs gap-1.5 rounded-lg h-7 opacity-0 group-hover:opacity-100 transition-all"
                        onClick={() => handleDelete(doc.id, doc.name)}
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
