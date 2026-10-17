import './ui/style.css';
import { createApp as createVueApp } from 'vue';
import App from './ui/App.vue';
import { actionFromElement } from './ui/app.ts';
import { unlockAudio } from './ui/sound.ts';
import { initGame, useGame } from './ui/store.ts';

function getSeed(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('seed') ?? Math.random().toString(36).slice(2, 10);
}

initGame(getSeed());
createVueApp(App).mount('#app');

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

  useGame().dispatch(action);
});
