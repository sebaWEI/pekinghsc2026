import {
  placeholderLensMetrics,
  placeholderLensStructure,
} from './placeholderAssets';

export interface WebLensSlide {
  subtitle: string;
  body: string;
  imageUrl?: string;
  imageAlt?: string;
}

export interface WebGalleryItem {
  title: string;
  caption: string;
  imageUrl: string;
  imageAlt: string;
}

export interface WebSynthesisMedia {
  imageUrl: string;
  imageAlt?: string;
  /** Full-screen fixed backdrop when this node is lit; defaults to imageUrl */
  sceneBgUrl?: string;
}

export interface WebSynthesisStep {
  title: string;
  body: string;
  media?: WebSynthesisMedia;
}

export interface WebSynthesisPath {
  label: string;
  steps: WebSynthesisStep[];
}

export interface WebSynthesisOutcome {
  label: string;
  title: string;
  body: string;
  media?: WebSynthesisMedia;
}

/** 元件生成：Binding / Effector 双路径汇合 → SINEUP 元件 → 验证层 */
export interface WebComponentSynthesis {
  label: string;
  title: string;
  subtitle: string;
  origin: {
    title: string;
    body: string;
    media?: WebSynthesisMedia;
  };
  bindingPath: WebSynthesisPath;
  effectorPath: WebSynthesisPath;
  merge: {
    title: string;
    body: string;
    media?: WebSynthesisMedia;
  };
  outcomes: WebSynthesisOutcome[];
}

/** First narrative screen: Bento-style cards (ex–Three snapshots layout). */
export interface WebOpeningBentoCard {
  tag: string;
  /** Main image on the white card (visible by default). */
  imageUrl: string;
  imageAlt?: string;
  /** Background image revealed on hover (lower half, under a white→image gradient). */
  hoverBgUrl: string;
  title: string;
  body: string;
}

export interface WebOpeningBlock {
  eyebrow: string;
  title: string;
  subtitle: string;
  cards: WebOpeningBentoCard[];
}

export interface WebNarrativeContent {
  opening: WebOpeningBlock;
  lenses: WebLensSlide[];
  gallery: WebGalleryItem[];
  interlude: {
    title: string;
    body: string;
  };
  componentSynthesis: WebComponentSynthesis;
  footer: {
    tagline: string;
    email: string;
    lab: string;
  };
}

/** Temporary placeholders — reuse Triple Dead End assets until synthesis art is ready. */
const SYNTH_PLACEHOLDER_VISUALS = [
  {
    imageUrl: './images/crispr.png',
    imageAlt: 'CRISPR — molecular scissors and DNA target',
    sceneBgUrl: './images/crispr_background.png',
  },
  {
    imageUrl: './images/aav.png',
    imageAlt: 'Adeno-associated virus capsid — delivery payload limit',
    sceneBgUrl: './images/aav_background.png',
  },
  {
    imageUrl: './images/therapy.png',
    imageAlt: 'Schematic — therapeutic readouts',
    sceneBgUrl: './images/therapy_background.jpg',
  },
] as const satisfies readonly WebSynthesisMedia[];

function synthPlaceholderMedia(index: number): WebSynthesisMedia {
  const v = SYNTH_PLACEHOLDER_VISUALS[index % SYNTH_PLACEHOLDER_VISUALS.length];
  return {
    imageUrl: v.imageUrl,
    imageAlt: v.imageAlt,
    sceneBgUrl: v.sceneBgUrl,
  };
}

/** Second-act+ narrative: hero bento, lanes, optional gallery, interlude, component synthesis, footer. */
export const WEB_NARRATIVE: WebNarrativeContent = {
  opening: {
    eyebrow: '',
    title: 'The Triple Dead End',
    subtitle: 'Why chromosomal microdeletions defy traditional therapy',
    cards: [
      {
        tag: 'No template',
        imageUrl: './images/crispr.png',
        imageAlt: 'CRISPR — molecular scissors and DNA target',
        hoverBgUrl: './images/crispr_background.png',
        title: "CRISPR's Blind Spot",
        body:
          'Gene editing requires an existing template. Microdeletions physically erase entire multi-gene segments from the chromosome. You cannot edit or repair what has completely vanished.',
      },
      {
        tag: 'Payload wall',
        imageUrl: './images/aav.png',
        imageAlt: 'Adeno-associated virus capsid — delivery payload limit',
        hoverBgUrl: './images/aav_background.png',
        title: 'The Payload Wall',
        body:
          'A single microdeletion wipes out multiple critical genes. The gold-standard AAV delivery vehicle has a strict 4.7kb payload limit. Packing all the missing heavy cDNAs into one vector is mathematically and physically impossible.',
      },
      {
        tag: 'Symptom trap',
        imageUrl: './images/therapy.png',
        imageAlt: 'Schematic — readouts',
        hoverBgUrl: './images/therapy_background.jpg',
        title: 'The Symptom Trap',
        body:
          'Zero foundational cures exist. Current pharmaceutical interventions merely manage downstream developmental and neurological symptoms, leaving the underlying multi-gene deficit completely untouched.',
      },
    ],
  },
  lenses: [
    {
      subtitle: 'The Microdeletion Crisis',
      body: 'Chromosomal microdeletions like Wolf-Hirschhorn Syndrome (~1:50,000 births) drive devastating congenital defects and high mortality. Crucially, WHS isn\'t a single-gene flaw—it\'s the collective erasure of an entire gene network. This multi-gene collapse causes lifelong neurological failure, leaving modern medicine at an absolute dead end.',
      imageUrl: './images/chrom.svg',
      imageAlt: 'Chromosome — chromosomal microdeletion',
    },
    {
      subtitle: 'Fold first, then interface',
      body: 'Integrative modelling keeps the RNA in a fold that supports the intended protein–RNA contacts, so sequence choices remain plausible in vivo rather than only on paper.',
      imageUrl: placeholderLensStructure,
      imageAlt: 'Placeholder — replace with structure or video',
    },
    {
      subtitle: 'Binding metrics in the loop',
      body: 'Sequence-level features feed a multi-scale workflow; we align predicted binding with an operating threshold so dry runs narrow the wet-lab search space.',
      imageUrl: placeholderLensMetrics,
      imageAlt: 'Placeholder — replace with binding plot',
    },
  ],
  gallery: [],
  interlude: {
    title: 'Why ChromDel with SINE/B2',
    body: 'Rare disease contexts benefit from mechanisms that are tunable, compact, and evolvable. Our story is not a single hero assay—it is a pathway from sequence discovery through modelling to assays that punish wishful folding.',
  },
  componentSynthesis: {
    label: 'Component design',
    title: 'Two paths, one element',
    subtitle: 'Binding domain and effector domain converge into a SINEUP upregulation module',
    origin: {
      title: 'Design fork',
      body: 'From chromosomal microdeletion context, two parallel design rails define the SINEUP element.',
      media: synthPlaceholderMedia(0),
    },
    bindingPath: {
      label: 'Binding domain',
      steps: [
        {
          title: 'Deletion-aware gene screening',
          body:
            'Starting from the chromosomal microdeletion coordinates, we compute and rank upregulated gene combinations that remain expressible on the intact allele—narrowing the search to biologically plausible targets.',
          media: synthPlaceholderMedia(0),
        },
        {
          title: 'SINEB2-compatible motif mining',
          body:
            'From the shortlisted genes we derive RNA windows suited for SINEB2 engagement, prioritising motifs that can anchor the upregulation switch without disturbing native splicing context.',
          media: synthPlaceholderMedia(1),
        },
      ],
    },
    effectorPath: {
      label: 'Effector domain',
      steps: [
        {
          title: 'Inverse & co-folding design',
          body:
            'Inverse-folding and co-folding models propose secondary structures that keep the effector foldable in cellular conditions while exposing the interface we intend to tune.',
          media: synthPlaceholderMedia(1),
        },
        {
          title: 'High-affinity target engagement',
          body:
            'We iterate sequences predicted to bind the target protein with high affinity, using structural confidence scores to discard decoys before any wet-lab build.',
          media: synthPlaceholderMedia(2),
        },
      ],
    },
    merge: {
      title: 'SINEUP upregulation element',
      body:
        'The binding and effector modules are fused into a compact SINEUP element: SINEB2-facing RNA on one face, protein-facing RNA on the other—one transcript that re-awakens the silent allele.',
      media: synthPlaceholderMedia(2),
    },
    outcomes: [
      {
        label: 'Mechanism',
        title: 'Molecular dynamics',
        body:
          'All-atom MD simulations stress-test the merged construct—interface stability, breathing modes, and solvent exposure—so we understand why the element works, not only that it binds.',
        media: synthPlaceholderMedia(0),
      },
      {
        label: 'Delivery',
        title: 'Spatial pharmacokinetics',
        body:
          'Spatial PK models map how a systemically administered payload reaches tissues of interest, linking molecular design to whole-body dosing strategy before we commit to a delivery format.',
        media: synthPlaceholderMedia(1),
      },
    ],
  },
  footer: {
    tagline: 'SINEB2-ChromDel · iGEM Peking HSC',
    email: 'team@example.edu',
    lab: 'Replace with your contact links and social handles.',
  },
};
