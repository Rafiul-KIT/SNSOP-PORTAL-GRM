import Swal from 'sweetalert2';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_FILE_SIZE_LABEL = '25 MB';
const ALLOWED_FILE_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'];

export interface FileValidationOptions {
  maxSizeBytes?: number;
  maxSizeLabel?: string;
  allowedExtensions?: string[];
  checkExtension?: boolean;
}

export function validateFile(
  event: any,
  options?: FileValidationOptions
): File | null {
  const file: File | undefined = event.target?.files?.[0] ?? event.files?.[0];
  if (!file) return null;

  const maxSize = options?.maxSizeBytes ?? MAX_FILE_SIZE_BYTES;
  const maxLabel = options?.maxSizeLabel ?? MAX_FILE_SIZE_LABEL;
  const checkExt = options?.checkExtension ?? true;
  const extensions = options?.allowedExtensions ?? ALLOWED_FILE_EXTENSIONS;

  if (checkExt) {
    const ext = file.name?.split('.').pop()?.toLowerCase() ?? '';
    if (!extensions.includes(ext)) {
      Swal.fire({
        title: 'Invalid File Type',
        text: `Allowed: ${extensions.join(', ')}`,
        icon: 'warning',
        confirmButtonColor: '#0d6efd',
      });
      if (event.target) event.target.value = '';
      return null;
    }
  }

  if (file.size > maxSize) {
    Swal.fire({
      title: 'File Too Large',
      text: `Maximum allowed file size is ${maxLabel}.`,
      icon: 'warning',
      confirmButtonColor: '#0d6efd',
    });
    if (event.target) event.target.value = '';
    return null;
  }

  return file;
}
