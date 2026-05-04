import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Bug, BugStatus, User } from '../types';
import { 
  AlertCircle, 
  Clock, 
  User as UserIcon, 
  MessageSquare, 
  ChevronLeft,
  Loader2,
  Paperclip,
  CheckCircle2,
  Send,
  ExternalLink,
  ZoomIn,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import ImageViewer from '../components/ImageViewer';
import { formatDate } from '../lib/utils';

const BugDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [bug, setBug] = useState<Bug | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isImageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);

  // Mention/tagging support for comments: show @<employee> suggestions.
  const [mentionCandidates, setMentionCandidates] = useState<User[]>([]);
  
  // Comment attachment state
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [commentFilePreview, setCommentFilePreview] = useState<string | null>(null);

  const fetchBugDetails = async () => {
    try {
      setError(null);
      // In a real app, we'd have a GET /api/bugs/:id endpoint
      // For now, we'll fetch from the project bugs if needed or 
      // assume the API handles it. I'll implement it in the backend too.
      const response = await api.get(`/bugs/${id}`);
      setBug(response.data);
    } catch (err) {
      console.error('Error fetching bug details:', err);
      const msg = (err as any)?.response?.data?.message || 'Failed to fetch bug details';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBugDetails();
  }, [id]);

  useEffect(() => {
    const fetchProjectMembersForMentions = async () => {
      if (!bug) return;

      const projectId =
        typeof bug.project === 'string'
          ? bug.project
          : (bug.project as any)?._id;

      if (!projectId) return;

      try {
        const projectRes = await api.get(`/projects/${projectId}`);
        const project = projectRes.data;

        const members: User[] = [
          ...(project.developers || []),
          ...(project.testers || []),
          project.createdBy || null,
        ].filter(Boolean);

        // De-duplicate by id.
        const seen = new Set<string>();
        const unique = members.filter((m) => {
          if (!m?._id) return false;
          if (seen.has(m._id)) return false;
          seen.add(m._id);
          return true;
        });

        setMentionCandidates(unique);
      } catch (err) {
        // If RBAC or the project request fails, we still allow submitting plain @ text.
        console.error('Failed to load project members for mentions:', err);
      }
    };

    fetchProjectMembersForMentions();
  }, [bug]);

  const handleStatusUpdate = async (newStatus: BugStatus) => {
    setIsUpdating(true);
    try {
      await api.put(`/bugs/${id}/status`, { status: newStatus });
      await fetchBugDetails();
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && !commentFile) return;

    setIsUpdating(true);
    try {
      let attachmentPath = '';
      
      if (commentFile) {
        const formData = new FormData();
        formData.append('evidence', commentFile);
        const uploadRes = await api.post('/bugs/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        attachmentPath = uploadRes.data.filePath;
      }

      await api.post(`/bugs/${id}/comment`, { 
        text: commentText || (commentFile ? 'Sent an attachment' : ''), 
        attachment: attachmentPath 
      });
      
      setCommentText('');
      setCommentFile(null);
      setCommentFilePreview(null);
      await fetchBugDetails();
    } catch (err) {
      alert('Failed to add comment');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCommentFile(file);
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setCommentFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setCommentFilePreview(null);
      }
    }
  };

  const removeSelectedFile = () => {
    setCommentFile(null);
    setCommentFilePreview(null);
  };

  // Mention/tagging support for comments: show @<employee> suggestions.
  // Must be computed before any early `return` so hooks run consistently.
  const mentionMatch = commentText.match(/@([^\s@]*)$/);
  const mentionQuery = mentionMatch?.[1] ?? '';
  const showMentionDropdown = Boolean(mentionMatch) && mentionCandidates.length > 0;

  const mentionMatches = useMemo(() => {
    if (!showMentionDropdown) return [];
    const q = mentionQuery.trim().toLowerCase();
    if (!q) return mentionCandidates.slice(0, 8);
    return mentionCandidates
      .filter((m) => (m.name || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [mentionCandidates, mentionQuery, showMentionDropdown]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white border rounded-xl shadow-sm">
        <p className="font-bold text-gray-900">Unable to open this bug</p>
        <p className="text-sm text-gray-500 mt-1">{error}</p>
      </div>
    );
  }

  if (!bug) return <div>Bug not found</div>;

  const role = user?.role;
  const canResolveStatus = role === 'Developer' || role === 'Admin';
  const canCloseStatus = role === 'Tester' || role === 'Admin';
  const canUpdateAnyStatus = canResolveStatus || canCloseStatus;

  const applyMention = (name: string) => {
    const next = commentText.replace(/@([^\s@]*)$/, `@${name} `);
    setCommentText(next);
  };

  const renderCommentText = (text: string) => {
    if (!mentionCandidates.length || !text) return text;

    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const mentionStrings = mentionCandidates.map((m) => `@${m.name}`);
    const escaped = mentionStrings.map(escapeRegExp);
    if (escaped.length === 0) return text;

    const regex = new RegExp(escaped.join('|'), 'g');
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (start > lastIndex) {
        parts.push(text.slice(lastIndex, start));
      }

      parts.push(
        <span key={`${start}-${end}`} className="text-primary font-medium bg-primary/5 px-1 rounded">
          {match[0]}
        </span>,
      );
      lastIndex = end;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{bug.title}</h1>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              bug.priority === 'Critical' ? 'bg-red-100 text-red-700' :
              bug.priority === 'High' ? 'bg-orange-100 text-orange-700' :
              bug.priority === 'Medium' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {bug.priority}
            </span>
          </div>
          <p className="text-sm text-gray-500">Reported on {formatDate(bug.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Bug Info */}
          <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{bug.description}</p>
            </div>

            {bug.evidence && (
              <div className="pt-4 border-t">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Evidence
                </h3>
                {bug.evidence.match(/\.(jpeg|jpg|png|gif)$/i) ? (
                  <div className="relative group rounded-lg overflow-hidden border">
                    <img 
                      src={`http://localhost:5000${bug.evidence}`} 
                      alt="Evidence" 
                      className="max-h-96 w-full object-contain bg-gray-50"
                    />
                    <button 
                      onClick={() => {
                        setViewerImageUrl(`http://localhost:5000${bug.evidence}`);
                        setImageViewerOpen(true);
                      }}
                      className="absolute inset-0 bg-black/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ZoomIn className="h-8 w-8" />
                    </button>
                  </div>
                ) : (
                  <a 
                    href={`http://localhost:5000${bug.evidence}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-2 p-3 bg-gray-50 border rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <AlertCircle className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium text-blue-600">View Attached Document</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center gap-2 bg-gray-50/50">
              <MessageSquare className="h-5 w-5 text-gray-600" />
              <h3 className="font-bold text-gray-900">Discussion</h3>
            </div>
            
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {(bug.comments?.length ?? 0) > 0 ? (
                bug.comments.map((comment) => (
                  <div key={comment._id} className="p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-gray-100 overflow-hidden">
                          {comment.user?.profilePhoto ? (
                            <img src={`http://localhost:5000${comment.user.profilePhoto}`} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xs font-bold text-gray-400">
                              {comment.user?.name?.charAt(0) ?? ''}
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-bold text-gray-900">{comment.user?.name || 'Unknown User'}</span>
                        <span className="text-[10px] text-gray-400 uppercase font-bold">{comment.user?.role || 'User'}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">{new Date(comment.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="pl-8 space-y-2">
                      <p className="text-sm text-gray-700">{renderCommentText(comment.text)}</p>
                      {comment.attachment && (
                        <div className="mt-2">
                          {comment.attachment.match(/\.(jpeg|jpg|png|gif)$/i) ? (
                            <button 
                              onClick={() => {
                                setViewerImageUrl(`http://localhost:5000${comment.attachment}`);
                                setImageViewerOpen(true);
                              }}
                              className="relative group block rounded-lg overflow-hidden border border-gray-100 max-w-[200px]"
                            >
                              <img 
                                src={`http://localhost:5000${comment.attachment}`} 
                                alt="Comment attachment" 
                                className="h-32 w-full object-cover group-hover:opacity-90 transition-opacity"
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
                                <ZoomIn className="h-5 w-5 text-white" />
                              </div>
                            </button>
                          ) : (
                            <a 
                              href={`http://localhost:5000${comment.attachment}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border rounded-lg hover:bg-gray-100 transition-colors text-xs font-medium text-blue-600"
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              View Attachment
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-400 text-sm">No comments yet.</div>
              )}
            </div>

            <form onSubmit={handleAddComment} className="p-4 bg-gray-50 border-t space-y-3">
              {commentFile && (
                <div className="flex items-center gap-3 p-2 bg-white rounded-lg border text-sm">
                  {commentFilePreview ? (
                    <img src={commentFilePreview} alt="Preview" className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center">
                      <Paperclip className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{commentFile.name}</p>
                    <p className="text-[10px] text-gray-500">{(commentFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={removeSelectedFile}
                    className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              
              <div className="flex gap-3">
                <div className="relative">
                  <input 
                    type="file" 
                    id="comment-file" 
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                  <label 
                    htmlFor="comment-file"
                    className="p-2.5 bg-white border rounded-lg text-gray-500 hover:text-primary hover:border-primary cursor-pointer transition-all flex items-center justify-center shadow-sm"
                    title="Attach file or image"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </label>
                </div>
                
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Add a comment or update..."
                    className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && showMentionDropdown && mentionMatches.length > 0) {
                        e.preventDefault();
                        applyMention(mentionMatches[0].name);
                      }
                    }}
                  />

                  {showMentionDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-sm z-50 overflow-hidden">
                      {mentionMatches.length > 0 ? (
                        mentionMatches.map((m) => (
                          <button
                            key={m._id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm text-gray-900"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => applyMention(m.name)}
                          >
                            {m.name}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">No matches</div>
                      )}
                    </div>
                  )}
                </div>
                <button 
                  type="submit"
                  disabled={isUpdating || (!commentText.trim() && !commentFile)}
                  className="p-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-md flex items-center justify-center"
                >
                  {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Status & Assignment */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
            {canUpdateAnyStatus && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</h3>
                <div className="flex flex-col gap-2">
                  {['Open', 'In Progress', 'Resolved', 'Closed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusUpdate(status as BugStatus)}
                      disabled={
                        isUpdating ||
                        bug.status === status ||
                        !(
                          status === 'Open'
                            ? role === 'Admin' && bug.status !== 'Closed'
                            : status === 'In Progress'
                              ? (role === 'Developer' || role === 'Admin') && bug.status !== 'Closed'
                              : status === 'Resolved'
                                ? canResolveStatus && bug.status !== 'Closed'
                                : status === 'Closed'
                                  ? canCloseStatus && bug.status === 'Resolved'
                                  : false
                        )
                      }
                      className={`flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        bug.status === status 
                          ? 'bg-primary text-white shadow-lg' 
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {status}
                      {bug.status === status && <CheckCircle2 className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-6 border-t space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reported By</h3>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gray-100 overflow-hidden">
                    {bug.createdBy.profilePhoto ? (
                      <img src={`http://localhost:5000${bug.createdBy.profilePhoto}`} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs font-bold text-gray-400">
                        {bug.createdBy?.name?.charAt(0) ?? ''}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{bug.createdBy?.name ?? 'Unknown User'}</p>
                    <p className="text-xs text-gray-500">{bug.createdBy?.role ?? ''}</p>
                  </div>
                </div>
              </div>

              {(bug.applicationType || bug.menu) && (
                <>
                  {bug.applicationType && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Application Type</h3>
                      <p className="text-sm text-gray-700">{bug.applicationType}</p>
                    </div>
                  )}
                  {bug.menu && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Menu</h3>
                      <p className="text-sm text-gray-700">{bug.menu}</p>
                    </div>
                  )}
                </>
              )}
              {bug.assignedTo && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned To</h3>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-100 overflow-hidden">
                      {bug.assignedTo.profilePhoto ? (
                        <img src={`http://localhost:5000${bug.assignedTo.profilePhoto}`} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs font-bold text-gray-400">
                          {bug.assignedTo?.name?.charAt(0) ?? ''}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{bug.assignedTo?.name ?? 'Unknown User'}</p>
                      <p className="text-xs text-gray-500">{bug.assignedTo?.role ?? ''}</p>
                    </div>
                  </div>
                </div>
              )}

              {(bug.status === 'Resolved' || bug.status === 'Closed') && bug.resolvedBy && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Resolved By</h3>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-100 overflow-hidden">
                      {bug.resolvedBy.profilePhoto ? (
                        <img src={`http://localhost:5000${bug.resolvedBy.profilePhoto}`} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs font-bold text-gray-400">
                          {bug.resolvedBy?.name?.charAt(0) ?? ''}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{bug.resolvedBy?.name ?? 'Unknown User'}</p>
                      <p className="text-xs text-gray-500">on {formatDate(bug.resolvedAt!)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {isImageViewerOpen && viewerImageUrl && (
        <ImageViewer 
          imageUrl={viewerImageUrl} 
          onClose={() => {
            setImageViewerOpen(false);
            setViewerImageUrl(null);
          }} 
        />
      )}
    </div>
  );
};

export default BugDetails;
