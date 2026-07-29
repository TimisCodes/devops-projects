#!/bin/bash

#Automatic website
WEBSITE="https://www.tooplate.com/zip-templates/2161_vora_bold.zip"
WEBSITE_ZIP="2161_vora_bold.zip"
WEBDIR="/var/www/html"
DIR="/tmp/web"

sudo dnf install wget unzip httpd -y
mkdir $DIR
cd $DIR
wget $WEBSITE
unzip $WEBSITE_ZIP
rm -rf $WEBSITE_ZIP
cd "2161_vora_bold"
cp -r * /var/www/html

systemctl start httpd
systemctl enable httpd
ls /var/run/httpd/httpd.pid &> /dev/null 

ip addr show
free -m 

