# GenişKapı Store

Tamamen otomatik olarak F-Droid verisini çekip `apps.json` üreten ve GitHub Pages üzerinde yayınlayan depo.

## Nasıl Çalışır?
- `scripts/generate-apps-json.mjs`: F-Droid `index-v1.json` verisini indirir ve `apps.json` oluşturur.
- `index.html`: Sayfa yüklenince `apps.json` dosyasını fetch ederek uygulamaları listeler.
- GitHub Actions workflow (`.github/workflows/update-apps.yml`): Her gün 03:00 UTC'de çalışır, `apps.json` güncellenirse commit edip Pages'e yayınlar.

## Yerel Geliştirme
```bash
npm install
npm run build:apps
# apps.json oluşturulur
```

`index.html` yerelden açılabilir. Eğer CORS/cache problemi yaşarsanız basit bir HTTP sunucusu ile servis edin:
```bash
npx http-server -p 8000
# Ardından http://localhost:8000 adresini açın
```

## GitHub Pages
- Repo Settings → Pages → Build and deployment: "GitHub Actions" seçin.
- Workflow ilk çalışmada artefaktı Pages'a yükler ve siteyi yayınlar.

## Notlar
- `apps.json` büyük bir dosyadır (binlerce uygulama). Gerektiğinde arama ve filtreleme için istemci tarafında sayfalama eklenebilir.
