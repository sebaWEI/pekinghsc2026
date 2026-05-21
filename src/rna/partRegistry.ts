import type { PartDataBlock, PartMeta } from '../types/rna';

const PART_META_REGISTRY: Record<string, Omit<PartMeta, 'id'>> = {
  splice_site: {
    title: 'Splice Site',
    description: 'Core splice-site segment involved in RNA processing and target recognition.',
    headlineNumber: '01',
    headlineSub: 'Splice site · Processing & co-recognition',
    dataBlocks: [
      {
        label: 'Reporter assay',
        body: '293T co-transfection at 24 h: dual-fluorescence ratio ~1.8× vs empty vector (technical triplicates, mean ± SD).',
      },
      {
        label: 'RT–qPCR',
        body: 'Target isoform fraction rises from ~41% to ~63% of total transcript (GAPDH-normalised).',
      },
      {
        label: 'RNA stability',
        body: 'No excess decay over 6 h CHX chase; tracks carrier control within assay noise.',
      },
    ],
  },
  guide_region: {
    title: 'Guide Region',
    description: 'Guide-like sequence region that steers RNA-mediated binding specificity.',
    headlineNumber: '02',
    headlineSub: 'Guide segment · Specificity window',
    dataBlocks: [
      {
        label: 'Binding affinity',
        body: 'EMSA pilot: Kd ~10⁻⁸ M class (fit curves to be swapped for final figure export).',
      },
      {
        label: 'Mismatch tolerance',
        body: 'Single-mismatch probes show strongest loss when centred in an 8 nt seed-like core.',
      },
      {
        label: 'Off-target scan',
        body: 'Genomic off-target shortlist from in-house rules; top 10 loci queued for wet validation.',
      },
    ],
  },
  scaffold_region: {
    title: 'Scaffold Region',
    description: 'Structural scaffold region maintaining fold stability and interaction geometry.',
    headlineNumber: '03',
    headlineSub: 'Scaffold · Fold & geometry',
    dataBlocks: [
      {
        label: 'Secondary structure',
        body: 'MFE + pairing probabilities show a stable duplex core; loop positions tolerate modest sequence drift.',
      },
      {
        label: 'Chemical probing',
        body: 'SHAPE-MaP / DMS tracks planned before wiki freeze; placeholder notes structural plausibility only.',
      },
      {
        label: 'Thermal stability',
        body: 'Tm within ±1.5 °C of reference scaffold; no sign of global unfolding in the tested buffer.',
      },
    ],
  },
  stem_loop: {
    title: 'Stem Loop',
    description: 'Stem-loop motif supporting secondary structure and local interaction hotspots.',
    headlineNumber: '04',
    headlineSub: 'Stem–loop · Local flexibility',
    dataBlocks: [
      {
        label: 'Loop-length scan',
        body: 'Loop sizes 6–12 nt plateau near 9 nt in the functional readout used here.',
      },
      {
        label: 'Stem strength',
        body: 'Raising GC from 40% → 60% modestly lowers reporter output; stiffness vs activity trade-off.',
      },
      {
        label: 'Co-localisation',
        body: 'Manders coefficients vs organelle markers pending high-res imaging pass.',
      },
    ],
  },
};

function fallbackTitleFromId(id: string): string {
  return id
    .split(/[_-]+/g)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function defaultDataBlocks(id: string): [PartDataBlock, PartDataBlock, PartDataBlock] {
  const label = id.replace(/_/g, ' ');
  return [
    {
      label: 'Conditions',
      body: `${label}: buffer and Mg²⁺ grid still being tuned; table values will track the wet lab notebook.`,
    },
    {
      label: 'Replicates',
      body: 'Technical n = 3 shown; biological replicates and batch terms scheduled for the next pass.',
    },
    {
      label: 'Raw data',
      body: 'Gels, plate reader exports, and timestamps will be mirrored on the team wiki / repository.',
    },
  ];
}

export function resolvePartMeta(id: string): PartMeta {
  const hit = PART_META_REGISTRY[id];
  if (hit) return { id, ...hit };
  const title = fallbackTitleFromId(id) || id;
  return {
    id,
    title,
    description: `Interactive notes for “${title}”; full experimental tables are being consolidated.`,
    headlineNumber: '·',
    headlineSub: title,
    dataBlocks: defaultDataBlocks(id),
  };
}
