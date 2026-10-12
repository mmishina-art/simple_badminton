import qrcode from 'qrcode-generator';

/** QR コードを、黒いマスの座標の一覧にする(アプリに同梱。外部のサービスに頼らない) */
export function qrModules(text: string): { size: number; dark: [number, number][] } {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  const dark: [number, number][] = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (qr.isDark(r, c)) dark.push([r, c]);
  return { size, dark };
}
