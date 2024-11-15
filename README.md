# Dockerize
This package automatically resolves dependencies of any code snipper and creates a dockerfile to run the snippet without any configuration.
Currently it supports PHP and python

This required Deno2 to be setup to run 

## Building Dockerizr

Dockerize can be built using following command 
```
deno compile --allow-read --allow-net --allow-run --allow-write --output=dockerize main.ts
```

## Running Dockerize for python
just copy the generated dockerize binary in the same folder where your snippet is and then run the following command 
```
./dockerize --file=example.py --py  
```

## Running Dockerize for PHP
just copy the generated dockerize binary in the same folder where your snippet is and then run the following command 
```
./dockerize --file=example.php --php   
```
 

