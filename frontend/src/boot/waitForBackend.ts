export async function waitForBackend() {
  let retries = 0;

  while (retries < 120) {
    try {
      const res = await fetch("http://127.0.0.1:8000/health");
      if (res.ok) {
        console.log("✅ Backend ready");
        return true;
      }
    } catch (e) {}

    await new Promise((r) => setTimeout(r, 1500));
    retries++;
  }

  throw new Error("Backend not responding");
}