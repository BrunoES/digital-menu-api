CREATE 
    ALGORITHM = UNDEFINED 
    DEFINER = `root`@`localhost` 
    SQL SECURITY DEFINER
VIEW `digital_menu`.`v_menu_items_pedidos_detalhe` AS
    SELECT 
        `pedido`.`id` AS `id_pedido`,
        `pedido`.`date_hour` AS `date_hour`,
        `pedido`.`total` AS `total`,
        `menu`.`id` AS `id_menu`,
        `menu`.`name` AS `name`,
        `menu`.`price` AS `price`,
        `items`.`quantity` AS `quantity`,
        `pedido`.`obs` AS `obs`
    FROM
        ((`menu_items_pedidos` `items`
        JOIN `menu_items` `menu`)
        JOIN `pedidos` `pedido`)
    WHERE
        ((`pedido`.`id` = `items`.`id_pedido`)
            AND (`items`.`id_item` = `menu`.`id`))
    ORDER BY `pedido`.`date_hour` DESC