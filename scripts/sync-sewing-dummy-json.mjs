import fs from 'fs';

import path from 'path';

import { fileURLToPath } from 'url';



const __dirname = path.dirname(fileURLToPath(import.meta.url));

const root = path.join(__dirname, '..');



const PCS = 15;

const ORDER_BUNDLES = 10;

const ORDER_TARGET = (ORDER_BUNDLES - 1) * PCS + 10;



const SNAPSHOT = {

  1: {

    lead: 7,

    order: 10,

    bundles: {

      1: [15, 15, 14, 13, 12],

      2: [15, 15, 14, 13, 12],

      3: [15, 15, 14, 14, 12],

      4: [15, 15, 13, 12, 11],

      5: [15, 14, 13, 12, 11],

      6: [15, 14, 13, 12, 10],

      7: [15, 14, 0, 0, 0],

    },

  },

  2: {

    lead: 7,

    order: 10,

    bundles: {

      1: [15, 14, 13, 12, 11],

      2: [15, 14, 13, 12, 11],

      3: [15, 14, 14, 13, 12],

      4: [15, 14, 13, 12, 10],

      5: [15, 13, 12, 11, 10],

      6: [15, 13, 12, 11, 9],

      7: [15, 13, 0, 0, 0],

    },

  },

  3: {

    lead: 7,

    order: 10,

    bundles: {

      1: [15, 14, 13, 12, 10],

      2: [15, 14, 13, 12, 11],

      3: [15, 14, 14, 12, 11],

      4: [15, 14, 12, 11, 10],

      5: [15, 13, 12, 11, 9],

      6: [15, 13, 11, 10, 8],

      7: [15, 12, 0, 0, 0],

    },

  },

  4: {

    lead: 7,

    order: 10,

    bundles: {

      1: [15, 14, 12, 11, 9],

      2: [15, 14, 12, 11, 10],

      3: [15, 14, 13, 11, 10],

      4: [15, 13, 11, 10, 8],

      5: [15, 13, 11, 9, 7],

      6: [15, 12, 10, 9, 6],

      7: [15, 12, 0, 0, 0],

    },

  },

  5: {

    lead: 7,

    order: 10,

    bundles: {

      1: [15, 15, 14, 13, 11],

      2: [15, 15, 14, 13, 12],

      3: [15, 15, 14, 14, 12],

      4: [15, 14, 13, 12, 11],

      5: [15, 14, 13, 11, 10],

      6: [15, 14, 12, 11, 9],

      7: [15, 13, 0, 0, 0],

    },

  },

  6: {
    lead: 6,
    order: 10,
    bundles: {
      1: [9, 9, 8, 8, 7],
      2: [10, 10, 9, 9, 8],
      3: [10, 10, 9, 9, 8],
      4: [8, 8, 7, 7, 6],
      5: [7, 7, 6, 6, 5],
      6: [6, 6, 5, 0, 0],
    },
  },
  7: {
    lead: 5,
    order: 10,
    bundles: {
      1: [7, 7, 6, 6, 5],
      2: [8, 8, 7, 7, 6],
      3: [8, 8, 7, 7, 6],
      4: [6, 6, 5, 5, 4],
      5: [5, 5, 4, 0, 0],
    },
  },

};



function maxBundlesAtProcess(lead, processIdx) {

  return Math.max(0, lead - processIdx);

}



function acc(batch, idx) {

  const snap = SNAPSHOT[batch];

  const maxB = maxBundlesAtProcess(snap.lead, idx);

  let s = 0;

  for (let b = 1; b <= maxB; b++) {
    if (snap.bundles[b]) s += snap.bundles[b][idx];
  }

  return s;

}



function headerOutput(batch) {
  return acc(batch, 4);
}



const flowPath = path.join(root, 'src/data/sewing/sewing-flow-detail.json');

const flow = JSON.parse(fs.readFileSync(flowPath, 'utf8'));

for (const lane of flow.batches) {

  const snap = SNAPSHOT[lane.batch];

  if (!snap) continue;

  lane.doneCount = headerOutput(lane.batch);

  lane.processes.forEach((p, idx) => {

    p.qtyValue = acc(lane.batch, idx);

    if (idx === lane.processes.length - 1) {

      p.status = acc(lane.batch, idx) > 0 ? 'Running' : 'Waiting';

    } else if (acc(lane.batch, idx) > 0 && acc(lane.batch, idx + 1) === 0) {

      p.status = 'Running';

    } else if (acc(lane.batch, idx) > 0) {

      p.status = 'Done';

    }

  });

}

fs.writeFileSync(flowPath, JSON.stringify(flow, null, 2) + '\n');



const dashPath = path.join(root, 'src/data/sewing/sewing-batch-dashboard.json');

const dash = JSON.parse(fs.readFileSync(dashPath, 'utf8'));

for (const b of dash.batches) {

  const snap = SNAPSHOT[b.batch];

  const lane = flow.batches.find((l) => l.batch === b.batch);

  if (!snap) continue;

  const actual = headerOutput(b.batch);

  const lastProc = lane?.processes?.[lane.processes.length - 1];

  b.currentBundle = snap.lead;

  b.doneCount = actual;

  b.activePcs = actual;

  b.progressPct = Math.min(100, Math.round((actual / ORDER_TARGET) * 100));

  if (lastProc?.actual != null) {

    b.avgActual = lastProc.actual;

  }

}

fs.writeFileSync(dashPath, JSON.stringify(dash, null, 2) + '\n');



console.log('Synced sewing JSON — lead bundle 7 (batch 1–5), order target', ORDER_TARGET);

for (const n of [1, 2, 3, 4, 5, 6, 7]) {

  const s = SNAPSHOT[n];

  const header = headerOutput(n);

  console.log(
    `Batch ${n}: lead=${s.lead} P5=${acc(n, 4)} header=${header} orderPct=${Math.round((header / ORDER_TARGET) * 100)}%`
  );

}


