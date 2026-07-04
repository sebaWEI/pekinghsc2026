import { Narrative } from '../components/narrative/Narrative';
import { WEB_NARRATIVE } from '../content/webNarrative';

/** Cinematic home — Three.js hero runs via main.ts side effect in main.tsx. */
export function Home() {
  return <Narrative content={WEB_NARRATIVE} />;
}
