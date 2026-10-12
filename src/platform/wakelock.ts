// 画面の常時点灯(Screen Wake Lock)。得点板を開いている間だけ使う。非対応の端末では何もしない。
let lock: WakeLockSentinel | null = null;

export async function acquireWakeLock(): Promise<boolean> {
  try {
    if (!navigator.wakeLock || lock) return !!lock;
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => {
      lock = null;
    });
    return true;
  } catch {
    return false;
  }
}

export async function releaseWakeLock(): Promise<void> {
  const l = lock;
  lock = null;
  try {
    await l?.release();
  } catch {
    // 無視
  }
}
