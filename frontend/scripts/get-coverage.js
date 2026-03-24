#!/usr/bin/env node

const { execSync } = require('child_process');

try {
  // Run vitest coverage and capture output
  const output = execSync('npx vitest run --coverage --reporter=json', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  // Parse the JSON output
  const coverageData = JSON.parse(output);
  
  // Extract the line coverage percentage
  if (coverageData && coverageData.total && coverageData.total.lines) {
    const coverage = coverageData.total.lines.pct;
    console.log(coverage);
    process.exit(0);
  }
  
  console.log('0');
  process.exit(1);
} catch (error) {
  console.log('0');
  process.exit(1);
}
