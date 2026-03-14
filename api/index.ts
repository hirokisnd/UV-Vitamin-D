import express, { Request, Response, NextFunction } from 'express';
import { registerRoutes } from './routes';

const app = express();
const log = console.log;

function setupCors(app: express.Express) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
}

function setupBodyParsing(app: express.Express) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
}

function setupRequestLogging(app: express.Express) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: any;

    const originalResJson = res.json;
    res.json = function (bodyJson: any, ...args: any[]) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on('finish', () => {
      if (!path.startsWith('/api')) return;

      const duration = Date.now() - start;
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    });

    next();
  });
}

setupCors(app);
setupBodyParsing(app);
setupRequestLogging(app);

// ルーティングの登録
registerRoutes(app);

// Vercel Serverless Functions 用に app をエクスポート
export default app;
