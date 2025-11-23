'use client';

import { useState, useEffect } from 'react';
import { Upload, CheckCircle, XCircle, Loader2, FileVideo, Cloud, HardDrive } from 'lucide-react';
import Link from 'next/link';
import { Episode } from '@/lib/api';

interface FileUpload {
  file: File;
  episodeId: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  errorMessage?: string;
}

export default function AdminPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [fileUploads, setFileUploads] = useState<FileUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [lastUploadInfo, setLastUploadInfo] = useState<{ storageType?: string }>({});
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualEpisode, setManualEpisode] = useState({ id: '', name: '', episode: '' });
  const [deletingEpisodes, setDeletingEpisodes] = useState<Set<number>>(new Set());
  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<number>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  useEffect(() => {
    fetchEpisodes();
    loadManualEpisodes();
  }, []);

  function loadManualEpisodes() {
    const stored = localStorage.getItem('manualEpisodes');
    if (stored) {
      const manualEps = JSON.parse(stored);
      setEpisodes(prev => [...prev, ...manualEps]);
    }
  }

  function addSeason9Placeholders() {
    const confirm = window.confirm(
      '🚀 Add Season 9 placeholders?\n\nThis will create 10 placeholder episodes (S09E01-S09E10) for 2026.\nYou can upload videos when they release!'
    );

    if (!confirm) return;

    const season9Episodes: Episode[] = [];
    for (let i = 1; i <= 10; i++) {
      const episodeNum = i.toString().padStart(2, '0');
      season9Episodes.push({
        id: 81 + i,
        name: `Episode ${i} (TBA)`,
        episode: `S09E${episodeNum}`,
        air_date: 'TBA 2026',
        characters: [],
        url: '',
        created: new Date().toISOString(),
      });
    }

    // Save to localStorage
    const stored = localStorage.getItem('manualEpisodes');
    const manualEps = stored ? JSON.parse(stored) : [];
    const updated = [...manualEps, ...season9Episodes];
    localStorage.setItem('manualEpisodes', JSON.stringify(updated));

    // Add to state
    setEpisodes(prev => [...prev, ...season9Episodes].sort((a, b) => a.id - b.id));
    
    alert('✅ Season 9 placeholders added! (Episodes 82-91)');
  }

  function saveManualEpisode() {
    if (!manualEpisode.id || !manualEpisode.name || !manualEpisode.episode) {
      alert('Please fill all fields');
      return;
    }

    const newEpisode: Episode = {
      id: parseInt(manualEpisode.id),
      name: manualEpisode.name,
      episode: manualEpisode.episode,
      air_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      characters: [],
      url: '',
      created: new Date().toISOString(),
    };

    // Save to localStorage
    const stored = localStorage.getItem('manualEpisodes');
    const manualEps = stored ? JSON.parse(stored) : [];
    manualEps.push(newEpisode);
    localStorage.setItem('manualEpisodes', JSON.stringify(manualEps));

    // Add to state
    setEpisodes(prev => [...prev, newEpisode].sort((a, b) => a.id - b.id));
    
    // Reset form
    setManualEpisode({ id: '', name: '', episode: '' });
    setShowManualEntry(false);
  }

  async function fetchEpisodes() {
    try {
      const res = await fetch('/api/episodes');
      const allEpisodes = await res.json();
      setEpisodes(allEpisodes);
    } catch (error) {
      console.error('Failed to fetch episodes:', error);
    }
  }

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    
    const newUploads: FileUpload[] = files.map(file => ({
      file,
      episodeId: '',
      status: 'pending'
    }));
    
    setFileUploads(prev => [...prev, ...newUploads]);
  }

  function updateEpisodeId(index: number, episodeId: string) {
    setFileUploads(prev => {
      const updated = [...prev];
      updated[index].episodeId = episodeId;
      return updated;
    });
  }

  function removeUpload(index: number) {
    setFileUploads(prev => prev.filter((_, i) => i !== index));
  }

  async function uploadSingleFile(upload: FileUpload, index: number) {
    setFileUploads(prev => {
      const updated = [...prev];
      updated[index].status = 'uploading';
      return updated;
    });

    try {
      // Step 1: Get presigned URL from our API
      const presignedResponse = await fetch('/api/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: upload.file.name,
          episodeId: upload.episodeId,
        }),
      });

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json();
        throw new Error(errorData.error || 'Failed to get upload URL');
      }

      const { uploadUrl, publicUrl } = await presignedResponse.json();

      // Step 2: Upload directly to R2
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: upload.file,
        headers: {
          'Content-Type': upload.file.type || 'video/mp4',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      // Step 3: Update video sources (optional, for now just mark as success)
      setLastUploadInfo({ storageType: 'cloud' });
      setFileUploads(prev => {
        const updated = [...prev];
        updated[index].status = 'success';
        return updated;
      });

      console.log('✅ Uploaded to R2:', publicUrl);
    } catch (error: any) {
      console.error('Upload failed:', error);
      setFileUploads(prev => {
        const updated = [...prev];
        updated[index].status = 'error';
        updated[index].errorMessage = error.message || 'Upload failed';
        return updated;
      });
    }
  }

  async function uploadAllFiles() {
    const pendingUploads = fileUploads.filter(u => u.status === 'pending' && u.episodeId);
    
    if (pendingUploads.length === 0) {
      alert('Please select episodes for all files first!');
      return;
    }

    setIsUploading(true);

    // Upload files sequentially to avoid overwhelming the server
    for (let i = 0; i < fileUploads.length; i++) {
      const upload = fileUploads[i];
      if (upload.status === 'pending' && upload.episodeId) {
        await uploadSingleFile(upload, i);
      }
    }

    setIsUploading(false);
  }

  function clearCompleted() {
    setFileUploads(prev => prev.filter(u => u.status !== 'success'));
  }

  async function deleteEpisode(episodeId: number) {
    if (!confirm(`Delete Episode ${episodeId}? This cannot be undone!`)) {
      return;
    }

    setDeletingEpisodes(prev => new Set(prev).add(episodeId));

    try {
      const res = await fetch('/api/delete-video', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete');
      }

      alert(`✅ Episode ${episodeId} deleted successfully!`);
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setDeletingEpisodes(prev => {
        const next = new Set(prev);
        next.delete(episodeId);
        return next;
      });
    }
  }

  function toggleSelectEpisode(episodeId: number) {
    setSelectedForDelete(prev => {
      const next = new Set(prev);
      if (next.has(episodeId)) {
        next.delete(episodeId);
      } else {
        next.add(episodeId);
      }
      return next;
    });
  }

  function selectAllEpisodes() {
    setSelectedForDelete(new Set(episodes.map(ep => ep.id)));
  }

  function deselectAllEpisodes() {
    setSelectedForDelete(new Set());
  }

  async function bulkDeleteEpisodes() {
    if (selectedForDelete.size === 0) {
      alert('No episodes selected');
      return;
    }

    const confirm = window.confirm(
      `⚠️ Are you sure you want to delete ${selectedForDelete.size} episode(s)?\n\nThis will permanently delete the video files from R2 storage.`
    );

    if (!confirm) return;

    setIsBulkDeleting(true);
    const results = {
      success: [] as number[],
      failed: [] as number[],
    };

    for (const episodeId of selectedForDelete) {
      try {
        const res = await fetch('/api/delete-video', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ episodeId }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to delete');
        }

        results.success.push(episodeId);
      } catch (error: any) {
        console.error(`Failed to delete episode ${episodeId}:`, error);
        results.failed.push(episodeId);
      }
    }

    setIsBulkDeleting(false);
    setSelectedForDelete(new Set());

    if (results.failed.length > 0) {
      alert(
        `✅ Deleted ${results.success.length} episode(s)\n❌ Failed to delete ${results.failed.length} episode(s)`
      );
    } else {
      alert(`✅ Successfully deleted ${results.success.length} episode(s)!`);
    }

    // Refresh episode list
    fetchEpisodes();
  }

  return (
    <div className="min-h-screen p-8 md:p-12 max-w-6xl mx-auto">
      <div className="mb-8">
        <Link 
          href="/"
          className="text-[var(--accent)] hover:text-[var(--accent-glow)] transition-colors"
        >
          ← Back to Home
        </Link>
      </div>

      <header className="mb-12">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-sm font-bold text-[var(--accent)] mb-2">RickFlix Admin</div>
            <h1 className="text-4xl md:text-5xl font-black">
              Bulk <span className="text-[var(--accent)]">Upload Center</span>
            </h1>
          </div>
          {lastUploadInfo.storageType && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
              lastUploadInfo.storageType === 'cloud' 
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
            }`}>
              {lastUploadInfo.storageType === 'cloud' ? (
                <>
                  <Cloud className="w-4 h-4" />
                  <span className="text-sm font-medium">Cloud Storage</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-4 h-4" />
                  <span className="text-sm font-medium">Local Storage</span>
                </>
              )}
            </div>
          )}
        </div>
        <p className="text-gray-400">
          Upload multiple video files at once
        </p>
      </header>

      {/* Season 9 Quick Add */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg p-6 border border-cyan-500/20 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              🚀 Season 9 (2026)
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Prepare for Season 9 by adding placeholder episodes. Upload videos when they release!
            </p>
          </div>
          <button
            onClick={addSeason9Placeholders}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-lg font-semibold text-white transition-colors flex items-center gap-2"
          >
            ✨ Quick Add Season 9
          </button>
        </div>
      </div>

      {/* Manual Episode Entry for Seasons 6-8 */}
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-6 border border-purple-500/20 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📝 Add Episode Manually
              <span className="text-sm font-normal text-gray-400">(For Seasons 6-9)</span>
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              The Rick and Morty API only has seasons 1-5. Add episodes manually here.
            </p>
          </div>
          <button
            onClick={() => setShowManualEntry(!showManualEntry)}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg font-semibold text-white transition-colors"
          >
            {showManualEntry ? 'Hide Form' : 'Add Episode'}
          </button>
        </div>

        {showManualEntry && (
          <div className="bg-black/30 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Episode ID (e.g., 52 for S06E01)
                </label>
                <input
                  type="number"
                  value={manualEpisode.id}
                  onChange={(e) => setManualEpisode(prev => ({ ...prev, id: e.target.value }))}
                  placeholder="52"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Episode Code (e.g., S06E01)
                </label>
                <input
                  type="text"
                  value={manualEpisode.episode}
                  onChange={(e) => setManualEpisode(prev => ({ ...prev, episode: e.target.value }))}
                  placeholder="S06E01"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Episode Name
                </label>
                <input
                  type="text"
                  value={manualEpisode.name}
                  onChange={(e) => setManualEpisode(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Episode Title"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <button
              onClick={saveManualEpisode}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-semibold text-white transition-colors"
            >
              ✅ Save Episode
            </button>
          </div>
        )}
      </div>

      {/* Bulk Delete Episodes Section */}
      <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-lg p-6 border border-red-500/20 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              🗑️ Bulk Delete Episodes
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Select multiple episodes and delete them from R2 storage
            </p>
          </div>
          <button
            onClick={() => setShowDeleteSection(!showDeleteSection)}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-semibold text-white transition-colors"
          >
            {showDeleteSection ? 'Hide' : 'Delete Episodes'}
          </button>
        </div>

        {showDeleteSection && (
          <div className="bg-black/30 rounded-lg p-4 space-y-4">
            {/* Bulk Actions */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex gap-2">
                <button
                  onClick={selectAllEpisodes}
                  className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded transition-colors text-white"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllEpisodes}
                  className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded transition-colors text-white"
                >
                  Deselect All
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">
                  {selectedForDelete.size} selected
                </span>
                <button
                  onClick={bulkDeleteEpisodes}
                  disabled={selectedForDelete.size === 0 || isBulkDeleting}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isBulkDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      🗑️ Delete Selected ({selectedForDelete.size})
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Episode Grid with Checkboxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
              {episodes.map((ep) => (
                <label
                  key={ep.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all ${
                    selectedForDelete.has(ep.id)
                      ? 'bg-red-500/30 border-2 border-red-500'
                      : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedForDelete.has(ep.id)}
                    onChange={() => toggleSelectEpisode(ep.id)}
                    className="w-5 h-5 rounded border-white/20 bg-white/10 checked:bg-red-500 checked:border-red-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm">
                      {ep.episode}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {ep.name}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <p className="text-xs text-gray-500 text-center pt-2">
              ⚠️ Warning: Deleting episodes will permanently remove video files from R2 storage
            </p>
          </div>
        )}
      </div>

      {/* File Selection */}
      <div className="bg-white/5 rounded-lg p-8 border-2 border-dashed border-white/20 mb-8 text-center hover:border-[var(--accent)] transition-colors">
        <FileVideo className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <label className="cursor-pointer">
          <input
            type="file"
            multiple
            accept="video/*,.mkv,.mp4,.webm,.mov,.avi"
            onChange={handleFilesSelected}
            className="hidden"
            disabled={isUploading}
          />
          <span className="inline-block px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-glow)] rounded-lg font-semibold text-white transition-colors">
            Select Video Files
          </span>
        </label>
        <p className="text-sm text-gray-500 mt-3">
          Select multiple files at once • Supports MP4, WebM, MOV, MKV
        </p>
      </div>

      {/* File List */}
      {fileUploads.length > 0 && (
        <div className="bg-white/5 rounded-lg p-6 border border-white/10 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[var(--accent)]">
              Files to Upload ({fileUploads.length})
            </h2>
            <div className="flex gap-3">
              <button
                onClick={clearCompleted}
                disabled={!fileUploads.some(u => u.status === 'success')}
                className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Completed ({fileUploads.filter(u => u.status === 'success').length})
              </button>
              <button
                onClick={uploadAllFiles}
                disabled={isUploading || fileUploads.every(u => !u.episodeId || u.status !== 'pending')}
                className="px-6 py-2 bg-[var(--accent)] hover:bg-[var(--accent-glow)] rounded-lg font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload All
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {fileUploads.map((upload, index) => {
              const episode = episodes.find(ep => ep.id.toString() === upload.episodeId);
              
              return (
                <div 
                  key={index}
                  className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10"
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {upload.status === 'pending' && (
                      <FileVideo className="w-6 h-6 text-gray-400" />
                    )}
                    {upload.status === 'uploading' && (
                      <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                    )}
                    {upload.status === 'success' && (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    )}
                    {upload.status === 'error' && (
                      <XCircle className="w-6 h-6 text-red-400" />
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{upload.file.name}</p>
                    <p className="text-sm text-gray-400">
                      {(upload.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {upload.status === 'error' && upload.errorMessage && (
                      <p className="text-sm text-red-400 mt-1">
                        ❌ {upload.errorMessage}
                      </p>
                    )}
                  </div>

                  {/* Episode Selector */}
                  <div className="flex-shrink-0 w-64">
                    <select
                      value={upload.episodeId}
                      onChange={(e) => updateEpisodeId(index, e.target.value)}
                      disabled={upload.status !== 'pending'}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:border-[var(--accent)] disabled:opacity-50 [&>option]:bg-gray-900 [&>option]:text-white"
                    >
                      <option value="" className="bg-gray-900 text-white">Select episode...</option>
                      {episodes.map((ep) => (
                        <option key={ep.id} value={ep.id} className="bg-gray-900 text-white">
                          {ep.episode} - {ep.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Remove Button */}
                  {upload.status === 'pending' && (
                    <button
                      onClick={() => removeUpload(index)}
                      className="flex-shrink-0 p-2 hover:bg-white/10 rounded transition-colors"
                    >
                      <XCircle className="w-5 h-5 text-gray-400 hover:text-red-400" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
        <h3 className="font-bold text-lg mb-2 text-blue-300">📝 How to Use Bulk Upload</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-300">
          <li>Click <strong>"Select Video Files"</strong> and choose multiple video files (hold Ctrl/Cmd to select multiple)</li>
          <li>For each file, select which episode it corresponds to from the dropdown</li>
          <li>Click <strong>"Upload All"</strong> to start uploading all files</li>
          <li>Episodes become available to stream immediately after upload completes</li>
          <li>Use <strong>"Clear Completed"</strong> to remove successfully uploaded files from the list</li>
        </ol>
      </div>
    </div>
  );
}
