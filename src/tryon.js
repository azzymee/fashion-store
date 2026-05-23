export async function tryOnClothing(personImageBase64, clothingImageBase64, garmentDescription = "clothing item") {
  const HF_TOKEN = import.meta.env.VITE_HF_TOKEN;

  // Convert base64 to blob
  const base64ToBlob = (base64, mime = "image/jpeg") => {
    const byteString = atob(base64.split(",")[1] || base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type: mime });
  };

  const personBlob = base64ToBlob(personImageBase64);
  const clothBlob = base64ToBlob(clothingImageBase64);

  // Step 1: Upload person image
  const personForm = new FormData();
  personForm.append("data", personBlob, "person.jpg");
  const personUpload = await fetch(
    "https://yisol-idm-vton.hf.space/upload",
    { method: "POST", headers: { Authorization: `Bearer ${HF_TOKEN}` }, body: personForm }
  );
  const personData = await personUpload.json();

  // Step 2: Upload clothing image
  const clothForm = new FormData();
  clothForm.append("data", clothBlob, "cloth.jpg");
  const clothUpload = await fetch(
    "https://yisol-idm-vton.hf.space/upload",
    { method: "POST", headers: { Authorization: `Bearer ${HF_TOKEN}` }, body: clothForm }
  );
  const clothData = await clothUpload.json();

  // Step 3: Run try-on
  const response = await fetch("https://yisol-idm-vton.hf.space/run/predict", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HF_TOKEN}`,
    },
    body: JSON.stringify({
      fn_index: 0,
      data: [
        { path: personData[0] },   // person image
        { path: clothData[0] },    // clothing image
        garmentDescription,         // garment description
        true,                       // is_checked
        false,                      // is_checked_crop
        30,                         // denoise_steps
        42,                         // seed
      ],
    }),
  });

  if (!response.ok) throw new Error("Try-on API failed");
  const result = await response.json();

  // Result is a URL to the generated image
  const outputUrl = result.data?.[0]?.url || result.data?.[0];
  if (!outputUrl) throw new Error("No output image returned");
  return outputUrl;
}