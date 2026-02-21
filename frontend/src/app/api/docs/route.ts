import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DOCS_PATH = path.join(process.cwd(), '..', 'Documentation');

// Helper to read directory structure recursively
function readDirStructure(dirPath: string, basePath: string = ''): any {
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  const structure: any = {
    files: [],
    folders: []
  };

  items.forEach(item => {
    const itemPath = path.join(basePath, item.name);

    if (item.isDirectory()) {
      structure.folders.push({
        name: item.name,
        path: itemPath,
        children: readDirStructure(path.join(dirPath, item.name), itemPath)
      });
    } else if (item.name.endsWith('.md')) {
      structure.files.push({
        name: item.name,
        path: itemPath
      });
    }
  });

  // Sort files and folders alphabetically
  structure.files.sort((a: any, b: any) => a.name.localeCompare(b.name));
  structure.folders.sort((a: any, b: any) => a.name.localeCompare(b.name));

  return structure;
}

// GET /api/docs - Get documentation structure
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('file');

    // Get product name from backend env or use default
    const productName = process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Chatr';

    // If file parameter is provided, return file content
    if (filePath) {
      const fullPath = path.join(DOCS_PATH, filePath);

      // Security: Prevent directory traversal
      if (!fullPath.startsWith(DOCS_PATH)) {
        return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
      }

      if (!fs.existsSync(fullPath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      let content = fs.readFileSync(fullPath, 'utf-8');

      // Replace product name placeholders with actual product name
      // Replace both "Chatr" and "Chatrr" with the product name
      content = content.replace(/Chatrr/g, productName);
      content = content.replace(/Chatr/g, productName);

      return NextResponse.json({ content, path: filePath });
    }

    // Otherwise, return directory structure
    const structure = readDirStructure(DOCS_PATH);
    return NextResponse.json(structure);
  } catch (error) {
    console.error('Error reading documentation:', error);
    return NextResponse.json({ error: 'Failed to read documentation' }, { status: 500 });
  }
}

