const fs = require('fs');
const content = fs.readFileSync('apps/web/src/app/(dashboard)/marketplaces/page.tsx', 'utf8');
const lines = content.split('\n');

let parens = 0, braces = 0;
let inString = false, stringChar = null, inComment = false;

for (let i = 577; i < lines.length; i++) {
  const line = lines[i];
  let lineParens = 0, lineBraces = 0;

  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    const next = line[j+1];

    if (inComment) {
      if (c === '*' && next === '/') { inComment = false; j++; }
      continue;
    }
    if (inString) {
      if (c === '\\') { j++; continue; }
      if (c === stringChar) { inString = false; stringChar = null; }
      continue;
    }

    if (c === '/' && next === '/') break;
    if (c === '/' && next === '*') { inComment = true; j++; continue; }
    if (c === "'" || c === '"' || c === '`') { inString = true; stringChar = c; continue; }

    if (c === '(') { parens++; lineParens++; }
    if (c === ')') { parens--; lineParens--; }
    if (c === '{') { braces++; lineBraces++; }
    if (c === '}') { braces--; lineBraces--; }
  }

  if (lineParens !== 0 || lineBraces !== 0) {
    console.log('L' + (i+1) + ' parens=' + parens + '(d=' + lineParens + ') braces=' + braces + '(d=' + lineBraces + '): ' + line.trim().substring(0,70));
  }
}
console.log('Final: parens=' + parens + ' braces=' + braces);
