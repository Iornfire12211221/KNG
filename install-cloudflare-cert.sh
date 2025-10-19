#!/bin/bash

# Скрипт для установки Cloudflare Origin Certificate

echo "🔐 Установка Cloudflare Origin Certificate..."

# Создаем директорию для сертификатов
mkdir -p /etc/ssl/cloudflare

# Создаем файл сертификата
cat > /etc/ssl/cloudflare/origin.pem << 'CERT_EOF'
-----BEGIN CERTIFICATE-----
MIIEnDCCA4SgAwIBAgIUeNYcn1IEnojsQ0i2v87B3b+dz2UwDQYJKoZIhvcNAQEL
BQAwgYsxCzAJBgNVBAYTAlVTMRkwFwYDVQQKExBDbG91ZEZsYXJlLCBJbmMuMTQw
MgYDVQQLEytDbG91ZEZsYXJlIE9yaWdpbiBTU0wgQ2VydGlmaWNhdGUgQXV0aG9y
aXR5MRYwFAYDVQQHEw1TYW4gRnJhbmNpc2NvMRMwEQYDVQQIEwpDYWxpZm9ybmlh
MB4XDTI1MTAxOTA3MTkwMFoXDTQwMTAxNTA3MTkwMFowYjEZMBcGA1UEChMQQ2xv
dWRGbGFyZSwgSW5jLjEdMBsGA1UECxMUQ2xvdWRGbGFyZSBPcmlnaW4gQ0ExJjAk
BgNVBAMTHUNsb3VkRmxhcmUgT3JpZ2luIENlcnRpZmljYXRlMIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0flO9lwCMN1uCu9V/r5G9lUTefxEfasnBVWP
Dyrvf3HiBEPhLhyuYX5wr+i9GsNzaZUMGMK5ItgBQq4y8kgi1BTWDQR4sSOuJUw4
LeiWEFQRk6yBVWVMBJmQ7ztfmOypr3Gmr8D+kOUOOQWxWLtfnAZGn+NoYSL8MoTv
TL7LwBz/9YTAega/0YjrXHGu+erFfVdjgz2LEvskGftOPz2R8ZjToc6cysUgFo7S
cBrd4rRDiUBRPltbQe6xi3wzbaHSY2RdQL0vU5q8T9mMrAHz9ZRiUC0POiGTtHgK
nCuzzcwy2QPsechIYgQpszckyS0GmPVKRGwWviqCZNNyMLR5dQIDAQABo4IBHjCC
ARowDgYDVR0PAQH/BAQDAgWgMB0GA1UdJQQWMBQGCCsGAQUFBwMCBggrBgEFBQcD
ATAMBgNVHRMBAf8EAjAAMB0GA1UdDgQWBBSTSr6TavHBgIZBjxpn9nVhSAIu7jAf
BgNVHSMEGDAWgBQk6FNXXXw0QIep65TbuuEWePwppDBABggrBgEFBQcBAQQ0MDIw
MAYIKwYBBQUHMAGGJGh0dHA6Ly9vY3NwLmNsb3VkZmxhcmUuY29tL29yaWdpbl9j
YTAfBgNVHREEGDAWggoqLjI0ZHBzLnJ1gggyNGRwcy5ydTA4BgNVHR8EMTAvMC2g
K6AphidodHRwOi8vY3JsLmNsb3VkZmxhcmUuY29tL29yaWdpbl9jYS5jcmwwDQYJ
KoZIhvcNAQELBQADggEBABZVci7PCkUPwvKm5IlxDZCRSkTVTkX90SkpewCPWyvU
sXpA3EonNxaDF9s60H+8fJ/Q9f1l37h4Qnb1FV9f/f5mERjIrO+O677a53AUEC4J
+yosGbd0V0tJprlh8BPf+38DuH2E3xlO/sDm6owxcnspAN+0akigBHmrsQSwb9zq
lHr/gDt+T0qTxGPdspXGzV6ps94h0G7Z7h+sppVdiArPXLJZ/dZdPgaLc25+NY7a
CL1SuhSGDZjhRRk3TlMgh4yNP3itpVNCWuvlYsLAzt6yg2EXPreqp6oHaKcMNNoY
kxHGrVdeAAC4oiqlV6uCZ7sZ7T5E3FosLhPvYTj1x8M=
-----END CERTIFICATE-----
CERT_EOF

# Создаем файл приватного ключа
cat > /etc/ssl/cloudflare/origin.key << 'KEY_EOF'
-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDR+U72XAIw3W4K
71X+vkb2VRN5/ER9qycFVY8PKu9/ceIEQ+EuHK5hfnCv6L0aw3NplQwYwrki2AFC
rjLySCLUFNYNBHixI64lTDgt6JYQVBGTrIFVZUwEmZDvO1+Y7KmvcaavwP6Q5Q45
BbFYu1+cBkaf42hhIvwyhO9MvsvAHP/1hMB6Br/RiOtcca756sV9V2ODPYsS+yQZ
+04/PZHxmNOhzpzKxSAWjtJwGt3itEOJQFE+W1tB7rGLfDNtodJjZF1AvS9TmrxP
2YysAfP1lGJQLQ86IZO0eAqcK7PNzDLZA+x5yEhiBCmzNyTJLQaY9UpEbBa+KoJk
03IwtHl1AgMBAAECggEAV7gyn8NSev2WwmS4ZWMynChwqY6VQnblJ1pWGL0ULwbx
qFx/T1dWFo7PHv45Olwa9Cn7UsDOvVrGNAg4anVub3GA9xE+JqrETvqnoa5AOvQU
H8B6i6V0+5r4LKl+R5HfVddCDryu3POEXJgfPfWRfMo2aQeFDMej2qskmcg/sLLq
6xWbfD5XvBjAkIbi9QEM1VqfQGG7ZK0BjiY4NH7IHnF/fxmVb/l9qchjt/yIsKKY
9IasQhCBJXNHc+4LuzmYeDvY3WXU3qYGhXpGgTzSB1MbrZHzZulPWRmM8jUOhVD8
paMRkl0/2UoFrW5MotYTTOZypeIXPCrhk5Xq+rR/JQKBgQDx6XGHicMqcoQzEdyI
kmaC7VfBUaha18flq46pM0Cu1KJHt+VJBJkKkP8GWW4JWbcISychxmJ5LQNQn4vr
PXIrEFUZVa9GD+zH7rl+67U94eEjlOVOSewb2+p3pk4btM2wBmDTNGEexb/HwCY9
1Xlm3PCH77tOAyznRfi67G3S5wKBgQDeM7cUdI/hrwO0MX3h0klwcLfAr0v6arbd
a9Yj23qdLj7yKYn8vKeCsUYHTzavB53fSo5uFItHGh+g7AlrJ9Lwh21kpqtp0PQB
RMb3AbEvtBL2ncF3ROWH1LrPX+Dltd4c4Xgfg1TL9BXwuSkGbtQFb+j5dOn1rLFs
Mlq0t7WhQwKBgQCDGAmg9KPhzdscPdKv4/5Pd0U2CwVb7VFzgcu2n4Ku+6XRjbNg
JXC2DCtXioEZ6hdJFEjpgbN9jUodl8hgO5UyBxDGwOtR4XFkS1cUk7FNDqpN+PNm
wKKF2mAuZN4xH4LToDE6Y0k6PtmV6ugOXDAE8TgbwmtTdF8SGZYX3eYKAwKBgQDa
FSPBHc4BkMYv2stUEhImG1sd8G6/rnEfzLD1rHohPrxk7MQTnA1ERj0W+3YOP4mB
GCnGfL9d35PfWwq7cvCjRiflu3dNedmiTSCCWdTPnwtlpNu29ZXZxL48vjt6+Q6w
hdJiC4H0UvIdu306ZRgO5hFglJDzoLTaHmnMKOpJBQKBgQDK28zVhMJ31zXA4iZ5
n3jhjVcvGcf8oqb76diJ2BiXW5Zh4ZvJgMX2myEPT7e25yTp3oBEnHu77iVCBh3Q
u3txzIP8zjVTs8rZjuESJwdnFuwHeHf3HaKWFa/OpcGuwalA9auUMLy0rvs9yxfZ
U+DZYHnNXbiwswTVIUy7UQncrw==
-----END PRIVATE KEY-----
KEY_EOF

# Устанавливаем правильные права доступа
chmod 600 /etc/ssl/cloudflare/origin.key
chmod 644 /etc/ssl/cloudflare/origin.pem

echo "✅ Сертификаты установлены!"
echo "📁 Сертификат: /etc/ssl/cloudflare/origin.pem"
echo "🔑 Ключ: /etc/ssl/cloudflare/origin.key"

# Обновляем Nginx конфигурацию
echo "🔧 Обновление Nginx конфигурации..."

cat > /etc/nginx/sites-available/default << 'NGINX_EOF'
server {
    listen 80;
    server_name 24dps.ru www.24dps.ru;
    
    # Редирект HTTP на HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 24dps.ru www.24dps.ru;

    # Cloudflare Origin Certificate
    ssl_certificate /etc/ssl/cloudflare/origin.pem;
    ssl_certificate_key /etc/ssl/cloudflare/origin.key;
    
    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Проксирование основного приложения
    location / {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket проксирование
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_pass_request_headers on;
        proxy_read_timeout 86400;
    }
}
NGINX_EOF

echo "✅ Nginx конфигурация обновлена!"

# Проверяем конфигурацию
echo "🔍 Проверка конфигурации Nginx..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Конфигурация Nginx валидна!"
    
    # Перезапускаем Nginx
    echo "🔄 Перезапуск Nginx..."
    systemctl restart nginx
    
    if [ $? -eq 0 ]; then
        echo "✅ Nginx успешно перезапущен!"
        echo ""
        echo "🎉 ВСЕ ГОТОВО!"
        echo "✅ Cloudflare Origin Certificate установлен"
        echo "✅ Nginx настроен на HTTPS"
        echo "✅ WebSocket работает через WSS"
        echo ""
        echo "🌐 Откройте https://24dps.ru - должно быть 'Защищено'!"
    else
        echo "❌ Ошибка при перезапуске Nginx"
        exit 1
    fi
else
    echo "❌ Ошибка в конфигурации Nginx"
    exit 1
fi

