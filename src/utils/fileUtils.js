import fs from 'fs/promises';

export async function readLinesFromFile(filePath) {
  const data = await fs.readFile(filePath, 'utf-8');
  return data.split('\n').map(line => line.trim()).filter(line => line.length > 0);
}