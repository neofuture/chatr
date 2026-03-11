import { render, screen } from '@testing-library/react';

jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
jest.mock('@/version', () => ({ version: '1.0.0-test' }));

global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({
  overview: { totalCommits: 100, totalLines: 5000, totalFiles: 50, testFiles: 10, currentBranch: 'main', latestHash: 'abc123', daysActive: 30, latestMessage: 'test' },
  health: { avgFileSize: 100, testRatio: 20, testCoverage: 50, commitsPerDay: 3, largestFile: null },
  loc: { typescript: 4000, css: 500, javascript: 500 },
  locByArea: { frontend: 3000, backend: 1500, widget: 500 },
  fileTypes: { tsx: 20, ts: 20, moduleCss: 5, plainCss: 2, js: 3 },
  testBreakdown: { frontend: 5, backend: 3, widget: 2 },
  architecture: { components: 10, hooks: 5, apiRoutes: 8, contexts: 4, pages: 6, dbModels: 5, dbMigrations: 3, socketHandlerLines: 200, middleware: 2, utils: 3 },
  contributors: [], heatmap: [{ date: '2026-01-01', count: 1, level: 1 }],
  dailyCommits: [], weeklyCommits: [], activityByHour: Array(24).fill(0), activityByDay: Array(7).fill(0),
  components: [], hooks: [], contexts: [], routes: [], middleware: [], socketEvents: [], endpoints: [],
  pages: [], prismaModels: [], prismaComplexity: { totalModels: 0, totalFields: 0, totalRelations: 0, avgFieldsPerModel: 0 },
  scripts: { root: [], frontend: [], backend: [] },
  dependencies: { root: { prod: 0, dev: 0 }, frontend: { prod: 0, dev: 0 }, backend: { prod: 0, dev: 0 }, total: 0 },
  largestFiles: [], todos: [], recentlyModified: [], recentCommits: [],
  commitStats: { avgMsgLength: 30, topWords: [] },
  env: { nodeVersion: '20', npmVersion: '10', gitVersion: '2.40', os: 'darwin', nextVersion: '16', prismaVersion: '5', typescriptVersion: '5' },
  codeChurn: [], commitStreaks: { current: 1, longest: 5 }, linesChanged: { added: 1000, deleted: 500, net: 500 },
  codeOwnership: [], branchCount: 2, tagCount: 0, bundleSizeBytes: 0,
  staleFiles: [],
  backendModules: [], backendTestedCount: 0, backendUntestedModules: [],
  frontendModules: [], frontendTestedCount: 0, frontendUntestedModules: [],
}) });

import DashboardPage from './page';

describe('DashboardPage', () => {
  it('should render without crashing', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/Project Dashboard/)).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));
    render(<DashboardPage />);
    expect(screen.getByText(/Loading metrics/)).toBeInTheDocument();
  });
});
