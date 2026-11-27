'use strict';
const { spawnSync } = require('node:child_process');
const result = spawnSync(process.execPath, ['--test', 'backend/server.test.js'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
