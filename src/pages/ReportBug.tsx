import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import type { Project, User } from '../types';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Loader2,
  ChevronLeft,
  BugIcon,
  AlertCircle,
  Paperclip,
  Image as ImageIcon,
  ChevronDown,
  Upload,
  File,
  Download,
  X
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const bugSchema = z.object({
  title: z.string().min(3, 'Bug title must be at least 3 characters'),
  description: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  project: z.string().min(1, 'Select a project'),
  assignedTo: z.string().optional(),
  applicationType: z.string().optional(),
  menu: z.string().optional(),
});

type BugFormValues = z.infer<typeof bugSchema>;

const ReportBug = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialProjectId = searchParams.get('project') || '';
  const { user } = useAuthStore();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [developers, setDevelopers] = useState<User[]>([]);
  const [applicationTypes, setApplicationTypes] = useState<string[]>([]);
  const [menus, setMenus] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkProjectId, setBulkProjectId] = useState<string>('');
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [showAddAppTypeModal, setShowAddAppTypeModal] = useState(false);
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [newAppTypeName, setNewAppTypeName] = useState('');
  const [newMenuName, setNewMenuName] = useState('');
  const [isAddingAppType, setIsAddingAppType] = useState(false);
  const [isAddingMenu, setIsAddingMenu] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BugFormValues>({
    resolver: zodResolver(bugSchema),
    defaultValues: {
      project: initialProjectId,
      priority: 'Medium'
    }
  });

  const selectedProjectId = watch('project');
  const selectedApplicationType = watch('applicationType');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await api.get('/projects/my');
        setProjects(response.data);
      } catch (err) {
        console.error('Error fetching projects:', err);
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      const project = projects.find(p => p._id === selectedProjectId);
      if (project) {
        setDevelopers(project.developers);
        setApplicationTypes(project.applicationTypes?.map(at => at.name) || []);
        setMenus([]);
      }
    } else {
      setDevelopers([]);
      setApplicationTypes([]);
      setMenus([]);
    }
  }, [selectedProjectId, projects]);

  useEffect(() => {
    if (selectedProjectId && selectedApplicationType) {
      const project = projects.find(p => p._id === selectedProjectId);
      if (project) {
        const appType = project.applicationTypes?.find(at => at.name === selectedApplicationType);
        setMenus(appType?.menus?.map(m => m.name) || []);
      }
    } else {
      setMenus([]);
    }
  }, [selectedProjectId, selectedApplicationType, projects]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Create preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
    }
  };

  const onSubmit = async (data: BugFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      let evidenceUrl = '';
      
      // Upload file first if exists
      if (file) {
        const formData = new FormData();
        formData.append('evidence', file);
        const uploadRes = await api.post('/bugs/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        evidenceUrl = uploadRes.data.filePath;
      }

      await api.post('/bugs', { ...data, evidence: evidenceUrl });
      navigate(`/projects/${data.project}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to report bug');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAppType = async () => {
    if (!newAppTypeName.trim() || !selectedProjectId) return;
    setIsAddingAppType(true);
    try {
      const projectRes = await api.get(`/projects/${selectedProjectId}`);
      const project: Project = projectRes.data;
      const updatedApplicationTypes = [
        ...(project.applicationTypes || []),
        { name: newAppTypeName.trim(), menus: [] }
      ];
      await api.put(`/projects/${selectedProjectId}`, {
        ...project,
        applicationTypes: updatedApplicationTypes
      });
      const updatedProjectsRes = await api.get('/projects/my');
      setProjects(updatedProjectsRes.data);
      setShowAddAppTypeModal(false);
      setNewAppTypeName('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add application type');
    } finally {
      setIsAddingAppType(false);
    }
  };

  const handleAddMenu = async () => {
    if (!newMenuName.trim() || !selectedProjectId || !selectedApplicationType) return;
    setIsAddingMenu(true);
    try {
      const projectRes = await api.get(`/projects/${selectedProjectId}`);
      const project: Project = projectRes.data;
      const updatedApplicationTypes = (project.applicationTypes || []).map(appType => {
        if (appType.name === selectedApplicationType) {
          return {
            ...appType,
            menus: [...(appType.menus || []), { name: newMenuName.trim() }]
          };
        }
        return appType;
      });
      await api.put(`/projects/${selectedProjectId}`, {
        ...project,
        applicationTypes: updatedApplicationTypes
      });
      const updatedProjectsRes = await api.get('/projects/my');
      setProjects(updatedProjectsRes.data);
      setShowAddMenuModal(false);
      setNewMenuName('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add menu');
    } finally {
      setIsAddingMenu(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile || !bulkProjectId) return;
    
    setIsBulkUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', bulkFile);
      formData.append('project', bulkProjectId);
      
      const response = await api.post('/bugs/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.errors && response.data.errors.length > 0) {
        alert(`Upload completed with ${response.data.uploadedCount} bugs uploaded, but ${response.data.errors.length} rows failed:\n${response.data.errors.join('\n')}`);
        navigate(`/projects/${bulkProjectId}`);
      } else {
        alert(`Successfully uploaded ${response.data.count} bugs!`);
        navigate(`/projects/${bulkProjectId}`);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to upload bugs';
      const errorDetails = err.response?.data?.errors?.join('\n');
      setError(errorDetails ? `${errorMsg}\n\n${errorDetails}` : errorMsg);
    } finally {
      setIsBulkUploading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report a New Bug</h1>
          <p className="text-sm text-gray-500">Provide as much detail as possible to help developers fix it</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white p-6 rounded-xl border shadow-sm w-full">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Project</label>
                  <div className="relative">
                    <select 
                      {...register('project')}
                      className="w-full appearance-none px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none bg-white text-sm"
                    >
                      <option value="">Select Project</option>
                      {projects.map(p => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                  {errors.project && <p className="text-xs text-red-500 mt-1">{errors.project.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Priority</label>
                  <div className="relative">
                    <select 
                      {...register('priority')}
                      className="w-full appearance-none px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none bg-white text-sm"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700">Application Type</label>
                    {user?.role === 'Admin' && selectedProjectId && (
                      <button
                        type="button"
                        onClick={() => setShowAddAppTypeModal(true)}
                        className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
                      >
                        <Plus className="h-3 w-3" /> Add
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <select 
                      {...register('applicationType')}
                      disabled={!selectedProjectId || applicationTypes.length === 0}
                      className="w-full appearance-none px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none bg-white text-sm disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Application Type</option>
                      {applicationTypes.map((at, idx) => (
                        <option key={idx} value={at}>{at}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700">Menu</label>
                    {user?.role === 'Admin' && selectedProjectId && selectedApplicationType && (
                      <button
                        type="button"
                        onClick={() => setShowAddMenuModal(true)}
                        className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
                      >
                        <Plus className="h-3 w-3" /> Add
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <select 
                      {...register('menu')}
                      disabled={!selectedApplicationType || menus.length === 0}
                      className="w-full appearance-none px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none bg-white text-sm disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Menu</option>
                      {menus.map((m, idx) => (
                        <option key={idx} value={m}>{m}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Bug Title</label>
                <input 
                  {...register('title')}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm"
                  placeholder="E.g., Login button not working on mobile"
                />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Description (Optional)</label>
                <textarea 
                  {...register('description')}
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm resize-none"
                  placeholder="Describe the steps to reproduce the bug..."
                />
                {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Assign to Developer (Optional)</label>
                <div className="relative">
                  <select 
                    {...register('assignedTo')}
                    disabled={!selectedProjectId}
                    className="w-full appearance-none px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none bg-white text-sm disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <option value="">Auto-assign / Unassigned</option>
                    {developers.map(dev => (
                      <option key={dev._id} value={dev._id}>{dev.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Evidence Upload */}
              <div className="space-y-2 pt-4 border-t">
                <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-gray-600" />
                  Evidence (Images or Documents)
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors relative overflow-hidden">
                    {preview ? (
                      <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-contain p-2" />
                    ) : file ? (
                      <div className="flex flex-col items-center justify-center pt-4 pb-4">
                        <AlertCircle className="w-10 h-10 mb-3 text-blue-500" />
                        <p className="mb-2 text-sm text-gray-900 font-bold">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-4 pb-4 text-center px-4">
                        <ImageIcon className="w-10 h-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500 font-semibold">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-400 uppercase tracking-wider">JPEG, PNG, GIF, PDF, DOC (MAX. 10MB)</p>
                      </div>
                    )}
                    <input type="file" className="hidden" onChange={handleFileChange} accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx" />
                  </label>
                </div>
                {file && (
                  <button 
                    type="button" 
                    onClick={() => {setFile(null); setPreview(null);}}
                    className="text-xs text-red-500 font-bold hover:underline"
                  >
                    Remove Evidence
                  </button>
                )}
              </div>
            </div>

            <div className="pt-6 flex gap-4">
              <button 
                type="button" 
                onClick={() => navigate(-1)}
                className="flex-1 py-3 px-4 border rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                {isLoading ? 'Reporting Bug...' : 'Report Bug'}
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-bold text-gray-900">Bulk Upload</h3>
            </div>
            <p className="text-sm text-gray-500">Upload bugs in bulk using an Excel file.</p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700">Select Project</label>
                <button 
                  type="button"
                  onClick={async () => {
                    try {
                      const response = await api.get('/bugs/template/download', {
                        responseType: 'blob'
                      });
                      const url = window.URL.createObjectURL(new Blob([response.data]));
                      const link = document.createElement('a');
                      link.href = url;
                      link.setAttribute('download', 'bug_upload_template.xlsx');
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      window.URL.revokeObjectURL(url);
                    } catch (err) {
                      console.error('Error downloading template:', err);
                      alert('Failed to download template');
                    }
                  }}
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  Download Template
                </button>
              </div>
              <div className="relative">
                <select 
                  value={bulkProjectId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBulkProjectId(val);
                    if (!val && bulkFile) {
                      setBulkFile(null);
                    }
                  }}
                  className="w-full appearance-none px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none bg-white text-sm"
                >
                  <option value="">Select Project</option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>

              <div className="flex items-center justify-center w-full">
                <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors relative overflow-hidden ${!bulkProjectId ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
                  {bulkFile ? (
                    <div className="flex flex-col items-center justify-center pt-2 pb-2">
                      <File className="w-8 h-8 mb-2 text-blue-500" />
                      <p className="mb-1 text-xs text-gray-900 font-bold">{bulkFile.name}</p>
                      <p className="text-[10px] text-gray-500">{(bulkFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-2 pb-2 text-center px-4">
                      <Upload className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="mb-1 text-xs text-gray-500 font-semibold">{!bulkProjectId ? 'Select a project first' : 'Click to upload Excel'}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">XLS, XLSX</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".xls,.xlsx" 
                    disabled={!bulkProjectId}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setBulkFile(e.target.files[0]);
                      }
                    }} 
                  />
                </label>
              </div>
              {bulkFile && (
                <button 
                  type="button" 
                  onClick={() => setBulkFile(null)}
                  className="text-xs text-red-500 font-bold hover:underline"
                >
                  Remove File
                </button>
              )}

              <button 
                type="button"
                disabled={!bulkFile || !bulkProjectId || isBulkUploading}
                onClick={handleBulkUpload}
                className="w-full py-2 px-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isBulkUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isBulkUploading ? 'Uploading...' : 'Upload Bugs'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAddAppTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Add Application Type
              </h2>
              <button onClick={() => setShowAddAppTypeModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Application Type Name</label>
                <input
                  type="text"
                  value={newAppTypeName}
                  onChange={(e) => setNewAppTypeName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm"
                  placeholder="e.g., Admin Dashboard"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddAppType();
                  }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAppTypeModal(false)}
                  className="flex-1 py-2 px-4 border rounded-lg font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddAppType}
                  disabled={isAddingAppType || !newAppTypeName.trim()}
                  className="flex-1 py-2 px-4 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAddingAppType && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isAddingAppType ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddMenuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Add Menu
              </h2>
              <button onClick={() => setShowAddMenuModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Menu Name</label>
                <input
                  type="text"
                  value={newMenuName}
                  onChange={(e) => setNewMenuName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm"
                  placeholder="e.g., User Management"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddMenu();
                  }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMenuModal(false)}
                  className="flex-1 py-2 px-4 border rounded-lg font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddMenu}
                  disabled={isAddingMenu || !newMenuName.trim()}
                  className="flex-1 py-2 px-4 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAddingMenu && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isAddingMenu ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportBug;
