import { errors } from 'undici';
import { expect } from 'vitest';

const errorExpected = new errors.ResponseError('Response Error', 400, {
  body: { data: 'error occurred' },
  headers: expect.objectContaining({
    connection: 'keep-alive',
    'content-length': '25',
    'content-type': 'application/json',
    'keep-alive': 'timeout=5',
  }),
});

export { errorExpected };
