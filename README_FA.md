# 🚀 ریلی XHTTP روی Netlify

> پروژه ساده ریلی با Netlify Edge Function  
> ساخته شده توسط **amirs**

---

## 🇺🇸 English Guide

نسخه انگلیسی: [README.md](./README.md)

---

## ⚠️ نکته مهم

از این پروژه فقط برای دامنه و سرور خودت استفاده کن یا جایی که اجازه استفاده داری.

از دامنه‌های شخص ثالث برای `address`، `host` یا `sni` استفاده نکن، مگر اینکه اجازه داشته باشی.

---

## ✨ ویژگی‌ها

- ریلی با Netlify Edge Function
- راه‌اندازی ساده
- قابل استفاده با سایت Netlify و Netlify CLI
- تنظیم مقصد با Environment Variable
- پشتیبانی از دامنه مقصد همراه با پورت

---

## 📦 ساختار پروژه

```txt
.
├── netlify/
│   └── edge-functions/
│       └── relay.js
├── public/
│   └── index.html
├── netlify.toml
├── package.json
├── README.md
└── README_FA.md
```

---

## 🍴 دیپلوی با Fork کردن پروژه

> این روش کار می‌کند، ولی برای اکثر کاربران **توصیه نمی‌شود**.  
> روش پیشنهادی این است که پروژه را دانلود/کپی کنی و نسخه خودت را دیپلوی کنی.


## 🔐 Environment Variable ضروری

باید این مقدار را تنظیم کنی:

```txt
TARGET_DOMAIN=https://your-domain.com:443
```

### خیلی مهم

دامنه **حتماً باید همراه پورت باشد**.

نمونه درست:

```txt
https://example.com:443
https://sub.example.com:443
https://api.example.com:8443
```

نمونه اشتباه:

```txt
https://example.com
example.com:443
http://example.com:443
localhost:443
127.0.0.1:443
```

---

## 🚀 دیپلوی با سایت Netlify

از همین پروژه استفاده کن.

### 1. وارد کردن پروژه

وارد Netlify شو:

```txt
https://app.netlify.com
```

بعد بزن:

```txt
Add new project → Import an existing project
```

ریپوی پروژه را انتخاب کن.

---

### 2. تنظیمات Build

این‌ها را بگذار:

| تنظیم | مقدار |
|---|---|
| Build command | `npm run build` |
| Publish directory | `public` |

---

### 3. اضافه کردن Environment Variable

برو به:

```txt
Site configuration → Environment variables → Add variable
```

اضافه کن:

```txt
Key: TARGET_DOMAIN
Value: https://your-domain.com:443
```

مثال:

```txt
TARGET_DOMAIN=https://example.com:443
```

---

### 4. دیپلوی دوباره

بعد از اضافه کردن `TARGET_DOMAIN` حتماً دوباره deploy کن:

```txt
Deploys → Trigger deploy → Deploy site
```

---

---

## 🍴 دیپلوی با Fork کردن پروژه

> این روش کار می‌کند، ولی برای اکثر کاربران **توصیه نمی‌شود**.  
> روش پیشنهادی این است که پروژه را دانلود/کپی کنی و نسخه خودت را دیپلوی کنی.

### چرا Fork توصیه نمی‌شود؟

- پروژه تو به تاریخچه ریپوی اصلی وصل می‌ماند
- گزینه‌های Fork و Sync برای مبتدی‌ها ممکن است گیج‌کننده باشد
- اگر پروژه تمیز و شخصی می‌خواهی، کپی کردن فایل‌ها بهتر است

### اگر با این حال خواستی Fork کنی

1. پروژه را در GitHub باز کن
2. روی **Fork** بزن
3. اکانت GitHub خودت را انتخاب کن
4. بعد از ساخته شدن Fork، وارد Netlify شو
5. بزن:

```txt
Add new project → Import an existing project → GitHub
```

6. ریپوی Fork شده را انتخاب کن
7. تنظیمات Build را این‌طور بگذار:

| تنظیم | مقدار |
|---|---|
| Build command | `npm run build` |
| Publish directory | `public` |

8. Environment Variable را اضافه کن:

```txt
TARGET_DOMAIN=https://your-domain.com:443
```

9. سایت را Deploy کن

بعد از تغییر `TARGET_DOMAIN` همیشه باید دوباره deploy بزنی.


## 💻 دیپلوی با Netlify CLI

### 1. نصب Netlify CLI

```bash
npm install -g netlify-cli
```

---

### 2. رفتن به فولدر پروژه

```bash
cd path/to/project
```

مثلاً:

```bash
cd Desktop/netlify-relay
```

---

### 3. لاگین

```bash
netlify login
```

---

### 4. لینک کردن پروژه

اگر سایت از قبل داخل Netlify ساخته شده:

```bash
netlify link
```

اگر می‌خواهی با CLI سایت بسازی:

```bash
netlify init
```

---

### 5. تنظیم TARGET_DOMAIN

مقدار حتماً باید پورت داشته باشد:

```bash
netlify env:set TARGET_DOMAIN "https://your-domain.com:443" --scope functions --context production
```

مثال:

```bash
netlify env:set TARGET_DOMAIN "https://example.com:443" --scope functions --context production
```

---

### 6. چک کردن env

```bash
netlify env:list
```

یا:

```bash
netlify env:get TARGET_DOMAIN --context production
```

---

### 7. دیپلوی

```bash
netlify deploy --prod
```

---

## 🧪 نحوه استفاده

| چیزی که باز می‌کنی | مقصدی که به آن وصل می‌شود |
|---|---|
| `https://your-site.netlify.app/` | `https://your-domain.com:443/` |
| `https://your-site.netlify.app/path` | `https://your-domain.com:443/path` |
| `https://your-site.netlify.app/api/test` | `https://your-domain.com:443/api/test` |

---

## 🔗 نمونه کانفیگ

مقدارهای نمونه را با اطلاعات خودت جایگزین کن.

```txt
vless://UUID@YOUR_NETLIFY_DOMAIN:443?encryption=none&security=tls&sni=YOUR_NETLIFY_DOMAIN&fp=chrome&alpn=h2%2Chttp%2F1.1&insecure=0&allowInsecure=0&type=xhttp&host=YOUR_NETLIFY_DOMAIN&path=YOUR_PATH&mode=auto&extra=%7B%22xPaddingBytes%22%3A%22100-1000%22%7D#net
```

### این‌ها را عوض کن

| مقدار | معنی |
|---|---|
| `UUID` | UUID خودت |
| `YOUR_NETLIFY_DOMAIN` | دامنه Netlify خودت، مثل `your-site.netlify.app` |
| `YOUR_PATH` | مسیر بک‌اند خودت |


دامنه برای sni - adress
```txt
kubernetes.io
helm.sh
letsencrypt.org
```

---

## 🐞 دیباگ

### دیدن لاگ deploy

```txt
Site → Deploys → Latest deploy → View logs
```

### دیدن لاگ Edge Function

```txt
Site → Edge Functions → relay → Logs
```

### چک کردن env

```bash
netlify env:list
netlify env:get TARGET_DOMAIN --context production
```

### تست بک‌اند

```bash
curl -I "https://your-domain.com:443"
```

اگر این دستور خطا داد، اول مشکل دامنه، SSL یا پورت سرور را حل کن.

---

## ❌ خطاهای رایج

| خطا | دلیل | راه‌حل |
|---|---|---|
| `dns error` | دامنه resolve نمی‌شود | DNS دامنه را چک کن |
| `connection refused` | پورت بسته است | پورت درست را باز کن |
| `SSL/TLS error` | مشکل گواهی یا SNI | دامنه و SSL را درست کن |
| هنوز دامنه قبلی را می‌خواند | env یا deploy قدیمی است | env را دوباره ست کن و redeploy بزن |
| `404` | مشکل route | فایل `netlify.toml` را چک کن |

---

## ✅ چک‌لیست سریع

- [ ] `TARGET_DOMAIN` تنظیم شده
- [ ] `TARGET_DOMAIN` با `https://` شروع می‌شود
- [ ] `TARGET_DOMAIN` حتماً پورت دارد
- [ ] دامنه مقصد عمومی resolve می‌شود
- [ ] پورت مقصد باز است
- [ ] بعد از تغییر env دوباره deploy زدی

---

## 💰 حمایت مالی

https://reymit.ir/amirshaker

Solana:

```txt
E7S8EBUE5tkY5UaTgDvhaanJMeCi2DxPGYZukJGrJV8J
```

---

## 📢 کانال تلگرام

```txt
https://t.me/avaco_cloud
```

---

## 💬 ارتباط

```txt
@ShakerFPS
```

---

## 👤 سازنده

**amirs**

---

## 📜 لایسنس

MIT License © amirs
