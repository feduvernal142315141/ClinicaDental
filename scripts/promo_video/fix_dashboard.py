import re

with open('docs/dashboard-animado.html', 'r') as f:
    content = f.read()

# 1. Add GSAP
content = content.replace('</head>', '<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>\n</head>')

# 2. Modify body
content = re.sub(r'<body.*?>', '<body class="bg-slate-100 flex items-center justify-center min-h-screen m-0">\n    <div id="stage" class="relative" data-composition-id="promo-dashboard" data-start="0" data-duration="10" data-width="1920" data-height="1080" style="width: 1920px; height: 1080px; background-color: #FAFAFA; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden; padding: 4rem;">', content)

content = content.replace('</body>', '    </div>\n</body>')

# 3. Remove CSS animations section
content = re.sub(r'/\* Keyframes para animaciones.*?\*/.*?(/\* Barras de alertas \*/)', r'\1', content, flags=re.DOTALL)
content = content.replace('opacity: 0; /* Inicialmente oculto */', '')

# 4. Remove classes from elements
content = re.sub(r'\bopacity-0\b', '', content)
content = re.sub(r'\banimate-fade\b', 'gs-fade', content)
content = re.sub(r'\banimate-left\b', 'gs-left', content)
content = re.sub(r'\banimate-right\b', 'gs-right', content)
content = re.sub(r'\banimate-bottom\b', 'gs-bottom', content)
content = re.sub(r'\bdelay-\d+\b', '', content)
# Clean up multiple spaces
content = re.sub(r' +', ' ', content)
content = content.replace(' class=" "', '')

# 5. Add text overlay
text_overlay = """
        <!-- Texto Promocional Animado -->
        <div id="promo-text-container" class="absolute bottom-40 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-[1600px] flex flex-col items-center">
            <div class="bg-slate-900/85 backdrop-blur-lg text-white px-10 py-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 text-center flex flex-col items-center">
                <p id="promo-text-1" class="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 leading-tight">
                    ¿Sigues perdiendo dinero por citas olvidadas y expedientes en papel que nadie entiende?
                </p>
                <p id="promo-text-2" class="text-xl text-blue-400 font-medium mt-2 flex items-center gap-2">
                    <i data-lucide="zap" class="w-6 h-6"></i> Bienvenido al siglo XXI. Esto es Clinic Flow 360.
                </p>
            </div>
        </div>
"""
content = content.replace('    <script>\n        lucide.createIcons();\n    </script>', text_overlay + '\n    <script>\n        lucide.createIcons();\n\n        window.__timelines = window.__timelines || {};\n        const tl = gsap.timeline({ paused: true });\n        window.__timelines["promo-dashboard"] = tl;\n\n        tl.from(".gs-fade", { opacity: 0, y: 10, duration: 1.5, ease: "power3.out" }, 0.3);\n        tl.from(".gs-left", { opacity: 0, x: -60, duration: 1.5, ease: "power3.out", stagger: 0.8 }, 1.2);\n        tl.from(".gs-bottom", { opacity: 0, y: 40, duration: 1.5, ease: "power3.out", stagger: 0.4 }, 1.2);\n        tl.from(".gs-right", { opacity: 0, x: 60, duration: 1.5, ease: "power3.out", stagger: 0.8 }, 2.4);\n\n        // Animación de Texto Promocional\n        tl.from("#promo-text-container", { y: 60, opacity: 0, scale: 0.9, duration: 1.0, ease: "back.out(1.2)" }, 4.5);\n        tl.from("#promo-text-1", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out" }, 4.8);\n        tl.from("#promo-text-2", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out" }, 5.1);\n\n        setTimeout(() => {\n            if (!window.__hyperframes) {\n                tl.play();\n            }\n        }, 100);\n    </script>')

with open('docs/dashboard-animado.html', 'w') as f:
    f.write(content)

