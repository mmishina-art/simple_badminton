import './style.css';
import { render } from 'preact';
import { setupInstallGuide } from './install';
import { setupUpdateBanner } from './pwa';
import { migrateStorage, requestPersist } from './storage';
import { App } from './ui/App';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} not found`);
  return el as T;
};

migrateStorage();
$('version').textContent = __APP_VERSION__;
render(<App />, $('root'));
requestPersist();
setupUpdateBanner($('update-banner'), $('update-button'));
setupInstallGuide($<HTMLButtonElement>('install-open'), $<HTMLDialogElement>('install-dialog'), $<HTMLButtonElement>('install-now'));

// ここまで来たら起動成功（public/boot.js が見ている）
window.__appStarted = true;
