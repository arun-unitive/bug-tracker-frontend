import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import type { Project, Bug, Activity } from '../types';
import { 
  Calendar, 
  Users, 
  BugIcon, 
  History, 
  CheckCircle2, 
  Clock,
  Plus,
  AlertCircle,
  Loader2,
  ChevronRight,
  Target,
  Search,
  Filter,
  ChevronDown,
  File,
  Link as LinkIcon,
  Trash2,
  Upload
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { formatDate } from '../lib/utils';

const ProjectDetails = () => {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [isProjectPhotoBroken, setIsProjectPhotoBroken] = useState(false);
  const { user } = useAuthStore();
  
  // Document management state
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [documentType, setDocumentType] = useState<'file' | 'link'>('file');
  const [documentName, setDocumentName] = useState('');
  const [documentLink, setDocumentLink] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isAddingDocument, setIsAddingDocument] = useState(false);

  const getProjectImageUrl = (photo?: string) => {
    if (!photo) return null;
    if (photo.startsWith('http://') || photo.startsWith('https://')) return photo;
    const cleaned = photo.replace(/\\/g, '/').trim();
    const normalized = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
    return `http://localhost:5000${normalized}`;
  };

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        const [projectRes, bugsRes, activitiesRes] = await Promise.all([
          api.get(`/projects/${id}`),
          api.get(`/bugs/project/${id}`),
          api.get(`/activities/project/${id}`),
        ]);
        setProject(projectRes.data);
        setIsProjectPhotoBroken(false);
        setBugs(bugsRes.data);
        setActivities(activitiesRes.data);
      } catch (err) {
        console.error('Error fetching project data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjectData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!project) return <div>Project not found</div>;

  const handleAddDocument = async () => {
    if (!documentName || (documentType === 'link' && !documentLink) || (documentType === 'file' && !documentFile)) {
      alert('Please fill all required fields');
      return;
    }
    
    setIsAddingDocument(true);
    try {
      const formData = new FormData();
      formData.append('name', documentName);
      formData.append('type', documentType);
      if (documentType === 'file' && documentFile) {
        formData.append('file', documentFile);
      } else {
        formData.append('url', documentLink);
      }
      
      const response = await api.post(`/projects/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Update project with new document
      setProject(prev => prev ? { ...prev, documents: [...prev.documents, response.data] } : null);
      
      // Reset form
      setShowAddDocument(false);
      setDocumentType('file');
      setDocumentName('');
      setDocumentLink('');
      setDocumentFile(null);
      
    } catch (err) {
      console.error('Error adding document:', err);
      alert('Failed to add document');
    } finally {
      setIsAddingDocument(false);
    }
  };
  
  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await api.delete(`/projects/${id}/documents/${docId}`);
      
      // Update project to remove document
      setProject(prev => prev ? { ...prev, documents: prev.documents.filter(doc => doc._id !== docId) } : null);
      
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Failed to delete document');
    }
  };

  const filteredBugs = bugs.filter(bug => {
    const matchesSearch = bug.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         bug.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || bug.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                {project.projectPhoto && !isProjectPhotoBroken ? (
                  <img
                    src={getProjectImageUrl(project.projectPhoto) ?? undefined}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setIsProjectPhotoBroken(true)}
                  />
                ) : (
                  <span className="text-xs font-bold text-primary">
                    {project.name.charAt(0)}
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                project.status === 'Active' ? 'bg-green-100 text-green-700' :
                project.status === 'Planning' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {project.status}
              </span>
            </div>
            <p className="text-gray-500 max-w-3xl">{project.description}</p>
            <div className="flex flex-wrap gap-4 pt-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(project.startDate)} - {formatDate(project.endDate)}
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {project.developers.length} Developers, {project.testers.length} Testers
              </div>
            </div>
          </div>
          {user?.role === 'Admin' && (
            <Link 
              to={`/projects/${project._id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <Target className="h-4 w-4" />
              Edit Project
            </Link>
          )}
          {user?.role === 'Tester' && (
            <Link 
              to={`/bugs/new?project=${project._id}`}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Report Bug
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Milestones & Todos */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              Milestones
            </h2>
            <div className="space-y-4">
              {project.milestones.map((m) => (
                <div key={m._id} className="relative pl-6 border-l-2 border-gray-100 pb-4 last:pb-0">
                  <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white ${
                    m.status === 'Completed' ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <p className="text-sm font-bold text-gray-900">{m.title}</p>
                  <p className="text-xs text-gray-500">{m.description}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Due: {new Date(m.dueDate).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <File className="h-5 w-5 text-primary" />
                Documents
              </h2>
              {user?.role === 'Admin' && (
                <button
                  onClick={() => setShowAddDocument(!showAddDocument)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              )}
            </div>
            
            {showAddDocument && user?.role === 'Admin' && (
              <div className="mb-4 p-4 border rounded-lg bg-gray-50 space-y-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDocumentType('file')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border ${documentType === 'file' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                  >
                    <File className="h-3 w-3 inline mr-1" />
                    File
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocumentType('link')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border ${documentType === 'link' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                  >
                    <LinkIcon className="h-3 w-3 inline mr-1" />
                    Link
                  </button>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Document Name</label>
                  <input
                    type="text"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Enter document name"
                  />
                </div>
                {documentType === 'file' ? (
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Select File</label>
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors relative overflow-hidden">
                        {documentFile ? (
                          <div className="p-4 text-center">
                            <File className="h-6 w-6 text-gray-500 mx-auto mb-2" />
                            <p className="text-sm font-medium text-gray-700">{documentFile.name}</p>
                          </div>
                        ) : (
                          <div className="p-4 text-center">
                            <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Click to select file</p>
                          </div>
                        )}
                        <input
                          type="file"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => setDocumentFile(e.target.files ? e.target.files[0] : null)}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">URL</label>
                    <input
                      type="url"
                      value={documentLink}
                      onChange={(e) => setDocumentLink(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="https://example.com"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleAddDocument}
                    disabled={isAddingDocument}
                    className="flex-1 px-3 py-2 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isAddingDocument ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : null}
                    Add Document
                  </button>
                  <button
                    onClick={() => {
                      setShowAddDocument(false);
                      setDocumentType('file');
                      setDocumentName('');
                      setDocumentLink('');
                      setDocumentFile(null);
                    }}
                    className="px-3 py-2 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              {project.documents && project.documents.length > 0 ? (
                project.documents.map((doc) => (
                  <div key={doc._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {doc.type === 'file' ? (
                        <File className="h-5 w-5 text-primary" />
                      ) : (
                        <LinkIcon className="h-5 w-5 text-primary" />
                      )}
                      <div>
                        <a
                          href={doc.type === 'file' ? `http://localhost:5000${doc.url}` : doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-gray-900 hover:text-primary"
                        >
                          {doc.name}
                        </a>
                        <p className="text-xs text-gray-500">
                          {doc.uploadedBy.name} • {formatDate(doc.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    {user?.role === 'Admin' && (
                      <button
                        onClick={() => handleDeleteDocument(doc._id!)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No documents yet</p>
              )}
            </div>
          </div>

          {project.applicationTypes && project.applicationTypes.length > 0 && (
            <div className="bg-white p-5 rounded-xl border shadow-sm">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                Application Types & Menus
              </h2>
              <div className="space-y-4">
                {project.applicationTypes.map((appType) => (
                  <div key={appType._id} className="space-y-2">
                    <h3 className="text-sm font-bold text-gray-800">{appType.name}</h3>
                    <div className="flex flex-wrap gap-2">
                      {appType.menus?.map((menu) => (
                        <span 
                          key={menu._id}
                          className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium"
                        >
                          {menu.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white p-5 rounded-xl border shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Project Todos
            </h2>
            <div className="space-y-2">
              {project.todos.map((todo) => (
                <div key={todo._id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg group">
                  <input 
                    type="checkbox" 
                    checked={todo.completed} 
                    readOnly
                    className="h-4 w-4 rounded border-gray-300 text-primary"
                  />
                  <span className={`text-sm ${todo.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {todo.task}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Column: Bugs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <BugIcon className="h-5 w-5 text-red-600" />
                  Bugs / Issues
                </h2>
                <div className="text-xs text-gray-500">
                  {filteredBugs.length} Issues Found
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search bugs..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select 
                    className="pl-10 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white appearance-none"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="All">All Status</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {filteredBugs.length > 0 ? (
                filteredBugs.map((bug) => (
                  <Link 
                    key={bug._id} 
                    to={`/bugs/${bug._id}`}
                    className="p-4 flex items-start justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-bold text-gray-900">{bug.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{bug.description}</p>
                      <div className="flex items-center gap-3 pt-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          bug.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                          bug.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                          bug.priority === 'Medium' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {bug.priority}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          bug.status === 'Open' ? 'bg-blue-100 text-blue-700' :
                          bug.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                          bug.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {bug.status}
                        </span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(bug.createdAt)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 mt-1" />
                  </Link>
                ))
              ) : (
                <div className="p-12 text-center text-gray-500">
                  <BugIcon className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                  <p>No bugs reported yet. Great job!</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <History className="h-5 w-5 text-gray-600" />
                Project Activity Log
              </h2>
            </div>
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {activities.map((activity) => (
                <div key={activity._id} className="p-4 flex gap-4 text-sm">
                  <div className="h-8 w-8 rounded-full bg-gray-100 overflow-hidden shrink-0">
                    {activity.user?.profilePhoto ? (
                      <img src={`http://localhost:5000${activity.user.profilePhoto}`} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs font-bold text-gray-400">
                        {activity.user?.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-900">
                      <span className="font-bold">{activity.user?.name || 'Unknown User'}</span>
                      <span className="text-gray-500 mx-2">{activity.action}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{activity.details}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{formatDate(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;
