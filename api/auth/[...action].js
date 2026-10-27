import { handleAuthApi } from '../../server/authHandler.js';

export default async function handler(req, res) {
  return handleAuthApi(req, res);
}
