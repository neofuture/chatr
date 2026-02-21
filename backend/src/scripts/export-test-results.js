#!/usr/bin/env node

/**
 * Export Backend Jest test results to Markdown
 *
 * This script runs backend tests and generates a markdown report
 * in the Documentation/Testing/ directory.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../../Documentation/Testing/BACKEND_TEST_RESULTS.md');

console.log('🧪 Running backend tests with coverage...\n');

try {
  // Run tests and capture output
  const testOutput = execSync('npm test -- --coverage --passWithNoTests 2>&1', {
    cwd: __dirname,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    env: { ...process.env, CI: 'true' } // Set CI env to avoid watch mode
  });

  // Parse test output
  const lines = testOutput.split('\n');

  // Extract test results
  const passedTests = [];
  const failedTests = [];
  let totalTests = 0;
  let passedCount = 0;
  let failedCount = 0;
  let coverageData = {};

  let inCoverageSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect test file
    if (line.includes('PASS') || line.includes('FAIL')) {
      const match = line.match(/(PASS|FAIL)\s+(.+\.test\.(ts|js))/);
      if (match) {
        const testFile = match[2];
        if (match[1] === 'PASS') {
          passedTests.push(testFile);
          passedCount++;
        } else {
          failedTests.push(testFile);
          failedCount++;
        }
      }
    }

    // Detect coverage section
    if (line.includes('Coverage summary') || line.includes('All files')) {
      inCoverageSection = true;
    }

    // Parse coverage percentages
    if (inCoverageSection && line.includes('%')) {
      const coverageMatch = line.match(/All files\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/);
      if (coverageMatch) {
        coverageData = {
          statements: parseFloat(coverageMatch[1]),
          branches: parseFloat(coverageMatch[2]),
          functions: parseFloat(coverageMatch[3]),
          lines: parseFloat(coverageMatch[4])
        };
      }
    }

    // Count total tests
    const testCountMatch = line.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (testCountMatch) {
      passedCount = parseInt(testCountMatch[1]);
      totalTests = parseInt(testCountMatch[2]);
      failedCount = totalTests - passedCount;
    }
  }

  // Generate markdown
  let markdown = `# Backend Test Results\n\n`;
  markdown += `> **Auto-generated test results**\n`;
  markdown += `> Last updated: ${new Date().toISOString()}\n\n`;

  // Summary
  markdown += `## Summary\n\n`;
  markdown += `| Metric | Value |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| Total Tests | ${totalTests || 0} |\n`;
  markdown += `| Passed | ✅ ${passedCount || 0} |\n`;
  markdown += `| Failed | ${failedCount > 0 ? '❌ ' + failedCount : '✅ 0'} |\n`;
  markdown += `| Success Rate | ${totalTests > 0 ? ((passedCount / totalTests) * 100).toFixed(1) : 'N/A'}% |\n`;
  markdown += `\n`;

  // Coverage
  if (Object.keys(coverageData).length > 0) {
    markdown += `## Code Coverage\n\n`;
    markdown += `| Category | Coverage |\n`;
    markdown += `|----------|----------|\n`;
    markdown += `| Statements | ${coverageData.statements}% |\n`;
    markdown += `| Branches | ${coverageData.branches}% |\n`;
    markdown += `| Functions | ${coverageData.functions}% |\n`;
    markdown += `| Lines | ${coverageData.lines}% |\n`;
    markdown += `\n`;

    // Coverage badge
    const avgCoverage = (coverageData.statements + coverageData.branches + coverageData.functions + coverageData.lines) / 4;
    const coverageEmoji = avgCoverage >= 80 ? '🟢' : avgCoverage >= 60 ? '🟡' : '🔴';
    markdown += `**Overall Coverage**: ${coverageEmoji} ${avgCoverage.toFixed(1)}%\n\n`;
  }

  // Test Files
  if (passedTests.length > 0 || failedTests.length > 0) {
    markdown += `## Test Files\n\n`;

    if (passedTests.length > 0) {
      markdown += `### Passed (${passedTests.length})\n\n`;
      passedTests.forEach(file => {
        const fileName = path.basename(file);
        const component = fileName.replace('.test.ts', '').replace('.test.js', '');
        markdown += `- ✅ \`${component}\` - ${file}\n`;
      });
      markdown += `\n`;
    }

    if (failedTests.length > 0) {
      markdown += `### Failed (${failedTests.length})\n\n`;
      failedTests.forEach(file => {
        const fileName = path.basename(file);
        const component = fileName.replace('.test.ts', '').replace('.test.js', '');
        markdown += `- ❌ \`${component}\` - ${file}\n`;
      });
      markdown += `\n`;
    }
  } else {
    markdown += `## Test Files\n\n`;
    markdown += `No test files found or tests not run.\n\n`;
  }

  // API Endpoint Coverage
  markdown += `## API Endpoint Testing\n\n`;
  markdown += `### Endpoints\n\n`;
  markdown += `| Category | Endpoint | Tests | Status |\n`;
  markdown += `|----------|----------|-------|--------|\n`;
  markdown += `| Auth | POST /api/users/register | ⚠️ | Needs tests |\n`;
  markdown += `| Auth | POST /api/users/login | ⚠️ | Needs tests |\n`;
  markdown += `| Auth | POST /api/users/verify-email | ⚠️ | Needs tests |\n`;
  markdown += `| Auth | POST /api/users/verify-phone | ⚠️ | Needs tests |\n`;
  markdown += `| Users | GET /api/users/check-username | ⚠️ | Needs tests |\n`;
  markdown += `| Users | POST /api/users/suggest-username | ⚠️ | Needs tests |\n`;
  markdown += `| Users | POST /api/users/profile-image | ⚠️ | Needs tests |\n`;
  markdown += `| Users | POST /api/users/cover-image | ⚠️ | Needs tests |\n`;
  markdown += `| Messages | GET /api/messages | ⚠️ | Needs tests |\n`;
  markdown += `| Messages | POST /api/messages | ⚠️ | Needs tests |\n`;
  markdown += `\n`;

  // Testing Priorities
  markdown += `## Testing Priorities\n\n`;
  markdown += `### High Priority\n\n`;
  markdown += `- [ ] Authentication endpoints (register, login, verify)\n`;
  markdown += `- [ ] File upload endpoints (profile-image, cover-image)\n`;
  markdown += `- [ ] JWT middleware tests\n`;
  markdown += `- [ ] Database operations\n`;
  markdown += `\n`;

  markdown += `### Medium Priority\n\n`;
  markdown += `- [ ] Message endpoints\n`;
  markdown += `- [ ] Username validation\n`;
  markdown += `- [ ] Password reset flow\n`;
  markdown += `- [ ] Socket.io events\n`;
  markdown += `\n`;

  markdown += `### Low Priority\n\n`;
  markdown += `- [ ] Error handling\n`;
  markdown += `- [ ] Edge cases\n`;
  markdown += `- [ ] Performance tests\n`;
  markdown += `\n`;

  // Test Commands
  markdown += `## Running Tests\n\n`;
  markdown += `### All Tests\n`;
  markdown += `\`\`\`bash\n`;
  markdown += `cd backend\n`;
  markdown += `npm test\n`;
  markdown += `\`\`\`\n\n`;

  markdown += `### With Coverage\n`;
  markdown += `\`\`\`bash\n`;
  markdown += `npm test -- --coverage\n`;
  markdown += `\`\`\`\n\n`;

  markdown += `### Watch Mode\n`;
  markdown += `\`\`\`bash\n`;
  markdown += `npm test -- --watch\n`;
  markdown += `\`\`\`\n\n`;

  markdown += `### Specific Test File\n`;
  markdown += `\`\`\`bash\n`;
  markdown += `npm test routes.test\n`;
  markdown += `\`\`\`\n\n`;

  // Generate Report
  markdown += `## Regenerate This Report\n\n`;
  markdown += `\`\`\`bash\n`;
  markdown += `cd backend\n`;
  markdown += `npm run test:export\n`;
  markdown += `\`\`\`\n\n`;

  markdown += `---\n\n`;
  markdown += `**Note**: This is an auto-generated file. Do not edit manually.\n`;

  // Write to file
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf8');

  console.log('✅ Backend test results exported successfully!');
  console.log(`   Output: ${OUTPUT_FILE}`);
  console.log(`   Tests: ${passedCount || 0}/${totalTests || 0} ${totalTests > 0 ? 'passed' : ''}`);
  if (Object.keys(coverageData).length > 0) {
    const avgCoverage = (coverageData.statements + coverageData.branches + coverageData.functions + coverageData.lines) / 4;
    console.log(`   Coverage: ${avgCoverage.toFixed(1)}%`);
  }
  console.log('');

} catch (error) {
  console.error('❌ Error running tests or generating report:', error.message);
  process.exit(1);
}

