import React, { useEffect, useState } from 'react';
import api from '../services/api';
import type { Project, Activity, User } from '../types';
import { 
  FolderKanban, 
  Users, 
  BugIcon, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from '../lib/utils';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    projects: 0,
    employees: 0,
    activeBugs: 0,
    resolvedBugs: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [projectsRes, usersRes, activitiesRes, bugStatsRes] = await Promise.all([
          api.get('/projects'),
          api.get('/users'),
          api.get('/activities'),
          api.get('/bugs/stats'),
        ]);

        const projects: Project[] = projectsRes.data;
        const users: User[] = usersRes.data;
        const bugStats = bugStatsRes.data;
        
        setStats({
          projects: projects.length,
          employees: users.length,
          activeBugs: bugStats.active,
          resolvedBugs: bugStats.resolved,
        });
        setActivities(activitiesRes.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    { name: 'Total Projects', value: stats.projects, icon: FolderKanban, bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
    { name: 'Total Employees', value: stats.employees, icon: Users, bgColor: 'bg-green-50', textColor: 'text-green-600' },
    { name: 'Active Bugs', value: stats.activeBugs, icon: BugIcon, bgColor: 'bg-red-50', textColor: 'text-red-600' },
    { name: 'Resolved Bugs', value: stats.resolvedBugs, icon: CheckCircle2, bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Link 
          to="/projects/new" 
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${stat.bgColor} ${stat.textColor}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-500" />
              Recent Activity
            </h2>
          </div>
          <div className="divide-y max-h-[400px] overflow-y-auto">
            {activities.length > 0 ? (
              activities.map((activity) => (
                <div key={activity._id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-gray-100 text-gray-600">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.user?.name || 'Unknown User'}</span> {activity.action}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{activity.details}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {formatDate(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">No activities found.</div>
            )}
          </div>
        </div>

        {/* System Health / Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link 
              to="/employees/new" 
              className="block w-full text-center py-2 px-4 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
            >
              Add New Employee
            </Link>
            <Link 
              to="/projects" 
              className="block w-full text-center py-2 px-4 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
            >
              Manage Projects
            </Link>
            <Link 
              to="/admin/reports" 
              className="block w-full text-center py-2 px-4 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
            >
              View System Reports
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
