#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to fix imports in a file
function fixImportsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Replace @/backend imports with relative imports
  const fixedContent = content.replace(
    /import\s+([^'"]+)\s+from\s+["']@\/backend\/([^"']+)["']/g,
    (match, importPart, backendPath) => {
      // Calculate relative path from current file to the backend file
      const currentDir = path.dirname(filePath);
      const targetPath = path.join('/home/user/rork-app/backend', backendPath);
      const relativePath = path.relative(currentDir, targetPath);
      
      // Ensure the path starts with ./ or ../
      const normalizedPath = relativePath.startsWith('.') ? relativePath : './' + relativePath;
      
      return `import ${importPart} from "${normalizedPath}"`;
    }
  );
  
  if (content !== fixedContent) {
    fs.writeFileSync(filePath, fixedContent);
    console.log(`Fixed imports in: ${filePath}`);
    return true;
  }
  return false;
}

// Function to recursively find all .ts files in backend directory
function findTsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findTsFiles(fullPath));
    } else if (item.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Main execution
const backendDir = '/home/user/rork-app/backend';
const tsFiles = findTsFiles(backendDir);

let fixedCount = 0;
for (const file of tsFiles) {
  if (fixImportsInFile(file)) {
    fixedCount++;
  }
}

console.log(`\nFixed imports in ${fixedCount} files.`);