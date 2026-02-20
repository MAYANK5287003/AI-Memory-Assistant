export async function shareFile(filename?: string, fileUrl?: string) {
  if (!fileUrl) return;

  try {
    // ⭐ FORCE proper fetch
    const response = await fetch(fileUrl, { mode: "cors" });
    const blob = await response.blob();

    // ⭐ FIX MIME TYPE FOR IMAGES
    let mimeType = blob.type;

    if (!mimeType || mimeType === "application/octet-stream") {
      if (fileUrl.endsWith(".jpg") || fileUrl.endsWith(".jpeg")) {
        mimeType = "image/jpeg";
      } else if (fileUrl.endsWith(".png")) {
        mimeType = "image/png";
      } else if (fileUrl.endsWith(".webp")) {
        mimeType = "image/webp";
      } else {
        mimeType = "application/octet-stream";
      }
    }

    const file = new File([blob], filename || "file", {
      type: mimeType,
    });

    // ⭐ TRY FILE SHARE FIRST
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: filename,
        files: [file],
      });
      return;
    }

    // ⭐ FALLBACK
    if (navigator.share) {
      await navigator.share({
        title: filename,
        url: fileUrl,
      });
    } else {
      window.open(fileUrl, "_blank");
    }
  } catch (err) {
    console.error("Share failed", err);

    if (navigator.share) {
      navigator.share({ url: fileUrl });
    } else {
      window.open(fileUrl, "_blank");
    }
  }
}
