import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileImageCropper from './ProfileImageCropper';

const mockFileReaderInstance = {
  readAsDataURL: jest.fn(),
  onload: null as any,
  result: 'data:image/png;base64,test',
};
global.FileReader = jest.fn(() => mockFileReaderInstance) as any;

HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  drawImage: jest.fn(),
  clearRect: jest.fn(),
})) as any;

HTMLCanvasElement.prototype.toBlob = jest.fn((cb) =>
  cb(new Blob(['test'], { type: 'image/png' }))
);

const defaultProps = {
  imageFile: new File(['pixels'], 'photo.png', { type: 'image/png' }),
  onCropComplete: jest.fn(),
  onCancel: jest.fn(),
  isDark: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFileReaderInstance.onload = null;
});

describe('ProfileImageCropper', () => {
  it('renders overlay', () => {
    const { container } = render(<ProfileImageCropper {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('shows title "Adjust Your Profile Image"', () => {
    render(<ProfileImageCropper {...defaultProps} />);
    expect(screen.getByText('Adjust Your Profile Image')).toBeInTheDocument();
  });

  it('renders cancel button', () => {
    render(<ProfileImageCropper {...defaultProps} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders upload button', () => {
    render(<ProfileImageCropper {...defaultProps} />);
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
  });

  it('upload button disabled until image loads', () => {
    render(<ProfileImageCropper {...defaultProps} />);
    expect(screen.getByRole('button', { name: /upload/i })).toBeDisabled();
  });

  it('calls onCancel when cancel clicked', async () => {
    const user = userEvent.setup();
    render(<ProfileImageCropper {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows zoom slider', () => {
    render(<ProfileImageCropper {...defaultProps} />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByText('Zoom')).toBeInTheDocument();
  });

  it('loads image from file via FileReader', async () => {
    render(<ProfileImageCropper {...defaultProps} />);

    expect(mockFileReaderInstance.readAsDataURL).toHaveBeenCalledWith(
      defaultProps.imageFile
    );

    await waitFor(() => {
      expect(mockFileReaderInstance.onload).toBeTruthy();
    });

    act(() => {
      mockFileReaderInstance.onload({ target: { result: 'data:image/png;base64,test' } });
    });

    await waitFor(() => {
      const img = screen.getByAltText('Crop preview');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'data:image/png;base64,test');
    });
  });
});
