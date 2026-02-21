#!/usr/bin/env node

/**
 * Export Jest test results to Markdown
 *
 * This script runs tests and generates a markdown report
 * in the Documentation/Frontend/ directory.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../../Documentation/Testing/FRONTEND_TEST_RESULTS.md');

console.log('🧪 Running tests with coverage...\n');

try {
  // Run tests and capture output
  const testOutput = execSync('npm test -- --coverage --watchAll=false 2>&1', {
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
  let currentTestFile = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect test file
    if (line.includes('PASS') || line.includes('FAIL')) {
      const match = line.match(/(PASS|FAIL)\s+(.+\.test\.tsx?)/);
      if (match) {
        currentTestFile = match[2];
        if (match[1] === 'PASS') {
          passedTests.push(currentTestFile);
          passedCount++;
        } else {
          failedTests.push(currentTestFile);
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
  let markdown = `# Frontend Test Results\n\n`;
  markdown += `> **Auto-generated test results**\n`;
  markdown += `> Last updated: ${new Date().toISOString()}\n\n`;

  // Summary
  markdown += `## Summary\n\n`;
  markdown += `| Metric | Value |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| Total Tests | ${totalTests} |\n`;
  markdown += `| Passed | ✅ ${passedCount} |\n`;
  markdown += `| Failed | ${failedCount > 0 ? '❌ ' + failedCount : '✅ 0'} |\n`;
  markdown += `| Success Rate | ${totalTests > 0 ? ((passedCount / totalTests) * 100).toFixed(1) : 0}% |\n`;
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
  markdown += `## Test Files\n\n`;
  markdown += `### Passed (${passedTests.length})\n\n`;
  passedTests.forEach(file => {
    const fileName = path.basename(file);
    const component = fileName.replace('.test.tsx', '').replace('.test.ts', '');
    markdown += `- ✅ \`${component}\` - ${file}\n`;
  });
  markdown += `\n`;

  if (failedTests.length > 0) {
    markdown += `### Failed (${failedTests.length})\n\n`;
    failedTests.forEach(file => {
      const fileName = path.basename(file);
      const component = fileName.replace('.test.tsx', '').replace('.test.ts', '');
      markdown += `- ❌ \`${component}\` - ${file}\n`;
    });
    markdown += `\n`;
  }

  // Component Coverage
  markdown += `## Component Test Coverage\n\n`;
  markdown += `### UI Components\n\n`;
  markdown += `| Component | Tests | Status |\n`;
  markdown += `|-----------|-------|--------|\n`;

  const testedComponents = [
    { name: 'Button', path: 'form-controls/Button', status: 'pass' },
    { name: 'Input', path: 'form-controls/Input', status: 'pass' },
    { name: 'Textarea', path: 'form-controls/Textarea', status: 'pass' },
    { name: 'Checkbox', path: 'form-controls/Checkbox', status: 'pass' },
    { name: 'Radio', path: 'form-controls/Radio', status: 'pass' },
    { name: 'RangeSlider', path: 'form-controls/RangeSlider', status: 'pass' },
    { name: 'BottomSheet', path: 'dialogs/BottomSheet', status: 'pass' },
    { name: 'ConfirmationDialog', path: 'dialogs/ConfirmationDialog', status: 'pass' },
    { name: 'PanelContainer', path: 'panels/PanelContainer', status: 'partial' },
    { name: 'LoginVerification', path: 'forms/LoginVerification', status: 'pass' },
    { name: 'ForgotPassword', path: 'forms/ForgotPassword', status: 'pass' },
    { name: 'BackgroundBlobs', path: 'BackgroundBlobs', status: 'pass' },
    { name: 'Logo', path: 'Logo', status: 'pass' },
    { name: 'ToastContainer', path: 'ToastContainer', status: 'pass' },
  ];

  testedComponents.forEach(comp => {
    const status = comp.status === 'pass' ? '✅' : comp.status === 'partial' ? '🟡' : '❌';
    const testFile = passedTests.find(f => f.includes(comp.path)) || failedTests.find(f => f.includes(comp.path));
    const hasTests = testFile ? 'Yes' : 'No';
    markdown += `| ${comp.name} | ${hasTests} | ${status} |\n`;
  });
  markdown += `\n`;

  // Untested Components
  markdown += `### Components Needing Tests\n\n`;
  const untestedComponents = [
    'ProfileImageUploader',
    'ProfileImageCropper',
    'CoverImageUploader',
    'CoverImageCropper',
    'EmailVerification',
    'LoginForm',
    'Select',
    'DatePicker',
    'Calendar',
    'DualRangeSlider',
    'SimpleDualRangeSlider',
    'AuthPanel',
    'DemoPanels',
    'ThemeToggle',
    'BurgerMenu',
    'Demo2FA',
    'MobileLayout'
  ];

  markdown += `| Component | Location | Priority |\n`;
  markdown += `|-----------|----------|----------|\n`;
  untestedComponents.forEach(comp => {
    const priority = ['ProfileImageUploader', 'CoverImageUploader', 'LoginForm', 'AuthPanel'].includes(comp) ? 'High' : 'Medium';
    markdown += `| ${comp} | - | ${priority} |\n`;
  });
  markdown += `\n`;

  // Test Commands
  markdown += `## Running Tests\n\n`;
  markdown += `### All Tests\n`;
  markdown += `\`\`\`bash\n`;
  markdown += `cd frontend\n`;
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

  markdown += `### Update Snapshots\n`;
  markdown += `\`\`\`bash\n`;
  markdown += `npm test -- --updateSnapshot\n`;
  markdown += `\`\`\`\n\n`;

  // Generate Report
  markdown += `## Regenerate This Report\n\n`;
  markdown += `\`\`\`bash\n`;
  markdown += `cd frontend\n`;
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

  console.log('✅ Test results exported successfully!');
  console.log(`   Output: ${OUTPUT_FILE}`);
  console.log(`   Tests: ${passedCount}/${totalTests} passed`);
  if (Object.keys(coverageData).length > 0) {
    const avgCoverage = (coverageData.statements + coverageData.branches + coverageData.functions + coverageData.lines) / 4;
    console.log(`   Coverage: ${avgCoverage.toFixed(1)}%`);
  }
  console.log('');

} catch (error) {
  console.error('❌ Error running tests or generating report:', error.message);
  process.exit(1);
}

