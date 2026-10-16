import './ui/style.css';
import { actionFromElement, createApp, dispatch } from './ui/app.ts';
import { renderApp } from './ui/render.ts';
import { unlockAudio } from './ui/sound.ts';

function getSeed(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('seed') ?? Math.random().toString(36).slice(2, 10);
}

const app = createApp(getSeed());
const root = document.querySelector<HTMLDivElement>('#app');

function render(): void {
  if (!root) return;
  root.innerHTML = renderApp(app);
}

let audioUnlocked = false;

document.addEventListener('click', (event) => {
  if (!audioUnlocked) {
    unlockAudio();
    audioUnlocked = true;
  }

  const target = event.target as HTMLElement;
  const el = target.closest('[data-action]') as HTMLElement | null;
  if (!el) return;

  const action = actionFromElement(el);
  if (!action) return;

  dispatch(app, action);
  render();
});

render();
