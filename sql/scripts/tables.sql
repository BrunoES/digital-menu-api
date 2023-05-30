CREATE TABLE `clientes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8_unicode_ci;

CREATE TABLE `menu_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_company` int NOT NULL,
  `name` varchar(60) COLLATE utf8_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `price` float NOT NULL,
  `img_url` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb3 COLLATE=utf8_unicode_ci

CREATE TABLE `menu_items_pedidos` (
  `id_item` int NOT NULL,
  `id_pedido` varchar(45) COLLATE utf8_unicode_ci NOT NULL,
  `quantity` tinyint NOT NULL,
  `price` float NOT NULL,
  PRIMARY KEY (`id_item`,`id_pedido`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8_unicode_ci;

CREATE TABLE `pedidos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_customer` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `id_company` int NOT NULL,
  `total` float NOT NULL,
  `obs` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `date_hour` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=72 DEFAULT CHARSET=utf8mb3 COLLATE=utf8_unicode_ci
ALTER TABLE `digital_menu`.`pedidos` 
ADD COLUMN `checked` TINYINT NULL AFTER `date_hour`;
ALTER TABLE `digital_menu`.`pedidos` 
CHANGE COLUMN `checked` `checked` TINYINT NULL DEFAULT 0 ;
ALTER TABLE `digital_menu`.`pedidos` 
ADD COLUMN `table_number` INT NOT NULL AFTER `id_company`;

CREATE TABLE `digital_menu`.`company` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(60) NOT NULL,
  `active` TINYINT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8
COLLATE = utf8_unicode_ci;
ALTER TABLE `digital_menu`.`company` 
ADD COLUMN `logo_url` VARCHAR(255) NULL AFTER `active`;

CREATE TABLE `user_empresa` (
  `email` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `password` varchar(12) COLLATE utf8_unicode_ci NOT NULL,
  `id_company` int(11) NOT NULL,
  `blocked` tinyint(1) DEFAULT '0',
  `active` tinyint(1) DEFAULT '0',
  `temp_token_change_pass` varchar(36) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`email`),
  UNIQUE KEY `email_UNIQUE` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `digital_menu`.`mesa_empresa` (
  `table_number` INT NOT NULL,
  `id_company` INT NOT NULL,
  `complement` VARCHAR(60) NULL,
  PRIMARY KEY (`table_number`, `id_company`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8
COLLATE = utf8_unicode_ci;
ALTER TABLE `digital_menu`.`mesa_empresa` 
ADD COLUMN `qrcode_url` VARCHAR(255) NULL AFTER `complement`;

CREATE TABLE `user_token` (
  `email` varchar(255) NOT NULL,
  `date_hour` datetime DEFAULT CURRENT_TIMESTAMP,
  `token` varchar(36) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`email`,`token`)
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8
COLLATE = utf8_unicode_ci;

SET character_set_client = utf8;
SET character_set_connection = utf8;
SET character_set_results = utf8;
SET collation_connection = utf8_unicode_ci;