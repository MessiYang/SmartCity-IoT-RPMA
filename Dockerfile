FROM node:6.12.0
#FROM ubuntu:16.04

MAINTAINER shuying <Shuying_Lin@compal.com>

# Install Node.js and other dependencies
RUN apt-get update
RUN apt-get -y upgrade
RUN apt-get install -y build-essential
RUN apt-get -y install wget vim git curl
#RUN curl -sL https://deb.nodesource.com/setup_6.x | bash - && \
#    apt-get install -y nodejs

# Install PM2
RUN npm install -g pm2    

RUN mkdir /RPMA

COPY init /RPMA/init
ADD main /RPMA/main 

RUN sed -i -e "s/localhost:27017/mongo:27017/g" /RPMA/main/config/applicationConf.json

RUN cd /RPMA/main && \
    npm install && \
    npm install -g webpack && \
    npm run deploy

#RUN pm2 kill

# Define Working Directory
WORKDIR /RPMA/main

# Expose Port
EXPOSE 3001

# Run app
CMD pm2 start --no-daemon app.js