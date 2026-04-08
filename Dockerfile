FROM php:8.2-apache

# Habilitar mod_rewrite, configurar Apache e instalar unzip
RUN a2enmod rewrite \
    && sed -i 's/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf \
    && apt-get update && apt-get install -y unzip && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

# Instalar Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copiar dependencias primero para aprovechar cache de Docker
COPY composer.json ./
RUN composer install --no-dev --optimize-autoloader

# Copiar el resto de la aplicacion
COPY . .

EXPOSE 80
