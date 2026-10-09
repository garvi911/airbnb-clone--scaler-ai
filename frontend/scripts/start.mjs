import { cpSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const output = resolve('.next/standalone');
cpSync(resolve('public'), resolve(output, 'public'), { recursive: true });
cpSync(resolve('.next/static'), resolve(output, '.next/static'), { recursive: true });
process.env.HOSTNAME ||= '127.0.0.1';
process.env.PORT ||= '3000';
await import(pathToFileURL(resolve(output, 'server.js')).href);
