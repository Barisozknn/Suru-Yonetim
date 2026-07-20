const fs = require('fs');
const path = require('path');

function walk(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('useLiveQuery') && !fullPath.includes('db.ts') && !fullPath.includes('useLiveFarmQuery.ts')) {
        const depth = fullPath.split(path.sep).length - 2; // depth relative to src
        // Let's just figure out the relative path to src/hooks/useLiveFarmQuery
        const relDir = path.relative(path.dirname(fullPath), path.join(process.cwd(), 'src/hooks'));
        const importPath = relDir.replace(/\\/g, '/') + '/useLiveFarmQuery';
        
        // Handle double quotes or single quotes for imports
        content = content.replace(/import \{.*?useLiveQuery.*?\} from ['"]dexie-react-hooks['"];/, `import { useLiveFarmQuery } from '${importPath}';`);
        
        // Use useLiveFarmQuery instead
        content = content.replace(/useLiveQuery/g, 'useLiveFarmQuery');
        fs.writeFileSync(fullPath, content);
      }
    }
  });
}

walk('src/components');
walk('src/pages');
