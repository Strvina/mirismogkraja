# syntax=docker/dockerfile:1

# The images of the local Docker stack (docker-compose.yml, docs/docker.md):
# "app" runs PHP-FPM, the queue worker and the scheduler, "web" is nginx.
# Not the production deployment - that is docs/deploy.md.

ARG PHP_VERSION=8.2
ARG NODE_VERSION=22
ARG NGINX_VERSION=1.30

# PHP with the extensions the application uses. Redis needs none: the
# application talks to it through predis, which is plain PHP.
FROM php:${PHP_VERSION}-fpm-alpine AS runtime

# The libraries stay; the compilers and headers that build the extensions
# are removed in the same layer, so they never reach the image.
#   icu-data-full        Alpine ships English only, and the site is Serbian
#   mariadb-client       the nightly backup:database command shells out to it
#   mariadb-connector-c  has the client's part of MySQL 8's way of checking
#                        a password (caching_sha2_password), which Alpine
#                        does not install along with the client
RUN apk add --no-cache \
        freetype \
        icu-data-full \
        icu-libs \
        libjpeg-turbo \
        libpng \
        libwebp \
        libzip \
        mariadb-client \
        mariadb-connector-c \
    && apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        freetype-dev \
        icu-dev \
        libjpeg-turbo-dev \
        libpng-dev \
        libwebp-dev \
        libzip-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j"$(nproc)" bcmath exif gd intl opcache pcntl pdo_mysql zip \
    && apk del .build-deps

# PHP dependencies and the code. With the development packages: the demo
# content is seeded with Faker and the model factories, and the test suite
# can then be run in a container as well.
FROM runtime AS vendor

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

ENV COMPOSER_ALLOW_SUPERUSER=1

WORKDIR /var/www/html

# The two files alone first: the download is then repeated only when the
# dependencies change, not on every change to the code.
#
# The secret is optional (docker-compose.yml takes it from COMPOSER_AUTH).
# GitHub limits downloads from addresses many people share, such as CI's;
# with a token Composer is let through, and a secret, unlike a build
# argument, is not kept in the image. Normally there is none, and Composer
# is then not given the variable at all, rather than an empty one.
#
# What Composer downloads is kept between builds, outside the image.
COPY composer.json composer.lock ./
RUN --mount=type=secret,id=composer_auth \
    --mount=type=cache,target=/tmp/composer-cache \
    if [ -s /run/secrets/composer_auth ]; then export COMPOSER_AUTH="$(cat /run/secrets/composer_auth)"; fi \
    && COMPOSER_CACHE_DIR=/tmp/composer-cache \
        composer install --no-interaction --no-progress --prefer-dist --no-scripts --no-autoloader

COPY . .

# storage/ is not copied from the machine (.dockerignore), so the folders
# Laravel expects are made here. They are also what a new volume starts from.
RUN mkdir -p \
        bootstrap/cache \
        storage/app/private \
        storage/app/public \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/testing \
        storage/framework/views \
        storage/logs \
    && composer dump-autoload --optimize --no-interaction

# The frontend. Debian rather than Alpine: the same C library as the
# machines the build is tested on, for the compiled parts of Rollup,
# Tailwind and Lightning CSS.
FROM node:${NODE_VERSION}-bookworm-slim AS assets

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Everything Tailwind collects class names from: the pages, the PHP that
# may name a class, and the one vendor folder resources/css/app.css lists.
# lang/ is bundled as well (resources/js/lib/i18n.ts).
COPY vite.config.js tsconfig.json ./
COPY resources resources
COPY app app
COPY lang lang
COPY --from=vendor \
    /var/www/html/vendor/laravel/framework/src/Illuminate/Pagination/resources/views \
    vendor/laravel/framework/src/Illuminate/Pagination/resources/views

RUN npm run build

# PHP-FPM, and with another command the queue worker and the scheduler.
FROM runtime AS app

RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    # Not root, so PHP-FPM cannot switch user - and says so on every start.
    && sed -i -e '/^user = /d' -e '/^group = /d' /usr/local/etc/php-fpm.d/www.conf \
    # Tinker keeps its history in the home folder.
    && mkdir -p /home/www-data \
    && chown www-data:www-data /home/www-data

COPY docker/php/php.ini "$PHP_INI_DIR/conf.d/zz-app.ini"
COPY docker/php/mysql-client.cnf /etc/my.cnf.d/zz-app.cnf
COPY --chmod=0755 docker/php/entrypoint.sh /usr/local/bin/app-entrypoint

WORKDIR /var/www/html

COPY --from=vendor /var/www/html ./
COPY --from=assets /app/public/build public/build

# The code stays root's and read-only for PHP. What PHP writes: storage and
# bootstrap/cache, and in the folder itself the .env the entrypoint makes.
# The link is what `php artisan storage:link` would make; nginx gets the
# same one with its copy of public/.
RUN ln -s /var/www/html/storage/app/public public/storage \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chown www-data:www-data .

USER www-data

ENTRYPOINT ["app-entrypoint"]
CMD ["php-fpm"]

# nginx, as an image that never runs as root (it listens on 8080).
FROM nginxinc/nginx-unprivileged:${NGINX_VERSION}-alpine AS web

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=app /var/www/html/public /var/www/html/public
