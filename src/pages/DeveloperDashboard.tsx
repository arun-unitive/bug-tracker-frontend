import React, { useEffect, useState } from 'react';
import api from '../services/api';
import type { Project, Bug } from '../types';
import { 
  FolderKanban, 
  BugIcon, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DeveloperDashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignedBugs, setAssignedBugs] = useState<Bug[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDeveloperData = async () => {
      try {
        const [projectsRes, bugsRes] = await Promise.all([
          api.get('/projects/my'),
          api.get('/bugs/my')
        ]);
        setProjects(projectsRes.data);
        setAssignedBugs(bugsRes.data);
      } catch (err) {
        console.error('Error fetching developer data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeveloperData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const projectsCount = projects.length;
  const bugsReceivedCount = assignedBugs.length;
  const bugsClosedCount = assignedBugs.filter((b) => b.status === 'Closed').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Developer Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Projects Assigned</p>
              <p className="text-2xl font-bold text-gray-900">{projectsCount}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <FolderKanban className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Bugs Received</p>
              <p className="text-2xl font-bold text-gray-900">{bugsReceivedCount}</p>
            </div>
            <div className="p-2 rounded-lg bg-gray-50 text-gray-700">
              <BugIcon className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Bugs Closed</p>
              <p className="text-2xl font-bold text-gray-900">{bugsClosedCount}</p>
            </div>
            <div className="p-2 rounded-lg bg-green-50 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Projects */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-gray-500" />
              Assigned Projects
            </h2>
          </div>
          <div className="divide-y max-h-[400px] overflow-y-auto">
            {projects.length > 0 ? (
              projects.map((project) => (
                <Link 
                  key={project._id} 
                  to={`/projects/${project._id}`}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100 text-green-600">
                      <FolderKanban className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{project.name}</p>
                      <p className="text-xs text-gray-500 truncate">{project.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">No projects assigned.</div>
            )}
          </div>
        </div>

        {/* Assigned Bugs to Fix */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BugIcon className="h-5 w-5 text-gray-500" />
              Bugs Assigned to Me
            </h2>
          </div>
          <div className="divide-y max-h-[400px] overflow-y-auto">
            {assignedBugs.length > 0 ? (
              assignedBugs.map((bug) => (
                <Link key={bug._id} to={`/bugs/${bug._id}`} className="p-4 flex items-start justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      bug.priority === 'Critical' ? 'bg-red-100 text-red-600' :
                      bug.priority === 'High' ? 'bg-orange-100 text-orange-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{bug.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          bug.status === 'Open' ? 'bg-blue-100 text-blue-600' :
                          bug.status === 'In Progress' ? 'bg-yellow-100 text-yellow-600' :
                          bug.status === 'Resolved' ? 'bg-green-100 text-green-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {bug.status}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          Priority: {bug.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 mt-1" />
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">No bugs assigned recently.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperDashboard;
