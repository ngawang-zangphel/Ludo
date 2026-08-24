import { existsSync } from 'fs';
import { extname, join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Request, Response, NextFunction } from 'express';

export function attachClientApp(app: NestExpressApplication): string | null {
  const clientDir = [
    join(__dirname, '../web/browser'),
    join(process.cwd(), 'dist/apps/web/browser'),
  ].find((dir) => existsSync(join(dir, 'index.html')));

  if (!clientDir) {
    return null;
  }

  app.useStaticAssets(clientDir, { index: false });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      next();
      return;
    }
    if (extname(req.path)) {
      next();
      return;
    }
    res.sendFile(join(clientDir, 'index.html'));
  });

  return clientDir;
}
