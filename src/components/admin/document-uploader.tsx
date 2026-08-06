'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface DocumentUploaderProps {
  onUploadSuccess: () => void;
}

export default function DocumentUploader({ onUploadSuccess }: DocumentUploaderProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [notionPageId, setNotionPageId] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handlePdfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) {
      toast.error('Please select a PDF file first.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', pdfFile);

    try {
      const res = await fetch('/api/ingest/pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Your session expired. Please log in again.');
        }
        throw new Error(data.error || `Upload failed with status ${res.status}`);
      }

      toast.success(`Successfully ingested "${data.document.name}" (${data.document.chunk_count} chunks generated)`);
      setPdfFile(null);
      onUploadSuccess();
    } catch (err: any) {
      console.error('PDF upload error:', err);
      toast.error(err.message || 'An error occurred during upload.');
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    try {
      const res = await fetch('/api/ingest/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Your session expired. Please log in again.');
        }
        throw new Error(data.error || 'Failed to scrape URL');
      }

      toast.success(`Successfully ingested "${data.document.name}" (${data.document.chunk_count} chunks)`);
      setUrl('');
      onUploadSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNotionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notionPageId) return;

    setLoading(true);
    try {
      const res = await fetch('/api/ingest/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: notionPageId }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Your session expired. Please log in again.');
        }
        throw new Error(data.error || 'Failed to sync Notion page');
      }

      toast.success(`Synced "${data.document.name}" (${data.document.chunk_count} chunks)`);
      setNotionPageId('');
      onUploadSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNotionConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_NOTION_CLIENT_ID;
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/notion/callback`);
    if (!clientId) {
      toast.error('NOTION_CLIENT_ID is not configured in .env.local');
      return;
    }
    window.location.href = `https://api.notion.com/v1/oauth/authorize?owner=user&client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      const file = droppedFiles[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setPdfFile(file);
      } else {
        toast.error('Please drop a valid PDF file.');
      }
    }
  };

  return (
    <Card className="w-full bg-white/3 border border-white/8 shadow-none">
      <CardContent className="pt-6">
        <Tabs defaultValue="pdf" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-white/5 border border-white/8 rounded-xl p-1">
            <TabsTrigger value="pdf" className="text-xs sm:text-sm rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-500 transition-all">📄 Upload PDF</TabsTrigger>
            <TabsTrigger value="url" className="text-xs sm:text-sm rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-500 transition-all">🔗 Scrape URL</TabsTrigger>
            <TabsTrigger value="notion" className="text-xs sm:text-sm rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-500 transition-all">📝 Notion Sync</TabsTrigger>
          </TabsList>

          <TabsContent value="pdf">
            <form onSubmit={handlePdfSubmit} className="space-y-4">
              <label
                htmlFor="pdf-file-input"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer ${
                  isDragging
                    ? 'border-indigo-400 bg-indigo-500/10'
                    : pdfFile
                    ? 'border-emerald-400/60 bg-emerald-500/8'
                    : 'border-white/10 hover:border-white/20 hover:bg-white/3'
                }`}
              >
                <input
                  id="pdf-file-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) setPdfFile(file);
                  }}
                  className="hidden"
                />
                
                <div className="h-12 w-12 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-2xl mb-3">
                  {pdfFile ? '📑' : '📤'}
                </div>

                {pdfFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-200 truncate max-w-xs">{pdfFile.name}</p>
                    <p className="text-xs text-slate-500">{(pdfFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPdfFile(null);
                      }}
                      className="text-xs text-red-400 hover:text-red-300 hover:underline mt-2 inline-block transition-colors"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-slate-300">
                      Click to browse or drag &amp; drop PDF here
                    </p>
                    <p className="text-xs text-slate-600 mt-1">Supports PDF documents up to 10MB</p>
                  </div>
                )}
              </label>

              <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={!pdfFile || loading}>
                {loading ? 'Processing & Embedding PDF...' : pdfFile ? `Upload "${pdfFile.name}"` : 'Select a PDF File'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="url">
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Web Page URL</label>
                <Input
                  type="url"
                  placeholder="https://docs.company.com/overview"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="h-11 bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/40 rounded-xl"
                />
                <p className="text-xs text-slate-600">Scrapes article text, strips navigation boilerplate, and indexes into pgvector.</p>
              </div>
              <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={!url || loading}>
                {loading ? 'Scraping & Embedding URL...' : 'Scrape & Process Web Page'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="notion">
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/8">
                <div>
                  <p className="text-xs font-bold text-slate-200">Notion OAuth Connection</p>
                  <p className="text-xs text-slate-500">Connect your Notion integration to read workspace pages</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleNotionConnect} className="text-slate-300 border-white/10 hover:bg-white/5 hover:text-white text-xs">
                  Connect Notion
                </Button>
              </div>

              <form onSubmit={handleNotionSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Notion Page ID</label>
                  <Input
                    type="text"
                    placeholder="Page ID (e.g. 18274abc-def...)"
                    value={notionPageId}
                    onChange={(e) => setNotionPageId(e.target.value)}
                    className="h-11 bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/40 rounded-xl"
                  />
                  <p className="text-xs text-slate-600">Copy the 32-character Page ID from your Notion page URL.</p>
                </div>
                <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={!notionPageId || loading}>
                  {loading ? 'Fetching Notion Page...' : 'Sync Notion Page'}
                </Button>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
