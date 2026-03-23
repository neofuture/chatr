import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import CodeBlock from './CodeBlock';

const meta: Meta<typeof CodeBlock> = {
  title: 'Messaging/CodeBlock',
  component: CodeBlock,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Syntax-highlighted code block with copy-to-clipboard button and language label.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CodeBlock>;

export const JavaScript: Story = {
  args: {
    lang: 'javascript',
    content: `function greet(name) {
  console.log(\`Hello, \${name}!\`);
}

greet('world');`,
  },
};

export const Python: Story = {
  args: {
    lang: 'python',
    content: `def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

for num in fibonacci(10):
    print(num)`,
  },
};

export const TypeScript: Story = {
  args: {
    lang: 'typescript',
    content: `interface User {
  id: string;
  name: string;
  email: string;
}

const getUser = async (id: string): Promise<User> => {
  const res = await fetch(\`/api/users/\${id}\`);
  return res.json();
};`,
  },
};

export const JSON: Story = {
  args: {
    lang: 'json',
    content: `{
  "name": "chatr",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "next": "^14.0.0"
  }
}`,
  },
};

export const UnknownLanguage: Story = {
  args: {
    lang: '',
    content: `some raw text
that has no specific
language highlighting`,
  },
};
