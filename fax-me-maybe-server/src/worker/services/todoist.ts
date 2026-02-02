import { TodoistApi, type Task, type Label } from '@doist/todoist-api-typescript';

// Priority mapping: FaxMeMaybe importance (1-5) to Todoist priority (1-4, where 4 is most urgent)
// Todoist uses inverted scale: p1 (priority 4) = most urgent, p4 (priority 1) = lowest
const IMPORTANCE_TO_TODOIST_PRIORITY: Record<number, number> = {
  1: 1, // Low -> p4 (lowest)
  2: 2, // Medium -> p3
  3: 3, // High -> p2
  4: 4, // Urgent -> p1 (highest)
  5: 4, // Critical -> p1 (highest, capped)
};

// Reverse mapping for display
const TODOIST_PRIORITY_TO_IMPORTANCE: Record<number, number> = {
  1: 1, // p4 -> Low
  2: 2, // p3 -> Medium
  3: 3, // p2 -> High
  4: 4, // p1 -> Urgent/Critical
};

export interface CreateTaskParams {
  content: string;
  description?: string;
  importance: number;
  dueString?: string;
  labels?: string[];
  from?: string;
  source?: string;
}

export interface TodoistTask {
  id: string;
  todoistId: string;
  content: string;
  description: string;
  importance: number;
  labels: string[];
  dueDate?: string;
  dueString?: string;
  from?: string;
  source?: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  url: string;
}

export interface ProductivityStats {
  completed_count: number;
  karma: number;
  karma_trend: string;
  days_items: Array<{ date: string; total_completed: number }>;
  week_items: Array<{ from: string; to: string; total_completed: number }>;
}

export class TodoistService {
  private api: TodoistApi;
  private apiToken: string;
  private projectName: string;
  private cachedProjectId: string | null = null;

  constructor(apiToken: string, projectName: string = 'FaxMeMaybe') {
    this.api = new TodoistApi(apiToken);
    this.apiToken = apiToken;
    this.projectName = projectName;
  }

  /**
   * Find or create the FaxMeMaybe project in Todoist
   */
  async getOrCreateProject(): Promise<{ id: string; name: string }> {
    // Try to find existing project
    const projectsResponse = await this.api.getProjects();
    const projects = projectsResponse.results || projectsResponse;
    
    const existingProject = (projects as Array<{ id: string; name: string }>).find(
      (p) => p.name.toLowerCase() === this.projectName.toLowerCase()
    );

    if (existingProject) {
      this.cachedProjectId = existingProject.id;
      return existingProject;
    }

    // Create new project
    const newProject = await this.api.addProject({
      name: this.projectName,
      color: 'red', // Matches the fire emoji theme
    });

    this.cachedProjectId = newProject.id;
    return { id: newProject.id, name: newProject.name };
  }

  /**
   * Get the project ID, using cache if available
   */
  async getProjectId(): Promise<string> {
    if (this.cachedProjectId) {
      return this.cachedProjectId;
    }
    const project = await this.getOrCreateProject();
    return project.id;
  }

  /**
   * Create a new task in Todoist
   */
  async createTask(params: CreateTaskParams): Promise<Task> {
    const projectId = await this.getProjectId();

    // Build the task content with metadata
    let content = params.content;
    
    // Add "from" as a prefix if provided
    if (params.from) {
      content = `[From: ${params.from}] ${content}`;
    }

    // Build description with source info
    let description = params.description || '';
    if (params.source) {
      description = description 
        ? `${description}\n\n---\nSource: ${params.source}`
        : `Source: ${params.source}`;
    }

    const task = await this.api.addTask({
      content,
      description,
      projectId,
      priority: IMPORTANCE_TO_TODOIST_PRIORITY[params.importance] || 1,
      dueString: params.dueString,
      dueLang: 'en',
      labels: params.labels || [],
    });

    return task;
  }

  /**
   * Get a task by its Todoist ID
   */
  async getTask(todoistTaskId: string): Promise<Task | null> {
    try {
      const task = await this.api.getTask(todoistTaskId);
      return task;
    } catch (error) {
      // Task might be completed or deleted
      console.error(`Failed to get task ${todoistTaskId}:`, error);
      return null;
    }
  }

  /**
   * Get all tasks from the FaxMeMaybe project
   */
  async getTasks(options?: { 
    completed?: boolean;
    limit?: number;
  }): Promise<Task[]> {
    const projectId = await this.getProjectId();
    
    // Get active tasks
    const response = await this.api.getTasks({
      projectId,
      limit: options?.limit || 200,
    });

    const tasks = response.results || response;
    return tasks as Task[];
  }

  /**
   * Complete (close) a task
   */
  async completeTask(todoistTaskId: string): Promise<boolean> {
    try {
      await this.api.closeTask(todoistTaskId);
      return true;
    } catch (error) {
      console.error(`Failed to complete task ${todoistTaskId}:`, error);
      return false;
    }
  }

  /**
   * Reopen a completed task
   */
  async reopenTask(todoistTaskId: string): Promise<boolean> {
    try {
      await this.api.reopenTask(todoistTaskId);
      return true;
    } catch (error) {
      console.error(`Failed to reopen task ${todoistTaskId}:`, error);
      return false;
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(todoistTaskId: string): Promise<boolean> {
    try {
      await this.api.deleteTask(todoistTaskId);
      return true;
    } catch (error) {
      console.error(`Failed to delete task ${todoistTaskId}:`, error);
      return false;
    }
  }

  /**
   * Get all labels from Todoist
   */
  async getLabels(): Promise<Label[]> {
    try {
      const response = await this.api.getLabels();
      const labels = response.results || response;
      return labels as Label[];
    } catch (error) {
      console.error('Failed to get labels:', error);
      return [];
    }
  }

  /**
   * Get productivity stats from Todoist (includes completed_count)
   * Note: This is account-wide, not project-specific
   */
  async getProductivityStats(): Promise<ProductivityStats | null> {
    try {
      const response = await fetch('https://api.todoist.com/api/v1/tasks/completed/stats', {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to get productivity stats:', response.status);
        return null;
      }

      return await response.json() as ProductivityStats;
    } catch (error) {
      console.error('Failed to get productivity stats:', error);
      return null;
    }
  }

  /**
   * Convert a Todoist Task to our unified format
   */
  taskToTodoistTask(task: Task, localId?: string): TodoistTask {
    // Extract "from" field from content if present
    let content = task.content;
    let from: string | undefined;
    
    const fromMatch = content.match(/^\[From: ([^\]]+)\] /);
    if (fromMatch) {
      from = fromMatch[1];
      content = content.replace(fromMatch[0], '');
    }

    // Extract source from description if present
    let description = task.description || '';
    let source: string | undefined;
    
    const sourceMatch = description.match(/\n\n---\nSource: (.+)$/);
    if (sourceMatch) {
      source = sourceMatch[1];
      description = description.replace(sourceMatch[0], '');
    } else if (description.startsWith('Source: ')) {
      source = description.replace('Source: ', '');
      description = '';
    }

    return {
      id: localId || task.id,
      todoistId: task.id,
      content,
      description,
      importance: TODOIST_PRIORITY_TO_IMPORTANCE[task.priority] || 1,
      labels: task.labels || [],
      dueDate: task.due?.date,
      dueString: task.due?.string,
      from,
      source,
      completed: task.checked || false,
      completedAt: task.completedAt || undefined,
      createdAt: task.addedAt || new Date().toISOString(),
      url: task.url,
    };
  }
}

/**
 * Verify Todoist webhook signature
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );

    // Convert to base64
    const expectedSignature = btoa(
      String.fromCharCode(...new Uint8Array(signatureBuffer))
    );

    return expectedSignature === signature;
  } catch (error) {
    console.error('Failed to verify webhook signature:', error);
    return false;
  }
}

// Webhook event types
export interface TodoistWebhookEvent {
  event_name: string;
  user_id: string;
  event_data: {
    id: string;
    content?: string;
    project_id?: string;
    [key: string]: unknown;
  };
  initiator?: {
    email: string;
    full_name: string;
    id: string;
  };
  triggered_at: string;
  version: string;
}
