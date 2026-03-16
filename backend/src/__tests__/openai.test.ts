jest.mock('openai', () => {
  const mockCreate = jest.fn().mockResolvedValue({
    choices: [{ message: { content: 'Hello from Luna!' } }],
  });
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    })),
    _mockCreate: mockCreate,
  };
});

describe('OpenAI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('Constants', () => {
    it('should export model name and max tokens', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const { OPENAI_MODEL, OPENAI_MAX_TOKENS } = require('../services/openai');
      expect(OPENAI_MODEL).toBe('gpt-4o-mini');
      expect(OPENAI_MAX_TOKENS).toBe(4096);
    });
  });

  describe('generateAIReply', () => {
    it('should call OpenAI with correct parameters', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const { generateAIReply } = require('../services/openai');
      const OpenAI = require('openai').default;

      const reply = await generateAIReply(
        [{ role: 'user', content: 'Hi' }],
        'How are you?'
      );

      expect(reply).toBe('Hello from Luna!');
      const instance = OpenAI.mock.results[0]?.value;
      expect(instance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          max_tokens: 4096,
          temperature: 0.8,
        })
      );
    });

    it('should include system prompt and history in messages', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const { generateAIReply } = require('../services/openai');
      const OpenAI = require('openai').default;

      await generateAIReply(
        [{ role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Hi!' }],
        'Tell me a joke'
      );

      const instance = OpenAI.mock.results[0]?.value;
      const call = instance.chat.completions.create.mock.calls[0][0];
      expect(call.messages[0].role).toBe('system');
      expect(call.messages[0].content).toContain('Luna');
      expect(call.messages).toHaveLength(4); // system + 2 history + 1 user
      expect(call.messages[3].content).toBe('Tell me a joke');
    });

    it('should limit history to last 10 messages', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const { generateAIReply } = require('../services/openai');
      const OpenAI = require('openai').default;

      const longHistory = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));

      await generateAIReply(longHistory, 'Latest');

      const instance = OpenAI.mock.results[0]?.value;
      const call = instance.chat.completions.create.mock.calls[0][0];
      // system + 10 history + 1 user = 12
      expect(call.messages).toHaveLength(12);
    });

    it('should return fallback when response is empty', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const OpenAI = require('openai').default;
      const instance = new OpenAI();
      instance.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      });

      jest.resetModules();
      jest.doMock('openai', () => ({
        __esModule: true,
        default: jest.fn(() => instance),
      }));

      const { generateAIReply } = require('../services/openai');
      const reply = await generateAIReply([], 'Hello');
      expect(reply).toContain("couldn't generate");
    });

    it('should throw when OPENAI_API_KEY is not set', async () => {
      delete process.env.OPENAI_API_KEY;
      jest.resetModules();

      jest.doMock('openai', () => ({
        __esModule: true,
        default: jest.fn(),
      }));

      const { generateAIReply } = require('../services/openai');
      await expect(generateAIReply([], 'Hi')).rejects.toThrow('OPENAI_API_KEY');
    });
  });

  describe('generateConversationSummary', () => {
    it('should call OpenAI with summary prompt and return result', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'Planning a trip' } }],
      });
      jest.doMock('openai', () => ({
        __esModule: true,
        default: jest.fn(() => ({
          chat: { completions: { create: mockCreate } },
        })),
      }));

      const { generateConversationSummary } = require('../services/openai');
      const summary = await generateConversationSummary([
        { sender: 'Alice', content: 'Want to go to the beach?' },
        { sender: 'Bob', content: 'Sounds great!' },
      ]);

      expect(summary).toBe('Planning a trip');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          max_tokens: 100,
          temperature: 0.3,
        })
      );
    });

    it('should include transcript in the user message', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'Chatting' } }],
      });
      jest.doMock('openai', () => ({
        __esModule: true,
        default: jest.fn(() => ({
          chat: { completions: { create: mockCreate } },
        })),
      }));

      const { generateConversationSummary } = require('../services/openai');
      await generateConversationSummary([
        { sender: 'Alice', content: 'Hello' },
        { sender: 'Bob', content: 'Hi there' },
      ]);

      const call = mockCreate.mock.calls[0][0];
      expect(call.messages[1].content).toContain('Alice: Hello');
      expect(call.messages[1].content).toContain('Bob: Hi there');
    });

    it('should return empty string on API error', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      jest.doMock('openai', () => ({
        __esModule: true,
        default: jest.fn(() => ({
          chat: { completions: { create: jest.fn().mockRejectedValue(new Error('API error')) } },
        })),
      }));

      const { generateConversationSummary } = require('../services/openai');
      const summary = await generateConversationSummary([
        { sender: 'Alice', content: 'Hello' },
      ]);
      expect(summary).toBe('');
    });

    it('should return empty string when response content is null', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      jest.doMock('openai', () => ({
        __esModule: true,
        default: jest.fn(() => ({
          chat: { completions: { create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: null } }],
          }) } },
        })),
      }));

      const { generateConversationSummary } = require('../services/openai');
      const summary = await generateConversationSummary([
        { sender: 'Alice', content: 'Hello' },
      ]);
      expect(summary).toBe('');
    });
  });
});
