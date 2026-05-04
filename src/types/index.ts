export type Role = 'Admin' | 'Developer' | 'Tester';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  profilePhoto?: string;
}

export interface AuthResponse extends User {
  token: string;
}

export interface Milestone {
  _id?: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'Pending' | 'Completed';
}

export interface Todo {
  _id?: string;
  task: string;
  completed: boolean;
}

export interface Menu {
  _id?: string;
  name: string;
}

export interface ApplicationType {
  _id?: string;
  name: string;
  menus: Menu[];
}

export interface Document {
  _id?: string;
  name: string;
  type: 'file' | 'link';
  url: string;
  uploadedBy: User;
  uploadedAt: string;
}

export interface Project {
  _id: string;
  name: string;
  projectPhoto?: string;
  description: string;
  startDate: string;
  endDate: string;
  milestones: Milestone[];
  todos: Todo[];
  applicationTypes: ApplicationType[];
  documents: Document[];
  developers: User[];
  testers: User[];
  status: 'Planning' | 'Active' | 'Completed' | 'On Hold';
  createdBy: User;
  createdAt: string;
}

export type BugPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type BugStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export interface Comment {
  _id: string;
  user: User;
  text: string;
  attachment?: string;
  timestamp: string;
}

export interface Bug {
  _id: string;
  title: string;
  description: string;
  evidence?: string;
  priority: BugPriority;
  status: BugStatus;
  project: string | Project;
  applicationType?: string;
  menu?: string;
  createdBy: User;
  assignedTo?: User;
  resolvedBy?: User;
  resolvedAt?: string;
  comments: Comment[];
  createdAt: string;
}

export interface Activity {
  _id: string;
  user: User;
  project: Project;
  bug?: Bug;
  action: string;
  details: string;
  timestamp: string;
}
