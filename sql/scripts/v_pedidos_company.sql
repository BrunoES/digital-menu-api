CREATE 
    ALGORITHM = UNDEFINED 
    DEFINER = `root`@`localhost` 
    SQL SECURITY DEFINER
VIEW `digital_menu`.`v_pedidos_company` AS
    SELECT 
        `pedidos`.`id` AS `id`,
        `company`.`id` AS `id_company`,
        `company`.`name` AS `company_name`,
        `pedidos`.`id_customer` AS `id_customer`,
        `pedidos`.`total` AS `total`,
        `pedidos`.`obs` AS `obs`,
        `pedidos`.`date_hour` AS `date_hour`,
        `pedidos`.`checked` AS `checked`
    FROM
        (`company`
        JOIN `pedidos`)
    WHERE
        (`company`.`id` = `pedidos`.`id_company`)