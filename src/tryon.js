export async function tryOnClothing(humanImageFile, garmentImageFile) {
  const formData = new FormData();
  formData.append('human', humanImageFile);
  formData.append('garment', garmentImageFile);

  const response = await fetch('/api/virtual-tryon', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Try-on failed');
  }

  return data.outputImage;
}