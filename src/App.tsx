import { type ReactNode } from 'react';
import { Narrative } from './components/narrative/Narrative';
import { WEB_NARRATIVE } from './content/webNarrative';

/**
 * Root application component.
 *
 * Renders the narrative sections declaratively. The Three.js hero pipeline
 * runs imperatively via main.ts (imported by main.tsx as a side effect).
 *
 * After the RNA model loads, main.ts wires up narrativeHeroRnaView and
 * narrativeHeroSineupStrip by finding `.hero-glyph__three-host` and
 * `.hero-sineup-host` elements in this component's rendered DOM.
 */

export function App(): ReactNode {
  return <Narrative content={WEB_NARRATIVE} />;
}
