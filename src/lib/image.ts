/**
 * 이미지 파일 → 저장용 data URL (브라우저 안에서 축소)
 * 시안(데모) 모드에서 보관 사진·리뷰 사진을 localStorage에 담기 위해 사용합니다.
 * 운영에서는 같은 파일을 Cloudflare R2 로 올리고 경로만 저장하면 됩니다.
 */

const MAX_EDGE = 1000;

export async function fileToDataUrl(file: File, maxEdge = MAX_EDGE, quality = 0.82): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 올릴 수 있어요. (JPG · PNG)');
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('사진은 12MB 이하만 올릴 수 있어요.');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('사진을 읽지 못했어요.'));
    reader.readAsDataURL(file);
  });

  try {
    const image = await loadImage(dataUrl);
    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return dataUrl;
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return dataUrl;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('사진을 읽지 못했어요.'));
    image.src = src;
  });
}

/** 명함 시안 파일(이미지/PDF) → 저장용 data URL · 시안 모드는 브라우저에, 운영은 R2에 둡니다. */
export async function proofFileToDataUrl(
  file: File,
  maxBytes = 3 * 1024 * 1024,
): Promise<{ fileUrl: string; fileType: 'image' | 'pdf' }> {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const isImage = file.type.startsWith('image/');
  if (!isPdf && !isImage) {
    throw new Error('시안은 이미지(JPG · PNG)나 PDF만 올릴 수 있어요.');
  }
  if (isPdf) {
    if (file.size > maxBytes) {
      throw new Error('PDF 시안은 3MB 이하만 올릴 수 있어요. 이미지로 저장해 올려 주세요.');
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('시안 파일을 읽지 못했어요.'));
      reader.readAsDataURL(file);
    });
    return { fileUrl: dataUrl, fileType: 'pdf' };
  }
  const dataUrl = await fileToDataUrl(file, 1400, 0.85);
  if (dataUrl.length > maxBytes * 1.4) {
    throw new Error('이미지가 너무 커요. 조금 줄여서 다시 올려 주세요.');
  }
  return { fileUrl: dataUrl, fileType: 'image' };
}
