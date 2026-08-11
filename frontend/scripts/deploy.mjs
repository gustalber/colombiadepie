import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.AWS_PAGER = '';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const DEPLOY_ENV_KEYS = new Set([
  'AWS_PROFILE',
  'S3_BUCKET_PROD',
  'S3_BUCKET_STAGING',
  'CLOUDFRONT_DIST_ID_PROD',
  'CLOUDFRONT_DIST_ID_STAGING',
  'SKIP_CLOUDFRONT_INVALIDATION',
]);

function loadDeployEnv() {
  const envPath = path.join(ROOT, '.env.deploy');
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (DEPLOY_ENV_KEYS.has(key) || !process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadDeployEnv();

function run(cmd, options = {}) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...options });
}

function runCapture(cmd) {
  console.log(`\n▶ ${cmd}`);
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    error.stdout = error.stdout?.toString?.() ?? '';
    error.stderr = error.stderr?.toString?.() ?? '';
    throw error;
  }
}

function shouldSkipCloudfrontInvalidation() {
  const flag = (process.env.SKIP_CLOUDFRONT_INVALIDATION || '').trim().toLowerCase();
  return flag === 'true' || flag === '1' || flag === 'yes';
}

function invalidateCloudfront(cloudfrontId, profile) {
  const cmd =
    `aws --profile ${profile} cloudfront create-invalidation ` +
    `--distribution-id ${cloudfrontId} ` +
    `--paths '/index.html' '/ngsw.json' '/ngsw-worker.js' '/*' ` +
    `--output json`;

  try {
    const output = runCapture(cmd);
    const parsed = JSON.parse(output);
    const invalidationId = parsed?.Invalidation?.Id;
    if (invalidationId) {
      console.log(`\n☁️  Invalidación CloudFront creada: ${invalidationId} (${parsed.Invalidation.Status})`);
    } else {
      console.log('\n☁️  Invalidación CloudFront solicitada.');
    }
    return true;
  } catch (error) {
    const details = error.stderr?.toString?.() || error.stdout?.toString?.() || error.message;
    console.warn('\n⚠️  No se pudo invalidar CloudFront.');
    if (details) console.warn(details.trim());
    console.warn(
      '   El deploy a S3 sí terminó. Revisa IAM (cloudfront:CreateInvalidation) o invalida manualmente en consola.'
    );
    return false;
  }
}

const APP_NAME = 'frontend';
const PROFILE = process.env.AWS_PROFILE || 'colombiadepie';

const STAGES = {
  prod: {
    buildScript: 'build:prod',
    bucketEnv: 'S3_BUCKET_PROD',
    cloudfrontEnv: 'CLOUDFRONT_DIST_ID_PROD',
    defaultBucket: 'colombiadepie',
    defaultCloudfrontId: '',
  },
  staging: {
    buildScript: 'build:staging',
    bucketEnv: 'S3_BUCKET_STAGING',
    cloudfrontEnv: 'CLOUDFRONT_DIST_ID_STAGING',
    defaultBucket: 'colombiadepie-web-staging',
    defaultCloudfrontId: '',
  },
};

const NO_CACHE_FILES = ['index.html', 'ngsw.json', 'ngsw-worker.js'];

function resolveBuildDir() {
  const candidates = [
    path.join('dist', APP_NAME, 'browser'),
    path.join('dist', APP_NAME),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) return dir;
  }

  throw new Error(
    `No se encontró index.html en: ${candidates.map((d) => path.join(d, 'index.html')).join(', ')}`
  );
}

function resolveStage() {
  const stage = (process.argv[2] || 'prod').toLowerCase();
  if (!STAGES[stage]) {
    throw new Error(`Stage inválido "${stage}". Usa: ${Object.keys(STAGES).join(', ')}`);
  }
  return stage;
}

function awsProfilePrefix(profile) {
  return `aws --profile ${profile}`;
}

try {
  const stage = resolveStage();
  const config = STAGES[stage];
  const bucket = process.env[config.bucketEnv] || config.defaultBucket;
  const cloudfrontId =
    process.env[config.cloudfrontEnv]?.trim() || config.defaultCloudfrontId || '';

  console.log(`\n🚀 Deploy frontend — stage: ${stage}`);
  console.log(`   profile: ${PROFILE}`);
  console.log(`   bucket:  ${bucket}`);
  console.log(`   cloudfront: ${cloudfrontId || '(sin configurar — no habrá invalidación)'}`);

  run('npm ci --cache ./.npm-cache --no-audit --no-fund');
  run(`npm run ${config.buildScript}`);

  const buildDir = resolveBuildDir();
  console.log(`\n📁 Directorio de build: ${buildDir}`);

  const excludeFlags = NO_CACHE_FILES.map((file) => `--exclude "${file}"`).join(' ');

  run(
    `${awsProfilePrefix(PROFILE)} s3 sync ${buildDir}/ s3://${bucket}/ ` +
      `--delete ` +
      `--cache-control "public,max-age=31536000,immutable" ` +
      `${excludeFlags}`
  );

  for (const file of NO_CACHE_FILES) {
    const localPath = path.join(buildDir, file);
    if (!fs.existsSync(localPath)) continue;

    run(
      `${awsProfilePrefix(PROFILE)} s3 cp ${localPath} s3://${bucket}/${file} ` +
        `--cache-control "no-cache,no-store,must-revalidate"`
    );
  }

  if (shouldSkipCloudfrontInvalidation()) {
    console.warn('\n⚠️  Invalidación CloudFront omitida (SKIP_CLOUDFRONT_INVALIDATION=true).');
  } else if (!cloudfrontId) {
    console.warn(
      `\n⚠️  Sin CLOUDFRONT_DIST_ID_${stage.toUpperCase()}: no se creó invalidación. ` +
        `Copia .env.deploy.example → .env.deploy y configura el ID de la distribución.`
    );
  } else {
    invalidateCloudfront(cloudfrontId, PROFILE);
  }

  console.log('\n✅ Deploy completado con éxito');
} catch (error) {
  console.error('\n❌ Error durante el deploy:', error.message);
  process.exit(1);
}
