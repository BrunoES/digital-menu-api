CREATE TABLE `clientes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8_unicode_ci

CREATE TABLE `menu_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(60) COLLATE utf8_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `price` float NOT NULL,
  `img_url` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb3 COLLATE=utf8_unicode_ci

CREATE TABLE `menu_items_pedidos` (
  `id_item` int NOT NULL,
  `id_pedido` varchar(45) COLLATE utf8_unicode_ci NOT NULL,
  `quantity` tinyint NOT NULL,
  `price` float NOT NULL,
  PRIMARY KEY (`id_item`,`id_pedido`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8_unicode_ci

CREATE TABLE `pedidos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_customer` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `total` float NOT NULL,
  `obs` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3 COLLATE=utf8_unicode_ci