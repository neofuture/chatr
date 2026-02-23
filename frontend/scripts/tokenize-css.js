#!/usr/bin/env node
/**
 * Replaces all hardcoded colour values in CSS files with CSS custom property references.
 * Run: node scripts/tokenize-css.js
 */
const fs = require('fs');
const path = require('path');

const replacements = [
  // rgba - sorted most-specific (longer decimal) first within each colour
  ['rgba(249, 115, 22, 0.95)', 'var(--overlay-orange-95)'],
  ['rgba(249, 115, 22, 0.8)', 'var(--overlay-orange-80)'],
  ['rgba(249, 115, 22, 0.6)', 'var(--overlay-orange-60)'],
  ['rgba(249, 115, 22, 0.5)', 'var(--overlay-orange-50)'],
  ['rgba(249, 115, 22, 0.4)', 'var(--overlay-orange-40)'],
  ['rgba(249, 115, 22, 0.3)', 'var(--overlay-orange-30)'],
  ['rgba(249, 115, 22, 0.2)', 'var(--overlay-orange-20)'],
  ['rgba(249, 115, 22, 0.1)', 'var(--overlay-orange-10)'],
  ['rgba(249, 115, 22, 1)', 'var(--color-orange-500)'],
  ['rgba(59, 130, 246, 0.95)', 'var(--overlay-blue-95)'],
  ['rgba(59, 130, 246, 0.08)', 'var(--overlay-blue-08)'],
  ['rgba(59, 130, 246, 0.06)', 'var(--overlay-blue-06)'],
  ['rgba(59, 130, 246, 0.05)', 'var(--overlay-blue-05)'],
  ['rgba(59, 130, 246, 0.15)', 'var(--overlay-blue-15)'],
  ['rgba(59, 130, 246, 0.12)', 'var(--overlay-blue-12)'],
  ['rgba(59, 130, 246, 0.8)', 'var(--overlay-blue-80)'],
  ['rgba(59, 130, 246, 0.6)', 'var(--overlay-blue-60)'],
  ['rgba(59, 130, 246, 0.5)', 'var(--overlay-blue-50)'],
  ['rgba(59, 130, 246, 0.4)', 'var(--overlay-blue-40)'],
  ['rgba(59, 130, 246, 0.3)', 'var(--overlay-blue-30)'],
  ['rgba(59, 130, 246, 0.2)', 'var(--overlay-blue-20)'],
  ['rgba(59, 130, 246, 0.1)', 'var(--overlay-blue-10)'],
  ['rgba(59, 130, 246, 1)', 'var(--color-blue-500)'],
  ['rgba(239, 68, 68, 0.95)', 'var(--overlay-red-95)'],
  ['rgba(239, 68, 68, 0.12)', 'var(--overlay-red-12)'],
  ['rgba(239, 68, 68, 0.5)', 'var(--overlay-red-50)'],
  ['rgba(239, 68, 68, 0.4)', 'var(--overlay-red-40)'],
  ['rgba(239, 68, 68, 0.3)', 'var(--overlay-red-30)'],
  ['rgba(239, 68, 68, 0.2)', 'var(--overlay-red-20)'],
  ['rgba(239, 68, 68, 0.1)', 'var(--overlay-red-10)'],
  ['rgba(239, 68, 68, 1)', 'var(--color-red-500)'],
  ['rgba(34, 197, 94, 0.95)', 'var(--overlay-green-95)'],
  ['rgba(34, 197, 94, 0.5)', 'var(--overlay-green-50)'],
  ['rgba(34, 197, 94, 0.4)', 'var(--overlay-green-40)'],
  ['rgba(34, 197, 94, 0.3)', 'var(--overlay-green-30)'],
  ['rgba(34, 197, 94, 0.2)', 'var(--overlay-green-20)'],
  ['rgba(34, 197, 94, 1)', 'var(--color-green-500)'],
  ['rgba(168, 85, 247, 0.95)', 'var(--overlay-purple-95)'],
  ['rgba(168, 85, 247, 0.5)', 'var(--overlay-purple-50)'],
  ['rgba(168, 85, 247, 0.4)', 'var(--overlay-purple-40)'],
  ['rgba(168, 85, 247, 0.3)', 'var(--overlay-purple-30)'],
  ['rgba(168, 85, 247, 0.2)', 'var(--overlay-purple-20)'],
  ['rgba(168, 85, 247, 1)', 'var(--color-purple-500)'],
  ['rgba(147, 51, 234, 0.8)', 'var(--overlay-purple-80)'],
  ['rgba(255, 255, 255, 0.95)', 'var(--overlay-white-95)'],
  ['rgba(255, 255, 255, 0.75)', 'var(--overlay-white-75)'],
  ['rgba(255, 255, 255, 0.45)', 'var(--overlay-white-45)'],
  ['rgba(255, 255, 255, 0.35)', 'var(--overlay-white-35)'],
  ['rgba(255, 255, 255, 0.14)', 'var(--overlay-white-14)'],
  ['rgba(255, 255, 255, 0.13)', 'var(--overlay-white-13)'],
  ['rgba(255, 255, 255, 0.12)', 'var(--overlay-white-12)'],
  ['rgba(255, 255, 255, 0.08)', 'var(--overlay-white-08)'],
  ['rgba(255, 255, 255, 0.07)', 'var(--overlay-white-07)'],
  ['rgba(255, 255, 255, 0.06)', 'var(--overlay-white-06)'],
  ['rgba(255, 255, 255, 0.05)', 'var(--overlay-white-05)'],
  ['rgba(255,255,255,0.04)', 'var(--overlay-white-04)'],
  ['rgba(255, 255, 255, 0.04)', 'var(--overlay-white-04)'],
  ['rgba(255, 255, 255, 0.9)', 'var(--overlay-white-90)'],
  ['rgba(255, 255, 255, 0.6)', 'var(--overlay-white-60)'],
  ['rgba(255, 255, 255, 0.5)', 'var(--overlay-white-50)'],
  ['rgba(255, 255, 255, 0.3)', 'var(--overlay-white-30)'],
  ['rgba(255, 255, 255, 0.2)', 'var(--overlay-white-20)'],
  ['rgba(255, 255, 255, 0.1)', 'var(--overlay-white-10)'],
  ['rgba(255, 255, 255, 1)', 'var(--color-white)'],
  ['rgba(0, 0, 0, 0.95)', 'var(--overlay-black-95)'],
  ['rgba(0, 0, 0, 0.85)', 'var(--overlay-black-85)'],
  ['rgba(0, 0, 0, 0.7)', 'var(--overlay-black-70)'],
  ['rgba(0, 0, 0, 0.65)', 'var(--overlay-black-65)'],
  ['rgba(0, 0, 0, 0.6)', 'var(--overlay-black-60)'],
  ['rgba(0, 0, 0, 0.55)', 'var(--overlay-black-55)'],
  ['rgba(0, 0, 0, 0.5)', 'var(--overlay-black-50)'],
  ['rgba(0, 0, 0, 0.45)', 'var(--overlay-black-45)'],
  ['rgba(0, 0, 0, 0.4)', 'var(--overlay-black-40)'],
  ['rgba(0, 0, 0, 0.35)', 'var(--overlay-black-35)'],
  ['rgba(0, 0, 0, 0.3)', 'var(--overlay-black-30)'],
  ['rgba(0, 0, 0, 0.2)', 'var(--overlay-black-20)'],
  ['rgba(0, 0, 0, 0.15)', 'var(--overlay-black-15)'],
  ['rgba(0, 0, 0, 0.12)', 'var(--overlay-black-12)'],
  ['rgba(0, 0, 0, 0.1)', 'var(--overlay-black-10)'],
  ['rgba(0, 0, 0, 0.06)', 'var(--overlay-black-06)'],
  ['rgba(0, 0, 0, 0.05)', 'var(--overlay-black-05)'],
  ['rgba(0, 0, 0, 0.03)', 'var(--overlay-black-03)'],
  ['rgba(15, 23, 42, 0.95)', 'var(--overlay-slate-900-95)'],
  ['rgba(15, 23, 42, 0.8)', 'var(--overlay-slate-900-80)'],
  ['rgba(15, 23, 42, 0.6)', 'var(--overlay-slate-900-60)'],
  ['rgba(15, 23, 42, 0.5)', 'var(--overlay-slate-900-50)'],
  ['rgba(15, 23, 42, 1)', 'var(--color-slate-900)'],
  ['rgba(30, 41, 59, 0.5)', 'var(--overlay-slate-800-50)'],
  ['rgba(30, 41, 59, 0.3)', 'var(--overlay-slate-800-30)'],
  ['rgba(30, 41, 59, 1)', 'var(--color-slate-800)'],
  ['rgba(248, 250, 252, 0.95)', 'var(--overlay-slate-50-95)'],
  ['rgba(248, 250, 252, 0.85)', 'var(--overlay-slate-50-85)'],
  ['rgba(248, 250, 252, 0.8)', 'var(--overlay-slate-50-80)'],
  ['rgba(248, 250, 252, 0.6)', 'var(--overlay-slate-50-60)'],
  ['rgba(248, 250, 252, 1)', 'var(--color-slate-50)'],
  ['rgba(241, 245, 249, 0.95)', 'var(--overlay-slate-100-95)'],
  ['rgba(241, 245, 249, 0.6)', 'var(--overlay-slate-100-60)'],
  ['rgba(237, 237, 237, 0.9)', 'var(--bg-input)'],
  ['rgba(147, 197, 253, 0.18)', 'var(--overlay-blue300-18)'],
  // hex colours
  ['#f97316', 'var(--color-orange-500)'],
  ['#ea580c', 'var(--color-orange-600)'],
  ['#fb923c', 'var(--color-orange-400)'],
  ['#fdba74', 'var(--color-orange-400)'],
  ['#3b82f6', 'var(--color-blue-500)'],
  ['#2563eb', 'var(--color-blue-600)'],
  ['#60a5fa', 'var(--color-blue-400)'],
  ['#93c5fd', 'var(--color-blue-300)'],
  ['#bfdbfe', 'var(--color-blue-200)'],
  ['#dbeafe', 'var(--color-blue-100)'],
  ['#e0f2fe', 'var(--color-sky-100)'],
  ['#ef4444', 'var(--color-red-500)'],
  ['#dc2626', 'var(--color-red-600)'],
  ['#fca5a5', 'var(--color-red-300)'],
  ['#f87171', 'var(--color-red-400)'],
  ['#fecaca', 'var(--color-red-300)'],
  ['#10b981', 'var(--color-green-700)'],
  ['#4ade80', 'var(--color-green-400)'],
  ['#22c55e', 'var(--color-green-500)'],
  ['#16a34a', 'var(--color-green-600)'],
  ['#a855f7', 'var(--color-purple-500)'],
  ['#9333ea', 'var(--color-purple-600)'],
  ['#f59e0b', 'var(--color-amber-500)'],
  ['#94a3b8', 'var(--color-slate-400)'],
  ['#cbd5e1', 'var(--color-slate-300)'],
  ['#e2e8f0', 'var(--color-slate-200)'],
  ['#f1f5f9', 'var(--color-slate-100)'],
  ['#f8fafc', 'var(--color-slate-50)'],
  ['#0f172a', 'var(--color-slate-900)'],
  ['#1e293b', 'var(--color-slate-800)'],
  ['#334155', 'var(--color-slate-700)'],
  ['#475569', 'var(--color-slate-600)'],
  ['#64748b', 'var(--color-slate-500)'],
  ['#e5e7eb', 'var(--color-grey-200)'],
  ['#d1d5db', 'var(--color-grey-300)'],
  ['#374151', 'var(--color-grey-800)'],
  ['#1f2937', 'var(--color-grey-900)'],
  ['#ffffff', 'var(--color-white)'],
  ['#fff', 'var(--color-white)'],
];

const cssFiles = [
  'src/app/globals.css',
  'src/components/form-controls/Button/Button.module.css',
  'src/components/form-controls/DualRangeSlider/DualRangeSlider.css',
  'src/components/form-controls/SimpleDualRangeSlider/SimpleDualRangeSlider.css',
  'src/components/form-controls/Input/Input.module.css',
  'src/components/form-controls/RangeSlider/RangeSlider.module.css',
  'src/components/form-controls/Textarea/Textarea.module.css',
  'src/components/form-controls/DualRangeSlider/DualRangeSlider.module.css',
  'src/components/form-controls/SimpleDualRangeSlider/SimpleDualRangeSlider.module.css',
  'src/components/dialogs/BottomSheet/BottomSheet.module.css',
  'src/components/dialogs/ConfirmationDialog/ConfirmationDialog.module.css',
  'src/components/messaging/ChatView/ChatView.module.css',
  'src/components/panels/AuthPanel/AuthPanel.module.css',
  'src/components/panels/PanelContainer/PanelContainer.module.css',
  'src/components/WebSocketStatusBadge/WebSocketStatusBadge.module.css',
  'src/components/image-manip/CoverImageCropper/CoverImageCropper.module.css',
  'src/components/image-manip/ProfileImageCropper/ProfileImageCropper.module.css',
  'src/components/image-manip/CoverImageUploader/CoverImageUploader.module.css',
  'src/components/image-manip/ProfileImageUploader/ProfileImageUploader.module.css',
  'src/components/forms/LoginForm/LoginForm.module.css',
  'src/components/forms/LoginVerification/LoginVerification.module.css',
  'src/components/forms/ForgotPassword/ForgotPassword.module.css',
  'src/components/forms/EmailVerification/EmailVerification.module.css',
];

const base = path.join(__dirname, '..');
let totalReplaced = 0;

for (const rel of cssFiles) {
  const filePath = path.join(base, rel);
  if (!fs.existsSync(filePath)) { console.log(`SKIP (not found): ${rel}`); continue; }
  let content = fs.readFileSync(filePath, 'utf8');
  let count = 0;
  for (const [from, to] of replacements) {
    while (content.includes(from)) {
      content = content.replace(from, to);
      count++;
    }
  }
  fs.writeFileSync(filePath, content, 'utf8');
  if (count > 0) console.log(`${rel}: ${count} replacement(s)`);
  totalReplaced += count;
}

console.log(`\nTotal replacements: ${totalReplaced}`);

// Report any remaining raw colours across all files
let remaining = [];
for (const rel of cssFiles) {
  const filePath = path.join(base, rel);
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf8');
  // Find raw hex or rgba NOT inside a var() call
  const matches = [...content.matchAll(/(#[0-9a-fA-F]{3,8}(?![0-9a-fA-F\w])|rgba?\([^)]+\))/g)]
    .map(m => m[0])
    .filter(m => !m.startsWith('var('));
  if (matches.length) remaining.push({ file: rel, matches: [...new Set(matches)] });
}

if (remaining.length) {
  console.log('\nRemaining raw colours (likely dynamic/intentional):');
  for (const { file, matches } of remaining) {
    console.log(`  ${file}:`);
    for (const m of matches) console.log(`    ${m}`);
  }
} else {
  console.log('\nAll CSS files fully tokenised!');
}

