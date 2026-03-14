import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';

const wss = new WebSocketServer({ port: 3333 });

wss.on('connection', (ws) => {
  console.log('[Hot Reload] Extension connected');
});

const distPath = path.resolve(process.cwd(), './dist');

if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}

let timeout;
fs.watch(distPath, { recursive: true }, (eventType, filename) => {
  const isManifest = filename && filename.includes('manifest.json');
  if (filename && !isManifest) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      console.log(`[Hot Reload] File changed: ${filename}, notifying extension...`);
      wss.clients.forEach((client) => {
        if (client.readyState === 1) { // OPEN
          client.send('reload');
        }
      });
    }, 500);
  }
});

console.log('[Hot Reload] Watching dist/ for changes and WS on port 3333...');
