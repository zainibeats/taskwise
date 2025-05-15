import { NextRequest, NextResponse } from 'next/server';
import { taskService } from '@/lib/task-service';
import { getUserFromSession } from '@/lib/auth-utils';

// Set CORS headers helper
function setCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
  return setCorsHeaders(NextResponse.json({}));
}

// GET /api/tasks - Get all tasks
export async function GET(request: NextRequest) {
  try {
    // Extract cookies from request and pass them to the service
    const cookie = request.headers.get('cookie') || '';
    const tasks = await taskService.getAllTasks(undefined, { cookie });
    return setCorsHeaders(NextResponse.json(tasks));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return setCorsHeaders(
      NextResponse.json(
        { error: 'Failed to fetch tasks', details: error instanceof Error ? error.message : String(error) }, 
        { status: 500 }
      )
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    // Extract cookies from request
    const cookie = request.headers.get('cookie') || '';
    
    // Get the user from the session
    const user = await getUserFromSession(request);
    const userId = user?.id;
    
    const taskData = await request.json();
    
    // Validate required fields
    if (!taskData.title) {
      return setCorsHeaders(NextResponse.json({ error: 'Title is required' }, { status: 400 }));
    }
    
    // Create task with user ID and pass cookies
    const task = await taskService.createTask(taskData, userId, { cookie });
    return setCorsHeaders(NextResponse.json(task, { status: 201 }));
  } catch (error) {
    console.error('Error creating task:', error);
    return setCorsHeaders(
      NextResponse.json(
        { error: 'Failed to create task', details: error instanceof Error ? error.message : String(error) }, 
        { status: 500 }
      )
    );
  }
} 