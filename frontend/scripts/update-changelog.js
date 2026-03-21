#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

const changelogPath = path.join(__dirname, '..', '..', 'Documentation', 'VERSION.md');
const versionFile = path.join(__dirname, '..', 'src', 'version.ts');

function git(cmd) {
  return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim();
}

function loadEnvKey(key) {
  const envFiles = [
    path.join(__dirname, '..', '..', 'backend', '.env'),
    path.join(__dirname, '..', '..', '.env'),
  ];
  for (const envFile of envFiles) {
    try {
      const content = fs.readFileSync(envFile, 'utf8');
      const match = content.match(new RegExp(`^${key}=(.+)$`, 'm'));
      if (match) return match[1].trim().replace(/^['"]|['"]$/g, '');
    } catch {}
  }
  return process.env[key] || '';
}

function callOpenAI(apiKey, commitMessage, diffSummary) {
  return new Promise((resolve) => {
    const prompt = [
      'You are Luna, Chatr\'s AI assistant, writing a concise changelog entry.',
      'Given the commit message and code diff below, produce a short bullet-point summary of what changed.',
      'Rules:',
      '- Use 1-4 bullet points, each starting with "- "',
      '- Each bullet should be a single clear sentence, max 100 chars',
      '- Focus on user-facing or developer-facing impact, not file names',
      '- Use present tense ("Add", "Fix", "Update", "Remove")',
      '- Do NOT include the version number, date, or commit hash',
      '- Do NOT wrap in markdown headers or code blocks',
      '- If the diff is too large or unclear, summarise from the commit message alone',
    ].join('\n');

    const userContent = `Commit message: ${commitMessage}\n\nDiff (truncated):\n${diffSummary}`;

    const body = JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      timeout: 15000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.message?.content?.trim();
          if (content) {
            resolve(content);
          } else {
            console.error('⚠️  Luna returned empty response');
            resolve(null);
          }
        } catch (e) {
          console.error('⚠️  Failed to parse Luna response:', e.message);
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      console.error('⚠️  Luna API error:', e.message);
      resolve(null);
    });

    req.on('timeout', () => {
      console.error('⚠️  Luna API timed out');
      req.destroy();
      resolve(null);
    });

    req.write(body);
    req.end();
  });
}

async function main() {
  try {
    const versionContent = fs.readFileSync(versionFile, 'utf8');
    const versionMatch = versionContent.match(/export const version = '([^']+)'/);
    if (!versionMatch) {
      console.error('Could not parse version');
      process.exit(1);
    }
    const version = versionMatch[1];

    const hash = git('rev-parse --short HEAD');
    const message = git('log -1 --format=%s');
    const fullMessage = git('log -1 --format=%B');
    const date = new Date().toISOString().slice(0, 10);

    if (message.startsWith('chore: bump version')) {
      process.exit(0);
    }

    const changelogDir = path.dirname(changelogPath);
    if (!fs.existsSync(changelogDir)) {
      fs.mkdirSync(changelogDir, { recursive: true });
    }

    if (!fs.existsSync(changelogPath)) {
      const header = [
        '# Changelog',
        '',
        'All notable changes to Chatr are documented here. Version entries are auto-generated on each commit by Luna AI.',
        '',
        '---',
        '',
      ].join('\n');
      fs.writeFileSync(changelogPath, header, 'utf8');
    }

    const changelog = fs.readFileSync(changelogPath, 'utf8');

    if (changelog.includes(`## v${version} `)) {
      console.log(`Changelog already has entry for v${version}, skipping`);
      process.exit(0);
    }

    // Extract body bullets from the full commit message (lines starting with "- ")
    const bodyLines = fullMessage.split('\n').slice(1); // skip subject line
    const bullets = bodyLines
      .map(l => l.trimEnd())
      .filter(l => /^- /.test(l) || /^  /.test(l)); // bullet points + continuation lines

    let description = null;

    if (bullets.length >= 2) {
      // Commit body already has detailed bullet points — use them directly
      description = bullets.join('\n');
      console.log(`📋 Using ${bullets.length} bullet points from commit body`);
    } else {
      // Sparse commit body — ask Luna to generate a summary
      const apiKey = loadEnvKey('OPENAI_API_KEY');

      if (apiKey) {
        console.log('🤖 Asking Luna to summarise this commit...');

        let diff = '';
        try {
          diff = git('diff HEAD~1 HEAD --stat');
          const fullDiff = git('diff HEAD~1 HEAD -- "*.ts" "*.tsx" "*.js" "*.css" "*.md"');
          diff += '\n\n' + (fullDiff.length > 4000 ? fullDiff.slice(0, 4000) + '\n... (truncated)' : fullDiff);
        } catch {
          diff = '(diff unavailable — initial commit or merge)';
        }

        description = await callOpenAI(apiKey, fullMessage, diff);
        if (description) {
          console.log('✨ Luna generated changelog entry');
        }
      } else {
        console.log('ℹ️  No OPENAI_API_KEY found — using commit message only');
      }
    }

    // Build the entry
    const lines = [
      `## v${version} — ${date}`,
      '',
      `**Commit:** \`${hash}\` — ${message}`,
      '',
    ];

    if (description) {
      lines.push(description, '');
    }

    lines.push('---', '');
    const entry = lines.join('\n');

    // Insert after the first "---" separator (end of header)
    const firstSeparator = changelog.indexOf('---');
    if (firstSeparator === -1) {
      fs.writeFileSync(changelogPath, changelog + '\n---\n\n' + entry, 'utf8');
    } else {
      const insertPoint = firstSeparator + 3;
      const before = changelog.slice(0, insertPoint);
      const after = changelog.slice(insertPoint);
      const trimmedAfter = after.replace(/^\n+/, '');
      fs.writeFileSync(changelogPath, before + '\n\n' + entry + '\n' + trimmedAfter, 'utf8');
    }

    console.log(`📝 Changelog updated: v${version} — ${message}`);
  } catch (err) {
    console.error('⚠️  Changelog update failed (non-fatal):', err.message);
  }
}

main();
