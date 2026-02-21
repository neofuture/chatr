import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileImageUploader from './ProfileImageUploader';
import * as profileImageService from '@/lib/profileImageService';
import { ToastProvider } from '@/contexts/ToastContext';

// Mock the profile image service
jest.mock('@/lib/profileImageService', () => ({
  saveProfileImageLocally: jest.fn(),
  uploadProfileImageToServer: jest.fn(),
  getProfileImageURL: jest.fn(),
  validateProfileImage: jest.fn(),
}));

// Mock the cropper component
jest.mock('@/components/image-manip/ProfileImageCropper/ProfileImageCropper', () => {
  return function MockProfileImageCropper({ onCropComplete, onCancel }: any) {
    return (
      <div data-testid="profile-image-cropper">
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

describe('ProfileImageUploader', () => {
  const mockUserId = 'test-user-123';
  const mockImageUrl = '/uploads/profiles/test-user-123.jpg';

  beforeEach(() => {
    jest.clearAllMocks();
    (profileImageService.getProfileImageURL as jest.Mock).mockResolvedValue(null);
    (profileImageService.validateProfileImage as jest.Mock).mockReturnValue({ valid: true });
    (profileImageService.saveProfileImageLocally as jest.Mock).mockResolvedValue(mockImageUrl);
    (profileImageService.uploadProfileImageToServer as jest.Mock).mockResolvedValue({
      url: mockImageUrl,
    });

    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render profile image with default', () => {
    renderWithProviders(<ProfileImageUploader userId={mockUserId} isDark={false} />);

    const profileImage = screen.getByRole('img', { name: /profile/i });
    expect(profileImage).toBeInTheDocument();
    expect(profileImage).toHaveAttribute('src', '/profile/default-profile.jpg');
  });

  it('should render camera button', () => {
    renderWithProviders(<ProfileImageUploader userId={mockUserId} isDark={false} />);

    const cameraButton = screen.getByRole('button');
    expect(cameraButton).toBeInTheDocument();
    expect(cameraButton).not.toBeDisabled();
  });

  it('should have hidden file input', () => {
    const { container } = renderWithProviders(<ProfileImageUploader userId={mockUserId} isDark={false} />);

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', 'image/jpeg,image/jpg,image/png,image/webp');
  });

  it('should validate and show cropper for valid file', async () => {
    renderWithProviders(<ProfileImageUploader userId={mockUserId} isDark={false} />);

    const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
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
      expect(profileImageService.validateProfileImage).toHaveBeenCalledWith(file);
      expect(screen.getByTestId('profile-image-cropper')).toBeInTheDocument();
    });
  });

  it('should not show cropper for invalid file', async () => {
    (profileImageService.validateProfileImage as jest.Mock).mockReturnValue({
      valid: false,
      error: 'Invalid file type',
    });

    renderWithProviders(<ProfileImageUploader userId={mockUserId} isDark={false} />);

    const file = new File(['image'], 'test.pdf', { type: 'application/pdf' });
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
      expect(screen.queryByTestId('profile-image-cropper')).not.toBeInTheDocument();
    });
  });

  it('should close cropper on cancel', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileImageUploader userId={mockUserId} isDark={false} />);

    const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
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
      expect(screen.getByTestId('profile-image-cropper')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByTestId('profile-image-cropper')).not.toBeInTheDocument();
    });
  });

  it('should apply dark theme border', () => {
    renderWithProviders(<ProfileImageUploader userId={mockUserId} isDark={true} />);

    const profileImage = screen.getByRole('img', { name: /profile/i });
    expect(profileImage).toHaveStyle({ border: '4px solid rgba(59, 130, 246, 0.3)' });
  });

  it('should apply light theme border', () => {
    renderWithProviders(<ProfileImageUploader userId={mockUserId} isDark={false} />);

    const profileImage = screen.getByRole('img', { name: /profile/i });
    expect(profileImage).toHaveStyle({ border: '4px solid rgba(15, 23, 42, 0.2)' });
  });
});

