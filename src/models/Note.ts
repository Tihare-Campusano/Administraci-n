export interface CheckItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  items: CheckItem[];
  category: string;
  isPinned: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
}
