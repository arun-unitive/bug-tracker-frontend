import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { SERVER_URL } from '../services/api';
import type { User, Project, Bug, Activity } from '../types';
import { 
  Mail, 
  ShieldCheck, 
  Loader2, 
  ArrowLeft, 
  Calendar,
  Briefcase,
  Bug as BugIcon,
  Activity as ActivityIcon,
  Clock,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';

interface UserDetail extends User {
  projects: Project[];
  bugs: Bug[];
  activities: Activity[];
}

const EmployeeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await api.get(`/users/${id}`);
        setUser(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch user details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserDetails();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Error</h2>
        <p className="text-gray-500 mb-4">{error || 'User not found'}</p>
        <button 
          onClick={() => navigate('/employees')}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          Back to Employees
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/employees')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Employee Profile</h1>
          <p className="text-sm text-gray-500">View detailed information and activity</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-24 bg-primary/10"></div>
            <div className="px-6 pb-6">
              <div className="relative -mt-12 mb-4">
                <div className="h-24 w-24 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow-sm mx-auto lg:mx-0">
                  {user.profilePhoto ? (
                    <img 
                      src={`${SERVER_URL}${user.profilePhoto}`} 
                      alt={user.name} 
                      className="h-full w-full object-cover" 
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-3xl font-bold text-gray-400">
                      {user.name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-center lg:text-left space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                  <div className="flex items-center justify-center lg:justify-start gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                      user.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'Developer' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      <ShieldCheck className="h-3 w-3" />
                      {user.role}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Mail className="h-4 w-4 text-gray-400" />
                    {user.email}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <UserIcon className="h-4 w-4 text-gray-400" />
                    ID: {user._id}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="text-2xl font-bold text-primary">{user.projects.length}</div>
              <div className="text-xs text-gray-500 font-medium">Projects</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="text-2xl font-bold text-red-500">{user.bugs.length}</div>
              <div className="text-xs text-gray-500 font-medium">Total Bugs</div>
            </div>
          </div>
        </div>

        {/* Right Column: Projects, Bugs, and Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Projects Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50/50">
              <h3 className="font-bold flex items-center gap-2 text-gray-900">
                <Briefcase className="h-5 w-5 text-primary" />
                Assigned Projects
              </h3>
            </div>
            <div className="divide-y">
              {user.projects.length > 0 ? user.projects.map(project => (
                <div 
                  key={project._id} 
                  className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/${project._id}`)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-gray-900">{project.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      project.status === 'Active' ? 'bg-green-100 text-green-700' :
                      project.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(project.startDate), 'MMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Created by {project.createdBy?.name || 'Unknown'}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="px-6 py-8 text-center text-gray-500 text-sm">
                  No projects assigned.
                </div>
              )}
            </div>
          </div>

          {/* Bugs Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50/50">
              <h3 className="font-bold flex items-center gap-2 text-gray-900">
                <BugIcon className="h-5 w-5 text-red-500" />
                Related Bugs
              </h3>
            </div>
            <div className="divide-y">
              {user.bugs.length > 0 ? user.bugs.map(bug => (
                <div 
                  key={bug._id} 
                  className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/bugs/${bug._id}`)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-gray-900">{bug.title}</h4>
                    <div className="flex gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        bug.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                        bug.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                        bug.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {bug.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        bug.status === 'Resolved' || bug.status === 'Closed' ? 'bg-green-100 text-green-700' :
                        bug.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {bug.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Project: <span className="text-gray-700 font-medium">{(bug.project as any)?.name || 'Unknown'}</span>
                  </div>
                </div>
              )) : (
                <div className="px-6 py-8 text-center text-gray-500 text-sm">
                  No bugs found.
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50/50">
              <h3 className="font-bold flex items-center gap-2 text-gray-900">
                <ActivityIcon className="h-5 w-5 text-green-500" />
                Recent Activity
              </h3>
            </div>
            <div className="divide-y">
              {user.activities.length > 0 ? user.activities.map(activity => (
                <div key={activity._id} className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {activity.action.toLowerCase().includes('create') ? (
                        <div className="p-1.5 bg-blue-100 rounded-full"><Plus className="h-3 w-3 text-blue-600" /></div>
                      ) : activity.action.toLowerCase().includes('fix') || activity.action.toLowerCase().includes('resolve') ? (
                        <div className="p-1.5 bg-green-100 rounded-full"><CheckCircle2 className="h-3 w-3 text-green-600" /></div>
                      ) : (
                        <div className="p-1.5 bg-gray-100 rounded-full"><Clock className="h-3 w-3 text-gray-600" /></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.action}</span> - {activity.details}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                        </span>
                        {activity.project && (
                          <span className="text-xs text-primary hover:underline cursor-pointer" onClick={() => navigate(`/projects/${activity.project?._id}`)}>
                            {activity.project.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="px-6 py-8 text-center text-gray-500 text-sm">
                  No recent activity.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetails;
