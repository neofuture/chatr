import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Select from './Select';

describe('Select', () => {
  it('should render native select element', () => {
    render(
      <Select>
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
      </Select>
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('should render with label', () => {
    render(
      <Select label="Choose an option">
        <option value="1">Option 1</option>
      </Select>
    );

    expect(screen.getByText('Choose an option')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should render options as children', () => {
    render(
      <Select>
        <option value="opt1">First Option</option>
        <option value="opt2">Second Option</option>
        <option value="opt3">Third Option</option>
      </Select>
    );

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('First Option');
    expect(options[1]).toHaveTextContent('Second Option');
    expect(options[2]).toHaveTextContent('Third Option');
  });

  it('should call onChange when value changes', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();

    render(
      <Select onChange={handleChange} defaultValue="">
        <option value="">Select...</option>
        <option value="opt1">Option 1</option>
        <option value="opt2">Option 2</option>
      </Select>
    );

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'opt1');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should display selected value', () => {
    render(
      <Select value="opt2" onChange={() => {}}>
        <option value="opt1">Option 1</option>
        <option value="opt2">Option 2</option>
        <option value="opt3">Option 3</option>
      </Select>
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('opt2');
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <Select disabled>
        <option value="1">Option 1</option>
      </Select>
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('should display error message', () => {
    render(
      <Select error="This field is required">
        <option value="1">Option 1</option>
      </Select>
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.getByText('This field is required')).toHaveClass('error-message');
  });

  it('should apply error class when error prop is present', () => {
    render(
      <Select error="Error message">
        <option value="1">Option 1</option>
      </Select>
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('error');
  });

  it('should not display error message when error prop is not provided', () => {
    render(
      <Select>
        <option value="1">Option 1</option>
      </Select>
    );

    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  it('should render chevron icon', () => {
    const { container } = render(
      <Select>
        <option value="1">Option 1</option>
      </Select>
    );

    const chevron = container.querySelector('.select-chevron');
    expect(chevron).toBeInTheDocument();
    expect(chevron?.tagName).toBe('svg');
  });

  it('should apply custom className', () => {
    render(
      <Select className="custom-class">
        <option value="1">Option 1</option>
      </Select>
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('custom-class');
    expect(select).toHaveClass('form-input');
  });

  it('should forward ref to select element', () => {
    const ref = { current: null as HTMLSelectElement | null };

    render(
      <Select ref={ref}>
        <option value="1">Option 1</option>
      </Select>
    );

    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });

  it('should handle multiple selections when multiple prop is set', () => {
    render(
      <Select multiple onChange={jest.fn()}>
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
        <option value="3">Option 3</option>
      </Select>
    );

    const select = screen.getByRole('listbox'); // multiple selects have listbox role
    expect(select).toBeInTheDocument();
  });

  it('should wrap select in form-group div', () => {
    const { container } = render(
      <Select>
        <option value="1">Option 1</option>
      </Select>
    );

    const formGroup = container.querySelector('.form-group');
    expect(formGroup).toBeInTheDocument();
  });

  it('should wrap select in select-wrapper div', () => {
    const { container } = render(
      <Select>
        <option value="1">Option 1</option>
      </Select>
    );

    const selectWrapper = container.querySelector('.select-wrapper');
    expect(selectWrapper).toBeInTheDocument();
  });
});

