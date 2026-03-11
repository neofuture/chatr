import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaneSearchBox from './PaneSearchBox';

describe('PaneSearchBox', () => {
  const baseProps = {
    value: '',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default placeholder "Search…"', () => {
    render(<PaneSearchBox {...baseProps} />);
    expect(screen.getByPlaceholderText('Search…')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(<PaneSearchBox {...baseProps} placeholder="Find friends" />);
    expect(screen.getByPlaceholderText('Find friends')).toBeInTheDocument();
  });

  it('shows search icon', () => {
    const { container } = render(<PaneSearchBox {...baseProps} />);
    const icon = container.querySelector('.fas.fa-search');
    expect(icon).toBeInTheDocument();
  });

  it('calls onChange when typing', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<PaneSearchBox {...baseProps} onChange={onChange} />);

    await user.type(screen.getByPlaceholderText('Search…'), 'hello');
    expect(onChange).toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining(''));
  });

  it('does not show clear button when value is empty', () => {
    render(<PaneSearchBox {...baseProps} value="" />);
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
  });

  it('shows clear button when value is non-empty', () => {
    render(<PaneSearchBox {...baseProps} value="test" />);
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('calls onClear when clear button is clicked', async () => {
    const onClear = jest.fn();
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<PaneSearchBox value="hello" onChange={onChange} onClear={onClear} />);

    await user.click(screen.getByLabelText('Clear search'));
    expect(onChange).toHaveBeenCalledWith('');
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('calls onChange with empty string on clear when no onClear provided', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<PaneSearchBox value="hello" onChange={onChange} />);

    await user.click(screen.getByLabelText('Clear search'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('input has correct aria-label matching placeholder', () => {
    render(<PaneSearchBox {...baseProps} placeholder="Find groups" />);
    expect(screen.getByLabelText('Find groups')).toBeInTheDocument();
  });

  it('input has default aria-label "Search…"', () => {
    render(<PaneSearchBox {...baseProps} />);
    expect(screen.getByLabelText('Search…')).toBeInTheDocument();
  });

  it('renders as a text input', () => {
    render(<PaneSearchBox {...baseProps} />);
    const input = screen.getByPlaceholderText('Search…');
    expect(input).toHaveAttribute('type', 'text');
  });
});
