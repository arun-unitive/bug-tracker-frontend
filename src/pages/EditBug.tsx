import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../services/api';
import type { Project, User } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import {
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
} from 'lucide-react';

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

const EditBug = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [developers, setDevelopers] = useState<User[]>([]);
  const [applicationTypes, setApplicationTypes] = useState<string[]>([]);
  const [menus, setMenus] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bugEvidenceUrl, setBugEvidenceUrl] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<BugFormValues>({
    resolver: zodResolver(bugSchema),
    defaultValues: {
      project: '',
      priority: 'Medium',
      assignedTo: '',
      title: '',
      description: '',
      applicationType: '',
      menu: '',
    },
  });

  const selectedProjectId = watch('project');
  const selectedApplicationType = watch('applicationType');
  const savedApplicationTypeRef = React.useRef('');
  const savedMenuRef = React.useRef('');

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        setError(null);
        setIsLoading(true);

        const [projectsRes, bugRes] = await Promise.all([
          api.get('/projects/my'),
          api.get(`/bugs/${id}`),
        ]);

        setProjects(projectsRes.data);

        const bug = bugRes.data;

        const projectId =
          typeof bug.project === 'string' ? bug.project : (bug.project?._id as string);
        const assignedToId =
          bug.assignedTo?._id ? (bug.assignedTo._id as string) : (bug.assignedTo as string | undefined);

        setBugEvidenceUrl(bug.evidence || '');

        // If existing evidence is an image, show it in the preview area.
        if (bug.evidence && bug.evidence.match(/\.(jpeg|jpg|png|gif)$/i)) {
          setPreview(`http://localhost:5000${bug.evidence}`);
        } else {
          setPreview(null);
        }

        savedApplicationTypeRef.current = bug.applicationType || '';
        savedMenuRef.current = bug.menu || '';

        reset({
          title: bug.title || '',
          description: bug.description || '',
          priority: bug.priority || 'Medium',
          project: projectId || '',
          assignedTo: assignedToId || '',
          applicationType: bug.applicationType || '',
          menu: bug.menu || '',
        });
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load bug');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchInitial();
  }, [id, reset]);

  useEffect(() => {
    if (!selectedProjectId) {
      setDevelopers([]);
      setApplicationTypes([]);
      setMenus([]);
      return;
    }
    const project = projects.find((p) => p._id === selectedProjectId);
    if (project) {
      setDevelopers(project.developers);
      // Include saved application type if it's not already in the list
      const appTypes = project.applicationTypes?.map(at => at.name) || [];
      if (savedApplicationTypeRef.current && !appTypes.includes(savedApplicationTypeRef.current)) {
        appTypes.push(savedApplicationTypeRef.current);
      }
      setApplicationTypes(appTypes);
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
        let menus = appType?.menus?.map(m => m.name) || [];
        // Include saved menu if it's not already in the list
        if (savedMenuRef.current && !menus.includes(savedMenuRef.current)) {
          menus.push(savedMenuRef.current);
        }
        setMenus(menus);
      }
    } else {
      setMenus([]);
    }
  }, [selectedProjectId, selectedApplicationType, projects]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
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
      let evidenceUrl = bugEvidenceUrl || '';

      if (file) {
        const formData = new FormData();
        formData.append('evidence', file);
        const uploadRes = await api.post('/bugs/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        evidenceUrl = uploadRes.data.filePath;
      }

      await api.put(`/bugs/${id}`, {
        title: data.title,
        description: data.description,
        priority: data.priority,
        project: data.project,
        assignedTo: data.assignedTo || undefined,
        applicationType: data.applicationType,
        menu: data.menu,
        evidence: evidenceUrl,
      });

      navigate(`/projects/${data.project}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update bug');
    } finally {
      setIsLoading(false);
    }
  };

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
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-red-500 mt-0.5" />
          <div>
            <p className="font-bold text-gray-900">Unable to edit bug</p>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Bug</h1>
          <p className="text-sm text-gray-500">Update the details and evidence for this bug</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white p-6 rounded-xl border shadow-sm w-full">
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
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
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
              <label className="text-sm font-semibold text-gray-700">Application Type</label>
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
              <label className="text-sm font-semibold text-gray-700">Menu</label>
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
                {developers.map((dev) => (
                  <option key={dev._id} value={dev._id}>
                    {dev.name}
                  </option>
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
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
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
          <button type="submit" disabled={isLoading} className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update Bug'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditBug;
