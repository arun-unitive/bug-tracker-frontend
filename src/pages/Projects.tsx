import React, { useEffect, useState } from 'react';
import api from '../services/api';
import type { Project } from '../types';
import { 
  FolderKanban, 
  Plus, 
  Calendar, 
  Users, 
  ChevronRight,
  Loader2,
  Search
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { formatDate } from '../lib/utils';

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuthStore();
  const [brokenProjectPhotos, setBrokenProjectPhotos] = useState<Record<string, boolean>>({});

  const getProjectImageUrl = (photo?: string) => {
    if (!photo) return null;
    if (photo.startsWith('http://') || photo.startsWith('https://')) return photo;
    // Normalize Windows backslashes and ensure leading slash for uploads paths.
    const cleaned = photo.replace(/\\/g, '/').trim();
    const normalized = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
    return `http://localhost:5000${normalized}`;
  };

  const fetchProjects = async () => {
    try {
      const endpoint = user?.role === 'Admin' ? '/projects' : '/projects/my';
      const response = await api.get(endpoint);
      setProjects(response.data);
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user?.role]);

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase())
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
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-gray-500">
            {user?.role === 'Admin' ? 'Manage all projects' : 'View your assigned projects'}
          </p>
        </div>
        {user?.role === 'Admin' && (
          <Link 
            to="/projects/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search projects..."
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {filteredProjects.map((project) => (
            <Link 
              key={project._id}
              to={`/projects/${project._id}`}
              className="group border rounded-xl p-5 hover:border-primary/50 hover:shadow-md transition-all bg-white flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600 h-10 w-10 flex items-center justify-center overflow-hidden">
                      {project.projectPhoto && !brokenProjectPhotos[project._id] ? (
                        <img
                          src={getProjectImageUrl(project.projectPhoto) ?? undefined}
                          alt=""
                          className="h-8 w-8 object-cover rounded"
                          onError={() => {
                            setBrokenProjectPhotos((prev) => ({ ...prev, [project._id]: true }));
                          }}
                          loading="lazy"
                        />
                      ) : (
                        <FolderKanban className="h-6 w-6" />
                      )}
                    </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                  project.status === 'Active' ? 'bg-green-100 text-green-700' :
                  project.status === 'Planning' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {project.status}
                </span>
              </div>
              
              <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-1">
                {project.name}
              </h3>
              <p className="text-sm text-gray-500 mt-2 line-clamp-2 flex-1">
                {project.description}
              </p>

              <div className="mt-6 pt-4 border-t flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(project.startDate)}
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {project.developers.length + project.testers.length} Members
                </div>
              </div>
            </Link>
          ))}
          {filteredProjects.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500">
              No projects found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Projects;
