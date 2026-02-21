import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CoverImageUploader from './CoverImageUploader';
import * as coverImageService from '@/lib/coverImageService';
import { ToastProvider } from '@/contexts/ToastContext';

jest.mock('@/lib/coverImageService', () => ({
  saveCoverImageLocally: jest.fn(),
  uploadCoverImageToServer: jest.fn(),
  getCoverImageURL: jest.fn(),
  validateCoverImage: jest.fn(),
}));

jest.mock('@/components/image-manip/CoverImageCropper/CoverImageCropper', () => {
  return function MockCoverImageCropper({ onCropComplete, onCancel }: any) {
    return (
      <div data-testid="cover-image-cropper">
        <button onClick={() => onCropComplete(new Blob(['cropped'], { type: 'image/jpeg' }))}>
          Crop Complete
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    );
  };
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ToastProvider>
      {component}
    </ToastProvider>
  );
};

describe('CoverImageUploader', () => {
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    (coverImageService.getCoverImageURL as jest.Mock).mockResolvedValue(null);
    (coverImageService.validateCoverImage as jest.Mock).mockReturnValue({ valid: true });
    (coverImageService.saveCoverImageLocally as jest.Mock).mockResolvedValue('/cover.jpg');
    (coverImageService.uploadCoverImageToServer as jest.Mock).mockResolvedValue({ url: '/cover.jpg' });
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render cover image with default', () => {
    renderWithProviders(<CoverImageUploader userId={mockUserId} isDark={false} />);

    const coverImage = screen.getByRole('img', { name: /cover/i });
    expect(coverImage).toBeInTheDocument();
  });

  it('should render camera button', () => {
    renderWithProviders(<CoverImageUploader userId={mockUserId} isDark={false} />);

    const cameraButton = screen.getByRole('button');
    expect(cameraButton).toBeInTheDocument();
  });

  it('should validate and show cropper for valid file', async () => {
    renderWithProviders(<CoverImageUploader userId={mockUserId} isDark={false} />);

    const file = new File(['image'], 'cover.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          configurable: true,
        });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await waitFor(() => {
      expect(coverImageService.validateCoverImage).toHaveBeenCalledWith(file);
      expect(screen.getByTestId('cover-image-cropper')).toBeInTheDocument();
    });
  });

  it('should not show cropper for invalid file', async () => {
    (coverImageService.validateCoverImage as jest.Mock).mockReturnValue({
      valid: false,
      error: 'Invalid file type',
    });

    renderWithProviders(<CoverImageUploader userId={mockUserId} isDark={false} />);

    const file = new File(['doc'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          configurable: true,
        });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await waitFor(() => {
      expect(screen.queryByTestId('cover-image-cropper')).not.toBeInTheDocument();
    });
  });

  it('should close cropper on cancel', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CoverImageUploader userId={mockUserId} isDark={false} />);

    const file = new File(['image'], 'cover.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          configurable: true,
        });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await waitFor(() => {
      expect(screen.getByTestId('cover-image-cropper')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByTestId('cover-image-cropper')).not.toBeInTheDocument();
    });
  });
});

