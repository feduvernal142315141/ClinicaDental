import { getDesignedToothPaths } from './components/features/odontogram/teeth-svg-adapter';

const THEME = {
  surfaceDefault: "#FFFFFF",
  outlineStroke: "#4A5568",
  rootFill: "#F7FAFC",
  rootStroke: "#718096",
  highlightStroke: "#C4B89A",
  blueFill: "#3B82F6",
  blueBorder: "#2563EB",
};

const DUMMY_EVENTS = {
    // some predefined colored surfaces like in the screenshot
    // in the screenshot, teeth 18, 13, 12, 11, etc. have blue fills
    18: { oclusal: THEME.blueFill, facial: THEME.surfaceDefault, lingual: THEME.surfaceDefault, mesial: THEME.surfaceDefault, distal: THEME.surfaceDefault },
    13: { oclusal: THEME.blueFill, facial: THEME.blueFill, lingual: THEME.surfaceDefault, mesial: THEME.surfaceDefault, distal: THEME.surfaceDefault },
    12: { oclusal: THEME.surfaceDefault, facial: THEME.blueFill, lingual: THEME.surfaceDefault, mesial: THEME.blueFill, distal: THEME.surfaceDefault },
};

function getSurfaceColor(tooth: number, surface: string) {
    if (DUMMY_EVENTS[tooth] && DUMMY_EVENTS[tooth][surface]) {
        return DUMMY_EVENTS[tooth][surface];
    }
    return THEME.surfaceDefault;
}

function renderToothSVG(num: number, view: "frontal" | "oclusal" | "lateral") {
    const paths = getDesignedToothPaths(num, view);
    if (!paths) return `<!-- No paths for tooth ${num} ${view} -->`;

    const { viewBox, outline, surfaces, roots, highlights } = paths;
    
    let svgStr = `<svg viewBox="${viewBox}" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">`;
    
    // roots
    for (const rootD of roots) {
        svgStr += `<path d="${rootD}" fill="${THEME.rootFill}" stroke="${THEME.rootStroke}" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" pointer-events="none" />`;
    }

    // surfaces
    for (const sp of surfaces) {
        if (!sp.d) continue;
        const color = THEME.surfaceDefault;
        const fillOpacity = 1;
        svgStr += `<path d="${sp.d}" class="surface-${num}-${sp.surface}" fill="${color}" fill-opacity="${fillOpacity}" stroke="${THEME.outlineStroke}" stroke-width="0.5" stroke-linejoin="round" stroke-opacity="0.3" />`;
    }

    // outline
    svgStr += `<path d="${outline}" fill="none" stroke="${THEME.outlineStroke}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" pointer-events="none" />`;

    // highlights
    for (const hlD of highlights) {
        svgStr += `<path d="${hlD}" fill="none" stroke="${THEME.highlightStroke}" stroke-width="0.7" stroke-linecap="round" stroke-linejoin="round" pointer-events="none" />`;
    }

    // No symbol needed for the screenshot right now, unless we want to add one.

    svgStr += `</svg>`;
    return svgStr;
}

function renderRow(teeth: number[], view: "frontal" | "oclusal" | "lateral") {
    const containerClass = {
        frontal: "w-[3.2rem] h-[4.5rem]",
        oclusal: "w-[3.2rem] h-[3.2rem]",
        lateral: "w-[3.2rem] h-[4rem]",
    }[view];

    let row = `<div class="flex gap-0.5">`;
    for (const num of teeth) {
        row += `<div class="${containerClass}">${renderToothSVG(num, view)}</div>`;
    }
    row += `</div>`;
    return row;
}

const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];
const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];

function renderNumbers(arr1: number[], arr2: number[]) {
    let numHtml = `<div class="flex justify-center gap-4 text-xs text-center font-mono text-slate-500">`;
    numHtml += `<div class="flex gap-0.5">`;
    for (const num of arr1) numHtml += `<div class="w-[3.2rem] text-center">${num}</div>`;
    numHtml += `</div><div class="w-px"></div><div class="flex gap-0.5">`;
    for (const num of arr2) numHtml += `<div class="w-[3.2rem] text-center">${num}</div>`;
    numHtml += `</div></div>`;
    return numHtml;
}

let html = `<div class="w-full max-w-7xl mx-auto space-y-8">`;

// Upper Arch
html += `<div class="space-y-2">`;
html += `<div class="text-center text-sm font-medium text-slate-500 mb-4">Arcada Superior</div>`;
html += `<div class="flex justify-center gap-4">${renderRow(upperRight, "frontal")}<div class="w-px bg-slate-200"></div>${renderRow(upperLeft, "frontal")}</div>`;
html += `<div class="flex justify-center gap-4">${renderRow(upperRight, "oclusal")}<div class="w-px bg-slate-200"></div>${renderRow(upperLeft, "oclusal")}</div>`;
html += `<div class="flex justify-center gap-4">${renderRow(upperRight, "lateral")}<div class="w-px bg-slate-200"></div>${renderRow(upperLeft, "lateral")}</div>`;
html += renderNumbers(upperRight, upperLeft);
html += `</div>`;

html += `<div class="border-t-2 border-dashed border-slate-200 my-8"></div>`;

// Lower Arch
html += `<div class="space-y-2">`;
html += `<div class="text-center text-sm font-medium text-slate-500 mb-4">Arcada Inferior</div>`;
html += `<div class="flex justify-center gap-4">${renderRow(lowerRight, "lateral")}<div class="w-px bg-slate-200"></div>${renderRow(lowerLeft, "lateral")}</div>`;
html += `<div class="flex justify-center gap-4">${renderRow(lowerRight, "oclusal")}<div class="w-px bg-slate-200"></div>${renderRow(lowerLeft, "oclusal")}</div>`;
html += `<div class="flex justify-center gap-4">${renderRow(lowerRight, "frontal")}<div class="w-px bg-slate-200"></div>${renderRow(lowerLeft, "frontal")}</div>`;
html += renderNumbers(lowerRight, lowerLeft);
html += `</div>`;

html += `</div>`;

import * as fs from 'fs';
fs.writeFileSync('odontograma-raw.html', html);
console.log("Written to odontograma-raw.html");
