import fs from 'fs/promises';
import fetch from 'node-fetch';

const FDROID_INDEX_URL = 'https://f-droid.org/repo/index-v1.json';

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function resolveIconUrl(app) {
  // Icons are provided via URL in index-v1.json as 'icon'
  // Some entries may have paths; prefer full URLs if present
  if (app.icon && app.icon.startsWith('http')) return app.icon;
  if (app.icon) {
    return `https://f-droid.org/repo/${app.icon}`;
  }
  return '';
}

function resolveScreenshots(app) {
  const screenshots = toArray(app.screenshots);
  return screenshots.map((s) => (s.startsWith('http') ? s : `https://f-droid.org/repo/${s}`));
}

function resolveApkUrl(packageName, versionCode, app) {
  // index-v1.json has packages[packageName].versions with apkName
  // Fallback to repo path pattern if needed
  const apkName = app.packages?.[packageName]?.versions?.find(v => v.versionCode === versionCode)?.apkName;
  if (apkName) {
    return `https://f-droid.org/repo/${apkName}`;
  }
  return '';
}

async function fetchFdroidIndex() {
  const res = await fetch(FDROID_INDEX_URL, { headers: { 'User-Agent': 'GenisKapiStoreBot/1.0' } });
  if (!res.ok) {
    throw new Error(`Failed to fetch F-Droid index: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function pickFieldsFromApp(app) {
  const packageName = app.packageName;
  const name = app.name || app.summary || packageName;
  const summary = app.summary || '';
  const icon = resolveIconUrl(app);
  const screenshots = resolveScreenshots(app);

  // Build versions list (prefer latest first)
  const versions = [];
  const pkg = app.packages?.[packageName];
  if (pkg && Array.isArray(pkg.versions)) {
    const sorted = [...pkg.versions].sort((a, b) => (b.versionCode || 0) - (a.versionCode || 0));
    for (const v of sorted) {
      versions.push({ version: v.versionName || String(v.versionCode), apk: v.apkName ? `https://f-droid.org/repo/${v.apkName}` : '' });
    }
  } else if (Array.isArray(app.versions)) {
    const sorted = [...app.versions].sort((a, b) => (b.versionCode || 0) - (a.versionCode || 0));
    for (const v of sorted) {
      versions.push({ version: v.versionName || String(v.versionCode), apk: v.apkName ? `https://f-droid.org/repo/${v.apkName}` : '' });
    }
  }

  return {
    packageName,
    data: {
      name,
      summary,
      icon,
      screenshots,
      versions,
    },
  };
}

async function main() {
  console.log('Fetching F-Droid index...');
  const index = await fetchFdroidIndex();
  const appsOut = {};

  const apps = index?.apps || index?.packages || [];
  const appArray = Array.isArray(apps) ? apps : Object.values(apps);
  for (const app of appArray) {
    try {
      const pkgName = app.packageName || app.package || app.id;
      if (!pkgName) continue;
      app.packageName = pkgName;
      const { packageName, data } = pickFieldsFromApp(app);
      if (data.versions.length === 0) {
        // Try to infer versions from index.packages map if present
        const pkgEntry = index?.packages?.[packageName];
        if (pkgEntry && Array.isArray(pkgEntry.versions)) {
          data.versions = [...pkgEntry.versions]
            .sort((a, b) => (b.versionCode || 0) - (a.versionCode || 0))
            .map(v => ({ version: v.versionName || String(v.versionCode), apk: v.apkName ? `https://f-droid.org/repo/${v.apkName}` : '' }));
        }
      }
      appsOut[packageName] = data;
    } catch (e) {
      console.warn('Failed to process app', app?.packageName || app?.name, e.message);
    }
  }

  const outPath = new URL('../apps.json', import.meta.url);
  await fs.writeFile(outPath, JSON.stringify(appsOut, null, 2), 'utf-8');
  console.log(`Wrote apps.json with ${Object.keys(appsOut).length} apps.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

