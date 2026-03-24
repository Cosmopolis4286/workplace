#!/usr/bin/env node

const { execSync } = require('child_process');

try {
  // Run jest coverage and capture output
  const output = execSync('npx jest --coverage --watchAll=false --silent', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  // Parse the output to find the coverage percentage
  const lines = output.split('\n');
  const coverageLine = lines.find(line => line.trim().startsWith('All files') && line.includes('|'));
  
  if (coverageLine) {
    // Extract percentage from line like "All files                             |    6.71 |     4.01 |    4.06 |    6.79 |"
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
  console.log('0');
  process.exit(1);
}
