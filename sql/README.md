sudo docker build -t digital-menu-db-0 .

docker run --name digital-menu-db-container -it -p 3306:3306 -e MYSQL_ROOT_PASSWORD=1234 -e MYSQL_DATABASE=digital_menu digital-menu-db-0:latest

docker exec -i digital-menu-db-container mysql -uroot -p1234  <<< "select * from digital_menu.menu_items"