CREATE 
    ALGORITHM = UNDEFINED 
    DEFINER = `root`@`%` 
    SQL SECURITY DEFINER
VIEW `digital_menu`.`v_historico_pedidos` AS
    SELECT 
        `digital_menu`.`pedidos`.`id` AS `id_pedido`,
        DATE_FORMAT(`digital_menu`.`pedidos`.`date_hour`,
                '%d/%m/%Y %H:%i:%s') AS `date_hour`,
        `digital_menu`.`pedidos`.`total` AS `total`,
        `digital_menu`.`clientes`.`customer_name` AS `customer_name`
    FROM
        (`digital_menu`.`clientes`
        JOIN `digital_menu`.`pedidos`)
    WHERE
        (`digital_menu`.`pedidos`.`id_customer` = `digital_menu`.`clientes`.`id`)
    ORDER BY `digital_menu`.`pedidos`.`date_hour` DESC