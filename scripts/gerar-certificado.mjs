/**
 * Gera um certificado self-signed para o servidor de desenvolvimento.
 *
 * Existe por causa do microfone: o navegador so libera getUserMedia em
 * "origem segura", o que significa localhost ou https. Sem isso, o chat de voz
 * funciona na sua maquina mas nao para quem entra pelo IP da rede.
 *
 * O certificado nao e assinado por ninguem, entao cada navegador vai mostrar um
 * aviso na primeira visita -- e so aceitar. Depois de aceito, a origem conta
 * como segura e o microfone funciona.
 *
 * Rode de novo quando o IP da sua maquina mudar:  npm run cert
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'certs');

const ips = ['127.0.0.1'];
for (const addrs of Object.values(networkInterfaces())) {
  for (const a of addrs || []) {
    if (a.family === 'IPv4' && !a.internal && !ips.includes(a.address)) ips.push(a.address);
  }
}

const san = ['DNS:localhost', ...ips.map((ip) => `IP:${ip}`)].join(',');

mkdirSync(destino, { recursive: true });
const chave = join(destino, 'key.pem');
const cert = join(destino, 'cert.pem');

try {
  execFileSync(
    'openssl',
    [
      'req', '-x509',
      '-newkey', 'rsa:2048',
      '-nodes',
      '-keyout', chave,
      '-out', cert,
      '-days', '365',
      '-subj', '/CN=VoxelCraft Dev',
      '-addext', `subjectAltName=${san}`,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
} catch (e) {
  console.error('Falhou ao chamar o openssl. Ele esta instalado e no PATH?');
  console.error(String(e.stderr || e.message));
  process.exit(1);
}

// Um lembrete dentro da propria pasta, caso alguem esbarre nela depois.
writeFileSync(
  join(destino, 'LEIA-ME.txt'),
  [
    'Certificado de desenvolvimento, gerado por: npm run cert',
    '',
    'NAO comite esses arquivos: key.pem e a chave privada.',
    'A pasta inteira esta no .gitignore.',
    '',
    'Enderecos cobertos: ' + san,
  ].join('\n')
);

console.log('Certificado gerado em certs/');
console.log('Vale para: ' + san);
console.log('');
console.log('Agora suba o servidor com:  npm run dev');
for (const ip of ips.slice(1)) {
  console.log(`Na rede, os outros entram por:  https://${ip}:3000`);
}
if (ips.length === 1) {
  console.log('Nenhum IP de rede encontrado: voce esta sem conexao de rede?');
}
if (!existsSync(cert)) process.exit(1);
