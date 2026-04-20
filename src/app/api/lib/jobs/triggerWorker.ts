export function triggerWorker() {
  try {
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/worker/process`, {
      method: "POST",
    }).catch(() => {});
  } catch (error) {
    console.error("Erorr triggering worker : ", error);
  }
}
