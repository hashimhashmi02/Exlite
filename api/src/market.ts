import fetch from 'node-fetch';
import WebSocket from 'ws';
import type { Request, Response } from 'express';

type KlineRow = [ number, string, string, string, string, string, string, string, string, string, string, string ];

const BINANCE_REST = 'https://api.binance.com/api/v3';
const BINANCE_WS   = 'wss://stream.binance.com:9443/ws';

export async function proxyKlines(req: Request, res: Response) {
  const symbol = String(req.query.symbol || 'BTCUSDT').toUpperCase();
  const interval = String(req.query.interval || '1m');
  const limit = Math.min(Math.max(Number(req.query.limit || 200), 1), 1000);

  const url = `${BINANCE_REST}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const r = await fetch(url);
  if (!r.ok) return res.status(r.status).json({ error: `binance ${r.status}` });

  const rows = (await r.json()) as KlineRow[];

  const out = rows.map(k => ([
    k[0],
    Number(k[1]),
    Number(k[2]),
    Number(k[3]),
    Number(k[4]),
    Number(k[5]),
  ] as const));

  res.json(out);
}

export async function proxyTicker(req: Request, res: Response) {
  const symbol = String(req.query.symbol || 'BTCUSDT').toUpperCase();
  const r = await fetch(`${BINANCE_REST}/ticker/price?symbol=${symbol}`);
  if (!r.ok) return res.status(r.status).json({ error: `binance ${r.status}` });
  const j = await r.json() as { symbol: string; price: string };
  res.json({ symbol: j.symbol, price: Number(j.price) });
}

export function streamKlinesSSE(req: Request, res: Response) {
  const symbol = String(req.query.symbol || 'BTCUSDT').toUpperCase();
  const topic  = `${symbol.toLowerCase()}@kline_1m`;
  const wsUrl  = `${BINANCE_WS}/${topic}`;


  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const ws = new WebSocket(wsUrl);

  const ping = setInterval(() => {
    try { res.write(':\n\n'); } catch {}
  }, 15000);

  ws.on('open', () => {
 
    res.write(`event: open\ndata: {"ok":true}\n\n`);
  });

  ws.on('message', (buf) => {
    try {
      const m = JSON.parse(buf.toString());
   
      const k = m.k;
      if (!k) return;
      const payload = {
        t: k.t,            
        T: k.T,            
        o: Number(k.o),
        h: Number(k.h),
        l: Number(k.l),
        c: Number(k.c),
        v: Number(k.v),
        isFinal: !!k.x,
      };
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch {}
  });

  ws.on('close', () => {
    clearInterval(ping);
    try { res.end(); } catch {}
  });
  ws.on('error', () => {
    clearInterval(ping);
    try { res.end(); } catch {}
  });

  req.on('close', () => {
    clearInterval(ping);
    try { ws.close(); } catch {}
  });
}
