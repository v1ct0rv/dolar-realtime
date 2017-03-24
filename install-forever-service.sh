#!/bin/bash
sudo forever-service install dolar-realtime  -e "PATH=/usr/local/bin:/home/victorv/.nvm/versions/node/v7.7.3/bin/:$PATH" --script ./bin/www
