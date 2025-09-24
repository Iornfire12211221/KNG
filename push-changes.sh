#!/bin/bash

# Добавляем все изменения
git add .

# Коммитим с сообщением
git commit -m "Fix ajv codegen issue for Docker build"

# Пушим в main ветку
git push origin main --force

echo "Changes pushed to GitHub successfully!"