import { placeholderSceneOverview } from './placeholderAssets';

export interface ProjectSceneContent {
  title: string;
  body: string;
  imageUrl?: string;
  imageAlt?: string;
  icon?: string;
  layout?: 'text-left' | 'text-right' | 'centered';
}

/** First-act (3D newspaper) only — continuation lives in `webNarrative.ts`. */
export const PROJECT_SCENES: ProjectSceneContent[] = [
  {
    title: 'SINEB2 Overview',
    body: 'SINE/B2 acts as the core RNA regulatory element in our design. Naturally functioning as robust translational modulators, it provides a compact sequence logic to bridge molecular sensing and downstream translational control.',
    imageUrl: placeholderSceneOverview,
    imageAlt: 'Placeholder scene art — replace with real figure',
    icon: 'DnaIcon',
    layout: 'text-left',
  },
];
