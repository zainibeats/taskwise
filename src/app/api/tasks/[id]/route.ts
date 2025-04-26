import { NextRequest, NextResponse } from 'next/server';
import { taskService } from '@/lib/task-service';

interface RouteParams {
  params: {
    id: string;
  };
}

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

// GET /api/tasks/[id] - Get a specific task
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return setCorsHeaders(NextResponse.json({ error: 'Invalid ID' }, { status: 400 }));
    }

    const task = await taskService.getTaskById(id);
    if (!task) {
      return setCorsHeaders(NextResponse.json({ error: 'Task not found' }, { status: 404 }));
    }

    return setCorsHeaders(NextResponse.json(task));
  } catch (error) {
    console.error('Error fetching task:', error);
    return setCorsHeaders(
      NextResponse.json(
        { error: 'Failed to fetch task', details: error instanceof Error ? error.message : String(error) }, 
        { status: 500 }
      )
    );
  }
}

// PUT /api/tasks/[id] - Update a task
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return setCorsHeaders(NextResponse.json({ error: 'Invalid ID' }, { status: 400 }));
    }

    const updates = await request.json();
    const updatedTask = await taskService.updateTask(id, updates);
    
    if (!updatedTask) {
      return setCorsHeaders(NextResponse.json({ error: 'Task not found' }, { status: 404 }));
    }

    return setCorsHeaders(NextResponse.json(updatedTask));
  } catch (error) {
    console.error('Error updating task:', error);
    return setCorsHeaders(
      NextResponse.json(
        { error: 'Failed to update task', details: error instanceof Error ? error.message : String(error) }, 
        { status: 500 }
      )
    );
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return setCorsHeaders(NextResponse.json({ error: 'Invalid ID' }, { status: 400 }));
    }

    const success = await taskService.deleteTask(id);
    if (!success) {
      return setCorsHeaders(NextResponse.json({ error: 'Task not found' }, { status: 404 }));
    }

    return setCorsHeaders(NextResponse.json({ success: true }));
  } catch (error) {
    console.error('Error deleting task:', error);
    return setCorsHeaders(
      NextResponse.json(
        { error: 'Failed to delete task', details: error instanceof Error ? error.message : String(error) }, 
        { status: 500 }
      )
    );
  }
}

// PATCH /api/tasks/[id] - Toggle task completion
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return setCorsHeaders(NextResponse.json({ error: 'Invalid ID' }, { status: 400 }));
    }

    const updatedTask = await taskService.toggleTaskCompletion(id);
    if (!updatedTask) {
      return setCorsHeaders(NextResponse.json({ error: 'Task not found' }, { status: 404 }));
    }

    return setCorsHeaders(NextResponse.json(updatedTask));
  } catch (error) {
    console.error('Error toggling task completion:', error);
    return setCorsHeaders(
      NextResponse.json(
        { error: 'Failed to toggle task completion', details: error instanceof Error ? error.message : String(error) }, 
        { status: 500 }
      )
    );
  }
} 