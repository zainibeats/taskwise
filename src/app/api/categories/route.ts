import { NextRequest, NextResponse } from 'next/server';
import { categoryService } from '@/lib/task-service';

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
export async function GET() {
  try {
    const categories = await categoryService.getAllCategories();
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
    const categoryData = await request.json();
    
    // Validate required fields
    if (!categoryData.name || !categoryData.icon) {
      return setCorsHeaders(
        NextResponse.json({ error: 'Name and icon are required' }, { status: 400 })
      );
    }
    
    const category = await categoryService.saveCategory(categoryData);
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
    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    
    if (!name) {
      return setCorsHeaders(
        NextResponse.json({ error: 'Category name is required' }, { status: 400 })
      );
    }
    
    const success = await categoryService.deleteCategory(name);
    if (!success) {
      return setCorsHeaders(
        NextResponse.json({ error: 'Category not found' }, { status: 404 })
      );
    }
    
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