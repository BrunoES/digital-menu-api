CREATE 
    ALGORITHM = UNDEFINED 
    DEFINER = `root`@`localhost` 
    SQL SECURITY DEFINER
VIEW `digital_menu`.`v_historico_pedidos` AS
    SELECT 
        `pedidos`.`id` AS `id_pedido`,
        `pedidos`.`date_hour` AS `date_hour`,
        DATE_FORMAT(`pedidos`.`date_hour`,
                '%d/%m/%Y %H:%i:%s') AS `date_hour_formatted`,
        `pedidos`.`total` AS `total`,
        `clientes`.`customer_name` AS `customer_name`
    FROM
        (`clientes`
        JOIN `pedidos`)
    WHERE
        (`pedidos`.`id_customer` = `clientes`.`id`)
    ORDER BY `pedidos`.`date_hour` DESC