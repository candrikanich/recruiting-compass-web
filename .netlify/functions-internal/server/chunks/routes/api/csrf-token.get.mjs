import { d as defineEventHandler, s as setCsrfToken } from '../../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'crypto';

const csrfToken_get = defineEventHandler((event) => {
  const token = setCsrfToken(event);
  return {
    token
  };
});

export { csrfToken_get as default };
//# sourceMappingURL=csrf-token.get.mjs.map
