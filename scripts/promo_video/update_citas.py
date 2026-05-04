import re

with open("/home/luisballagas/Documentos/kodewave-solutions/front-clinic/docs/citas-animado.html", "r", encoding="utf-8") as f:
    html = f.read()

# Replace body wrap with id="stage"
html = html.replace('<body class="flex flex-col h-screen relative">', '''<body class="bg-slate-100 flex items-center justify-center min-h-screen m-0">
    <div id="stage" class="flex flex-col relative" data-composition-id="promo-citas" data-start="0" data-duration="10" data-width="1920" data-height="1080" style="width: 1920px; height: 1080px; background-color: #ffffff; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden;">''')

html = html.replace('</body>', '''    </div>\n</body>''')

# Add GSAP
gsap_script = '<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>'
html = html.replace('</head>', f'{gsap_script}\n</head>')

# Remove CSS animations
html = re.sub(r'/\* --- Animaciones Base de la UI ---\s*\*/.*?/\* --- Animaciones de Textos Promocionales \(Modernas y Frescas\) ---\s*\*/', '/* --- Animaciones removidas para delegar a GSAP --- */', html, flags=re.DOTALL)
html = re.sub(r'@keyframes slideUpMask \{.*?\}', '', html, flags=re.DOTALL)
html = re.sub(r'@keyframes popInSoft \{.*?\}', '', html, flags=re.DOTALL)
html = re.sub(r'\.promo-modern-[0-9] \{.*?\}', '', html)
html = re.sub(r'\.animate-agenda \{.*?\}', '', html)
html = re.sub(r'\.delay-agenda \{.*?\}', '', html)
html = re.sub(r'\.animate-paciente \{.*?\}', '', html)
html = re.sub(r'\.delay-p[0-9] \{.*?\}', '', html)
html = re.sub(r'\.animate-historial \{.*?\}', '', html)
html = re.sub(r'\.delay-h[0-9] \{.*?\}', '', html)
html = html.replace('overflow: hidden; \n            margin: 0;\n            height: 100vh;', '')

# Remove utility classes from elements
classes_to_remove = ["animate-agenda", "delay-agenda", "animate-paciente", "animate-historial", "delay-p1", "delay-p2", "delay-p3", "delay-p4", "delay-p5", "delay-p6", "delay-p7", "delay-h1", "delay-h2", "delay-h3", "promo-modern-1", "promo-modern-2", "promo-modern-3", "promo-modern-4"]
for c in classes_to_remove:
    html = html.replace(f' {c}', '')
    html = html.replace(f'{c} ', '')

# Add IDs for GSAP
html = html.replace('Tu agenda.', '<span id="promo-t1" class="inline-block">Tu agenda.</span>')
html = html.replace('Tus pacientes.', '<span id="promo-t2" class="inline-block">Tus pacientes.</span>')
html = html.replace('Y su historial.', '<span id="promo-t3" class="inline-block">Y su historial.</span>')

html = html.replace('<div class="text-xl font-bold text-slate-600', '<div id="promo-t4" class="text-xl font-bold text-slate-600')

html = html.replace('<header class="border-b', '<header id="app-header" class="border-b')
html = html.replace('<aside class="w-[280px]', '<aside id="app-sidebar" class="w-[280px]')
html = html.replace('<div class="px-4 py-2 flex items-center justify-between"', '<div id="app-toolbar" class="px-4 py-2 flex items-center justify-between"')
html = html.replace('<div class="calendar-wrapper', '<div id="app-calendar" class="calendar-wrapper')

html = html.replace('class="event-card', 'class="event-card gs-card')
html = html.replace('class="tag-', 'class="gs-tag tag-')

# Make sure fixed is absolute inside stage
html = html.replace('<div class="fixed bottom-12 left-1/2', '<div class="absolute bottom-[200px] left-1/2')

# Add GSAP Script
gsap_logic = """
    <script>
        lucide.createIcons();

        // Inicializar Timeline GSAP para HyperFrames
        window.__timelines = window.__timelines || {};
        const tl = gsap.timeline({ paused: true });
        window.__timelines["promo-citas"] = tl;

        // Base UI
        tl.from("#app-header", { opacity: 0, y: -20, duration: 0.8, ease: "power2.out" }, 0.5);
        tl.from("#app-sidebar", { opacity: 0, x: -40, duration: 0.8, ease: "power2.out" }, 0.6);
        tl.from("#app-toolbar", { opacity: 0, duration: 0.8, ease: "power2.out" }, 0.7);
        tl.from("#app-calendar", { opacity: 0, duration: 0.8, ease: "power2.out" }, 0.8);

        // Grid contents
        tl.from(".grid-header", { opacity: 0, y: 10, duration: 0.5, stagger: 0.05, ease: "power2.out" }, 1.0);
        tl.from(".grid-time", { opacity: 0, x: -10, duration: 0.5, stagger: 0.02, ease: "power2.out" }, 1.2);

        // Kinetic Typography Promo 1
        tl.from("#promo-t1", { 
            yPercent: 120, 
            skewY: 5, 
            opacity: 0, 
            filter: "blur(8px)", 
            duration: 1.2, 
            ease: "power3.out" 
        }, 0.5);

        // Tarjetas
        tl.from(".gs-card", {
            y: 40,
            opacity: 0,
            duration: 1.0,
            stagger: { amount: 1.5, from: "random" },
            ease: "power3.out"
        }, 2.0);

        // Kinetic Typography Promo 2
        tl.from("#promo-t2", { 
            yPercent: 120, 
            skewY: 5, 
            opacity: 0, 
            filter: "blur(8px)", 
            duration: 1.2, 
            ease: "power3.out" 
        }, 2.3);

        // Etiquetas
        tl.from(".gs-tag", {
            scale: 0.5,
            opacity: 0,
            duration: 0.6,
            stagger: { amount: 1.0, from: "start" },
            ease: "back.out(1.5)"
        }, 5.0);

        // Kinetic Typography Promo 3
        tl.from("#promo-t3", { 
            yPercent: 120, 
            skewY: 5, 
            opacity: 0, 
            filter: "blur(8px)", 
            duration: 1.2, 
            ease: "power3.out" 
        }, 4.8);

        // Kinetic Typography Promo 4
        tl.from("#promo-t4", { 
            scale: 0.9, 
            opacity: 0, 
            filter: "blur(4px)", 
            duration: 1.0, 
            ease: "power3.out" 
        }, 5.6);

    </script>
</body>
"""

html = html.replace('    <script>\n        lucide.createIcons();\n    </script>\n</body>', gsap_logic)

with open("/home/luisballagas/Documentos/kodewave-solutions/front-clinic/docs/citas-animado.html", "w", encoding="utf-8") as f:
    f.write(html)

print("Migration completed.")
