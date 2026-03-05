# MermaidDiagram

**File:** `src/components/MermaidDiagram/MermaidDiagram.tsx`

Renders a [Mermaid](https://mermaid.js.org/) diagram from a chart definition string. Used in the `/docs` route to display architecture, sequence, and ER diagrams.

> **SSR note:** This component must be loaded with `next/dynamic` and `{ ssr: false }` to prevent Mermaid from being bundled for the server.

## Props

```typescript
interface Props {
  chart: string;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `chart` | `string` | A valid Mermaid diagram definition |

## Usage

```tsx
import dynamic from 'next/dynamic';
const MermaidDiagram = dynamic(() => import('@/components/MermaidDiagram/MermaidDiagram'), { ssr: false });

<MermaidDiagram chart={`
  flowchart TD
    A[Client] --> B[WebSocket Server]
    B --> C[Database]
`} />
```

## Supported Diagram Types

All Mermaid diagram types are supported, including:
- `flowchart` / `graph`
- `sequenceDiagram`
- `erDiagram`
- `classDiagram`
- `stateDiagram`
- `gantt`

## Storybook

`Utility/MermaidDiagram` — Flowchart, SequenceDiagram, ERDiagram stories.

