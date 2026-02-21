// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock framer-motion
jest.mock('framer-motion', () => {
  const React = require('react');
  return {
    motion: {
      div: (props) => React.createElement('div', props),
      h1: (props) => React.createElement('h1', props),
      button: (props) => React.createElement('button', props),
      i: (props) => React.createElement('i', props),
      span: (props) => React.createElement('span', props),
      img: (props) => React.createElement('img', props),
    },
    AnimatePresence: ({ children }) => children,
  };
});
