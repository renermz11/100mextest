# 100 Mex Dijeron — Implementación básica (HTML + JS)

Esto es una implementación simple de un formato tipo "100 mexicanos dijeron" con dos vistas:

- `index.html` — pantalla pública para proyectar (muestra pregunta y respuestas; las respuestas están ocultas hasta que el admin las revele).
- `admin.html` — vista de control (envía pregunta y respuestas, revela individualmente o todo).

Cómo funciona:
- Las dos páginas usan la API BroadcastChannel (`mex100_channel`) para comunicarse cuando están abiertas en el mismo origen (mismo host/puerto). Esto permite usar solo HTML/JS sin servidor si abres ambos archivos en el mismo navegador.

Limitaciones:
- Si quieres usar la pantalla pública y el admin en dispositivos diferentes, necesitarás servir los archivos desde un servidor HTTP (mismo origen) y ambos dispositivos deben acceder al mismo host/puerto, o bien añadir un servidor (WebSocket) para comunicar entre distintas máquinas. Esto simple demo no incluye servidor.

Cómo probar (recomendado: servidor local):

1) Abrir un servidor estático en la carpeta del proyecto:

PowerShell (Windows):

```powershell
# con Python (si tienes Python instalado)
python -m http.server 8000;
# o con npm http-server (si tienes node):
# npx http-server -p 8000
```

2) Abrir en el navegador dos pestañas/ventanas (o en la pantalla proyectada y en tu laptop):
- `http://localhost:8000/index.html` (pantalla pública)
- `http://localhost:8000/admin.html` (vista admin)

3) En la vista admin escribe la pregunta y las respuestas (una por línea) y presiona "Enviar a pantalla". Usa los botones "Revelar" para cada respuesta. Atajos: 1..9 para revelar, A para revelar todo, R para reset.

Strikes / Equis
- En la vista admin hay botones para marcar un "Equis (Strike)", deshacer un strike y resetear los strikes.
- La pantalla pública mostrará una equis grande cuando se marque un strike y mantiene un contador de strikes (0..3). El contador se envía por BroadcastChannel junto con los eventos.

Sonido
- He añadido sonidos sintetizados con WebAudio para mejorar la retroalimentación:
	- Revelar respuesta: un "chime" corto.
	- Strike: un "buzzer" corto.
- Los sonidos se reproducen en la pantalla pública cuando recibe los eventos y también localmente en la vista admin cuando el operador pulsa revelar o strike.
- Nota importante: la API WebAudio requiere a menudo una interacción del usuario (un click o botón) en algunos navegadores antes de permitir reproducción automática. Si no oyes sonido, haz click en la ventana admin o pública una vez para dar permiso y vuelve a intentarlo.

Si quieres que yo añada soporte para múltiples dispositivos (via WebSocket o WebRTC) o mejoras visuales (puntuaciones, animaciones, temporizador), dime y lo implemento.
