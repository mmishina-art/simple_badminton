// 音声読み上げ(Web Speech API。日本語)。使えない端末では何もしない。
export const speechSupported = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window;

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}

/** 読み上げる。前の読み上げは止める。cancel の直後に話すと切れる端末があるので 300ms 待つ。 */
export function speak(text: string, onEnd?: () => void): void {
  if (!speechSupported()) {
    onEnd?.();
    return;
  }
  stopSpeaking();
  window.setTimeout(() => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 1;
    u.onend = () => onEnd?.();
    u.onerror = () => onEnd?.();
    window.speechSynthesis.speak(u);
  }, 300);
}
