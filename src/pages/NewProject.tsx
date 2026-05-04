import React, { useEffect, useRef, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { User } from '../types';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Loader2,
  ChevronLeft,
  Image as ImageIcon
} from 'lucide-react';

const projectSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  startDate: z.string(),
  endDate: z.string(),
  milestones: z.array(z.object({
    title: z.string().min(3, 'Milestone title must be at least 3 characters'),
    description: z.string(),
    dueDate: z.string(),
  })),
  todos: z.array(z.object({
    task: z.string().min(3, 'Task must be at least 3 characters'),
  })),
  applicationTypes: z.array(z.object({
    name: z.string().min(1, 'Application type name is required'),
    menus: z.array(z.object({
      name: z.string().min(1, 'Menu name is required'),
    })),
  })),
  developers: z.array(z.string()).min(1, 'Select at least one developer'),
  testers: z.array(z.string()).min(1, 'Select at least one tester'),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface ApplicationTypeFormProps {
  appIndex: number;
  control: any;
  register: any;
  onRemove: () => void;
}

const ApplicationTypeForm: React.FC<ApplicationTypeFormProps> = ({ 
  appIndex, 
  control, 
  register, 
  onRemove 
}) => {
  const { fields: menuFields, append: appendMenu, remove: removeMenu } = useFieldArray({
    control,
    name: `applicationTypes.${appIndex}.menus` as const,
  });

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex items-center gap-2 mb-4">
        <input 
          {...register(`applicationTypes.${appIndex}.name`)}
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none text-sm"
          placeholder="Application Type (e.g. Mobile App, Admin App)"
        />
        <button 
          type="button" 
          onClick={onRemove}
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="pl-4 border-l-2 border-indigo-200 space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-gray-700">Menus</label>
        </div>
        <div className="space-y-2">
          {menuFields.map((menuField, menuIndex) => (
            <div key={menuField.id} className="flex items-center gap-2">
              <input 
                {...register(`applicationTypes.${appIndex}.menus.${menuIndex}.name`)}
                className="flex-1 px-3 py-1.5 border rounded focus:outline-none text-sm"
                placeholder="Menu (e.g. Dashboard, Master)"
              />
              <button 
                type="button" 
                onClick={() => removeMenu(menuIndex)}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button 
            type="button" 
            onClick={() => appendMenu({ name: '' })}
            className="text-primary text-xs font-medium flex items-center gap-1 hover:underline"
          >
            <Plus className="h-3 w-3" /> Add Menu
          </button>
        </div>
      </div>
    </div>
  );
};

const NewProject = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [projectPreview, setProjectPreview] = useState<string | null>(null);
  const [isProjectPhotoDragging, setIsProjectPhotoDragging] = useState(false);
  const projectPhotoInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      milestones: [{ title: '', description: '', dueDate: '' }],
      todos: [{ task: '' }],
      applicationTypes: [{ name: '', menus: [{ name: '' }] }],
      developers: [],
      testers: [],
    }
  });

  const { fields: milestoneFields, append: appendMilestone, remove: removeMilestone } = useFieldArray({
    control,
    name: "milestones"
  });

  const { fields: todoFields, append: appendTodo, remove: removeTodo } = useFieldArray({
    control,
    name: "todos"
  });

  const { fields: appTypeFields, append: appendAppType, remove: removeAppType } = useFieldArray({
    control,
    name: "applicationTypes"
  });

  const setProjectPhotoFromFile = (f: File | null) => {
    setProjectFile(f);
    if (!f) {
      setProjectPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setProjectPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await api.get('/users');
        setEmployees(response.data);
      } catch (err) {
        console.error('Error fetching employees:', err);
      }
    };
    fetchEmployees();
  }, []);

  const onSubmit = async (data: ProjectFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      let projectPhoto = '';
      if (projectFile) {
        const formData = new FormData();
        formData.append('photo', projectFile);
        const uploadRes = await api.post('/projects/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        projectPhoto = uploadRes.data.filePath;
      }

      await api.post('/projects', { ...data, projectPhoto } as any);
      navigate('/projects');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  const developers = employees.filter(e => e.role === 'Developer');
  const testers = employees.filter(e => e.role === 'Tester');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
          <p className="text-sm text-gray-500">Define your project timeline, team, and milestones</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-white p-8 rounded-xl border shadow-sm">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700">Project Photo (Optional)</label>
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
              {projectPreview ? (
                <img src={projectPreview} alt="Project preview" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-gray-400">P</span>
              )}
            </div>

            <div className="flex-1">
              <div
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-4 transition-colors cursor-pointer select-none ${
                  isProjectPhotoDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
                role="button"
                tabIndex={0}
                onClick={() => projectPhotoInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') projectPhotoInputRef.current?.click();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsProjectPhotoDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsProjectPhotoDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsProjectPhotoDragging(false);
                  const f = e.dataTransfer.files?.[0] || null;
                  if (f) setProjectPhotoFromFile(f);
                }}
              >
                <ImageIcon className="h-8 w-8 text-gray-400" />
                <p className="text-sm font-bold text-gray-900">
                  {projectPreview ? 'Change photo' : 'Click or drag to upload'}
                </p>
                <p className="text-xs text-gray-500">PNG/JPG up to 10MB</p>
              </div>

              {projectPreview && (
                <button
                  type="button"
                  onClick={() => setProjectPhotoFromFile(null)}
                  className="mt-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Remove
                </button>
              )}

              <input
                ref={projectPhotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setProjectPhotoFromFile(f);
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1 col-span-full">
            <label className="text-sm font-semibold text-gray-700">Project Name</label>
            <input 
              {...register('name')}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:outline-none"
              placeholder="E-commerce App v2"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div className="space-y-1 col-span-full">
            <label className="text-sm font-semibold text-gray-700">Description</label>
            <textarea 
              {...register('description')}
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none"
              placeholder="Detailed description of the project..."
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Start Date
            </label>
            <input 
              {...register('startDate')}
              type="date"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              End Date
            </label>
            <input 
              {...register('endDate')}
              type="date"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t">
          {/* Developers Selection */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Assign Developers
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto p-4 border rounded-lg bg-gray-50">
              {developers.map(dev => (
                <label key={dev._id} className="flex items-center gap-3 p-2 hover:bg-white rounded-md transition-colors cursor-pointer border border-transparent hover:border-gray-200">
                  <input 
                    type="checkbox" 
                    value={dev._id}
                    {...register('developers')}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{dev.name}</p>
                    <p className="text-xs text-gray-500">{dev.email}</p>
                  </div>
                </label>
              ))}
            </div>
            {errors.developers && <p className="text-xs text-red-500">{errors.developers.message}</p>}
          </div>

          {/* Testers Selection */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Assign Testers
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto p-4 border rounded-lg bg-gray-50">
              {testers.map(tester => (
                <label key={tester._id} className="flex items-center gap-3 p-2 hover:bg-white rounded-md transition-colors cursor-pointer border border-transparent hover:border-gray-200">
                  <input 
                    type="checkbox" 
                    value={tester._id}
                    {...register('testers')}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tester.name}</p>
                    <p className="text-xs text-gray-500">{tester.email}</p>
                  </div>
                </label>
              ))}
            </div>
            {errors.testers && <p className="text-xs text-red-500">{errors.testers.message}</p>}
          </div>
        </div>

        {/* Milestones */}
        <div className="pt-6 border-t space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
              Milestones
            </h3>
            <button 
              type="button" 
              onClick={() => appendMilestone({ title: '', description: '', dueDate: '' })}
              className="text-primary text-sm font-medium flex items-center gap-1 hover:underline"
            >
              <Plus className="h-4 w-4" /> Add Milestone
            </button>
          </div>
          <div className="space-y-4">
            {milestoneFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-gray-50 relative group">
                <div className="space-y-1">
                  <input 
                    {...register(`milestones.${index}.title`)}
                    className="w-full px-3 py-1.5 border rounded focus:outline-none text-sm"
                    placeholder="Milestone title"
                  />
                </div>
                <div className="space-y-1">
                  <input 
                    {...register(`milestones.${index}.description`)}
                    className="w-full px-3 py-1.5 border rounded focus:outline-none text-sm"
                    placeholder="Brief description"
                  />
                </div>
                <div className="flex gap-2">
                  <input 
                    {...register(`milestones.${index}.dueDate`)}
                    type="date"
                    className="flex-1 px-3 py-1.5 border rounded focus:outline-none text-sm"
                  />
                  <button 
                    type="button" 
                    onClick={() => removeMilestone(index)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Todo List */}
        <div className="pt-6 border-t space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Initial Todo List</h3>
            <button 
              type="button" 
              onClick={() => appendTodo({ task: '' })}
              className="text-primary text-sm font-medium flex items-center gap-1 hover:underline"
            >
              <Plus className="h-4 w-4" /> Add Task
            </button>
          </div>
          <div className="space-y-3">
            {todoFields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-3 group">
                <input 
                  {...register(`todos.${index}.task`)}
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none text-sm"
                  placeholder="Task description..."
                />
                <button 
                  type="button" 
                  onClick={() => removeTodo(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Application Types & Menus */}
        <div className="pt-6 border-t space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-indigo-600" />
              Application Types & Menus
            </h3>
            <button 
              type="button" 
              onClick={() => appendAppType({ name: '', menus: [{ name: '' }] })}
              className="text-primary text-sm font-medium flex items-center gap-1 hover:underline"
            >
              <Plus className="h-4 w-4" /> Add Application Type
            </button>
          </div>
          <div className="space-y-4">
            {appTypeFields.map((appField, appIndex) => (
              <ApplicationTypeForm
                key={appField.id}
                appIndex={appIndex}
                control={control}
                register={register}
                onRemove={() => removeAppType(appIndex)}
              />
            ))}
          </div>
        </div>

        <div className="pt-8 border-t flex gap-4">
          <button 
            type="button" 
            onClick={() => navigate('/projects')}
            className="flex-1 py-3 px-4 border rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={isLoading}
            className="flex-1 py-3 px-4 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
            {isLoading ? 'Creating Project...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewProject;
