CREATE 
    ALGORITHM = UNDEFINED 
    DEFINER = `root`@`localhost` 
    SQL SECURITY DEFINER
VIEW `v_company_user` AS
    SELECT 
        `company`.`id` AS `id_company`,
        `company`.`name` AS `company_name`,
        `user_empresa`.`email` AS `user_email`,
        `user_empresa`.`password` AS `user_password`
    FROM
        (`company`
        JOIN `user_empresa`)
    WHERE
        (`company`.`id` = `user_empresa`.`id_company`)