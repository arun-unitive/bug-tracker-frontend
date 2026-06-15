import React, { useEffect, useState } from 'react';
import api, { SERVER_URL } from '../services/api';
import type { User } from '../types';
import { 
  Plus, 
  Trash2, 
  Mail, 
  ShieldCheck,
  Loader2,
  Search,
  X,
  Lock,
  Camera,
  Eye,
  EyeOff,
  Edit,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const employeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.enum(['Admin', 'Developer', 'Tester']),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

const AddEmployeeModal = ({ isOpen, onClose, onSuccess, editUser = null }: { isOpen: boolean, onClose: () => void, onSuccess: () => void, editUser?: User | null }) => {
  const { user, updateProfilePhoto } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const modalRef = React.useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { role: 'Developer' }
  });

  useEffect(() => {
    if (editUser) {
      reset({
        name: editUser.name,
        email: editUser.email,
        role: editUser.role,
        password: '', // Don't show existing password
      });
      setPreview(editUser.profilePhoto ? `${SERVER_URL}${editUser.profilePhoto}` : null);
    } else {
      reset({
        name: '',
        email: '',
        role: 'Developer',
        password: '',
      });
      setPreview(null);
    }
  }, [editUser, reset, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const onSubmit = async (data: EmployeeFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      let profilePhoto = editUser?.profilePhoto || '';
      
      if (file) {
        const formData = new FormData();
        formData.append('evidence', file);
        const uploadRes = await api.post('/bugs/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        profilePhoto = uploadRes.data.filePath;
      }

      const payload = { ...data, profilePhoto };

      if (editUser) {
        const { password, ...updateData } = payload;
        await api.put(`/users/${editUser._id}`, updateData);
        if (editUser._id === user?._id && payload.profilePhoto) {
          updateProfilePhoto(payload.profilePhoto);
        }
      } else {
        await api.post('/auth/register', payload);
      }

      onSuccess();
      reset();
      setFile(null);
      setPreview(null);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${editUser ? 'update' : 'add'} employee`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/50 backdrop-blur-sm">
      <div ref={modalRef} className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {editUser ? <Edit className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
            {editUser ? 'Edit Employee' : 'Add New Employee'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="p-6 space-y-3 max-h-[90vh] overflow-y-auto"
        >
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Photo Upload Section */}
          <div className="flex flex-col items-center gap-3 pb-2">
            <div className="relative group">
              <div className="h-24 w-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                {preview ? (
                  <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full cursor-pointer shadow-lg hover:bg-primary/90 transition-colors">
                <Plus className="h-4 w-4" />
                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
              </label>
            </div>
            <p className="text-xs text-gray-500 font-medium">Upload Profile Photo (Optional)</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Full Name</label>
            <input 
              {...register('name')}
              className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-primary focus:outline-none text-sm"
              placeholder="John Doe"
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                {...register('email')}
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-1 focus:ring-primary focus:outline-none text-sm"
                placeholder="john@example.com"
              />
            </div>
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          {!editUser && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="w-full pl-10 pr-10 py-2 border rounded-md focus:ring-1 focus:ring-primary focus:outline-none text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Role</label>
            <div className="relative">
              <select 
                {...register('role')}
                className="w-full appearance-none px-3 py-2 pr-10 border border-gray-200 rounded-md focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none text-sm bg-white"
              >
                <option value="Admin">Admin</option>
                <option value="Developer">Developer</option>
                <option value="Tester">Tester</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? (editUser ? 'Saving...' : 'Adding...') : (editUser ? 'Save Changes' : 'Add Employee')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Employees = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('All');
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await api.delete(`/users/${id}`);
        setUsers(users.filter(u => u._id !== id));
      } catch (err) {
        alert('Failed to delete user');
      }
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterRole('All');
  };

  const filteredUsers = users.filter(user => 
    (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (filterRole === 'All' || user.role === filterRole)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-gray-500">Manage your team members and roles</p>
        </div>
        <button 
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Employee
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search employees..."
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative">
              <select
                className="w-full md:w-40 px-4 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="All">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Developer">Developer</option>
                <option value="Tester">Tester</option>
              </select>
            </div>
            <button
              onClick={resetFilters}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {filteredUsers.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gray-100 overflow-hidden">
                        {user.profilePhoto ? (
                          <img src={`${SERVER_URL}${user.profilePhoto}`} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xs font-bold text-gray-400">
                            {user.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${
                      user.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'Developer' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      <ShieldCheck className="h-3 w-3" />
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => navigate(`/employees/${user._id}`)}
                        className="text-gray-400 hover:text-primary p-1"
                        title="View Profile"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleEdit(user)}
                        className="text-gray-400 hover:text-primary p-1"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(user._id)}
                        disabled={user.role === 'Admin'}
                        className="text-red-500 hover:text-red-700 disabled:opacity-30 p-1"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-gray-500">No employees found.</div>
          )}
        </div>
      </div>

      <AddEmployeeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchUsers} 
        editUser={editingUser}
      />
    </div>
  );
};

export default Employees;
