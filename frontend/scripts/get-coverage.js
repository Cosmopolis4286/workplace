#!/usr/bin/env node

import { execSync } from 'child_process';

try {
  // Run vitest coverage and capture text output
  const output = execSync('npx vitest run --coverage', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  // Parse the text output to find the coverage percentage
  const lines = output.split('\n');
  const coverageLine = lines.find(line => line.trim().startsWith('All files') && line.includes('|'));
  
  if (coverageLine) {
    // Extract percentage from line like "All files          |       0 |        0 |       0 |      0"
    const parts = coverageLine.split('|').map(part => part.trim());
    // The coverage percentage is the second number after "All files"
    if (parts.length >= 2 && parts[1]) {
      const coverage = parts[1];
      console.log(coverage);
      process.exit(0);
    }
  }
  
  console.log('0');
  process.exit(1);
} catch (error) {
  console.error('Error:', error.message);
  console.log('0');
  process.exit(1);
}
