import fs from 'node:fs';
import deepmerge from 'deepmerge';

const packageJson = JSON.parse(fs.readFileSync('../package.json', 'utf8'));

/**
 * After changing, please reload the extension at `chrome://extensions`
 * @type {chrome.runtime.ManifestV3}
 */
const manifest = {
  manifest_version: 3,
  name: 'PromptBridge',
  version: packageJson.version,
  description: packageJson.description,
  host_permissions: ['<all_urls>'],
  permissions: [
    'storage',
    'scripting',
    'tabs',
    'activeTab',
    'debugger',
    'unlimitedStorage',
    'webNavigation',
    'sidePanel'
  ],
  background: {
    service_worker: 'background.iife.js',
    type: 'module'
  },
  action: {
    default_title: 'PromptBridge - Click to open side panel',
  },
  side_panel: {
    default_path: 'side-panel/index.html'
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      all_frames: true,
      js: ['content/index.iife.js'],
      run_at: 'document_idle'
    }
  ],
  web_accessible_resources: [
    {
      resources: ['*.js', '*.css'],
      matches: ['*://*/*']
    }
  ]
};

export default manifest;
