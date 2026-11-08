// Local RGS for GETAWAY GANG: serves the real math books over the Stake Engine RGS API.
//
//   node frontend/dev-rgs/server.mjs            (port 7771)
//
// Uses @slot-engine/lgs (vendor/slot-engine) with a custom GameMath that reads the dev book set
// built by build_dev_books.py (a stratified sample of the published 1M-book math).
// Prints a launch URL for the frontend. Force any feature with:
//   curl -X PUT localhost:7770/lgs/sessions/<id>/force -H 'content-type: application/json' -d '{"force":{"bookId":123}}'
// Book ids per feature are listed in data/showcase.json.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import http from 'node:http';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LGS = path.join(HERE, '../../vendor/slot-engine/packages/lgs/dist/index.mjs');
const { EngineLgs, InMemoryStorage } = await import(LGS);
const DATA = path.join(HERE, 'data');
// The web-sdk RGS client always calls https://<rgs_url>. The LGS speaks plain http on HTTP_PORT, and a
// small TLS proxy with a self-signed certificate serves it on PORT (accept the certificate once in the
// browser by opening https://localhost:7771/lgs).
const PORT = Number(process.env.PORT ?? 7771);
const HTTP_PORT = Number(process.env.HTTP_PORT ?? 7770);
const FRONTEND = process.env.FRONTEND_URL ?? 'http://localhost:3010';

async function loadBooks(mode = 'base') {
	const books = new Map();
	const rl = readline.createInterface({ input: fs.createReadStream(path.join(DATA, `books_${mode}.jsonl`)) });
	for await (const line of rl) {
		if (!line) continue;
		const b = JSON.parse(line);
		books.set(b.id, b.events);
	}
	const rows = fs
		.readFileSync(path.join(DATA, `lookUpTable_${mode}_0.csv`), 'utf8')
		.trim()
		.split('\n')
		.map((l) => l.split(',').map(Number))
		.map(([bookId, weight, payoutCents]) => ({ bookId, weight, payoutCents }));
	return { books, rows };
}

function createMath({ books, rows }) {
	const cumulative = [];
	let total = 0;
	for (const r of rows) cumulative.push((total += r.weight));
	const byId = new Map(rows.map((r) => [r.bookId, r]));
	const outcome = (r) => ({ bookId: r.bookId, payoutCents: r.payoutCents, events: books.get(r.bookId) });
	return {
		async pick(_mode, force) {
			if (force && 'bookId' in force) {
				const r = byId.get(force.bookId);
				if (!r) throw new Error(`book ${force.bookId} is not in the dev book set`);
				return outcome(r);
			}
			if (force && 'payoutMultiplier' in force) {
				const target = Math.round(force.payoutMultiplier * 100);
				const best = rows.reduce((a, b) => (Math.abs(b.payoutCents - target) < Math.abs(a.payoutCents - target) ? b : a));
				return outcome(best);
			}
			const x = Math.random() * total;
			let lo = 0;
			let hi = cumulative.length - 1;
			while (lo < hi) {
				const mid = (lo + hi) >> 1;
				if (cumulative[mid] > x) hi = mid;
				else lo = mid + 1;
			}
			return outcome(rows[lo]);
		},
		async read(_mode, bookId) {
			const r = byId.get(bookId);
			return r ? outcome(r) : undefined;
		},
	};
}

// Bet modes and prices from the published math index.json (base + the bonus buys).
const INDEX = path.join(HERE, '../../math/games/getaway_gang/library/publish_files/index.json');
const MODES = Object.fromEntries(
	(fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, 'utf8')).modes : [{ name: 'base', cost: 1 }]).map((m) => [
		m.name,
		{ cost: m.cost, buy: m.name !== 'base' },
	]),
);
const perMode = {};
for (const m of Object.keys(MODES)) {
	if (fs.existsSync(path.join(DATA, `books_${m}.jsonl`))) perMode[m] = createMath(await loadBooks(m));
}
for (const m of Object.keys(perMode)) console.log(`mode ${m}: loaded`);
const math = {
	pick: (mode, force) => (perMode[String(mode).toLowerCase()] ?? perMode.base).pick(mode, force),
	read: (mode, bookId) => (perMode[String(mode).toLowerCase()] ?? perMode.base).read(mode, bookId),
};
const lgs = new EngineLgs({
	storage: new InMemoryStorage(),
	port: HTTP_PORT,
	defaultCurrency: 'USD',
	balance: { starting: 10000 },
	// max is the largest total cost of one round (bet x mode price): 1,000 lets every buy run at a $1 bet
	bets: { min: 0.1, max: 1000, step: 0.1, default: 1, levels: [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100] },
	jurisdiction: { displayRTP: true },
});
lgs.registerGame({
	id: 'getaway_gang',
	name: 'Getaway Gang: One Last Job!',
	// The web-sdk client sends the mode key upper-cased ("BASE"); the math publishes "base".
	modes: Object.fromEntries(
		Object.entries(MODES)
			.filter(([m]) => perMode[m])
			.flatMap(([m, v]) =>
				[m, m.toUpperCase()].map((k) => [k, { name: k, cost: v.cost, rtp: 0.96, isBonusBuy: v.buy, isFeature: !v.buy }]),
			),
	),
	math,
});
await lgs.start();

const certDir = path.join(HERE, '.cert');
const keyFile = path.join(certDir, 'key.pem');
const certFile = path.join(certDir, 'cert.pem');
if (!fs.existsSync(certFile)) {
	fs.mkdirSync(certDir, { recursive: true });
	execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '825', '-subj', '/CN=localhost',
		'-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1', '-keyout', keyFile, '-out', certFile], { stdio: 'ignore' });
}
https
	.createServer({ key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) }, (req, res) => {
		const upstream = http.request(
			{ host: '127.0.0.1', port: HTTP_PORT, path: req.url, method: req.method, headers: { ...req.headers, host: `localhost:${PORT}` } },
			(up) => {
				res.writeHead(up.statusCode ?? 502, up.headers);
				up.pipe(res);
			},
		);
		upstream.on('error', () => res.writeHead(502).end());
		req.pipe(upstream);
	})
	.listen(PORT);

const res = await fetch(`http://localhost:${HTTP_PORT}/lgs/sessions`, {
	method: 'POST',
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify({ gameId: 'getaway_gang' }),
});
const session = await res.json();
console.log(`Modes: ${Object.keys(perMode).join(', ')}`);
console.log(`Session: ${session.sessionID}`);
console.log(`HTTPS RGS on https://localhost:${PORT} (plain http management API on :${HTTP_PORT})`);
console.log(`Play: ${FRONTEND}/?${session.launchQuery.replace(`localhost%3A${HTTP_PORT}`, `localhost%3A${PORT}`)}`);
