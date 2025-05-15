import { NextRequest, NextResponse } from 'next/server';
import { categoryService } from '@/lib/task-service';
import { getCurrentSession } from '@/lib/session';

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

// GET /api/categories - Get all categories
export async function GET(request: NextRequest) {
  try {
    // Extract cookies from request
    const cookie = request.headers.get('cookie') || '';
    
    // Get current user
    const session = await getCurrentSession();
    if (!session || !session.user) {
      return setCorsHeaders(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      );
    }
    
    const userId = session.user.id;
    // Get categories for this user (including system defaults) and pass cookies
    const categories = await categoryService.getAllCategories(userId, { cookie });
    return setCorsHeaders(NextResponse.json(categories));
  } catch (error) {
    console.error('Error fetching categories:', error);
    return setCorsHeaders(
      NextResponse.json(
        { error: 'Failed to fetch categories', details: error instanceof Error ? error.message : String(error) }, 
        { status: 500 }
      )
    );
  }
}

// POST /api/categories - Create or update a category
export async function POST(request: NextRequest) {
  try {
    // Extract cookies from request
    const cookie = request.headers.get('cookie') || '';
    
    // Get current user
    const session = await getCurrentSession();
    if (!session || !session.user) {
      return setCorsHeaders(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      );
    }
    
    const userId = session.user.id;
    const categoryData = await request.json();
    
    // Validate required fields
    if (!categoryData.name || !categoryData.icon) {
      return setCorsHeaders(
        NextResponse.json({ error: 'Name and icon are required' }, { status: 400 })
      );
    }
    
    // Add user_id to the category data
    const categoryWithUser = {
      ...categoryData,
      user_id: userId
    };
    
    // Pass the cookies to the service
    const category = await categoryService.saveCategory(categoryWithUser, { cookie });
    return setCorsHeaders(NextResponse.json(category, { status: 201 }));
  } catch (error) {
    console.error('Error saving category:', error);
    return setCorsHeaders(
      NextResponse.json(
        { error: 'Failed to save category', details: error instanceof Error ? error.message : String(error) }, 
        { status: 500 }
      )
    );
  }
}

// DELETE /api/categories?name=categoryName - Delete a category
export async function DELETE(request: NextRequest) {
  try {
    // Get current user
    const session = await getCurrentSession();
    if (!session || !session.user) {
      return setCorsHeaders(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      );
    }
    
    const userId = session.user.id;
    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    console.log('Delete category request received for name:', name);
    
    if (!name) {
      console.log('Category name is missing in request');
      return setCorsHeaders(
        NextResponse.json({ error: 'Category name is required' }, { status: 400 })
      );
    }
    
    console.log(`Attempting to delete category "${name}" for user ${userId}`);
    const success = await categoryService.deleteCategory(name, userId);
    console.log(`Delete operation result for "${name}":`, success);
    
    if (!success) {
      console.log(`Category "${name}" not found for deletion`);
      return setCorsHeaders(
        NextResponse.json({ error: 'Category not found' }, { status: 404 })
      );
    }
    
    console.log(`Category "${name}" deleted successfully`);
    return setCorsHeaders(NextResponse.json({ success: true }));
  } catch (error) {
    console.error('Error deleting category:', error);
    return setCorsHeaders(
      NextResponse.json(
        { error: 'Failed to delete category', details: error instanceof Error ? error.message : String(error) }, 
        { status: 500 }
      )
    );
  }
} 