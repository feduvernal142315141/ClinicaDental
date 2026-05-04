import * as fs from 'fs';

const rawOdontograma = fs.readFileSync('odontograma-raw.html', 'utf8');

const htmlTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Odontograma Animado - Clinic Flow 360</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/TextPlugin.min.js"></script>
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #FAFAFA;
            color: #1E1E1E;
            overflow: hidden;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        
        .cursor-blink { animation: blink 1s step-end infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
    </style>
</head>
<body>

    <div id="stage" class="relative bg-slate-50 flex flex-col" data-composition-id="promo-odontograma" data-start="0" data-duration="25" data-width="1920" data-height="1080" style="width: 1920px; height: 1080px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden;">
        
        <!-- Header Principal -->
        <header class="gs-fade border-b bg-white px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
            <div class="flex items-center gap-4">
                <div class="flex items-center gap-2 font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full text-sm">
                    <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    Consulta en curso: Emilio Fernández
                </div>
                <div class="flex items-center gap-2 text-slate-600 font-mono font-medium border rounded-md px-3 py-1.5 bg-slate-50 text-sm">
                    <i data-lucide="timer" class="w-4 h-4"></i>
                    <span id="timer-text">00:05</span>
                </div>
            </div>
            
            <div class="flex items-center gap-4">
                <div class="text-sm text-slate-500 flex items-center gap-1">
                    Guardado automático <i data-lucide="check" class="w-4 h-4"></i>
                </div>
                <button class="bg-[#e0311f] hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 shadow-sm">
                    <i data-lucide="check-circle" class="w-4 h-4"></i> Finalizar Consulta
                </button>
            </div>
        </header>

        <!-- Sub-navegación -->
        <div class="gs-fade bg-white border-b px-6 py-2 flex gap-6 text-sm font-medium text-slate-500">
            <div class="flex items-center gap-2 text-blue-600 border-b-2 border-blue-600 pb-2 -mb-[9px] cursor-pointer">
                <i data-lucide="stethoscope" class="w-4 h-4"></i> Workspace
            </div>
            <div class="flex items-center gap-2 hover:text-slate-900 cursor-pointer pb-2">
                <i data-lucide="clipboard-list" class="w-4 h-4"></i> Historia Clínica (Lectura)
            </div>
        </div>

        <!-- Contenido Principal -->
        <div class="flex-1 flex overflow-hidden p-6 gap-6 bg-slate-50">
            
            <!-- Columna Izquierda: Formularios -->
            <div class="w-[450px] flex flex-col gap-6 shrink-0 z-10">
                
                <!-- Datos de la Consulta -->
                <div class="gs-left bg-[#f4f7fb] rounded-xl border border-blue-100 p-5 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xs font-bold text-slate-600 tracking-wide">DATOS DE ESTA CONSULTA</h2>
                        <span class="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> En curso
                        </span>
                    </div>

                    <!-- Motivo -->
                    <div class="mb-5">
                        <label class="block text-xs font-bold text-slate-600 mb-2">MOTIVO DE CONSULTA</label>
                        <div class="relative">
                            <textarea id="motivo-input" class="w-full border rounded-lg p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none transition-colors" rows="3" placeholder="Describe el motivo de la consulta..."></textarea>
                            <span id="motivo-cursor" class="absolute top-3 left-3 text-slate-400 cursor-blink hidden">|</span>
                        </div>
                    </div>

                    <!-- Dolor Actual -->
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-2">DOLOR ACTUAL</label>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs text-slate-500 mb-1">Ubicación</label>
                                <div class="relative">
                                    <input type="text" id="ubicacion-input" class="w-full border rounded-lg p-2 text-sm text-slate-700 focus:outline-none bg-white transition-colors duration-300" placeholder="Ej. molar inferior ...">
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs text-slate-500 mb-1">Duración</label>
                                <div class="relative">
                                    <input type="text" id="duracion-input" class="w-full border rounded-lg p-2 text-sm text-slate-700 focus:outline-none bg-white transition-colors duration-300" placeholder="Ej. 2 días">
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs text-slate-500 mb-1">Intensidad (<span id="intensidad-val">0</span>/10)</label>
                                <div class="h-9 flex items-center">
                                    <input type="range" id="intensidad-slider" min="0" max="10" value="0" class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer">
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs text-slate-500 mb-1">Tipo</label>
                                <select id="tipo-select" class="w-full border rounded-lg p-2 text-sm text-slate-500 bg-white focus:outline-none appearance-none transition-colors duration-300">
                                    <option value="" disabled selected>Tipo de dolor</option>
                                    <option value="Punzante">Punzante</option>
                                    <option value="Sordo">Sordo</option>
                                    <option value="Irradiado">Irradiado</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Notas de la Consulta -->
                <div class="gs-left bg-white rounded-xl border p-5 shadow-sm flex-1 flex flex-col">
                    <h2 class="text-xs font-bold text-slate-600 tracking-wide mb-3">NOTAS DE ESTA CONSULTA</h2>
                    
                    <div class="border rounded-lg flex-1 flex flex-col overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                        <!-- Toolbar -->
                        <div class="bg-slate-50 border-b p-2 flex items-center justify-between">
                            <div class="flex items-center gap-1 text-slate-500">
                                <button class="p-1.5 hover:bg-slate-200 rounded"><i data-lucide="bold" class="w-4 h-4"></i></button>
                                <button class="p-1.5 hover:bg-slate-200 rounded"><i data-lucide="italic" class="w-4 h-4"></i></button>
                                <button class="p-1.5 hover:bg-slate-200 rounded"><i data-lucide="underline" class="w-4 h-4"></i></button>
                                <div class="w-px h-4 bg-slate-300 mx-1"></div>
                                <button class="p-1.5 hover:bg-slate-200 rounded"><i data-lucide="list" class="w-4 h-4"></i></button>
                                <button class="p-1.5 hover:bg-slate-200 rounded"><i data-lucide="list-ordered" class="w-4 h-4"></i></button>
                                <div class="w-px h-4 bg-slate-300 mx-1"></div>
                                <button class="p-1.5 hover:bg-slate-200 rounded text-xs font-bold font-serif">H₂</button>
                            </div>
                            <div class="relative">
                                <button id="mic-btn" class="p-1.5 text-slate-500 hover:bg-slate-200 rounded transition-colors relative z-10">
                                    <i data-lucide="mic" class="w-4 h-4" id="mic-icon"></i>
                                </button>
                                <div id="mic-pulse" class="absolute inset-0 bg-red-400 rounded-full opacity-0 pointer-events-none scale-150"></div>
                            </div>
                        </div>
                        
                        <!-- Area de texto -->
                        <div class="p-3 flex-1 relative bg-white">
                            <div id="notes-content" class="text-sm text-slate-700 whitespace-pre-wrap outline-none h-full"></div>
                            <div id="notes-placeholder" class="absolute top-3 left-3 text-sm text-slate-400 pointer-events-none">Escribe aquí las notas del historial...</div>
                            <span id="notes-cursor" class="absolute top-3 left-3 text-slate-700 cursor-blink hidden">|</span>
                        </div>
                    </div>

                    <div class="mt-4 flex justify-end">
                        <button id="save-notes-btn" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-transform">
                            Guardar notas
                        </button>
                    </div>
                </div>
            </div>

            <!-- Columna Derecha: Odontograma -->
            <div class="flex-1 bg-white rounded-xl border shadow-sm flex flex-col gs-right overflow-hidden relative">
                <!-- Odontograma Tabs -->
                <div class="border-b px-8 pt-4 flex gap-8 text-sm font-medium text-slate-500">
                    <div class="text-blue-600 border-b-2 border-blue-600 pb-3">Odontograma</div>
                    <div class="hover:text-slate-900 cursor-pointer pb-3 flex items-center gap-2">Sugerencias <span class="bg-red-500 text-white text-[10px] px-1.5 rounded-full">3</span></div>
                    <div class="hover:text-slate-900 cursor-pointer pb-3 flex items-center gap-2">Diagnósticos <span class="bg-red-500 text-white text-[10px] px-1.5 rounded-full">6</span></div>
                    <div class="hover:text-slate-900 cursor-pointer pb-3 flex items-center gap-2">Planes <span class="bg-red-500 text-white text-[10px] px-1.5 rounded-full">3</span></div>
                    <div class="hover:text-slate-900 cursor-pointer pb-3">Realizados</div>
                </div>

                <!-- Odontograma Grid (Inyectado) -->
                <div class="p-8 flex-1 overflow-y-auto">
                    ${rawOdontograma}
                </div>
                
                <!-- Overlay Promocional -->
                <div id="promo-text-container" class="absolute bottom-10 left-1/2 -translate-x-1/2 z-[70] pointer-events-none w-[1100px] flex flex-col items-center">
                    <div class="bg-slate-900/85 backdrop-blur-lg text-white px-10 py-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 text-center flex flex-col items-center">
                        <p id="promo-text-1" class="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 leading-tight">
                            El odontograma que no te hace perder la paciencia. Un flujo interactivo y visual: seleccionas el ICDAS 6 y el plan de tratamiento se sugiere solo.
                        </p>
                        <p id="promo-text-2" class="text-xl text-blue-400 font-medium mt-3 flex items-center gap-2">
                            <i data-lucide="sparkles" class="w-6 h-6"></i> Magia negra no, eficiencia clínica.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL DIENTE 17 -->
        <div id="modal-backdrop" class="absolute inset-0 bg-slate-900/40 z-[80] flex flex-col items-center justify-center opacity-0 pointer-events-none transition-opacity">
            <div id="tooth-modal" class="bg-white rounded-xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] w-[850px] flex flex-col overflow-hidden transform scale-95 opacity-0">
                <!-- Header -->
                <div class="px-6 py-4 flex justify-between items-start border-b">
                     <div>
                         <h2 class="text-xl font-bold text-slate-800">Diente 17</h2>
                         <p class="text-xs text-slate-500 mt-1">Molar segundo superior derecho</p>
                     </div>
                     <div class="flex items-center gap-4">
                        <span class="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1">Guardado automático <i data-lucide="check" class="w-3 h-3 text-emerald-500"></i></span>
                        <button class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
                     </div>
                </div>
                
                <!-- Status tags -->
                <div class="px-6 py-3 border-b flex items-center gap-2 text-xs">
                    <span class="text-slate-500 font-medium mr-2">Estado Global del Diente</span>
                    <span class="bg-emerald-500 text-white px-2 py-0.5 rounded font-medium">Sano</span>
                    <span class="border px-2 py-0.5 rounded text-slate-400">Ausente</span>
                    <span class="border px-2 py-0.5 rounded text-purple-400 border-purple-200">Implante</span>
                    <span class="border px-2 py-0.5 rounded text-red-400 border-red-200">Endo</span>
                    <span class="border px-2 py-0.5 rounded text-yellow-500 border-yellow-200">Corona</span>
                </div>

                <!-- Tabs -->
                <div class="px-6 border-b flex gap-6 text-sm font-medium text-slate-500 pt-2 relative">
                    <div id="tab-superficies" class="text-blue-600 border-b-2 border-blue-600 pb-3 cursor-pointer relative z-10 transition-colors">Superficies</div>
                    <div id="tab-diagnostico" class="hover:text-slate-900 border-b-2 border-transparent cursor-pointer pb-3 relative z-10 transition-colors">Diagnóstico (ICDAS)</div>
                    <div class="hover:text-slate-900 border-b-2 border-transparent cursor-pointer pb-3">Plan</div>
                    <div class="hover:text-slate-900 border-b-2 border-transparent cursor-pointer pb-3">Realizado</div>
                    <div class="hover:text-slate-900 border-b-2 border-transparent cursor-pointer pb-3">Perio</div>
                    <div class="hover:text-slate-900 border-b-2 border-transparent cursor-pointer pb-3">Historial</div>
                </div>

                <!-- Content Area -->
                <div class="relative h-[380px] bg-white overflow-hidden">
                    
                    <!-- View 1: Superficies -->
                    <div id="view-superficies" class="absolute inset-0 p-6 flex flex-col bg-white">
                        <div class="flex justify-between items-end mb-4">
                            <div>
                                <h3 class="font-bold text-slate-800 text-lg">Diente 17</h3>
                                <p class="text-xs text-slate-500">Posterior · Superior derecho</p>
                            </div>
                            <div class="text-right">
                                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Superficies</p>
                                <p class="text-3xl font-black text-slate-800 leading-none">1</p>
                            </div>
                        </div>
                        <div class="bg-slate-50 border border-slate-100 rounded-lg p-3 mb-6 flex items-center gap-4">
                            <span class="text-sm text-slate-600">Selección actual:</span>
                            <span id="sel-tag" class="bg-emerald-500 text-white text-xs px-3 py-1.5 rounded font-medium opacity-0 flex items-center gap-2"><div class="w-1.5 h-1.5 rounded-full bg-white"></div> O · Sano</span>
                        </div>
                        
                        <div class="flex gap-8">
                            <!-- Cross diagram -->
                            <div class="flex-1 flex flex-col items-center">
                                <p class="text-xs text-slate-400 mb-6 text-center max-w-[200px]">Haga clic en una sección para seleccionar/deseleccionar la superficie.</p>
                                <div class="relative w-52 h-52 flex items-center justify-center">
                                    <svg viewBox="0 0 100 100" class="w-full h-full text-slate-300 drop-shadow-sm">
                                        <!-- Vestibular -->
                                        <polygon points="0,0 100,0 75,25 25,25" fill="white" stroke="currentColor" stroke-width="0.5"/>
                                        <text x="50" y="15" text-anchor="middle" fill="#94a3b8" font-size="8" font-weight="bold">V</text>
                                        <!-- Lingual -->
                                        <polygon points="0,100 100,100 75,75 25,75" fill="white" stroke="currentColor" stroke-width="0.5"/>
                                        <text x="50" y="90" text-anchor="middle" fill="#94a3b8" font-size="8" font-weight="bold">L</text>
                                        <!-- Mesial -->
                                        <polygon points="0,0 25,25 25,75 0,100" fill="white" stroke="currentColor" stroke-width="0.5"/>
                                        <text x="12" y="52" text-anchor="middle" fill="#94a3b8" font-size="8" font-weight="bold">M</text>
                                        <!-- Distal -->
                                        <polygon points="100,0 75,25 75,75 100,100" fill="white" stroke="currentColor" stroke-width="0.5"/>
                                        <text x="88" y="52" text-anchor="middle" fill="#94a3b8" font-size="8" font-weight="bold">D</text>
                                        <!-- Oclusal -->
                                        <rect id="cross-oclusal" x="25" y="25" width="50" height="50" fill="white" stroke="currentColor" stroke-width="0.5" class="transition-colors duration-200" />
                                        <text id="cross-oclusal-text" x="50" y="53" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold" class="transition-colors duration-200">O</text>
                                    </svg>
                                    <div class="absolute -bottom-8">
                                        <span id="cross-tag" class="bg-blue-100 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-full opacity-0 flex items-center gap-1"><i data-lucide="check" class="w-3 h-3"></i> OCLUSAL</span>
                                    </div>
                                </div>
                            </div>
                            <!-- Acciones rapidas -->
                            <div class="w-56 border-l pl-8">
                                <p class="text-sm font-bold text-slate-700 mb-3">Acciones rápidas</p>
                                <div class="grid grid-cols-2 gap-2 mb-2">
                                    <button class="border rounded text-xs py-1.5 text-slate-600 hover:bg-slate-50 font-medium">Marcar todas</button>
                                    <button class="border rounded text-xs py-1.5 text-slate-600 hover:bg-slate-50 font-medium">Desmarcar</button>
                                </div>
                                <button class="w-full border rounded text-xs py-1.5 text-slate-600 mb-2 hover:bg-slate-50 font-medium">Proximales (M+D)</button>
                                <button class="w-full border rounded text-xs py-1.5 text-slate-600 mb-2 hover:bg-slate-50 font-medium">Vestibular</button>
                                <button class="w-full border rounded text-xs py-1.5 text-slate-600 hover:bg-slate-50 font-medium">Lingual</button>
                            </div>
                        </div>
                    </div>

                    <!-- View 2: Diagnostico -->
                    <div id="view-diagnostico" class="absolute inset-0 p-6 flex flex-col bg-slate-50 opacity-0 pointer-events-none">
                        <div class="flex justify-between items-center mb-4 bg-white p-3 rounded-lg border shadow-sm">
                            <div>
                                <h3 class="font-bold text-slate-800 text-sm">Diagnóstico · Diente 17</h3>
                                <p class="text-[10px] text-slate-500">Molar · 1 superficie</p>
                            </div>
                            <div class="flex gap-2">
                                <span class="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded font-medium">Riesgo: Medio</span>
                                <span class="text-[10px] border px-2 py-0.5 rounded text-slate-500 font-medium bg-white">Sano</span>
                            </div>
                        </div>

                        <div class="flex gap-4 flex-1">
                            <!-- Left Column -->
                            <div class="flex-1 flex flex-col gap-4">
                                <!-- Superficie activa -->
                                <div class="bg-white rounded-lg border p-4 flex flex-col gap-3 shadow-sm">
                                    <div class="flex items-center justify-between border-b pb-2">
                                        <span class="text-xs font-bold text-slate-700">Superficie activa</span>
                                        <div class="flex items-center gap-2">
                                            <button class="border text-slate-500 text-[10px] px-2 py-1.5 rounded flex items-center gap-1 font-medium hover:bg-slate-50"><i data-lucide="copy" class="w-3 h-3"></i> Copiar a M/D</button>
                                            <button class="bg-blue-600 text-white text-[10px] px-2 py-1.5 rounded font-medium shadow-sm hover:bg-blue-700">Aplicar a todas</button>
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <div id="diag-surface-box" class="w-10 h-10 rounded bg-emerald-500 text-white flex items-center justify-center font-bold text-sm transition-colors shadow-inner">O</div>
                                    </div>
                                </div>

                                <!-- Caries (ICDAS) -->
                                <div class="bg-white rounded-lg border p-5 shadow-sm flex-1 flex flex-col">
                                    <h4 class="text-xs font-bold text-slate-700 mb-6">Caries (ICDAS)</h4>
                                    
                                    <div class="flex justify-between items-end mb-3">
                                        <span class="text-xs text-slate-500 font-medium">Puntuación ICDAS</span>
                                        <span id="icdas-badge" class="bg-emerald-500 text-white text-[10px] px-3 py-1 rounded font-bold transition-colors">0 - Sano</span>
                                    </div>
                                    
                                    <!-- Slider -->
                                    <div class="relative h-6 mb-3 flex items-center px-2">
                                        <div class="absolute left-2 right-2 h-2 bg-slate-100 rounded-full inset-shadow-sm border"></div>
                                        <div id="icdas-track" class="absolute left-2 h-2 bg-blue-200 rounded-full w-0 transition-all"></div>
                                        <!-- Steps -->
                                        <div class="absolute left-0 right-0 flex justify-between px-1">
                                            <span class="text-[10px] font-mono text-slate-400">0</span>
                                            <span class="text-[10px] font-mono text-slate-400">1</span>
                                            <span class="text-[10px] font-mono text-slate-400">2</span>
                                            <span class="text-[10px] font-mono text-slate-400">3</span>
                                            <span class="text-[10px] font-mono text-slate-400">4</span>
                                            <span class="text-[10px] font-mono text-blue-500 font-bold">5</span>
                                            <span class="text-[10px] font-mono text-blue-600 font-bold">6</span>
                                        </div>
                                        <!-- Thumb -->
                                        <div id="icdas-thumb" class="absolute left-0 w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-md top-1/2 -translate-y-1/2 transition-all cursor-pointer z-20 hover:scale-110"></div>
                                    </div>
                                    
                                    <div id="icdas-desc" class="bg-slate-50 text-[10px] font-medium text-slate-500 p-2.5 rounded border mt-auto transition-colors">
                                        Sin evidencia de caries
                                    </div>
                                </div>
                            </div>

                            <!-- Right Column -->
                            <div class="flex-1 flex flex-col gap-4">
                                <!-- Resumen en vivo -->
                                <div class="bg-white rounded-lg border p-4 shadow-sm">
                                    <h4 class="text-xs font-bold text-slate-700 mb-3">Resumen en vivo</h4>
                                    <div id="live-summary" class="border rounded p-3 text-xs text-slate-600 flex items-center gap-3 transition-colors bg-slate-50">
                                        <span id="live-summary-surface" class="font-black text-slate-400 transition-colors">O</span> 
                                        <span class="text-slate-300"><i data-lucide="arrow-right" class="w-3 h-3"></i></span> 
                                        <span id="live-summary-text" class="font-medium text-slate-500 transition-colors">Sin diagnóstico</span>
                                    </div>
                                </div>

                                <!-- Sugerencias de plan -->
                                <div class="bg-white rounded-lg border p-5 shadow-sm flex-1 flex flex-col">
                                    <h4 class="text-xs font-bold text-slate-700 mb-3">Sugerencias de plan</h4>
                                    
                                    <div id="plan-suggestion" class="bg-emerald-50/50 border border-emerald-100 rounded p-4 mb-auto transition-colors">
                                        <p id="plan-suggestion-title" class="text-xs font-bold text-emerald-700 flex items-center gap-1.5 transition-colors"><i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Superficies sanas</p>
                                        <p id="plan-suggestion-desc" class="text-[10px] text-emerald-600 mt-2 transition-colors">Mantener higiene y controles periódicos</p>
                                    </div>

                                    <button id="btn-crear-plan" class="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-transform mt-4">
                                        Crear Plan ahora <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer Actions -->
                <div class="px-6 py-4 border-t bg-slate-50 flex justify-between items-center">
                    <button class="bg-white border shadow-sm rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 font-medium">Cancelar</button>
                    <div class="flex gap-2">
                        <button class="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2 text-sm font-medium shadow-sm">Guardar</button>
                        <button class="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2 text-sm font-medium flex items-center gap-2 shadow-sm border-l border-blue-500">Guardar e ir a plan <i data-lucide="arrow-right" class="w-4 h-4"></i></button>
                    </div>
                </div>
            </div>
        </div>

        </div>

    </div>

    <script>
        lucide.createIcons();
        gsap.registerPlugin(TextPlugin);

        window.__timelines = window.__timelines || {};
        const tl = gsap.timeline({ paused: true });
        window.__timelines["promo-odontograma"] = tl;

        // 1. Animación de entrada inicial (0.0s - 1.5s)
        tl.from(".gs-fade", { opacity: 0, y: -10, duration: 1.0, ease: "power3.out" }, 0);
        tl.from(".gs-left", { opacity: 0, x: -40, duration: 1.5, ease: "power3.out", stagger: 0.2 }, 0.2);
        tl.from(".gs-right", { opacity: 0, x: 40, duration: 1.5, ease: "power3.out" }, 0.4);

        // Timer animado
        tl.to({ val: 5 }, {
            val: 28,
            duration: 23,
            ease: "none",
            onUpdate: function() {
                const secs = Math.floor(this.targets()[0].val);
                document.getElementById('timer-text').innerText = "00:" + secs.toString().padStart(2, '0');
            }
        }, 0);

        // Auto-llenado de Motivo (escritura) antes de ir al diente
        tl.to("#motivo-input", { borderColor: "#3b82f6", backgroundColor: "#eff6ff", duration: 0.3 }, 2.0);
        tl.set("#motivo-cursor", { display: "block" }, 2.0);
        tl.to("#motivo-input", { 
            text: "Paciente refiere sensibilidad al frío y dolor punzante al masticar en el cuadrante superior derecho.",
            duration: 3.0,
            ease: "none"
        }, 2.3);
        tl.to("#motivo-input", { borderColor: "#e2e8f0", backgroundColor: "#ffffff", duration: 0.3 }, 5.5);
        tl.set("#motivo-cursor", { display: "none" }, 5.5);

        // El texto promocional entra pronto para dar contexto
        tl.from("#promo-text-container", { y: 60, opacity: 0, scale: 0.9, duration: 1.5, ease: "back.out(1.2)" }, 2.5);

        // 1. Hover y Clic en pieza 17 oclusal (automático)
        tl.to(".surface-17-oclusal", { fill: "#f1f5f9", duration: 0.3 }, 4.5);
        
        // 2. Modal appears
        tl.set("#modal-backdrop", { pointerEvents: "auto" }, 5.0);
        tl.to("#modal-backdrop", { opacity: 1, duration: 0.3 }, 5.0);
        tl.to("#tooth-modal", { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.2)" }, 5.1);

        // 3. O turns green
        tl.to("#cross-oclusal", { fill: "#10b981", stroke: "#059669", duration: 0.2 }, 6.0);
        tl.to("#cross-oclusal-text", { fill: "white", duration: 0.2 }, 6.0);
        tl.to("#cross-tag", { opacity: 1, y: 5, duration: 0.3, ease: "back.out" }, 6.0);
        tl.to("#sel-tag", { opacity: 1, duration: 0.2 }, 6.1);

        // Switch tab a Diagnóstico
        tl.to("#tab-superficies", { borderColor: "transparent", color: "#64748b", duration: 0.2 }, 6.8);
        tl.to("#tab-diagnostico", { borderColor: "#2563eb", color: "#1e3a8a", duration: 0.2 }, 6.8);
        tl.to("#view-superficies", { opacity: 0, duration: 0.2 }, 6.8);
        tl.set("#view-diagnostico", { pointerEvents: "auto" }, 7.0);
        tl.to("#view-diagnostico", { opacity: 1, duration: 0.3 }, 7.0);

        // 5. Slider a 6 (automático)
        tl.to("#icdas-thumb", { left: "100%", duration: 0.5, ease: "power2.out" }, 8.0);
        tl.to("#icdas-track", { width: "100%", backgroundColor: "#9f1239", duration: 0.5, ease: "power2.out" }, 8.0);
        tl.to("#icdas-badge", { innerText: "6 - Cavitación extensa", backgroundColor: "#9f1239", duration: 0.2 }, 8.3);
        tl.set("#icdas-desc", { innerText: "Cavitación extensa con dentina visible", color: "#9f1239", backgroundColor: "#fff1f2", borderColor: "#fecdd3" }, 8.3);
        
        tl.to("#diag-surface-box", { backgroundColor: "#9f1239", duration: 0.2 }, 8.3);
        tl.set("#diag-surface-box", { innerText: "O (6)" }, 8.4);
        
        tl.to("#live-summary", { backgroundColor: "#fff1f2", borderColor: "#fecdd3", duration: 0.2 }, 8.4);
        tl.to("#live-summary-surface", { color: "#9f1239", duration: 0.2 }, 8.4);
        tl.set("#live-summary-text", { innerText: "6 - Cavitación extensa", color: "#be123c" }, 8.4);

        tl.to("#plan-suggestion", { backgroundColor: "#fff1f2", borderColor: "#fecdd3", duration: 0.2 }, 8.5);
        tl.set("#plan-suggestion-title", { innerHTML: '<i data-lucide="alert-circle" class="w-3.5 h-3.5"></i> Restauración extensa / Onlay / Endo', color: "#9f1239" }, 8.5);
        tl.set("#plan-suggestion-desc", { innerText: "Caries con cavitación extensa - evaluar endodoncia si hay síntomas", color: "#be123c" }, 8.5);

        // 6. Button click effect
        tl.to("#btn-crear-plan", { scale: 0.96, duration: 0.1 }, 9.5);
        tl.to("#btn-crear-plan", { scale: 1, duration: 0.1 }, 9.6);

        // 7. Modal closes
        tl.to("#tooth-modal", { opacity: 0, scale: 0.95, duration: 0.3, ease: "power2.in" }, 10.0);
        tl.to("#modal-backdrop", { opacity: 0, pointerEvents: "none", duration: 0.4 }, 10.1);

        // Update main odontogram piece 17
        tl.to(".surface-17-oclusal", { fill: "#9f1239", fillOpacity: 0.9, duration: 0.4 }, 10.2);
        tl.to(".surface-17-mesial", { fill: "#9f1239", fillOpacity: 0.9, duration: 0.4 }, 10.3);

        // 8. Auto-fill "Dolor Actual"
        tl.to("#ubicacion-input", { borderColor: "#10b981", backgroundColor: "#ecfdf5", duration: 0.4 }, 11.0);
        tl.to("#ubicacion-input", { value: "Pieza 17 (ICDAS 6)", duration: 0.1, ease: "none" }, 11.4);
        tl.to("#ubicacion-input", { borderColor: "#e2e8f0", backgroundColor: "#ffffff", duration: 0.4 }, 11.6);

        tl.to("#tipo-select", { borderColor: "#10b981", backgroundColor: "#ecfdf5", duration: 0.4 }, 12.0);
        tl.set("#tipo-select", { value: "Punzante" }, 12.4);
        tl.to("#tipo-select", { borderColor: "#e2e8f0", backgroundColor: "#ffffff", duration: 0.4 }, 12.6);

        // 9. Auto-fill "Notas" (Dictado por voz)
        tl.set("#notes-placeholder", { display: "none" }, 13.0);
        
        // Encender mic
        tl.to("#mic-btn", { color: "#ef4444", backgroundColor: "#fee2e2", duration: 0.3 }, 13.0);
        tl.to("#mic-pulse", { opacity: 0.6, scale: 1.8, duration: 0.8, repeat: 6, yoyo: true, ease: "power1.inOut" }, 13.0);
        
        const planText = "PLAN DE TRATAMIENTO AUTOMÁTICO:\\n- Diagnóstico: ICDAS 6 en pieza 17 (cavitación extensa).\\n- Procedimiento: Eliminación de tejido cariado y restauración extensa / Onlay.\\n- Observaciones: Riesgo de compromiso pulpar. Evaluar necesidad de endodoncia durante la intervención.";
        
        // Escribe simulando dictado
        tl.to("#notes-content", {
            text: planText,
            duration: 5.0,
            ease: "none"
        }, 13.5);

        // Apagar mic
        tl.to("#mic-btn", { color: "#64748b", backgroundColor: "transparent", duration: 0.3 }, 18.5);
        tl.to("#mic-pulse", { opacity: 0, scale: 1.5, duration: 0.3 }, 18.5);

        // Auto guardar
        tl.to("#save-notes-btn", { scale: 0.95, duration: 0.1 }, 19.0);
        tl.to("#save-notes-btn", { scale: 1, backgroundColor: "#10B981", duration: 0.2 }, 19.1);
        tl.set("#save-notes-btn", { innerText: "Plan Generado" }, 19.1);

        // Arrancar
        setTimeout(() => {
            if (!window.__hyperframes) {
                tl.play();
            }
        }, 100);
    </script>
</body>
</html>
`;

fs.writeFileSync('docs/odontograma-animado.html', htmlTemplate);
console.log("HTML generated at docs/odontograma-animado.html");
