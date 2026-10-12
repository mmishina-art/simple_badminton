// 全画面と、横向きへの固定(どちらも、できる端末だけ)
export async function enterFullscreen(el: HTMLElement): Promise<void> {
  try {
    await el.requestFullscreen?.();
  } catch {
    // iPhone などでは全画面にできない。画面いっぱいの表示だけで続行する
  }
  try {
    await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape');
  } catch {
    // 固定できなくても続行する
  }
}

export async function exitFullscreen(): Promise<void> {
  try {
    screen.orientation?.unlock?.();
  } catch {
    // 無視
  }
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {
    // 無視
  }
}
