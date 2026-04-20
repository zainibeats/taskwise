import { NextRequest, NextResponse } from 'next/server';
import { taskService } from '@/lib/task-service';

function setCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return setCorsHeaders(NextResponse.json({}));
}

export async function GET(_request: NextRequest) {
  try {
    const tasks = await taskService.getAllTasks();
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

export async function POST(request: NextRequest) {
  try {
    const taskData = await request.json();
    if (!taskData.title) {
      return setCorsHeaders(NextResponse.json({ error: 'Title is required' }, { status: 400 }));
    }
    const task = await taskService.createTask(taskData);
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
