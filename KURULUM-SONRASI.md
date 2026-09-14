# Kurulum Sonrası Yapılacaklar

`npm install @dehasoft/panel-agent` sonrası bir Next.js sitesine entegre ederken sırayla bunları yap.

## 1. Panelde token oluştur

Kontrol Masası'nda ilgili sitenin detay sayfasına git → **Webhook** bölümü → **Token Oluştur**.
Token bir kez gösterilir, hemen kopyala. Kaybedersen "Yenile" ile yenisini üret (eskisi anında geçersiz olur).

## 2. Ortam değişkenlerini ekle

`.env.local` dosyasına (client'ta değil, sadece server tarafında kullanılacağı için `NEXT_PUBLIC_` **kullanma**):

```env
PANEL_AGENT_URL=https://panel-adresin
PANEL_AGENT_TOKEN=az_once_kopyaladigin_token
```

`.env.example`'a da satırları (değersiz olarak) ekle.

## 3. İletişim formunun route handler'ına / server action'ına ekle

```ts
// app/api/contact/route.ts
import { createPanelAgent } from '@dehasoft/panel-agent';

const panelAgent = createPanelAgent({
    panelUrl: process.env.PANEL_AGENT_URL!,
    token: process.env.PANEL_AGENT_TOKEN!,
});

export async function POST(request: Request) {
    const data = await request.json();

    // DB'ye kaydet / e-posta gönder... sonra panele bildir.
    // await etmiyoruz — panelin yanıt süresi ziyaretçiyi bekletmesin.
    panelAgent.contactMessage(data);

    return Response.json({ ok: true });
}
```

Bir server action'dan çağırıyorsan `await` etmeden çağırmak Next.js'te fonksiyon erken
sonlanabileceği için isteği kesebilir — o durumda `await` et, birkaç yüz ms'lik gecikme
kabul edilebilir olur.

## 4. Sağlık kontrolünü ekle (panel → site yönü)

Bu yön ters işliyor — panel senin siteni yoklar, sen panele bir şey göndermezsin. Aynı
token'la cevap veren bir route ekle:

```ts
// app/api/health/route.ts
import { createHealthCheckHandler } from '@dehasoft/panel-agent';
import pkg from '../../../package.json';

export const GET = createHealthCheckHandler({
    token: process.env.PANEL_AGENT_TOKEN!,
    appVersion: pkg.version,
});
```

Sonra panelde sitenin **Sağlık Kontrolü Adresi** alanına `https://siten.com/api/health`
yaz. Panel bunu 5 dakikada bir otomatik yoklar, site sayfasında up/down geçmişi birikir.

## 5. Test et

**İletişim formu**: siteden gerçek bir form gönder, panelde sitenin detay sayfasında
**İletişim Mesajları** altında görünmeli.

**Sağlık kontrolü**: panelde site sayfasında "Şimdi Kontrol Et"e bas, "up" ve yanıt
süresi görünmeli. Görünmüyorsa:

- `.env.local` değerlerini deploy ortamına (Vercel vb.) da eklediğinden emin ol
- Token doğru mu, panelde "Token ayarlı" yazıyor mu kontrol et
- `/api/health` adresi tarayıcıdan (token olmadan) 401 dönüyor mu — dönmüyorsa route yanlış yerde
- Edge runtime kullanıyorsan `fetch` zaten native — sorun genelde env var eksikliği olur

## 6. Üretime alırken

- `PANEL_AGENT_TOKEN`'ı asla git'e commit etme, sadece deploy platformunun secret/env ayarında tutulsun
- Token sızarsa panelden "Yenile" ile anında iptal et — hem webhook hem health-check aynı anda düşer, ikisini de yeni token'la güncellemen gerekir
- Staging/production için **ayrı site kaydı ve ayrı token** kullan

## Sırada ne var

Paket, panelde yeni özellik eklendikçe yeni bir metotla büyüyecek — mevcut
`contactMessage()`/`createHealthCheckHandler()` çağrıların bozulmadan
`npm update @dehasoft/panel-agent` yeterli olacak.
